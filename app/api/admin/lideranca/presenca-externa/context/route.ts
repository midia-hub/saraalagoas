import { NextRequest, NextResponse } from 'next/server'
import { requireAccessAny } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

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

export async function GET(request: NextRequest) {
  const access = await requireAccessAny(request, [
    { pageKey: 'cultos', action: 'view' },
    { pageKey: 'cultos', action: 'create' },
    { pageKey: 'cultos', action: 'edit' },
    { pageKey: 'cultos', action: 'manage' },
  ])
  if (!access.ok) return access.response

  try {
    const personId = access.snapshot.personId
    if (!personId) return NextResponse.json({ error: 'Usuário sem pessoa vinculada.' }, { status: 400 })

    const supabase = createSupabaseAdminClient(request)
    let churchIds = await resolveLeaderChurchIds(supabase, personId)
    if (churchIds.length === 0 && access.snapshot.isAdmin) {
      const { data: allChurches } = await supabase.from('churches').select('id')
      churchIds = (allChurches ?? [])
        .map((row) => row.id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
    }
    if (churchIds.length === 0) return NextResponse.json({ error: 'Igreja não encontrada para este líder.' }, { status: 400 })

    const requestedChurchId = (request.nextUrl.searchParams.get('church_id') ?? '').trim()
    const selectedChurchId = requestedChurchId && churchIds.includes(requestedChurchId)
      ? requestedChurchId
      : churchIds[0]

    const { data: churches } = await supabase
      .from('churches')
      .select('id, name')
      .in('id', churchIds)
      .order('name')

    const [{ data: church }, { data: services }, { data: teams }] = await Promise.all([
      supabase.from('churches').select('id, name').eq('id', selectedChurchId).maybeSingle(),
      supabase
        .from('worship_services')
        .select('id, name, day_of_week, time_of_day')
        .eq('church_id', selectedChurchId)
        .order('day_of_week')
        .order('time_of_day'),
      supabase.from('teams').select('id, name').eq('church_id', selectedChurchId).order('name'),
    ])

    const teamIds = (teams ?? []).map((t: { id: string }) => t.id)

    const { data: teamLeaders } = teamIds.length > 0
      ? await supabase
          .from('team_leaders')
          .select('team_id, person_id, people(id, full_name)')
          .in('team_id', teamIds)
      : { data: [] }

    const { data: teamConversions } = teamIds.length > 0
      ? await supabase
          .from('conversoes')
          .select('team_id, person_id, consolidator_person_id')
          .in('team_id', teamIds)
      : { data: [] }

    const conversionPersonIds = [...new Set((teamConversions ?? [])
      .map((row: any) => row.person_id)
      .filter((id: unknown): id is string => typeof id === 'string' && id.length > 0))]

    const { data: peopleRows } = conversionPersonIds.length > 0
      ? await supabase
          .from('people')
          .select('id, leader_person_id')
          .in('id', conversionPersonIds)
      : { data: [] }

    const peopleLeaderIds = [...new Set((peopleRows ?? [])
      .map((row: any) => row.leader_person_id)
      .filter((id: unknown): id is string => typeof id === 'string' && id.length > 0))]

    const allLeaderIds = [...new Set([
      ...(teamLeaders ?? []).map((row: any) => row.person_id).filter((id: unknown): id is string => typeof id === 'string' && id.length > 0),
      ...(teamConversions ?? []).map((row: any) => row.consolidator_person_id).filter((id: unknown): id is string => typeof id === 'string' && id.length > 0),
      ...peopleLeaderIds,
    ])]

    const { data: leaderPeopleRows } = allLeaderIds.length > 0
      ? await supabase
          .from('people')
          .select('id, full_name')
          .in('id', allLeaderIds)
      : { data: [] }

    const leaderNameById = new Map<string, string>((leaderPeopleRows ?? [])
      .filter((row: any) => typeof row?.id === 'string')
      .map((row: any) => [row.id, row.full_name ?? '—']))

    // NOVO: Incluir todas as pessoas das conversões como "líderes disponíveis"
    const allTeamMemberIds = [...new Set((teamConversions ?? [])
      .map((row: any) => row.person_id)
      .filter((id: unknown): id is string => typeof id === 'string' && id.length > 0))]

    const { data: allTeamMembersFromConversions } = allTeamMemberIds.length > 0
      ? await supabase
          .from('people')
          .select('id, full_name')
          .in('id', allTeamMemberIds)
      : { data: [] }

    for (const row of allTeamMembersFromConversions ?? []) {
      if (row?.id && !leaderNameById.has(row.id)) {
        leaderNameById.set(row.id, row.full_name ?? '—')
      }
    }

    const leadersByTeamMap = new Map<string, Set<string>>()

    for (const row of teamLeaders ?? []) {
      const teamIdKey = row?.team_id
      const personIdKey = row?.person_id
      if (!teamIdKey || !personIdKey) continue
      if (!leadersByTeamMap.has(teamIdKey)) leadersByTeamMap.set(teamIdKey, new Set())
      leadersByTeamMap.get(teamIdKey)!.add(personIdKey)
    }

    for (const row of teamConversions ?? []) {
      const teamIdKey = row?.team_id
      if (!teamIdKey) continue
      const ids = [row?.consolidator_person_id, row?.person_id] // Incluir a pessoa da conversão como "líder"
      const personRow = (peopleRows ?? []).find((p: any) => p.id === row?.person_id)
      if (personRow?.leader_person_id) ids.push(personRow.leader_person_id)
      if (!leadersByTeamMap.has(teamIdKey)) leadersByTeamMap.set(teamIdKey, new Set())
      for (const leaderId of ids) {
        if (typeof leaderId === 'string' && leaderId.length > 0) {
          leadersByTeamMap.get(teamIdKey)!.add(leaderId)
        }
      }
    }

    const leadersByTeamExpanded = Array.from(leadersByTeamMap.entries())
      .flatMap(([teamIdKey, ids]) =>
        Array.from(ids).map((leaderId) => ({
          team_id: teamIdKey,
          person_id: leaderId,
          full_name: leaderNameById.get(leaderId) ?? '—',
        }))
      )
      .sort((a, b) => a.full_name.localeCompare(b.full_name, 'pt-BR'))

    return NextResponse.json({
      churches: churches ?? [],
      selectedChurchId,
      church: church ?? null,
      services: services ?? [],
      teams: teams ?? [],
      leadersByTeam: leadersByTeamExpanded,
    })
  } catch (error) {
    console.error('GET lideranca/presenca-externa/context:', error)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
