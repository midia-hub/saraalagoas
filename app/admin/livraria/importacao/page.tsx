'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FileSpreadsheet, ArrowLeft, Download, Upload } from 'lucide-react'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { Button } from '@/components/ui/Button'
import { adminFetchJson, getAccessTokenOrThrow } from '@/lib/admin-client'

export default function LivrariaImportacaoPage() {
  const [importType, setImportType] = useState<'products' | 'stock'>('products')
  const [file, setFile] = useState<File | null>(null)
  const [validating, setValidating] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [validation, setValidation] = useState<{ valid: boolean; errors: Array<{ row: number; message: string }>; preview?: unknown[] } | null>(null)
  const [processResult, setProcessResult] = useState<{ created?: number; updated?: number; results?: Array<{ row: number; sku: string; success: boolean; error?: string }> } | null>(null)

  const handleValidate = async () => {
    if (!file) return
    setValidating(true)
    setValidation(null)
    try {
      const token = await getAccessTokenOrThrow()
      const fd = new FormData()
      fd.append('file', file)
      fd.append('type', importType)
      const res = await fetch('/api/admin/livraria/importacao/validar', {
        method: 'POST',
        body: fd,
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      setValidation({ valid: data.valid, errors: data.errors ?? [], preview: data.preview })
    } catch (e) {
      console.error(e)
      setValidation({ valid: false, errors: [{ row: 0, message: 'Erro ao validar arquivo' }] })
    } finally {
      setValidating(false)
    }
  }

  const handleProcess = async () => {
    if (!file) return
    setProcessing(true)
    setProcessResult(null)
    try {
      const token = await getAccessTokenOrThrow()
      const fd = new FormData()
      fd.append('file', file)
      fd.append('type', importType)
      const res = await fetch('/api/admin/livraria/importacao/processar', {
        method: 'POST',
        body: fd,
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Erro')
      setProcessResult({ created: data.created, updated: data.updated, results: data.results })
    } catch (e) {
      console.error(e)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <PageAccessGuard pageKey="livraria_importacao">
      <div className="p-4 sm:p-6 md:p-8">
        <div className="mb-6 sm:mb-8 flex items-start sm:items-center gap-3">
          <Link href="/admin/livraria/produtos" className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 flex-shrink-0 touch-manipulation" aria-label="Voltar">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#c62737]/10 flex items-center justify-center flex-shrink-0">
                <FileSpreadsheet className="text-[#c62737]" size={24} />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Importação / Exportação</h1>
                <p className="text-slate-500 text-sm sm:text-base">Importar produtos ou estoque em massa</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2">
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-semibold text-slate-800 mb-2 flex items-center gap-2">
              <Download size={20} />
              Baixar modelo
            </h2>
            <p className="text-sm text-slate-600 mb-4">Use os modelos para preencher e importar.</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <a href="/api/admin/livraria/importacao/modelo?type=products" className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium touch-manipulation">
                Modelo produtos (XLSX)
              </a>
              <a href="/api/admin/livraria/importacao/modelo?type=stock" className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium touch-manipulation">
                Modelo estoque (XLSX)
              </a>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-semibold text-slate-800 mb-2 flex items-center gap-2">
              <Upload size={20} />
              Exportar
            </h2>
            <p className="text-sm text-slate-600 mb-4">Exporte produtos, movimentações ou estoque baixo.</p>
            <div className="flex flex-wrap gap-2">
              <a href="/api/admin/livraria/exportacao?type=products&format=xlsx" className="inline-flex items-center gap-2 px-4 py-2 bg-[#c62737] text-white rounded-lg text-sm font-medium hover:bg-[#a01f2d]">
                Produtos (XLSX)
              </a>
              <a href="/api/admin/livraria/exportacao?type=movements&format=xlsx" className="inline-flex items-center gap-2 px-4 py-2 bg-[#c62737] text-white rounded-lg text-sm font-medium hover:bg-[#a01f2d]">
                Movimentações (XLSX)
              </a>
              <a href="/api/admin/livraria/exportacao?type=low_stock&format=xlsx" className="inline-flex items-center gap-2 px-4 py-2 bg-[#c62737] text-white rounded-lg text-sm font-medium hover:bg-[#a01f2d]">
                Estoque baixo (XLSX)
              </a>
            </div>
          </div>
        </div>

        <section className="mt-6 sm:mt-8 bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold text-slate-800 mb-4">Importação em massa</h2>
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">Tipo de importação</label>
            <select value={importType} onChange={(e) => setImportType(e.target.value as 'products' | 'stock')} className="w-full sm:w-auto px-3 py-2.5 border border-slate-300 rounded-lg">
              <option value="products">Importar produtos (XLSX)</option>
              <option value="stock">Atualizar estoque (XLSX)</option>
            </select>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">Arquivo</label>
            <input type="file" accept=".xlsx,.xls" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setValidation(null); setProcessResult(null) }} className="text-sm w-full min-w-0" />
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="secondary" onClick={handleValidate} loading={validating} disabled={!file} className="w-full sm:w-auto touch-manipulation">
              Validar
            </Button>
            <Button onClick={handleProcess} loading={processing} disabled={!file} className="w-full sm:w-auto touch-manipulation">
              Confirmar processamento
            </Button>
          </div>
          {validation && (
            <div className="mt-6 p-4 rounded-lg border border-slate-200 bg-slate-50">
              {validation.valid ? (
                <p className="text-green-700 text-sm">Arquivo válido. Você pode confirmar o processamento.</p>
              ) : (
                <div>
                  <p className="text-red-700 text-sm font-medium mb-2">Encontramos erros no arquivo. Ajuste e tente novamente.</p>
                  <ul className="text-sm text-slate-700 list-disc list-inside">
                    {validation.errors.map((e, i) => (
                      <li key={i}>Linha {e.row}: {e.message}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          {processResult && (
            <div className="mt-6 p-4 rounded-lg border border-green-200 bg-green-50 text-green-800 text-sm">
              Processado. Criados: {processResult.created ?? 0}. Atualizados: {processResult.updated ?? 0}.
              {(processResult.results ?? []).filter((r) => !r.success).length > 0 && (
                <p className="mt-2">Erros: {(processResult.results ?? []).filter((r) => !r.success).map((r) => `Linha ${r.row} (${r.sku}): ${r.error}`).join('; ')}</p>
              )}
            </div>
          )}
        </section>
      </div>
    </PageAccessGuard>
  )
}
