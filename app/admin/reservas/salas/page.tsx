'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { adminFetchJson } from '@/lib/admin-client'
import {
  ArrowLeft,
  Building2,
  Pencil,
  Trash2,
  Users,
  Clock,
  Plus,
  CheckCircle2,
  XCircle,
  RefreshCw,
  AlertCircle,
} from 'lucide-react'

type Room = {
  id: string
  name: string
  description: string | null
  capacity: number | null
  available_days: number[]
  available_start_time: string
  available_end_time: string
  approval_person_id: string | null
  active: boolean
}

type PersonOption = { id: string; label: string }

const DAY_OPTIONS = [
  { value: 0, label: 'Dom' },
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sab' },
]

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINUTES = ['00', '15', '30', '45']

function TimeSelect({
  value,
  onChange,
  disabled,
  required,
}: {
  value: string
  onChange: (v: string) => void
  disabled?: boolean
  required?: boolean
}) {
  const [h, m] = (value || '00:00').split(':')
  const hour = h?.padStart(2, '0') ?? '00'
  const minute = MINUTES.includes(m ?? '') ? (m ?? '00') : '00'

  function update(newH: string, newM: string) {
    onChange(`${newH}:${newM}`)
  }

  const base = [
    'appearance-none bg-white border border-slate-200 rounded-lg text-sm font-mono font-semibold text-slate-800',
    'px-2.5 py-1.5 text-center cursor-pointer outline-none',
    'focus:ring-2 focus:ring-blue-300 focus:border-blue-400',
    'hover:border-blue-300 transition-all shadow-sm',
    disabled ? 'opacity-40 cursor-not-allowed bg-slate-50 pointer-events-none' : '',
  ].join(' ')

  return (
    <div className="inline-flex items-center gap-0.5">
      <div className="relative">
        <select
          className={`${base} w-14 pr-5`}
          value={hour}
          disabled={disabled}
          required={required}
          onChange={e => update(e.target.value, minute)}
        >
          {HOURS.map(hh => <option key={hh} value={hh}>{hh}</option>)}
        </select>
        <svg className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
      </div>
      <span className="text-slate-400 font-bold text-sm select-none">:</span>
      <div className="relative">
        <select
          className={`${base} w-14 pr-5`}
          value={minute}
          disabled={disabled}
          required={required}
          onChange={e => update(hour, e.target.value)}
        >
          {MINUTES.map(mm => <option key={mm} value={mm}>{mm}</option>)}
        </select>
        <svg className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
      </div>
    </div>
  )
}

function PersonCombobox({
  people,
  value,
  onChange,
}: {
  people: PersonOption[]
  value: string
  onChange: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = people.find(p => p.id === value)

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return people
    return people.filter(p => p.label.toLowerCase().includes(q))
  }, [search, people])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  function select(id: string) {
    onChange(id)
    setOpen(false)
    setSearch('')
  }

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-2.5 pl-3 pr-3 py-2.5 rounded-xl border text-sm text-left transition-all shadow-sm ${
          open
            ? 'border-blue-400 ring-2 ring-blue-200 bg-white'
            : 'border-slate-200 bg-white hover:border-blue-300'
        }`}
      >
        <span className={`flex-1 truncate ${
          selected ? 'text-slate-800 font-medium' : 'text-slate-400'
        }`}>
          {selected ? selected.label : 'Sem aprovador fixo'}
        </span>
        {selected && (
          <button
            type="button"
            onClick={e => { e.stopPropagation(); select('') }}
            className="shrink-0 text-slate-300 hover:text-red-400 transition-colors rounded-full"
            title="Remover aprovador"
          >
            <XCircle size={15} />
          </button>
        )}
        <svg className={`shrink-0 text-slate-400 transition-transform ${ open ? 'rotate-180' : ''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1.5 w-full bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden">
          {/* Search */}
          <div className="px-3 py-2.5 border-b border-slate-100 bg-slate-50">
            <div className="relative">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input
                ref={inputRef}
                type="text"
                className="w-full pl-7 pr-3 py-1.5 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                placeholder="Buscar pessoa…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Escape' && (setOpen(false), setSearch(''))}
              />
            </div>
          </div>

          {/* List */}
          <div className="max-h-56 overflow-y-auto">
            {/* Nenhum aprovador */}
            <button
              type="button"
              onClick={() => select('')}
              className={`w-full flex items-center gap-2 px-3.5 py-2.5 text-sm transition-colors ${
                !value ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                <Users size={12} className="text-slate-400" />
              </span>
              Sem aprovador fixo
            </button>

            {filtered.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-slate-400">Nenhum resultado</div>
            ) : (
              filtered.map(p => {
                const initials = p.label.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
                const isSelected = p.id === value
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => select(p.id)}
                    className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm transition-colors ${
                      isSelected
                        ? 'bg-blue-50 text-blue-700 font-semibold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      isSelected ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {initials}
                    </span>
                    <span className="truncate">{p.label}</span>
                    {isSelected && <CheckCircle2 size={14} className="ml-auto shrink-0 text-blue-500" />}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const INITIAL_FORM = {
  id: '',
  name: '',
  description: '',
  capacity: '',
  available_days: [0, 1, 2, 3, 4, 5, 6] as number[],
  day_times: {
    0: { start: '08:00', end: '22:00' },
    1: { start: '08:00', end: '22:00' },
    2: { start: '08:00', end: '22:00' },
    3: { start: '08:00', end: '22:00' },
    4: { start: '08:00', end: '22:00' },
    5: { start: '08:00', end: '22:00' },
    6: { start: '08:00', end: '22:00' },
  },
  approval_person_id: '',
  active: true,
}

export default function SalasPage() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [people, setPeople] = useState<PersonOption[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState(INITIAL_FORM)

  const isEditing = useMemo(() => !!form.id, [form.id])

  async function load() {
    setLoading(true)
    setError('')
    try {
      const [roomsJson, peopleJson] = await Promise.all([
        adminFetchJson<{ rooms: Room[] }>('/api/admin/reservas/rooms'),
        adminFetchJson<{ items: PersonOption[] }>('/api/admin/consolidacao/lookups/people?q='),
      ])
      setRooms(roomsJson.rooms ?? [])
      setPeople(peopleJson.items ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados')
      setRooms([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  function setField<K extends keyof typeof INITIAL_FORM>(key: K, value: (typeof INITIAL_FORM)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function setDayTime(day: number, field: 'start' | 'end', value: string) {
    setForm((prev) => ({
      ...prev,
      day_times: {
        ...prev.day_times,
        [day]: {
          ...prev.day_times[day],
          [field]: value,
        },
      },
    }))
  }

  function editRoom(room: any) {
    setForm({
      id: room.id,
      name: room.name,
      description: room.description ?? '',
      capacity: room.capacity ? String(room.capacity) : '',
      available_days: room.available_days ?? [],
      day_times: room.day_times || DAY_OPTIONS.reduce((acc, d) => {
        acc[d.value] = { start: room.available_start_time || '08:00', end: room.available_end_time || '22:00' }
        return acc
      }, {} as Record<number, { start: string; end: string }>),
      approval_person_id: room.approval_person_id ?? '',
      active: room.active,
    })
  }

  function resetForm() {
    setForm(INITIAL_FORM)
  }

  function toggleDay(day: number) {
    setForm((prev) => {
      const exists = prev.available_days.includes(day)
      const available_days = exists
        ? prev.available_days.filter((d) => d !== day)
        : [...prev.available_days, day].sort((a, b) => a - b)
      return { ...prev, available_days }
    })
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        name: form.name,
        description: form.description || null,
        capacity: form.capacity ? Number(form.capacity) : null,
        available_days: form.available_days,
        day_times: form.day_times,
        approval_person_id: form.approval_person_id || null,
        active: form.active,
      }

      if (isEditing) {
        await adminFetchJson(`/api/admin/reservas/rooms/${form.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        })
      } else {
        await adminFetchJson('/api/admin/reservas/rooms', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
      }

      resetForm()
      await load()
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Falha ao salvar sala')
    } finally {
      setSaving(false)
    }
  }

  async function removeRoom(id: string) {
    const ok = window.confirm('Deseja remover/desativar esta sala?')
    if (!ok) return

    try {
      await adminFetchJson(`/api/admin/reservas/rooms/${id}`, { method: 'DELETE' })
      if (form.id === id) resetForm()
      await load()
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Falha ao excluir sala')
    }
  }

  return (
    <PageAccessGuard pageKey="reservas">
      <div className="p-6 md:p-8 space-y-6 max-w-5xl">

        {/* ── CABEÇALHO ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Link href="/admin/reservas" className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-blue-600 mb-1 transition-colors">
              <ArrowLeft size={13} /> Reservas
            </Link>
            <h1 className="text-2xl font-bold text-slate-900">Salas</h1>
            <p className="text-sm text-slate-500 mt-0.5">Cadastre e gerencie as salas disponíveis para reserva</p>
          </div>
          {!isEditing && (
            <button
              type="button"
              onClick={() => document.getElementById('sala-form')?.scrollIntoView({ behavior: 'smooth' })}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 transition-colors"
            >
              <Plus size={15} /> Nova sala
            </button>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {/* ── APROVADOR PADRÃO ── */}
        <div className="flex flex-col gap-1.5 mb-6">
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Aprovador padrão</label>
          <PersonCombobox
            people={people}
            value={form.approval_person_id}
            onChange={(id) => setField('approval_person_id', id)}
          />
        </div>

        {/* ── FORMULÁRIO ── */}
        <div id="sala-form" className="rounded-2xl border bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-6 py-4 border-b bg-slate-50">
            {isEditing ? <Pencil size={16} className="text-blue-600" /> : <Plus size={16} className="text-blue-600" />}
            <span className="font-semibold text-slate-800 text-sm">{isEditing ? 'Editar sala' : 'Nova sala'}</span>
          </div>
          <form id="form-sala" onSubmit={submit} className="p-6 space-y-5">

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">Nome da sala *</label>
                <input
                  className="border rounded-lg px-3 py-2 text-sm bg-slate-50 focus:ring-2 focus:ring-blue-200 outline-none"
                  placeholder="Ex: Sala de Reunião A"
                  value={form.name}
                  onChange={(e) => setField('name', e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">Capacidade (pessoas)</label>
                <input
                  className="border rounded-lg px-3 py-2 text-sm bg-slate-50 focus:ring-2 focus:ring-blue-200 outline-none"
                  placeholder="Ex: 30"
                  type="number"
                  min={1}
                  value={form.capacity}
                  onChange={(e) => setField('capacity', e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500">Descrição</label>
              <textarea
                className="border rounded-lg px-3 py-2 text-sm bg-slate-50 focus:ring-2 focus:ring-blue-200 outline-none"
                placeholder="Descrição opcional da sala…"
                value={form.description}
                onChange={(e) => setField('description', e.target.value)}
                rows={2}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-500 block mb-2">Dias disponíveis</label>
              <div className="flex flex-wrap gap-2">
                {DAY_OPTIONS.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => toggleDay(d.value)}
                    className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                      form.available_days.includes(d.value)
                        ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Horários por dia da semana</label>
                <span className="text-xs text-slate-400">Apenas dias selecionados acima</span>
              </div>
              <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                {DAY_OPTIONS.map((d, idx) => {
                  const isActive = form.available_days.includes(d.value)
                  return (
                    <div
                      key={d.value}
                      className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${
                        idx !== 0 ? 'border-t border-slate-100' : ''
                      } ${
                        isActive ? 'bg-white hover:bg-blue-50/30' : 'bg-slate-50/60'
                      }`}
                    >
                      {/* Badge dia */}
                      <div className={`w-10 shrink-0 text-center rounded-lg py-1 text-xs font-bold tracking-wide ${
                        isActive
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-200 text-slate-400'
                      }`}>
                        {d.label}
                      </div>

                      {isActive ? (
                        <div className="flex items-center gap-3 flex-1">
                          <TimeSelect
                            value={form.day_times[d.value]?.start || '08:00'}
                            onChange={v => setDayTime(d.value, 'start', v)}
                            required
                          />
                          <span className="text-xs text-slate-400 font-semibold select-none px-0.5">até</span>
                          <TimeSelect
                            value={form.day_times[d.value]?.end || '22:00'}
                            onChange={v => setDayTime(d.value, 'end', v)}
                            required
                          />
                          <span className="ml-auto text-xs text-emerald-600 font-medium flex items-center gap-1">
                            <CheckCircle2 size={12} /> Disponível
                          </span>
                        </div>
                      ) : (
                        <div className="flex-1 flex items-center justify-between">
                          <span className="text-xs text-slate-400 italic">Dia não disponível</span>
                          <XCircle size={14} className="text-slate-300" />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>



            <label className="inline-flex items-center gap-2.5 cursor-pointer">
              <div
                role="checkbox"
                aria-checked={form.active}
                onClick={() => setField('active', !form.active)}
                className={`relative w-10 h-5 rounded-full transition-colors ${
                  form.active ? 'bg-emerald-500' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                    form.active ? 'translate-x-5' : ''
                  }`}
                />
              </div>
              <span className="text-sm text-slate-700 font-medium">
                {form.active ? 'Sala ativa' : 'Sala inativa'}
              </span>
            </label>

            <div className="flex gap-2 pt-1">
              <button
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 disabled:opacity-50 transition-colors"
                disabled={saving}
              >
                {saving ? <RefreshCw size={14} className="animate-spin" /> : isEditing ? <Pencil size={14} /> : <Plus size={14} />}
                {saving ? 'Salvando…' : isEditing ? 'Atualizar sala' : 'Criar sala'}
              </button>
              {isEditing && (
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium px-4 py-2 transition-colors"
                  onClick={resetForm}
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>

        {/* ── TABELA ── */}
        <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b bg-slate-50">
            <Building2 size={16} className="text-slate-500" />
            <span className="font-semibold text-slate-700 text-sm">
              {loading ? 'Carregando…' : `${rooms.length} sala${rooms.length !== 1 ? 's' : ''} cadastrada${rooms.length !== 1 ? 's' : ''}`}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500 bg-slate-50/60">
                  <th className="px-5 py-3">Sala</th>
                  <th className="px-5 py-3">Capacidade</th>
                  <th className="px-5 py-3">Horário</th>
                  <th className="px-5 py-3">Dias</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rooms.map((room) => (
                  <tr key={room.id} className="hover:bg-slate-50/50 transition-colors align-top">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="rounded-lg bg-blue-50 border border-blue-100 p-1.5">
                          <Building2 size={14} className="text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium text-slate-800">{room.name}</div>
                          {room.description && <div className="text-xs text-slate-500">{room.description}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      {room.capacity ? (
                        <div className="inline-flex items-center gap-1 text-slate-700">
                          <Users size={13} className="text-slate-400" /> {room.capacity}
                        </div>
                      ) : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-5 py-3">
                      <div className="inline-flex items-center gap-1 text-slate-700">
                        <Clock size={13} className="text-slate-400" />
                        {String(room.available_start_time).slice(0, 5)} – {String(room.available_end_time).slice(0, 5)}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1">
                        {DAY_OPTIONS.map((d) => (
                          <span
                            key={d.value}
                            className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                              room.available_days?.includes(d.value)
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-slate-100 text-slate-400'
                            }`}
                          >
                            {d.label}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      {room.active ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 size={11} /> Ativa
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                          <XCircle size={11} /> Inativa
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => { editRoom(room); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                          className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-medium px-2.5 py-1.5 transition-colors"
                        >
                          <Pencil size={12} /> Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => removeRoom(room.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-medium px-2.5 py-1.5 transition-colors"
                        >
                          <Trash2 size={12} /> Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && rooms.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                      <Building2 size={36} className="mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Nenhuma sala cadastrada.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PageAccessGuard>
  )
}
