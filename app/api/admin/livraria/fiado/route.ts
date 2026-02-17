import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

/** GET - lista clientes com saldo pendente (visão fiado) */
export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'livraria_fiado', action: 'view' })
  if (!access.ok) return access.response
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')?.trim() || ''
    const pendenteMin = parseFloat(searchParams.get('pendente_min') ?? '0') || 0
    const vencidos = searchParams.get('vencidos') === 'true'

    const supabase = createSupabaseAdminClient(request)

    let q = supabase
      .from('bookstore_customer_balance_view')
      .select('customer_id, name, total_pendente, qtd_vendas_pendentes')
      .gt('total_pendente', 0)
      .order('total_pendente', { ascending: false })

    if (pendenteMin > 0) q = q.gte('total_pendente', pendenteMin)
    if (search) q = q.ilike('name', `%${search}%`)

    const { data: balanceRows, error } = await q
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const list = (balanceRows ?? []) as Array<{
      customer_id: string
      name: string
      total_pendente: number
      qtd_vendas_pendentes: number
    }>

    const customerIds = list.map((r) => r.customer_id)
    const lastSaleByCustomer: Record<string, string> = {}
    if (customerIds.length > 0) {
      const { data: lastSales } = await supabase
        .from('bookstore_sales')
        .select('customer_id, created_at')
        .in('customer_id', customerIds)
        .neq('status', 'CANCELLED')
        .order('created_at', { ascending: false })
      const seen = new Set<string>()
      for (const row of lastSales ?? []) {
        const cid = (row as { customer_id: string }).customer_id
        if (!seen.has(cid)) {
          seen.add(cid)
          lastSaleByCustomer[cid] = (row as { created_at: string }).created_at
        }
      }
    }

    let items = list.map((r) => ({
      customer_id: r.customer_id,
      name: r.name,
      total_pendente: Number(r.total_pendente),
      qtd_vendas_pendentes: Number(r.qtd_vendas_pendentes),
      ultima_compra: lastSaleByCustomer[r.customer_id] ?? null,
    }))

    if (vencidos) {
      const customerIds = items.map((i) => i.customer_id)
      const { data: overdueSales } = await supabase
        .from('bookstore_sales')
        .select('customer_id')
        .in('customer_id', customerIds)
        .gt('pending_amount', 0)
        .lt('due_date', new Date().toISOString())
      const overdueSet = new Set((overdueSales ?? []).map((s: { customer_id: string }) => s.customer_id))
      items = items.filter((i) => overdueSet.has(i.customer_id))
    }

    const totalPendente = items.reduce((s, i) => s + i.total_pendente, 0)

    return NextResponse.json({
      items,
      total_pendente_geral: totalPendente,
      total_clientes: items.length,
    })
  } catch (err) {
    console.error('GET livraria/fiado:', err)
    return NextResponse.json({ error: 'Erro ao carregar pendências' }, { status: 500 })
  }
}
