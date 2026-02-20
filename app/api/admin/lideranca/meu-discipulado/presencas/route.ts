import { NextRequest, NextResponse } from 'next/server'
import { requireAccessAny } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { getVisiblePeopleIdsForLeader } from '@/lib/consolidacao-scope'
import { getTodayBrasilia } from '@/lib/date-utils'

function parseYmd(ymd: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null
  const [year, month, day] = ymd.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return Number.isNaN(date.getTime()) ? null : date
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function normalizeServiceDay(day: number | string | null | undefined): number | null {
  if (typeof day === 'number' && day >= 0 && day <= 6) return day
  if (typeof day !== 'string') return null
  const value = day.trim().toLowerCase()
  if (/^[0-6]$/.test(value)) return Number(value)

  const map: Record<string, number> = {
    domingo: 0,
    dom: 0,
    segunda: 1,
    'segunda-feira': 1,
    seg: 1,
    terca: 2,
    'terça': 2,
    'terça-feira': 2,
    ter: 2,
    quarta: 3,
    'quarta-feira': 3,
    qua: 3,
    quinta: 4,
    'quinta-feira': 4,
    qui: 4,
    sexta: 5,
    'sexta-feira': 5,
    sex: 5,
    sabado: 6,
    'sábado': 6,
    sab: 6,
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
    sun: 0,
    mon: 1,
    tue: 2,
    wed: 3,
    thu: 4,
    fri: 5,
    sat: 6,
  }
  return map[value] ?? null
}

export async function POST(request: NextRequest) {
  const access = await requireAccessAny(request, [
    { pageKey: 'cultos', action: 'create' },
    { pageKey: 'cultos', action: 'edit' },
    { pageKey: 'cultos', action: 'manage' },
    { pageKey: 'cultos', action: 'view' },
  ])
  if (!access.ok) return access.response

  try {
    const body = await request.json().catch(() => ({}))
    const rawServiceId = typeof body?.service_id === 'string' ? body.service_id : ''
    const attendedOn = typeof body?.attended_on === 'string' ? body.attended_on : ''
    const discipleIds = Array.isArray(body?.disciple_ids)
      ? body.disciple_ids.filter((id: unknown): id is string => typeof id === 'string' && id.length > 0)
      : []

    if (!rawServiceId) return NextResponse.json({ error: 'service_id é obrigatório' }, { status: 400 })
    if (!attendedOn) return NextResponse.json({ error: 'attended_on é obrigatório' }, { status: 400 })
    if (discipleIds.length === 0) return NextResponse.json({ error: 'Nenhum discípulo selecionado' }, { status: 400 })

    const selectedDate = parseYmd(attendedOn)
    const today = parseYmd(getTodayBrasilia())
    if (!selectedDate || !today) {
      return NextResponse.json({ error: 'Data de presença inválida.' }, { status: 400 })
    }

    const allowedMonths = new Set<string>([monthKey(today)])
    if (today.getDate() <= 10) {
      const prevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      allowedMonths.add(monthKey(prevMonth))
    }

    if (selectedDate > today || !allowedMonths.has(monthKey(selectedDate))) {
      return NextResponse.json(
        { error: 'Data fora da janela permitida. Só é permitido o mês atual ou, até o dia 10, o mês anterior.' },
        { status: 400 }
      )
    }

    const personId = access.snapshot.personId
    if (!personId) {
      return NextResponse.json({ error: 'Perfil do usuário sem vínculo com pessoa.' }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient(request)

    // Resolve churchId do líder para validar culto permitido (igreja dele ou global)
    let churchId: string | null = null
    let ledCell: { church_id: string | null } | null = null
    const { data: ledCellActive, error: ledCellActiveError } = await supabase
      .from('cells')
      .select('church_id')
      .eq('leader_person_id', personId)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()

    if (ledCellActiveError) {
      const { data: ledCellFallback } = await supabase
        .from('cells')
        .select('church_id')
        .eq('leader_person_id', personId)
        .limit(1)
        .maybeSingle()
      ledCell = ledCellFallback
    } else {
      ledCell = ledCellActive
    }

    if (ledCell?.church_id) {
      churchId = ledCell.church_id
    } else {
      const { data: pastorRow } = await supabase
        .from('church_pastors')
        .select('church_id')
        .eq('person_id', personId)
        .limit(1)
        .maybeSingle()
      if (pastorRow?.church_id) churchId = pastorRow.church_id
    }

    if (!churchId) {
      return NextResponse.json({ error: 'Não foi possível identificar a igreja do líder.' }, { status: 400 })
    }

    let resolvedServiceId = rawServiceId
    let resolvedServiceDay: number | null = null

    const arenaPrefix = 'arena:'
    const arenaId = rawServiceId.startsWith(arenaPrefix) ? rawServiceId.slice(arenaPrefix.length) : null

    if (arenaId) {
      const { data: arena, error: arenaError } = await supabase
        .from('arenas')
        .select('id, church_id, name, day_of_week, time_of_day, is_active')
        .eq('id', arenaId)
        .eq('is_active', true)
        .maybeSingle()

      if (arenaError || !arena) {
        return NextResponse.json({ error: 'Arena não encontrada ou inativa.' }, { status: 400 })
      }
      if (arena.church_id !== churchId) {
        return NextResponse.json({ error: 'Arena não permitida para a sua igreja.' }, { status: 403 })
      }

      resolvedServiceDay = normalizeServiceDay(arena.day_of_week)

      const { data: existingService } = await supabase
        .from('worship_services')
        .select('id')
        .eq('church_id', churchId)
        .eq('name', arena.name)
        .eq('day_of_week', resolvedServiceDay ?? 0)
        .eq('time_of_day', arena.time_of_day)
        .eq('active', true)
        .limit(1)
        .maybeSingle()

      if (existingService?.id) {
        resolvedServiceId = existingService.id
      } else {
        const { data: createdService, error: createServiceError } = await supabase
          .from('worship_services')
          .insert({
            church_id: churchId,
            name: arena.name,
            day_of_week: resolvedServiceDay ?? 0,
            time_of_day: arena.time_of_day,
            active: true,
          })
          .select('id')
          .single()

        if (createServiceError || !createdService?.id) {
          return NextResponse.json({ error: 'Não foi possível preparar o culto da arena para registro.' }, { status: 500 })
        }
        resolvedServiceId = createdService.id
      }
    } else {
      const { data: service, error: serviceError } = await supabase
        .from('worship_services')
        .select('id, church_id, day_of_week, active')
        .eq('id', rawServiceId)
        .eq('active', true)
        .maybeSingle()

      if (serviceError || !service) {
        return NextResponse.json({ error: 'Culto não encontrado ou inativo.' }, { status: 400 })
      }

      if (service.church_id && service.church_id !== churchId) {
        return NextResponse.json({ error: 'Culto não permitido para a sua igreja.' }, { status: 403 })
      }

      resolvedServiceId = service.id
      resolvedServiceDay = normalizeServiceDay(service.day_of_week)
    }

    const serviceDay = resolvedServiceDay
    if (serviceDay !== null && selectedDate.getDay() !== serviceDay) {
      return NextResponse.json({ error: 'Data não corresponde ao dia do culto selecionado.' }, { status: 400 })
    }

    const { data: ownDisciples } = await supabase
      .from('people')
      .select('id')
      .eq('leader_person_id', personId)

    const ownIds = (ownDisciples ?? []).map((p: { id: string }) => p.id)
    const scopedIds = await getVisiblePeopleIdsForLeader(supabase, personId)
    const allowedSet = new Set<string>([...ownIds, ...scopedIds])

    const validDiscipleIds = discipleIds.filter((id) => allowedSet.has(id))
    if (validDiscipleIds.length === 0) {
      return NextResponse.json({ error: 'Nenhum discípulo válido para este líder.' }, { status: 403 })
    }

    const userId = access.snapshot.userId ?? null
    const payload = validDiscipleIds.map((id) => ({
      service_id: resolvedServiceId,
      person_id: id,
      attended_on: attendedOn,
      attended: true,
      leader_person_id: personId,
      registered_by_user_id: userId,
      notes: null,
    }))

    const { data, error } = await supabase
      .from('worship_attendance')
      .upsert(payload, { onConflict: 'service_id,person_id,attended_on' })
      .select('id, person_id')

    if (error) {
      console.error('POST /api/admin/lideranca/meu-discipulado/presencas:', error)
      return NextResponse.json({ error: 'Erro ao registrar presenças' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      saved: data?.length ?? 0,
      ignored: discipleIds.length - validDiscipleIds.length,
    })
  } catch (err) {
    console.error('POST /api/admin/lideranca/meu-discipulado/presencas exception:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
