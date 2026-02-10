import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseServerClient } from '@/lib/supabase-server'

type CreateJobPayload = {
  draftId?: string
  instanceId?: string
  mode?: 'now' | 'scheduled'
  scheduledAt?: string | null
}

export async function POST(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'instagram', action: 'create' })
  if (!access.ok) return access.response
  const db = createSupabaseServerClient(request)

  const body = (await request.json().catch(() => ({}))) as CreateJobPayload
  const draftId = typeof body.draftId === 'string' ? body.draftId : ''
  const instanceId = typeof body.instanceId === 'string' ? body.instanceId : ''
  const mode = body.mode === 'scheduled' ? 'scheduled' : 'now'
  const scheduledAt = typeof body.scheduledAt === 'string' ? body.scheduledAt : null

  if (!draftId) return NextResponse.json({ error: 'draftId é obrigatório.' }, { status: 400 })
  if (!instanceId) return NextResponse.json({ error: 'instanceId é obrigatório.' }, { status: 400 })
  if (mode === 'scheduled' && !scheduledAt) {
    return NextResponse.json({ error: 'scheduledAt é obrigatório para agendamento.' }, { status: 400 })
  }

  const nowIso = new Date().toISOString()
  const jobStatus = mode === 'now' ? 'running' : 'queued'
  const runAt = mode === 'scheduled' ? scheduledAt : nowIso

  const { data: job, error: jobError } = await db
    .from('instagram_post_jobs')
    .insert({
      draft_id: draftId,
      instance_id: instanceId,
      status: jobStatus,
      run_at: runAt,
      created_by: access.snapshot.userId,
      updated_at: nowIso,
      result_payload: { mode },
    })
    .select('*')
    .single()

  if (jobError) return NextResponse.json({ error: jobError.message }, { status: 500 })

  const draftStatus = mode === 'now' ? 'ready' : 'scheduled'
  await db
    .from('instagram_post_drafts')
    .update({
      status: draftStatus,
      publish_mode: mode,
      scheduled_at: mode === 'scheduled' ? scheduledAt : null,
      updated_at: nowIso,
    })
    .eq('id', draftId)

  return NextResponse.json(job, { status: 201 })
}
