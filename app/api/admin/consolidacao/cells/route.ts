import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

const CELL_SELECT = 'id, name, church_id, arena_id, team_id, day_of_week, time_of_day, frequency, leader_person_id, co_leader_person_id, is_active, created_at, updated_at'

const DAYS: Record<string, string> = { mon: 'Seg', tue: 'Ter', wed: 'Qua', thu: 'Qui', fri: 'Sex', sat: 'Sáb', sun: 'Dom' }
const FREQ: Record<string, string> = { weekly: 'Semanal', biweekly: 'Quinzenal', monthly: 'Mensal' }

/** GET - lista células (com líder e igreja se possível) */
export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'consolidacao', action: 'view' })
  if (!access.ok) return access.response
  try {
    const q = (request.nextUrl.searchParams.get('q') ?? '').trim()
    const supabase = createSupabaseAdminClient(request)
    let query = supabase
      .from('cells')
      .select('id, name, day_of_week, time_of_day, frequency, church_id, arena_id, team_id, leader_person_id, co_leader_person_id')
      .order('name')
    if (q) query = query.ilike('name', `%${q}%`)
    const { data, error } = await query
    if (error) return NextResponse.json({ error: 'Erro ao listar células' }, { status: 500 })
    const items = (data ?? []).map((c: Record<string, unknown>) => ({
      ...c,
      day_label: DAYS[c.day_of_week as string] ?? c.day_of_week,
      frequency_label: FREQ[c.frequency as string] ?? c.frequency,
    }))
    return NextResponse.json({ items })
  } catch (err) {
    console.error('GET consolidacao/cells:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

/** POST - cria célula */
export async function POST(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'consolidacao', action: 'manage' })
  if (!access.ok) return access.response
  try {
    const body = await request.json().catch(() => ({}))
    const name = (body.name ?? '').trim()
    if (!name) return NextResponse.json({ error: 'Nome da célula é obrigatório' }, { status: 400 })
    const dayOfWeek = body.day_of_week ?? 'sun'
    const timeOfDay = body.time_of_day ?? '19:00'
    const frequency = body.frequency ?? 'weekly'
    const payload = {
      name,
      church_id: body.church_id || null,
      arena_id: body.arena_id || null,
      team_id: body.team_id || null,
      day_of_week: dayOfWeek,
      time_of_day: timeOfDay,
      frequency,
      leader_person_id: body.leader_person_id || null,
      co_leader_person_id: body.co_leader_person_id || null,
    }
    const supabase = createSupabaseAdminClient(request)
    const { data: cell, error } = await supabase.from('cells').insert(payload).select(CELL_SELECT).single()
    if (error) return NextResponse.json({ error: 'Erro ao criar célula' }, { status: 500 })
    const ltIds = Array.isArray(body.lt_person_ids) ? body.lt_person_ids : []
    if (ltIds.length > 0) {
      await supabase.from('cell_lt_members').insert(ltIds.map((person_id: string) => ({ cell_id: cell.id, person_id })))
    }
    return NextResponse.json({ item: cell })
  } catch (err) {
    console.error('POST consolidacao/cells:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
