'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { ArrowLeftRight, ArrowLeft, Download } from 'lucide-react'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { Button } from '@/components/ui/Button'
import { adminFetchJson } from '@/lib/admin-client'

type Movement = {
  id: string
  movement_type: string
  quantity: number
  reference_type: string | null
  notes: string | null
  created_at: string
  bookstore_products: { sku: string; name: string } | null
}
const TYPE_LABELS: Record<string, string> = {
  ENTRY_PURCHASE: 'Entrada - Compra',
  ENTRY_ADJUSTMENT: 'Entrada - Ajuste',
  EXIT_SALE: 'Saída - Venda',
  EXIT_LOSS: 'Saída - Perda',
  EXIT_DONATION: 'Saída - Doação',
  EXIT_INTERNAL_USE: 'Saída - Uso interno',
  EXIT_ADJUSTMENT: 'Saída - Ajuste',
}

export default function LivrariaMovimentacoesPage() {
  const [items, setItems] = useState<Movement[]>([])
  const [loading, setLoading] = useState(true)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [type, setType] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (from) params.set('from', from)
      if (to) params.set('to', to)
      if (type) params.set('type', type)
      const data = await adminFetchJson<{ items: Movement[] }>(`/api/admin/livraria/movimentacoes?${params}`)
      setItems(data.items ?? [])
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [from, to, type])

  useEffect(() => { load() }, [load])

  return (
    <PageAccessGuard pageKey="livraria_movimentacoes">
      <div className="p-4 sm:p-6 md:p-8">
        <div className="mb-6 sm:mb-8 flex flex-col gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <Link href="/admin/livraria/produtos" className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 flex-shrink-0 touch-manipulation" aria-label="Voltar">
              <ArrowLeft size={20} />
            </Link>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#c62737]/10 flex items-center justify-center flex-shrink-0">
                  <ArrowLeftRight className="text-[#c62737]" size={24} />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Movimentações</h1>
                  <p className="text-slate-500 text-sm sm:text-base">Histórico de entradas e saídas</p>
                </div>
              </div>
            </div>
          </div>
          <Button variant="secondary" onClick={() => window.open(`/api/admin/livraria/exportacao?type=movements&format=xlsx${from ? `&from=${from}` : ''}${to ? `&to=${to}` : ''}`, '_blank')} className="w-full sm:w-auto touch-manipulation">
            <Download size={18} />
            Exportar XLSX
          </Button>
        </div>

        <div className="mb-4 sm:mb-6 grid grid-cols-2 sm:flex sm:flex-wrap gap-3 sm:gap-4">
          <div className="min-w-0">
            <label className="block text-sm text-slate-600 mb-1">Data inicial</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg" />
          </div>
          <div className="min-w-0">
            <label className="block text-sm text-slate-600 mb-1">Data final</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg" />
          </div>
          <div className="min-w-0">
            <label className="block text-sm text-slate-600 mb-1">Tipo</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg">
              <option value="">Todos</option>
              {Object.entries(TYPE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="p-6 sm:p-8 text-center text-slate-500">Carregando...</div>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium text-slate-700">Data/Hora</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700">Produto</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700">Tipo</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-700">Quantidade</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700">Referência</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700">Observação</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => (
                    <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4 text-slate-600">{new Date(row.created_at).toLocaleString('pt-BR')}</td>
                      <td className="py-3 px-4">{row.bookstore_products?.sku ?? '—'} — {row.bookstore_products?.name ?? '—'}</td>
                      <td className="py-3 px-4">{TYPE_LABELS[row.movement_type] ?? row.movement_type}</td>
                      <td className="py-3 px-4 text-right">{row.quantity}</td>
                      <td className="py-3 px-4 text-slate-600">{row.reference_type ?? '—'}</td>
                      <td className="py-3 px-4 text-slate-600">{row.notes ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!loading && items.length === 0 && (
            <div className="p-6 sm:p-8 text-center text-slate-500">Nenhuma movimentação no período.</div>
          )}
        </div>
      </div>
    </PageAccessGuard>
  )
}
