'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  BarChart3, ArrowLeft, Package, TrendingDown, TrendingUp, AlertTriangle,
  ShoppingBag, DollarSign, CreditCard, User, Smartphone, Clock, Receipt,
  ArrowDownCircle, ArrowUpCircle, Banknote, ExternalLink,
} from 'lucide-react'
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

/** Formata data completa: dd/mm/aaaa */
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR')
}

/** Formata valor monetário */
function fmtMoney(v: number) {
  return `R$ ${Number(v).toFixed(2)}`
}

/** Badge de status do Mercado Pago */
function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase()
  if (s === 'approved' || s === 'aprovado')
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Aprovado</span>
  if (s === 'pending' || s === 'pendente')
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">Pendente</span>
  if (s === 'rejected' || s === 'recusado' || s === 'cancelled')
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">Recusado</span>
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">{status}</span>
}

/** Badge de forma de pagamento */
function PaymentBadge({ method }: { method: string | null }) {
  const m = (method ?? '').toLowerCase()
  if (m.includes('pix'))
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">PIX</span>
  if (m.includes('dinheiro') || m.includes('cash'))
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">Dinheiro</span>
  if (m.includes('crédito') || m.includes('credito') || m.includes('credit'))
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#c62737]/10 text-[#c62737] border border-[#c62737]/20">Crédito</span>
  if (m.includes('débito') || m.includes('debito') || m.includes('debit'))
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">Débito</span>
  if (m.includes('fiado'))
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200">Fiado</span>
  if (!method)
    return <span className="text-xs text-slate-400">—</span>
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">{method}</span>
}

/** Título de seção */
function SectionTitle({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 mb-4 mt-8 pb-3 border-b border-slate-100">
      <div className="w-7 h-7 rounded-lg bg-[#c62737]/10 flex items-center justify-center flex-shrink-0">
        <Icon size={14} className="text-[#c62737]" />
      </div>
      <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">{children}</h2>
    </div>
  )
}

/** Card KPI genérico */
function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  iconBg = 'bg-slate-100',
  iconColor = 'text-slate-500',
  valueColor = 'text-slate-800',
  borderColor = 'border-slate-200',
  className = '',
}: {
  icon: React.ElementType
  label: string
  value: React.ReactNode
  sub?: React.ReactNode
  iconBg?: string
  iconColor?: string
  valueColor?: string
  borderColor?: string
  className?: string
}) {
  return (
    <div className={`bg-white rounded-xl border ${borderColor} p-4 flex flex-col gap-3 ${className}`}>
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium text-slate-500 leading-tight">{label}</span>
        <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0`}>
          <Icon size={15} className={iconColor} />
        </div>
      </div>
      <div>
        <p className={`text-2xl font-bold leading-none ${valueColor}`}>{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-1.5">{sub}</p>}
      </div>
    </div>
  )
}

/** Skeleton de KPI card */
function KpiSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="h-3 bg-slate-200 rounded w-1/2" />
        <div className="w-8 h-8 rounded-lg bg-slate-200" />
      </div>
      <div className="h-7 bg-slate-200 rounded w-2/5" />
    </div>
  )
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
      <div className="min-h-screen bg-slate-50">

        {/* ── Hero header ─────────────────────────────────────── */}
        <div className="bg-gradient-to-br from-[#c62737] to-[#8b1a26] px-4 sm:px-6 md:px-8 pt-6 pb-10">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-3 mb-5">
              <Link
                href="/admin/livraria/produtos"
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors flex-shrink-0 touch-manipulation"
                aria-label="Voltar"
              >
                <ArrowLeft size={18} />
              </Link>
              <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
                <BarChart3 className="text-white" size={18} />
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-bold text-white leading-tight">Dashboard Livraria</h1>
                <p className="text-white/60 text-xs">Últimos 30 dias</p>
              </div>
            </div>

            {/* Nav rápida */}
            <div className="flex flex-wrap gap-2">
              {[
                { href: '/admin/livraria/produtos', label: 'Produtos' },
                { href: '/admin/livraria/vendas/historico', label: 'Histórico' },
                { href: '/admin/livraria/estoque', label: 'Estoque' },
                { href: '/admin/livraria/fiado', label: 'Fiado' },
                { href: '/admin/livraria/clientes', label: 'Clientes' },
              ].map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors touch-manipulation"
                >
                  {l.label}
                  <ExternalLink size={10} className="opacity-60" />
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* ── Conteúdo ────────────────────────────────────────── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 -mt-6 pb-12">

          {/* Loading skeleton */}
          {loading && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
                {Array.from({ length: 5 }).map((_, i) => <KpiSkeleton key={i} />)}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                {Array.from({ length: 3 }).map((_, i) => <KpiSkeleton key={i} />)}
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse h-48" />
                ))}
              </div>
            </>
          )}

          {/* Conteúdo */}
          {!loading && data && (
            <>
              {/* ── KPIs Estoque ─── */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
                <KpiCard
                  icon={Package}
                  label="Produtos ativos"
                  value={data.cards.total_products}
                  iconBg="bg-slate-100"
                  iconColor="text-slate-600"
                />
                <KpiCard
                  icon={AlertTriangle}
                  label="Estoque baixo"
                  value={data.cards.low_stock_count}
                  iconBg="bg-amber-100"
                  iconColor="text-amber-600"
                  valueColor="text-amber-600"
                  borderColor="border-amber-200"
                />
                <KpiCard
                  icon={ArrowDownCircle}
                  label="Entradas 30d"
                  value={data.cards.total_entries_30d}
                  iconBg="bg-emerald-100"
                  iconColor="text-emerald-600"
                  valueColor="text-emerald-600"
                />
                <KpiCard
                  icon={ArrowUpCircle}
                  label="Saídas 30d"
                  value={data.cards.total_exits_30d}
                  iconBg="bg-slate-100"
                  iconColor="text-slate-600"
                />
                <KpiCard
                  icon={TrendingDown}
                  label="Perdas 30d"
                  value={data.cards.losses_30d}
                  iconBg="bg-red-100"
                  iconColor="text-red-500"
                  valueColor="text-red-600"
                  borderColor="border-red-200"
                  className="col-span-2 sm:col-span-1"
                />
              </div>

              {/* ── Vendas ────────────────────────────── */}
              {typeof data.cards.sales_count === 'number' && (
                <>
                  <SectionTitle icon={ShoppingBag}>Vendas</SectionTitle>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                    <KpiCard
                      icon={ShoppingBag}
                      label="Vendas no período"
                      value={data.cards.sales_count}
                      iconBg="bg-slate-100"
                      iconColor="text-slate-600"
                    />
                    <KpiCard
                      icon={DollarSign}
                      label="Receita total"
                      value={fmtMoney(data.cards.sales_revenue ?? 0)}
                      iconBg="bg-emerald-100"
                      iconColor="text-emerald-600"
                      valueColor="text-emerald-600"
                      borderColor="border-emerald-200"
                    />
                    <KpiCard
                      icon={Receipt}
                      label="Ticket médio"
                      value={fmtMoney(data.cards.sales_avg_ticket ?? 0)}
                      iconBg="bg-[#c62737]/10"
                      iconColor="text-[#c62737]"
                      className="col-span-2 sm:col-span-1"
                    />
                  </div>

                  {/* Forma de pagamento */}
                  {data.sales_by_payment && Object.keys(data.sales_by_payment).length > 0 && (() => {
                    const total = Object.values(data.sales_by_payment).reduce((a, b) => a + b, 0)
                    return (
                      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 mb-4">
                        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Por forma de pagamento</h3>
                        <div className="space-y-3">
                          {Object.entries(data.sales_by_payment)
                            .sort(([, a], [, b]) => b - a)
                            .map(([method, value]) => {
                              const pct = total > 0 ? Math.round((value / total) * 100) : 0
                              return (
                                <div key={method}>
                                  <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                      <PaymentBadge method={method} />
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-slate-400">{pct}%</span>
                                      <span className="text-sm font-semibold text-slate-800">{fmtMoney(Number(value))}</span>
                                    </div>
                                  </div>
                                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                      className="h-full rounded-full bg-[#c62737]/60 transition-all"
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                </div>
                              )
                            })}
                        </div>
                      </div>
                    )
                  })()}

                  {/* Últimas vendas */}
                  {data.last_sales && data.last_sales.length > 0 && (
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-4">
                      <div className="px-4 sm:px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Últimas vendas</h3>
                        <Link href="/admin/livraria/vendas/historico" className="text-xs font-medium text-[#c62737] hover:underline flex items-center gap-1">
                          Ver histórico <ExternalLink size={10} />
                        </Link>
                      </div>

                      {/* Mobile: card list */}
                      <div className="sm:hidden divide-y divide-slate-100">
                        {data.last_sales.map((s) => (
                          <div key={s.id} className="p-4">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="min-w-0">
                                <p className="font-mono text-[10px] text-slate-400 mb-0.5">{s.sale_number}</p>
                                <p className="text-sm font-semibold text-slate-800 truncate">{s.customer_name ?? '—'}</p>
                              </div>
                              <p className="text-sm font-bold text-slate-800 flex-shrink-0">{fmtMoney(s.total_amount)}</p>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-400">{fmtDate(s.created_at)}</span>
                                <PaymentBadge method={s.payment_method} />
                              </div>
                              <Link href={`/admin/livraria/vendas/${s.id}/recibo`} className="text-xs font-medium text-[#c62737] hover:underline">
                                Recibo
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Desktop: tabela */}
                      <div className="hidden sm:block">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                              <th className="text-left py-2.5 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Data</th>
                              <th className="text-left py-2.5 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Nº</th>
                              <th className="text-left py-2.5 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Cliente</th>
                              <th className="text-left py-2.5 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Pagamento</th>
                              <th className="text-right py-2.5 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Total</th>
                              <th className="py-2.5 px-4" />
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {data.last_sales.map((s) => (
                              <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                                <td className="py-3 px-4 text-slate-500 text-xs">{fmtDate(s.created_at)}</td>
                                <td className="py-3 px-4 font-mono text-xs text-slate-600">{s.sale_number}</td>
                                <td className="py-3 px-4 text-slate-800 font-medium max-w-[160px] truncate">{s.customer_name ?? '—'}</td>
                                <td className="py-3 px-4"><PaymentBadge method={s.payment_method} /></td>
                                <td className="py-3 px-4 text-right font-semibold text-slate-800">{fmtMoney(s.total_amount)}</td>
                                <td className="py-3 px-4">
                                  <Link href={`/admin/livraria/vendas/${s.id}/recibo`} className="text-xs font-medium text-[#c62737] hover:underline whitespace-nowrap">Recibo</Link>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Vendas por dia */}
                  {data.sales_series && data.sales_series.length > 0 && (
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-4">
                      <div className="px-4 sm:px-5 py-3 border-b border-slate-100 bg-slate-50/60">
                        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Vendas por dia</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="border-b border-slate-100">
                            <tr>
                              <th className="text-left py-2.5 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Data</th>
                              <th className="text-right py-2.5 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Vendas</th>
                              <th className="text-right py-2.5 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Receita</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {data.sales_series.slice(-14).reverse().map((s) => (
                              <tr key={s.date} className="hover:bg-slate-50/60 transition-colors">
                                <td className="py-2.5 px-4 text-slate-500 text-xs">{s.date}</td>
                                <td className="py-2.5 px-4 text-right text-slate-700">{s.vendas}</td>
                                <td className="py-2.5 px-4 text-right font-semibold text-emerald-600">{fmtMoney(s.receita)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ── Mercado Pago ──────────────────────── */}
              {data.mercadopago && (
                <>
                  <SectionTitle icon={Smartphone}>Mercado Pago</SectionTitle>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    <KpiCard
                      icon={Smartphone}
                      label="Vendas MP"
                      value={data.mercadopago.vendas_count}
                      iconBg="bg-slate-100"
                      iconColor="text-slate-600"
                    />
                    <KpiCard
                      icon={DollarSign}
                      label="Receita MP"
                      value={fmtMoney(data.mercadopago.receita)}
                      iconBg="bg-emerald-100"
                      iconColor="text-emerald-600"
                      valueColor="text-emerald-600"
                      borderColor="border-emerald-200"
                    />
                    <KpiCard
                      icon={Clock}
                      label="Pendentes"
                      value={data.mercadopago.pendentes_count}
                      sub={fmtMoney(data.mercadopago.pendentes_valor)}
                      iconBg="bg-amber-100"
                      iconColor="text-amber-600"
                      valueColor="text-amber-600"
                      borderColor="border-amber-200"
                    />
                    <KpiCard
                      icon={TrendingUp}
                      label="Taxa aprovação"
                      value={data.mercadopago.taxa_aprovacao != null ? `${data.mercadopago.taxa_aprovacao}%` : '—'}
                      iconBg="bg-[#c62737]/10"
                      iconColor="text-[#c62737]"
                    />
                  </div>

                  {/* Últimas transações */}
                  {data.mercadopago.ultimas_transacoes.length > 0 && (
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-4">
                      <div className="px-4 sm:px-5 py-3 border-b border-slate-100 bg-slate-50/60">
                        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Últimas transações</h3>
                      </div>

                      {/* Mobile */}
                      <div className="sm:hidden divide-y divide-slate-100">
                        {data.mercadopago.ultimas_transacoes.map((t) => (
                          <div key={t.sale_id + t.created_at} className="p-4">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="min-w-0">
                                <p className="font-mono text-[10px] text-slate-400 mb-1">{t.sale_number}</p>
                                <StatusBadge status={t.status} />
                              </div>
                              <p className="text-sm font-bold text-slate-800 flex-shrink-0">{fmtMoney(t.amount)}</p>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-slate-400">{fmtDate(t.created_at)}</span>
                              <Link href={`/admin/livraria/vendas/${t.sale_id}/recibo`} className="text-xs font-medium text-[#c62737] hover:underline">Recibo</Link>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Desktop */}
                      <div className="hidden sm:block">
                        <table className="w-full text-sm">
                          <thead className="border-b border-slate-100">
                            <tr>
                              <th className="text-left py-2.5 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Data</th>
                              <th className="text-left py-2.5 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Nº</th>
                              <th className="text-left py-2.5 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                              <th className="text-right py-2.5 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Valor</th>
                              <th className="py-2.5 px-4" />
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {data.mercadopago.ultimas_transacoes.map((t) => (
                              <tr key={t.sale_id + t.created_at} className="hover:bg-slate-50/60 transition-colors">
                                <td className="py-3 px-4 text-slate-500 text-xs">{fmtDate(t.created_at)}</td>
                                <td className="py-3 px-4 font-mono text-xs text-slate-600">{t.sale_number}</td>
                                <td className="py-3 px-4"><StatusBadge status={t.status} /></td>
                                <td className="py-3 px-4 text-right font-semibold text-slate-800">{fmtMoney(t.amount)}</td>
                                <td className="py-3 px-4">
                                  <Link href={`/admin/livraria/vendas/${t.sale_id}/recibo`} className="text-xs font-medium text-[#c62737] hover:underline">Recibo</Link>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Pendentes antigos */}
                  {data.mercadopago.pendentes_antigos.length > 0 && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 sm:p-5 mb-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                          <Clock size={14} className="text-amber-600" />
                        </div>
                        <h3 className="text-sm font-semibold text-amber-800">Pendentes há mais de 15 min</h3>
                      </div>
                      <ul className="space-y-2">
                        {data.mercadopago.pendentes_antigos.map((p) => (
                          <li key={p.sale_id} className="flex justify-between items-center bg-white rounded-xl px-4 py-2.5 border border-amber-100 shadow-sm">
                            <Link href={`/admin/livraria/vendas/${p.sale_id}/recibo`} className="text-sm font-mono text-slate-700 hover:text-[#c62737] font-semibold">
                              {p.sale_number}
                            </Link>
                            <span className="text-sm font-bold text-amber-700">{fmtMoney(p.amount)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}

              {/* ── Fiado ─────────────────────────────── */}
              {data.fiado && (
                <>
                  <SectionTitle icon={CreditCard}>Fiado</SectionTitle>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                    <KpiCard
                      icon={CreditCard}
                      label="Total pendente"
                      value={fmtMoney(data.fiado.total_pendente)}
                      iconBg="bg-amber-100"
                      iconColor="text-amber-600"
                      valueColor="text-amber-600"
                      borderColor="border-amber-200"
                    />
                    <KpiCard
                      icon={DollarSign}
                      label="Recebido 30d"
                      value={fmtMoney(data.fiado.recebido_30d)}
                      iconBg="bg-emerald-100"
                      iconColor="text-emerald-600"
                      valueColor="text-emerald-600"
                      borderColor="border-emerald-200"
                    />
                    <KpiCard
                      icon={Banknote}
                      label="Vendas fiado 30d"
                      value={fmtMoney(data.fiado.vendas_fiado_30d)}
                      iconBg="bg-slate-100"
                      iconColor="text-slate-600"
                      className="col-span-2 sm:col-span-1"
                    />
                  </div>

                  {(data.fiado.top_devedores?.length ?? 0) > 0 && (
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-4">
                      <div className="px-4 sm:px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Clientes com saldo pendente</h3>
                        <Link href="/admin/livraria/fiado" className="text-xs font-medium text-[#c62737] hover:underline flex items-center gap-1">
                          Ver todos <ExternalLink size={10} />
                        </Link>
                      </div>
                      <ul className="divide-y divide-slate-100">
                        {data.fiado.top_devedores.map((d) => (
                          <li key={d.customer_id} className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 hover:bg-slate-50/60 transition-colors">
                            <Link href={`/admin/livraria/clientes/${d.customer_id}`} className="flex items-center gap-3 text-sm text-slate-800 hover:text-[#c62737] min-w-0">
                              <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                                <User size={13} className="text-slate-500" />
                              </div>
                              <span className="truncate font-medium">{d.name}</span>
                            </Link>
                            <span className="text-sm font-bold text-amber-600 flex-shrink-0">{fmtMoney(d.total_pendente)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}

              {/* ── Movimentações ─────────────────────── */}
              <SectionTitle icon={BarChart3}>Movimentações de estoque</SectionTitle>
              <div className="grid gap-4 lg:grid-cols-2 mb-4">

                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="px-4 sm:px-5 py-3 border-b border-slate-100 bg-slate-50/60">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Por dia (últimos 14)</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b border-slate-100">
                        <tr>
                          <th className="text-left py-2.5 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Data</th>
                          <th className="text-right py-2.5 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Entradas</th>
                          <th className="text-right py-2.5 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Saídas</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {data.series.slice(-14).reverse().map((s) => (
                          <tr key={s.date} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-2.5 px-4 text-slate-500 text-xs">{s.date}</td>
                            <td className="py-2.5 px-4 text-right font-semibold text-emerald-600">{s.entradas}</td>
                            <td className="py-2.5 px-4 text-right text-slate-600">{s.saidas}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="px-4 sm:px-5 py-3 border-b border-slate-100 bg-slate-50/60">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Top 10 mais movimentados</h3>
                  </div>
                  {data.top_movements.length === 0 ? (
                    <div className="flex items-center justify-center py-10 text-slate-400">
                      <p className="text-sm">Nenhum dado</p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {data.top_movements.map((m, i) => (
                        <li key={i} className="flex items-center gap-3 px-4 sm:px-5 py-2.5">
                          <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-slate-400 font-mono leading-tight">{m.sku}</p>
                            <p className="text-sm text-slate-700 truncate">{m.name}</p>
                          </div>
                          <span className="text-sm font-bold text-slate-700 flex-shrink-0">{m.quantity}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* ── Estoque baixo + Perdas ─────────────── */}
              <div className="grid gap-4 lg:grid-cols-2">

                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="px-4 sm:px-5 py-3 border-b border-slate-100 flex items-center gap-2 bg-slate-50/60">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Estoque baixo</h3>
                    {data.low_stock.length > 0 && (
                      <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">{data.low_stock.length}</span>
                    )}
                  </div>
                  {data.low_stock.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                      <Package size={28} className="mb-2 opacity-30" />
                      <p className="text-sm">Estoque normalizado</p>
                    </div>
                  ) : (
                    <>
                      {/* Mobile */}
                      <div className="sm:hidden divide-y divide-slate-100">
                        {data.low_stock.slice(0, 20).map((p, i) => (
                          <div key={i} className="flex items-center gap-3 px-4 py-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] text-slate-400 font-mono">{p.sku}</p>
                              <p className="text-sm text-slate-800 truncate">{p.name}</p>
                              <div className="mt-1.5 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-amber-400"
                                  style={{ width: p.min_stock > 0 ? `${Math.min(100, (p.current_stock / p.min_stock) * 100)}%` : '0%' }}
                                />
                              </div>
                            </div>
                            <div className="flex-shrink-0 text-right">
                              <p className="text-lg font-bold text-amber-600 leading-none">{p.current_stock}</p>
                              <p className="text-[10px] text-slate-400">mín {p.min_stock}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      {/* Desktop */}
                      <div className="hidden sm:block">
                        <table className="w-full text-sm">
                          <thead className="border-b border-slate-100">
                            <tr>
                              <th className="text-left py-2.5 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">SKU</th>
                              <th className="text-left py-2.5 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Nome</th>
                              <th className="text-right py-2.5 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Atual</th>
                              <th className="text-right py-2.5 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Mín.</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {data.low_stock.slice(0, 20).map((p, i) => (
                              <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                                <td className="py-2.5 px-4 font-mono text-[10px] text-slate-500">{p.sku}</td>
                                <td className="py-2.5 px-4 text-slate-800 max-w-[200px] truncate">{p.name}</td>
                                <td className="py-2.5 px-4 text-right font-bold text-amber-600">{p.current_stock}</td>
                                <td className="py-2.5 px-4 text-right text-slate-400">{p.min_stock}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>

                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="px-4 sm:px-5 py-3 border-b border-slate-100 bg-slate-50/60">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Top 10 perdas</h3>
                  </div>
                  {data.top_losses.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                      <TrendingDown size={28} className="mb-2 opacity-30" />
                      <p className="text-sm">Nenhum dado</p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {data.top_losses.map((m, i) => (
                        <li key={i} className="flex items-center gap-3 px-4 sm:px-5 py-2.5">
                          <span className="w-5 h-5 rounded-full bg-red-50 text-red-400 text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-slate-400 font-mono leading-tight">{m.sku}</p>
                            <p className="text-sm text-slate-700 truncate">{m.name}</p>
                          </div>
                          <span className="text-sm font-bold text-red-500 flex-shrink-0">{m.quantity}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Erro */}
          {!loading && !data && (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                <BarChart3 size={28} className="opacity-40" />
              </div>
              <p className="text-sm font-medium text-slate-600">Não foi possível carregar o dashboard</p>
              <p className="text-xs mt-1">Tente recarregar a página</p>
            </div>
          )}
        </div>
      </div>
    </PageAccessGuard>
  )
}
