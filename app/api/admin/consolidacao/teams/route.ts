import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

/** GET - lista equipes */
export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'consolidacao', action: 'view' })
  if (!access.ok) return access.response
  try {
    const q = (request.nextUrl.searchParams.get('q') ?? '').trim()
    const supabase = createSupabaseAdminClient(request)
    let query = supabase.from('teams').select('id, name, church_id, arena_id').order('name')
    if (q) query = query.ilike('name', `%${q}%`)
    const { data, error } = await query
    if (error) return NextResponse.json({ error: 'Erro ao listar equipes' }, { status: 500 })
    return NextResponse.json({ items: data ?? [] })
  } catch (err) {
    console.error('GET consolidacao/teams:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

/** POST - cria equipe. Obrigatório: nome e igreja. Se arena_id não for enviado, usa a primeira arena da igreja. */
export async function POST(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'consolidacao', action: 'manage' })
  if (!access.ok) return access.response
  try {
    const body = await request.json().catch(() => ({}))
    const name = (body.name ?? '').trim()
    if (!name) return NextResponse.json({ error: 'Nome da equipe é obrigatório' }, { status: 400 })
    const churchId = body.church_id || null
    let arenaId = body.arena_id || null
    if (!churchId) return NextResponse.json({ error: 'Igreja é obrigatória' }, { status: 400 })
    const supabase = createSupabaseAdminClient(request)
    if (!arenaId) {
      const { data: firstArena } = await supabase
        .from('arenas')
        .select('id')
        .eq('church_id', churchId)
        .order('name')
        .limit(1)
        .single()
      arenaId = firstArena?.id ?? null
      if (!arenaId) return NextResponse.json({ error: 'Nenhuma arena cadastrada para esta igreja. Cadastre uma arena antes de criar a equipe.' }, { status: 400 })
    } else {
      const { data: arena } = await supabase.from('arenas').select('church_id').eq('id', arenaId).single()
      if (!arena || (arena as { church_id: string }).church_id !== churchId) {
        return NextResponse.json({ error: 'A arena deve ser da igreja selecionada' }, { status: 400 })
      }
    }
    const payload = {
      name,
      church_id: churchId,
      arena_id: arenaId,
    }
    const { data, error } = await supabase.from('teams').insert(payload).select().single()
    if (error) return NextResponse.json({ error: 'Erro ao criar equipe' }, { status: 500 })
    const leaderIds = Array.isArray(body.leader_person_ids) ? body.leader_person_ids : []
    if (leaderIds.length > 0) {
      await supabase.from('team_leaders').insert(leaderIds.map((person_id: string) => ({ team_id: data.id, person_id })))
    }
    return NextResponse.json({ item: data })
  } catch (err) {
    console.error('POST consolidacao/teams:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
