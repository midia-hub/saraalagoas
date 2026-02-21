import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

const TEAM_SELECT = 'id, name, church_id, arena_id'

type Ctx = { params: Promise<{ id: string }> }

/** GET - equipe com líderes (pessoas) */
export async function GET(request: NextRequest, ctx: Ctx) {
  const access = await requireAccess(request, { pageKey: 'consolidacao', action: 'view' })
  if (!access.ok) return access.response
  const { id } = await ctx.params
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })
  try {
    const supabase = createSupabaseAdminClient(request)
    const { data: team, error: errTeam } = await supabase.from('teams').select(TEAM_SELECT).eq('id', id).single()
    if (errTeam || !team) return NextResponse.json({ error: 'Equipe não encontrada' }, { status: 404 })
    const { data: leaderRows } = await supabase.from('team_leaders').select('person_id').eq('team_id', id)
    const personIds = (leaderRows ?? []).map((r: { person_id: string }) => r.person_id)
    let leaders: { id: string; full_name: string }[] = []
    if (personIds.length > 0) {
      const { data: people } = await supabase.from('people').select('id, full_name').in('id', personIds)
      leaders = (people ?? []) as { id: string; full_name: string }[]
    }
    return NextResponse.json({ item: team, leaders })
  } catch (err) {
    console.error('GET consolidacao/teams/[id]:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const access = await requireAccess(request, { pageKey: 'consolidacao', action: 'manage' })
  if (!access.ok) return access.response
  const { id } = await ctx.params
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })
  try {
    const body = await request.json().catch(() => ({}))
    const payload: Record<string, unknown> = {}
    if (body.name !== undefined) payload.name = (body.name ?? '').trim()
    if (body.church_id !== undefined) payload.church_id = body.church_id || null
    if (body.arena_id !== undefined) payload.arena_id = body.arena_id || null
    const supabase = createSupabaseAdminClient(request)
    const { data: current } = await supabase.from('teams').select('church_id, arena_id').eq('id', id).single()
    const churchId = (payload.church_id ?? (current as { church_id: string } | null)?.church_id) as string
    const arenaId = (payload.arena_id ?? (current as { arena_id: string } | null)?.arena_id) as string
    if (!churchId || !arenaId) return NextResponse.json({ error: 'Igreja e Arena são obrigatórios' }, { status: 400 })
    const { data: arena } = await supabase.from('arenas').select('church_id').eq('id', arenaId).single()
    if (!arena || (arena as { church_id: string }).church_id !== churchId) {
      return NextResponse.json({ error: 'A arena deve ser da igreja selecionada' }, { status: 400 })
    }
    if (Object.keys(payload).length > 0) {
      const { error: updErr } = await supabase.from('teams').update(payload).eq('id', id)
      if (updErr) return NextResponse.json({ error: 'Erro ao atualizar' }, { status: 500 })
    }
    if (Array.isArray(body.leader_person_ids)) {
      await supabase.from('team_leaders').delete().eq('team_id', id)
      if (body.leader_person_ids.length > 0) {
        await supabase.from('team_leaders').insert(body.leader_person_ids.map((person_id: string) => ({ team_id: id, person_id })))
      }
    }
    const { data } = await supabase.from('teams').select(TEAM_SELECT).eq('id', id).single()
    return NextResponse.json({ item: data })
  } catch (err) {
    console.error('PATCH consolidacao/teams/[id]:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, ctx: Ctx) {
  const access = await requireAccess(request, { pageKey: 'consolidacao', action: 'manage' })
  if (!access.ok) return access.response
  const { id } = await ctx.params
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })
  try {
    const supabase = createSupabaseAdminClient(request)
    const { error } = await supabase.from('teams').delete().eq('id', id)
    if (error) return NextResponse.json({ error: 'Erro ao excluir' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE consolidacao/teams/[id]:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
