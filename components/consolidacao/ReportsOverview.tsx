'use client'

import { useEffect, useState } from 'react'
import { adminFetchJson } from '@/lib/admin-client'
import type { FollowupEnriched } from '@/lib/consolidacao-types'
import {
  Users, AlertTriangle, PhoneMissed, CalendarX, TrendingUp,
  BookOpen, CheckCircle2, ArrowRight, Activity,
  UserCheck, Home, Navigation, Layers, Network, UsersRound, X, SlidersHorizontal
} from 'lucide-react'

interface Props {
  churchId?: string
}

interface Arena  { id: string; name: string; church_id: string }
interface Team   { id: string; name: string; church_id: string; arena_id: string | null }
interface Cell   { id: string; name: string; church_id: string | null; arena_id: string | null; team_id: string | null }

function pct(part: number, total: number) {
  if (total === 0) return 0
  return Math.round((part / total) * 100)
}

function KpiCard({
  label, value, sub, icon: Icon, colorClass, badgeClass, trend,
}: {
  label: string
  value: number | string
  sub?: string
  icon: React.ElementType
  colorClass: string
  badgeClass: string
  trend?: { label: string; good: boolean }
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border bg-white shadow-sm p-5 flex flex-col gap-3`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${badgeClass}`}>
        <Icon className={`w-5 h-5 ${colorClass}`} />
      </div>
      <div>
        <p className={`text-3xl font-extrabold tracking-tight ${colorClass}`}>{value}</p>
        <p className="text-sm font-semibold text-slate-700 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
      {trend && (
        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full w-fit ${
          trend.good ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
        }`}>
          {trend.label}
        </span>
      )}
    </div>
  )
}

function FunnelStep({
  label, count, total, colorClass, bgClass, icon: Icon, isLast = false,
}: {
  label: string
  count: number
  total: number
  colorClass: string
  bgClass: string
  icon: React.ElementType
  isLast?: boolean
}) {
  const percent = pct(count, total)
  return (
    <div className="flex items-center gap-3 flex-1 min-w-0">
      <div className={`relative flex-1 rounded-xl border bg-white shadow-sm p-4 min-w-0`}>
        <div className={`w-8 h-8 rounded-lg ${bgClass} flex items-center justify-center mb-2`}>
          <Icon className={`w-4 h-4 ${colorClass}`} />
        </div>
        <p className={`text-2xl font-extrabold ${colorClass}`}>{count}</p>
        <p className="text-xs font-semibold text-slate-600 leading-tight mt-0.5">{label}</p>
        <div className="mt-2">
          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${bgClass.replace('bg-', 'bg-').replace('-50', '-400')}`}
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-400 mt-1 font-medium">{percent}% do total</p>
        </div>
      </div>
      {!isLast && (
        <ArrowRight className="w-4 h-4 text-slate-300 shrink-0" />
      )}
    </div>
  )
}

function AlertCard({
  label, value, total, sub, icon: Icon, colorClass, bgClass, borderClass,
}: {
  label: string
  value: number
  total: number
  sub: string
  icon: React.ElementType
  colorClass: string
  bgClass: string
  borderClass: string
}) {
  const percent = pct(value, total)
  return (
    <div className={`rounded-xl border ${borderClass} ${bgClass} p-4 flex items-start gap-3`}>
      <div className={`w-9 h-9 rounded-lg bg-white/70 flex items-center justify-center shrink-0`}>
        <Icon className={`w-4 h-4 ${colorClass}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm font-semibold ${colorClass}`}>{label}</p>
          <span className={`text-lg font-extrabold ${colorClass} shrink-0`}>{value}</span>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">{sub}</p>
        {total > 0 && (
          <div className="mt-2">
            <div className="h-1 rounded-full bg-white/60 overflow-hidden">
              <div
                className={`h-full rounded-full ${colorClass.replace('text-', 'bg-').replace('-600', '-400').replace('-700', '-400')}`}
                style={{ width: `${percent}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">{percent}% do total em acompanhamento</p>
          </div>
        )}
      </div>
    </div>
  )
}

export function ReportsOverview({ churchId }: Props) {
  const [followups, setFollowups] = useState<FollowupEnriched[]>([])
  const [arenas, setArenas] = useState<Arena[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [cells, setCells] = useState<Cell[]>([])
  const [loading, setLoading] = useState(true)
  const [breakdownTab, setBreakdownTab] = useState<'arena' | 'equipe' | 'celula'>('arena')
  // Filtros internos
  const [filterTeam, setFilterTeam] = useState('')
  const [filterCell, setFilterCell] = useState('')
  const [filterLeader, setFilterLeader] = useState('')

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (churchId) params.set('church_id', churchId)
    params.set('limit', '2000')
    Promise.all([
      adminFetchJson(`/api/admin/consolidacao/followups?${params}`).then((d: any) => d.followups ?? []),
      adminFetchJson('/api/admin/consolidacao/arenas').then((d: any) => d.items ?? []).catch(() => []),
      adminFetchJson('/api/admin/consolidacao/teams').then((d: any) => d.items ?? []).catch(() => []),
      adminFetchJson('/api/admin/consolidacao/cells').then((d: any) => d.items ?? []).catch(() => []),
    ])
      .then(([fups, ars, tms, cls]) => {
        setFollowups(fups)
        setArenas(ars)
        setTeams(tms)
        setCells(cls)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [churchId])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border p-5 animate-pulse h-32" />
          ))}
        </div>
        <div className="bg-white rounded-2xl border p-6 animate-pulse h-36" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border p-5 animate-pulse h-52" />
          <div className="bg-white rounded-2xl border p-5 animate-pulse h-52" />
        </div>
      </div>
    )
  }

  // Derivar líderes únicos do conjunto carregado
  const leaderOptions = Array.from(
    new Map(
      followups
        .filter(f => f.leader?.id)
        .map(f => [f.leader!.id, f.leader!.full_name])
    ).entries()
  ).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name))

  // Aplicar filtros client-side
  const cellMap0 = new Map(cells.map(c => [c.id, c]))
  const teamMap0 = new Map(teams.map(t => [t.id, t]))

  const filtered = followups.filter(f => {
    if (filterLeader && f.leader?.id !== filterLeader) return false
    const cellId = (f.conversion as any)?.cell_id as string | undefined
    if (filterCell && cellId !== filterCell) return false
    if (filterTeam) {
      const cell = cellId ? cellMap0.get(cellId) : null
      if (!cell || cell.team_id !== filterTeam) return false
    }
    return true
  })

  const hasFilter = !!(filterTeam || filterCell || filterLeader)

  const total = filtered.length
  const emAcomp = filtered.filter(f => f.status === 'em_acompanhamento')
  const comContato = filtered.filter(f => f.contacted)
  const comFonoVisita = filtered.filter(f => f.fono_visit_done)
  const comVisita = filtered.filter(f => f.visit_done)
  const direcionados = filtered.filter(f => f.status === 'direcionado_revisao')
  const inscritos = filtered.filter(f => f.status === 'inscrito_revisao')
  const concluidos = filtered.filter(f => f.status === 'concluiu_revisao')
  const encerrados = filtered.filter(f => f.status === 'encerrado')

  const semContato = filtered.filter(f => !f.contacted)
  const semVisita = filtered.filter(f => !f.visit_done)
  const baixaFreq = filtered.filter(f => (f.attendance_summary?.total_last30 ?? 0) < 2)

  const taxaContato = pct(comContato.length, total)
  const taxaVisita = pct(comVisita.length, total)
  const taxaConclusao = pct(concluidos.length, total)
  const ativos = total - encerrados.length

  // ----- Breakdown por Arena / Equipe / Célula -----
  // Mapeamentos: cell_id → cell, team_id → team, arena_id → arena
  const cellMap = new Map(cells.map(c => [c.id, c]))
  const teamMap = new Map(teams.map(t => [t.id, t]))
  const arenaMap = new Map(arenas.map(a => [a.id, a]))

  // Para cada followup temos cell_id na conversion; derivamos team e arena via cell
  type GroupStats = { total: number; concluidos: number; inscritos: number; semContato: number }
  const byArena  = new Map<string, GroupStats>()
  const byTeam   = new Map<string, GroupStats>()
  const byCell   = new Map<string, GroupStats>()
  let semCelula  = 0

  function inc(map: Map<string, GroupStats>, key: string, f: FollowupEnriched) {
    if (!map.has(key)) map.set(key, { total: 0, concluidos: 0, inscritos: 0, semContato: 0 })
    const s = map.get(key)!
    s.total++
    if (f.status === 'concluiu_revisao') s.concluidos++
    if (f.status === 'inscrito_revisao') s.inscritos++
    if (!f.contacted) s.semContato++
  }

  for (const f of filtered) {
    const cellId = (f.conversion as any)?.cell_id as string | null | undefined
    if (!cellId) { semCelula++; continue }
    const cell = cellMap.get(cellId)
    inc(byCell, cellId, f)
    if (cell?.team_id) {
      const team = teamMap.get(cell.team_id)
      inc(byTeam, cell.team_id, f)
      if (team?.arena_id) inc(byArena, team.arena_id, f)
    } else if (cell?.arena_id) {
      inc(byArena, cell.arena_id, f)
    }
  }

  const arenaRows = [...byArena.entries()]
    .map(([id, s]) => ({ name: arenaMap.get(id)?.name ?? id, ...s }))
    .sort((a, b) => b.total - a.total)

  const teamRows = [...byTeam.entries()]
    .map(([id, s]) => {
      const team = teamMap.get(id)
      const arenaName = team?.arena_id ? (arenaMap.get(team.arena_id)?.name ?? '—') : '—'
      return { name: team?.name ?? id, arenaName, ...s }
    })
    .sort((a, b) => b.total - a.total)

  const cellRows = [...byCell.entries()]
    .map(([id, s]) => {
      const cell = cellMap.get(id)
      const team  = cell?.team_id ? teamMap.get(cell.team_id) : null
      const arena = cell?.arena_id ? arenaMap.get(cell.arena_id) : (team?.arena_id ? arenaMap.get(team.arena_id) : null)
      return { name: cell?.name ?? id, teamName: team?.name ?? '—', arenaName: arena?.name ?? '—', ...s }
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 20)

  // Opções para os selects de filtro (filtradas pela congregação se aplicável)
  const teamOptions = teams.filter(t => !churchId || t.church_id === churchId)
  const cellOptions = cells.filter(c => {
    if (filterTeam && c.team_id !== filterTeam) return false
    if (churchId && c.church_id !== churchId) return false
    return true
  })

  return (
    <div className="space-y-6">

      {/* Filtros minimalistas */}
      {(teamOptions.length > 0 || cells.length > 0 || leaderOptions.length > 0) && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filtrar por
          </div>

          {/* Equipe */}
          {teamOptions.length > 0 && (
            <select
              value={filterTeam}
              onChange={e => { setFilterTeam(e.target.value); setFilterCell('') }}
              className={`h-8 rounded-full border text-xs font-medium px-3 pr-7 appearance-none cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-[#c62737]/20 ${
                filterTeam
                  ? 'border-[#c62737]/40 bg-[#c62737]/5 text-[#c62737]'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              <option value="">Equipe</option>
              {teamOptions.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          )}

          {/* Célula */}
          {cellOptions.length > 0 && (
            <select
              value={filterCell}
              onChange={e => setFilterCell(e.target.value)}
              className={`h-8 rounded-full border text-xs font-medium px-3 pr-7 appearance-none cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-[#c62737]/20 ${
                filterCell
                  ? 'border-[#c62737]/40 bg-[#c62737]/5 text-[#c62737]'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              <option value="">Célula</option>
              {cellOptions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}

          {/* Líder */}
          {leaderOptions.length > 0 && (
            <select
              value={filterLeader}
              onChange={e => setFilterLeader(e.target.value)}
              className={`h-8 rounded-full border text-xs font-medium px-3 pr-7 appearance-none cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-[#c62737]/20 ${
                filterLeader
                  ? 'border-[#c62737]/40 bg-[#c62737]/5 text-[#c62737]'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              <option value="">Líder</option>
              {leaderOptions.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          )}

          {hasFilter && (
            <button
              onClick={() => { setFilterTeam(''); setFilterCell(''); setFilterLeader('') }}
              className="h-8 inline-flex items-center gap-1 px-3 rounded-full border border-rose-200 bg-rose-50 text-xs font-semibold text-rose-600 hover:bg-rose-100 transition-colors"
            >
              <X className="w-3 h-3" /> Limpar
            </button>
          )}

          {hasFilter && (
            <span className="text-xs text-slate-400 ml-1">
              {total} de {followups.length} registro{followups.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}

      {/* KPIs principais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total de Registros"
          value={total}
          sub={`${ativos} ativos · ${encerrados.length} encerrados`}
          icon={Users}
          colorClass="text-slate-700"
          badgeClass="bg-slate-100"
        />
        <KpiCard
          label="Taxa de Contato"
          value={`${taxaContato}%`}
          sub={`${comContato.length} de ${total} contactados`}
          icon={UserCheck}
          colorClass="text-blue-600"
          badgeClass="bg-blue-50"
          trend={taxaContato >= 70
            ? { label: 'Boa cobertura', good: true }
            : { label: 'Atenção necessária', good: false }}
        />
        <KpiCard
          label="Taxa de Visita"
          value={`${taxaVisita}%`}
          sub={`${comVisita.length} de ${total} visitados`}
          icon={Home}
          colorClass="text-indigo-600"
          badgeClass="bg-indigo-50"
          trend={taxaVisita >= 50
            ? { label: 'Bom avanço', good: true }
            : { label: 'Precisa melhorar', good: false }}
        />
        <KpiCard
          label="Concluíram o RDV"
          value={`${taxaConclusao}%`}
          sub={`${concluidos.length} de ${total} concluíram`}
          icon={CheckCircle2}
          colorClass="text-emerald-600"
          badgeClass="bg-emerald-50"
          trend={taxaConclusao > 0
            ? { label: `${concluidos.length} pessoas`, good: true }
            : { label: 'Nenhuma conclusão', good: false }}
        />
      </div>

      {/* Funil do processo */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-7 h-7 rounded-lg bg-[#c62737]/10 flex items-center justify-center">
            <Activity className="w-4 h-4 text-[#c62737]" />
          </div>
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Funil de Consolidação</h2>
          <span className="ml-auto text-xs text-slate-400">{total} registro{total !== 1 ? 's' : ''} no total</span>
        </div>
        <div className="flex items-stretch gap-1 overflow-x-auto pb-2">
          <FunnelStep label="Em Acomp." count={emAcomp.length} total={total} icon={Users} colorClass="text-blue-600" bgClass="bg-blue-50" />
          <FunnelStep label="Com Contato" count={comContato.length} total={total} icon={UserCheck} colorClass="text-cyan-600" bgClass="bg-cyan-50" />
          <FunnelStep label="Fono Visita" count={comFonoVisita.length} total={total} icon={Activity} colorClass="text-violet-600" bgClass="bg-violet-50" />
          <FunnelStep label="Com Visita" count={comVisita.length} total={total} icon={Home} colorClass="text-indigo-600" bgClass="bg-indigo-50" />
          <FunnelStep label="Direcionados" count={direcionados.length} total={total} icon={Navigation} colorClass="text-amber-600" bgClass="bg-amber-50" />
          <FunnelStep label="Inscritos RDV" count={inscritos.length} total={total} icon={BookOpen} colorClass="text-purple-600" bgClass="bg-purple-50" />
          <FunnelStep label="Concluíram" count={concluidos.length} total={total} icon={CheckCircle2} colorClass="text-emerald-600" bgClass="bg-emerald-50" isLast />
        </div>
      </div>

      {/* Alertas + Revisão de Vidas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Alertas */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-rose-50 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
            </div>
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Pontos de Atenção</h2>
          </div>
          <div className="space-y-3">
            <AlertCard
              label="Sem Contato"
              value={semContato.length}
              total={total}
              sub="Nenhum contato foi registrado"
              icon={PhoneMissed}
              colorClass="text-orange-600"
              bgClass="bg-orange-50"
              borderClass="border-orange-200"
            />
            <AlertCard
              label="Sem Visita"
              value={semVisita.length}
              total={total}
              sub="Visita presencial ainda não realizada"
              icon={CalendarX}
              colorClass="text-rose-600"
              bgClass="bg-rose-50"
              borderClass="border-rose-200"
            />
            <AlertCard
              label="Baixa Frequência"
              value={baixaFreq.length}
              total={total}
              sub="Menos de 2 cultos nos últimos 30 dias"
              icon={TrendingUp}
              colorClass="text-yellow-700"
              bgClass="bg-yellow-50"
              borderClass="border-yellow-200"
            />
          </div>
        </div>

        {/* Revisão de Vidas */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-purple-600" />
            </div>
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Revisão de Vidas</h2>
          </div>
          <div className="space-y-3">
            {[
              {
                label: 'Direcionados',
                value: direcionados.length,
                sub: 'Encaminhados para participar do RDV',
                colorClass: 'text-amber-700',
                bgClass: 'bg-amber-50',
                borderClass: 'border-amber-200',
              },
              {
                label: 'Inscritos',
                value: inscritos.length,
                sub: 'Aguardando participar do evento',
                colorClass: 'text-purple-700',
                bgClass: 'bg-purple-50',
                borderClass: 'border-purple-200',
              },
              {
                label: 'Concluíram',
                value: concluidos.length,
                sub: 'Finalizaram o processo com sucesso',
                colorClass: 'text-emerald-700',
                bgClass: 'bg-emerald-50',
                borderClass: 'border-emerald-200',
              },
            ].map((item) => (
              <div
                key={item.label}
                className={`rounded-xl border ${item.borderClass} ${item.bgClass} p-4 flex items-center gap-4`}
              >
                <p className={`text-2xl font-extrabold ${item.colorClass} w-10 shrink-0`}>
                  {item.value}
                </p>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${item.colorClass}`}>{item.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{item.sub}</p>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-lg bg-white/70 ${item.colorClass}`}>
                  {pct(item.value, total)}%
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ---- Breakdown por Arena / Equipe / Célula ---- */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center">
              <Layers className="w-4 h-4 text-indigo-600" />
            </div>
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Breakdown</h2>
            {semCelula > 0 && (
              <span className="text-xs text-slate-400 font-medium ml-1">· {semCelula} sem célula vinculada</span>
            )}
          </div>
          <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-semibold">
            {([
              { key: 'arena',  label: 'Arena',  Icon: Network },
              { key: 'equipe', label: 'Equipe', Icon: UsersRound },
              { key: 'celula', label: 'Célula',  Icon: Users },
            ] as { key: 'arena' | 'equipe' | 'celula'; label: string; Icon: React.ElementType }[]).map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => setBreakdownTab(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors ${
                  breakdownTab === key
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-slate-500 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          {breakdownTab === 'arena' && (
            arenaRows.length === 0
              ? <p className="text-sm text-slate-400 text-center py-10">Nenhuma arena encontrada</p>
              : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50/60 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-100">
                      <th className="px-5 py-3 text-left font-semibold">Arena</th>
                      <th className="px-5 py-3 text-center font-semibold">Total</th>
                      <th className="px-5 py-3 text-center font-semibold">Sem Contato</th>
                      <th className="px-5 py-3 text-center font-semibold">Inscritos RDV</th>
                      <th className="px-5 py-3 text-center font-semibold">Concluíram</th>
                      <th className="px-5 py-3 text-right font-semibold">% Conclusão</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {arenaRows.map((row) => (
                      <tr key={row.name} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-indigo-400 shrink-0" />
                            <span className="font-semibold text-slate-800">{row.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-center font-bold text-slate-700">{row.total}</td>
                        <td className="px-5 py-3.5 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${row.semContato > 0 ? 'bg-orange-50 text-orange-600' : 'bg-emerald-50 text-emerald-600'}`}>{row.semContato}</span>
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-600">{row.inscritos}</span>
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600">{row.concluidos}</span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                              <div className="h-full rounded-full bg-emerald-400" style={{ width: `${pct(row.concluidos, row.total)}%` }} />
                            </div>
                            <span className="text-xs font-bold text-slate-500 w-8 text-right">{pct(row.concluidos, row.total)}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
          )}

          {breakdownTab === 'equipe' && (
            teamRows.length === 0
              ? <p className="text-sm text-slate-400 text-center py-10">Nenhuma equipe encontrada</p>
              : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50/60 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-100">
                      <th className="px-5 py-3 text-left font-semibold">Equipe</th>
                      <th className="px-5 py-3 text-left font-semibold">Arena</th>
                      <th className="px-5 py-3 text-center font-semibold">Total</th>
                      <th className="px-5 py-3 text-center font-semibold">Sem Contato</th>
                      <th className="px-5 py-3 text-center font-semibold">Inscritos RDV</th>
                      <th className="px-5 py-3 text-center font-semibold">Concluíram</th>
                      <th className="px-5 py-3 text-right font-semibold">% Conclusão</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {teamRows.map((row) => (
                      <tr key={row.name} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-violet-400 shrink-0" />
                            <span className="font-semibold text-slate-800">{row.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-medium">{row.arenaName}</span>
                        </td>
                        <td className="px-5 py-3.5 text-center font-bold text-slate-700">{row.total}</td>
                        <td className="px-5 py-3.5 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${row.semContato > 0 ? 'bg-orange-50 text-orange-600' : 'bg-emerald-50 text-emerald-600'}`}>{row.semContato}</span>
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-600">{row.inscritos}</span>
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600">{row.concluidos}</span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                              <div className="h-full rounded-full bg-emerald-400" style={{ width: `${pct(row.concluidos, row.total)}%` }} />
                            </div>
                            <span className="text-xs font-bold text-slate-500 w-8 text-right">{pct(row.concluidos, row.total)}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
          )}

          {breakdownTab === 'celula' && (
            cellRows.length === 0
              ? <p className="text-sm text-slate-400 text-center py-10">Nenhuma célula encontrada</p>
              : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50/60 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-100">
                      <th className="px-5 py-3 text-left font-semibold">Célula</th>
                      <th className="px-5 py-3 text-left font-semibold">Equipe</th>
                      <th className="px-5 py-3 text-left font-semibold">Arena</th>
                      <th className="px-5 py-3 text-center font-semibold">Total</th>
                      <th className="px-5 py-3 text-center font-semibold">Sem Contato</th>
                      <th className="px-5 py-3 text-center font-semibold">Inscritos RDV</th>
                      <th className="px-5 py-3 text-center font-semibold">Concluíram</th>
                      <th className="px-5 py-3 text-right font-semibold">% Conclusão</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cellRows.map((row) => (
                      <tr key={row.name} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />
                            <span className="font-semibold text-slate-800">{row.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-medium">{row.teamName}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-xs text-slate-400 font-medium">{row.arenaName}</span>
                        </td>
                        <td className="px-5 py-3.5 text-center font-bold text-slate-700">{row.total}</td>
                        <td className="px-5 py-3.5 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${row.semContato > 0 ? 'bg-orange-50 text-orange-600' : 'bg-emerald-50 text-emerald-600'}`}>{row.semContato}</span>
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-600">{row.inscritos}</span>
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600">{row.concluidos}</span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                              <div className="h-full rounded-full bg-emerald-400" style={{ width: `${pct(row.concluidos, row.total)}%` }} />
                            </div>
                            <span className="text-xs font-bold text-slate-500 w-8 text-right">{pct(row.concluidos, row.total)}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
          )}
        </div>
      </div>

    </div>
  )
}
