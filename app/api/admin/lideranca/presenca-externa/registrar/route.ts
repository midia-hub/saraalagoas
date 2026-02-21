import { NextRequest, NextResponse } from 'next/server'
import { requireAccessAny } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

function parseYmd(ymd: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null
  const [year, month, day] = ymd.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return Number.isNaN(date.getTime()) ? null : date
}

async function resolveLeaderChurchIds(supabase: ReturnType<typeof createSupabaseAdminClient>, personId: string) {
  const [{ data: ledCells }, { data: pastorRows }, { data: teamLeaders }, { data: personRow }] = await Promise.all([
    supabase
      .from('cells')
      .select('church_id')
      .eq('leader_person_id', personId)
      .eq('is_active', true),
    supabase
      .from('church_pastors')
      .select('church_id')
      .eq('person_id', personId),
    supabase
      .from('team_leaders')
      .select('team_id')
      .eq('person_id', personId),
    supabase
      .from('people')
      .select('church_id')
      .eq('id', personId)
      .maybeSingle(),
  ])

  const cellChurchIds = (ledCells ?? [])
    .map((row) => row.church_id)
    .filter((id): id is string => typeof id === 'string' && id.length > 0)

  const pastorChurchIds = (pastorRows ?? [])
    .map((row) => row.church_id)
    .filter((id): id is string => typeof id === 'string' && id.length > 0)

  const teamIds = (teamLeaders ?? [])
    .map((row) => row.team_id)
    .filter((id): id is string => typeof id === 'string' && id.length > 0)

  let teamChurchIds: string[] = []
  if (teamIds.length > 0) {
    const { data: teamRows } = await supabase
      .from('teams')
      .select('church_id')
      .in('id', teamIds)
    teamChurchIds = (teamRows ?? [])
      .map((row) => row.church_id)
      .filter((id): id is string => typeof id === 'string' && id.length > 0)
  }

  const personChurchId = typeof personRow?.church_id === 'string' ? personRow.church_id : null

  return [...new Set([...cellChurchIds, ...pastorChurchIds, ...teamChurchIds, ...(personChurchId ? [personChurchId] : [])])]
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
    const personId = access.snapshot.personId
    if (!personId) return NextResponse.json({ error: 'Usuário sem pessoa vinculada.' }, { status: 400 })

    const body = await request.json().catch(() => ({}))
    const serviceId = typeof body?.service_id === 'string' ? body.service_id : ''
    const attendedOn = typeof body?.attended_on === 'string' ? body.attended_on : ''
    const requestedChurchId = typeof body?.church_id === 'string' ? body.church_id : ''
    const teamId = typeof body?.team_id === 'string' ? body.team_id : null
    const leaderPersonId = typeof body?.leader_person_id === 'string' ? body.leader_person_id : personId
    const discipleIds = Array.isArray(body?.disciple_ids)
      ? body.disciple_ids.filter((id: unknown): id is string => typeof id === 'string' && id.length > 0)
      : []
    const visitors = Array.isArray(body?.visitors)
      ? body.visitors
          .filter((name: unknown): name is string => typeof name === 'string' && name.trim().length > 0)
          .map((name: string) => name.trim())
      : []

    if (!serviceId) return NextResponse.json({ error: 'Selecione o culto.' }, { status: 400 })
    if (!attendedOn) return NextResponse.json({ error: 'Selecione a data.' }, { status: 400 })
    if (discipleIds.length === 0 && visitors.length === 0) {
      return NextResponse.json({ error: 'Marque ao menos 1 discípulo ou adicione 1 visitante.' }, { status: 400 })
    }

    const selectedDate = parseYmd(attendedOn)
    if (!selectedDate) return NextResponse.json({ error: 'Data inválida.' }, { status: 400 })

    const supabase = createSupabaseAdminClient(request)
    let churchIds = await resolveLeaderChurchIds(supabase, personId)
    if (churchIds.length === 0 && access.snapshot.isAdmin) {
      const { data: allChurches } = await supabase.from('churches').select('id')
      churchIds = (allChurches ?? [])
        .map((row) => row.id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
    }
    if (churchIds.length === 0) return NextResponse.json({ error: 'Igreja não encontrada.' }, { status: 400 })

    const churchId = requestedChurchId && churchIds.includes(requestedChurchId)
      ? requestedChurchId
      : churchIds[0]

    if (requestedChurchId && !churchIds.includes(requestedChurchId)) {
      return NextResponse.json({ error: 'Igreja inválida para este líder.' }, { status: 403 })
    }

    if (teamId) {
      const { data: teamRow } = await supabase
        .from('teams')
        .select('id, church_id')
        .eq('id', teamId)
        .eq('church_id', churchId)
        .maybeSingle()
      if (!teamRow) return NextResponse.json({ error: 'Equipe não pertence à igreja selecionada.' }, { status: 400 })
    }

    const { data: service } = await supabase
      .from('worship_services')
      .select('id, church_id, day_of_week, active')
      .eq('id', serviceId)
      .maybeSingle()

    if (!service) return NextResponse.json({ error: 'Culto inválido.' }, { status: 400 })
    if (service.church_id && service.church_id !== churchId) {
      return NextResponse.json({ error: 'Culto não pertence à sua igreja.' }, { status: 403 })
    }

    if (typeof service.day_of_week === 'number' && service.day_of_week !== selectedDate.getDay()) {
      return NextResponse.json({ error: 'A data não corresponde ao dia do culto selecionado.' }, { status: 400 })
    }

    const userId = access.snapshot.userId ?? null

    if (discipleIds.length > 0) {
      const attendancePayload = discipleIds.map((id: string) => ({
        service_id: service.id,
        person_id: id,
        attended_on: attendedOn,
        attended: true,
        leader_person_id: leaderPersonId,
        registered_by_user_id: userId,
        notes: null,
      }))

      const { error: attendanceError } = await supabase
        .from('worship_attendance')
        .upsert(attendancePayload, { onConflict: 'service_id,person_id,attended_on' })

      if (attendanceError) {
        console.error('registrar presenca disciples:', attendanceError)
        return NextResponse.json({ error: 'Erro ao registrar presença dos discípulos.' }, { status: 500 })
      }
    }

    if (visitors.length > 0) {
      const visitorsPayload = visitors.map((visitorName: string) => ({
        church_id: churchId,
        service_id: service.id,
        team_id: teamId,
        leader_person_id: leaderPersonId,
        attended_on: attendedOn,
        visitor_name: visitorName,
        registered_by_user_id: userId,
      }))

      const { error: visitorsError } = await supabase
        .from('worship_attendance_visitors')
        .insert(visitorsPayload)

      if (visitorsError) {
        console.error('registrar presenca visitors:', visitorsError)
        return NextResponse.json({ error: 'Erro ao registrar visitantes.' }, { status: 500 })
      }
    }

    return NextResponse.json({ ok: true, disciplesSaved: discipleIds.length, visitorsSaved: visitors.length })
  } catch (error) {
    console.error('POST lideranca/presenca-externa/registrar:', error)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
