import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import * as XLSX from 'xlsx'

/** POST - valida arquivo XLSX (produtos ou estoque). Body: FormData com file e type=products|stock */
export async function POST(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'livraria_importacao', action: 'view' })
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

    if (type === 'stock') {
      const errors: Array<{ row: number; message: string }> = []
      const preview: Array<{ row: number; sku: string; mode: string; value: number; notes?: string }> = []
      const allowedModes = new Set(['SET', 'DELTA'])
      rows.forEach((row, i) => {
        const rowNum = i + 2
        const sku = String(row.sku ?? row.SKU ?? '').trim()
        const mode = String(row.mode ?? row.MODE ?? 'SET').toUpperCase()
        const value = typeof row.value === 'number' ? row.value : parseFloat(String(row.value ?? row.VALUE ?? ''))
        const notes = row.notes ?? row.notes ?? ''
        if (!sku) {
          errors.push({ row: rowNum, message: 'SKU obrigatório' })
          return
        }
        if (!allowedModes.has(mode)) {
          errors.push({ row: rowNum, message: 'mode deve ser SET ou DELTA' })
          return
        }
        if (!Number.isFinite(value) && (mode === 'DELTA' || (mode === 'SET' && value < 0))) {
          errors.push({ row: rowNum, message: 'value inválido' })
          return
        }
        if (mode === 'SET' && value < 0) {
          errors.push({ row: rowNum, message: 'value não pode ser negativo em modo SET' })
          return
        }
        preview.push({ row: rowNum, sku, mode, value: Number(value) || 0, notes: String(notes).trim() || undefined })
      })
      return NextResponse.json({ valid: errors.length === 0, errors, preview })
    }

    const errors: Array<{ row: number; message: string }> = []
    const preview: Array<Record<string, unknown>> = []
    rows.forEach((row, i) => {
      const rowNum = i + 2
      const sku = String(row.sku ?? row.SKU ?? '').trim()
      const name = String(row.name ?? row.Nome ?? '').trim()
      const costPrice = parseFloat(String(row.cost_price ?? row.cost_price ?? 0))
      const salePrice = parseFloat(String(row.sale_price ?? row.sale_price ?? 0))
      const minStock = parseInt(String(row.min_stock ?? row.min_stock ?? 0), 10)
      if (!sku) errors.push({ row: rowNum, message: 'SKU obrigatório' })
      if (!name) errors.push({ row: rowNum, message: 'Nome obrigatório' })
      if (!Number.isFinite(costPrice) || costPrice < 0) errors.push({ row: rowNum, message: 'Preço de custo inválido' })
      if (!Number.isFinite(salePrice) || salePrice < 0) errors.push({ row: rowNum, message: 'Preço de venda inválido' })
      if (!Number.isInteger(minStock) || minStock < 0) errors.push({ row: rowNum, message: 'Estoque mínimo inválido' })
      preview.push({
        row: rowNum,
        sku,
        barcode: row.barcode ?? row.barcode ?? '',
        name,
        description: row.description ?? row.description ?? '',
        category: row.category ?? row.category ?? '',
        supplier: row.supplier ?? row.supplier ?? '',
        cost_price: costPrice,
        sale_price: salePrice,
        min_stock: minStock,
        active: row.active !== false && row.active !== '0' && row.active !== 'Não',
      })
    })

    return NextResponse.json({ valid: errors.length === 0, errors, preview })
  } catch (err) {
    console.error('POST livraria/importacao/validar:', err)
    return NextResponse.json({ error: 'Erro ao validar arquivo. Verifique se é um XLSX válido.' }, { status: 500 })
  }
}
