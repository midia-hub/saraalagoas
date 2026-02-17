import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { getOrder } from '@/lib/payments/mercadopago/orders'

/** GET - Consulta uma order do Mercado Pago pelo id. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireAccess(request, { pageKey: 'livraria_pdv', action: 'view' })
  if (!access.ok) return access.response

  const id = (await params).id?.trim()
  if (!id) return NextResponse.json({ error: 'ID da order é obrigatório.' }, { status: 400 })

  if (!process.env.MERCADOPAGO_ACCESS_TOKEN?.trim()) {
    return NextResponse.json({ error: 'MERCADOPAGO_ACCESS_TOKEN não configurado.' }, { status: 503 })
  }

  try {
    const order = await getOrder(id)
    if (!order) return NextResponse.json({ error: 'Order não encontrada.' }, { status: 404 })
    return NextResponse.json(order)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('GET livraria/mercadopago/orders/[id]:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
