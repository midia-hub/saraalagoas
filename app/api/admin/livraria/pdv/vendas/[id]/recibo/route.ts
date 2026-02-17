import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

/** GET - payload do recibo (venda + itens + operador) para exibição/impressão */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireAccess(request, { pageKey: 'livraria_vendas', action: 'view' })
  if (!access.ok) return access.response
  const { id } = await params
  try {
    const supabase = createSupabaseAdminClient(request)
    const { data: sale, error: saleErr } = await supabase
      .from('bookstore_sales')
      .select('id, sale_number, customer_name, customer_phone, payment_method, payment_provider, total_amount, discount_amount, notes, status, paid_at, receipt_json, created_at, created_by')
      .eq('id', id)
      .single()

    if (saleErr || !sale) {
      return NextResponse.json({ error: 'Venda não encontrada' }, { status: 404 })
    }

    const { data: items } = await supabase
      .from('bookstore_sale_items')
      .select('product_id, quantity, unit_price, total_price')
      .eq('sale_id', id)
      .order('id')

    const { data: products } = await supabase
      .from('bookstore_products')
      .select('id, name')
      .in('id', (items ?? []).map((i) => (i as { product_id: string }).product_id))

    const productMap = new Map((products ?? []).map((p: { id: string; name: string }) => [p.id, p.name]))
    const itemsWithName = (items ?? []).map((i: { product_id: string; quantity: number; unit_price: number; total_price: number }) => ({
      name: productMap.get(i.product_id) ?? 'Produto',
      quantity: i.quantity,
      unit_price: i.unit_price,
      total_price: i.total_price,
    }))

    let operatorName: string | null = null
    const createdBy = (sale as { created_by: string | null }).created_by
    if (createdBy) {
      try {
        const { data } = await supabase.auth.admin.getUserById(createdBy)
        const user = data?.user
        operatorName = (user?.user_metadata?.full_name as string) ?? user?.email ?? null
      } catch {
        // auth.admin pode não estar disponível
      }
    }

    const receipt = (sale as { receipt_json?: Record<string, unknown> }).receipt_json
    const subtotal = receipt && typeof receipt.subtotal === 'number' ? receipt.subtotal : (sale as { total_amount: number }).total_amount + Number((sale as { discount_amount?: number }).discount_amount ?? 0)

    const rawPaymentMethod = (sale as { payment_method: string | null }).payment_method
    const paymentMethodDisplay = rawPaymentMethod === 'Mercado Pago' ? 'Pix' : rawPaymentMethod

    return NextResponse.json({
      id: (sale as { id: string }).id,
      sale_number: (sale as { sale_number: string }).sale_number,
      customer_name: (sale as { customer_name: string | null }).customer_name,
      customer_phone: (sale as { customer_phone: string | null }).customer_phone,
      payment_method: paymentMethodDisplay,
      subtotal,
      discount_amount: Number((sale as { discount_amount?: number }).discount_amount ?? 0),
      total_amount: Number((sale as { total_amount: number }).total_amount),
      notes: (sale as { notes: string | null }).notes,
      status: (sale as { status: string }).status,
      paid_at: (sale as { paid_at: string | null }).paid_at ?? null,
      created_at: (sale as { created_at: string }).created_at,
      operator_name: operatorName,
      items: itemsWithName,
    })
  } catch (err) {
    console.error('GET livraria/pdv/vendas/[id]/recibo:', err)
    return NextResponse.json({ error: 'Erro ao carregar recibo' }, { status: 500 })
  }
}
