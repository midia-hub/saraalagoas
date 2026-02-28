import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

/** GET - lista movimentações com filtros: from, to, type, product_id */
export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'livraria_estoque', action: 'view' })
  if (!access.ok) return access.response
  try {
    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from')?.trim() || ''
    const to = searchParams.get('to')?.trim() || ''
    const type = searchParams.get('type')?.trim() || ''
    const productId = searchParams.get('product_id')?.trim() || ''

    const supabase = createSupabaseAdminClient(request)
    let q = supabase
      .from('bookstore_stock_movements')
      .select(`
        id,
        product_id,
        movement_type,
        quantity,
        reference_type,
        reference_id,
        notes,
        created_by,
        created_at,
        bookstore_products(sku, name)
      `, { count: 'exact' })

    if (from) q = q.gte('created_at', from)
    if (to) q = q.lte('created_at', to + 'T23:59:59.999Z')
    if (type) q = q.eq('movement_type', type)
    if (productId) q = q.eq('product_id', productId)

    const { data, error, count } = await q.order('created_at', { ascending: false }).range(0, 999)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ items: data ?? [], total: count ?? 0 })
  } catch (err) {
    console.error('GET livraria/movimentacoes:', err)
    return NextResponse.json({ error: 'Erro ao listar movimentações' }, { status: 500 })
  }
}
