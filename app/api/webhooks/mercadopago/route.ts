import { createHmac } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase-server'
import { getPayment } from '@/lib/payments/mercadopago/client'
import { getOrder } from '@/lib/payments/mercadopago/orders'

const requestIdHeader = 'x-request-id'
const signatureHeader = 'x-signature'

/**
 * Valida a assinatura do webhook do Mercado Pago (HMAC SHA256).
 * Documentação: https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks
 */
function verifyWebhookSignature(
  xSignature: string | null,
  xRequestId: string | null,
  dataId: string,
  secret: string
): boolean {
  if (!xSignature || !secret) return false

  const parts = xSignature.split(',')
  let ts: string | null = null
  let hash: string | null = null
  for (const part of parts) {
    const [key, value] = part.split('=').map((s) => s?.trim() ?? '')
    if (key === 'ts') ts = value
    else if (key === 'v1') hash = value
  }
  if (!ts || !hash) return false

  const dataIdStr = String(dataId ?? '')
  const dataIdNormalized = /^[a-zA-Z0-9]+$/.test(dataIdStr) ? dataIdStr.toLowerCase() : dataIdStr

  const manifestParts: string[] = [`id:${dataIdNormalized}`]
  if (xRequestId) manifestParts.push(`request-id:${xRequestId}`)
  manifestParts.push(`ts:${ts}`)
  const manifest = manifestParts.join(';') + ';'

  const computed = createHmac('sha256', secret).update(manifest).digest('hex')
  return computed === hash
}

/**
 * Webhook Mercado Pago (rota pública).
 * Recebe notificações de pagamento; valida assinatura (se MERCADOPAGO_WEBHOOK_SECRET definido) e consulta a API do MP para atualizar a venda.
 */
export async function POST(request: NextRequest) {
  const requestId = request.headers.get(requestIdHeader) ?? undefined
  console.log('[webhook mercadopago] received', { requestId })

  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ ok: false, error: 'Body inválido' }, { status: 400 })
    }

    const type = body.type as string | undefined
    // data.id pode vir no body ou nos query params (doc MP: validação usa valor em minúsculas)
    const url = request.nextUrl ?? new URL(request.url)
    const dataIdFromQuery = url.searchParams.get('data.id')
    const dataId = (body.data?.id ?? dataIdFromQuery) as string | undefined
    const rawNotification = { ...body, _received_at: new Date().toISOString() }

    if (!dataId) {
      return NextResponse.json({ ok: true, message: 'Evento sem id' })
    }

    const webhookSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim()
    if (webhookSecret) {
      const xSignature = request.headers.get(signatureHeader)
      const xRequestId = request.headers.get(requestIdHeader)
      const isValid = verifyWebhookSignature(xSignature, xRequestId, String(dataId), webhookSecret)
      if (!isValid) {
        console.warn('[webhook mercadopago] assinatura inválida')
        return NextResponse.json({ ok: false, error: 'Assinatura inválida' }, { status: 401 })
      }
    }

    // Notificação de order (QR no caixa): external_reference = sale_id, status processed = pago
    if (type === 'order') {
      try {
        const order = await getOrder(String(dataId))
        if (!order) {
          return NextResponse.json({ ok: true, message: 'Order não encontrada' })
        }
        const saleId = (order.external_reference || '').trim()
        if (!saleId) {
          console.warn('[webhook mercadopago] order sem external_reference', { orderId: dataId })
          return NextResponse.json({ ok: true, message: 'Order sem external_reference' })
        }
        const supabase = createSupabaseServiceClient()
        const { data: saleRow } = await supabase
          .from('bookstore_sales')
          .select('id, status, sale_number')
          .eq('id', saleId)
          .single()
        if (!saleRow) {
          return NextResponse.json({ ok: true, message: 'Venda não encontrada' })
        }
        const currentStatus = (saleRow as { status: string }).status
        if (currentStatus === 'PAID') {
          return NextResponse.json({ ok: true, message: 'Venda já paga' })
        }
        const orderStatus = (order.status || '').toLowerCase()
        if (orderStatus !== 'processed') {
          return NextResponse.json({ ok: true, message: `Order status ${orderStatus}, aguardando processed` })
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
          if (!(existingTx as { id?: string; status?: string } | null)?.id) {
            await supabase.from('bookstore_payment_transactions').insert({
              sale_id: saleId,
              provider: 'MERCADOPAGO',
              preference_id: null,
              payment_id: String(paymentId),
              merchant_order_id: String(dataId),
              status: 'APPROVED',
              amount: parseFloat(order.total_amount || '0'),
              currency: 'BRL',
              external_reference: saleId,
              raw_notification: rawNotification,
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
            payment_provider_ref: paymentId ? String(paymentId) : String(dataId),
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
        console.log('[webhook mercadopago] venda marcada como paga (order)', { saleId, orderId: dataId })
        return NextResponse.json({ ok: true })
      } catch (err) {
        console.error('[webhook mercadopago] processamento order', err)
        return NextResponse.json({ ok: false, error: 'Erro ao processar order' }, { status: 500 })
      }
    }

    if (type !== 'payment') {
      return NextResponse.json({ ok: true, message: 'Evento ignorado' })
    }

    const paymentId = String(dataId)
    const payment = await getPayment(paymentId)
    if (!payment) {
      console.warn('[webhook mercadopago] getPayment retornou null para id=', paymentId)
      return NextResponse.json({ ok: true, message: 'Pagamento não encontrado na API' })
    }

    const saleId = payment.external_reference ?? null
    if (!saleId) {
      console.warn('[webhook mercadopago] external_reference ausente', { paymentId })
      return NextResponse.json({ ok: true, message: 'external_reference ausente' })
    }

    const supabase = createSupabaseServiceClient()
    const mpStatus = (payment.status || '').toLowerCase()
    const txStatus =
      mpStatus === 'approved'
        ? 'APPROVED'
        : mpStatus === 'pending' || mpStatus === 'in_process' || mpStatus === 'in_mediation'
          ? 'PENDING'
          : mpStatus === 'rejected' || mpStatus === 'cancelled' || mpStatus === 'refunded' || mpStatus === 'charged_back'
            ? 'REJECTED'
            : 'PENDING'

    const { data: existingTx } = await supabase
      .from('bookstore_payment_transactions')
      .select('id, status')
      .eq('sale_id', saleId)
      .eq('payment_id', paymentId)
      .maybeSingle()

    if ((existingTx as { status?: string } | null)?.status === 'APPROVED') {
      return NextResponse.json({ ok: true, message: 'Já processado' })
    }

    const { data: saleRow } = await supabase
      .from('bookstore_sales')
      .select('id, status, sale_number')
      .eq('id', saleId)
      .single()

    if (!saleRow) {
      return NextResponse.json({ ok: true, message: 'Venda não encontrada' })
    }

    const currentSaleStatus = (saleRow as { status: string }).status
    const saleNumber = (saleRow as { sale_number?: string }).sale_number ?? saleId
    if (currentSaleStatus === 'PAID') {
      return NextResponse.json({ ok: true, message: 'Venda já paga' })
    }

    const { data: txRow } = await supabase
      .from('bookstore_payment_transactions')
      .select('id')
      .eq('sale_id', saleId)
      .eq('provider', 'MERCADOPAGO')
      .is('payment_id', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (txRow) {
      await supabase
        .from('bookstore_payment_transactions')
        .update({
          payment_id: paymentId,
          status: txStatus,
          raw_notification: rawNotification,
          raw_payment: payment as unknown as Record<string, unknown>,
          updated_at: new Date().toISOString(),
        })
        .eq('id', (txRow as { id: string }).id)
    }

    if (txStatus === 'APPROVED') {
      const now = new Date().toISOString()
      await supabase
        .from('bookstore_sales')
        .update({
          status: 'PAID',
          paid_at: now,
          provider_payload: {
            payment_id: payment.id,
            status: payment.status,
            date_approved: payment.date_approved,
            transaction_amount: payment.transaction_amount,
          } as unknown as Record<string, unknown>,
          updated_at: now,
        })
        .eq('id', saleId)

      const { data: saleItems } = await supabase
        .from('bookstore_sale_items')
        .select('id, product_id, quantity')
        .eq('sale_id', saleId)

      const userId = null

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
            notes: `Venda ${saleNumber} (Mercado Pago)`,
            created_by: userId,
          })
          await supabase.from('bookstore_products').update({ current_stock: newStock }).eq('id', item.product_id)
        }
      }
    } else if (txStatus === 'REJECTED') {
      await supabase
        .from('bookstore_sales')
        .update({
          status: 'FAILED',
          updated_at: new Date().toISOString(),
        })
        .eq('id', saleId)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[webhook mercadopago]', err)
    return NextResponse.json({ ok: false, error: 'Erro interno' }, { status: 500 })
  }
}
