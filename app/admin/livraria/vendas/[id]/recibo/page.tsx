'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Printer, History, Calendar, Clock, CreditCard, User, FileText } from 'lucide-react'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { adminFetchJson } from '@/lib/admin-client'

type Receipt = {
  id: string
  sale_number: string
  customer_name: string | null
  customer_phone: string | null
  payment_method: string | null
  subtotal: number
  discount_amount: number
  total_amount: number
  notes: string | null
  status: string
  paid_at: string | null
  created_at: string
  operator_name: string | null
  items: Array<{ name: string; quantity: number; unit_price: number; total_price: number }>
}

const STATUS_LABEL: Record<string, string> = {
  PAID: 'Pago',
  PENDING: 'Pendente',
  FAILED: 'Não aprovado',
  CANCELLED: 'Cancelado',
}

export default function ReciboPage({ params }: { params: { id: string } }) {
  const id = params.id
  const [data, setData] = useState<Receipt | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    adminFetchJson<Receipt>(`/api/admin/livraria/pdv/vendas/${id}/recibo/`)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [id])

  function handlePrint() {
    window.print()
  }

  const formatDate = (s: string) => new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
  const formatTime = (s: string) => new Date(s).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const formatDateTime = (s: string) => new Date(s).toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' })
  const statusLabel = data ? (STATUS_LABEL[data.status] ?? data.status) : ''

  return (
    <PageAccessGuard pageKey="livraria_vendas">
      <div className="min-h-screen bg-slate-100/80 print:bg-white">
        <div className="p-4 sm:p-6 max-w-2xl mx-auto">
          <div className="mb-4 flex flex-wrap items-center gap-2 print:hidden">
            <Link href="/admin/livraria/vendas" className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600" aria-label="Voltar">
              <ArrowLeft size={20} />
            </Link>
            <Link href="/admin/livraria/vendas/historico">
              <Button type="button" variant="secondary" size="sm">
                <History size={16} className="mr-1" />
                Ver histórico
              </Button>
            </Link>
            <Button type="button" variant="secondary" size="sm" onClick={handlePrint}>
              <Printer size={16} className="mr-1" />
              Imprimir
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" text="Carregando recibo..." />
            </div>
          ) : data ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden print:shadow-none print:rounded-none">
              {/* Cabeçalho */}
              <div className="bg-slate-800 text-white px-6 py-6 print:bg-slate-800 print:text-white">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h1 className="text-xl font-bold tracking-tight">Recibo de venda</h1>
                    <p className="text-slate-300 font-mono font-semibold mt-1">{data.sale_number}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                      data.status === 'PAID' ? 'bg-emerald-500/90' : data.status === 'PENDING' ? 'bg-amber-500/90' : data.status === 'FAILED' ? 'bg-red-500/90' : 'bg-slate-500/90'
                    }`}
                  >
                    {statusLabel}
                  </span>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Datas e horários */}
                <section className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
                    <Calendar size={16} className="text-slate-500" />
                    Data e horário
                  </h2>
                  <ul className="space-y-2 text-sm text-slate-700">
                    <li className="flex items-center gap-2">
                      <Clock size={14} className="text-slate-400 shrink-0" />
                      <span><strong>Emissão:</strong> {formatDate(data.created_at)} às {formatTime(data.created_at)}</span>
                    </li>
                    {data.paid_at && (
                      <li className="flex items-center gap-2">
                        <Clock size={14} className="text-emerald-500 shrink-0" />
                        <span><strong>Pagamento confirmado:</strong> {formatDate(data.paid_at)} às {formatTime(data.paid_at)}</span>
                      </li>
                    )}
                  </ul>
                </section>

                {/* Pagamento */}
                <section className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
                    <CreditCard size={16} className="text-slate-500" />
                    Pagamento
                  </h2>
                  <ul className="space-y-1 text-sm text-slate-700">
                    <li><strong>Forma:</strong> {data.payment_method ?? '—'}</li>
                    <li><strong>Status:</strong> {statusLabel}</li>
                  </ul>
                </section>

                {/* Cliente e operador */}
                <section className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
                    <User size={16} className="text-slate-500" />
                    Cliente e operador
                  </h2>
                  <ul className="space-y-1 text-sm text-slate-700">
                    {data.customer_name && <li><strong>Cliente:</strong> {data.customer_name}</li>}
                    {data.customer_phone && <li><strong>Telefone:</strong> {data.customer_phone}</li>}
                    {!data.customer_name && !data.customer_phone && <li className="text-slate-500">Cliente não informado</li>}
                    {data.operator_name && <li className="pt-2 border-t border-slate-200 mt-2"><strong>Operador:</strong> {data.operator_name}</li>}
                  </ul>
                </section>

                {/* Itens */}
                <section>
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
                    <FileText size={16} className="text-slate-500" />
                    Itens
                  </h2>
                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-200">
                          <th className="text-left py-3 px-4 font-semibold text-slate-700">Item</th>
                          <th className="text-right py-3 px-4 font-semibold text-slate-700 w-16">Qtd</th>
                          <th className="text-right py-3 px-4 font-semibold text-slate-700 w-24">Valor un.</th>
                          <th className="text-right py-3 px-4 font-semibold text-slate-700 w-28">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.items.map((i, idx) => (
                          <tr key={idx} className="border-b border-slate-100 last:border-0">
                            <td className="py-3 px-4 text-slate-800">{i.name}</td>
                            <td className="py-3 px-4 text-right">{i.quantity}</td>
                            <td className="py-3 px-4 text-right">R$ {i.unit_price.toFixed(2)}</td>
                            <td className="py-3 px-4 text-right font-medium">R$ {i.total_price.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                {/* Totais */}
                <section className="rounded-xl border-2 border-slate-200 bg-slate-50 p-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-slate-700">
                      <span>Subtotal</span>
                      <span>R$ {data.subtotal.toFixed(2)}</span>
                    </div>
                    {data.discount_amount > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>Desconto</span>
                        <span>− R$ {data.discount_amount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold text-slate-800 pt-2 border-t-2 border-slate-200 mt-2">
                      <span>Total</span>
                      <span>R$ {data.total_amount.toFixed(2)}</span>
                    </div>
                  </div>
                </section>

                {data.notes && (
                  <section className="rounded-xl border border-slate-200 bg-amber-50/50 p-4">
                    <p className="text-sm text-slate-700"><strong>Observações:</strong> {data.notes}</p>
                  </section>
                )}

                <p className="text-xs text-slate-400 text-center pt-2">
                  Recibo gerado em {formatDateTime(new Date().toISOString())}
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
              <p className="text-slate-500">Recibo não encontrado.</p>
              <Link href="/admin/livraria/vendas/historico" className="text-[#c62737] text-sm font-medium mt-2 inline-block">
                Ver histórico de vendas
              </Link>
            </div>
          )}
        </div>
      </div>
    </PageAccessGuard>
  )
}
