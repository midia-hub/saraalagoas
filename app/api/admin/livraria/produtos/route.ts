import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

/** GET - lista produtos com filtros: search, category, active, low_stock */
export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'livraria_produtos', action: 'view' })
  if (!access.ok) return access.response
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')?.trim() || ''
    const category = searchParams.get('category')?.trim() || ''
    const activeParam = searchParams.get('active')
    const lowStock = searchParams.get('low_stock') === '1'

    const supabase = createSupabaseAdminClient(request)
    let q = supabase
      .from('bookstore_products')
      .select(`
        id,
        sku,
        barcode,
        name,
        description,
        category_id,
        supplier_id,
        cost_price,
        sale_price,
        discount_type,
        discount_value,
        min_stock,
        current_stock,
        active,
        created_at,
        updated_at,
        bookstore_categories(name),
        bookstore_product_images(id, image_path, sort_order)
      `, { count: 'exact' })

    if (search) {
      q = q.or(`name.ilike.%${search}%,sku.ilike.%${search}%,barcode.ilike.%${search}%`)
    }
    if (category) {
      q = q.eq('category_id', category)
    }
    if (activeParam !== null && activeParam !== '') {
      q = q.eq('active', activeParam === 'true')
    }

    const { data, error, count } = await q.order('name').range(0, 499)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    let items = (data ?? []) as Array<{ current_stock: number; min_stock: number; [k: string]: unknown }>
    if (lowStock) {
      items = items.filter((row) => row.current_stock <= row.min_stock)
    }
    return NextResponse.json({ items, total: lowStock ? items.length : (count ?? 0) })
  } catch (err) {
    console.error('GET livraria/produtos:', err)
    return NextResponse.json({ error: 'Erro ao listar produtos' }, { status: 500 })
  }
}

/** POST - criar produto (SKU gerado automaticamente se não informado) */
export async function POST(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'livraria_produtos', action: 'create' })
  if (!access.ok) return access.response
  try {
    const body = await request.json().catch(() => ({}))
    let sku = String(body.sku ?? '').trim()
    const name = String(body.name ?? '').trim()
    if (!name) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient(request)
    if (!sku) {
      const { data: nextSku, error: errSku } = await supabase.rpc('get_next_product_sku')
      if (errSku || !nextSku) {
        sku = `PROD-${Date.now().toString(36).toUpperCase().slice(-6)}`
      } else {
        sku = nextSku as string
      }
    }

    const payload = {
      sku,
      barcode: body.barcode ? String(body.barcode).trim() : null,
      name,
      description: body.description ? String(body.description).trim() : null,
      category_id: body.category_id || null,
      supplier_id: body.supplier_id || null,
      cost_price: Number(body.cost_price) || 0,
      sale_price: Number(body.sale_price) || 0,
      discount_type: body.discount_type === 'value' || body.discount_type === 'percent' ? body.discount_type : null,
      discount_value: Math.max(0, Number(body.discount_value) || 0),
      min_stock: Math.max(0, parseInt(String(body.min_stock), 10) || 0),
      current_stock: Math.max(0, parseInt(String(body.current_stock), 10) || 0),
      active: body.active !== false,
    }

    const { data, error } = await supabase.from('bookstore_products').insert(payload).select().single()
    if (error) {
      if (error.code === '23505') return NextResponse.json({ error: 'SKU já existe' }, { status: 400 })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json(data)
  } catch (err) {
    console.error('POST livraria/produtos:', err)
    return NextResponse.json({ error: 'Erro ao criar produto' }, { status: 500 })
  }
}
