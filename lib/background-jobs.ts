import { createSupabaseServiceClient } from './supabase-server'

export type BackgroundJobStatus = 'queued' | 'running' | 'completed' | 'failed'

export interface BackgroundJobRecord<T = unknown> {
  id: string
  kind: string
  status: BackgroundJobStatus
  createdAt: string
  startedAt: string | null
  finishedAt: string | null
  result: T | null
  error: string | null
  metadata?: Record<string, string>
}

const JOB_TTL_MS = 6 * 60 * 60 * 1000

type InternalStore = Map<string, BackgroundJobRecord>

function getStore(): InternalStore {
  const globalRef = globalThis as typeof globalThis & { __backgroundJobsStore?: InternalStore }
  if (!globalRef.__backgroundJobsStore) {
    globalRef.__backgroundJobsStore = new Map<string, BackgroundJobRecord>()
  }
  return globalRef.__backgroundJobsStore
}

function pruneJobs() {
  const now = Date.now()
  const store = getStore()
  for (const [jobId, job] of store.entries()) {
    const refTime = job.finishedAt ? new Date(job.finishedAt).getTime() : new Date(job.createdAt).getTime()
    if (now - refTime > JOB_TTL_MS) {
      store.delete(jobId)
    }
  }
}

function upsertMemoryJob<T>(job: BackgroundJobRecord<T>) {
  getStore().set(job.id, job as BackgroundJobRecord)
}

async function getDbClient() {
  try {
    return createSupabaseServiceClient()
  } catch {
    return null
  }
}

async function pruneDbJobs() {
  const db = await getDbClient()
  if (!db) return
  await db.from('background_jobs').delete().lt('expires_at', new Date().toISOString())
}

function mapDbJobRow<T>(row: Record<string, unknown>): BackgroundJobRecord<T> {
  return {
    id: String(row.id),
    kind: String(row.kind),
    status: row.status as BackgroundJobStatus,
    createdAt: String(row.created_at),
    startedAt: row.started_at ? String(row.started_at) : null,
    finishedAt: row.finished_at ? String(row.finished_at) : null,
    result: (row.result as T | null) ?? null,
    error: (row.error as string | null) ?? null,
    metadata: (row.metadata as Record<string, string> | undefined) ?? undefined,
  }
}

async function updateDbJob<T>(jobId: string, patch: Partial<BackgroundJobRecord<T>>) {
  const db = await getDbClient()
  if (!db) return false

  const payload: Record<string, unknown> = {}
  if (patch.status) payload.status = patch.status
  if (patch.startedAt !== undefined) payload.started_at = patch.startedAt
  if (patch.finishedAt !== undefined) payload.finished_at = patch.finishedAt
  if (patch.result !== undefined) payload.result = patch.result
  if (patch.error !== undefined) payload.error = patch.error

  const { error } = await db.from('background_jobs').update(payload).eq('id', jobId)
  return !error
}

export async function startBackgroundJob<T>(params: {
  kind: string
  metadata?: Record<string, string>
  run: () => Promise<T>
}): Promise<BackgroundJobRecord<T>> {
  pruneJobs()
  await pruneDbJobs().catch(() => null)

  const job: BackgroundJobRecord<T> = {
    id: crypto.randomUUID(),
    kind: params.kind,
    status: 'queued',
    createdAt: new Date().toISOString(),
    startedAt: null,
    finishedAt: null,
    result: null,
    error: null,
    metadata: params.metadata,
  }

  let persistedInDb = false
  const db = await getDbClient()
  if (db) {
    const { error } = await db.from('background_jobs').insert({
      id: job.id,
      kind: job.kind,
      status: job.status,
      metadata: job.metadata ?? null,
      result: null,
      error: null,
      created_at: job.createdAt,
      started_at: null,
      finished_at: null,
      expires_at: new Date(Date.now() + JOB_TTL_MS).toISOString(),
    })
    persistedInDb = !error
  }

  if (!persistedInDb) {
    upsertMemoryJob(job)
  }

  queueMicrotask(() => {
    void (async () => {
      const runningJob = getStore().get(job.id) as BackgroundJobRecord<T> | undefined

      const startedAt = new Date().toISOString()
      if (persistedInDb) {
        const dbUpdated = await updateDbJob<T>(job.id, { status: 'running', startedAt })
        if (!dbUpdated) {
          const fallbackJob = runningJob ?? { ...job }
          fallbackJob.status = 'running'
          fallbackJob.startedAt = startedAt
          upsertMemoryJob(fallbackJob)
          persistedInDb = false
        }
      } else if (runningJob) {
        runningJob.status = 'running'
        runningJob.startedAt = startedAt
      }

      try {
        const result = await params.run()
        const finishedAt = new Date().toISOString()
        if (persistedInDb) {
          const dbUpdated = await updateDbJob<T>(job.id, {
            status: 'completed',
            result,
            finishedAt,
            error: null,
          })
          if (!dbUpdated) {
            const fallbackJob = runningJob ?? { ...job }
            fallbackJob.result = result
            fallbackJob.status = 'completed'
            fallbackJob.finishedAt = finishedAt
            fallbackJob.error = null
            upsertMemoryJob(fallbackJob)
          }
        } else {
          const fallbackJob = runningJob ?? { ...job }
          fallbackJob.result = result
          fallbackJob.status = 'completed'
          fallbackJob.finishedAt = finishedAt
          fallbackJob.error = null
          upsertMemoryJob(fallbackJob)
        }
      } catch (error) {
        const finishedAt = new Date().toISOString()
        const errorText = error instanceof Error ? error.message : 'Falha ao executar job em segundo plano.'
        if (persistedInDb) {
          const dbUpdated = await updateDbJob<T>(job.id, {
            status: 'failed',
            error: errorText,
            finishedAt,
          })
          if (!dbUpdated) {
            const fallbackJob = runningJob ?? { ...job }
            fallbackJob.status = 'failed'
            fallbackJob.error = errorText
            fallbackJob.finishedAt = finishedAt
            upsertMemoryJob(fallbackJob)
          }
        } else {
          const fallbackJob = runningJob ?? { ...job }
          fallbackJob.status = 'failed'
          fallbackJob.error = errorText
          fallbackJob.finishedAt = finishedAt
          upsertMemoryJob(fallbackJob)
        }
      }
    })()
  })

  return job
}

export async function getBackgroundJob<T = unknown>(jobId: string) {
  await pruneDbJobs().catch(() => null)

  const db = await getDbClient()
  if (db) {
    const { data, error } = await db
      .from('background_jobs')
      .select('id, kind, status, metadata, result, error, created_at, started_at, finished_at')
      .eq('id', jobId)
      .maybeSingle()

    if (!error && data) {
      return mapDbJobRow<T>(data as Record<string, unknown>)
    }
  }

  pruneJobs()
  return (getStore().get(jobId) as BackgroundJobRecord<T> | undefined) ?? null
}
