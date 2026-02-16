import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import * as XLSX from 'xlsx'

/** GET - baixa modelo XLSX: type=products ou type=stock */
export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'livraria_importacao', action: 'view' })
  if (!access.ok) return access.response
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || 'products'

  if (type === 'stock') {
    const rows = [{ sku: 'SKU001', mode: 'SET', value: 10, notes: 'Ajuste inicial' }]
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Estoque')
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="modelo_atualizacao_estoque.xlsx"',
      },
    })
  }

  const rows = [
    { sku: 'SKU001', barcode: '', name: 'Nome do produto', description: '', category: '', supplier: '', cost_price: 0, sale_price: 0, min_stock: 0, active: true },
  ]
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Produtos')
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="modelo_importacao_produtos.xlsx"',
    },
  })
}
