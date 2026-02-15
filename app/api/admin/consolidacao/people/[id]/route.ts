import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

type Ctx = { params: Promise<{ id: string }> }

/** PATCH - atualiza pessoa (campos simples para cadastro consolidação) */
export async function PATCH(request: NextRequest, ctx: Ctx) {
  const access = await requireAccess(request, { pageKey: 'consolidacao', action: 'manage' })
  if (!access.ok) return access.response
  const { id } = await ctx.params
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })
  try {
    const body = await request.json().catch(() => ({}))
    const payload: Record<string, unknown> = {}
    if (body.full_name !== undefined) payload.full_name = (body.full_name ?? '').trim()
    if (body.email !== undefined) payload.email = (body.email ?? '').trim() || null
    if (body.mobile_phone !== undefined) payload.mobile_phone = (body.mobile_phone ?? '').trim() || null
    if (body.phone !== undefined) payload.phone = (body.phone ?? '').trim() || null
    if (Object.keys(payload).length === 0) {
      const supabase = createSupabaseAdminClient(request)
      const { data } = await supabase.from('people').select('*').eq('id', id).single()
      return NextResponse.json({ item: data })
    }
    const supabase = createSupabaseAdminClient(request)
    const { data, error } = await supabase.from('people').update(payload).eq('id', id).select().single()
    if (error) return NextResponse.json({ error: 'Erro ao atualizar' }, { status: 500 })
    return NextResponse.json({ item: data })
  } catch (err) {
    console.error('PATCH consolidacao/people/[id]:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

/** DELETE - não permitir excluir se tiver vínculos; ou permitir e deixar FK ON DELETE SET NULL falhar em restrict */
export async function DELETE(request: NextRequest, ctx: Ctx) {
  const access = await requireAccess(request, { pageKey: 'consolidacao', action: 'manage' })
  if (!access.ok) return access.response
  const { id } = await ctx.params
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })
  try {
    const supabase = createSupabaseAdminClient(request)
    const { error } = await supabase.from('people').delete().eq('id', id)
    if (error) {
      if (error.code === '23503') return NextResponse.json({ error: 'Pessoa está vinculada e não pode ser excluída' }, { status: 409 })
      return NextResponse.json({ error: 'Erro ao excluir' }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE consolidacao/people/[id]:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
