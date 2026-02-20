'use client'

import { useState, useEffect } from 'react'
import { X, Loader2 } from 'lucide-react'
import { adminFetchJson } from '@/lib/admin-client'
import type { FollowupEnriched, WorshipService } from '@/lib/consolidacao-types'

interface Props {
  disciple: FollowupEnriched
  onClose: () => void
  onSaved: () => void
}

export function AttendanceModal({ disciple, onClose, onSaved }: Props) {
  const [services, setServices] = useState<WorshipService[]>([])
  const [serviceId, setServiceId] = useState('')
  const [attendedOn, setAttendedOn] = useState(new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    adminFetchJson('/api/admin/consolidacao/worship-services')
      .then((data: any) => {
        const list: WorshipService[] = data.services ?? []
        setServices(list)
        if (list.length > 0) setServiceId(list[0].id)
      })
      .catch(() => setError('Erro ao carregar cultos'))
      .finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    if (!serviceId) { setError('Selecione um culto'); return }
    if (!attendedOn) { setError('Informe a data'); return }
    setSaving(true)
    setError('')
    try {
      await adminFetchJson('/api/admin/consolidacao/attendance', {
        method: 'POST',
        body: JSON.stringify({
          service_id: serviceId,
          person_id: disciple.person_id,
          attended_on: attendedOn,
          attended: true,
          notes: notes || undefined,
        }),
      })
      onSaved()
    } catch (err: any) {
      setError(err?.message ?? 'Erro ao salvar presença')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-base font-semibold text-gray-900">Registrar Presença</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <p className="text-sm text-gray-600">
            Discípulo: <span className="font-medium text-gray-900">{disciple.person?.full_name ?? '—'}</span>
          </p>

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" /> Carregando cultos…
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Culto *</label>
              <select
                value={serviceId}
                onChange={e => setServiceId(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {services.map(s => (
                  <option key={s.id} value={s.id}>{s.name} — {s.time_of_day?.slice(0, 5)}</option>
                ))}
                {services.length === 0 && <option value="">Nenhum culto cadastrado</option>}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Data *</label>
            <input
              type="date"
              value={attendedOn}
              onChange={e => setAttendedOn(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Observação</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Opcional"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded border text-gray-600 hover:bg-gray-50">Cancelar</button>
          <button
            onClick={handleSave}
            disabled={saving || loading || !serviceId}
            className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Salvar
          </button>
        </div>
      </div>
    </div>
  )
}
