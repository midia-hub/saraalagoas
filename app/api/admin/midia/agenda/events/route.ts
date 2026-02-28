import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

type EventDayInput = {
  date: string
  startTime: string
  endTime?: string
}

export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'instagram', action: 'view' })
  if (!access.ok) return access.response

  try {
    const churchId = request.nextUrl.searchParams.get('church_id') ?? ''
    const supabase = createSupabaseAdminClient(request)

    let query = supabase
      .from('media_agenda_events')
      .select('id, church_id, name, description, multi_day, send_to_media, created_at, churches(name)')
      .order('created_at', { ascending: false })

    if (churchId) query = query.eq('church_id', churchId)

    const { data: events, error } = await query
    if (error) return NextResponse.json({ error: 'Erro ao listar eventos.' }, { status: 500 })

    const eventIds = (events ?? []).map((event: any) => event.id)
    let days: any[] = []

    if (eventIds.length > 0) {
      const daysRes = await supabase
        .from('media_agenda_event_days')
        .select('id, event_id, event_date, start_time, end_time, sort_order')
        .in('event_id', eventIds)
        .order('sort_order', { ascending: true })

      if (!daysRes.error) {
        days = daysRes.data ?? []
      }
    }

    const items = (events ?? []).map((event: any) => ({
      id: event.id,
      churchId: event.church_id,
      churchName: event.churches?.name ?? 'Igreja',
      name: event.name,
      description: event.description ?? '',
      multiDay: !!event.multi_day,
      sendToMedia: !!event.send_to_media,
      schedules: days
        .filter((day) => day.event_id === event.id)
        .map((day) => ({
          id: day.id,
          date: day.event_date,
          startTime: day.start_time,
          endTime: day.end_time ?? '',
        })),
    }))

    return NextResponse.json({ items })
  } catch {
    return NextResponse.json({ error: 'Erro interno ao listar eventos.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'instagram', action: 'create' })
  if (!access.ok) return access.response

  try {
    const body = await request.json().catch(() => ({}))
    const churchId = String(body.churchId ?? '').trim()
    const name = String(body.name ?? '').trim()
    const description = String(body.description ?? '').trim()
    const multiDay = !!body.multiDay
    const sendToMedia = body.sendToMedia !== false
    const schedules = Array.isArray(body.schedules) ? (body.schedules as EventDayInput[]) : []

    if (!churchId) return NextResponse.json({ error: 'Igreja é obrigatória.' }, { status: 400 })
    if (!name) return NextResponse.json({ error: 'Nome do evento é obrigatório.' }, { status: 400 })
    if (schedules.length === 0) return NextResponse.json({ error: 'Informe ao menos um dia para o evento.' }, { status: 400 })

    for (const schedule of schedules) {
      if (!schedule.date || !schedule.startTime) {
        return NextResponse.json({ error: 'Cada dia do evento precisa de data e horário inicial.' }, { status: 400 })
      }
    }

    const supabase = createSupabaseAdminClient(request)

    const eventRes = await supabase
      .from('media_agenda_events')
      .insert({
        church_id: churchId,
        name,
        description,
        multi_day: multiDay,
        send_to_media: sendToMedia,
        created_by: access.snapshot.userId,
      })
      .select('id, church_id, name, description, multi_day, send_to_media, churches(name)')
      .single()

    if (eventRes.error || !eventRes.data) {
      return NextResponse.json({ error: 'Não foi possível salvar o evento.' }, { status: 500 })
    }

    const eventId = eventRes.data.id

    const dayPayload = schedules.map((schedule, index) => ({
      event_id: eventId,
      event_date: schedule.date,
      start_time: schedule.startTime,
      end_time: schedule.endTime || null,
      sort_order: index,
    }))

    const daysRes = await supabase
      .from('media_agenda_event_days')
      .insert(dayPayload)
      .select('id, event_id, event_date, start_time, end_time, sort_order')
      .order('sort_order', { ascending: true })

    if (daysRes.error) {
      return NextResponse.json({ error: 'Evento criado, mas houve erro ao salvar os dias.' }, { status: 500 })
    }

    if (sendToMedia) {
      await supabase.from('media_demands').insert({
        source_type: 'agenda',
        church_id: churchId,
        event_id: eventId,
        title: `Demanda da agenda: ${name}`,
        description: description || 'Demanda gerada automaticamente pelo cadastro de evento na agenda.',
        status: 'pendente',
        created_by: access.snapshot.userId,
      })
    }

    const item = {
      id: eventRes.data.id,
      churchId: eventRes.data.church_id,
      churchName: (eventRes.data as any).churches?.name ?? 'Igreja',
      name: eventRes.data.name,
      description: eventRes.data.description ?? '',
      multiDay: !!eventRes.data.multi_day,
      sendToMedia: !!eventRes.data.send_to_media,
      schedules: (daysRes.data ?? []).map((day: any) => ({
        id: day.id,
        date: day.event_date,
        startTime: day.start_time,
        endTime: day.end_time ?? '',
      })),
    }

    return NextResponse.json({ item }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erro interno ao criar evento.' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'instagram', action: 'delete' })
  if (!access.ok) return access.response

  try {
    const id = request.nextUrl.searchParams.get('id') ?? ''
    if (!id) return NextResponse.json({ error: 'ID do evento é obrigatório.' }, { status: 400 })

    const supabase = createSupabaseAdminClient(request)

    // Excluir dias do evento (pode ter CASCADE na FK mas garante explicitamente)
    await supabase.from('media_agenda_event_days').delete().eq('event_id', id)

    const { error } = await supabase.from('media_agenda_events').delete().eq('id', id)
    if (error) return NextResponse.json({ error: 'Erro ao excluir evento.' }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Erro interno ao excluir evento.' }, { status: 500 })
  }
}
