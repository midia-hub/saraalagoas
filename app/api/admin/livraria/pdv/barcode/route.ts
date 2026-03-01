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

/** GET ?code=... - busca produto por código de barras ou SKU */
export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'livraria_pdv', action: 'view' })
  if (!access.ok) return access.response
  const code = request.nextUrl.searchParams.get('code')?.trim()
  if (!code) {
    return NextResponse.json({ error: 'Informe o código (code=)' }, { status: 400 })
  }
  try {
    const supabase = createSupabaseAdminClient(request)
    const { data, error } = await supabase
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
      `)
      .or(`barcode.eq."${code}",sku.eq."${code}"`)
      .eq('active', true)
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) {
      return NextResponse.json(
        { error: 'Não encontramos esse código. Você pode buscar pelo nome ou SKU.' },
        { status: 404 }
      )
    }

    const r = data as unknown as {
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
      bookstore_categories: { name: string } | { name: string }[] | null
      bookstore_product_images?: Array<{ image_path: string; sort_order: number }>
    }
    const images = r.bookstore_product_images ?? []
    const firstImg = images.length ? images.sort((a, b) => a.sort_order - b.sort_order)[0] : null
    let image_url: string | null = r.image_url || null
    if (!image_url && firstImg?.image_path) image_url = getStorageUrl(firstImg.image_path)
    if (!image_url && r.image_path) image_url = getStorageUrl(r.image_path)
    const cat = Array.isArray(r.bookstore_categories) ? r.bookstore_categories[0] : r.bookstore_categories

    return NextResponse.json({
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
    })
  } catch (err) {
    console.error('GET livraria/pdv/barcode:', err)
    return NextResponse.json({ error: 'Erro ao buscar produto' }, { status: 500 })
  }
}
