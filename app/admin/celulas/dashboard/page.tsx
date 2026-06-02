'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { LayoutDashboard, RefreshCw, SlidersHorizontal, ChevronDown, Check } from 'lucide-react'
import { ModuleAccessLink } from '@/components/admin/ModuleAccessLink'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { adminFetchJson } from '@/lib/admin-client'
import { computeEliteCells } from '@/lib/cells-elite'
import { Button } from '@/components/ui/Button'
import { CelulasDashboard } from '@/components/celulas/CelulasDashboard'
import { CelulasDashboardFilterBar } from '@/components/celulas/CelulasDashboardFilterBar'
import { AdminPageHeader } from '@/app/admin/AdminPageHeader'

interface Church { id: string; name: string }
interface Arena  { id: string; name: string }
interface Team   { id: string; name: string; arena_id: string }

function localMonthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function getMonthOptions(count = 6) {
  const opts = []
  const now = new Date()
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = localMonthKey(d)
    const label = new Date(d.getFullYear(), d.getMonth(), 15)
      .toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    opts.push({ value, label })
  }
  return opts
}

function computeStats(activeCells: any[], allRels: any[], month: string) {
  const cellIds = new Set(activeCells.map((c: any) => c.id))
  const monthRels = allRels.filter((r: any) => r.reference_month === month && cellIds.has(r.cell_id))

  let totalAttRecords = 0
  let totalPresentGrid = 0
  let totalMembersPresent = 0
  let totalVisitorsInMeetings = 0

  monthRels.forEach((rel: any) => {
    const meetingVisitors = rel.visitors || []
    totalVisitorsInMeetings += meetingVisitors.length

    const att = rel.attendances || []
    att.forEach((a: any) => {
      totalAttRecords++
      if (a.status === 'V') {
        totalPresentGrid++
        const isVisitor = a.cell_person?.type === 'visitor'
        if (isVisitor) {
          totalVisitorsInMeetings++
        } else {
          totalMembersPresent++
        }
      }
    })
  })

  const avgAttendance = totalAttRecords > 0
    ? Math.round((totalPresentGrid / totalAttRecords) * 100) + '%'
    : '0%'

  const pdTotal = monthRels.reduce((acc: number, r: any) => acc + (r.pd_value || 0), 0)
  const pdPending = monthRels
    .filter((r: any) => r.pd_approval_status === 'pending')
    .reduce((acc: number, r: any) => acc + (r.pd_value || 0), 0)

  return {
    totalActive: activeCells.length,
    monthRealizations: monthRels.length,
    avgAttendance,
    totalVisitors: totalVisitorsInMeetings,
    totalPresent: totalMembersPresent,
    totalPresentGrid,
    totalMembersRegistered: totalAttRecords,
    pdTotal,
    pdPending,
    growth: '--',
  }
}

export default function CelulasDashboardPage() {
  // Raw data
  const [rawCells, setRawCells] = useState<any[]>([])
  const [allRealizations, setAllRealizations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Lookup data for filter bar
  const [churches, setChurches]   = useState<Church[]>([])
  const [arenas,   setArenas]     = useState<Arena[]>([])
  const [teams,    setTeams]      = useState<Team[]>([])
  const [lookupsLoading, setLookupsLoading] = useState(true)

  // Filter selections
  const [selectedChurchId, setSelectedChurchId] = useState<string | null>(null)
  const [selectedArenaId,  setSelectedArenaId]  = useState<string | null>(null)
  const [activeTeamIds,    setActiveTeamIds]     = useState<Set<string>>(new Set())

  // Month filter — lazy init evita hydration mismatch (servidor/cliente em fusos diferentes)
  const monthOptions = useMemo(() => getMonthOptions(6), [])
  const [selectedMonth, setSelectedMonth] = useState(() => localMonthKey(new Date()))
  const [filterOpen,    setFilterOpen]    = useState(false)
  const filterRef = useRef<HTMLDivElement>(null)

  // ── Close month dropdown on outside click ──────────────────────────────────
  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false)
    }
    if (filterOpen) document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [filterOpen])

  // ── Load churches on mount ─────────────────────────────────────────────────
  useEffect(() => {
    adminFetchJson<{ items: Church[] }>('/api/admin/consolidacao/churches')
      .then(({ items }) => {
        setChurches(items)
        const defaultChurch =
          items.find((c) => c.name.toLowerCase().includes('sara sede')) ?? items[0] ?? null
        if (defaultChurch) setSelectedChurchId(defaultChurch.id)
      })
      .catch(() => {})
      .finally(() => setLookupsLoading(false))
  }, [])

  // ── Load arenas when church changes ────────────────────────────────────────
  useEffect(() => {
    if (!selectedChurchId) { setArenas([]); setSelectedArenaId(null); setTeams([]); return }
    adminFetchJson<{ items: Arena[] }>(`/api/admin/consolidacao/arenas?church_id=${selectedChurchId}`)
      .then(({ items }) => {
        setArenas(items)
        setSelectedArenaId(items.length === 1 ? items[0].id : null)
        setTeams([])
        setActiveTeamIds(new Set())
      })
      .catch(() => { setArenas([]); setSelectedArenaId(null) })
  }, [selectedChurchId])

  // ── Load teams when arena changes ──────────────────────────────────────────
  useEffect(() => {
    if (!selectedArenaId) { setTeams([]); setActiveTeamIds(new Set()); return }
    adminFetchJson<{ items: Team[] }>('/api/admin/consolidacao/teams')
      .then(({ items }) => {
        setTeams(items.filter((t) => t.arena_id === selectedArenaId))
        setActiveTeamIds(new Set())
      })
      .catch(() => setTeams([]))
  }, [selectedArenaId])

  // ── Fetch raw cells + realizations ─────────────────────────────────────────
  async function loadData() {
    setLoading(true)
    try {
      const [cellsData, relsData] = await Promise.all([
        adminFetchJson<{ items: any[] }>('/api/admin/celulas?status=ativa'),
        adminFetchJson<{ items: any[] }>('/api/admin/celulas/realizacoes'),
      ]).catch(() => [{ items: [] }, { items: [] }])
      setRawCells(cellsData.items || [])
      setAllRealizations(relsData.items || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  // ── Apply filters to cells ─────────────────────────────────────────────────
  const filteredCells = useMemo(() => {
    let result = rawCells
    if (selectedChurchId) result = result.filter((c) => c.church_id === selectedChurchId)
    if (selectedArenaId)  result = result.filter((c) => c.arena_id  === selectedArenaId)
    if (activeTeamIds.size > 0) result = result.filter((c) => activeTeamIds.has(c.team_id))
    return result
  }, [rawCells, selectedChurchId, selectedArenaId, activeTeamIds])

  // ── Filter realizations to the visible cells ───────────────────────────────
  const filteredRealizations = useMemo(() => {
    if (filteredCells.length === rawCells.length) return allRealizations
    const ids = new Set(filteredCells.map((c) => c.id))
    return allRealizations.filter((r) => ids.has(r.cell_id))
  }, [allRealizations, filteredCells, rawCells.length])

  // ── Compute stats and elite IDs ────────────────────────────────────────────
  const stats = useMemo(
    () =>
      rawCells.length > 0 || allRealizations.length > 0
        ? computeStats(filteredCells, filteredRealizations, selectedMonth)
        : null,
    [filteredCells, filteredRealizations, selectedMonth, rawCells.length, allRealizations.length]
  )

  const eliteCellIds = useMemo(
    () => computeEliteCells({ monthKey: selectedMonth, realizations: filteredRealizations }),
    [filteredRealizations, selectedMonth]
  )

  // ── Team toggle ────────────────────────────────────────────────────────────
  function handleTeamToggle(id: string) {
    setActiveTeamIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <PageAccessGuard pageKey="celulas">
      <div className="p-6 md:p-8 space-y-4">
        <AdminPageHeader
          icon={LayoutDashboard}
          title="Dashboard de Células"
          subtitle="Indicadores estratégicos e cobertura territorial"
          backLink={{ href: '/admin/celulas', label: 'Células' }}
          actions={
            <div className="flex items-center gap-2">
              <ModuleAccessLink href="/admin/celulas/acesso" />

              {/* Month filter dropdown */}
              <div className="relative" ref={filterRef}>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => setFilterOpen((o) => !o)}
                >
                  <SlidersHorizontal size={16} />
                  Filtros
                  <ChevronDown size={14} className={`transition-transform ${filterOpen ? 'rotate-180' : ''}`} />
                </Button>

                {filterOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl border border-slate-200 shadow-lg z-50 overflow-hidden">
                    <div className="px-3 py-2.5 border-b border-slate-100">
                      <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Mês de referência</p>
                    </div>
                    <div className="py-1">
                      {monthOptions.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => { setSelectedMonth(opt.value); setFilterOpen(false) }}
                          className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors ${
                            selectedMonth === opt.value
                              ? 'bg-[#c62737]/5 text-[#c62737] font-semibold'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span className="capitalize">{opt.label}</span>
                          {selectedMonth === opt.value && <Check size={14} />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <Button onClick={loadData} variant="outline" className="gap-2">
                <RefreshCw size={16} />
                Atualizar Dados
              </Button>
            </div>
          }
        />

        {/* ── Filter bar ── */}
        <div className="bg-white rounded-2xl border border-slate-200 px-4 py-3 shadow-sm">
          <CelulasDashboardFilterBar
            churches={churches}
            arenas={arenas}
            teams={teams}
            selectedChurchId={selectedChurchId}
            selectedArenaId={selectedArenaId}
            activeTeamIds={activeTeamIds}
            onChurchChange={(id) => { setSelectedChurchId(id); setSelectedArenaId(null); setActiveTeamIds(new Set()) }}
            onArenaChange={(id) => { setSelectedArenaId(id); setActiveTeamIds(new Set()) }}
            onTeamToggle={handleTeamToggle}
            onClearTeams={() => setActiveTeamIds(new Set())}
            loading={lookupsLoading}
          />
        </div>

        {loading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-28 bg-slate-100 animate-pulse rounded-2xl border border-slate-200" />
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-48 bg-slate-100 animate-pulse rounded-2xl border border-slate-200" />
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 h-[540px] bg-slate-100 animate-pulse rounded-2xl border border-slate-200" />
              <div className="space-y-5">
                <div className="h-48 bg-slate-100 animate-pulse rounded-2xl border border-slate-200" />
                <div className="h-64 bg-slate-100 animate-pulse rounded-2xl border border-slate-200" />
              </div>
            </div>
          </div>
        ) : stats && (
          <CelulasDashboard
            stats={stats}
            cells={filteredCells}
            eliteCellIds={eliteCellIds}
            realizations={filteredRealizations}
            selectedMonth={selectedMonth}
          />
        )}
      </div>
    </PageAccessGuard>
  )
}
