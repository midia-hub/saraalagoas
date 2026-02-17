import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { getStorageUrl } from '@/lib/storage-url'

function effectivePrice(salePrice: number, discountType: string | null, discountValue: number | null): number {
  const base = Number(salePrice) || 0
  if (!discountType || discountType === 'value') {
    const v = Math.max(0, Number(discountValue) || 0)
    return Math.max(0, base - v)
  }
  if (discountType === 'percent') {
    const p = Math.min(100, Math.max(0, Number(discountValue) || 0))
    return Math.max(0, base * (1 - p / 100))
  }
  return base
}

/** GET - lista produtos para PDV: id, sku, barcode, name, sale_price, current_stock, min_stock, active, image_url, category_name */
export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'livraria_pdv', action: 'view' })
  if (!access.ok) return access.response
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')?.trim() || ''
    const category = searchParams.get('category')?.trim() || ''
    const activeParam = searchParams.get('active')
    const inStock = searchParams.get('in_stock')
    const sort = searchParams.get('sort') || 'name'

    const supabase = createSupabaseAdminClient(request)
    let q = supabase
      .from('bookstore_products')
      .select(`
        id,
        sku,
        barcode,
        name,
        sale_price,
        discount_type,
        discount_value,
        current_stock,
        min_stock,
        active,
        image_url,
        image_path,
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
    if (inStock === 'true') {
      q = q.gt('current_stock', 0)
    }
    if (inStock === 'false') {
      q = q.lte('current_stock', 0)
    }

    if (sort === 'price') {
      q = q.order('sale_price', { ascending: true })
    } else if (sort === 'stock') {
      q = q.order('current_stock', { ascending: false })
    } else {
      q = q.order('name', { ascending: true })
    }

    const { data, error } = await q.range(0, 499)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const rows = (data ?? []) as unknown as Array<{
      id: string
      sku: string
      barcode: string | null
      name: string
      sale_price: number
      discount_type: string | null
      discount_value: number | null
      current_stock: number
      min_stock: number
      active: boolean
      image_url: string | null
      image_path: string | null
      bookstore_categories: { name: string } | Array<{ name: string }> | null
      bookstore_product_images?: Array<{ image_path: string; sort_order: number }>
    }>

    const items = rows.map((r) => {
      const cat = Array.isArray(r.bookstore_categories) ? r.bookstore_categories[0] : r.bookstore_categories
      const images = r.bookstore_product_images ?? []
      const firstImg = images.length ? images.sort((a, b) => a.sort_order - b.sort_order)[0] : null
      let image_url: string | null = r.image_url || null
      if (!image_url && firstImg?.image_path) {
        image_url = getStorageUrl(firstImg.image_path)
      }
      if (!image_url && r.image_path) {
        image_url = getStorageUrl(r.image_path)
      }
      return {
        id: r.id,
        sku: r.sku,
        barcode: r.barcode,
        name: r.name,
        sale_price: r.sale_price,
        effective_price: effectivePrice(r.sale_price, r.discount_type, r.discount_value),
        current_stock: Number(r.current_stock) ?? 0,
        min_stock: Number(r.min_stock) ?? 0,
        active: !!r.active,
        image_url,
        category_name: cat?.name ?? null,
      }
    })

    return NextResponse.json({ items })
  } catch (err) {
    console.error('GET livraria/pdv/produtos:', err)
    return NextResponse.json({ error: 'Erro ao listar produtos' }, { status: 500 })
  }
}
