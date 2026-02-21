'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { adminFetchJson } from '@/lib/admin-client'
import type { ReviewEvent, ReviewRegistrationEnriched } from '@/lib/consolidacao-types'
import { REVIEW_REG_STATUS_LABELS, REVIEW_REG_STATUS_COLORS } from '@/lib/consolidacao-types'
import { Loader2, RefreshCw, CheckCircle2, XCircle, Phone, BookOpen, Users, ExternalLink, Link2, ClipboardCheck, Edit2, ClipboardList } from 'lucide-react'
import { AdminPageHeader } from '@/app/admin/AdminPageHeader'
import { EditEventModal } from '../EditEventModal'
import Link from 'next/link'

const STATUS_ORDER = ['inscrito', 'concluiu', 'cancelado']

export default function RevisaoVidasEventPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id ?? ''
  const [event, setEvent] = useState<ReviewEvent | null>(null)
  const [regs, setRegs] = useState<ReviewRegistrationEnriched[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [copiedRegId, setCopiedRegId] = useState<string | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      adminFetchJson(`/api/admin/consolidacao/revisao/events/${id}`).then((d: any) => d.event),
      adminFetchJson(`/api/admin/consolidacao/revisao/registrations?event_id=${id}`).then((d: any) => d.registrations ?? []),
    ]).then(([ev, rs]) => {
      setEvent(ev)
      setRegs(rs)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [id])

  useEffect(() => { load() }, [load])

  async function updateStatus(regId: string, status: string) {
    setUpdating(regId)
    try {
      await adminFetchJson(`/api/admin/consolidacao/revisao/registrations/${regId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
      load()
    } catch (e) {
      console.error(e)
    } finally {
      setUpdating(null)
    }
  }

  async function remove(regId: string) {
    if (!confirm('Remover inscrição?')) return
    setUpdating(regId)
    try {
      await adminFetchJson(`/api/admin/consolidacao/revisao/registrations/${regId}`, { method: 'DELETE' })
      load()
    } catch (e) {
      console.error(e)
    } finally {
      setUpdating(null)
    }
  }

  function getPublicFormLink(token: string | null | undefined) {
    if (!token) return ''
    if (typeof window === 'undefined') return `/revisao-vidas/anamnese/${token}`
    return `${window.location.origin}/revisao-vidas/anamnese/${token}`
  }

  async function copyPublicFormLink(regId: string, token: string | null | undefined) {
    const link = getPublicFormLink(token)
    if (!link || typeof navigator?.clipboard?.writeText !== 'function') return
    await navigator.clipboard.writeText(link)
    setCopiedRegId(regId)
    setTimeout(() => setCopiedRegId((prev) => (prev === regId ? null : prev)), 1800)
  }

  const inscritos = regs.filter(r => r.status === 'inscrito').length
  const concluiu  = regs.filter(r => r.status === 'concluiu').length
  const cancelado  = regs.filter(r => r.status === 'cancelado').length

  return (
    <div className="p-6 md:p-8 space-y-6">
      <AdminPageHeader
        icon={BookOpen}
        title={event?.name ?? 'Revisão de Vidas'}
        subtitle={event?.start_date
          ? `${new Date(event.start_date).toLocaleDateString('pt-BR')}${
              event.end_date ? ` — ${new Date(event.end_date).toLocaleDateString('pt-BR')}` : ''
            }`
          : 'Carregando...'}
        backLink={{ href: '/admin/revisao-vidas', label: 'Revisão de Vidas' }}
        actions={
          <div className="flex items-center gap-2">
            {id && (
              <Link
                href={`/admin/revisao-vidas/${id}/anamneses`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:text-purple-600 hover:border-purple-200 hover:bg-purple-50 transition-all"
              >
                <ClipboardList className="w-4 h-4" />
                Anamneses
              </Link>
            )}
            <button
              onClick={() => setEditModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:text-purple-600 hover:border-purple-200 hover:bg-purple-50 transition-all disabled:opacity-50"
            >
              <Edit2 className="w-4 h-4" />
              Editar
            </button>
            <button
              onClick={load}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:text-purple-600 hover:border-purple-200 hover:bg-purple-50 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
          </div>
        }
      />

      {/* KPI mini-cards */}
      {!loading && regs.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Inscritos',  value: inscritos,  icon: Users,       color: 'text-blue-600',     bg: 'bg-blue-50'     },
            { label: 'Concluiu',   value: concluiu,   icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Cancelado',  value: cancelado,  icon: XCircle,      color: 'text-slate-400',   bg: 'bg-slate-50'   },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3 shadow-sm">
              <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <div>
                <p className={`text-2xl font-extrabold ${color}`}>{value}</p>
                <p className="text-xs text-slate-500 font-medium">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabela */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-700">
            {loading ? 'Carregando…' : `${regs.length} inscrição${regs.length !== 1 ? 'ões' : ''}`}
          </span>
          {event && (
            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
              event.active ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'bg-slate-100 text-slate-500'
            }`}>
              {event.active ? 'Ativo' : 'Encerrado'}
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400 gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Carregando inscrições…</span>
          </div>
        ) : regs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
              <Users className="w-6 h-6 opacity-50" />
            </div>
            <p className="text-sm font-medium text-slate-500">Nenhuma inscrição ainda</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-slate-400 text-[11px] uppercase tracking-wider">
                  <th className="px-5 py-3 text-left font-semibold">Pessoa</th>
                  <th className="px-5 py-3 text-left font-semibold">Líder</th>
                  <th className="px-5 py-3 text-left font-semibold">Anamnese</th>
                  <th className="px-5 py-3 text-center font-semibold">Status</th>
                  <th className="px-5 py-3 text-right font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {regs.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-slate-800">{r.person?.full_name ?? '—'}</div>
                      {r.person?.mobile_phone && (
                        <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                          <Phone className="w-3 h-3" />{r.person.mobile_phone}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-slate-500 text-sm">{r.leader?.full_name ?? <span className="text-slate-300">—</span>}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <a
                          href={getPublicFormLink(r.anamnese_token)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`inline-flex items-center gap-1 text-xs font-medium rounded-md px-2 py-1 border ${r.anamnese_token ? 'text-blue-700 border-blue-200 bg-blue-50 hover:bg-blue-100' : 'text-slate-400 border-slate-200 bg-slate-50 pointer-events-none'}`}
                          title="Abrir formulário externo"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Abrir
                        </a>
                        <button
                          onClick={() => copyPublicFormLink(r.id, r.anamnese_token)}
                          disabled={!r.anamnese_token}
                          className={`inline-flex items-center gap-1 text-xs font-medium rounded-md px-2 py-1 border ${r.anamnese_token ? 'text-slate-700 border-slate-200 bg-white hover:bg-slate-50' : 'text-slate-300 border-slate-200 bg-slate-50 cursor-not-allowed'}`}
                          title="Copiar link do formulário"
                        >
                          {copiedRegId === r.id ? <ClipboardCheck className="w-3.5 h-3.5 text-emerald-600" /> : <Link2 className="w-3.5 h-3.5" />}
                          {copiedRegId === r.id ? 'Copiado' : 'Copiar'}
                        </button>
                      </div>
                      {r.anamnese_completed_at && (
                        <p className="mt-1 text-[11px] text-emerald-700">Preenchida</p>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        REVIEW_REG_STATUS_COLORS[r.status] ?? 'bg-slate-100 text-slate-500'
                      }`}>
                        {REVIEW_REG_STATUS_LABELS[r.status] ?? r.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {updating === r.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                        ) : (
                          <>
                            {r.status !== 'concluiu' && (
                              <button
                                onClick={() => updateStatus(r.id, 'concluiu')}
                                title="Marcar como Concluiu"
                                className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => remove(r.id)}
                              title="Remover inscrição"
                              className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-50 transition-colors"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <EditEventModal
        isOpen={editModalOpen}
        eventId={id}
        eventData={event}
        onClose={() => setEditModalOpen(false)}
        onUpdated={load}
      />
    </div>
  )
}

