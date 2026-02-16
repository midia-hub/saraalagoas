'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { BarChart3, ArrowLeft, Package, TrendingDown, TrendingUp, AlertTriangle } from 'lucide-react'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { adminFetchJson } from '@/lib/admin-client'

type Dashboard = {
  cards: {
    total_products: number
    low_stock_count: number
    total_entries_30d: number
    total_exits_30d: number
    losses_30d: number
  }
  series: Array<{ date: string; entradas: number; saidas: number }>
  low_stock: Array<{ sku: string; name: string; current_stock: number; min_stock: number; sale_price?: number }>
  top_movements: Array<{ sku: string; name: string; quantity: number }>
  top_losses: Array<{ sku: string; name: string; quantity: number }>
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
