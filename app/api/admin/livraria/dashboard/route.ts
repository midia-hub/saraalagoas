import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

/** GET - dados do dashboard: cards, séries (movimentações por dia), tabelas (estoque baixo, top movimentados, perdas) */
export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'livraria_dashboard', action: 'view' })
  if (!access.ok) return access.response
  try {
    const { searchParams } = new URL(request.url)
    const range = searchParams.get('range') || '30d'
    const days = range === '14d' ? 14 : 30
    const from = new Date()
    from.setDate(from.getDate() - days)
    const fromStr = from.toISOString().slice(0, 10)

    const supabase = createSupabaseAdminClient(request)

    const [{ count: totalProducts }, { count: lowStockCount }, { data: movements }] = await Promise.all([
      supabase.from('bookstore_products').select('*', { count: 'exact', head: true }).eq('active', true),
      supabase
        .from('bookstore_products')
        .select('*', { count: 'exact', head: true })
        .eq('active', true)
        .filter('current_stock', 'lte', 'min_stock'),
      supabase
        .from('bookstore_stock_movements')
        .select('id, product_id, movement_type, quantity, created_at')
        .gte('created_at', fromStr)
        .order('created_at'),
    ])

    const movList = (movements ?? []) as Array<{ product_id?: string; movement_type: string; quantity: number; created_at: string }>
    const entries = movList.filter((m) => m.movement_type.startsWith('ENTRY_'))
    const exits = movList.filter((m) => m.movement_type.startsWith('EXIT_'))
    const totalEntries = entries.reduce((s, m) => s + m.quantity, 0)
    const totalExits = exits.reduce((s, m) => s + m.quantity, 0)
    const losses = movList.filter((m) => m.movement_type === 'EXIT_LOSS').reduce((s, m) => s + m.quantity, 0)

    const byDay: Record<string, { entries: number; exits: number }> = {}
    for (let d = 0; d < days; d++) {
      const date = new Date(from)
      date.setDate(date.getDate() + d)
      const key = date.toISOString().slice(0, 10)
      byDay[key] = { entries: 0, exits: 0 }
    }
    movList.forEach((m) => {
      const key = m.created_at.slice(0, 10)
      if (!byDay[key]) byDay[key] = { entries: 0, exits: 0 }
      if (m.movement_type.startsWith('ENTRY_')) byDay[key].entries += m.quantity
      else byDay[key].exits += m.quantity
    })
    const series = Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, entradas: v.entries, saidas: v.exits }))

    const { data: lowStockProducts } = await supabase
      .from('bookstore_products')
      .select('id, sku, name, current_stock, min_stock, sale_price')
      .eq('active', true)
      .order('current_stock')
      .limit(100)
    let lowStockList = (lowStockProducts ?? []) as Array<{ current_stock: number; min_stock: number; [k: string]: unknown }>
    lowStockList = lowStockList.filter((r) => r.current_stock <= r.min_stock)

    const productCounts: Record<string, number> = {}
    movList.forEach((m) => {
      const pid = (m as { product_id?: string }).product_id
      if (pid) productCounts[pid] = (productCounts[pid] || 0) + (m.quantity || 0)
    })
    const topMovementIds = Object.entries(productCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([id]) => id)

    const lossByProduct: Record<string, number> = {}
    movList.filter((m) => m.movement_type === 'EXIT_LOSS').forEach((m) => {
      const pid = (m as { product_id?: string }).product_id
      if (pid) lossByProduct[pid] = (lossByProduct[pid] || 0) + (m.quantity || 0)
    })
    const topLossIds = Object.entries(lossByProduct)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([id]) => id)

    let topMovements: Array<{ sku: string; name: string; quantity: number }> = []
    let topLosses: Array<{ sku: string; name: string; quantity: number }> = []
    if (topMovementIds.length > 0) {
      const { data: prods } = await supabase.from('bookstore_products').select('id, sku, name').in('id', topMovementIds)
      const prodMap = new Map((prods ?? []).map((p: { id: string; sku: string; name: string }) => [p.id, p]))
      topMovements = topMovementIds.map((id) => ({
        sku: (prodMap.get(id) as { sku: string })?.sku ?? '',
        name: (prodMap.get(id) as { name: string })?.name ?? '',
        quantity: productCounts[id] ?? 0,
      }))
    }
    if (topLossIds.length > 0) {
      const { data: prods } = await supabase.from('bookstore_products').select('id, sku, name').in('id', topLossIds)
      const prodMap = new Map((prods ?? []).map((p: { id: string; sku: string; name: string }) => [p.id, p]))
      topLosses = topLossIds.map((id) => ({
        sku: (prodMap.get(id) as { sku: string })?.sku ?? '',
        name: (prodMap.get(id) as { name: string })?.name ?? '',
        quantity: lossByProduct[id] ?? 0,
      }))
    }

    // Vendas no período (status PAID)
    const { data: salesData } = await supabase
      .from('bookstore_sales')
      .select('id, sale_number, customer_name, payment_method, total_amount, created_at')
      .eq('status', 'PAID')
      .gte('created_at', fromStr)
      .order('created_at')

    const salesList = (salesData ?? []) as Array<{ sale_number: string; customer_name: string | null; payment_method: string | null; total_amount: number; created_at: string }>
    const sales_count = salesList.length
    const sales_revenue = salesList.reduce((s, v) => s + Number(v.total_amount || 0), 0)
    const sales_avg_ticket = sales_count > 0 ? sales_revenue / sales_count : 0
    const sales_by_payment: Record<string, number> = {}
    salesList.forEach((s) => {
      const method = s.payment_method || 'Outro'
      sales_by_payment[method] = (sales_by_payment[method] || 0) + Number(s.total_amount || 0)
    })
    const salesByDay: Record<string, { count: number; revenue: number }> = {}
    for (let d = 0; d < days; d++) {
      const date = new Date(from)
      date.setDate(date.getDate() + d)
      const key = date.toISOString().slice(0, 10)
      salesByDay[key] = { count: 0, revenue: 0 }
    }
    salesList.forEach((s) => {
      const key = s.created_at.slice(0, 10)
      if (!salesByDay[key]) salesByDay[key] = { count: 0, revenue: 0 }
      salesByDay[key].count += 1
      salesByDay[key].revenue += Number(s.total_amount || 0)
    })
    const sales_series = Object.entries(salesByDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, vendas: v.count, receita: v.revenue }))

    const { data: lastSalesRows } = await supabase
      .from('bookstore_sales')
      .select('id, sale_number, customer_name, payment_method, total_amount, created_at')
      .neq('status', 'CANCELLED')
      .order('created_at', { ascending: false })
      .limit(10)
    const last_sales = (lastSalesRows ?? []) as Array<{ id: string; sale_number: string; customer_name: string | null; payment_method: string | null; total_amount: number; created_at: string }>

    // Fiado: total pendente, recebido 30d, vendas fiado 30d, top devedores
    let fiado_total_pendente = 0
    let fiado_recebido_30d = 0
    let fiado_vendas_30d = 0
    let fiado_top_devedores: Array<{ customer_id: string; name: string; total_pendente: number }> = []
    try {
      const { data: pendingRows } = await supabase
        .from('bookstore_sales')
        .select('pending_amount')
        .eq('sale_type', 'CREDIT')
        .neq('status', 'CANCELLED')
        .gt('pending_amount', 0)
      fiado_total_pendente = (pendingRows ?? []).reduce((s, r) => s + Number((r as { pending_amount: number }).pending_amount || 0), 0)

      const { data: payments30 } = await supabase
        .from('bookstore_customer_payments')
        .select('amount')
        .gte('created_at', fromStr)
      fiado_recebido_30d = (payments30 ?? []).reduce((s, r) => s + Number((r as { amount: number }).amount || 0), 0)

      const { data: creditSales30 } = await supabase
        .from('bookstore_sales')
        .select('total_amount, discount_amount')
        .eq('sale_type', 'CREDIT')
        .neq('status', 'CANCELLED')
        .gte('created_at', fromStr)
      fiado_vendas_30d = (creditSales30 ?? []).reduce(
        (s, r) => s + (Number((r as { total_amount: number }).total_amount) || 0) - (Number((r as { discount_amount: number }).discount_amount) || 0),
        0
      )

      const { data: balanceRows } = await supabase
        .from('bookstore_customer_balance_view')
        .select('customer_id, name, total_pendente')
        .gt('total_pendente', 0)
        .order('total_pendente', { ascending: false })
        .limit(5)
      fiado_top_devedores = (balanceRows ?? []).map((r: { customer_id: string; name: string; total_pendente: number }) => ({
        customer_id: r.customer_id,
        name: r.name,
        total_pendente: Number(r.total_pendente),
      }))
    } catch {
      // fiado tables may not exist yet
    }

    // Mercado Pago: vendas aprovadas no período, receita, pendentes, taxa de aprovação
    let mercadopago_count = 0
    let mercadopago_revenue = 0
    let mercadopago_pending_count = 0
    let mercadopago_pending_amount = 0
    let mercadopago_approval_rate: number | null = null
    let last_transactions_mp: Array<{ sale_number: string; status: string; amount: number; created_at: string; sale_id: string }> = []
    let mercadopago_pending_old: Array<{ sale_id: string; sale_number: string; amount: number; created_at: string }> = []

    try {
      const { data: mpPaid } = await supabase
        .from('bookstore_sales')
        .select('id, total_amount')
        .eq('payment_provider', 'MERCADOPAGO')
        .eq('status', 'PAID')
        .gte('created_at', fromStr)
      const mpPaidList = (mpPaid ?? []) as Array<{ total_amount: number }>
      mercadopago_count = mpPaidList.length
      mercadopago_revenue = mpPaidList.reduce((s, r) => s + Number(r.total_amount || 0), 0)

      const { data: mpPending } = await supabase
        .from('bookstore_sales')
        .select('id, sale_number, total_amount, created_at')
        .eq('payment_provider', 'MERCADOPAGO')
        .eq('status', 'PENDING')
      const mpPendingList = (mpPending ?? []) as Array<{ id: string; sale_number: string; total_amount: number; created_at: string }>
      mercadopago_pending_count = mpPendingList.length
      mercadopago_pending_amount = mpPendingList.reduce((s, r) => s + Number(r.total_amount || 0), 0)

      const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString()
      mercadopago_pending_old = mpPendingList
        .filter((r) => r.created_at < fifteenMinAgo)
        .map((r) => ({ sale_id: r.id, sale_number: r.sale_number, amount: Number(r.total_amount), created_at: r.created_at }))

      const { data: txRows } = await supabase
        .from('bookstore_payment_transactions')
        .select('id, sale_id, status, amount, created_at')
        .eq('provider', 'MERCADOPAGO')
        .order('created_at', { ascending: false })
        .limit(20)
      const txList = (txRows ?? []) as Array<{ sale_id: string; status: string; amount: number; created_at: string }>
      const saleIds = [...new Set(txList.map((t) => t.sale_id))]
      const { data: salesForTx } = await supabase
        .from('bookstore_sales')
        .select('id, sale_number')
        .in('id', saleIds)
      const saleMap = new Map((salesForTx ?? []).map((s: { id: string; sale_number: string }) => [s.id, s]))
      last_transactions_mp = txList.slice(0, 10).map((t) => ({
        sale_id: t.sale_id,
        sale_number: (saleMap.get(t.sale_id) as { sale_number: string } | undefined)?.sale_number ?? '—',
        status: t.status,
        amount: Number(t.amount),
        created_at: t.created_at,
      }))

      const totalMp = txList.length
      const approvedMp = txList.filter((t) => t.status === 'APPROVED').length
      mercadopago_approval_rate = totalMp > 0 ? Math.round((approvedMp / totalMp) * 100) : null
    } catch {
      // bookstore_payment_transactions may not exist yet
    }

    return NextResponse.json({
      cards: {
        total_products: totalProducts ?? 0,
        low_stock_count: lowStockCount ?? 0,
        total_entries_30d: totalEntries,
        total_exits_30d: totalExits,
        losses_30d: losses,
        sales_count,
        sales_revenue,
        sales_avg_ticket,
      },
      series,
      sales_series,
      sales_by_payment,
      last_sales,
      low_stock: lowStockList,
      top_movements: topMovements,
      top_losses: topLosses,
      fiado: {
        total_pendente: fiado_total_pendente,
        recebido_30d: fiado_recebido_30d,
        vendas_fiado_30d: fiado_vendas_30d,
        top_devedores: fiado_top_devedores,
      },
      mercadopago: {
        vendas_count: mercadopago_count,
        receita: mercadopago_revenue,
        pendentes_count: mercadopago_pending_count,
        pendentes_valor: mercadopago_pending_amount,
        taxa_aprovacao: mercadopago_approval_rate,
        ultimas_transacoes: last_transactions_mp,
        pendentes_antigos: mercadopago_pending_old,
      },
    })
  } catch (err) {
    console.error('GET livraria/dashboard:', err)
    return NextResponse.json({ error: 'Erro ao carregar dashboard' }, { status: 500 })
  }
}
