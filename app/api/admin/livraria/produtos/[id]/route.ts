import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

/** GET - um produto */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireAccess(request, { pageKey: 'livraria_produtos', action: 'view' })
  if (!access.ok) return access.response
  const { id } = await params
  try {
    const supabase = createSupabaseAdminClient(request)
    const { data, error } = await supabase
      .from('bookstore_products')
      .select('*, bookstore_categories(name), bookstore_suppliers(name), bookstore_product_images(id, image_path, sort_order)')
      .eq('id', id)
      .single()
    if (error || !data) return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 })
    return NextResponse.json(data)
  } catch (err) {
    console.error('GET livraria/produtos/[id]:', err)
    return NextResponse.json({ error: 'Erro ao carregar produto' }, { status: 500 })
  }
}

/** PATCH - editar produto (não altera current_stock; use movimentações) */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireAccess(request, { pageKey: 'livraria_produtos', action: 'edit' })
  if (!access.ok) return access.response
  const { id } = await params
  try {
    const body = await request.json().catch(() => ({}))
    const supabase = createSupabaseAdminClient(request)
    const payload: Record<string, unknown> = {}
    if (body.sku !== undefined) payload.sku = String(body.sku).trim()
    if (body.barcode !== undefined) payload.barcode = body.barcode ? String(body.barcode).trim() : null
    if (body.name !== undefined) payload.name = String(body.name).trim()
    if (body.description !== undefined) payload.description = body.description ? String(body.description).trim() : null
    if (body.category_id !== undefined) payload.category_id = body.category_id || null
    if (body.supplier_id !== undefined) payload.supplier_id = body.supplier_id || null
    if (body.cost_price !== undefined) payload.cost_price = Number(body.cost_price) || 0
    if (body.sale_price !== undefined) payload.sale_price = Number(body.sale_price) || 0
    if (body.discount_type !== undefined) payload.discount_type = body.discount_type === 'value' || body.discount_type === 'percent' ? body.discount_type : null
    if (body.discount_value !== undefined) payload.discount_value = Math.max(0, Number(body.discount_value) || 0)
    if (body.min_stock !== undefined) payload.min_stock = Math.max(0, parseInt(String(body.min_stock), 10) || 0)
    if (body.active !== undefined) payload.active = body.active !== false
    if (Object.keys(payload).length === 0) {
      return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 })
    }

    const { data, error } = await supabase.from('bookstore_products').update(payload).eq('id', id).select().single()
    if (error) {
      if (error.code === '23505') return NextResponse.json({ error: 'SKU já existe' }, { status: 400 })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json(data)
  } catch (err) {
    console.error('PATCH livraria/produtos/[id]:', err)
    return NextResponse.json({ error: 'Erro ao atualizar produto' }, { status: 500 })
  }
}

/** DELETE - desativar produto (soft delete) */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireAccess(request, { pageKey: 'livraria_produtos', action: 'delete' })
  if (!access.ok) return access.response
  const { id } = await params
  try {
    const supabase = createSupabaseAdminClient(request)
    const { data, error } = await supabase
      .from('bookstore_products')
      .update({ active: false })
      .eq('id', id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 })
    return NextResponse.json(data)
  } catch (err) {
    console.error('DELETE livraria/produtos/[id]:', err)
    return NextResponse.json({ error: 'Erro ao desativar produto' }, { status: 500 })
  }
}
