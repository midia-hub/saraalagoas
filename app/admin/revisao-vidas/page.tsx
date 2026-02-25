'use client'

import { useState, useEffect, useCallback } from 'react'
import { adminFetchJson } from '@/lib/admin-client'
import type { ReviewEvent } from '@/lib/consolidacao-types'
import { Loader2, Plus, RefreshCw, Calendar, Users, BookOpen, X, Clock, Edit, ClipboardList, Link2, Check, RotateCcw, Activity } from 'lucide-react'
import Link from 'next/link'
import { AdminPageHeader } from '@/app/admin/AdminPageHeader'
import { CustomSelect } from '@/components/ui/CustomSelect'
import { CustomSearchSelect } from '@/components/ui/CustomSearchSelect'
import { DatePickerInput } from '@/components/ui/DatePickerInput'
import { EditEventModal } from './EditEventModal'
import { useAdminAccess } from '@/lib/admin-access-context'

const fieldCls = 'w-full rounded-xl border-2 border-slate-200 px-3.5 py-2.5 text-sm font-medium bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all hover:border-slate-300'

type ReviewInscricaoLog = {
  id: string
  event_id: string | null
  event_name: string | null
  person_name: string | null
  phone_masked: string | null
  action: 'attempt' | 'person_reused' | 'person_created' | 'registration_exists' | 'registration_created' | 'registration_error'
  created_at: string
}

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
  const [secretaryPersonId, setSecretaryPersonId] = useState('')
  const [people, setPeople] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    adminFetchJson('/api/admin/consolidacao/pessoas?limit=500')
      .then(d => setPeople(d.pessoas ?? []))
      .catch(() => setPeople([]))
  }, [])

  async function handleSave() {
    if (!name.trim()) { setError('Informe o nome do evento'); return }
    if (!churchId) { setError('Selecione a congregação'); return }
    if (!startDate) { setError('Informe a data de início'); return }
    setSaving(true)
    setError('')
    try {
      await adminFetchJson('/api/admin/consolidacao/revisao/events', {
        method: 'POST',
        body: JSON.stringify({ 
          name, 
          church_id: churchId, 
          start_date: startDate, 
          end_date: endDate || undefined, 
          description: description || undefined,
          secretary_person_id: secretaryPersonId || null,
        }),
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
            <h2 className="text-base font-bold text-slate-800">Novo Evento — Revisão de Vidas</h2>
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
              <CustomSelect
                value={churchId}
                onChange={setChurchId}
                options={churches.map((c) => ({ value: c.id, label: c.name }))}
                placeholder="Selecione a congregação"
                allowEmpty={false}
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Início *</label>
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
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Descrição</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
              placeholder="Detalhes do evento..."
              className={`${fieldCls} resize-none`} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Secretário Responsável (validação de pagamentos)</label>
            <CustomSearchSelect
              value={secretaryPersonId}
              onChange={setSecretaryPersonId}
              options={people.map((p) => ({ value: p.id, label: p.full_name || 'Sem nome' }))}
              placeholder="Digite para buscar..."
              allowEmpty={true}
            />
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

function EventCard({ ev, onEdit, onCancel, onReactivate, cancelling, churches }: {
  ev: ReviewEvent
  onEdit?: (event: ReviewEvent) => void
  onCancel?: (event: ReviewEvent) => void
  onReactivate?: (event: ReviewEvent) => void
  cancelling?: boolean
  churches?: { id: string; name: string }[]
}) {
  const start = new Date(ev.start_date)
  const end = ev.end_date ? new Date(ev.end_date) : null
  const duration = end ? Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1 : null
  const [copied, setCopied] = useState(false)
  const churchName = churches?.find(c => c.id === ev.church_id)?.name

  function handleCopyLink() {
    const url = typeof window !== 'undefined'
      ? `${window.location.origin}/revisao-vidas/inscricao/${ev.id}`
      : `/revisao-vidas/inscricao/${ev.id}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  return (
    <div className={`bg-white rounded-2xl border shadow-sm flex flex-col overflow-hidden transition-all group ${
      ev.active
        ? 'border-slate-200 hover:shadow-md hover:border-purple-200'
        : 'border-slate-150 opacity-75 hover:opacity-100'
    }`}>
      {/* Top stripe */}
      <div className={`h-1 w-full ${ev.active ? 'bg-gradient-to-r from-purple-500 to-indigo-400' : 'bg-slate-200'}`} />

      <div className="p-4 flex flex-col gap-3 flex-1">
        {/* Header: icon + name + badge */}
        <div className="flex items-start gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
            ev.active ? 'bg-purple-50' : 'bg-slate-50'
          }`}>
            <BookOpen className={`w-[18px] h-[18px] ${ev.active ? 'text-purple-500' : 'text-slate-400'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={`font-bold text-sm leading-snug line-clamp-2 group-hover:text-purple-700 transition-colors ${
              ev.active ? 'text-slate-800' : 'text-slate-500'
            }`}>{ev.name}</h3>
            {churchName && (
              <p className="text-[11px] text-slate-400 mt-0.5 truncate">{churchName}</p>
            )}
          </div>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 mt-0.5 ${
            ev.active
              ? 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200'
              : 'bg-slate-100 text-slate-400'
          }`}>
            {ev.active ? '● Ativo' : 'Encerrado'}
          </span>
        </div>

        {/* Datas */}
        <div className="flex items-center gap-3 text-[11px] text-slate-500">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3 text-slate-300" />
            <span className="font-medium">
              {start.toLocaleDateString('pt-BR')}
              {end && ` – ${end.toLocaleDateString('pt-BR')}`}
            </span>
          </div>
          {duration && (
            <>
              <span className="text-slate-200">•</span>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-300" />
                <span>{duration}d</span>
              </div>
            </>
          )}
        </div>

        {/* Link de inscrição */}
        {ev.active && (
          <button
            onClick={handleCopyLink}
            className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all border ${
              copied
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-indigo-50 border-indigo-100 text-indigo-700 hover:bg-indigo-100'
            }`}
          >
            {copied ? (
              <><Check className="w-3.5 h-3.5" /> Link copiado!</>
            ) : (
              <><Link2 className="w-3.5 h-3.5" /> Copiar link de inscrição</>
            )}
          </button>
        )}

        {/* Actions */}
        <div className="mt-auto pt-3 border-t border-slate-100 flex items-center gap-1.5">
          <Link
            href={`/admin/revisao-vidas/inscritos?event_id=${ev.id}`}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600 text-white text-xs font-semibold hover:bg-purple-700 transition-colors"
          >
            <Users className="w-3.5 h-3.5" />
            Inscritos
          </Link>
          <Link
            href={`/admin/revisao-vidas/${ev.id}/anamneses`}
            className="flex items-center justify-center w-8 h-8 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-purple-600 hover:border-purple-200 hover:bg-purple-50 transition-colors"
            title="Ver anamneses"
          >
            <ClipboardList className="w-3.5 h-3.5" />
          </Link>
          {onEdit && (
            <button
              onClick={() => onEdit(ev)}
              className="flex items-center justify-center w-8 h-8 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors"
              title="Editar evento"
            >
              <Edit className="w-3.5 h-3.5" />
            </button>
          )}
          {ev.active && onCancel && (
            <button
              onClick={() => onCancel(ev)}
              disabled={!!cancelling}
              className="flex items-center justify-center w-8 h-8 rounded-xl border border-rose-200 bg-rose-50 text-rose-500 hover:bg-rose-100 hover:text-rose-700 transition-colors disabled:opacity-50"
              title="Encerrar evento"
            >
              {cancelling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
            </button>
          )}
          {!ev.active && onReactivate && (
            <button
              onClick={() => onReactivate(ev)}
              disabled={!!cancelling}
              className="flex items-center justify-center w-8 h-8 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors disabled:opacity-50"
              title="Reativar evento"
            >
              {cancelling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function RevisaoVidasPage() {
  const access = useAdminAccess()
  const [events, setEvents] = useState<ReviewEvent[]>([])
  const [churches, setChurches] = useState<{ id: string; name: string }[]>([])
  const [inscricaoLogs, setInscricaoLogs] = useState<ReviewInscricaoLog[]>([])
  const [inscricaoLogsError, setInscricaoLogsError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancellingEventId, setCancellingEventId] = useState<string | null>(null)
  const [reactivatingEventId, setReactivatingEventId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [editingEvent, setEditingEvent] = useState<ReviewEvent | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setInscricaoLogsError(null)
    const logsPromise = access.isAdmin
      ? adminFetchJson('/api/admin/consolidacao/revisao/inscricao-logs?limit=40')
          .then((d: any) => d.items ?? [])
          .catch((err: Error) => {
            setInscricaoLogsError(err?.message ?? 'Erro ao carregar log de inscrições')
            return []
          })
      : Promise.resolve([])

    Promise.all([
      adminFetchJson('/api/admin/consolidacao/revisao/events').then((d: any) => d.events ?? []),
      adminFetchJson('/api/admin/consolidacao/churches').then((d: any) => d.churches ?? []).catch(() => []),
      logsPromise,
    ]).then(([evts, chs, logs]) => {
      setEvents(evts)
      setChurches(chs)
      setInscricaoLogs(logs)
    }).finally(() => setLoading(false))
  }, [access.isAdmin])

  useEffect(() => { load() }, [load])

  async function handleCancelEvent(event: ReviewEvent) {
    const ok = confirm(`Encerrar o evento "${event.name}"?\n\nAs inscrições serão desativadas.`)
    if (!ok) return

    setCancellingEventId(event.id)
    try {
      await adminFetchJson(`/api/admin/consolidacao/revisao/events/${event.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ active: false }),
      })
      load()
    } catch (e: any) {
      alert(e?.message ?? 'Erro ao encerrar evento')
    } finally {
      setCancellingEventId(null)
    }
  }

  async function handleReactivateEvent(event: ReviewEvent) {
    const ok = confirm(`Reativar o evento "${event.name}"?\n\nAs inscrições voltarão a funcionar.`)
    if (!ok) return

    setReactivatingEventId(event.id)
    try {
      await adminFetchJson(`/api/admin/consolidacao/revisao/events/${event.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ active: true }),
      })
      load()
    } catch (e: any) {
      alert(e?.message ?? 'Erro ao reativar evento')
    } finally {
      setReactivatingEventId(null)
    }
  }

  const ativos = events.filter(e => e.active)
  const encerrados = events.filter(e => !e.active)

  const actionBadge = (action: ReviewInscricaoLog['action']) => {
    const map: Record<ReviewInscricaoLog['action'], { label: string; cls: string }> = {
      attempt:               { label: 'Tentativa',            cls: 'bg-slate-100 text-slate-600' },
      person_reused:         { label: 'Pessoa reaproveitada', cls: 'bg-blue-50 text-blue-700' },
      person_created:        { label: 'Pessoa criada',        cls: 'bg-indigo-50 text-indigo-700' },
      registration_exists:   { label: 'Já inscrito',         cls: 'bg-amber-50 text-amber-700' },
      registration_created:  { label: 'Inscrito ✓',          cls: 'bg-emerald-50 text-emerald-700' },
      registration_error:    { label: 'Erro',                cls: 'bg-rose-50 text-rose-700' },
    }
    const m = map[action] ?? { label: action, cls: 'bg-slate-100 text-slate-600' }
    return <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${m.cls}`}>{m.label}</span>
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      <AdminPageHeader
        icon={BookOpen}
        title="Revisão de Vidas"
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

      {/* Stats bar */}
      {!loading && events.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl border border-slate-200 px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
              <BookOpen className="w-4 h-4 text-purple-500" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Total</p>
              <p className="text-xl font-bold text-slate-800 leading-none mt-0.5">{events.length}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
              <Activity className="w-4 h-4 text-emerald-500" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Ativos</p>
              <p className="text-xl font-bold text-emerald-600 leading-none mt-0.5">{ativos.length}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 text-slate-400" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Encerrados</p>
              <p className="text-xl font-bold text-slate-500 leading-none mt-0.5">{encerrados.length}</p>
            </div>
          </div>
        </div>
      )}

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
        <div className="space-y-8">
          {ativos.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ativos</h2>
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">{ativos.length}</span>
                <div className="flex-1 h-px bg-slate-100" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {ativos.map(ev => (
                  <EventCard
                    key={ev.id}
                    ev={ev}
                    onEdit={setEditingEvent}
                    onCancel={handleCancelEvent}
                    cancelling={cancellingEventId === ev.id}
                    churches={churches}
                  />
                ))}
              </div>
            </section>
          )}
          {encerrados.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Encerrados</h2>
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-slate-400 text-[10px] font-bold">{encerrados.length}</span>
                <div className="flex-1 h-px bg-slate-100" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {encerrados.map(ev => (
                  <EventCard
                    key={ev.id}
                    ev={ev}
                    onEdit={setEditingEvent}
                    onReactivate={handleReactivateEvent}
                    cancelling={reactivatingEventId === ev.id}
                    churches={churches}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {access.isAdmin && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-slate-400" />
              <div>
                <h3 className="text-sm font-bold text-slate-800">Log de Inscrições</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Visível apenas para administradores · últimos 40 registros</p>
              </div>
            </div>
            {inscricaoLogs.length > 0 && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">{inscricaoLogs.length}</span>
            )}
          </div>

          {inscricaoLogsError ? (
            <div className="px-5 py-6 flex items-center gap-2 text-sm text-rose-600">
              <X className="w-4 h-4 shrink-0" />
              {inscricaoLogsError}
            </div>
          ) : inscricaoLogs.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-slate-400">Nenhum log de inscrição encontrado.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 text-[10px] uppercase tracking-wider">
                    <th className="px-5 py-2.5 text-left font-semibold">Data/Hora</th>
                    <th className="px-5 py-2.5 text-left font-semibold">Evento</th>
                    <th className="px-5 py-2.5 text-left font-semibold">Pessoa</th>
                    <th className="px-5 py-2.5 text-left font-semibold">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {inscricaoLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-2.5 text-slate-500 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString('pt-BR')}
                      </td>
                      <td className="px-5 py-2.5 text-slate-600 max-w-[180px] truncate">{log.event_name ?? '—'}</td>
                      <td className="px-5 py-2.5">
                        <div className="font-medium text-slate-700">{log.person_name ?? '—'}</div>
                        {log.phone_masked && <div className="text-slate-400">{log.phone_masked}</div>}
                      </td>
                      <td className="px-5 py-2.5">{actionBadge(log.action)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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

      {editingEvent && (
        <EditEventModal
          isOpen={!!editingEvent}
          eventData={editingEvent}
          onClose={() => setEditingEvent(null)}
          onSaved={() => { setEditingEvent(null); load() }}
        />
      )}
    </div>
  )
}
