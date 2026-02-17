import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

/** GET - Consulta status da venda (para polling na página de retorno). ?sale_id=uuid */
export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'livraria_pdv', action: 'create' })
  if (!access.ok) return access.response

  const { searchParams } = new URL(request.url)
  const saleId = searchParams.get('sale_id')
  if (!saleId) {
    return NextResponse.json({ error: 'sale_id é obrigatório.' }, { status: 400 })
  }

  const supabase = createSupabaseAdminClient(request)

  const { data: sale, error } = await supabase
    .from('bookstore_sales')
    .select('id, sale_number, status, paid_at, payment_provider, payment_provider_ref')
    .eq('id', saleId)
    .single()

  if (error || !sale) {
    return NextResponse.json({ error: 'Venda não encontrada.' }, { status: 404 })
  }

  const row = sale as {
    id: string
    sale_number: string
    status: string
    paid_at: string | null
    payment_provider: string | null
    payment_provider_ref: string | null
  }

  let providerStatus: string | null = null
  if (row.payment_provider_ref) {
    const { data: tx } = await supabase
      .from('bookstore_payment_transactions')
      .select('status')
      .eq('sale_id', saleId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (tx) providerStatus = (tx as { status: string }).status
  }

  return NextResponse.json({
    sale_id: row.id,
    sale_number: row.sale_number,
    status: row.status,
    paid_at: row.paid_at ?? null,
    payment_provider: row.payment_provider ?? null,
    provider_status: providerStatus ?? null,
  })
}
