import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import * as XLSX from 'xlsx'

/** POST - processa arquivo XLSX: type=products (cria/atualiza) ou type=stock (aplica bulk update) */
export async function POST(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'livraria_importacao', action: 'create' })
  if (!access.ok) return access.response
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const type = (formData.get('type') as string) || 'products'

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'Envie um arquivo (file)' }, { status: 400 })
    }

    const buf = Buffer.from(await file.arrayBuffer())
    const workbook = XLSX.read(buf, { type: 'buffer' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
    const supabase = createSupabaseAdminClient(request)

    if (type === 'stock') {
      const results: Array<{ row: number; sku: string; success: boolean; error?: string }> = []
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        const rowNum = i + 2
        const sku = String(row.sku ?? row.SKU ?? '').trim()
        const mode = String(row.mode ?? row.MODE ?? 'SET').toUpperCase()
        const value = typeof row.value === 'number' ? row.value : parseFloat(String(row.value ?? row.VALUE ?? ''))
        const notes = row.notes ? String(row.notes).trim() : null
        if (!sku) {
          results.push({ row: rowNum, sku: '', success: false, error: 'SKU obrigatório' })
          continue
        }
        const { data: product } = await supabase.from('bookstore_products').select('id, current_stock').eq('sku', sku).single()
        if (!product) {
          results.push({ row: rowNum, sku, success: false, error: 'Produto não encontrado' })
          continue
        }
        const current = (product as { current_stock: number }).current_stock
        const delta = mode === 'SET' ? (Number(value) || 0) - current : (Number(value) || 0)
        const newStock = Math.max(0, current + delta)
        const qty = Math.abs(delta)
        if (delta === 0) {
          results.push({ row: rowNum, sku, success: true })
          continue
        }
        if (delta < 0 && current < qty) {
          results.push({ row: rowNum, sku, success: false, error: 'Estoque insuficiente para concluir a saída.' })
          continue
        }
        const movementType = delta > 0 ? 'ENTRY_ADJUSTMENT' : 'EXIT_ADJUSTMENT'
        await supabase.from('bookstore_stock_movements').insert({
          product_id: (product as { id: string }).id,
          movement_type: movementType,
          quantity: qty,
          reference_type: 'BULK_IMPORT',
          notes: notes || `Importação XLSX (${mode})`,
          created_by: access.snapshot?.userId ?? null,
        })
        await supabase.from('bookstore_products').update({ current_stock: newStock }).eq('id', (product as { id: string }).id)
        results.push({ row: rowNum, sku, success: true })
      }
      const updated = results.filter((r) => r.success).length
      return NextResponse.json({ updated, total: rows.length, results })
    }

    let created = 0
    let updated = 0
    const results: Array<{ row: number; sku: string; success: boolean; error?: string }> = []
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNum = i + 2
      const sku = String(row.sku ?? row.SKU ?? '').trim()
      const name = String(row.name ?? row.Nome ?? '').trim()
      if (!sku || !name) {
        results.push({ row: rowNum, sku, success: false, error: 'SKU e nome obrigatórios' })
        continue
      }
      const payload = {
        sku,
        barcode: row.barcode ? String(row.barcode).trim() : null,
        name,
        description: row.description ? String(row.description).trim() : null,
        cost_price: Math.max(0, parseFloat(String(row.cost_price ?? 0)) || 0),
        sale_price: Math.max(0, parseFloat(String(row.sale_price ?? 0)) || 0),
        min_stock: Math.max(0, parseInt(String(row.min_stock ?? 0), 10) || 0),
        active: row.active !== false && row.active !== '0' && row.active !== 'Não',
      }
      const { data: existing } = await supabase.from('bookstore_products').select('id').eq('sku', sku).maybeSingle()
      if (existing) {
        const { error: err } = await supabase.from('bookstore_products').update(payload).eq('id', (existing as { id: string }).id)
        if (err) {
          results.push({ row: rowNum, sku, success: false, error: err.message })
        } else {
          updated++
          results.push({ row: rowNum, sku, success: true })
        }
      } else {
        const { error: err } = await supabase.from('bookstore_products').insert({ ...payload, current_stock: 0 })
        if (err) {
          results.push({ row: rowNum, sku, success: false, error: err.message })
        } else {
          created++
          results.push({ row: rowNum, sku, success: true })
        }
      }
    }
    return NextResponse.json({ created, updated, total: rows.length, results })
  } catch (err) {
    console.error('POST livraria/importacao/processar:', err)
    return NextResponse.json({ error: 'Erro ao processar arquivo' }, { status: 500 })
  }
}
