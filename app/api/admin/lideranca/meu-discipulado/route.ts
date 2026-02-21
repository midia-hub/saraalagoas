import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { getVisiblePeopleIdsForLeader } from '@/lib/consolidacao-scope'
import { getTodayBrasilia } from '@/lib/date-utils'

function normalizeArenaDay(day: string | null | undefined): number {
  const value = (day ?? '').toLowerCase()
  if (value === 'sun') return 0
  if (value === 'mon') return 1
  if (value === 'tue') return 2
  if (value === 'wed') return 3
  if (value === 'thu') return 4
  if (value === 'fri') return 5
  if (value === 'sat') return 6
  return 0
}

function parseYmd(ymd: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null
  const [year, month, day] = ymd.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return Number.isNaN(date.getTime()) ? null : date
}

function countWeekdayOccurrences(start: Date, end: Date, weekday: number): number {
  if (weekday < 0 || weekday > 6 || end < start) return 0
  const first = new Date(start)
  const diff = (weekday - first.getDay() + 7) % 7
  first.setDate(first.getDate() + diff)
  if (first > end) return 0
  const msPerDay = 24 * 60 * 60 * 1000
  const days = Math.floor((end.getTime() - first.getTime()) / msPerDay)
  return Math.floor(days / 7) + 1
}

function listWeekdayDates(start: Date, end: Date, weekday: number): string[] {
  const dates: string[] = []
  if (weekday < 0 || weekday > 6 || end < start) return dates
  const current = new Date(start)
  const diff = (weekday - current.getDay() + 7) % 7
  current.setDate(current.getDate() + diff)
  
  while (current <= end) {
    dates.push(current.toISOString().slice(0, 10))
    current.setDate(current.getDate() + 7)
  }
  return dates
}

function maxDate(a: Date, b: Date): Date {
  return a > b ? a : b
}

/**
 * GET /api/admin/lideranca/meu-discipulado
 * Retorna tabela agregada de frequência dos discípulos do líder logado.
 * Não usa RPC (evita depender de migration aplicada).
 * Query params: start (YYYY-MM-DD), end (YYYY-MM-DD), service_id (uuid | 'all')
 */
export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'cultos', action: 'view' })
  if (!access.ok) return access.response

  try {
    const personId = access.snapshot.personId
    if (!personId) {
      return NextResponse.json({
        error: 'Perfil do usuário não possui vínculo com pessoa. Contate o administrador.'
      }, { status: 400 })
    }

    const { searchParams } = new URL(request.nextUrl)
    const todayYmd = getTodayBrasilia()
    const [year, month] = todayYmd.split('-').map(Number)
    const firstDayOfMonth = `${year}-${String(month).padStart(2, '0')}-01`
    
    const startDate = searchParams.get('start') || firstDayOfMonth
    const endDate   = searchParams.get('end')   || todayYmd
    const effectiveEndDate = endDate > todayYmd ? todayYmd : endDate
    const serviceId = searchParams.get('service_id')
    const debug = true

    const supabase = createSupabaseAdminClient(request)

    // 1. Buscar discípulos do líder pela regra oficial (people.leader_person_id)
    const { data: leaderPeople, error: leaderErr } = await supabase
      .from('people')
      .select('id')
      .eq('leader_person_id', personId)

    if (leaderErr) {
      console.error('meu-discipulado: erro ao buscar people.leader_person_id:', leaderErr)
      return NextResponse.json({ error: 'Erro ao buscar discípulos', details: leaderErr.message }, { status: 500 })
    }

    const discipleIdsByLeader = (leaderPeople ?? []).map(p => p.id)
    const discipleIdsSet = new Set<string>(discipleIdsByLeader)

    // Fallback: considera também o escopo visível por liderança (células/equipes/pastorado).
    // Isso cobre casos onde people.leader_person_id ainda não foi preenchido.
    const scopedDiscipleIds = await getVisiblePeopleIdsForLeader(supabase, personId)
    for (const scopedId of scopedDiscipleIds) {
      if (scopedId && scopedId !== personId) discipleIdsSet.add(scopedId)
    }

    // Inclui pessoas consolidadas diretamente por este líder (quando não há célula definida)
    const { data: consolidatorFollowups } = await supabase
      .from('consolidation_followups')
      .select('person_id')
      .eq('consolidator_person_id', personId)

    for (const row of consolidatorFollowups ?? []) {
      const pid = row.person_id as string
      if (pid && pid !== personId) discipleIdsSet.add(pid)
    }

    const discipleIds = Array.from(discipleIdsSet)
    let churchId: string | null = null

    if (discipleIds.length === 0) {
      return NextResponse.json({
        items: [],
        params: { start: startDate, end: endDate, service_id: serviceId },
        debug: {
          person_id: personId,
          reason: 'no_disciples_found',
          disciple_ids_by_leader_count: discipleIdsByLeader.length,
          disciple_ids_by_scope_count: scopedDiscipleIds.length,
          disciple_ids_count: 0,
          disciple_ids_sample: []
        }
      })
    }

    if (!churchId) {
      // Resolve churchId via célula liderada ou vínculo pastoral
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
    }

    if (!churchId) {
      return NextResponse.json({
        items: [],
        params: { start: startDate, end: endDate, service_id: serviceId },
        debug: {
          person_id: personId,
          reason: 'church_not_resolved',
          disciple_ids_by_leader_count: discipleIdsByLeader.length,
          disciple_ids_by_scope_count: scopedDiscipleIds.length,
          disciple_ids_count: discipleIds.length,
          disciple_ids_sample: discipleIds.slice(0, 5),
          church_id: null
        }
      })
    }

    let resolvedServiceIds: string[] = []
    let plannedSchedules: Array<{ serviceId: string; weekday: number; startsAt: string }> = []
    if (serviceId && serviceId !== 'all') {
      if (serviceId.startsWith('arena:')) {
        const arenaId = serviceId.slice('arena:'.length)
        const { data: arena } = await supabase
          .from('arenas')
          .select('id, church_id, name, day_of_week, time_of_day, is_active, created_at')
          .eq('id', arenaId)
          .eq('church_id', churchId)
          .eq('is_active', true)
          .maybeSingle()

        if (arena) {
          const arenaDay = normalizeArenaDay(arena.day_of_week)
          plannedSchedules = [{ weekday: arenaDay, startsAt: String(arena.created_at ?? '').slice(0, 10) }]
          const { data: serviceMatches } = await supabase
            .from('worship_services')
            .select('id, day_of_week, created_at')
            .eq('church_id', churchId)
            .eq('name', arena.name)
            .eq('day_of_week', arenaDay)
            .eq('time_of_day', arena.time_of_day)
            .eq('active', true)

          resolvedServiceIds = (serviceMatches ?? []).map((s: { id: string }) => s.id)
          plannedSchedules = (serviceMatches ?? []).map((s: { id: string; day_of_week: number; created_at: string | null }) => ({
            serviceId: s.id,
            weekday: s.day_of_week,
            startsAt: String(s.created_at ?? '').slice(0, 10),
          }))
        }
      } else {
        resolvedServiceIds = [serviceId]
        const { data: selectedService } = await supabase
          .from('worship_services')
          .select('id, day_of_week, created_at')
          .eq('id', serviceId)
          .maybeSingle()
        if (typeof selectedService?.day_of_week === 'number') {
          plannedSchedules = [{
            serviceId: selectedService.id,
            weekday: selectedService.day_of_week,
            startsAt: String(selectedService.created_at ?? '').slice(0, 10),
          }]
        }
      }
    } else {
      const { data: allServicesForChurch } = await supabase
        .from('worship_services')
        .select('id, day_of_week, created_at')
        .eq('church_id', churchId)
        .eq('active', true)
      resolvedServiceIds = (allServicesForChurch ?? []).map((s: { id: string }) => s.id)
      plannedSchedules = (allServicesForChurch ?? [])
        .filter((s: { day_of_week: number | null }) => typeof s.day_of_week === 'number' && s.day_of_week >= 0 && s.day_of_week <= 6)
        .map((s: { id: string; day_of_week: number; created_at?: string | null }) => ({
          serviceId: s.id,
          weekday: s.day_of_week,
          startsAt: String(s.created_at ?? '').slice(0, 10),
        }))
    }

    const firstAttendanceByService = new Map<string, string>()
    if (resolvedServiceIds.length > 0) {
      const { data: firstAttendanceRows } = await supabase
        .from('worship_attendance')
        .select('service_id, attended_on')
        .in('service_id', resolvedServiceIds)
        .eq('attended', true)
        .order('attended_on', { ascending: true })
      for (const row of firstAttendanceRows ?? []) {
        const serviceIdKey = row.service_id as string
        if (!serviceIdKey) continue
        if (!firstAttendanceByService.has(serviceIdKey)) {
          firstAttendanceByService.set(serviceIdKey, row.attended_on as string)
        }
      }
    }

    // 2. Buscar dados das pessoas (nome, contato)
    const { data: people } = await supabase
      .from('people')
      .select('id, full_name, mobile_phone, email, completed_review_date')
      .in('id', discipleIds)

    const peopleMap: Record<string, { full_name: string; mobile_phone?: string; email?: string; completed_review_date?: string | null }> = {}
    for (const p of people ?? []) peopleMap[p.id] = p

    // 2.1 Buscar status de acompanhamento (para Revisao de Vidas)
    const followupMap: Record<string, { id: string; status: string }> = {}
    const { data: followups } = await supabase
      .from('consolidation_followups')
      .select('id, person_id, status, created_at')
      .in('person_id', discipleIds)
      .order('created_at', { ascending: false })

    for (const f of followups ?? []) {
      const pid = f.person_id as string
      if (!pid || followupMap[pid]) continue
      followupMap[pid] = { id: f.id as string, status: f.status as string }
    }

    // 3. Total de cultos realizados no período (baseado em calendário - dia da semana já passou)
    // Cada culto conta separadamente: se tem 2 cultos de domingo e domingo acontece 3x, são 6 realizações
    const rangeStart = parseYmd(startDate)
    const rangeEndInput = parseYmd(effectiveEndDate)
    const today = new Date()
    const rangeEndCap = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const rangeEnd = rangeEndInput && rangeEndInput < rangeEndCap ? rangeEndInput : rangeEndCap

    let total = 0
    const schedulesDebug: Array<{ serviceId: string; weekday: number; dates: string[]; count: number }> = []
    if (rangeStart && rangeEnd && rangeEnd >= rangeStart) {
      for (const schedule of plannedSchedules) {
        const count = countWeekdayOccurrences(rangeStart, rangeEnd, schedule.weekday)
        const dates = listWeekdayDates(rangeStart, rangeEnd, schedule.weekday)
        schedulesDebug.push({
          serviceId: schedule.serviceId,
          weekday: schedule.weekday,
          dates,
          count
        })
        total += count
      }
    }

    // 4. Presenças de cada discípulo no período
    let attQuery = supabase
      .from('worship_attendance')
      .select('person_id, attended, attended_on, service_id')
      .in('person_id', discipleIds)
      .gte('attended_on', startDate)
      .lte('attended_on', effectiveEndDate)
      .eq('attended', true)

    if (serviceId && serviceId !== 'all') {
      if (resolvedServiceIds.length === 1) {
        attQuery = attQuery.eq('service_id', resolvedServiceIds[0])
      } else if (resolvedServiceIds.length > 1) {
        attQuery = attQuery.in('service_id', resolvedServiceIds)
      } else {
        attQuery = attQuery.eq('service_id', '__none__')
      }
    }

    const { data: attendances } = await attQuery

    // Agrupa por pessoa
    const attMap: Record<string, { count: number; lastDate: string | null }> = {}
    for (const id of discipleIds) attMap[id] = { count: 0, lastDate: null }
    for (const att of attendances ?? []) {
      if (!attMap[att.person_id]) attMap[att.person_id] = { count: 0, lastDate: null }
      attMap[att.person_id].count++
      const cur = attMap[att.person_id].lastDate
      if (!cur || att.attended_on > cur) attMap[att.person_id].lastDate = att.attended_on
    }

    // 5. Montar resposta
    const items = discipleIds.map(id => {
      const person  = peopleMap[id] ?? {}
      const followup = followupMap[id]
      const att     = attMap[id] ?? { count: 0, lastDate: null }
      const percent = total > 0 ? Math.round((att.count / total) * 100) : 0
      return {
        disciple_id:   id,
        disciple_name: person.full_name ?? 'Desconhecido',
        phone:         person.mobile_phone ?? null,
        email:         person.email ?? null,
        followup_id:   followup?.id ?? null,
        followup_status: followup?.status ?? null,
        attended:      att.count,
        total,
        percent,
        last_date:     att.lastDate,
        completed_review_date: person.completed_review_date ?? null,
      }
    })

    // Ordena por menor frequência primeiro
    items.sort((a, b) => a.percent - b.percent)

    return NextResponse.json({
      items,
      params: { start: startDate, end: endDate, service_id: serviceId },
      debug: {
        person_id: personId,
        disciple_ids_by_leader_count: discipleIdsByLeader.length,
        disciple_ids_by_scope_count: scopedDiscipleIds.length,
        disciple_ids_count: discipleIds.length,
        disciple_ids_sample: discipleIds.slice(0, 5),
        church_id: churchId,
        effective_end_date: effectiveEndDate,
        resolved_service_ids: resolvedServiceIds,
        planned_schedules: plannedSchedules,
        schedules_calculation: schedulesDebug,
        range_start: rangeStart?.toISOString().slice(0, 10),
        range_end: rangeEnd?.toISOString().slice(0, 10),
        total_sessions: total,
        attendance_rows: (attendances ?? []).length
      }
    })
  } catch (err) {
    console.error('GET /api/admin/lideranca/meu-discipulado exception:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

