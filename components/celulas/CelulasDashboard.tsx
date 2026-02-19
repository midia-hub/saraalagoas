'use client'

import React from 'react'
import { 
  UsersRound, 
  CalendarCheck, 
  UserCheck, 
  UserPlus, 
  DollarSign, 
  TrendingUp,
  MapPin,
  Trophy,
  Star,
  Activity,
  ArrowUpRight,
  Layers,
} from 'lucide-react'
import dynamic from 'next/dynamic'

const CelulasMap = dynamic(() => import('@/components/celulas/CelulasMap'), { 
  ssr: false,
  loading: () => (
    <div className="h-[500px] bg-slate-100 animate-pulse rounded-xl flex flex-col items-center justify-center gap-3 text-slate-400">
      <MapPin size={32} className="opacity-30" />
      <span className="text-sm font-medium">Carregando mapa...</span>
    </div>
  )
})

interface CelulasDashboardProps {
  stats: any
  cells: any[]
  eliteCellIds: Set<string>
  realizations: any[]
}

const RANK_MEDALS = ['🥇', '🥈', '🥉', '4°', '5°']

type StatCardProps = {
  label: string
  value: string | number
  icon: React.ElementType
  accent: string
  iconBg: string
  trend?: string
  sub?: string
}

function StatCard({ label, value, icon: Icon, accent, iconBg, trend, sub }: StatCardProps) {
  return (
    <div className={`bg-white rounded-2xl border ${accent} p-5 shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden`}>
      <div className="flex items-start justify-between">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
          <Icon size={22} />
        </div>
        {trend && trend !== '--' && (
          <span className="inline-flex items-center gap-0.5 text-emerald-600 bg-emerald-50 border border-emerald-100 text-[11px] font-bold px-2 py-0.5 rounded-full">
            <ArrowUpRight size={12} />
            {trend}
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
        <p className="text-3xl font-black text-slate-800 mt-0.5 tracking-tight">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      </div>
      {/* Decorative corner glow */}
      <div className="absolute -bottom-4 -right-4 w-20 h-20 rounded-full opacity-[0.06] bg-current" />
    </div>
  )
}

type RankingRowProps = {
  name: string
  value: string
  index: number
  barWidth: number
  barColor: string
}

function RankingRow({ name, value, index, barWidth, barColor }: RankingRowProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base leading-none w-6 text-center shrink-0">{RANK_MEDALS[index] ?? `${index + 1}°`}</span>
          <span className="text-sm font-semibold text-slate-700 truncate">{name}</span>
        </div>
        <span className={`text-sm font-black shrink-0 ${barColor}`}>{value}</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden ml-8">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor.replace('text-', 'bg-')}`}
          style={{ width: `${Math.max(4, barWidth)}%` }}
        />
      </div>
    </div>
  )
}

export function CelulasDashboard({ stats, cells, eliteCellIds, realizations }: CelulasDashboardProps) {
  const [showEliteOnly, setShowEliteOnly] = React.useState(false)
  const currentMonth = new Date().toISOString().slice(0, 7) + '-01'

  const filteredCells = showEliteOnly ? cells.filter((c) => eliteCellIds.has(c.id)) : cells

  const rankings = React.useMemo(() => {
    const byCell = new Map<string, { pdTotal: number; pdCount: number; visitors: number; present: number; total: number }>()

    for (const rel of realizations || []) {
      if (rel.reference_month !== currentMonth) continue
      const stat = byCell.get(rel.cell_id) || { pdTotal: 0, pdCount: 0, visitors: 0, present: 0, total: 0 }
      if (rel.pd_approval_status !== 'rejected') {
        stat.pdTotal += Number(rel.pd_value || 0)
        stat.pdCount += 1
      }
      stat.visitors += rel.visitors?.length || 0
      const att = rel.attendances || []
      stat.present += att.filter((a: any) => a.status === 'V').length
      stat.total += att.length
      byCell.set(rel.cell_id, stat)
    }

    const cellsById = new Map(cells.map((c) => [c.id, c]))
    const items = Array.from(byCell.entries()).map(([cellId, stat]) => {
      const avgPd = stat.pdCount ? stat.pdTotal / stat.pdCount : 0
      const avgPresence = stat.total ? stat.present / stat.total : 0
      return { cell: cellsById.get(cellId), avgPd, visitors: stat.visitors, avgPresence }
    })

    const topPd = [...items].sort((a, b) => b.avgPd - a.avgPd).slice(0, 5)
    const topVisitors = [...items].sort((a, b) => b.visitors - a.visitors).slice(0, 5)
    const topPresence = [...items].sort((a, b) => b.avgPresence - a.avgPresence).slice(0, 5)

    return { topPd, topVisitors, topPresence }
  }, [cells, realizations, currentMonth])

  const totalPeople = Number(stats.totalPresent || 0) + Number(stats.totalVisitors || 0)
  const membersPercent = totalPeople > 0 ? Math.round((stats.totalPresent / totalPeople) * 100) : 0
  const visitorsPercent = totalPeople > 0 ? Math.round((stats.totalVisitors / totalPeople) * 100) : 0
  const avgPresenceNum = parseInt(stats.avgAttendance) || 0
  const meetingsPerCell = stats.totalActive > 0 ? (stats.monthRealizations / stats.totalActive) : 0

  // Financial bar
  const pdConf = stats.pdTotal - stats.pdPending
  const pdTotal = stats.pdTotal || 1
  const confirmedPct = Math.round((pdConf / pdTotal) * 100)
  const pendingPct = 100 - confirmedPct

  const currentMonthLabel = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-8">

      {/* ── KPI Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Células Ativas"
          value={stats.totalActive}
          icon={UsersRound}
          accent="border-slate-200 hover:border-emerald-200"
          iconBg="bg-emerald-50 text-emerald-600"
          sub="na rede este mês"
        />
        <StatCard
          label="Realizações"
          value={stats.monthRealizations}
          icon={CalendarCheck}
          accent="border-slate-200 hover:border-blue-200"
          iconBg="bg-blue-50 text-blue-600"
          sub={currentMonthLabel}
        />
        <StatCard
          label="Média Presença"
          value={stats.avgAttendance}
          icon={UserCheck}
          accent="border-slate-200 hover:border-purple-200"
          iconBg="bg-purple-50 text-purple-600"
          trend={stats.attendanceGrowth}
          sub="nas reuniões do mês"
        />
        <StatCard
          label="Visitantes"
          value={stats.totalVisitors}
          icon={UserPlus}
          accent="border-slate-200 hover:border-amber-200"
          iconBg="bg-amber-50 text-amber-600"
          sub="novos contatos"
        />
      </div>

      {/* ── Visão Geral (3 cards métricas principais) ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

        {/* Visão Total de Pessoas */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm relative overflow-hidden">
          <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-[#c62737]/5" />
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Visão Total de Pessoas</p>
          <div className="flex items-baseline gap-1.5 mt-2">
            <span className="text-5xl font-black text-[#c62737] tracking-tight">{totalPeople}</span>
            <span className="text-sm font-semibold text-slate-400">participantes</span>
          </div>
          <p className="text-xs text-slate-400 mt-1 mb-5">Soma de membros + visitantes no mês</p>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-[11px] font-bold uppercase mb-1.5">
                <span className="text-slate-500">Membros</span>
                <span className="text-[#c62737]">{stats.totalPresent} · {membersPercent}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#c62737] rounded-full transition-all duration-700" style={{ width: `${membersPercent}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[11px] font-bold uppercase mb-1.5">
                <span className="text-slate-500">Visitantes</span>
                <span className="text-amber-500">{stats.totalVisitors} · {visitorsPercent}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-amber-400 rounded-full transition-all duration-700" style={{ width: `${visitorsPercent}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Taxa de Presença */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm relative overflow-hidden">
          <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-emerald-500/5" />
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Taxa de Aproveitamento</p>
          <div className="flex items-baseline gap-1.5 mt-2">
            <span className="text-5xl font-black text-emerald-600 tracking-tight">{stats.avgAttendance}</span>
          </div>
          <p className="text-xs text-slate-400 mt-1 mb-5">
            <span className="font-bold text-slate-600">{stats.totalPresentGrid || stats.totalPresent}</span> de <span className="font-bold text-slate-600">{stats.totalMembersRegistered}</span> chamadas presentes
          </p>

          {/* Progress ring visual */}
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 shrink-0">
              <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f1f5f9" strokeWidth="3.5" />
                <circle
                  cx="18" cy="18" r="15.9" fill="none"
                  stroke="#10b981"
                  strokeWidth="3.5"
                  strokeDasharray={`${avgPresenceNum} ${100 - avgPresenceNum}`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[11px] font-black text-emerald-700">{avgPresenceNum}%</span>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                <span className="text-slate-600">Presentes na grade</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-slate-200 inline-block" />
                <span className="text-slate-400">Ausentes</span>
              </div>
            </div>
          </div>
        </div>

        {/* Frequência da Rede */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm relative overflow-hidden">
          <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-blue-500/5" />
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Frequência da Rede</p>
          <div className="flex items-baseline gap-1.5 mt-2">
            <span className="text-5xl font-black text-blue-600 tracking-tight">{meetingsPerCell.toFixed(1)}</span>
            <span className="text-sm font-semibold text-slate-400">reuniões/célula</span>
          </div>
          <p className="text-xs text-slate-400 mt-1 mb-5">Média de reuniões por célula no mês</p>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
              <p className="text-xl font-black text-blue-700">{stats.totalActive}</p>
              <p className="text-[10px] font-bold uppercase text-blue-500/70 tracking-wide mt-0.5">Células</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
              <p className="text-xl font-black text-slate-700">{stats.monthRealizations}</p>
              <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wide mt-0.5">Relatórios</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Mapa + Painel Lateral ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Mapa */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#c62737]/10 flex items-center justify-center">
                <MapPin size={16} className="text-[#c62737]" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-800">Mapa de Cobertura</h2>
                <p className="text-[11px] text-slate-400">Heatmap · raio 100m por célula</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowEliteOnly((prev) => !prev)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                showEliteOnly
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-200'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              {showEliteOnly ? '★ Elite' : 'Todas'}
            </button>
          </div>
          <div className="h-[480px] relative">
            <CelulasMap cells={filteredCells} />
          </div>
        </div>

        {/* Painel Direito */}
        <div className="space-y-5">

          {/* Financeiro PD */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                <DollarSign size={16} className="text-amber-600" />
              </div>
              <h2 className="text-sm font-bold text-slate-800">Financeiro PD</h2>
            </div>

            <div className="mb-3">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Total Apurado</p>
              <p className="text-3xl font-black text-slate-800 mt-0.5 tracking-tight">
                R$ {stats.pdTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>

            {/* Barra confirmado vs pendente */}
            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden flex mb-2">
              <div className="h-full bg-emerald-500 transition-all duration-700" style={{ width: `${confirmedPct}%` }} />
              <div className="h-full bg-amber-400 transition-all duration-700" style={{ width: `${pendingPct}%` }} />
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shrink-0" />
                <span className="text-slate-500">Confirmado</span>
                <span className="font-bold text-emerald-700 ml-auto">{confirmedPct}%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block shrink-0" />
                <span className="text-slate-500">Pendente</span>
                <span className="font-bold text-amber-700 ml-auto">{pendingPct}%</span>
              </div>
            </div>

            <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-100">
              <p className="text-[10px] font-black text-amber-600 uppercase tracking-wide">Aguardando confirmação</p>
              <p className="text-lg font-black text-amber-700 mt-0.5">
                R$ {stats.pdPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Rankings */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-lg bg-[#c62737]/10 flex items-center justify-center">
                <Trophy size={16} className="text-[#c62737]" />
              </div>
              <h2 className="text-sm font-bold text-slate-800">Rankings do Mês</h2>
            </div>

            <div className="space-y-6">
              {/* Top PD */}
              <div>
                <div className="flex items-center gap-1.5 mb-3">
                  <DollarSign size={13} className="text-emerald-600" />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Top PD Médio</p>
                </div>
                <div className="space-y-2.5">
                  {rankings.topPd.length === 0 && <p className="text-xs text-slate-400 italic">Sem dados</p>}
                  {rankings.topPd.map((item, idx) => {
                    const maxPd = rankings.topPd[0]?.avgPd || 1
                    return (
                      <RankingRow
                        key={`pd-${idx}`}
                        name={item.cell?.name || '—'}
                        value={`R$ ${item.avgPd.toFixed(0)}`}
                        index={idx}
                        barWidth={(item.avgPd / maxPd) * 100}
                        barColor="text-emerald-600"
                      />
                    )
                  })}
                </div>
              </div>

              <div className="border-t border-slate-100" />

              {/* Top Visitantes */}
              <div>
                <div className="flex items-center gap-1.5 mb-3">
                  <UserPlus size={13} className="text-blue-600" />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Top Visitantes</p>
                </div>
                <div className="space-y-2.5">
                  {rankings.topVisitors.length === 0 && <p className="text-xs text-slate-400 italic">Sem dados</p>}
                  {rankings.topVisitors.map((item, idx) => {
                    const maxV = rankings.topVisitors[0]?.visitors || 1
                    return (
                      <RankingRow
                        key={`vis-${idx}`}
                        name={item.cell?.name || '—'}
                        value={String(item.visitors)}
                        index={idx}
                        barWidth={(item.visitors / maxV) * 100}
                        barColor="text-blue-600"
                      />
                    )
                  })}
                </div>
              </div>

              <div className="border-t border-slate-100" />

              {/* Top Presença */}
              <div>
                <div className="flex items-center gap-1.5 mb-3">
                  <Activity size={13} className="text-purple-600" />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Top Presença</p>
                </div>
                <div className="space-y-2.5">
                  {rankings.topPresence.length === 0 && <p className="text-xs text-slate-400 italic">Sem dados</p>}
                  {rankings.topPresence.map((item, idx) => (
                    <RankingRow
                      key={`pres-${idx}`}
                      name={item.cell?.name || '—'}
                      value={`${(item.avgPresence * 100).toFixed(0)}%`}
                      index={idx}
                      barWidth={item.avgPresence * 100}
                      barColor="text-purple-600"
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Destaque Crescimento */}
          <div className="relative bg-[#c62737] rounded-2xl p-5 text-white shadow-lg shadow-[#c62737]/25 overflow-hidden">
            <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/5" />
            <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-black/10" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <Layers size={16} className="text-white/70" />
                <p className="text-[11px] font-black uppercase tracking-widest text-white/70">Crescimento da Rede</p>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-5xl font-black tracking-tight leading-none">{stats.growth}</span>
                <TrendingUp size={22} className="mb-1 text-white/80" />
              </div>
              <p className="text-white/60 text-xs mt-2">Expansão nos últimos 3 meses</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
