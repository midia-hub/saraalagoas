/**
 * Marca uma venda como paga a partir do status da Order do Mercado Pago (QR no caixa).
 * Usado pelo webhook e pelo endpoint de sync (fallback quando o operador permanece na tela).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { getOrder } from '@/lib/payments/mercadopago/orders'

export type MarkSalePaidResult =
  | { ok: true; saleId: string; alreadyPaid?: boolean }
  | { ok: false; reason: string }

export async function markSalePaidFromOrder(
  orderId: string,
  supabase: SupabaseClient,
  options?: { rawNotification?: Record<string, unknown> }
): Promise<MarkSalePaidResult> {
  const order = await getOrder(orderId)
  if (!order) {
    return { ok: false, reason: 'Order não encontrada' }
  }

  const saleId = (order.external_reference || '').trim()
  if (!saleId) {
    return { ok: false, reason: 'Order sem external_reference' }
  }

  const { data: saleRow, error: saleError } = await supabase
    .from('bookstore_sales')
    .select('id, status, sale_number')
    .eq('id', saleId)
    .single()

  if (saleError || !saleRow) {
    return { ok: false, reason: 'Venda não encontrada' }
  }

  const currentStatus = (saleRow as { status: string }).status
  if (currentStatus === 'PAID') {
    return { ok: true, saleId, alreadyPaid: true }
  }

  const orderStatus = (order.status || '').toLowerCase()
  if (orderStatus !== 'processed') {
    return { ok: false, reason: `Order status ${orderStatus}, aguardando processed` }
  }

  const paymentId = order.transactions?.payments?.[0]?.id
  const now = new Date().toISOString()
  const saleNumber = (saleRow as { sale_number?: string }).sale_number ?? saleId

  if (paymentId) {
    const { data: existingTx } = await supabase
      .from('bookstore_payment_transactions')
      .select('id, status')
      .eq('sale_id', saleId)
      .eq('payment_id', String(paymentId))
      .maybeSingle()

    if (!(existingTx as { id?: string } | null)?.id) {
      await supabase.from('bookstore_payment_transactions').insert({
        sale_id: saleId,
        provider: 'MERCADOPAGO',
        preference_id: null,
        payment_id: String(paymentId),
        merchant_order_id: String(orderId),
        status: 'APPROVED',
        amount: parseFloat(order.total_amount || '0'),
        currency: 'BRL',
        external_reference: saleId,
        raw_notification: options?.rawNotification ?? { source: 'sync-sale' },
        raw_payment: order as unknown as Record<string, unknown>,
      })
    }
  }

  await supabase
    .from('bookstore_sales')
    .update({
      status: 'PAID',
      paid_at: now,
      payment_provider: 'MERCADOPAGO',
      payment_provider_ref: paymentId ? String(paymentId) : String(orderId),
      provider_payload: {
        order_id: order.id,
        payment_id: paymentId,
        status: order.status,
        total_amount: order.total_amount,
      } as unknown as Record<string, unknown>,
      updated_at: now,
    })
    .eq('id', saleId)

  const { data: saleItems } = await supabase
    .from('bookstore_sale_items')
    .select('id, product_id, quantity')
    .eq('sale_id', saleId)

  if (saleItems?.length) {
    for (const item of saleItems as Array<{ product_id: string; quantity: number }>) {
      const { data: prod } = await supabase
        .from('bookstore_products')
        .select('current_stock')
        .eq('id', item.product_id)
        .single()
      const current = Number((prod as { current_stock: number } | null)?.current_stock) ?? 0
      const newStock = Math.max(0, current - item.quantity)
      await supabase.from('bookstore_stock_movements').insert({
        product_id: item.product_id,
        movement_type: 'EXIT_SALE',
        quantity: item.quantity,
        reference_type: 'SALE',
        reference_id: saleId,
        notes: `Venda ${saleNumber} (Mercado Pago QR)`,
        created_by: null,
      })
      await supabase.from('bookstore_products').update({ current_stock: newStock }).eq('id', item.product_id)
    }
  }

  return { ok: true, saleId }
}
