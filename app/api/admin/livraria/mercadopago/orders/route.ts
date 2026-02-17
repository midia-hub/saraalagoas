import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { createOrder } from '@/lib/payments/mercadopago/orders'

/**
 * POST - Cria uma order de pagamento com QR (presencial) no Mercado Pago.
 * Body: pos_id (uuid do caixa na plataforma) ou external_pos_id, total_amount, external_reference,
 * description?, mode? (static|dynamic|hybrid), expiration_time?, items?, idempotency_key?
 */
export async function POST(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'livraria_pdv', action: 'create' })
  if (!access.ok) return access.response

  if (!process.env.MERCADOPAGO_ACCESS_TOKEN?.trim()) {
    return NextResponse.json(
      { error: 'MERCADOPAGO_ACCESS_TOKEN não configurado.' },
      { status: 503 }
    )
  }

  try {
    const body = await request.json().catch(() => ({}))
    const pos_id = body.pos_id ? String(body.pos_id).trim() : null
    const external_pos_id = body.external_pos_id ? String(body.external_pos_id).trim() : null
    const total_amount = body.total_amount != null ? Number(body.total_amount) : NaN
    const external_reference = body.external_reference != null ? String(body.external_reference).trim() : null
    const description = body.description != null ? String(body.description).trim() : undefined
    const mode = body.mode === 'dynamic' || body.mode === 'hybrid' ? body.mode : undefined
    const expiration_time = body.expiration_time ? String(body.expiration_time).trim() : undefined
    const items = Array.isArray(body.items) ? body.items : undefined
    const idempotency_key = body.idempotency_key ? String(body.idempotency_key).trim() : crypto.randomUUID()

    if (!external_reference) {
      return NextResponse.json({ error: 'external_reference é obrigatório (ex: id da venda).' }, { status: 400 })
    }
    if (Number.isNaN(total_amount) || total_amount <= 0) {
      return NextResponse.json({ error: 'total_amount é obrigatório e deve ser maior que zero.' }, { status: 400 })
    }

    let externalPosId = external_pos_id
    if (!externalPosId && pos_id) {
      const supabase = createSupabaseAdminClient(request)
      const { data: pos, error } = await supabase
        .from('livraria_mp_pos')
        .select('external_id')
        .eq('id', pos_id)
        .single()
      if (error || !pos) {
        return NextResponse.json({ error: 'Caixa (POS) não encontrado.' }, { status: 404 })
      }
      externalPosId = (pos as { external_id: string }).external_id
    }
    if (!externalPosId) {
      return NextResponse.json(
        { error: 'Informe pos_id (uuid do caixa) ou external_pos_id (ex: LOJ001POS001).' },
        { status: 400 }
      )
    }

    const order = await createOrder({
      external_pos_id: externalPosId,
      total_amount,
      external_reference,
      description,
      mode,
      expiration_time,
      idempotency_key,
      items: items?.map((i: { title?: string; unit_price?: number; quantity?: number }) => ({
        title: String(i.title ?? 'Item').slice(0, 150),
        unit_price: Number(i.unit_price ?? 0),
        quantity: Number(i.quantity ?? 1),
      })),
    })

    return NextResponse.json(order)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('POST livraria/mercadopago/orders:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
