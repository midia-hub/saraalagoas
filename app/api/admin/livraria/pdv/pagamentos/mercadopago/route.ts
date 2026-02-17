import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { createPixPayment, isMercadoPagoConfigured } from '@/lib/payments/mercadopago/client'

function baseUrl(): string {
  if (typeof window !== 'undefined') return ''
  const url = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
  if (url) return url.startsWith('http') ? url : `https://${url}`
  return 'http://localhost:3000'
}

/** POST - Cria pagamento Pix Mercado Pago para uma venda PENDING. Retorna QR code para pagamento. */
export async function POST(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'livraria_pdv', action: 'create' })
  if (!access.ok) return access.response

  if (!isMercadoPagoConfigured()) {
    return NextResponse.json(
      { error: 'Mercado Pago não está configurado. Defina MERCADOPAGO_ACCESS_TOKEN.' },
      { status: 503 }
    )
  }

  try {
    const body = await request.json().catch(() => ({}))
    const saleId = body.sale_id ? String(body.sale_id).trim() : null
    if (!saleId) {
      return NextResponse.json({ error: 'sale_id é obrigatório.' }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient(request)

    const { data: sale, error: saleError } = await supabase
      .from('bookstore_sales')
      .select('id, sale_number, status, total_amount, payment_provider, payment_provider_ref, customer_name')
      .eq('id', saleId)
      .single()

    if (saleError || !sale) {
      return NextResponse.json({ error: 'Venda não encontrada.' }, { status: 404 })
    }

    const row = sale as {
      id: string
      sale_number: string
      status: string
      total_amount: number
      payment_provider: string | null
      payment_provider_ref: string | null
      customer_name: string | null
    }

    if (row.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Esta venda não está pendente de pagamento. Status: ' + row.status },
        { status: 400 }
      )
    }

    if (Number(row.total_amount) <= 0) {
      return NextResponse.json({ error: 'Valor total da venda deve ser maior que zero.' }, { status: 400 })
    }

    const { data: saleItems, error: itemsError } = await supabase
      .from('bookstore_sale_items')
      .select('id, product_id, quantity, unit_price, total_price')
      .eq('sale_id', saleId)

    if (itemsError || !saleItems?.length) {
      return NextResponse.json({ error: 'Itens da venda não encontrados.' }, { status: 400 })
    }

    const base = baseUrl()
    const notificationUrlRaw =
      process.env.MERCADOPAGO_WEBHOOK_URL || `${base}/api/webhooks/mercadopago`
    const notificationUrl =
      notificationUrlRaw.startsWith('https://') ? notificationUrlRaw : undefined
    const amount = Number(row.total_amount)
    const description = `Venda ${row.sale_number} - Livraria`

    const idempotencyKey = crypto.randomUUID?.() ?? `sale-${saleId}-${Date.now()}`
    const pix = await createPixPayment({
      transaction_amount: amount,
      description,
      external_reference: saleId,
      payer_email: body.payer_email ? String(body.payer_email).trim() : 'cliente@livraria.com.br',
      notification_url: notificationUrl,
      idempotencyKey,
    })

    const paymentIdStr = String(pix.payment_id)
    const txPayload = {
      sale_id: saleId,
      provider: 'MERCADOPAGO',
      preference_id: null,
      payment_id: paymentIdStr,
      merchant_order_id: null,
      status: 'CREATED',
      amount,
      currency: 'BRL',
      idempotency_key: idempotencyKey,
      external_reference: saleId,
      raw_notification: null,
      raw_payment: null,
    }

    const { error: txInsertError } = await supabase
      .from('bookstore_payment_transactions')
      .insert(txPayload)

    if (txInsertError) {
      console.error('bookstore_payment_transactions insert:', txInsertError)
    }

    await supabase
      .from('bookstore_sales')
      .update({
        payment_provider: 'MERCADOPAGO',
        payment_provider_ref: paymentIdStr,
      })
      .eq('id', saleId)

    return NextResponse.json({
      payment_id: pix.payment_id,
      sale_id: saleId,
      status: pix.status,
      qr_code_base64: pix.qr_code_base64,
      qr_code: pix.qr_code,
    })
  } catch (err: unknown) {
    let message = toErrorMessage(err)
    if (message.toLowerCase().includes('unauthorized use of live credentials')) {
      message =
        'Use credenciais de TESTE do Mercado Pago em desenvolvimento. No painel do desenvolvedor, aba "Credenciais de teste", copie o Access Token (começa com TEST-) e defina MERCADOPAGO_ACCESS_TOKEN no .env.'
    }
    console.error('POST livraria/pdv/pagamentos/mercadopago:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object') {
    const o = err as Record<string, unknown>
    if (typeof o.message === 'string') return o.message
    if (o.cause && typeof o.cause === 'object') {
      const c = o.cause as Record<string, unknown>
      if (typeof c.message === 'string') return c.message
      if (Array.isArray(c.cause) && c.cause.length > 0) {
        const first = c.cause[0]
        if (first && typeof first === 'object' && typeof (first as { description?: string }).description === 'string') {
          return (first as { description: string }).description
        }
      }
    }
    try {
      return JSON.stringify(o)
    } catch {
      return 'Erro ao criar pagamento Pix no Mercado Pago.'
    }
  }
  return typeof err === 'string' ? err : 'Erro ao criar pagamento Pix no Mercado Pago.'
}
