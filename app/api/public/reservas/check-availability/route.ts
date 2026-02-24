import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase-server'
import {
  isAllowedDay,
  isWithinRoomWindow,
  toUtcIsoFromBrazilDateTime,
} from '@/lib/reservas'

export const dynamic = 'force-dynamic'

function normalizeInput(request: NextRequest): {
  roomId: string
  date: string
  startTime: string
  endTime: string
} | null {
  const roomId = request.nextUrl.searchParams.get('roomId') ?? ''
  const date = request.nextUrl.searchParams.get('date') ?? ''
  const startTime = request.nextUrl.searchParams.get('start_time') ?? ''
  const endTime = request.nextUrl.searchParams.get('end_time') ?? ''

  if (roomId && date && startTime && endTime) {
    return { roomId, date, startTime, endTime }
  }

  const startIso = request.nextUrl.searchParams.get('start') ?? ''
  const endIso = request.nextUrl.searchParams.get('end') ?? ''
  if (!roomId || !startIso || !endIso) return null

  const startDate = new Date(startIso)
  const endDate = new Date(endIso)
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return null

  const dateFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' })
  const timeFormatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  const startDateLocal = dateFormatter.format(startDate)
  const endDateLocal = dateFormatter.format(endDate)
  if (startDateLocal !== endDateLocal) return null

  return {
    roomId,
    date: startDateLocal,
    startTime: timeFormatter.format(startDate),
    endTime: timeFormatter.format(endDate),
  }
}

export async function GET(request: NextRequest) {
  const input = normalizeInput(request)
  if (!input) {
    return NextResponse.json(
      { available: false, reason: 'Parametros invalidos para consulta de disponibilidade.' },
      { status: 400 }
    )
  }

  const startIso = toUtcIsoFromBrazilDateTime(input.date, input.startTime)
  const endIso = toUtcIsoFromBrazilDateTime(input.date, input.endTime)
  if (!startIso || !endIso || new Date(endIso).getTime() <= new Date(startIso).getTime()) {
    return NextResponse.json(
      { available: false, reason: 'Intervalo de horario invalido.' },
      { status: 400 }
    )
  }

  let supabase: ReturnType<typeof createSupabaseServiceClient>
  try {
    supabase = createSupabaseServiceClient()
  } catch {
    return NextResponse.json(
      { available: false, reason: 'Servico indisponivel no momento.' },
      { status: 503 }
    )
  }

  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('id, name, active, available_days, available_start_time, available_end_time, day_times')
    .eq('id', input.roomId)
    .eq('active', true)
    .maybeSingle()

  if (roomError || !room) {
    return NextResponse.json(
      { available: false, reason: 'Sala nao encontrada ou inativa.' },
      { status: 404 }
    )
  }

  if (!isAllowedDay(room.available_days, input.date)) {
    return NextResponse.json({ available: false, reason: 'Sala nao disponivel para este dia.' })
  }

  // Determina os horários permitidos (específicos do dia ou gerais)
  let allowedStartTime = room.available_start_time
  let allowedEndTime = room.available_end_time

  if (room.day_times && typeof room.day_times === 'object') {
    const anchor = new Date(`${input.date}T12:00:00-03:00`)
    const dayOfWeek = anchor.getUTCDay()
    const dayTime = (room.day_times as Record<string, { start: string; end: string }>)[dayOfWeek]
    
    if (dayTime?.start && dayTime?.end) {
      allowedStartTime = dayTime.start + ':00'
      allowedEndTime = dayTime.end + ':00'
    }
  }

  if (!isWithinRoomWindow(input.startTime, input.endTime, allowedStartTime, allowedEndTime)) {
    return NextResponse.json({
      available: false,
      reason: 'Horario fora da janela permitida para a sala.',
    })
  }

  const { data: conflicts, error: conflictError } = await supabase
    .from('room_reservations')
    .select('id')
    .eq('room_id', input.roomId)
    .in('status', ['approved', 'pending'])
    .lt('start_datetime', endIso)
    .gt('end_datetime', startIso)
    .limit(1)

  if (conflictError) {
    console.error('check-availability conflict:', conflictError)
    return NextResponse.json(
      { available: false, reason: 'Erro ao consultar agenda da sala.' },
      { status: 500 }
    )
  }

  if ((conflicts ?? []).length > 0) {
    return NextResponse.json({
      available: false,
      reason: 'Sala ja esta reservada para este horario',
    })
  }

  return NextResponse.json({ available: true })
}
