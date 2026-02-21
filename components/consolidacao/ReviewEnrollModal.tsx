'use client'

import { useState, useEffect } from 'react'
import { X, Loader2, ExternalLink, Link2, ClipboardCheck } from 'lucide-react'
import { adminFetchJson } from '@/lib/admin-client'
import type { FollowupEnriched, ReviewEvent } from '@/lib/consolidacao-types'

interface Props {
  disciple: FollowupEnriched
  onClose: () => void
  onSaved: () => void
}

export function ReviewEnrollModal({ disciple, onClose, onSaved }: Props) {
  const [events, setEvents] = useState<ReviewEvent[]>([])
  const [eventId, setEventId] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [anamneseLoading, setAnamneseLoading] = useState(false)
  const [anamneseToken, setAnamneseToken] = useState<string | null>(null)
  const [anamneseCompletedAt, setAnamneseCompletedAt] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [hasCompletedReview, setHasCompletedReview] = useState(false)

  const isDirected = disciple.status === 'direcionado_revisao'
  const alreadyEnrolled = disciple.status === 'inscrito_revisao' || disciple.status === 'concluiu_revisao'
  const completedReviewRestriction = hasCompletedReview
    ? 'Esta pessoa já completou a Revisão de Vidas e não pode se inscrever novamente.'
    : ''
  const restrictionMessage = completedReviewRestriction || (alreadyEnrolled
      ? 'Esta pessoa já está inscrita no Revisão de Vidas.'
      : !isDirected
        ? 'Para inscrever, o status precisa estar "Direcionado p/ o Revisão de Vidas".'
        : '')
  const canEnroll = !restrictionMessage

  useEffect(() => {
    setLoading(true)
    adminFetchJson('/api/admin/consolidacao/revisao/events?active=1')
      .then((data: any) => {
        const list: ReviewEvent[] = data.events ?? []
        setEvents(list)
        if (list.length > 0) setEventId(list[0].id)
      })
      .catch(() => setError('Erro ao carregar eventos'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!disciple.person_id) return
    setAnamneseLoading(true)
    adminFetchJson(`/api/admin/consolidacao/revisao/registrations?person_id=${disciple.person_id}`)
      .then((data: any) => {
        const list = Array.isArray(data.registrations) ? data.registrations : []
        const latest = list[0]
        setAnamneseToken(latest?.anamnese_token ?? null)
        setAnamneseCompletedAt(latest?.anamnese_completed_at ?? null)
      })
      .catch(() => {
        setAnamneseToken(null)
        setAnamneseCompletedAt(null)
      })
      .finally(() => setAnamneseLoading(false))
  }, [disciple.person_id])

  useEffect(() => {
    if (!disciple.person_id) return
    adminFetchJson(`/api/admin/consolidacao/pessoas/${disciple.person_id}`)
      .then((data: any) => {
        setHasCompletedReview(!!data.person?.completed_review_date)
      })
      .catch(() => {
        setHasCompletedReview(false)
      })
  }, [disciple.person_id])

  function getFormLink(token: string | null) {
    if (!token) return ''
    if (typeof window === 'undefined') return `/revisao-vidas/anamnese/${token}`
    return `${window.location.origin}/revisao-vidas/anamnese/${token}`
  }

  async function copyLink() {
    const url = getFormLink(anamneseToken)
    if (!url || typeof navigator?.clipboard?.writeText !== 'function') return
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  async function handleSave() {
    if (!canEnroll) {
      setError(restrictionMessage || 'Inscrição não permitida.')
      return
    }
    if (!eventId) { setError('Selecione um evento do Revisão de Vidas'); return }
    setSaving(true)
    setError('')
    try {
      await adminFetchJson('/api/admin/consolidacao/revisao/registrations', {
        method: 'POST',
        body: JSON.stringify({
          event_id: eventId,
          person_id: disciple.person_id,
        }),
      })
      onSaved()
    } catch (err: any) {
      setError(err?.message ?? 'Erro ao inscrever')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-base font-semibold text-gray-900">Inscrever no Revisão de Vidas</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <p className="text-sm text-gray-600">
            Discípulo: <span className="font-medium text-gray-900">{disciple.person?.full_name ?? '—'}</span>
          </p>

          {restrictionMessage && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              {restrictionMessage}
            </div>
          )}

          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 space-y-2">
            <p className="text-xs font-semibold text-slate-700">Anamnese</p>
            {anamneseLoading ? (
              <p className="text-xs text-slate-500">Carregando status...</p>
            ) : anamneseToken ? (
              <>
                <p className={`text-xs font-medium ${anamneseCompletedAt ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {anamneseCompletedAt ? 'Anamnese preenchida' : 'Anamnese pendente'}
                </p>
                <div className="flex items-center gap-2">
                  <a
                    href={getFormLink(anamneseToken)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium rounded-md px-2 py-1 border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Abrir formulário
                  </a>
                  <button
                    onClick={copyLink}
                    className="inline-flex items-center gap-1 text-xs font-medium rounded-md px-2 py-1 border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  >
                    {copied ? <ClipboardCheck className="w-3.5 h-3.5 text-emerald-600" /> : <Link2 className="w-3.5 h-3.5" />}
                    {copied ? 'Copiado' : 'Copiar link'}
                  </button>
                </div>
              </>
            ) : (
              <p className="text-xs text-slate-500">Ainda não há inscrição para gerar link de anamnese.</p>
            )}
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" /> Carregando eventos…
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Evento *</label>
              {events.length === 0 ? (
                <p className="text-sm text-gray-500">Nenhum evento ativo encontrado.<br />
                  Cadastre eventos em <strong>Revisão de Vidas</strong>.</p>
              ) : (
                <select
                  value={eventId}
                  onChange={e => setEventId(e.target.value)}
                  disabled={!canEnroll}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {events.map(ev => (
                    <option key={ev.id} value={ev.id}>
                      {ev.name} — {new Date(ev.start_date).toLocaleDateString('pt-BR')}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded border text-gray-600 hover:bg-gray-50">Cancelar</button>
          <button
            onClick={handleSave}
            disabled={saving || loading || events.length === 0 || !canEnroll}
            className="px-4 py-2 text-sm rounded bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Inscrever
          </button>
        </div>
      </div>
    </div>
  )
}
