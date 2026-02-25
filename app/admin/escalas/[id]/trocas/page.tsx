'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { ArrowLeftRight, Loader2, CheckCircle2, XCircle, Clock, Users } from 'lucide-react'
import Link from 'next/link'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { AdminPageHeader } from '@/app/admin/AdminPageHeader'
import { adminFetchJson } from '@/lib/admin-client'
import { Toast } from '@/components/Toast'

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

type TrocaRow = {
  id: string
  slot_id: string
  funcao: string
  status: 'pendente' | 'aprovada' | 'rejeitada' | 'cancelada'
  mensagem: string | null
  resposta: string | null
  criada_em: string
  respondida_em: string | null
  solicitante: { id: string; full_name: string } | null
  substituto: { id: string; full_name: string } | null
  slot: { label: string; date: string; type: string } | null
}

const STATUS_CONFIG = {
  pendente: { label: 'Pendente', cls: 'bg-amber-100 text-amber-700', icon: <Clock size={12} /> },
  aprovada: { label: 'Aprovada', cls: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle2 size={12} /> },
  rejeitada: { label: 'Rejeitada', cls: 'bg-red-100 text-red-600', icon: <XCircle size={12} /> },
  cancelada: { label: 'Cancelada', cls: 'bg-slate-100 text-slate-500', icon: <XCircle size={12} /> },
}

export default function EscalaTrocasPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id

  const [trocas, setTrocas] = useState<TrocaRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState<string | null>(null)
  const [rejectModalTroca, setRejectModalTroca] = useState<TrocaRow | null>(null)
  const [rejectResposta, setRejectResposta] = useState('')
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; message: string } | null>(null)
  const [filter, setFilter] = useState<'all' | 'pendente' | 'aprovada' | 'rejeitada'>('all')

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const res = await adminFetchJson<{ trocas: TrocaRow[] }>(`/api/admin/escalas/${id}/trocas`)
      setTrocas(res.trocas)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  async function responder(troca_id: string, status: 'aprovada' | 'rejeitada', resposta?: string) {
    setProcessing(troca_id)
    try {
      await adminFetchJson(`/api/admin/escalas/${id}/trocas`, {
        method: 'PUT',
        body: JSON.stringify({ troca_id, status, resposta }),
      })
      setToast({ type: 'ok', message: status === 'aprovada' ? 'Troca aprovada!' : 'Troca rejeitada.' })
      setRejectModalTroca(null)
      setRejectResposta('')
      await load()
    } catch {
      setToast({ type: 'err', message: 'Erro ao processar.' })
    } finally {
      setProcessing(null)
    }
  }

  const filtered = filter === 'all' ? trocas : trocas.filter(t => t.status === filter)
  const pendentes = trocas.filter(t => t.status === 'pendente').length

  return (
    <PageAccessGuard pageKey="escalas">
      <div className="p-6 md:p-8">
        <AdminPageHeader
          icon={ArrowLeftRight}
          title="Solicitações de Troca"
          subtitle="Voluntários podem pedir troca na página pública da escala"
          backLink={{ href: `/admin/escalas/${id}/voluntarios`, label: 'Voltar aos voluntários' }}
        />

        {/* Resumo */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {(['all', 'pendente', 'aprovada', 'rejeitada'] as const).map(f => {
            const count = f === 'all' ? trocas.length : trocas.filter(t => t.status === f).length
            const labels = { all: 'Total', pendente: 'Pendentes', aprovada: 'Aprovadas', rejeitada: 'Rejeitadas' }
            const colors = { all: 'text-slate-700', pendente: 'text-amber-600', aprovada: 'text-emerald-600', rejeitada: 'text-red-500' }
            const bgs = { all: 'bg-slate-50 border-slate-200', pendente: 'bg-amber-50 border-amber-100', aprovada: 'bg-emerald-50 border-emerald-100', rejeitada: 'bg-red-50 border-red-100' }
            return (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`${bgs[f]} border rounded-2xl p-4 text-left hover:opacity-80 transition-opacity ${filter === f ? 'ring-2 ring-offset-1' : ''}`}
              >
                <p className={`text-2xl font-bold ${colors[f]}`}>{count}</p>
                <p className="text-xs text-slate-500 font-medium mt-1">{labels[f]}</p>
              </button>
            )
          })}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <Loader2 className="animate-spin text-[#c62737]" size={28} />
          </div>
        ) : error ? (
          <div className="py-10 text-center text-red-500">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center border border-dashed border-slate-200 rounded-2xl bg-white">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <ArrowLeftRight className="text-slate-400" size={24} />
            </div>
            <p className="font-semibold text-slate-600 mb-1">Nenhuma solicitação</p>
            <p className="text-sm text-slate-400">
              {filter === 'pendente' ? 'Não há trocas pendentes de aprovação.' : 'Nenhuma troca registrada ainda.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(t => {
              const cfg = STATUS_CONFIG[t.status]
              const dateLabel = t.slot?.date
                ? new Date(t.slot.date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })
                : '—'
              const criadaLabel = new Date(t.criada_em).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })

              return (
                <div key={t.id} className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-sm transition-shadow">
                  <div className="flex flex-wrap items-start gap-4">

                    {/* Info principal */}
                    <div className="flex-1 min-w-[200px]">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold ${cfg.cls}`}>
                          {cfg.icon} {cfg.label}
                        </span>
                        <span className="text-[10px] text-slate-400">{criadaLabel}</span>
                      </div>

                      {/* Culto */}
                      <p className="font-semibold text-slate-800 text-sm mb-0.5">
                        {t.slot?.label ?? 'Culto'} · {dateLabel}
                      </p>
                      <span className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 font-semibold mb-2">
                        {t.funcao}
                      </span>

                      {/* Voluntários */}
                      <div className="flex flex-col gap-1">
                        <p className="text-xs text-slate-500">
                          <span className="font-semibold text-slate-700">Solicitante:</span>{' '}
                          {t.solicitante?.full_name ?? '—'}
                        </p>
                        {t.substituto && (
                          <p className="text-xs text-slate-500">
                            <span className="font-semibold text-slate-700">Substituto sugerido:</span>{' '}
                            {t.substituto.full_name}
                          </p>
                        )}
                        {t.mensagem && (
                          <p className="text-xs text-slate-500 italic">"{t.mensagem}"</p>
                        )}
                        {t.resposta && (
                          <p className="text-xs text-slate-500">
                            <span className="font-semibold">Resposta:</span> {t.resposta}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Botões */}
                    {t.status === 'pendente' && (
                      <div className="flex flex-col gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => responder(t.id, 'aprovada')}
                          disabled={processing === t.id}
                          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-40 transition-colors"
                        >
                          {processing === t.id
                            ? <Loader2 size={12} className="animate-spin" />
                            : <CheckCircle2 size={12} />}
                          Aprovar
                        </button>
                        <button
                          type="button"
                          onClick={() => { setRejectModalTroca(t); setRejectResposta('') }}
                          disabled={processing === t.id}
                          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-red-200 text-red-500 text-xs font-bold hover:bg-red-50 disabled:opacity-40 transition-colors"
                        >
                          <XCircle size={12} /> Rejeitar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal de rejeição */}
      {rejectModalTroca && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="font-bold text-slate-800 text-lg mb-1">Rejeitar troca</h3>
            <p className="text-sm text-slate-500 mb-4">
              Solicitação de <strong>{rejectModalTroca.solicitante?.full_name}</strong> para {rejectModalTroca.slot?.label} · {rejectModalTroca.funcao}
            </p>
            <textarea
              value={rejectResposta}
              onChange={e => setRejectResposta(e.target.value)}
              placeholder="Motivo da rejeição (opcional)…"
              rows={3}
              className="w-full border border-slate-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:border-[#c62737] focus:ring-2 focus:ring-[#c62737]/10 mb-4"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setRejectModalTroca(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => responder(rejectModalTroca.id, 'rejeitada', rejectResposta)}
                disabled={!!processing}
                className="px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 disabled:opacity-40"
              >
                {processing ? <Loader2 size={13} className="animate-spin" /> : 'Confirmar rejeição'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast visible={!!toast} message={toast?.message ?? ''} type={toast?.type ?? 'ok'} onClose={() => setToast(null)} />
    </PageAccessGuard>
  )
}
