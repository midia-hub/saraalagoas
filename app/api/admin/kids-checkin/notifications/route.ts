import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { getBackgroundJob, startBackgroundJob } from '@/lib/background-jobs'
import {
  MESSAGE_ID_KIDS_ALERTA,
  MESSAGE_ID_KIDS_ENCERRAMENTO,
  sendDisparoRaw,
  getNomeExibicao,
} from '@/lib/disparos-webhook'

type KidsNotificationType = 'alerta' | 'encerramento'

type KidsJobResult = {
  ok: true
  summary: { success: number; errors: number; total: number }
  results: Array<{ checkinId: string; success: boolean; error?: string }>
}

async function executeKidsNotificationsJob(type: KidsNotificationType, checkinIds: string[]): Promise<KidsJobResult> {
  const messageId = type === 'alerta' ? MESSAGE_ID_KIDS_ALERTA : MESSAGE_ID_KIDS_ENCERRAMENTO
  const supabase = createSupabaseAdminClient()

  const { data: checkins, error: cError } = await supabase
    .from('kids_checkin')
    .select(`
      id,
      child:people!child_id(id, full_name, sex),
      guardian:people!guardian_id(id, full_name, mobile_phone, phone)
    `)
    .in('id', checkinIds)

  if (cError) throw new Error(cError.message)

  let successCount = 0
  let errorCount = 0

  const results = await Promise.all(
    (checkins ?? []).map(async (c: any) => {
      const phone = c.guardian?.mobile_phone || c.guardian?.phone
      if (!phone) {
        errorCount++
        return { checkinId: c.id, success: false, error: 'Sem telefone' }
      }

      const sex = c.child?.sex?.toUpperCase() || ''
      const prefix = sex.startsWith('F') ? 'a ' : sex.startsWith('M') ? 'o ' : ''

      const res = await sendDisparoRaw({
        phone,
        messageId,
        variables: {
          responsavel_nome: getNomeExibicao(c.guardian?.full_name || '—'),
          crianca_nome: `${prefix}${getNomeExibicao(c.child?.full_name || '—')}`,
        },
      })

      if (res.success) successCount++
      else errorCount++

      // Registra no log de disparos
      supabase.from('disparos_log').insert({
        phone,
        nome: c.guardian?.full_name || '—',
        status_code: res.statusCode ?? null,
        source: 'kids',
        conversion_type: `kids_${type}`,
      }).then(({ error }) => { if (error) console.error('disparos_log kids_notif:', error) })

      return { checkinId: c.id, success: res.success }
    })
  )

  return {
    ok: true,
    summary: { success: successCount, errors: errorCount, total: (checkins ?? []).length },
    results,
  }
}

export async function POST(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'pessoas', action: 'edit' })
  if (!access.ok) return access.response

  const body = await request.json()
  const { type, checkinIds } = body

  if (!type || !checkinIds || !Array.isArray(checkinIds)) {
    return NextResponse.json(
      { error: 'Campos obrigatórios: type ("alerta" ou "encerramento") e checkinIds (array).' },
      { status: 400 }
    )
  }

  if (type !== 'alerta' && type !== 'encerramento') {
    return NextResponse.json({ error: 'Tipo inválido.' }, { status: 400 })
  }

  const job = await startBackgroundJob<KidsJobResult>({
    kind: 'kids-notifications',
    metadata: { type },
    run: () => executeKidsNotificationsJob(type, checkinIds),
  })

  return NextResponse.json(
    { ok: true, job_id: job.id, status: job.status, message: 'Notificações iniciadas em segundo plano.' },
    { status: 202 },
  )
}

export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'pessoas', action: 'edit' })
  if (!access.ok) return access.response

  const jobId = request.nextUrl.searchParams.get('job_id')
  if (!jobId) return NextResponse.json({ error: 'job_id é obrigatório.' }, { status: 400 })

  const job = await getBackgroundJob<KidsJobResult>(jobId)
  if (!job || job.kind !== 'kids-notifications') {
    return NextResponse.json({ error: 'Job não encontrado.' }, { status: 404 })
  }

  return NextResponse.json({
    ok: true,
    job: {
      id: job.id,
      status: job.status,
      created_at: job.createdAt,
      started_at: job.startedAt,
      finished_at: job.finishedAt,
      result: job.result,
      error: job.error,
    },
  })
}
