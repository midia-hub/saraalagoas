import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

export interface DisparosLogEntry {
  id: string
  phone: string
  nome: string
  conversion_type: string
  status_code: number | null
  source: string
  created_at: string
}

export interface BackgroundJobEntry {
  id: string
  kind: string
  status: 'queued' | 'running' | 'completed' | 'failed'
  metadata: Record<string, string> | null
  result: Record<string, unknown> | null
  error: string | null
  created_at: string
  started_at: string | null
  finished_at: string | null
}

export interface CronJobEntry {
  jobid: number
  jobname: string
  schedule: string
  command: string
  start_time: string | null
  end_time: string | null
  status: string | null
  return_message: string | null
}

/**
 * GET - lista os últimos registros do log de disparos (API de disparos)
 * + jobs recentes do background_jobs para escalas
 * + status dos jobs de cron (pg_cron)
 */
export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'consolidacao_config', action: 'view' })
  if (!access.ok) return access.response

  const limit = Math.min(Number(request.nextUrl.searchParams.get('limit')) || 100, 200)

  try {
    const supabase = createSupabaseAdminClient(request)

    // Busca logs, jobs e informações de cron do Supabase
    const [logResult, jobsResult, cronResult] = await Promise.all([
      supabase
        .from('disparos_log')
        .select('id, phone, nome, conversion_type, status_code, source, created_at')
        .order('created_at', { ascending: false })
        .limit(limit),
      supabase
        .from('background_jobs')
        .select('id, kind, status, metadata, result, error, created_at, started_at, finished_at')
        .in('kind', ['escalas-disparo'])
        .order('created_at', { ascending: false })
        .limit(50),
      // Consultamos o esquema cron diretamente via SQL pois é um metadado do Postgres
      supabase.rpc('get_cron_jobs_status').then(res => res, () => ({ data: [], error: null }))
    ])

    if (logResult.error) return NextResponse.json({ error: logResult.error.message }, { status: 500 })

    return NextResponse.json({
      items: (logResult.data ?? []) as DisparosLogEntry[],
      jobs: (jobsResult.data ?? []) as BackgroundJobEntry[],
      cron: (cronResult?.data ?? []) as CronJobEntry[],
    })
  } catch (err) {
    console.error('GET disparos-log:', err)
    return NextResponse.json({ error: 'Erro ao carregar log' }, { status: 500 })
  }
}
