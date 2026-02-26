import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import {
  MESSAGE_ID_KIDS_ALERTA,
  MESSAGE_ID_KIDS_ENCERRAMENTO,
  sendDisparoRaw,
  getNomeExibicao,
} from '@/lib/disparos-webhook'

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

  const messageId = type === 'alerta' ? MESSAGE_ID_KIDS_ALERTA : MESSAGE_ID_KIDS_ENCERRAMENTO
  if (type !== 'alerta' && type !== 'encerramento') {
    return NextResponse.json({ error: 'Tipo inválido.' }, { status: 400 })
  }

  const supabase = createSupabaseAdminClient(request)

  const { data: checkins, error: cError } = await supabase
    .from('kids_checkin')
    .select(`
      id,
      child:people!child_id(id, full_name, sex),
      guardian:people!guardian_id(id, full_name, mobile_phone, phone)
    `)
    .in('id', checkinIds)

  if (cError) {
    console.error('[notifications POST]', cError)
    return NextResponse.json({ error: cError.message }, { status: 500 })
  }

  let successCount = 0
  let errorCount = 0

  // Disparos em paralelo (ou serial para evitar rate limits excessivos, mas como são poucos, paralelo deve ok)
  const results = await Promise.all(
    checkins.map(async (c: any) => {
      const phone = c.guardian?.mobile_phone || c.guardian?.phone
      if (!phone) return { checkinId: c.id, success: false, error: 'Sem telefone' }

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

      return { checkinId: c.id, success: res.success }
    })
  )

  return NextResponse.json({
    ok: true,
    summary: { success: successCount, errors: errorCount, total: checkins.length },
    results,
  })
}
