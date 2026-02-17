import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

function effectivePrice(salePrice: number, discountType: string | null, discountValue: number | null): number {
  const base = Number(salePrice) || 0
  if (!discountType || discountType === 'value') {
    return Math.max(0, base - Math.max(0, Number(discountValue) || 0))
  }
  if (discountType === 'percent') {
    const p = Math.min(100, Math.max(0, Number(discountValue) || 0))
    return Math.max(0, base * (1 - p / 100))
  }
  return base
}

/** POST - criar reserva (não reduz estoque); snapshot de preços nos itens */
export async function POST(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'livraria_reservas', action: 'create' })
  if (!access.ok) return access.response
  try {
    const body = await request.json().catch(() => ({}))
    const customerName = body.customer_name ? String(body.customer_name).trim() || null : null
    const customerPhone = body.customer_phone ? String(body.customer_phone).trim() || null : null
    const notes = body.notes ? String(body.notes).trim() || null : null
    const items = Array.isArray(body.items) ? body.items : []

    if (items.length === 0) {
      return NextResponse.json({ error: 'Adicione ao menos um item à reserva.' }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient(request)
    const userId = access.snapshot?.userId ?? null

    const { data: res, error: errRes } = await supabase
      .from('bookstore_reservations')
      .insert({
        status: 'OPEN',
        customer_name: customerName,
        customer_phone: customerPhone,
        notes,
        created_by: userId,
      })
      .select()
      .single()

    if (errRes || !res) {
      return NextResponse.json({ error: errRes?.message ?? 'Erro ao criar reserva' }, { status: 500 })
    }
    const reservationId = (res as { id: string }).id

    const reservationItems: Array<{ reservation_id: string; product_id: string; quantity: number; unit_price: number; total_price: number }> = []
    for (const row of items) {
      const productId = row.product_id
      const quantity = parseInt(String(row.quantity), 10)
      if (!productId || quantity <= 0) continue

      const { data: prod, error: errProd } = await supabase
        .from('bookstore_products')
        .select('id, sale_price, discount_type, discount_value')
        .eq('id', productId)
        .single()

      if (errProd || !prod) continue
      const unitPrice = effectivePrice(
        (prod as { sale_price: number }).sale_price,
        (prod as { discount_type: string | null }).discount_type,
        (prod as { discount_value: number | null }).discount_value
      )
      reservationItems.push({
        reservation_id: reservationId,
        product_id: productId,
        quantity,
        unit_price: unitPrice,
        total_price: unitPrice * quantity,
      })
    }

    if (reservationItems.length > 0) {
      await supabase.from('bookstore_reservation_items').insert(reservationItems)
    }

    return NextResponse.json({
      reservation_id: reservationId,
      status: 'OPEN',
      customer_name: customerName,
      customer_phone: customerPhone,
      notes,
      created_at: (res as { created_at: string }).created_at,
      created_by: userId,
    })
  } catch (err) {
    console.error('POST livraria/pdv/reservas:', err)
    return NextResponse.json({ error: 'Erro ao criar reserva' }, { status: 500 })
  }
}
