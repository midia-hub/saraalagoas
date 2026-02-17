import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { cancelOrder } from '@/lib/payments/mercadopago/orders'

/** POST - Cancela uma order. Só é possível quando o status da order é "created". */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireAccess(request, { pageKey: 'livraria_pdv', action: 'create' })
  if (!access.ok) return access.response

  const id = (await params).id?.trim()
  if (!id) return NextResponse.json({ error: 'ID da order é obrigatório.' }, { status: 400 })

  if (!process.env.MERCADOPAGO_ACCESS_TOKEN?.trim()) {
    return NextResponse.json({ error: 'MERCADOPAGO_ACCESS_TOKEN não configurado.' }, { status: 503 })
  }

  try {
    const order = await cancelOrder(id)
    return NextResponse.json(order)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('POST livraria/mercadopago/orders/[id]/cancel:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
