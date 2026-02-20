'use client'

import { useState, useEffect, useCallback } from 'react'
import { adminFetchJson } from '@/lib/admin-client'
import type { ReviewEvent } from '@/lib/consolidacao-types'
import { Loader2, Plus, RefreshCw, Calendar, Users, ChevronRight, BookOpen, X, Clock } from 'lucide-react'
import Link from 'next/link'
import { AdminPageHeader } from '@/app/admin/AdminPageHeader'

const fieldCls = 'w-full rounded-xl border-2 border-slate-200 px-3.5 py-2.5 text-sm font-medium bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all hover:border-slate-300'

function CreateEventModal({ churches, onClose, onCreated }: {
  churches: { id: string; name: string }[]
  onClose: () => void
  onCreated: () => void
}) {
  const [name, setName] = useState('')
  const [churchId, setChurchId] = useState(churches[0]?.id ?? '')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!name.trim()) { setError('Informe o nome do evento'); return }
    if (!churchId) { setError('Selecione a congregação'); return }
    if (!startDate) { setError('Informe a data de início'); return }
    setSaving(true)
    setError('')
    try {
      await adminFetchJson('/api/admin/consolidacao/revisao/events', {
        method: 'POST',
        body: JSON.stringify({ name, church_id: churchId, start_date: startDate, end_date: endDate || undefined, description: description || undefined }),
      })
      onCreated()
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao criar evento')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center">
              <BookOpen className="w-4.5 h-4.5 text-purple-600" />
            </div>
            <h2 className="text-base font-bold text-slate-800">Novo Evento — O Revisão de Vidas</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Nome *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Revisão de Vidas Mar/2026"
              className={fieldCls} />
          </div>
          {churches.length > 1 && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Congregação *</label>
              <select value={churchId} onChange={e => setChurchId(e.target.value)} className={fieldCls}>
                {churches.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Início *</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={fieldCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Término</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={fieldCls} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Descrição</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
              placeholder="Detalhes do evento..."
              className={`${fieldCls} resize-none`} />
          </div>
          {error && (
            <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">Cancelar</button>
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2 text-sm font-semibold rounded-xl bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2 transition-colors">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Criando...' : 'Criar Evento'}
          </button>
        </div>
      </div>
    </div>
  )
}

function EventCard({ ev }: { ev: ReviewEvent }) {
  const start = new Date(ev.start_date)
  const end = ev.end_date ? new Date(ev.end_date) : null
  const duration = end ? Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1 : null

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden hover:shadow-md hover:border-purple-200 transition-all group">
      {/* Top stripe */}
      <div className={`h-1.5 w-full ${ev.active ? 'bg-gradient-to-r from-purple-500 to-indigo-500' : 'bg-slate-200'}`} />

      <div className="p-5 flex flex-col gap-4 flex-1">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5 text-purple-600" />
          </div>
          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
            ev.active ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'bg-slate-100 text-slate-500'
          }`}>
            {ev.active ? 'Ativo' : 'Encerrado'}
          </span>
        </div>

        <div>
          <h3 className="font-bold text-slate-800 text-sm leading-snug group-hover:text-purple-700 transition-colors">{ev.name}</h3>
        </div>

        {/* Datas */}
        <div className="flex flex-col gap-1.5 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-medium">
              {start.toLocaleDateString('pt-BR')}
              {end && ` – ${end.toLocaleDateString('pt-BR')}`}
            </span>
          </div>
          {duration && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{duration} dia{duration !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>

        {/* Action */}
        <Link
          href={`/admin/revisao-vidas/${ev.id}`}
          className="mt-auto flex items-center justify-between px-4 py-2.5 rounded-xl bg-purple-50 text-purple-700 text-sm font-semibold hover:bg-purple-100 transition-colors"
        >
          <span className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Ver inscritos
          </span>
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  )
}

export default function RevisaoVidasPage() {
  const [events, setEvents] = useState<ReviewEvent[]>([])
  const [churches, setChurches] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      adminFetchJson('/api/admin/consolidacao/revisao/events').then((d: any) => d.events ?? []),
      adminFetchJson('/api/admin/consolidacao/churches').then((d: any) => d.churches ?? []).catch(() => []),
    ]).then(([evts, chs]) => {
      setEvents(evts)
      setChurches(chs)
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const ativos = events.filter(e => e.active)
  const encerrados = events.filter(e => !e.active)

  return (
    <div className="p-6 md:p-8 space-y-6">
      <AdminPageHeader
        icon={BookOpen}
        title="O Revisão de Vidas"
        subtitle="Gerencie eventos e acompanhe as inscrições"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:text-purple-600 hover:border-purple-200 hover:bg-purple-50 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Novo Evento
            </button>
          </div>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-24 text-slate-400 gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Carregando eventos…</span>
        </div>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-3">
          <div className="w-16 h-16 rounded-2xl bg-purple-50 flex items-center justify-center">
            <BookOpen className="w-8 h-8 text-purple-300" />
          </div>
          <p className="text-sm font-medium text-slate-500">Nenhum evento cadastrado ainda</p>
          <button
            onClick={() => setShowCreate(true)}
            className="text-xs text-purple-600 font-semibold hover:underline"
          >
            Criar primeiro evento
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {ativos.length > 0 && (
            <section>
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Ativos ({ativos.length})</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {ativos.map(ev => <EventCard key={ev.id} ev={ev} />)}
              </div>
            </section>
          )}
          {encerrados.length > 0 && (
            <section>
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Encerrados ({encerrados.length})</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 opacity-70">
                {encerrados.map(ev => <EventCard key={ev.id} ev={ev} />)}
              </div>
            </section>
          )}
        </div>
      )}

      {showCreate && (
        <CreateEventModal
          churches={churches}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); load() }}
        />
      )}
    </div>
  )
}
