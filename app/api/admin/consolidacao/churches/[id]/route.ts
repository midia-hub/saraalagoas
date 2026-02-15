import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

type Ctx = { params: Promise<{ id: string }> }

/** GET /api/admin/consolidacao/churches/[id] - igreja com lista de pastores (ids e nomes) */
export async function GET(request: NextRequest, ctx: Ctx) {
  const access = await requireAccess(request, { pageKey: 'consolidacao', action: 'view' })
  if (!access.ok) return access.response
  const { id } = await ctx.params
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })
  try {
    const supabase = createSupabaseAdminClient(request)
    const { data: church, error: errChurch } = await supabase.from('churches').select('id, name, created_at').eq('id', id).single()
    if (errChurch || !church) return NextResponse.json({ error: 'Igreja não encontrada' }, { status: 404 })
    const { data: links } = await supabase.from('church_pastors').select('person_id').eq('church_id', id)
    const personIds = (links ?? []).map((r: { person_id: string }) => r.person_id)
    const pastors: { id: string; full_name: string }[] = []
    if (personIds.length > 0) {
      const { data: people } = await supabase.from('people').select('id, full_name').in('id', personIds)
      pastors.push(...((people ?? []) as { id: string; full_name: string }[]))
    }
    return NextResponse.json({ item: church, pastor_ids: personIds, pastors })
  } catch (err) {
    console.error('GET consolidacao/churches/[id]:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

/** PATCH /api/admin/consolidacao/churches/[id] - nome e pastor_ids (substitui lista de pastores) */
export async function PATCH(request: NextRequest, ctx: Ctx) {
  const access = await requireAccess(request, { pageKey: 'consolidacao', action: 'manage' })
  if (!access.ok) return access.response
  const { id } = await ctx.params
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })
  try {
    const body = await request.json().catch(() => ({}))
    const name = (body.name ?? '').trim()
    if (!name) return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
    const supabase = createSupabaseAdminClient(request)
    const { data, error } = await supabase.from('churches').update({ name }).eq('id', id).select().single()
    if (error) return NextResponse.json({ error: 'Erro ao atualizar' }, { status: 500 })
    if (Array.isArray(body.pastor_ids)) {
      await supabase.from('church_pastors').delete().eq('church_id', id)
      const ids = body.pastor_ids.filter((x: unknown) => typeof x === 'string')
      if (ids.length > 0) {
        await supabase.from('church_pastors').insert(ids.map((person_id: string) => ({ church_id: id, person_id })))
      }
    }
    return NextResponse.json({ item: data })
  } catch (err) {
    console.error('PATCH consolidacao/churches/[id]:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

/** DELETE /api/admin/consolidacao/churches/[id] */
export async function DELETE(request: NextRequest, ctx: Ctx) {
  const access = await requireAccess(request, { pageKey: 'consolidacao', action: 'manage' })
  if (!access.ok) return access.response
  const { id } = await ctx.params
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })
  try {
    const supabase = createSupabaseAdminClient(request)
    const { error } = await supabase.from('churches').delete().eq('id', id)
    if (error) return NextResponse.json({ error: 'Erro ao excluir' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE consolidacao/churches/[id]:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
