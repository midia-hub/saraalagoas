'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { History, ArrowLeft } from 'lucide-react'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { adminFetchJson } from '@/lib/admin-client'

type SaleRow = {
  id: string
  sale_number: string
  customer_name: string | null
  payment_method: string | null
  payment_provider: string | null
  total_amount: number
  status: string
  created_at: string
  paid_at: string | null
  created_by: string | null
}

export default function HistoricoVendasPage() {
  const [items, setItems] = useState<SaleRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const perPage = 20

  useEffect(() => {
    const params = new URLSearchParams()
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    if (paymentMethod) params.set('payment_method', paymentMethod)
    if (search) params.set('search', search)
    params.set('page', String(page))
    params.set('per_page', String(perPage))
    setLoading(true)
    adminFetchJson<{ items: SaleRow[]; total: number }>(`/api/admin/livraria/vendas/historico?${params}`)
      .then((data) => {
        setItems(data.items ?? [])
        setTotal(data.total ?? 0)
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [from, to, paymentMethod, search, page])

  const formatDate = (s: string) => new Date(s).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

  return (
    <PageAccessGuard pageKey="livraria_vendas">
      <div className="p-4 sm:p-6">
        <div className="mb-6 flex items-center gap-3">
          <Link href="/admin/livraria/vendas" className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600" aria-label="Voltar">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <History size={24} />
              Histórico de vendas
            </h1>
            <p className="text-slate-500 text-sm">Listagem e recibos</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-slate-800 text-sm"
          />
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-slate-800 text-sm"
          />
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-slate-800 text-sm"
          >
            <option value="">Todos os pagamentos</option>
            <option value="Dinheiro">Dinheiro</option>
            <option value="Pix">Pix</option>
            <option value="Cartão">Cartão</option>
            <option value="Mercado Pago">Mercado Pago</option>
            <option value="Outro">Outro</option>
          </select>
          <input
            type="search"
            placeholder="Nº venda ou cliente"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-slate-800 text-sm min-w-[180px]"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" text="Carregando..." />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="p-3 text-left font-medium text-slate-700">Data</th>
                    <th className="p-3 text-left font-medium text-slate-700">Nº venda</th>
                    <th className="p-3 text-left font-medium text-slate-700">Cliente</th>
                    <th className="p-3 text-left font-medium text-slate-700">Pagamento</th>
                    <th className="p-3 text-left font-medium text-slate-700">Status</th>
                    <th className="p-3 text-right font-medium text-slate-700">Total</th>
                    <th className="p-3 text-left font-medium text-slate-700">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((s) => (
                    <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="p-3 text-slate-600">{formatDate(s.created_at)}</td>
                      <td className="p-3 font-mono font-medium">{s.sale_number}</td>
                      <td className="p-3 text-slate-600">{s.customer_name ?? '—'}</td>
                      <td className="p-3 text-slate-600">{s.payment_method ?? '—'}</td>
                      <td className="p-3">
                        <span
                          className={
                            s.status === 'PAID'
                              ? 'text-emerald-600'
                              : s.status === 'PENDING'
                                ? 'text-amber-600'
                                : s.status === 'FAILED' || s.status === 'CANCELLED'
                                  ? 'text-red-600'
                                  : 'text-slate-600'
                          }
                        >
                          {s.status === 'PAID'
                            ? 'Pago'
                            : s.status === 'PENDING'
                              ? 'Pendente'
                              : s.status === 'FAILED'
                                ? 'Falhou'
                                : s.status === 'CANCELLED'
                                  ? 'Cancelado'
                                  : s.status}
                        </span>
                        {s.payment_provider && (
                          <span className="ml-1 text-xs text-slate-400">({s.payment_provider})</span>
                        )}
                      </td>
                      <td className="p-3 text-right font-medium">R$ {Number(s.total_amount).toFixed(2)}</td>
                      <td className="p-3">
                        <Link
                          href={`/admin/livraria/vendas/${s.id}/recibo`}
                          className="text-[#c62737] hover:underline font-medium"
                        >
                          Ver recibo
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {total > perPage && (
              <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
                <span>
                  Página {page} de {Math.ceil(total / perPage)}
                </span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Anterior
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={page >= Math.ceil(total / perPage)}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </PageAccessGuard>
  )
}
