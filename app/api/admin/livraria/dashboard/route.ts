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

    return NextResponse.json({
      cards: {
        total_products: totalProducts ?? 0,
        low_stock_count: lowStockCount ?? 0,
        total_entries_30d: totalEntries,
        total_exits_30d: totalExits,
        losses_30d: losses,
      },
      series,
      low_stock: lowStockList,
      top_movements: topMovements,
      top_losses: topLosses,
    })
  } catch (err) {
    console.error('GET livraria/dashboard:', err)
    return NextResponse.json({ error: 'Erro ao carregar dashboard' }, { status: 500 })
  }
}
