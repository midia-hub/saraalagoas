import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

/** POST - atualização em massa: mode SET (estoque final) ou DELTA (diferença). Gera movimentações ENTRY_ADJUSTMENT / EXIT_ADJUSTMENT. */
export async function POST(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'livraria_estoque', action: 'manage' })
  if (!access.ok) return access.response
  try {
    const body = await request.json().catch(() => ({}))
    const mode = body.mode === 'DELTA' ? 'DELTA' : 'SET'
    const items = Array.isArray(body.items) ? body.items : []
    const userId = access.snapshot?.userId ?? null

    if (items.length === 0) {
      return NextResponse.json({ error: 'Envie ao menos um item em items' }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient(request)
    const results: Array<{ sku?: string; product_id?: string; success: boolean; error?: string; new_stock?: number }> = []

    for (const row of items) {
      const productId = row.product_id
      const sku = row.sku ? String(row.sku).trim() : ''
      const value = mode === 'SET' ? parseInt(String(row.value), 10) : parseInt(String(row.value), 10)
      const notes = row.notes ? String(row.notes).trim() : null

      if ((!productId && !sku) || (mode === 'SET' && (value < 0 || !Number.isInteger(value)))) {
        results.push({ sku: sku || undefined, product_id: productId, success: false, error: 'Dados inválidos' })
        continue
      }

      let product: { id: string; current_stock: number } | null = null
      if (productId) {
        const { data } = await supabase.from('bookstore_products').select('id, current_stock').eq('id', productId).single()
        product = data as { id: string; current_stock: number } | null
      } else if (sku) {
        const { data } = await supabase.from('bookstore_products').select('id, current_stock').eq('sku', sku).single()
        product = data as { id: string; current_stock: number } | null
      }

      if (!product) {
        results.push({ sku: sku || undefined, product_id: productId, success: false, error: 'Produto não encontrado' })
        continue
      }

      const current = product.current_stock
      let delta: number
      let newStock: number
      if (mode === 'SET') {
        newStock = Math.max(0, value)
        delta = newStock - current
      } else {
        delta = value
        newStock = Math.max(0, current + delta)
      }

      if (delta === 0) {
        results.push({ sku: sku || undefined, product_id: product.id, success: true, new_stock: current })
        continue
      }

      const movementType = delta > 0 ? 'ENTRY_ADJUSTMENT' : 'EXIT_ADJUSTMENT'
      const qty = Math.abs(delta)
      if (delta < 0 && current < qty) {
        results.push({ sku: sku || undefined, product_id: product.id, success: false, error: 'Estoque insuficiente para concluir a saída.' })
        continue
      }

      const { error: errMov } = await supabase.from('bookstore_stock_movements').insert({
        product_id: product.id,
        movement_type: movementType,
        quantity: qty,
        reference_type: 'BULK_IMPORT',
        notes: notes || (mode === 'SET' ? `Ajuste em massa (SET=${newStock})` : `Ajuste em massa (DELTA=${delta})`),
        created_by: userId,
      })
      if (errMov) {
        results.push({ sku: sku || undefined, product_id: product.id, success: false, error: errMov.message })
        continue
      }

      const { error: errUpd } = await supabase.from('bookstore_products').update({ current_stock: newStock }).eq('id', product.id)
      if (errUpd) {
        results.push({ sku: sku || undefined, product_id: product.id, success: false, error: errUpd.message })
        continue
      }

      results.push({ sku: sku || undefined, product_id: product.id, success: true, new_stock: newStock })
    }

    const updated = results.filter((r) => r.success).length
    const errors = results.filter((r) => !r.success)
    return NextResponse.json({ updated, errors, results })
  } catch (err) {
    console.error('POST livraria/estoque/bulk-update:', err)
    return NextResponse.json({ error: 'Erro na atualização em massa' }, { status: 500 })
  }
}
