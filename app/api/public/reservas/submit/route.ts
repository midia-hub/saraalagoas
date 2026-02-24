import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient, supabaseServer } from '@/lib/supabase-server'
import { getAccessSnapshotFromRequest } from '@/lib/rbac'
import { callTemplateDisparosWebhook } from '@/lib/call-disparos-template'
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
      .select('id, name, active, available_days, available_start_time, available_end_time, day_times')
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
      .select('id, status, room_id, requester_name, requester_phone, start_datetime, end_datetime')
      .single()

    if (insertError) {
      console.error('[Reserva Submit] Erro ao inserir reserva:', insertError)
      return NextResponse.json({ error: 'Erro ao criar reserva' }, { status: 500 })
    }
    
    console.log('[Reserva Submit] Reserva criada com sucesso:', reservation)

    // ── Envio de mensagem automática (confirmação de solicitação) ──
    try {
      console.log('[Reserva Disparo] Iniciando processo de disparo para:', requesterPhone)
      
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
        // 2. Buscar template de solicitação recebida
        const { data: template, error: templateError } = await supabase
          .from('room_message_templates')
          .select('id, name, message_id')
          .eq('active', true)
          .or('name.eq.reserva_solicitada,name.ilike.%solicitada%')
          .order('name')
          .limit(1)
          .maybeSingle()

        if (templateError) console.error('[Reserva Disparo] Erro ao buscar template:', templateError)
        console.log('[Reserva Disparo] Template encontrado:', template?.name, 'MessageID:', template?.message_id)

        if (template?.message_id && reservation.requester_phone) {
          const roomName = room.name || String(room.id)
          const variables = {
            nome: reservation.requester_name ?? '',
            sala: roomName,
            data: formatDatePtBr(reservation.start_datetime),
            hora_inicio: formatTimePtBr(reservation.start_datetime),
            hora_fim: formatTimePtBr(reservation.end_datetime),
            motivo: reason ?? '',
          }

          console.log('[Reserva Disparo] Chamando webhook com variáveis:', variables)
          const result = await callTemplateDisparosWebhook({
            phone: reservation.requester_phone,
            message_id: template.message_id,
            variables,
          })

          console.log('[Reserva Disparo] Resultado webhook:', result)

          if (result) {
            console.log('[Reserva Disparo] Inserindo log no banco...')
            const { error: logError } = await supabase.from('disparos_log').insert({
              phone: result.phone,
              nome: variables.nome,
              status_code: result.statusCode ?? null,
              source: 'reservas',
              conversion_type: 'reserva_solicitada'
            })
            if (logError) {
              console.error('[Reserva Disparo] Erro ao inserir log:', logError)
            } else {
              console.log('[Reserva Disparo] ✓ Log inserido com sucesso')
            }
          } else {
            console.warn('[Reserva Disparo] Resultado do webhook é null/undefined')
          }
        } else if (reservation.requester_phone) {
          console.warn('[Reserva Disparo] Pulando disparo: message_id ausente ou telefone vazio')
          // Logar que pulamos por falta de template
          await supabase.from('disparos_log').insert({
            phone: reservation.requester_phone,
            nome: reservation.requester_name,
            status_code: 404,
            source: 'reservas',
            conversion_type: 'reserva_solicitada'
          })
        }
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
