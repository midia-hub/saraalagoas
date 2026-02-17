import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

/** GET - relatório fiado: vendas fiado, recebimentos, saldo por cliente, série temporal */
export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'livraria_fiado', action: 'view' })
  if (!access.ok) return access.response
  try {
    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from')?.trim() || ''
    const to = searchParams.get('to')?.trim() || ''

    const supabase = createSupabaseAdminClient(request)

    const fromDate = from ? new Date(from) : (() => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d })()
    const toDate = to ? new Date(to) : new Date()
    const fromStr = fromDate.toISOString().slice(0, 10)
    const toStr = toDate.toISOString().slice(0, 10)

    const toEnd = toStr + 'T23:59:59.999Z'

    // Vendas fiado no período (sale_type = CREDIT, created_at no período)
    const { data: creditSales } = await supabase
      .from('bookstore_sales')
      .select('id, total_amount, discount_amount, paid_amount, pending_amount, created_at')
      .eq('sale_type', 'CREDIT')
      .neq('status', 'CANCELLED')
      .gte('created_at', fromStr)
      .lte('created_at', toEnd)

    const salesList = (creditSales ?? []) as Array<{
      total_amount: number
      discount_amount: number
      created_at: string
    }>
    const total_vendido_fiado_periodo = salesList.reduce(
      (s, v) => s + (Number(v.total_amount) || 0) - (Number(v.discount_amount) || 0),
      0
    )

    // Recebimentos no período (pagamentos com created_at no período)
    const { data: paymentsInPeriod } = await supabase
      .from('bookstore_customer_payments')
      .select('id, amount, created_at')
      .gte('created_at', fromStr)
      .lte('created_at', toEnd)

    const paymentsList = paymentsInPeriod ?? []
    const total_recebido_periodo = paymentsList.reduce((s, p) => s + (Number((p as { amount: number }).amount) || 0), 0)

    // Saldo pendente acumulado (todas as vendas fiado ainda com pending > 0)
    const { data: allPending } = await supabase
      .from('bookstore_sales')
      .select('pending_amount')
      .eq('sale_type', 'CREDIT')
      .neq('status', 'CANCELLED')
      .gt('pending_amount', 0)
    const saldo_pendente_acumulado = (allPending ?? []).reduce(
      (s, r) => s + (Number((r as { pending_amount: number }).pending_amount) || 0),
      0
    )

    // Por cliente: compras, pagos, pendente
    const { data: byCustomer } = await supabase
      .from('bookstore_customer_balance_view')
      .select('customer_id, name, total_compras, total_pago, total_pendente, qtd_vendas')
    const por_cliente = (byCustomer ?? []).map((r: Record<string, unknown>) => ({
      customer_id: r.customer_id,
      name: r.name,
      total_compras: Number(r.total_compras),
      total_pago: Number(r.total_pago),
      total_pendente: Number(r.total_pendente),
      qtd_vendas: Number(r.qtd_vendas),
    }))

    // Série temporal: por dia - vendas fiado vs recebimentos
    const byDay: Record<string, { vendas_fiado: number; recebimentos: number }> = {}
    for (let d = new Date(fromDate); d <= toDate; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().slice(0, 10)
      byDay[key] = { vendas_fiado: 0, recebimentos: 0 }
    }
    salesList.forEach((v) => {
      const key = v.created_at.slice(0, 10)
      if (byDay[key]) byDay[key].vendas_fiado += (Number(v.total_amount) || 0) - (Number((v as { discount_amount: number }).discount_amount) || 0)
    })
    paymentsList.forEach((p) => {
      const key = (p as { created_at: string }).created_at.slice(0, 10)
      if (byDay[key]) byDay[key].recebimentos += Number((p as { amount: number }).amount) || 0
    })
    const serie_temporal = Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, vendas_fiado: v.vendas_fiado, recebimentos: v.recebimentos }))

    return NextResponse.json({
      from: fromStr,
      to: toStr,
      total_vendido_fiado_periodo,
      total_recebido_periodo,
      saldo_pendente_acumulado,
      por_cliente,
      serie_temporal,
    })
  } catch (err) {
    console.error('GET livraria/relatorios/fiado:', err)
    return NextResponse.json({ error: 'Erro ao gerar relatório' }, { status: 500 })
  }
}
