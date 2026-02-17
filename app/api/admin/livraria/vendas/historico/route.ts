import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

/** GET - histórico de vendas com filtros e paginação */
export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'livraria_vendas', action: 'view' })
  if (!access.ok) return access.response
  try {
    const { searchParams } = new URL(request.url)
    const fromDate = searchParams.get('from')?.trim() || ''
    const toDate = searchParams.get('to')?.trim() || ''
    const paymentMethod = searchParams.get('payment_method')?.trim() || ''
    const search = searchParams.get('search')?.trim() || ''
    const page = Math.max(0, parseInt(searchParams.get('page') ?? '1', 10) - 1)
    const perPage = Math.min(100, Math.max(1, parseInt(searchParams.get('per_page') ?? '20', 10)))
    const offset = page * perPage

    const supabase = createSupabaseAdminClient(request)
    let q = supabase
      .from('bookstore_sales')
      .select('id, sale_number, customer_name, payment_method, payment_provider, total_amount, status, created_at, paid_at, created_by', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (fromDate) {
      q = q.gte('created_at', fromDate)
    }
    if (toDate) {
      q = q.lte('created_at', toDate + 'T23:59:59.999Z')
    }
    if (paymentMethod) {
      q = q.eq('payment_method', paymentMethod)
    }
    if (search) {
      q = q.or(`sale_number.ilike.%${search}%,customer_name.ilike.%${search}%`)
    }

    const { data, error, count } = await q.range(offset, offset + perPage - 1)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const items = (data ?? []) as Array<{
      id: string
      sale_number: string
      customer_name: string | null
      payment_method: string | null
      payment_provider: string | null
      total_amount: number
      status: string
      created_at: string
      paid_at: string | null
      created_by: string | null
    }>

    return NextResponse.json({
      items,
      total: count ?? 0,
      page: page + 1,
      per_page: perPage,
    })
  } catch (err) {
    console.error('GET livraria/vendas/historico:', err)
    return NextResponse.json({ error: 'Erro ao carregar histórico' }, { status: 500 })
  }
}
