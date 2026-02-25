import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { callDisparosWebhook } from '@/lib/disparos-webhook'
import { formatDatePtBr, formatTimePtBr } from '@/lib/reservas'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireAccess(request, { pageKey: 'reservas', action: 'edit' })
  if (!access.ok) return access.response

  const { id } = await params
  const supabase = createSupabaseAdminClient(request)

  try {
    const { data: reservation, error: reservationError } = await supabase
      .from('room_reservations')
      .select('id, status')
      .eq('id', id)
      .maybeSingle()

    if (reservationError || !reservation) {
      return NextResponse.json({ error: 'Reserva nao encontrada' }, { status: 404 })
    }

    const body = await request.json().catch(() => ({}))
    const reason = (body?.reason ?? '').toString().trim() || null

    const { data: updated, error: updateError } = await supabase
      .from('room_reservations')
      .update({ status: 'cancelled', cancelled_reason: reason })
      .eq('id', id)
      .select('id, status, cancelled_reason')
      .single()

    if (updateError) {
      return NextResponse.json({ error: 'Erro ao cancelar reserva' }, { status: 500 })
    }

    // ── Envio de mensagem automática (cancelamento) ──
    try {
      const { data: settings } = await supabase.from('consolidation_settings').select('disparos_api_enabled').eq('id', 1).maybeSingle()
      if (settings?.disparos_api_enabled) {
        const { data: resData } = await supabase
          .from('room_reservations')
          .select('*, room:room_id(name)')
          .eq('id', id)
          .single()

        if (resData?.requester_phone) {
          const roomName = (resData.room as { name?: string } | null)?.name ?? String(resData.room_id)
          const variables = {
            solicitante: resData.requester_name ?? '',
            sala: roomName,
            data: formatDatePtBr(resData.start_datetime),
            hora_inicio: formatTimePtBr(resData.start_datetime),
            hora_fim: formatTimePtBr(resData.end_datetime),
            quantidade_pessoas: String(resData.people_count ?? 0),
            motivo: resData.reason ?? '',
            motivo_cancelamento: reason || 'Motivo não informado',
          }

          const result = await callDisparosWebhook({
            phone: resData.requester_phone,
            nome: resData.requester_name ?? '',
            conversionType: 'reserva_cancelada',
            variables,
          })

          if (result) {
            await supabase.from('disparos_log').insert({
              phone: result.phone,
              nome: result.nome,
              status_code: result.statusCode ?? null,
              source: 'reservas',
              conversion_type: 'reserva_cancelada'
            })
          }
        }
      }
    } catch (err) {
      console.error('cancel reservation webhook error:', err)
    }

    return NextResponse.json({ success: true, reservation: updated })
  } catch (err) {
    console.error('cancel reservation exception:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
