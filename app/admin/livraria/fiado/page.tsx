'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { CreditCard, ArrowLeft, Search, DollarSign, User, FileText } from 'lucide-react'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { Spinner } from '@/components/ui/Spinner'
import { Toast } from '@/components/Toast'
import { adminFetchJson, getAccessTokenOrThrow } from '@/lib/admin-client'
import { AllocatePaymentModal } from '@/components/admin/bookstore/AllocatePaymentModal'
import type { PaymentFormPayload } from '@/components/admin/bookstore/PaymentForm'

type FiadoItem = {
  customer_id: string
  name: string
  total_pendente: number
  qtd_vendas_pendentes: number
  ultima_compra: string | null
}

type FiadoResponse = {
  items: FiadoItem[]
  total_pendente_geral: number
  total_clientes: number
}

export default function LivrariaFiadoPage() {
  const [data, setData] = useState<FiadoResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [pendenteMin, setPendenteMin] = useState('')
  const [vencidos, setVencidos] = useState(false)
  const [paymentModal, setPaymentModal] = useState<FiadoItem | null>(null)
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; message: string } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (pendenteMin) params.set('pendente_min', pendenteMin)
      if (vencidos) params.set('vencidos', 'true')
      const res = await adminFetchJson<FiadoResponse>(`/api/admin/livraria/fiado?${params}`)
      setData(res)
    } catch {
      setData({ items: [], total_pendente_geral: 0, total_clientes: 0 })
    } finally {
      setLoading(false)
    }
  }, [search, pendenteMin, vencidos])

  useEffect(() => {
    load()
  }, [load])

  async function handlePaymentSubmit(customerId: string, payload: PaymentFormPayload) {
    setPaymentLoading(true)
    try {
      const token = await getAccessTokenOrThrow()
      const body: { amount: number; payment_method?: string; notes?: string; allocations?: Array<{ sale_id: string; amount: number }> } = {
        amount: payload.amount,
        payment_method: payload.payment_method ?? undefined,
        notes: payload.notes ?? undefined,
      }
      if (payload.allocations && payload.allocations.length > 0) body.allocations = payload.allocations
      const r = await fetch(`/api/admin/livraria/clientes/${customerId}/pagamentos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      const res = await r.json()
      if (!r.ok) throw new Error(res.error || 'Erro ao registrar pagamento')
      setToast({ type: 'ok', message: 'Pagamento registrado com sucesso.' })
      setPaymentModal(null)
      load()
    } catch (e) {
      setToast({ type: 'err', message: e instanceof Error ? e.message : 'Erro ao registrar.' })
    } finally {
      setPaymentLoading(false)
    }
  }

  return (
    <PageAccessGuard pageKey="livraria_fiado">
      <div className="p-4 sm:p-6 md:p-8">
        <div className="mb-6 flex items-center gap-3">
          <Link
            href="/admin/livraria/dashboard"
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
            aria-label="Voltar"
          >
            <ArrowLeft size={20} />
          </Link>
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Fiado</h1>
            <p className="text-slate-500 text-sm">Visão de pendências e saldo de clientes</p>
          </div>
          <Link
            href="/admin/livraria/fiado/relatorio"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm"
          >
            <FileText size={18} />
            Relatório
          </Link>
        </div>

        {data && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center gap-2 text-slate-600 mb-1">
                <CreditCard size={18} />
                <span className="text-sm font-medium">Total pendente</span>
              </div>
              <p className="text-2xl font-bold text-amber-600">R$ {data.total_pendente_geral.toFixed(2)}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center gap-2 text-slate-600 mb-1">
                <User size={18} />
                <span className="text-sm font-medium">Clientes com pendência</span>
              </div>
              <p className="text-2xl font-bold text-slate-800">{data.total_clientes}</p>
            </div>
          </div>
        )}

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="search"
              placeholder="Buscar cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-slate-800"
            />
          </div>
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="Pendência mín. (R$)"
            value={pendenteMin}
            onChange={(e) => setPendenteMin(e.target.value)}
            className="w-40 px-3 py-2 border border-slate-300 rounded-lg text-slate-800"
          />
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={vencidos}
              onChange={(e) => setVencidos(e.target.checked)}
              className="rounded border-slate-300"
            />
            Vencidos
          </label>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner size="lg" text="Carregando..." />
          </div>
        ) : data && data.items.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
            Nenhum cliente com saldo pendente.
          </div>
        ) : data ? (
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="p-3 text-left font-medium text-slate-700">Cliente</th>
                    <th className="p-3 text-right font-medium text-slate-700">Saldo pendente</th>
                    <th className="p-3 text-left font-medium text-slate-700">Última compra</th>
                    <th className="p-3 w-40 text-right font-medium text-slate-700">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((row) => (
                    <tr key={row.customer_id} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="p-3 font-medium text-slate-800">{row.name}</td>
                      <td className="p-3 text-right font-medium text-amber-600">R$ {row.total_pendente.toFixed(2)}</td>
                      <td className="p-3 text-slate-600">
                        {row.ultima_compra ? new Date(row.ultima_compra).toLocaleDateString('pt-BR') : '—'}
                      </td>
                      <td className="p-3 text-right">
                        <Link
                          href={`/admin/livraria/clientes/${row.customer_id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-sm"
                        >
                          <User size={14} />
                          Ver cliente
                        </Link>
                        <button
                          type="button"
                          onClick={() => setPaymentModal(row)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-700 ml-2"
                        >
                          <DollarSign size={14} />
                          Pagamento
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {paymentModal && (
          <AllocatePaymentModal
            open={!!paymentModal}
            customerId={paymentModal.customer_id}
            customerName={paymentModal.name}
            onSuccess={() => setPaymentModal(null)}
            onCancel={() => setPaymentModal(null)}
            onSubmit={(payload) => handlePaymentSubmit(paymentModal.customer_id, payload)}
            loading={paymentLoading}
          />
        )}

        {toast && (
          <Toast visible message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        )}
      </div>
    </PageAccessGuard>
  )
}
