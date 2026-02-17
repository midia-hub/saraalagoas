'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { BarChart3, ArrowLeft, Package, TrendingDown, TrendingUp, AlertTriangle, ShoppingBag, DollarSign, CreditCard, User, Smartphone, Clock } from 'lucide-react'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { adminFetchJson } from '@/lib/admin-client'

type Dashboard = {
  cards: {
    total_products: number
    low_stock_count: number
    total_entries_30d: number
    total_exits_30d: number
    losses_30d: number
    sales_count?: number
    sales_revenue?: number
    sales_avg_ticket?: number
  }
  series: Array<{ date: string; entradas: number; saidas: number }>
  sales_series?: Array<{ date: string; vendas: number; receita: number }>
  sales_by_payment?: Record<string, number>
  last_sales?: Array<{ id: string; sale_number: string; customer_name: string | null; payment_method: string | null; total_amount: number; created_at: string }>
  low_stock: Array<{ sku: string; name: string; current_stock: number; min_stock: number; sale_price?: number }>
  top_movements: Array<{ sku: string; name: string; quantity: number }>
  top_losses: Array<{ sku: string; name: string; quantity: number }>
  fiado?: {
    total_pendente: number
    recebido_30d: number
    vendas_fiado_30d: number
    top_devedores: Array<{ customer_id: string; name: string; total_pendente: number }>
  }
  mercadopago?: {
    vendas_count: number
    receita: number
    pendentes_count: number
    pendentes_valor: number
    taxa_aprovacao: number | null
    ultimas_transacoes: Array<{ sale_id: string; sale_number: string; status: string; amount: number; created_at: string }>
    pendentes_antigos: Array<{ sale_id: string; sale_number: string; amount: number; created_at: string }>
  }
}

export default function LivrariaDashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminFetchJson<Dashboard>('/api/admin/livraria/dashboard?range=30d')
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  return (
    <PageAccessGuard pageKey="livraria_dashboard">
      <div className="p-4 sm:p-6 md:p-8">
        <div className="mb-6 sm:mb-8 flex items-start sm:items-center gap-3">
          <Link href="/admin/livraria/produtos" className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 flex-shrink-0 touch-manipulation" aria-label="Voltar">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#c62737]/10 flex items-center justify-center flex-shrink-0">
                <BarChart3 className="text-[#c62737]" size={24} />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Dashboard Livraria</h1>
                <p className="text-slate-500 text-sm sm:text-base">Indicadores (últimos 30 dias)</p>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-slate-500 py-4">Carregando...</div>
        ) : data ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-6 sm:mb-8">
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-center gap-2 text-slate-600 mb-1">
                  <Package size={18} />
                  <span className="text-sm font-medium">Produtos ativos</span>
                </div>
                <p className="text-2xl font-bold text-slate-800">{data.cards.total_products}</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-center gap-2 text-slate-600 mb-1">
                  <AlertTriangle size={18} />
                  <span className="text-sm font-medium">Estoque baixo</span>
                </div>
                <p className="text-2xl font-bold text-amber-600">{data.cards.low_stock_count}</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-center gap-2 text-slate-600 mb-1">
                  <TrendingUp size={18} />
                  <span className="text-sm font-medium">Entradas (30 dias)</span>
                </div>
                <p className="text-2xl font-bold text-green-600">{data.cards.total_entries_30d}</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-center gap-2 text-slate-600 mb-1">
                  <TrendingDown size={18} />
                  <span className="text-sm font-medium">Saídas (30 dias)</span>
                </div>
                <p className="text-2xl font-bold text-slate-800">{data.cards.total_exits_30d}</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-center gap-2 text-slate-600 mb-1">
                  <span className="text-sm font-medium">Perdas (30 dias)</span>
                </div>
                <p className="text-2xl font-bold text-red-600">{data.cards.losses_30d}</p>
              </div>
            </div>

            {typeof data.cards.sales_count === 'number' && (
              <>
                <h2 className="text-lg font-semibold text-slate-800 mb-3 mt-8">Vendas</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6">
                  <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <div className="flex items-center gap-2 text-slate-600 mb-1">
                      <ShoppingBag size={18} />
                      <span className="text-sm font-medium">Vendas no período</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-800">{data.cards.sales_count}</p>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <div className="flex items-center gap-2 text-slate-600 mb-1">
                      <DollarSign size={18} />
                      <span className="text-sm font-medium">Receita total</span>
                    </div>
                    <p className="text-2xl font-bold text-green-600">R$ {Number(data.cards.sales_revenue ?? 0).toFixed(2)}</p>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <div className="flex items-center gap-2 text-slate-600 mb-1">
                      <span className="text-sm font-medium">Ticket médio</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-800">R$ {Number(data.cards.sales_avg_ticket ?? 0).toFixed(2)}</p>
                  </div>
                </div>
                {data.sales_series && data.sales_series.length > 0 && (
                  <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 mb-6">
                    <h3 className="font-semibold text-slate-800 mb-4 text-sm sm:text-base">Vendas por dia</h3>
                    <div className="overflow-x-auto -mx-2 sm:mx-0">
                      <table className="w-full text-sm">
                        <thead><tr><th className="text-left py-2">Data</th><th className="text-right py-2">Vendas</th><th className="text-right py-2">Receita</th></tr></thead>
                        <tbody>
                          {data.sales_series.slice(-14).reverse().map((s) => (
                            <tr key={s.date} className="border-t border-slate-100">
                              <td className="py-2">{s.date}</td>
                              <td className="py-2 text-right">{s.vendas}</td>
                              <td className="py-2 text-right text-green-600">R$ {s.receita.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                {data.sales_by_payment && Object.keys(data.sales_by_payment).length > 0 && (
                  <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 mb-6">
                    <h3 className="font-semibold text-slate-800 mb-4 text-sm sm:text-base">Por forma de pagamento</h3>
                    <div className="overflow-x-auto -mx-2 sm:mx-0">
                      <table className="w-full text-sm">
                        <thead><tr><th className="text-left py-2">Forma</th><th className="text-right py-2">Receita</th></tr></thead>
                        <tbody>
                          {Object.entries(data.sales_by_payment).map(([method, value]) => (
                            <tr key={method} className="border-t border-slate-100">
                              <td className="py-2">{method}</td>
                              <td className="py-2 text-right">R$ {Number(value).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                {data.last_sales && data.last_sales.length > 0 && (
                  <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 mb-6">
                    <h3 className="font-semibold text-slate-800 mb-4 text-sm sm:text-base">Últimas vendas</h3>
                    <div className="overflow-x-auto -mx-2 sm:mx-0">
                      <table className="w-full text-sm">
                        <thead><tr><th className="text-left py-2">Data</th><th className="text-left py-2">Nº</th><th className="text-left py-2">Cliente</th><th className="text-right py-2">Total</th><th className="text-left py-2">Ação</th></tr></thead>
                        <tbody>
                          {data.last_sales.map((s) => (
                            <tr key={s.id} className="border-t border-slate-100">
                              <td className="py-2">{new Date(s.created_at).toLocaleDateString('pt-BR')}</td>
                              <td className="py-2 font-mono">{s.sale_number}</td>
                              <td className="py-2">{s.customer_name ?? '—'}</td>
                              <td className="py-2 text-right">R$ {Number(s.total_amount).toFixed(2)}</td>
                              <td className="py-2">
                                <Link href={`/admin/livraria/vendas/${s.id}/recibo`} className="text-[#c62737] hover:underline">Ver recibo</Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}

            {data.mercadopago && (
              <>
                <h2 className="text-lg font-semibold text-slate-800 mb-3 mt-8">Mercado Pago</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
                  <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <div className="flex items-center gap-2 text-slate-600 mb-1">
                      <Smartphone size={18} />
                      <span className="text-sm font-medium">Vendas MP (período)</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-800">{data.mercadopago.vendas_count}</p>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <div className="flex items-center gap-2 text-slate-600 mb-1">
                      <DollarSign size={18} />
                      <span className="text-sm font-medium">Receita MP</span>
                    </div>
                    <p className="text-2xl font-bold text-green-600">R$ {data.mercadopago.receita.toFixed(2)}</p>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <div className="flex items-center gap-2 text-slate-600 mb-1">
                      <Clock size={18} />
                      <span className="text-sm font-medium">Pendentes MP</span>
                    </div>
                    <p className="text-2xl font-bold text-amber-600">{data.mercadopago.pendentes_count}</p>
                    <p className="text-xs text-slate-500">R$ {data.mercadopago.pendentes_valor.toFixed(2)}</p>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <div className="flex items-center gap-2 text-slate-600 mb-1">
                      <span className="text-sm font-medium">Taxa de aprovação</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-800">
                      {data.mercadopago.taxa_aprovacao != null ? `${data.mercadopago.taxa_aprovacao}%` : '—'}
                    </p>
                  </div>
                </div>
                {data.mercadopago.ultimas_transacoes.length > 0 && (
                  <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 mb-6">
                    <h3 className="font-semibold text-slate-800 mb-4 text-sm sm:text-base">Últimas transações Mercado Pago</h3>
                    <div className="overflow-x-auto -mx-2 sm:mx-0">
                      <table className="w-full text-sm">
                        <thead>
                          <tr>
                            <th className="text-left py-2">Data</th>
                            <th className="text-left py-2">Nº</th>
                            <th className="text-left py-2">Status</th>
                            <th className="text-right py-2">Valor</th>
                            <th className="text-left py-2">Ação</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.mercadopago.ultimas_transacoes.map((t) => (
                            <tr key={t.sale_id + t.created_at} className="border-t border-slate-100">
                              <td className="py-2">{new Date(t.created_at).toLocaleDateString('pt-BR')}</td>
                              <td className="py-2 font-mono">{t.sale_number}</td>
                              <td className="py-2">{t.status}</td>
                              <td className="py-2 text-right">R$ {t.amount.toFixed(2)}</td>
                              <td className="py-2">
                                <Link href={`/admin/livraria/vendas/${t.sale_id}/recibo`} className="text-[#c62737] hover:underline">
                                  Ver recibo
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                {data.mercadopago.pendentes_antigos.length > 0 && (
                  <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 mb-6">
                    <h3 className="font-semibold text-slate-800 mb-4 text-sm sm:text-base">Pendentes há mais de 15 minutos</h3>
                    <ul className="space-y-2 text-sm">
                      {data.mercadopago.pendentes_antigos.map((p) => (
                        <li key={p.sale_id} className="flex justify-between items-center border-b border-slate-100 pb-2">
                          <Link href={`/admin/livraria/vendas/${p.sale_id}/recibo`} className="text-slate-800 hover:text-[#c62737] font-mono">
                            {p.sale_number}
                          </Link>
                          <span className="text-amber-600">R$ {p.amount.toFixed(2)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}

            {data.fiado && (
              <>
                <h2 className="text-lg font-semibold text-slate-800 mb-3 mt-8">Fiado</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4">
                  <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <div className="flex items-center gap-2 text-slate-600 mb-1">
                      <CreditCard size={18} />
                      <span className="text-sm font-medium">Total pendente</span>
                    </div>
                    <p className="text-2xl font-bold text-amber-600">R$ {data.fiado.total_pendente.toFixed(2)}</p>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <div className="flex items-center gap-2 text-slate-600 mb-1">
                      <DollarSign size={18} />
                      <span className="text-sm font-medium">Recebido (30 dias)</span>
                    </div>
                    <p className="text-2xl font-bold text-emerald-600">R$ {data.fiado.recebido_30d.toFixed(2)}</p>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <div className="flex items-center gap-2 text-slate-600 mb-1">
                      <span className="text-sm font-medium">Vendas fiado (30 dias)</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-800">R$ {data.fiado.vendas_fiado_30d.toFixed(2)}</p>
                  </div>
                </div>
                {(data.fiado.top_devedores?.length ?? 0) > 0 && (
                  <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-slate-800 text-sm sm:text-base">Clientes com saldo pendente</h3>
                      <Link href="/admin/livraria/fiado" className="text-[#c62737] hover:underline text-sm">Ver todos</Link>
                    </div>
                    <ul className="space-y-2 text-sm">
                      {data.fiado.top_devedores.map((d) => (
                        <li key={d.customer_id} className="flex justify-between items-center border-b border-slate-100 pb-2">
                          <Link href={`/admin/livraria/clientes/${d.customer_id}`} className="text-slate-800 hover:text-[#c62737] flex items-center gap-1">
                            <User size={14} />
                            {d.name}
                          </Link>
                          <span className="font-medium text-amber-600">R$ {d.total_pendente.toFixed(2)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}

            <div className="grid gap-4 sm:gap-6 lg:grid-cols-2 mb-6 sm:mb-8">
              <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
                <h3 className="font-semibold text-slate-800 mb-4 text-sm sm:text-base">Movimentações por dia</h3>
                <div className="overflow-x-auto -mx-2 sm:mx-0">
                  <table className="w-full text-sm">
                    <thead><tr><th className="text-left py-2">Data</th><th className="text-right py-2">Entradas</th><th className="text-right py-2">Saídas</th></tr></thead>
                    <tbody>
                      {data.series.slice(-14).reverse().map((s) => (
                        <tr key={s.date} className="border-t border-slate-100">
                          <td className="py-2">{s.date}</td>
                          <td className="py-2 text-right text-green-600">{s.entradas}</td>
                          <td className="py-2 text-right">{s.saidas}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
                <h3 className="font-semibold text-slate-800 mb-4 text-sm sm:text-base">Top 10 mais movimentados</h3>
                {data.top_movements.length === 0 ? (
                  <p className="text-slate-500 text-sm">Nenhum dado</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {data.top_movements.map((m, i) => (
                      <li key={i} className="flex justify-between">
                        <span>{m.sku} — {m.name}</span>
                        <span className="font-medium">{m.quantity}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
              <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
                <h3 className="font-semibold text-slate-800 mb-4 text-sm sm:text-base">Estoque baixo</h3>
                {data.low_stock.length === 0 ? (
                  <p className="text-slate-500 text-sm">Nenhum</p>
                ) : (
                  <div className="overflow-x-auto -mx-2 sm:mx-0">
                    <table className="w-full text-sm">
                      <thead><tr><th className="text-left py-2">SKU</th><th className="text-left py-2">Nome</th><th className="text-right py-2">Atual</th><th className="text-right py-2">Mín.</th></tr></thead>
                      <tbody>
                        {data.low_stock.slice(0, 20).map((p, i) => (
                          <tr key={i} className="border-t border-slate-100">
                            <td className="py-2 font-mono">{p.sku}</td>
                            <td className="py-2">{p.name}</td>
                            <td className="py-2 text-right">{p.current_stock}</td>
                            <td className="py-2 text-right">{p.min_stock}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
                <h3 className="font-semibold text-slate-800 mb-4 text-sm sm:text-base">Top 10 perdas</h3>
                {data.top_losses.length === 0 ? (
                  <p className="text-slate-500 text-sm">Nenhum dado</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {data.top_losses.map((m, i) => (
                      <li key={i} className="flex justify-between">
                        <span>{m.sku} — {m.name}</span>
                        <span className="font-medium text-red-600">{m.quantity}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </>
        ) : (
          <p className="text-slate-500">Não foi possível carregar o dashboard.</p>
        )}
      </div>
    </PageAccessGuard>
  )
}
