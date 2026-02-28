import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient, supabaseServer } from '@/lib/supabase-server'
import { getAccessSnapshotFromRequest } from '@/lib/rbac'
import { callDisparosWebhook } from '@/lib/disparos-webhook'
import {
  isAllowedDay,
  isWithinRoomWindow,
  parseTimeToMinutes,
  toUtcIsoFromBrazilDateTime,
  formatDatePtBr,
  formatTimePtBr,
} from '@/lib/reservas'

type SubmitBody = {
  roomId?: string
  requester_name?: string
  requester_phone?: string
  team_id?: string | null
  date?: string
  start_time?: string
  end_time?: string
  people_count?: number
  reason?: string
}

async function getSelfPersonData(request: NextRequest): Promise<{
  personId: string | null
  fullName: string | null
  phone: string | null
}> {
  try {
    const snapshot = await getAccessSnapshotFromRequest(request)
    if (!snapshot?.personId) return { personId: null, fullName: null, phone: null }

    const { data: person } = await supabaseServer
      .from('people')
      .select('id, full_name, mobile_phone, phone')
      .eq('id', snapshot.personId)
      .maybeSingle()

    if (!person) return { personId: snapshot.personId, fullName: null, phone: null }

    return {
      personId: person.id,
      fullName: person.full_name ?? null,
      phone: person.mobile_phone ?? person.phone ?? null,
    }
  } catch {
    return { personId: null, fullName: null, phone: null }
  }
}

function normalizePhone(phone: string | null | undefined): string {
  return (phone ?? '').trim()
}

export async function POST(request: NextRequest) {
  console.log('[Reserva Submit] ===== INICIO DO PROCESSO =====')
  let supabase: ReturnType<typeof createSupabaseServiceClient>
  try {
    supabase = createSupabaseServiceClient()
  } catch {
    return NextResponse.json(
      { error: 'Servico indisponivel para envio da reserva' },
      { status: 503 }
    )
  }

  try {
    const body = (await request.json().catch(() => ({}))) as SubmitBody
    console.log('[Reserva Submit] Body recebido:', JSON.stringify(body, null, 2))

    const roomId = (body.roomId ?? '').trim()
    const date = (body.date ?? '').trim()
    const startTime = (body.start_time ?? '').trim()
    const endTime = (body.end_time ?? '').trim()
    const reason = (body.reason ?? '').trim() || null
    const teamId = body.team_id ?? null
    const peopleCount = Number(body.people_count ?? 0)

    if (!roomId || !date || !startTime || !endTime) {
      return NextResponse.json({ error: 'Campos obrigatorios ausentes' }, { status: 400 })
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'Data invalida' }, { status: 400 })
    }

    const startMinutes = parseTimeToMinutes(startTime)
    const endMinutes = parseTimeToMinutes(endTime)
    if (startMinutes == null || endMinutes == null || endMinutes <= startMinutes) {
      return NextResponse.json({ error: 'Horario invalido' }, { status: 400 })
    }

    const startIso = toUtcIsoFromBrazilDateTime(date, startTime)
    const endIso = toUtcIsoFromBrazilDateTime(date, endTime)
    if (!startIso || !endIso) {
      return NextResponse.json({ error: 'Intervalo de horario invalido' }, { status: 400 })
    }

    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('id, name, active, available_days, available_start_time, available_end_time, day_times, approval_person_id, approver:approval_person_id(id, full_name, mobile_phone)')
      .eq('id', roomId)
      .eq('active', true)
      .maybeSingle()

    if (roomError || !room) {
      return NextResponse.json({ error: 'Sala nao encontrada ou inativa' }, { status: 404 })
    }

    if (!isAllowedDay(room.available_days, date)) {
      return NextResponse.json({ error: 'Sala nao disponivel para este dia' }, { status: 400 })
    }

    // Determinar janela permitida para o dia
    let allowedStart = room.available_start_time
    let allowedEnd = room.available_end_time

    if (room.day_times && typeof room.day_times === 'object') {
      const anchor = new Date(`${date}T12:00:00-03:00`)
      const dayOfWeek = anchor.getUTCDay()
      const dayConfig = (room.day_times as any)[dayOfWeek]
      if (dayConfig?.start && dayConfig?.end) {
        allowedStart = dayConfig.start + ':00'
        allowedEnd = dayConfig.end + ':00'
      }
    }

    if (!isWithinRoomWindow(startTime, endTime, allowedStart, allowedEnd)) {
      return NextResponse.json({ error: 'Horario fora do permitido' }, { status: 400 })
    }

    const { data: conflicts, error: conflictError } = await supabase
      .from('room_reservations')
      .select('id')
      .eq('room_id', roomId)
      .in('status', ['approved', 'pending'])
      .lt('start_datetime', endIso)
      .gt('end_datetime', startIso)
      .limit(1)

    if (conflictError) {
      console.error('submit reserva conflict:', conflictError)
      return NextResponse.json({ error: 'Erro ao validar disponibilidade' }, { status: 500 })
    }

    if ((conflicts ?? []).length > 0) {
      return NextResponse.json(
        { error: 'Sala ja esta reservada para este horario' },
        { status: 409 }
      )
    }

    const self = await getSelfPersonData(request)
    const requesterNameInput = (body.requester_name ?? '').trim()
    const requesterPhoneInput = normalizePhone(body.requester_phone)

    const requesterName = self.fullName ?? requesterNameInput
    const requesterPhone = normalizePhone(self.phone ?? requesterPhoneInput)

    if (!requesterName) {
      return NextResponse.json({ error: 'Nome do solicitante e obrigatorio' }, { status: 400 })
    }

    if (!self.personId && !requesterPhone) {
      return NextResponse.json(
        { error: 'Telefone e obrigatorio para solicitantes nao cadastrados' },
        { status: 400 }
      )
    }

    const payload = {
      room_id: roomId,
      requester_person_id: self.personId,
      requester_name: requesterName,
      requester_phone: requesterPhone || null,
      team_id: teamId,
      start_datetime: startIso,
      end_datetime: endIso,
      people_count: Number.isFinite(peopleCount) && peopleCount > 0 ? peopleCount : null,
      reason,
      status: 'pending',
    }

    console.log('[Reserva Submit] Payload da reserva:', JSON.stringify(payload, null, 2))
    
    const { data: reservation, error: insertError } = await supabase
      .from('room_reservations')
      .insert(payload)
      .select('id, status, room_id, requester_name, requester_phone, start_datetime, end_datetime, people_count')
      .single()

    if (insertError) {
      console.error('[Reserva Submit] Erro ao inserir reserva:', insertError)
      return NextResponse.json({ error: 'Erro ao criar reserva' }, { status: 500 })
    }
    
    console.log('[Reserva Submit] Reserva criada com sucesso:', reservation)

    // ── Envio de mensagem automática (confirmação de solicitação) ──
    try {
      console.log('[Reserva Disparo] Iniciando processo de disparo')
      
      // 1. Verificar se disparos estão ativos globalmente
      const { data: settings, error: settingsError } = await supabase
        .from('consolidation_settings')
        .select('disparos_api_enabled')
        .eq('id', 1)
        .maybeSingle()
      
      if (settingsError) console.error('[Reserva Disparo] Erro ao buscar settings:', settingsError)
      
      const isApiEnabled = settings?.disparos_api_enabled ?? false
      console.log('[Reserva Disparo] API Enabled:', isApiEnabled)

      if (isApiEnabled) {
        const roomName = room.name || String(room.id)
        const approverData = room.approver as any
        const approverName = approverData?.full_name || 'Administrador'
        const approverPhone = approverData?.mobile_phone || null
        
        const commonVariables = {
          aprovador_nome: approverName,
          solicitante: reservation.requester_name ?? '',
          sala: roomName,
          data: formatDatePtBr(reservation.start_datetime),
          hora_inicio: formatTimePtBr(reservation.start_datetime),
          hora_fim: formatTimePtBr(reservation.end_datetime),
          quantidade_pessoas: String(reservation.people_count ?? 0),
          motivo: reason ?? '',
        }

        void (async () => {
          if (reservation.requester_phone) {
            console.log('[Reserva Disparo] Enviando mensagem para solicitante:', reservation.requester_phone)
            const resultRequester = await callDisparosWebhook({
              phone: reservation.requester_phone,
              nome: reservation.requester_name ?? '',
              conversionType: 'reserva_recebida',
              variables: commonVariables,
            })

            console.log('[Reserva Disparo] Resultado webhook (solicitante):', resultRequester)

            if (resultRequester) {
              const { error: logError } = await supabase.from('disparos_log').insert({
                phone: resultRequester.phone,
                nome: resultRequester.nome,
                status_code: resultRequester.statusCode ?? null,
                source: 'reservas',
                conversion_type: 'reserva_recebida'
              })
              if (logError) {
                console.error('[Reserva Disparo] Erro ao inserir log (solicitante):', logError)
              } else {
                console.log('[Reserva Disparo] ✓ Log inserido (solicitante)')
              }
            }
          }

          if (approverPhone) {
            console.log('[Reserva Disparo] Enviando mensagem para aprovador:', approverPhone)
            const resultApprover = await callDisparosWebhook({
              phone: approverPhone,
              nome: approverName,
              conversionType: 'reserva_pendente_aprovacao',
              variables: commonVariables,
            })

            console.log('[Reserva Disparo] Resultado webhook (aprovador):', resultApprover)

            if (resultApprover) {
              const { error: logError } = await supabase.from('disparos_log').insert({
                phone: resultApprover.phone,
                nome: resultApprover.nome,
                status_code: resultApprover.statusCode ?? null,
                source: 'reservas',
                conversion_type: 'reserva_pendente_aprovacao'
              })
              if (logError) {
                console.error('[Reserva Disparo] Erro ao inserir log (aprovador):', logError)
              } else {
                console.log('[Reserva Disparo] ✓ Log inserido (aprovador)')
              }
            }
          } else {
            console.warn('[Reserva Disparo] Aprovador sem telefone cadastrado - notificação não enviada')
          }
        })().catch((err) => {
          console.error('[Reserva Disparo] Exception no processo assíncrono de disparo:', err)
        })
      }
    } catch (err) {
      console.error('[Reserva Disparo] Exception no processo de disparo:', err)
    }

    console.log('[Reserva Submit] ===== PROCESSO CONCLUIDO COM SUCESSO =====')
    return NextResponse.json({
      success: true,
      reservation,
      message:
        'Sua solicitacao foi enviada para aprovacao. Caso aprovada, voce sera avisado via WhatsApp.',
    })
  } catch (err) {
    console.error('[Reserva Submit] Exception geral:', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
