import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

/** GET - detalhe do cupom */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireAccess(request, { pageKey: 'livraria_cupons', action: 'view' })
  if (!access.ok) return access.response
  const { id } = await params
  if (!id) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
  try {
    const supabase = createSupabaseAdminClient(request)
    const { data, error } = await supabase.from('bookstore_coupons').select('*').eq('id', id).single()
    if (error || !data) return NextResponse.json({ error: 'Cupom não encontrado' }, { status: 404 })
    return NextResponse.json(data)
  } catch (err) {
    console.error('GET livraria/cupons/[id]:', err)
    return NextResponse.json({ error: 'Erro ao carregar cupom' }, { status: 500 })
  }
}

/** PATCH - editar cupom */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireAccess(request, { pageKey: 'livraria_cupons', action: 'edit' })
  if (!access.ok) return access.response
  const { id } = await params
  if (!id) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
  try {
    const body = await request.json().catch(() => ({}))
    const supabase = createSupabaseAdminClient(request)
    const updates: Record<string, unknown> = {}
    if (body.code !== undefined) updates.code = String(body.code).trim().toUpperCase()
    if (body.description !== undefined) updates.description = body.description ? String(body.description).trim() || null : null
    if (body.discount_type !== undefined) updates.discount_type = body.discount_type === 'percent' ? 'percent' : 'value'
    if (body.discount_value !== undefined) updates.discount_value = Math.max(0, Number(body.discount_value) || 0)
    if (body.min_purchase !== undefined) updates.min_purchase = Math.max(0, Number(body.min_purchase) || 0)
    if (body.valid_from !== undefined) updates.valid_from = body.valid_from ? new Date(body.valid_from).toISOString() : null
    if (body.valid_until !== undefined) updates.valid_until = body.valid_until ? new Date(body.valid_until).toISOString() : null
    if (body.usage_limit !== undefined) updates.usage_limit = body.usage_limit != null ? (Number(body.usage_limit) > 0 ? Math.floor(Number(body.usage_limit)) : null) : null
    if (body.active !== undefined) updates.active = !!body.active
    if (Object.keys(updates).length === 0) {
      const { data } = await supabase.from('bookstore_coupons').select('*').eq('id', id).single()
      return NextResponse.json(data ?? { error: 'Cupom não encontrado' }, data ? { status: 200 } : { status: 404 })
    }
    const { data, error } = await supabase.from('bookstore_coupons').update(updates).eq('id', id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ error: 'Cupom não encontrado' }, { status: 404 })
    return NextResponse.json(data)
  } catch (err) {
    console.error('PATCH livraria/cupons/[id]:', err)
    return NextResponse.json({ error: 'Erro ao atualizar cupom' }, { status: 500 })
  }
}

/** DELETE - excluir cupom */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireAccess(request, { pageKey: 'livraria_cupons', action: 'delete' })
  if (!access.ok) return access.response
  const { id } = await params
  if (!id) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
  try {
    const supabase = createSupabaseAdminClient(request)
    const { error } = await supabase.from('bookstore_coupons').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('DELETE livraria/cupons/[id]:', err)
    return NextResponse.json({ error: 'Erro ao excluir cupom' }, { status: 500 })
  }
}
