'use client'

import { useState, useEffect } from 'react'
import { X, Loader2 } from 'lucide-react'
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

  async function handleSave() {
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
            disabled={saving || loading || events.length === 0}
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
