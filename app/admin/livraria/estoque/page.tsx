'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Package, ArrowLeft, Upload } from 'lucide-react'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { Button } from '@/components/ui/Button'
import { adminFetchJson, getAccessTokenOrThrow } from '@/lib/admin-client'

type Product = { id: string; sku: string; name: string; current_stock: number }
const MOVEMENT_TYPES = [
  { value: 'ENTRY_PURCHASE', label: 'Entrada - Compra' },
  { value: 'ENTRY_ADJUSTMENT', label: 'Entrada - Ajuste' },
  { value: 'EXIT_SALE', label: 'Saída - Venda' },
  { value: 'EXIT_LOSS', label: 'Saída - Perda' },
  { value: 'EXIT_DONATION', label: 'Saída - Doação' },
  { value: 'EXIT_INTERNAL_USE', label: 'Saída - Uso interno' },
  { value: 'EXIT_ADJUSTMENT', label: 'Saída - Ajuste' },
]

export default function LivrariaEstoquePage() {
  const [products, setProducts] = useState<Product[]>([])
  const [productSearch, setProductSearch] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [movementType, setMovementType] = useState('ENTRY_ADJUSTMENT')
  const [quantity, setQuantity] = useState('')
  const [notes, setNotes] = useState('')
  const [moveLoading, setMoveLoading] = useState(false)
  const [bulkMode, setBulkMode] = useState<'manual' | 'xlsx'>('manual')
  const [bulkBulkMode, setBulkBulkMode] = useState<'SET' | 'DELTA'>('SET')
  const [bulkItems, setBulkItems] = useState<Array<{ sku: string; value: string; notes: string }>>([{ sku: '', value: '', notes: '' }])
  const [bulkLoading, setBulkLoading] = useState(false)
  const [bulkResult, setBulkResult] = useState<{ updated?: number; errors?: Array<{ sku: string; error: string }> } | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [fileResult, setFileResult] = useState<{ updated?: number; results?: Array<{ sku: string; success: boolean; error?: string }> } | null>(null)
  const [fileLoading, setFileLoading] = useState(false)

  const loadProducts = useCallback(async () => {
    const q = productSearch.trim()
    const url = q ? `/api/admin/livraria/produtos?search=${encodeURIComponent(q)}` : '/api/admin/livraria/produtos'
    const data = await adminFetchJson<{ items: Product[] }>(url)
    setProducts(data.items ?? [])
  }, [productSearch])

  useEffect(() => {
    const t = setTimeout(loadProducts, 300)
    return () => clearTimeout(t)
  }, [loadProducts])

  const handleMovimentar = async () => {
    if (!selectedProduct || !quantity || parseInt(quantity, 10) <= 0) return
    setMoveLoading(true)
    setBulkResult(null)
    try {
      await adminFetchJson('/api/admin/livraria/estoque/movimentar', {
        method: 'POST',
        body: JSON.stringify({
          product_id: selectedProduct.id,
          movement_type: movementType,
          quantity: parseInt(quantity, 10),
          notes: notes.trim() || null,
        }),
      })
      setQuantity('')
      setNotes('')
      setSelectedProduct(null)
      loadProducts()
    } catch (e) {
      console.error(e)
    } finally {
      setMoveLoading(false)
    }
  }

  const addBulkRow = () => setBulkItems((prev) => [...prev, { sku: '', value: '', notes: '' }])
  const updateBulkRow = (i: number, field: string, value: string) => {
    setBulkItems((prev) => {
      const next = [...prev]
      next[i] = { ...next[i], [field]: value }
      return next
    })
  }
  const handleBulkApply = async () => {
    const items = bulkItems.filter((r) => r.sku.trim())
    if (items.length === 0) return
    setBulkLoading(true)
    setBulkResult(null)
    try {
      const res = await adminFetchJson<{ updated: number; results: Array<{ sku: string; success: boolean; error?: string }> }>('/api/admin/livraria/estoque/bulk-update', {
        method: 'POST',
        body: JSON.stringify({
          mode: bulkBulkMode,
          items: items.map((r) => ({ sku: r.sku.trim(), value: parseInt(r.value, 10) || 0, notes: r.notes.trim() || null })),
        }),
      })
      setBulkResult({ updated: res.updated, errors: (res.results ?? []).filter((r) => !r.success).map((r) => ({ sku: r.sku, error: r.error || 'Erro' })) })
    } catch (e) {
      console.error(e)
    } finally {
      setBulkLoading(false)
    }
  }

  const handleFileProcess = async () => {
    if (!file) return
    setFileLoading(true)
    setFileResult(null)
    try {
      const token = await getAccessTokenOrThrow()
      const fd = new FormData()
      fd.append('file', file)
      fd.append('type', 'stock')
      const res = await fetch('/api/admin/livraria/importacao/processar', {
        method: 'POST',
        body: fd,
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Erro ao processar')
      setFileResult({ updated: data.updated, results: data.results })
    } catch (e) {
      console.error(e)
    } finally {
      setFileLoading(false)
    }
  }

  return (
    <PageAccessGuard pageKey="livraria_estoque">
      <div className="p-4 sm:p-6 md:p-8">
        <div className="mb-6 sm:mb-8 flex items-start sm:items-center gap-3">
          <Link href="/admin/livraria/produtos" className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 flex-shrink-0 touch-manipulation" aria-label="Voltar">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#c62737]/10 flex items-center justify-center flex-shrink-0">
                <Package className="text-[#c62737]" size={24} />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Estoque</h1>
                <p className="text-slate-500 text-sm sm:text-base">Movimentar estoque e atualização em massa</p>
              </div>
            </div>
          </div>
        </div>

        <section className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 mb-6 sm:mb-8">
          <h2 className="text-base sm:text-lg font-semibold text-slate-800 mb-4">Movimentar estoque (individual)</h2>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Produto</label>
              <input
                type="text"
                placeholder="Buscar por nome ou SKU"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
              {products.length > 0 && (
                <ul className="mt-1 border border-slate-200 rounded-lg max-h-40 overflow-auto">
                  {products.slice(0, 10).map((p) => (
                    <li key={p.id}>
                      <button type="button" onClick={() => { setSelectedProduct(p); setProductSearch(p.name) }} className="w-full text-left px-3 py-2 hover:bg-slate-50 text-sm">
                        {p.sku} — {p.name} (estoque: {p.current_stock})
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
              <select value={movementType} onChange={(e) => setMovementType(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg">
                {MOVEMENT_TYPES.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Quantidade</label>
              <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Observação</label>
              <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder="Opcional" />
            </div>
          </div>
          <div className="mt-4">
            <Button onClick={handleMovimentar} loading={moveLoading} disabled={!selectedProduct || !quantity} className="w-full sm:w-auto touch-manipulation">
              Confirmar movimentação
            </Button>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold text-slate-800 mb-4">Atualização em massa</h2>
          <div className="flex flex-wrap gap-2 mb-4">
            <button type="button" onClick={() => setBulkMode('manual')} className={`flex-1 sm:flex-none min-w-[140px] px-4 py-2.5 rounded-lg touch-manipulation ${bulkMode === 'manual' ? 'bg-[#c62737] text-white' : 'bg-slate-100 text-slate-700'}`}>
              Lote (manual)
            </button>
            <button type="button" onClick={() => setBulkMode('xlsx')} className={`flex-1 sm:flex-none min-w-[140px] px-4 py-2.5 rounded-lg touch-manipulation ${bulkMode === 'xlsx' ? 'bg-[#c62737] text-white' : 'bg-slate-100 text-slate-700'}`}>
              Via XLSX
            </button>
          </div>

          {bulkMode === 'manual' && (
            <>
              <div className="mb-2">
                <label className="text-sm font-medium text-slate-700 mr-2">Modo:</label>
                <select value={bulkBulkMode} onChange={(e) => setBulkBulkMode(e.target.value as 'SET' | 'DELTA')} className="px-2 py-1 border rounded">
                  <option value="SET">SET (estoque final)</option>
                  <option value="DELTA">DELTA (diferença)</option>
                </select>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr><th className="text-left py-2">SKU</th><th className="text-left py-2">Valor</th><th className="text-left py-2">Observação</th></tr></thead>
                  <tbody>
                    {bulkItems.map((row, i) => (
                      <tr key={i}>
                        <td className="py-1"><input value={row.sku} onChange={(e) => updateBulkRow(i, 'sku', e.target.value)} className="w-full px-2 py-1 border rounded" placeholder="SKU" /></td>
                        <td className="py-1"><input type="number" value={row.value} onChange={(e) => updateBulkRow(i, 'value', e.target.value)} className="w-24 px-2 py-1 border rounded" /></td>
                        <td className="py-1"><input value={row.notes} onChange={(e) => updateBulkRow(i, 'notes', e.target.value)} className="w-full px-2 py-1 border rounded" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex flex-col sm:flex-row gap-2">
                <Button variant="secondary" onClick={addBulkRow} className="w-full sm:w-auto touch-manipulation">Adicionar linha</Button>
                <Button onClick={handleBulkApply} loading={bulkLoading} className="w-full sm:w-auto touch-manipulation">Aplicar atualização</Button>
              </div>
              {bulkResult && (
                <p className="mt-4 text-sm text-slate-600">
                  Atualizados: {bulkResult.updated ?? 0}. {bulkResult.errors?.length ? `Erros: ${bulkResult.errors.map((e) => e.sku + ': ' + e.error).join('; ')}` : ''}
                </p>
              )}
            </>
          )}

          {bulkMode === 'xlsx' && (
            <>
              <p className="text-sm text-slate-600 mb-2">Faça o upload do arquivo XLSX (colunas: sku, mode, value, notes).</p>
              <a href="/api/admin/livraria/importacao/modelo?type=stock" download className="text-[#c62737] text-sm underline mb-4 inline-block">Baixar modelo</a>
              <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                <input type="file" accept=".xlsx,.xls" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-sm min-w-0" />
                <Button onClick={handleFileProcess} loading={fileLoading} disabled={!file} className="w-full sm:w-auto touch-manipulation">Processar</Button>
              </div>
              {fileResult && (
                <p className="mt-4 text-sm text-slate-600">Processados: {fileResult.updated ?? 0}. Erros: {(fileResult.results ?? []).filter((r) => !r.success).length}</p>
              )}
            </>
          )}
        </section>
      </div>
    </PageAccessGuard>
  )
}
