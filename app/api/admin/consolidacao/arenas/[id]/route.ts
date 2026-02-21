import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

const ARENA_SELECT = 'id, name, church_id, day_of_week, time_of_day'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const access = await requireAccess(request, { pageKey: 'consolidacao', action: 'manage' })
  if (!access.ok) return access.response
  const { id } = await ctx.params
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })
  try {
    const body = await request.json().catch(() => ({}))
    const payload: Record<string, unknown> = {}
    if (body.name !== undefined) payload.name = (body.name ?? 'Arena').trim()
    if (body.church_id !== undefined) payload.church_id = body.church_id
    if (body.day_of_week !== undefined) payload.day_of_week = body.day_of_week
    if (body.time_of_day !== undefined) payload.time_of_day = body.time_of_day
    const supabase = createSupabaseAdminClient(request)
    if (Object.keys(payload).length > 0) {
      const { error } = await supabase.from('arenas').update(payload).eq('id', id)
      if (error) return NextResponse.json({ error: 'Erro ao atualizar' }, { status: 500 })
    }
    if (Array.isArray(body.leader_person_ids)) {
      await supabase.from('arena_leaders').delete().eq('arena_id', id)
      if (body.leader_person_ids.length > 0) {
        await supabase.from('arena_leaders').insert(body.leader_person_ids.map((person_id: string) => ({ arena_id: id, person_id })))
      }
    }
    const { data } = await supabase.from('arenas').select(ARENA_SELECT).eq('id', id).single()
    return NextResponse.json({ item: data })
  } catch (err) {
    console.error('PATCH consolidacao/arenas/[id]:', err)
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
    const { error } = await supabase.from('arenas').delete().eq('id', id)
    if (error) return NextResponse.json({ error: 'Erro ao excluir' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE consolidacao/arenas/[id]:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
