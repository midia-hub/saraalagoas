import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

/** POST - registrar venda: cria bookstore_sales + bookstore_sale_items + EXIT_SALE por item + atualiza current_stock */
export async function POST(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'livraria_estoque', action: 'create' })
  if (!access.ok) return access.response
  try {
    const body = await request.json().catch(() => ({}))
    const customerName = body.customer_name ? String(body.customer_name).trim() : null
    const paymentMethod = body.payment_method ? String(body.payment_method).trim() : null
    const items = Array.isArray(body.items) ? body.items : []

    if (items.length === 0) {
      return NextResponse.json({ error: 'Envie ao menos um item na venda' }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient(request)
    const userId = access.snapshot?.userId ?? null

    const { data: lastSale } = await supabase
      .from('bookstore_sales')
      .select('sale_number')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    const lastNum = lastSale?.sale_number ? parseInt(String((lastSale as { sale_number: string }).sale_number).replace(/\D/g, ''), 10) || 0 : 0
    const saleNumber = `V${String(lastNum + 1).padStart(6, '0')}`

    let totalAmount = 0
    const saleItems: Array<{ product_id: string; quantity: number; unit_price: number; total_price: number }> = []
    for (const row of items) {
      const productId = row.product_id
      const quantity = parseInt(String(row.quantity), 10)
      const unitPrice = Number(row.unit_price) || 0
      if (!productId || quantity <= 0) continue
      const totalPrice = quantity * unitPrice
      totalAmount += totalPrice
      saleItems.push({ product_id: productId, quantity, unit_price: unitPrice, total_price: totalPrice })
    }

    if (saleItems.length === 0) {
      return NextResponse.json({ error: 'Itens inválidos' }, { status: 400 })
    }

    const { data: sale, error: errSale } = await supabase
      .from('bookstore_sales')
      .insert({
        sale_number: saleNumber,
        customer_name: customerName,
        payment_method: paymentMethod,
        total_amount: totalAmount,
        created_by: userId,
      })
      .select()
      .single()

    if (errSale || !sale) return NextResponse.json({ error: errSale?.message || 'Erro ao criar venda' }, { status: 500 })
    const saleId = (sale as { id: string }).id

    for (const item of saleItems) {
      const { data: prod, error: errProd } = await supabase
        .from('bookstore_products')
        .select('id, current_stock')
        .eq('id', item.product_id)
        .single()
      if (errProd || !prod) {
        return NextResponse.json({ error: `Produto ${item.product_id} não encontrado` }, { status: 400 })
      }
      const current = Number((prod as { current_stock: number }).current_stock) || 0
      if (current < item.quantity) {
        return NextResponse.json(
          { error: 'Estoque insuficiente para concluir a saída.' },
          { status: 400 }
        )
      }
    }

    const insertedItems: Array<{ sale_id: string; product_id: string; quantity: number; unit_price: number; total_price: number }> = saleItems.map((i) => ({
      sale_id: saleId,
      product_id: i.product_id,
      quantity: i.quantity,
      unit_price: i.unit_price,
      total_price: i.total_price,
    }))
    const { error: errItems } = await supabase.from('bookstore_sale_items').insert(insertedItems)
    if (errItems) return NextResponse.json({ error: errItems.message }, { status: 500 })

    for (const item of saleItems) {
      const { data: prod } = await supabase.from('bookstore_products').select('current_stock').eq('id', item.product_id).single()
      const current = Number((prod as { current_stock: number } | null)?.current_stock) || 0
      const newStock = Math.max(0, current - item.quantity)
      await supabase.from('bookstore_stock_movements').insert({
        product_id: item.product_id,
        movement_type: 'EXIT_SALE',
        quantity: item.quantity,
        reference_type: 'SALE',
        reference_id: saleId,
        notes: `Venda ${saleNumber}`,
        created_by: userId,
      })
      await supabase.from('bookstore_products').update({ current_stock: newStock }).eq('id', item.product_id)
    }

    return NextResponse.json({ sale, sale_number: saleNumber })
  } catch (err) {
    console.error('POST livraria/vendas:', err)
    return NextResponse.json({ error: 'Erro ao registrar venda' }, { status: 500 })
  }
}
