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

    const sp = request.nextUrl.searchParams
    const teamId = (sp.get('team_id') ?? '').trim()
    const leaderId = (sp.get('leader_person_id') ?? '').trim()
    const requestedChurchId = (sp.get('church_id') ?? '').trim()

    const supabase = createSupabaseAdminClient(request)
    let churchIds = await resolveLeaderChurchIds(supabase, personId)
    if (churchIds.length === 0 && access.snapshot.isAdmin) {
      const { data: allChurches } = await supabase.from('churches').select('id')
      churchIds = (allChurches ?? [])
        .map((row) => row.id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
    }
    if (churchIds.length === 0) return NextResponse.json({ disciples: [] })

    const selectedChurchId = requestedChurchId && churchIds.includes(requestedChurchId)
      ? requestedChurchId
      : churchIds[0]

    if (teamId) {
      const { data: teamRow } = await supabase
        .from('teams')
        .select('id, church_id')
        .eq('id', teamId)
        .eq('church_id', selectedChurchId)
        .maybeSingle()
      if (!teamRow) return NextResponse.json({ disciples: [] })
    }

    let personIds: string[] = []
    let leaderLinkedIds: string[] = []

    if (leaderId) {
      const [{ data: ledPeople }, { data: discipuladosRows }, { data: convRowsByLeader }] = await Promise.all([
        supabase
          .from('people')
          .select('id')
          .eq('leader_person_id', leaderId),
        supabase
          .from('discipulados')
          .select('discipulo_person_id')
          .eq('discipulador_person_id', leaderId)
          .eq('active', true),
        supabase
          .from('conversoes')
          .select('person_id')
          .eq('consolidator_person_id', leaderId)
          .not('person_id', 'is', null),
      ])

      const fromPeople = (ledPeople ?? []).map((row) => row.id)
      const fromDiscipulados = (discipuladosRows ?? [])
        .map((row) => row.discipulo_person_id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
      const fromConversoes = (convRowsByLeader ?? [])
        .map((row) => row.person_id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)

      leaderLinkedIds = [...new Set([...fromPeople, ...fromDiscipulados, ...fromConversoes])]
      personIds = leaderLinkedIds
    }

    if (teamId) {
      const { data: convRows } = await supabase
        .from('conversoes')
        .select('person_id, team_id, created_at')
        .eq('team_id', teamId)
        .order('created_at', { ascending: false })

      const teamPersonIds = [...new Set((convRows ?? []).map((row) => row.person_id).filter(Boolean))] as string[]

      if (leaderId) {
        if (leaderLinkedIds.length > 0) {
          const allowed = new Set(teamPersonIds)
          personIds = leaderLinkedIds.filter((id) => allowed.has(id))
        } else {
          personIds = teamPersonIds
        }
      } else {
        personIds = teamPersonIds
      }
    }

    personIds = [...new Set(personIds)]

    if (personIds.length === 0) return NextResponse.json({ disciples: [] })

    const { data: disciples } = await supabase
      .from('people')
      .select('id, full_name, mobile_phone')
      .in('id', personIds)
      .order('full_name')

    return NextResponse.json({ disciples: disciples ?? [] })
  } catch (error) {
    console.error('GET lideranca/presenca-externa/discipulos:', error)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
