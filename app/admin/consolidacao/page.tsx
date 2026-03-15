'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Heart, UserPlus, ClipboardList, BookUser, BarChart3,
  MessageSquare, Building2, Trophy, UserCog, TrendingUp,
  AlertCircle, Users, ChevronRight, CheckCircle2,
} from 'lucide-react'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { adminFetchJson } from '@/lib/admin-client'
import { useAdminAccess } from '@/lib/admin-access-context'

type Stats = {
  consolidacao?: { conversoes_mes: number | null; acompanhamentos_pendentes: number | null }
  pessoas?: { total: number | null; novos_mes: number | null }
}

function fmt(n: number | null | undefined) {
  if (n == null) return '—'
  return n.toLocaleString('pt-BR')
}

function StatCard({
  icon: Icon, label, value, sub, color, loading,
}: {
  icon: React.ElementType; label: string; value: string; sub?: string
  color: string; loading?: boolean
}) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}18` }}>
        <Icon size={22} style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">{label}</p>
        <p className="text-2xl font-extrabold text-gray-900 leading-none">
          {loading ? <span className="inline-block w-10 h-6 bg-gray-100 rounded animate-pulse" /> : value}
        </p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
    </div>
  )
}

function ActionCard({
  href, icon: Icon, label, description, color,
}: {
  href: string; icon: React.ElementType; label: string; description: string; color: string
}) {
  return (
    <Link
      href={href}
      className="bg-white rounded-2xl p-5 border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all duration-200 group flex flex-col gap-3"
    >
      <div className="flex items-center justify-between">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}18` }}>
          <Icon size={18} style={{ color }} />
        </div>
        <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all" />
      </div>
      <div>
        <p className="text-sm font-bold text-gray-900">{label}</p>
        <p className="text-xs text-gray-400 mt-0.5 leading-snug">{description}</p>
      </div>
    </Link>
  )
}

export default function ConsolidacaoDashboard() {
  const access = useAdminAccess()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminFetchJson<Stats>('/api/admin/dashboard/stats')
      .then(d => setStats(d))
      .catch(() => setStats({}))
      .finally(() => setLoading(false))
  }, [])

  const name = access.profileName?.split(' ')[0] ?? 'Líder'
  const pendentes = stats?.consolidacao?.acompanhamentos_pendentes ?? 0

  return (
    <PageAccessGuard pageKey="consolidacao">
      <div className="bg-[#F0F0F3] min-h-full">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-6 space-y-5">

          {/* Hero */}
          <div
            className="rounded-2xl text-white px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden shadow-md"
            style={{ background: 'linear-gradient(130deg, #9E1C22 0%, #C4232A 55%, #D84048 100%)' }}
          >
            <span className="absolute -right-10 -top-12 w-52 h-52 rounded-full bg-white/[0.05] pointer-events-none" />
            <span className="absolute right-20 -bottom-14 w-40 h-40 rounded-full bg-white/[0.04] pointer-events-none" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-1">
                <Heart size={16} className="opacity-70" fill="white" />
                <p className="text-sm text-white/60 font-medium">Módulo de Consolidação</p>
              </div>
              <h1 className="text-2xl font-extrabold leading-tight">Olá, {name}!</h1>
              <p className="text-sm text-white/60 mt-1">Gerencie conversões, acompanhamentos e consolidação pastoral.</p>
            </div>
            <div className="relative z-10 flex gap-3 flex-wrap shrink-0">
              {[
                { v: loading ? '…' : fmt(stats?.consolidacao?.conversoes_mes), l: 'Conversões / mês' },
                { v: loading ? '…' : fmt(stats?.consolidacao?.acompanhamentos_pendentes), l: 'Pendentes' },
                { v: loading ? '…' : fmt(stats?.pessoas?.total), l: 'Total pessoas' },
              ].map(({ v, l }) => (
                <div key={l} className="rounded-xl px-5 py-3 text-center border border-white/[0.14]" style={{ background: 'rgba(255,255,255,0.12)' }}>
                  <p className="text-2xl font-extrabold leading-none">{v}</p>
                  <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-white/55 mt-1.5">{l}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Alerta de pendentes */}
          {!loading && pendentes > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-center gap-3">
              <AlertCircle size={20} className="text-amber-500 shrink-0" />
              <div>
                <p className="text-sm font-bold text-amber-800">
                  {pendentes} acompanhamento{pendentes !== 1 ? 's' : ''} pendente{pendentes !== 1 ? 's' : ''}
                </p>
                <p className="text-xs text-amber-600 mt-0.5">Verifique os convertidos aguardando acompanhamento pastoral.</p>
              </div>
              <Link href="/admin/consolidacao/acompanhamento" className="ml-auto text-xs font-bold text-amber-700 hover:text-amber-900 whitespace-nowrap flex items-center gap-1">
                Ver agora <ChevronRight size={14} />
              </Link>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard icon={UserPlus} label="Conversões / mês" value={fmt(stats?.consolidacao?.conversoes_mes)} color="#C4232A" loading={loading} />
            <StatCard icon={BookUser} label="Acomp. pendentes" value={fmt(stats?.consolidacao?.acompanhamentos_pendentes)} sub="aguardando pastoral" color="#f59e0b" loading={loading} />
            <StatCard icon={Users} label="Total cadastrado" value={fmt(stats?.pessoas?.total)} sub="pessoas na base" color="#3b82f6" loading={loading} />
            <StatCard icon={TrendingUp} label="Novos este mês" value={fmt(stats?.pessoas?.novos_mes)} sub="novas entradas" color="#10b981" loading={loading} />
          </div>

          {/* Ações rápidas */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-gray-400 mb-3">Ações rápidas</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <ActionCard href="/admin/consolidacao/conversoes" icon={UserPlus} label="Registrar Conversão" description="Cadastre um novo convertido" color="#C4232A" />
              <ActionCard href="/admin/consolidacao/lista" icon={ClipboardList} label="Convertidos" description="Lista de todos os convertidos" color="#3b82f6" />
              <ActionCard href="/admin/consolidacao/acompanhamento" icon={BookUser} label="Acompanhamento" description="Followup pastoral dos convertidos" color="#f59e0b" />
              <ActionCard href="/admin/consolidacao/relatorios" icon={BarChart3} label="Relatórios" description="Análise de conversões e dados" color="#10b981" />
            </div>
          </div>

          {/* Cadastros */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-gray-400 mb-3">Cadastros e configurações</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <ActionCard href="/admin/consolidacao/cadastros/mensagens-conversao" icon={MessageSquare} label="Mensagens" description="Templates de mensagens de conversão" color="#8b5cf6" />
              <ActionCard href="/admin/consolidacao/cadastros/igrejas" icon={Building2} label="Igrejas" description="Cadastro de congregações" color="#0ea5e9" />
              <ActionCard href="/admin/consolidacao/cadastros/arenas" icon={Trophy} label="Arenas" description="Locais de culto e eventos" color="#f97316" />
              <ActionCard href="/admin/consolidacao/cadastros/equipes" icon={UserCog} label="Equipes" description="Times de consolidação" color="#14b8a6" />
            </div>
          </div>

        </div>
      </div>
    </PageAccessGuard>
  )
}
