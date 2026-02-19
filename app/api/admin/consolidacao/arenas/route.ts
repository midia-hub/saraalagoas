import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

/** GET - lista arenas */
export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'consolidacao', action: 'view' })
  if (!access.ok) return access.response
  try {
    const q = (request.nextUrl.searchParams.get('q') ?? '').trim()
    const supabase = createSupabaseAdminClient(request)
    let query = supabase.from('arenas').select(`
      id, 
      name, 
      church_id, 
      day_of_week, 
      time_of_day,
      leaders:arena_leaders(person_id, person:people(full_name))
    `).order('name')
    if (q) query = query.ilike('name', `%${q}%`)
    const { data, error } = await query
    if (error) return NextResponse.json({ error: 'Erro ao listar arenas' }, { status: 500 })
    return NextResponse.json({ items: data ?? [] })
  } catch (err) {
    console.error('GET consolidacao/arenas:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

/** POST - cria arena */
export async function POST(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'consolidacao', action: 'manage' })
  if (!access.ok) return access.response
  try {
    const body = await request.json().catch(() => ({}))
    const churchId = body.church_id
    if (!churchId) return NextResponse.json({ error: 'Igreja é obrigatória' }, { status: 400 })
    const payload = {
      church_id: churchId,
      name: (body.name ?? 'Arena').trim(),
      day_of_week: body.day_of_week ?? 'sun',
      time_of_day: body.time_of_day ?? '19:00',
    }
    const supabase = createSupabaseAdminClient(request)
    const { data, error } = await supabase.from('arenas').insert(payload).select().single()
    if (error) return NextResponse.json({ error: 'Erro ao criar arena' }, { status: 500 })
    const leaderIds = Array.isArray(body.leader_person_ids) ? body.leader_person_ids : []
    if (leaderIds.length > 0) {
      await supabase.from('arena_leaders').insert(leaderIds.map((person_id: string) => ({ arena_id: data.id, person_id })))
    }
    return NextResponse.json({ item: data })
  } catch (err) {
    console.error('POST consolidacao/arenas:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
