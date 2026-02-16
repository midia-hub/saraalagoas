import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

const EXIT_TYPES = new Set([
  'EXIT_SALE',
  'EXIT_LOSS',
  'EXIT_DONATION',
  'EXIT_INTERNAL_USE',
  'EXIT_ADJUSTMENT',
])
const ENTRY_TYPES = new Set(['ENTRY_PURCHASE', 'ENTRY_ADJUSTMENT'])
const ALL_TYPES = new Set(Array.from(EXIT_TYPES).concat(Array.from(ENTRY_TYPES)))

/** POST - movimentar estoque (entrada ou saída). Sempre gera registro em bookstore_stock_movements e atualiza current_stock. */
export async function POST(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'livraria_estoque', action: 'create' })
  if (!access.ok) return access.response
  try {
    const body = await request.json().catch(() => ({}))
    const productId = body.product_id
    const movementType = body.movement_type
    const quantity = parseInt(String(body.quantity), 10)
    const notes = body.notes ? String(body.notes).trim() : null
    const referenceType = body.reference_type ? String(body.reference_type).trim() : null
    const referenceId = body.reference_id || null

    if (!productId || !movementType || !Number.isInteger(quantity) || quantity <= 0) {
      return NextResponse.json(
        { error: 'product_id, movement_type e quantity (inteiro > 0) são obrigatórios' },
        { status: 400 }
      )
    }
    if (!ALL_TYPES.has(movementType)) {
      return NextResponse.json({ error: 'movement_type inválido' }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient(request)
    const userId = access.snapshot?.userId ?? null

    const { data: product, error: errProduct } = await supabase
      .from('bookstore_products')
      .select('id, current_stock')
      .eq('id', productId)
      .single()

    if (errProduct || !product) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 })
    }

    const current = Number((product as { current_stock: number }).current_stock) || 0
    if (EXIT_TYPES.has(movementType) && current < quantity) {
      return NextResponse.json(
        { error: 'Estoque insuficiente para concluir a saída.' },
        { status: 400 }
      )
    }

    const delta = ENTRY_TYPES.has(movementType) ? quantity : -quantity
    const newStock = Math.max(0, current + delta)

    const { error: errMov } = await supabase.from('bookstore_stock_movements').insert({
      product_id: productId,
      movement_type: movementType,
      quantity,
      reference_type: referenceType,
      reference_id: referenceId,
      notes,
      created_by: userId,
    })
    if (errMov) return NextResponse.json({ error: errMov.message }, { status: 500 })

    const { error: errUpdate } = await supabase
      .from('bookstore_products')
      .update({ current_stock: newStock })
      .eq('id', productId)
    if (errUpdate) return NextResponse.json({ error: 'Erro ao atualizar estoque do produto' }, { status: 500 })

    return NextResponse.json({ ok: true, new_stock: newStock })
  } catch (err) {
    console.error('POST livraria/estoque/movimentar:', err)
    return NextResponse.json({ error: 'Erro ao movimentar estoque' }, { status: 500 })
  }
}
