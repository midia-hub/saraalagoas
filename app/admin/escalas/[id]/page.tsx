'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import { Calendar, Loader2, CheckCircle2, XCircle, Users, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { AdminPageHeader } from '@/app/admin/AdminPageHeader'
import { adminFetchJson } from '@/lib/admin-client'

const POLL_INTERVAL_MS = 30_000 // atualiza a cada 30s automaticamente

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

type Slot = {
  id: string
  type: 'culto' | 'arena' | 'evento'
  label: string
  date: string
  time_of_day: string
  sort_order: number
  funcoes?: string[]
}

type Resposta = {
  person_id: string
  slot_id: string
  disponivel: boolean
  observacao: string | null
}

type Volunteer = {
  id: string
  full_name: string
}

type EscalaDetail = {
  id: string
  ministry: string
  month: number
  year: number
  label: string | null
  status: string
  church: { name: string } | null
}

type ApiPayload = {
  link: EscalaDetail
  slots: Slot[]
  byPerson: Record<string, Resposta[]>
  volunteers: Volunteer[]
}

const TYPE_BADGE: Record<string, string> = {
  culto: 'bg-blue-100 text-blue-700',
  arena: 'bg-purple-100 text-purple-700',
  evento: 'bg-amber-100 text-amber-700',
}

export default function EscalaRespostasPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id
  const [data, setData] = useState<ApiPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  /** Carrega dados. silent=true não exibe o spinner de loading inicial. */
  const load = useCallback(async (silent = false) => {
    if (!id) return
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const res = await adminFetchJson<ApiPayload>(`/api/admin/escalas/${id}/respostas`)
      setData(res)
      setLastUpdated(new Date())
      setError('')
    } catch (e) {
      // Em refresh silencioso, mantém dados anteriores e só mostra erro se for o primeiro load
      if (!silent) setError(e instanceof Error ? e.message : 'Erro ao carregar.')
    } finally {
      if (!silent) setLoading(false)
      else setRefreshing(false)
    }
  }, [id])

  // Carga inicial
  useEffect(() => { load(false) }, [load])

  // Polling automático a cada 30s enquanto a aba estiver visível
  useEffect(() => {
    if (!id) return
    pollRef.current = setInterval(() => {
      if (document.visibilityState === 'visible') load(true)
    }, POLL_INTERVAL_MS)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [id, load])

  if (loading) {
    return (
      <PageAccessGuard pageKey="escalas">
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 className="animate-spin text-[#c62737]" size={32} />
        </div>
      </PageAccessGuard>
    )
  }

  if (error) {
    return (
      <PageAccessGuard pageKey="escalas">
        <div className="p-8 text-center text-red-500">{error}</div>
      </PageAccessGuard>
    )
  }

  if (!data) return null

  const { link, slots } = data
  const volunteers = data.volunteers ?? []
  const byPerson = data.byPerson ?? {}
  const sortedSlots = [...slots].sort((a, b) => a.date.localeCompare(b.date) || a.time_of_day.localeCompare(b.time_of_day))

  // Heatmap: para cada voluntário × slot compute disponibilidade
  const getResp = (personId: string, slotId: string) => {
    const resps = byPerson[personId] ?? []
    const r = resps.find(x => x.slot_id === slotId)
    // Se não respondeu, assume disponível (padrão da plataforma pública)
    return r ? r.disponivel : null
  }

  // Contagem por slot (quantos confirmaram disponibilidade)
  const slotCount = (slotId: string) => {
    let total = 0
    for (const pid of Object.keys(byPerson)) {
      const resps = byPerson[pid] ?? []
      const r = resps.find(x => x.slot_id === slotId)
      if (r?.disponivel) total++
    }
    return total
  }

  const answeredCount = Object.keys(byPerson).length

  return (
    <PageAccessGuard pageKey="escalas">
      <div className="p-6 md:p-8">
        <AdminPageHeader
          icon={Calendar}
          title={`Respostas — ${link.ministry}`}
          subtitle={
            <div className="flex flex-wrap items-center gap-2">
              <span>{MONTHS[(link.month ?? 1) - 1]}/{link.year} · {link.church?.name ?? ''} {link.label ? `· ${link.label}` : ''}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                link.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
              }`}>
                {link.status === 'active' ? '● ABERTO' : '○ ENCERRADO'}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-blue-50 text-blue-600">
                {answeredCount} de {volunteers.length} responderam
              </span>
            </div>
          }
          backLink={{ href: '/admin/escalas', label: 'Voltar às escalas' }}
          actions={
            <div className="flex items-center gap-2">
              {lastUpdated && (
                <span className="text-[11px] text-slate-400 hidden sm:inline">
                  atualizado {lastUpdated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              )}
              <button
                onClick={() => load(true)}
                disabled={refreshing}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
                title="Atualizar respostas"
              >
                <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
                <span className="hidden sm:inline">Atualizar</span>
              </button>
              <Link
                href={`/admin/escalas/${id}/voluntarios`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                <Users size={15} /> Gerenciar voluntários
              </Link>
            </div>
          }
        />

        {volunteers.length === 0 ? (
          <div className="py-16 text-center text-slate-500 border border-dashed border-slate-300 rounded-xl">
            <Users className="mx-auto mb-3 text-slate-300" size={40} />
            Nenhum voluntário cadastrado neste ministério ainda.
          </div>
        ) : (
          <div className="overflow-x-auto mt-6 relative">
            {refreshing && (
              <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5 bg-white/90 border border-slate-200 rounded-lg px-2.5 py-1 shadow-sm text-xs text-slate-500">
                <Loader2 size={12} className="animate-spin" /> Atualizando...
              </div>
            )}
            <table className="min-w-full text-sm border border-slate-200 rounded-xl overflow-hidden">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 sticky left-0 bg-slate-50 min-w-[180px] border-b border-slate-200">
                    Voluntário
                  </th>
                  {sortedSlots.map(s => (
                    <th key={s.id} className="px-3 py-3 text-center font-medium text-slate-600 border-b border-slate-200 min-w-[100px]">
                      <div className={`mx-auto mb-1 inline-block text-xs px-2 py-0.5 rounded-full font-semibold ${TYPE_BADGE[s.type]}`}>{s.type}</div>
                      <div className="font-semibold text-slate-800 truncate max-w-[96px]">{s.label}</div>
                      <div className="text-xs text-slate-400">
                        {new Date(s.date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                      </div>
                      <div className="text-xs text-slate-400">{s.time_of_day}</div>
                      {s.funcoes && s.funcoes.length > 0 && (
                        <div className="flex flex-wrap justify-center gap-1 mt-1.5">
                          {s.funcoes.map(f => (
                            <span key={f} className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-600 font-semibold whitespace-nowrap">
                              {f}
                            </span>
                          ))}
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {volunteers.map((v, vi) => {
                  const hasAnswered = !!byPerson[v.id]?.length
                  return (
                    <tr key={v.id} className={vi % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                      <td className="px-4 py-3 font-medium text-slate-700 sticky left-0 bg-inherit border-b border-slate-100 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {v.full_name}
                          {!hasAnswered && (
                            <span className="text-xs text-slate-400 font-normal">(sem resposta)</span>
                          )}
                        </div>
                      </td>
                      {sortedSlots.map(s => {
                        const disp = getResp(v.id, s.id)
                        return (
                          <td key={s.id} className="px-3 py-3 text-center border-b border-slate-100">
                            {disp === null ? (
                              <span className="text-slate-300">—</span>
                            ) : disp ? (
                              <CheckCircle2 className="mx-auto text-emerald-500" size={18} />
                            ) : (
                              <XCircle className="mx-auto text-red-400" size={18} />
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
              {/* Linha de totais */}
              <tfoot className="bg-slate-100 border-t-2 border-slate-200">
                <tr>
                  <td className="px-4 py-3 text-sm font-semibold text-slate-700 sticky left-0 bg-slate-100">
                    Total Disponíveis
                  </td>
                  {sortedSlots.map(s => {
                    const count = slotCount(s.id)
                    return (
                      <td key={s.id} className="px-3 py-3 text-center text-sm font-semibold text-slate-700">
                        {count} de {volunteers.length}
                      </td>
                    )
                  })}
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </PageAccessGuard>
  )
}
