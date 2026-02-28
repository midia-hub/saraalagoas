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
      .select('id, room_id, requester_name, requester_phone, reason, start_datetime, end_datetime, status, requester_person_id, people_count, room:room_id(name)')
      .eq('id', id)
      .maybeSingle()

    if (reservationError || !reservation) {
      return NextResponse.json({ error: 'Reserva nao encontrada' }, { status: 404 })
    }

    if (reservation.status !== 'pending') {
      return NextResponse.json({ error: 'Somente reservas pendentes podem ser aprovadas' }, { status: 400 })
    }

    const { data: conflicts, error: conflictError } = await supabase
      .from('room_reservations')
      .select('id')
      .eq('room_id', reservation.room_id)
      .in('status', ['approved', 'pending'])
      .neq('id', id)
      .lt('start_datetime', reservation.end_datetime)
      .gt('end_datetime', reservation.start_datetime)
      .limit(1)

    if (conflictError) {
      return NextResponse.json({ error: 'Erro ao validar conflito antes da aprovacao' }, { status: 500 })
    }

    if ((conflicts ?? []).length > 0) {
      return NextResponse.json(
        { error: 'Existe conflito de horario com outra reserva pendente/aprovada' },
        { status: 409 }
      )
    }

    const { data: updated, error: updateError } = await supabase
      .from('room_reservations')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: access.snapshot.personId || null,
      })
      .eq('id', id)
      .select('id, status, approved_at, approved_by')
      .single()

    if (updateError) {
      console.error('approve reservation update:', updateError)
      return NextResponse.json({ error: 'Erro ao aprovar reserva' }, { status: 500 })
    }

    // ── Envio de mensagem automática (confirmação de aprovação) ──
    try {
      const { data: settings } = await supabase.from('consolidation_settings').select('disparos_api_enabled').eq('id', 1).maybeSingle()
      if (settings?.disparos_api_enabled && reservation.requester_phone) {
        const roomName = (reservation.room as { name?: string } | null)?.name ?? String(reservation.room_id)
        const variables = {
          solicitante: reservation.requester_name ?? '',
          sala: roomName,
          data: formatDatePtBr(reservation.start_datetime),
          hora_inicio: formatTimePtBr(reservation.start_datetime),
          hora_fim: formatTimePtBr(reservation.end_datetime),
          quantidade_pessoas: String(reservation.people_count ?? 0),
          motivo: reservation.reason ?? '',
        }

        void (async () => {
          const result = await callDisparosWebhook({
            phone: reservation.requester_phone,
            nome: reservation.requester_name ?? '',
            conversionType: 'reserva_aprovada',
            variables,
          })

          if (result) {
            await supabase.from('disparos_log').insert({
              phone: result.phone,
              nome: result.nome,
              status_code: result.statusCode ?? null,
              source: 'reservas',
              conversion_type: 'reserva_aprovada'
            })
          }
        })().catch((err) => {
          console.error('approve reservation webhook async error:', err)
        })
      }
    } catch (err) {
      console.error('approve reservation webhook error:', err)
    }

    return NextResponse.json({ success: true, reservation: updated })
  } catch (err) {
    console.error('approve reservation exception:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
