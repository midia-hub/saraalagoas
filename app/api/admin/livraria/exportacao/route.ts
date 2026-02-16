import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import * as XLSX from 'xlsx'

/** GET - exporta produtos, movimentações ou estoque baixo em XLSX ou CSV */
export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'livraria_importacao', action: 'view' })
  if (!access.ok) return access.response
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'products'
    const format = searchParams.get('format') || 'xlsx'
    const from = searchParams.get('from') || ''
    const to = searchParams.get('to') || ''

    const supabase = createSupabaseAdminClient(request)

    if (type === 'movements') {
      let q = supabase.from('bookstore_stock_movements').select(`
        created_at,
        movement_type,
        quantity,
        reference_type,
        notes,
        bookstore_products(sku, name)
      `).order('created_at', { ascending: false }).limit(2000)
      if (from) q = q.gte('created_at', from)
      if (to) q = q.lte('created_at', to + 'T23:59:59.999Z')
      const { data, error } = await q
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      const rows = (data ?? []).map((r: Record<string, unknown>) => ({
        data: (r.created_at as string)?.slice(0, 19),
        tipo: r.movement_type,
        quantidade: r.quantity,
        referencia: r.reference_type,
        observacao: r.notes,
        sku: (r.bookstore_products as { sku?: string } | null)?.sku ?? '',
        produto: (r.bookstore_products as { name?: string } | null)?.name ?? '',
      }))
      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Movimentações')
      const buf = format === 'csv' ? XLSX.utils.sheet_to_csv(ws) : XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
      const contentType = format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      const filename = `movimentacoes_${Date.now()}.${format === 'csv' ? 'csv' : 'xlsx'}`
      return new NextResponse(buf, {
        headers: { 'Content-Type': contentType, 'Content-Disposition': `attachment; filename="${filename}"` },
      })
    }

    if (type === 'low_stock') {
      const { data, error } = await supabase
        .from('bookstore_products')
        .select('sku, barcode, name, current_stock, min_stock, sale_price, active')
        .eq('active', true)
        .filter('current_stock', 'lte', 'min_stock')
        .order('name')
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      let items = (data ?? []) as Array<{ current_stock: number; min_stock: number; [k: string]: unknown }>
      items = items.filter((r) => r.current_stock <= r.min_stock)
      const rows = items.map((r) => ({ sku: r.sku, codigo_barras: r.barcode, nome: r.name, estoque_atual: r.current_stock, estoque_minimo: r.min_stock, preco_venda: r.sale_price }))
      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Estoque baixo')
      const buf = format === 'csv' ? XLSX.utils.sheet_to_csv(ws) : XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
      const contentType = format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      const filename = `estoque_baixo_${Date.now()}.${format === 'csv' ? 'csv' : 'xlsx'}`
      return new NextResponse(buf, {
        headers: { 'Content-Type': contentType, 'Content-Disposition': `attachment; filename="${filename}"` },
      })
    }

    const { data, error } = await supabase
      .from('bookstore_products')
      .select('sku, barcode, name, description, cost_price, sale_price, min_stock, current_stock, active, created_at')
      .order('name')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const rows = (data ?? []).map((r: Record<string, unknown>) => ({
      sku: r.sku,
      codigo_barras: r.barcode,
      nome: r.name,
      descricao: r.description,
      preco_custo: r.cost_price,
      preco_venda: r.sale_price,
      estoque_minimo: r.min_stock,
      estoque_atual: r.current_stock,
      ativo: r.active ? 'Sim' : 'Não',
      criado_em: (r.created_at as string)?.slice(0, 19),
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Produtos')
    const buf = format === 'csv' ? XLSX.utils.sheet_to_csv(ws) : XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    const contentType = format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    const filename = `produtos_${Date.now()}.${format === 'csv' ? 'csv' : 'xlsx'}`
    return new NextResponse(buf, {
      headers: { 'Content-Type': contentType, 'Content-Disposition': `attachment; filename="${filename}"` },
    })
  } catch (err) {
    console.error('GET livraria/exportacao:', err)
    return NextResponse.json({ error: 'Erro ao exportar' }, { status: 500 })
  }
}
