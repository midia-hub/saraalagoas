'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { adminFetchJson } from '@/lib/admin-client'
import { FollowupsTable } from '@/components/consolidacao/FollowupsTable'
import { FollowupDrawer } from '@/components/consolidacao/FollowupDrawer'
import { FollowupFilters } from '@/components/consolidacao/FollowupFilters'
import type { FollowupEnriched, ReviewEvent } from '@/lib/consolidacao-types'
import { AdminPageHeader } from '@/app/admin/AdminPageHeader'
import { Loader2, RefreshCw, BookUser, Users, CheckCircle2, Clock3, XCircle } from 'lucide-react'

const STATUS_CARDS = [
  { key: 'em_acompanhamento',    label: 'Em Acompanhamento', icon: Clock3,        color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-200' },
  { key: 'direcionado_revisao',  label: 'Direcionado',       icon: Users,         color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200' },
  { key: 'inscrito_revisao',     label: 'Inscrito no Revisão de Vidas',  icon: BookUser,      color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
  { key: 'concluiu_revisao',     label: 'Concluiu o Revisão de Vidas',  icon: CheckCircle2,  color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  { key: 'encerrado',            label: 'Encerrado',         icon: XCircle,       color: 'text-slate-500',  bg: 'bg-slate-50',  border: 'border-slate-200' },
]

export default function AcompanhamentoPage() {
  const [followups, setFollowups] = useState<FollowupEnriched[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<FollowupEnriched | null>(null)
  const [reviewEvents, setReviewEvents] = useState<ReviewEvent[]>([])

  // Filters
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [churchId, setChurchId] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [churches, setChurches] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    adminFetchJson('/api/admin/consolidacao/revisao/events?active=1')
      .then((d: any) => setReviewEvents(d.events ?? []))
      .catch(() => {})
    adminFetchJson('/api/admin/consolidacao/churches')
      .then((d: any) => {
        const churchList = d.churches ?? []
        setChurches(churchList)
        // Setar igleja padrão "Sara Sede Algoas"
        const saraSede = churchList.find((c: any) => c.name === 'Sara Sede Algoas')
        if (saraSede) {
          setChurchId(saraSede.id)
        }
      })
      .catch(() => {})
  }, [])

  const load = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (status) params.set('status', status)
    if (churchId) params.set('church_id', churchId)
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    adminFetchJson(`/api/admin/consolidacao/followups?${params}`)
      .then((d: any) => {
        setFollowups(d.followups ?? [])
        setTotal(d.total ?? 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [q, status, churchId, from, to])

  useEffect(() => { load() }, [load])

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const f of followups) {
      counts[f.status] = (counts[f.status] ?? 0) + 1
    }
    return counts
  }, [followups])

  return (
    <div className="p-6 md:p-8 space-y-6">
      <AdminPageHeader
        icon={BookUser}
        title="Acompanhamento"
        subtitle="Acompanhe cada convertido desde o primeiro contato até o Revisão de Vidas"
        backLink={{ href: '/admin/consolidacao/lista', label: 'Consolidação' }}
        actions={
          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:text-[#c62737] hover:border-[#c62737]/30 hover:bg-[#c62737]/5 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Atualizando...' : 'Atualizar'}
          </button>
        }
      />

      {/* Cards de resumo por status */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {STATUS_CARDS.map(({ key, label, icon: Icon, color, bg, border }) => (
          <button
            key={key}
            onClick={() => setStatus(status === key ? '' : key)}
            className={`flex flex-col gap-2 rounded-xl border p-4 text-left transition-all hover:shadow-sm ${status === key ? `${bg} ${border} ring-2 ring-inset ring-current ${color}` : 'bg-white border-slate-200 hover:border-slate-300'}`}
          >
            <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <div>
              <p className={`text-2xl font-bold ${color}`}>
                {loading ? '—' : (statusCounts[key] ?? 0)}
              </p>
              <p className="text-xs text-slate-500 leading-tight mt-0.5">{label}</p>
            </div>
          </button>
        ))}
      </div>

      <FollowupFilters
        q={q} onQChange={setQ}
        status={status} onStatusChange={setStatus}
        churchId={churchId} onChurchChange={setChurchId}
        from={from} onFromChange={setFrom}
        to={to} onToChange={setTo}
        churches={churches}
      />

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-700">
            {loading ? 'Carregando…' : `${total} registro${total !== 1 ? 's' : ''}`}
          </span>
          {!loading && status && (
            <button
              onClick={() => setStatus('')}
              className="text-xs text-[#c62737] hover:underline font-medium"
            >
              Limpar filtro de status
            </button>
          )}
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400 gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Carregando registros…</span>
          </div>
        ) : (
          <FollowupsTable items={followups} onOpenDrawer={setSelected} />
        )}
      </div>

      {selected && (
        <FollowupDrawer
          item={selected}
          reviewEvents={reviewEvents}
          onClose={() => setSelected(null)}
          onSaved={() => { setSelected(null); load() }}
        />
      )}
    </div>
  )
}
