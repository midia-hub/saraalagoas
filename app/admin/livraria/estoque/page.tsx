'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { Package, ArrowLeft, Search, Trash2, Plus, FileSpreadsheet, ListChecks, CheckCircle2, AlertCircle, X } from 'lucide-react'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { Button } from '@/components/ui/Button'
import { CustomSelect } from '@/components/ui/CustomSelect'
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
  const [showSuggestions, setShowSuggestions] = useState(false)
  const searchContainerRef = useRef<HTMLDivElement>(null)

  // Fecha sugestões ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const loadProducts = useCallback(async () => {
    const q = productSearch.trim()
    const url = q ? `/api/admin/livraria/produtos?search=${encodeURIComponent(q)}` : '/api/admin/livraria/produtos'
    const data = await adminFetchJson<{ items: Product[] }>(url)
    setProducts(data.items ?? [])
  }, [productSearch])

  const handleSelectProduct = (p: Product) => {
    setSelectedProduct(p)
    setProductSearch(p.name)
    setShowSuggestions(false)
  }

  const handleClearProduct = () => {
    setSelectedProduct(null)
    setProductSearch('')
    setProducts([])
    setShowSuggestions(false)
  }

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

  const removeBulkRow = (i: number) => setBulkItems((prev) => prev.filter((_, idx) => idx !== i))

  return (
    <PageAccessGuard pageKey="livraria_estoque">
      <div className="p-4 sm:p-6 md:p-8 max-w-5xl mx-auto">

        {/* Cabeçalho */}
        <div className="mb-6 sm:mb-8 flex items-center gap-3">
          <Link
            href="/admin/livraria/produtos"
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-600 flex-shrink-0 touch-manipulation transition-colors"
            aria-label="Voltar para produtos"
          >
            <ArrowLeft size={20} />
          </Link>
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#c62737]/10 flex items-center justify-center flex-shrink-0">
            <Package className="text-[#c62737]" size={22} />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">Estoque</h1>
            <p className="text-slate-500 text-xs sm:text-sm mt-0.5">Movimentar estoque e atualização em massa</p>
          </div>
        </div>

        {/* ─── Seção: Movimentação individual ─── */}
        <section className="bg-white rounded-xl border border-slate-200 mb-6">
          <div className="px-4 sm:px-6 py-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-800">Movimentar estoque (individual)</h2>
            <p className="text-xs text-slate-500 mt-0.5">Registre entrada ou saída de um produto específico</p>
          </div>

          <div className="p-4 sm:p-6 space-y-4">
            {/* Campo Produto */}
            <div ref={searchContainerRef} className="relative">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Produto <span className="text-[#c62737]">*</span>
              </label>

              {selectedProduct ? (
                /* Card do produto selecionado */
                <div className="flex items-center gap-3 px-3.5 py-3 bg-white border-2 border-[#c62737]/30 rounded-xl">
                  <div className="w-8 h-8 rounded-lg bg-[#c62737]/10 flex items-center justify-center flex-shrink-0">
                    <Package size={15} className="text-[#c62737]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{selectedProduct.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">SKU: {selectedProduct.sku}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                      selectedProduct.current_stock > 0
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-red-50 text-red-600 border border-red-200'
                    }`}>
                      {selectedProduct.current_stock > 0 ? `${selectedProduct.current_stock} un.` : 'Sem estoque'}
                    </span>
                    <button
                      type="button"
                      onClick={handleClearProduct}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors touch-manipulation"
                      aria-label="Remover produto selecionado"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                /* Campo de busca */
                <div className="relative">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Buscar por nome ou SKU..."
                    value={productSearch}
                    onChange={(e) => { setProductSearch(e.target.value); setShowSuggestions(true) }}
                    onFocus={() => setShowSuggestions(true)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800
                               focus:border-[#c62737] focus:ring-2 focus:ring-[#c62737]/20 outline-none transition-all
                               placeholder:text-slate-400"
                    autoComplete="off"
                  />

                  {/* Dropdown de sugestões — posição absoluta, não empurra o layout */}
                  {showSuggestions && products.length > 0 && (
                    <ul className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
                      {products.slice(0, 8).map((p) => (
                        <li key={p.id} className="border-b border-slate-100 last:border-0">
                          <button
                            type="button"
                            onMouseDown={(e) => { e.preventDefault(); handleSelectProduct(p) }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 active:bg-slate-100 transition-colors touch-manipulation text-left"
                          >
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-medium text-slate-800 block truncate">{p.name}</span>
                              <span className="text-xs text-slate-400">SKU: {p.sku}</span>
                            </div>
                            <span className={`flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                              p.current_stock > 0
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-red-50 text-red-600'
                            }`}>
                              {p.current_stock > 0 ? `${p.current_stock} un.` : 'Zerado'}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  {showSuggestions && productSearch.trim().length > 0 && products.length === 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-slate-200 rounded-xl shadow-xl px-4 py-3 text-sm text-slate-500">
                      Nenhum produto encontrado para &quot;{productSearch}&quot;
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Grid: Tipo + Quantidade + Observação */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Tipo de movimentação <span className="text-[#c62737]">*</span>
                </label>
                <CustomSelect
                  value={movementType}
                  onChange={setMovementType}
                  options={MOVEMENT_TYPES}
                  placeholder="Selecione o tipo..."
                  allowEmpty={false}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Quantidade <span className="text-[#c62737]">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800
                             focus:border-[#c62737] focus:ring-2 focus:ring-[#c62737]/20 outline-none transition-all
                             placeholder:text-slate-400"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Observação</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800
                             focus:border-[#c62737] focus:ring-2 focus:ring-[#c62737]/20 outline-none transition-all
                             placeholder:text-slate-400"
                  placeholder="Opcional"
                />
              </div>
            </div>

            <div className="pt-1">
              <Button
                onClick={handleMovimentar}
                loading={moveLoading}
                disabled={!selectedProduct || !quantity || parseInt(quantity, 10) <= 0}
                className="w-full sm:w-auto touch-manipulation"
              >
                Confirmar movimentação
              </Button>
            </div>
          </div>
        </section>

        {/* ─── Seção: Atualização em massa ─── */}
        <section className="bg-white rounded-xl border border-slate-200">
          <div className="px-4 sm:px-6 py-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-800">Atualização em massa</h2>
            <p className="text-xs text-slate-500 mt-0.5">Atualize o estoque de múltiplos produtos de uma vez</p>
          </div>

          <div className="p-4 sm:p-6">
            {/* Tabs de modo */}
            <div className="flex rounded-xl border border-slate-200 overflow-hidden mb-6 w-full sm:w-auto sm:inline-flex">
              <button
                type="button"
                onClick={() => setBulkMode('manual')}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors touch-manipulation ${
                  bulkMode === 'manual'
                    ? 'bg-[#c62737] text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <ListChecks size={16} />
                Lote manual
              </button>
              <button
                type="button"
                onClick={() => setBulkMode('xlsx')}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium border-l border-slate-200 transition-colors touch-manipulation ${
                  bulkMode === 'xlsx'
                    ? 'bg-[#c62737] text-white border-[#c62737]'
                    : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <FileSpreadsheet size={16} />
                Via XLSX
              </button>
            </div>

            {/* ── Modo manual ── */}
            {bulkMode === 'manual' && (
              <>
                <div className="mb-4">
                  <label className="block text-xs font-medium text-slate-700 mb-1">Modo de atualização</label>
                  <CustomSelect
                    value={bulkBulkMode}
                    onChange={(v) => setBulkBulkMode(v as 'SET' | 'DELTA')}
                    options={[
                      { value: 'SET', label: 'SET — define o estoque final' },
                      { value: 'DELTA', label: 'DELTA — soma/subtrai a diferença' },
                    ]}
                    allowEmpty={false}
                    placeholder="Selecione o modo..."
                  />
                </div>

                {/* Itens — cards no mobile, tabela no desktop */}
                <div className="space-y-3 sm:hidden">
                  {bulkItems.map((row, i) => (
                    <div key={i} className="rounded-xl border border-slate-200 p-3 bg-slate-50/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Item {i + 1}</span>
                        {bulkItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeBulkRow(i)}
                            className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors touch-manipulation"
                            aria-label="Remover linha"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">SKU <span className="text-[#c62737]">*</span></label>
                        <input
                          value={row.sku}
                          onChange={(e) => updateBulkRow(i, 'sku', e.target.value)}
                          placeholder="Ex: LIV-001"
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800
                                     focus:border-[#c62737] focus:ring-2 focus:ring-[#c62737]/20 outline-none transition-all
                                     placeholder:text-slate-400"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Valor <span className="text-[#c62737]">*</span></label>
                        <input
                          type="number"
                          value={row.value}
                          onChange={(e) => updateBulkRow(i, 'value', e.target.value)}
                          placeholder="0"
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800
                                     focus:border-[#c62737] focus:ring-2 focus:ring-[#c62737]/20 outline-none transition-all
                                     placeholder:text-slate-400"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Observação</label>
                        <input
                          value={row.notes}
                          onChange={(e) => updateBulkRow(i, 'notes', e.target.value)}
                          placeholder="Opcional"
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800
                                     focus:border-[#c62737] focus:ring-2 focus:ring-[#c62737]/20 outline-none transition-all
                                     placeholder:text-slate-400"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Tabela no desktop */}
                <div className="hidden sm:block overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">SKU</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide w-36">Valor</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Observação</th>
                        <th className="w-10 px-2 py-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {bulkItems.map((row, i) => (
                        <tr key={i} className="hover:bg-slate-50/50">
                          <td className="px-4 py-2">
                            <input
                              value={row.sku}
                              onChange={(e) => updateBulkRow(i, 'sku', e.target.value)}
                              placeholder="SKU"
                              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-800
                                         focus:border-[#c62737] focus:ring-2 focus:ring-[#c62737]/20 outline-none transition-all
                                         placeholder:text-slate-400"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              value={row.value}
                              onChange={(e) => updateBulkRow(i, 'value', e.target.value)}
                              placeholder="0"
                              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-800
                                         focus:border-[#c62737] focus:ring-2 focus:ring-[#c62737]/20 outline-none transition-all
                                         placeholder:text-slate-400"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              value={row.notes}
                              onChange={(e) => updateBulkRow(i, 'notes', e.target.value)}
                              placeholder="Opcional"
                              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-800
                                         focus:border-[#c62737] focus:ring-2 focus:ring-[#c62737]/20 outline-none transition-all
                                         placeholder:text-slate-400"
                            />
                          </td>
                          <td className="px-2 py-2 text-center">
                            {bulkItems.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeBulkRow(i)}
                                className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors touch-manipulation"
                                aria-label="Remover linha"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 flex flex-col sm:flex-row gap-2">
                  <Button
                    variant="secondary"
                    onClick={addBulkRow}
                    className="w-full sm:w-auto touch-manipulation flex items-center justify-center gap-2"
                  >
                    <Plus size={16} />
                    Adicionar linha
                  </Button>
                  <Button
                    onClick={handleBulkApply}
                    loading={bulkLoading}
                    className="w-full sm:w-auto touch-manipulation"
                  >
                    Aplicar atualização
                  </Button>
                </div>

                {bulkResult && (
                  <div className={`mt-4 flex items-start gap-3 p-3 rounded-xl border text-sm ${
                    (bulkResult.errors?.length ?? 0) > 0
                      ? 'bg-red-50 border-red-200 text-red-700'
                      : 'bg-green-50 border-green-200 text-green-700'
                  }`}>
                    {(bulkResult.errors?.length ?? 0) > 0
                      ? <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                      : <CheckCircle2 size={16} className="flex-shrink-0 mt-0.5" />
                    }
                    <div>
                      <span className="font-medium">Atualizados: {bulkResult.updated ?? 0}</span>
                      {(bulkResult.errors?.length ?? 0) > 0 && (
                        <ul className="mt-1 space-y-0.5 text-xs">
                          {bulkResult.errors!.map((e) => (
                            <li key={e.sku}><strong>{e.sku}</strong>: {e.error}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ── Modo XLSX ── */}
            {bulkMode === 'xlsx' && (
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-sm text-slate-700 font-medium mb-1">Formato esperado do arquivo</p>
                  <p className="text-xs text-slate-500 mb-3">Colunas obrigatórias: <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-700">sku</code>, <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-700">mode</code>, <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-700">value</code>, <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-700">notes</code></p>
                  <a
                    href="/api/admin/livraria/importacao/modelo?type=stock"
                    download
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors touch-manipulation"
                  >
                    <FileSpreadsheet size={16} className="text-[#c62737]" />
                    Baixar modelo XLSX
                  </a>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Arquivo XLSX</label>
                  <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                    <label className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed border-slate-200 hover:border-[#c62737]/40 bg-white cursor-pointer transition-colors touch-manipulation">
                      <FileSpreadsheet size={20} className="text-slate-400 flex-shrink-0" />
                      <span className="text-sm text-slate-600 truncate">
                        {file ? file.name : 'Clique ou arraste o arquivo aqui'}
                      </span>
                      <input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                        className="sr-only"
                      />
                    </label>
                    <Button
                      onClick={handleFileProcess}
                      loading={fileLoading}
                      disabled={!file}
                      className="w-full sm:w-auto touch-manipulation flex-shrink-0"
                    >
                      Processar arquivo
                    </Button>
                  </div>
                </div>

                {fileResult && (
                  <div className={`flex items-start gap-3 p-3 rounded-xl border text-sm ${
                    (fileResult.results ?? []).filter((r) => !r.success).length > 0
                      ? 'bg-red-50 border-red-200 text-red-700'
                      : 'bg-green-50 border-green-200 text-green-700'
                  }`}>
                    {(fileResult.results ?? []).filter((r) => !r.success).length > 0
                      ? <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                      : <CheckCircle2 size={16} className="flex-shrink-0 mt-0.5" />
                    }
                    <div>
                      <span className="font-medium">Processados: {fileResult.updated ?? 0}</span>
                      {(fileResult.results ?? []).filter((r) => !r.success).length > 0 && (
                        <p className="text-xs mt-0.5">Erros: {(fileResult.results ?? []).filter((r) => !r.success).length} produto(s) não atualizados</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </PageAccessGuard>
  )
}
