'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  UserCircle, Users, TrendingUp, UserPlus,
  ChevronRight, Search, Upload, Star,
} from 'lucide-react'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { adminFetchJson } from '@/lib/admin-client'
import { useAdminAccess } from '@/lib/admin-access-context'

type Stats = {
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
      <div>
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

export default function PessoasDashboard() {
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

  return (
    <PageAccessGuard pageKey="pessoas">
      <div className="bg-[#F0F0F3] min-h-full">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-6 space-y-5">

          {/* Hero */}
          <div
            className="rounded-2xl text-white px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden shadow-md"
            style={{ background: 'linear-gradient(130deg, #6d28d9 0%, #8b5cf6 55%, #a78bfa 100%)' }}
          >
            <span className="absolute -right-10 -top-12 w-52 h-52 rounded-full bg-white/[0.05] pointer-events-none" />
            <span className="absolute right-20 -bottom-14 w-40 h-40 rounded-full bg-white/[0.04] pointer-events-none" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-1">
                <UserCircle size={16} className="opacity-70" />
                <p className="text-sm text-white/60 font-medium">Módulo de Pessoas</p>
              </div>
              <h1 className="text-2xl font-extrabold leading-tight">Olá, {name}!</h1>
              <p className="text-sm text-white/60 mt-1">Gerencie membros, visitantes e o cadastro geral de pessoas.</p>
            </div>
            <div className="relative z-10 flex gap-3 flex-wrap shrink-0">
              {[
                { v: loading ? '…' : fmt(stats?.pessoas?.total), l: 'Total pessoas' },
                { v: loading ? '…' : fmt(stats?.pessoas?.novos_mes), l: 'Novos este mês' },
              ].map(({ v, l }) => (
                <div key={l} className="rounded-xl px-5 py-3 text-center border border-white/[0.14]" style={{ background: 'rgba(255,255,255,0.12)' }}>
                  <p className="text-2xl font-extrabold leading-none">{v}</p>
                  <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-white/55 mt-1.5">{l}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <StatCard icon={Users} label="Total de pessoas" value={fmt(stats?.pessoas?.total)} sub="na base de dados" color="#8b5cf6" loading={loading} />
            <StatCard icon={TrendingUp} label="Novos este mês" value={fmt(stats?.pessoas?.novos_mes)} sub="novas entradas" color="#10b981" loading={loading} />
            <StatCard icon={Star} label="Membros ativos" value="—" sub="confirmados" color="#f59e0b" loading={loading} />
          </div>

          {/* Ações */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-gray-400 mb-3">Ações rápidas</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <ActionCard
                href="/admin/pessoas"
                icon={Search}
                label="Buscar Pessoas"
                description="Pesquise membros e visitantes no cadastro geral"
                color="#8b5cf6"
              />
              <ActionCard
                href="/admin/pessoas/novo"
                icon={UserPlus}
                label="Nova Pessoa"
                description="Cadastre um novo membro ou visitante no sistema"
                color="#10b981"
              />
              <ActionCard
                href="/admin/pessoas"
                icon={Upload}
                label="Importar Planilha"
                description="Importe vários contatos de uma vez via Excel ou CSV"
                color="#3b82f6"
              />
            </div>
          </div>

        </div>
      </div>
    </PageAccessGuard>
  )
}
