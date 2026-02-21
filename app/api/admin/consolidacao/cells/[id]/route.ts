import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

const CELL_SELECT = 'id, name, church_id, arena_id, team_id, day_of_week, time_of_day, frequency, leader_person_id, co_leader_person_id, is_active, created_at, updated_at'

type Ctx = { params: Promise<{ id: string }> }

/** GET - célula com líder, co-líder e LT */
export async function GET(request: NextRequest, ctx: Ctx) {
  const access = await requireAccess(request, { pageKey: 'consolidacao', action: 'view' })
  if (!access.ok) return access.response
  const { id } = await ctx.params
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })
  try {
    const supabase = createSupabaseAdminClient(request)
    const { data: cell, error: errCell } = await supabase.from('cells').select(CELL_SELECT).eq('id', id).single()
    if (errCell || !cell) return NextResponse.json({ error: 'Célula não encontrada' }, { status: 404 })
    const leaderId = (cell as { leader_person_id?: string }).leader_person_id
    const coLeaderId = (cell as { co_leader_person_id?: string }).co_leader_person_id
    const { data: ltRows } = await supabase.from('cell_lt_members').select('person_id').eq('cell_id', id)
    const ltIds = (ltRows ?? []).map((r: { person_id: string }) => r.person_id)
    const personIds = [leaderId, coLeaderId, ...ltIds].filter(Boolean) as string[]
    let leader = null
    let coLeader = null
    const lt: { id: string; full_name: string }[] = []
    if (personIds.length > 0) {
      const { data: people } = await supabase.from('people').select('id, full_name').in('id', personIds)
      const list = (people ?? []) as { id: string; full_name: string }[]
      if (leaderId) leader = list.find((p) => p.id === leaderId) ?? null
      if (coLeaderId) coLeader = list.find((p) => p.id === coLeaderId) ?? null
      ltIds.forEach((pid) => {
        const p = list.find((x) => x.id === pid)
        if (p) lt.push(p)
      })
    }
    return NextResponse.json({ item: cell, leader, co_leader: coLeader, lt })
  } catch (err) {
    console.error('GET consolidacao/cells/[id]:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

/** PATCH - atualiza célula */
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
    if (body.team_id !== undefined) payload.team_id = body.team_id || null
    if (body.day_of_week !== undefined) payload.day_of_week = body.day_of_week
    if (body.time_of_day !== undefined) payload.time_of_day = body.time_of_day
    if (body.frequency !== undefined) payload.frequency = body.frequency
    if (body.leader_person_id !== undefined) payload.leader_person_id = body.leader_person_id || null
    if (body.co_leader_person_id !== undefined) payload.co_leader_person_id = body.co_leader_person_id || null
    const supabase = createSupabaseAdminClient(request)
    if (Object.keys(payload).length > 0) {
      const { data, error } = await supabase.from('cells').update(payload).eq('id', id).select(CELL_SELECT).single()
      if (error) return NextResponse.json({ error: 'Erro ao atualizar' }, { status: 500 })
    }
    if (Array.isArray(body.lt_person_ids)) {
      await supabase.from('cell_lt_members').delete().eq('cell_id', id)
      if (body.lt_person_ids.length > 0) {
        await supabase.from('cell_lt_members').insert(body.lt_person_ids.map((person_id: string) => ({ cell_id: id, person_id })))
      }
    }
    const { data } = await supabase.from('cells').select(CELL_SELECT).eq('id', id).single()
    return NextResponse.json({ item: data })
  } catch (err) {
    console.error('PATCH consolidacao/cells/[id]:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

/** DELETE */
export async function DELETE(request: NextRequest, ctx: Ctx) {
  const access = await requireAccess(request, { pageKey: 'consolidacao', action: 'manage' })
  if (!access.ok) return access.response
  const { id } = await ctx.params
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })
  try {
    const supabase = createSupabaseAdminClient(request)
    const { error } = await supabase.from('cells').delete().eq('id', id)
    if (error) return NextResponse.json({ error: 'Erro ao excluir' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE consolidacao/cells/[id]:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
