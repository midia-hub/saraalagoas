import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

/** GET - lista reservas com itens (para página de reservas) */
export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'livraria_reservas', action: 'view' })
  if (!access.ok) return access.response
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')?.trim() || ''
    const page = Math.max(0, parseInt(searchParams.get('page') ?? '1', 10) - 1)
    const perPage = Math.min(100, Math.max(1, parseInt(searchParams.get('per_page') ?? '20', 10)))
    const offset = page * perPage

    const supabase = createSupabaseAdminClient(request)
    let q = supabase
      .from('bookstore_reservations')
      .select('id, status, customer_name, customer_phone, notes, created_at, created_by', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (status && ['OPEN', 'CANCELLED', 'CONVERTED'].includes(status)) {
      q = q.eq('status', status)
    }

    const { data: reservations, error, count } = await q.range(offset, offset + perPage - 1)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const list = (reservations ?? []) as Array<{ id: string; status: string; customer_name: string | null; customer_phone: string | null; notes: string | null; created_at: string; created_by: string | null }>
    const ids = list.map((r) => r.id)

    if (ids.length === 0) {
      return NextResponse.json({ items: [], total: count ?? 0, page: page + 1, per_page: perPage })
    }

    const { data: itemsRows } = await supabase
      .from('bookstore_reservation_items')
      .select('reservation_id, product_id, quantity, unit_price, total_price')
      .in('reservation_id', ids)

    const { data: products } = await supabase
      .from('bookstore_products')
      .select('id, name')
      .in('id', Array.from(new Set((itemsRows ?? []).map((i: { product_id: string }) => i.product_id))))

    const productMap = new Map((products ?? []).map((p: { id: string; name: string }) => [p.id, p.name]))
    const byReservation: Record<string, Array<{ name: string; quantity: number; unit_price: number; total_price: number }>> = {}
    for (const r of list) byReservation[r.id] = []
    for (const i of itemsRows ?? []) {
      const r = i as { reservation_id: string; product_id: string; quantity: number; unit_price: number; total_price: number }
      if (byReservation[r.reservation_id]) {
        byReservation[r.reservation_id].push({
          name: productMap.get(r.product_id) ?? 'Produto',
          quantity: r.quantity,
          unit_price: r.unit_price,
          total_price: r.total_price,
        })
      }
    }

    const items = list.map((r) => ({
      ...r,
      items: byReservation[r.id] ?? [],
      total_amount: (byReservation[r.id] ?? []).reduce((s, x) => s + x.total_price, 0),
    }))

    return NextResponse.json({ items, total: count ?? 0, page: page + 1, per_page: perPage })
  } catch (err) {
    console.error('GET livraria/vendas/reservas:', err)
    return NextResponse.json({ error: 'Erro ao carregar reservas' }, { status: 500 })
  }
}
