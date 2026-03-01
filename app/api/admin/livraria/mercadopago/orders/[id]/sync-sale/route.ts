import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { markSalePaidFromOrder } from '@/lib/payments/mercadopago/mark-sale-paid-from-order'

/**
 * POST - Sincroniza o status da venda com a Order do Mercado Pago (QR no caixa).
 * Se a order estiver "processed", marca a venda como PAID.
 * Útil quando o webhook não foi recebido (ex.: desenvolvimento sem ngrok) ou está atrasado.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireAccess(request, { pageKey: 'livraria_pdv', action: 'create' })
  if (!access.ok) return access.response

  const orderId = (await params).id?.trim()
  if (!orderId) {
    return NextResponse.json({ error: 'ID da order é obrigatório.' }, { status: 400 })
  }

  if (!process.env.MERCADOPAGO_ACCESS_TOKEN?.trim()) {
    return NextResponse.json(
      { error: 'MERCADOPAGO_ACCESS_TOKEN não configurado.' },
      { status: 503 }
    )
  }

  try {
    const supabase = createSupabaseAdminClient(request)
    const result = await markSalePaidFromOrder(orderId, supabase)

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.reason },
        { status: result.reason === 'Order não encontrada' ? 404 : 400 }
      )
    }

    return NextResponse.json({
      ok: true,
      sale_id: result.saleId,
      already_paid: result.alreadyPaid ?? false,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('POST livraria/mercadopago/orders/[id]/sync-sale:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
