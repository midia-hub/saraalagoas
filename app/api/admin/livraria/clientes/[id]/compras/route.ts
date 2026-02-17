import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

/** GET - histórico de compras do cliente */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireAccess(request, { pageKey: 'livraria_clientes', action: 'view' })
  if (!access.ok) return access.response
  const { id: customerId } = await params
  if (!customerId) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  try {
    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from')?.trim() || ''
    const to = searchParams.get('to')?.trim() || ''
    const statusFilter = searchParams.get('status') // pendente | quitada
    const saleType = searchParams.get('sale_type') // PAID | CREDIT

    const supabase = createSupabaseAdminClient(request)

    let q = supabase
      .from('bookstore_sales')
      .select(`
        id,
        sale_number,
        sale_type,
        total_amount,
        discount_amount,
        paid_amount,
        pending_amount,
        payment_method,
        created_at,
        due_date
      `)
      .eq('customer_id', customerId)
      .neq('status', 'CANCELLED')
      .order('created_at', { ascending: false })

    if (from) q = q.gte('created_at', from)
    if (to) q = q.lte('created_at', to + 'T23:59:59.999Z')
    if (saleType === 'PAID' || saleType === 'CREDIT') q = q.eq('sale_type', saleType)
    if (statusFilter === 'pendente') q = q.gt('pending_amount', 0)
    if (statusFilter === 'quitada') q = q.eq('pending_amount', 0)

    const { data, error } = await q
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const items = (data ?? []) as Array<{
      id: string
      sale_number: string
      sale_type: string
      total_amount: number
      discount_amount: number
      paid_amount: number
      pending_amount: number
      payment_method: string | null
      created_at: string
      due_date: string | null
    }>

    return NextResponse.json({ items })
  } catch (err) {
    console.error('GET livraria/clientes/[id]/compras:', err)
    return NextResponse.json({ error: 'Erro ao carregar compras' }, { status: 500 })
  }
}
