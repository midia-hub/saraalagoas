'use client'

import { useState, useEffect } from 'react'
import { adminFetchJson } from '@/lib/admin-client'
import { X, Loader2, BookOpen } from 'lucide-react'
import { CustomSelect } from '@/components/ui/CustomSelect'
import { CustomSearchSelect } from '@/components/ui/CustomSearchSelect'
import { DatePickerInput } from '@/components/ui/DatePickerInput'

const fieldCls = 'w-full rounded-xl border-2 border-slate-200 px-3.5 py-2.5 text-sm font-medium bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all hover:border-slate-300'

interface EditEventModalProps {
  isOpen: boolean
  eventData: any
  onClose: () => void
  onSaved: () => void
}

export function EditEventModal({ isOpen, eventData, onClose, onSaved }: EditEventModalProps) {
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [secretaryPersonId, setSecretaryPersonId] = useState('')
  const [people, setPeople] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (eventData) {
      setName(eventData.name || '')
      setStartDate(eventData.start_date || '')
      setEndDate(eventData.end_date || '')
      setSecretaryPersonId(eventData.secretary_person_id || '')
    }
  }, [eventData])

  useEffect(() => {
    adminFetchJson('/api/admin/consolidacao/pessoas?limit=500')
      .then((d: any) => setPeople(d.pessoas ?? []))
      .catch(() => setPeople([]))
  }, [])

  if (!isOpen) return null

  async function handleSave() {
    if (!name.trim()) { 
      setError('Informe o nome do evento')
      return 
    }
    if (!startDate) { 
      setError('Informe a data de início')
      return 
    }

    setSaving(true)
    setError('')
    
    try {
      await adminFetchJson(`/api/admin/consolidacao/revisao/events/${eventData.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name,
          start_date: startDate,
          end_date: endDate || null,
          secretary_person_id: secretaryPersonId || null,
        }),
      })
      onSaved()
      onClose()
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao atualizar evento')
    } finally {
      setSaving(false)
    }
  }

  const secretaryName = people.find(p => p.id === secretaryPersonId)?.full_name

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center">
              <BookOpen className="w-4.5 h-4.5 text-purple-600" />
            </div>
            <h2 className="text-base font-bold text-slate-800">Editar Evento — Revisão de Vidas</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Nome do Evento *</label>
            <input 
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="Ex: Revisão de Vidas Mar/2026"
              className={fieldCls}
              disabled={saving}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Data de Início *</label>
              <DatePickerInput
                value={startDate}
                onChange={setStartDate}
                placeholder="dd/mm/aaaa"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Término</label>
              <DatePickerInput
                value={endDate}
                onChange={setEndDate}
                placeholder="dd/mm/aaaa"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Secretário Responsável 
              {secretaryName && <span className="text-purple-600 font-semibold"> — {secretaryName}</span>}
            </label>
            <CustomSearchSelect
              value={secretaryPersonId}
              onChange={setSecretaryPersonId}
              options={people.map((p: any) => ({ value: p.id, label: p.full_name || 'Sem nome' }))}
              placeholder="Digite para buscar..."
              allowEmpty={true}
            />
          </div>

          {error && (
            <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100">
          <button 
            onClick={onClose} 
            disabled={saving}
            className="px-4 py-2 text-sm font-medium rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSave} 
            disabled={saving}
            className="px-5 py-2 text-sm font-semibold rounded-xl bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </div>
    </div>
  )
}
