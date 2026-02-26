'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  QrCode,
  UserCheck,
  Search,
  X,
  CheckCircle2,
  LogOut,
  RefreshCw,
  Calendar,
  Clock,
  Users,
  Baby,
  ClipboardList,
  Heart,
  Eye,
  ShieldCheck,
  UserCircle2,
} from 'lucide-react'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { AdminPageHeader } from '@/app/admin/AdminPageHeader'
import { adminFetchJson } from '@/lib/admin-client'
import { siteConfig } from '@/config/site'
import { CustomSelect } from '@/components/ui/CustomSelect'
import { DatePickerInput } from '@/components/ui/DatePickerInput'
import Link from 'next/link'

// ── Tipos ───────────────────────────────────────────────────────────────────

interface Child {
  id: string
  full_name: string
  birth_date: string | null
}

interface GuardianOption {
  id: string
  full_name: string
  relationship_type: string
}

interface Checkin {
  id: string
  child_id: string
  service_id: string
  service_name: string
  checked_in_at: string
  checked_out_at: string | null
  registered_by: string | null
  registered_by_name: string | null
  notes: string | null
  guardian_id: string | null
  guardian_name: string | null
  child: { id: string; full_name: string; birth_date: string | null } | null
}

interface Service {
  id: string
  name: string
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function calcAge(birthDate: string | null): string {
  if (!birthDate) return '—'
  const [y, m, d] = birthDate.split('-').map(Number)
  const today = new Date()
  let age = today.getFullYear() - y
  if (today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d)) age--
  if (age < 1) {
    const months = (today.getFullYear() - y) * 12 + (today.getMonth() + 1 - m)
    return `${months}m`
  }
  return `${age} anos`
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function todayISO(): string {
  return new Date().toISOString().substring(0, 10)
}

// ── Modal de detalhes do check-in ──────────────────────────────────────────

function CheckinDetailModal({
  checkin,
  onClose,
}: {
  checkin: Checkin
  onClose: () => void
}) {
  const duration = (() => {
    if (!checkin.checked_out_at) return null
    const diff = new Date(checkin.checked_out_at).getTime() - new Date(checkin.checked_in_at).getTime()
    const h = Math.floor(diff / 3600000)
    const m = Math.floor((diff % 3600000) / 60000)
    return h > 0 ? `${h}h ${m}min` : `${m}min`
  })()

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 bg-[#c62737] text-white">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <ShieldCheck size={17} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm leading-tight">Detalhes do Check-in</p>
            <p className="text-xs text-white/70 mt-0.5 truncate">{checkin.child?.full_name ?? '—'}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Corpo */}
        <div className="px-6 py-5 space-y-4">

          {/* Criança */}
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-[#c62737]/5 border border-[#c62737]/15">
            <div className="w-10 h-10 rounded-full bg-[#c62737]/15 flex items-center justify-center shrink-0">
              <Baby size={18} className="text-[#c62737]" />
            </div>
            <div>
              <p className="font-bold text-slate-800 text-sm">{checkin.child?.full_name ?? '—'}</p>
              {checkin.child?.birth_date && (
                <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                  <Calendar size={10} />
                  {new Date(checkin.child.birth_date + 'T12:00:00').toLocaleDateString('pt-BR')} &middot; {calcAge(checkin.child.birth_date)}
                </p>
              )}
            </div>
          </div>

          {/* Grade de dados */}
          <div className="grid grid-cols-2 gap-3">
            <InfoCard icon={<Clock size={13} />} label="Entrada" value={
              new Date(checkin.checked_in_at).toLocaleString('pt-BR', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })
            } accent />
            <InfoCard icon={<LogOut size={13} />} label="Saída" value={
              checkin.checked_out_at
                ? new Date(checkin.checked_out_at).toLocaleString('pt-BR', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })
                : 'Ainda presente'
            } />
            {duration && (
              <InfoCard icon={<Clock size={13} />} label="Duração" value={duration} />
            )}
            <InfoCard icon={<ClipboardList size={13} />} label="Culto" value={checkin.service_name} />
          </div>

          {/* Responsável */}
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
              <UserCircle2 size={11} /> Quem trouxe a criança
            </p>
            <p className="text-sm font-semibold text-slate-700">
              {checkin.guardian_name ?? <span className="text-slate-400 font-normal">Não informado</span>}
            </p>
          </div>

          {/* Observações */}
          {checkin.notes && (
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Observações</p>
              <p className="text-sm text-slate-600 bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2.5 italic">
                {checkin.notes}
              </p>
            </div>
          )}

          {/* Auditoria */}
          <div className="pt-2 border-t border-slate-100 space-y-1.5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <ShieldCheck size={11} /> Auditoria
            </p>
            <AuditRow label="Registrado por" value={checkin.registered_by_name ?? '—'} />
            <AuditRow label="Data do registro" value={
              new Date(checkin.checked_in_at).toLocaleString('pt-BR', {
                weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })
            } />
            <AuditRow label="ID do registro" value={checkin.id} mono />
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoCard({
  icon, label, value, accent = false,
}: {
  icon: React.ReactNode
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div className={`rounded-xl border p-3 ${
      accent ? 'border-emerald-200 bg-emerald-50' : 'border-slate-100 bg-slate-50'
    }`}>
      <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 flex items-center gap-1 ${
        accent ? 'text-emerald-600' : 'text-slate-400'
      }`}>{icon}{label}</p>
      <p className={`text-xs font-semibold leading-snug ${
        accent ? 'text-emerald-700' : 'text-slate-700'
      }`}>{value}</p>
    </div>
  )
}

function AuditRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 text-xs">
      <span className="text-slate-400 shrink-0">{label}</span>
      <span className={`text-slate-600 font-medium text-right ${mono ? 'font-mono text-[10px] break-all' : ''}`}>{value}</span>
    </div>
  )
}

// ── Componente principal ────────────────────────────────────────────────────

export default function KidsCheckinPage() {
  // ─ estado geral
  const [services] = useState<Service[]>(
    siteConfig.services.map((s) => ({ id: s.id, name: s.name }))
  )
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [dateFilter, setDateFilter] = useState<string>(todayISO())

  // ─ busca de crianças
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Child[]>([])
  const [searching, setSearching] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // ─ formulário de check-in
  const [selectedChild, setSelectedChild] = useState<Child | null>(null)
  const [guardians, setGuardians] = useState<GuardianOption[]>([])
  const [selectedGuardianId, setSelectedGuardianId] = useState<string>('')
  const [loadingGuardians, setLoadingGuardians] = useState(false)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // ─ lista de check-ins
  const [checkins, setCheckins] = useState<Checkin[]>([])
  const [loadingCheckins, setLoadingCheckins] = useState(false)
  const [detailCheckin, setDetailCheckin] = useState<Checkin | null>(null)

  // ─ Carregar check-ins ao mudar filtros ────────────────────────────────────
  const loadCheckins = useCallback(async () => {
    if (!selectedService) return
    setLoadingCheckins(true)
    try {
      const params = new URLSearchParams({
        service_id: selectedService.id,
        date: dateFilter,
      })
      const data = await adminFetchJson<{ checkins: Checkin[] }>(
        `/api/admin/kids-checkin?${params}`
      )
      setCheckins(data.checkins ?? [])
    } catch {
      setCheckins([])
    } finally {
      setLoadingCheckins(false)
    }
  }, [selectedService, dateFilter])

  useEffect(() => {
    loadCheckins()
  }, [loadCheckins])

  // ─ Busca de crianças (debounce 300ms) ─────────────────────────────────────
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([])
      return
    }
    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const data = await adminFetchJson<{ children: Child[] }>(
          `/api/admin/kids-checkin/children?q=${encodeURIComponent(searchQuery)}`
        )
        setSearchResults(data.children ?? [])
      } catch {
        setSearchResults([])
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // fechar dropdown ao clicar fora
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        searchRef.current &&
        !searchRef.current.contains(e.target as Node)
      ) {
        setSearchResults([])
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  // ─ Selecionar criança ─────────────────────────────────────────────────────
  async function selectChild(child: Child) {
    setSelectedChild(child)
    setSearchQuery('')
    setSearchResults([])
    setSaveError(null)
    setSaveSuccess(false)
    setGuardians([])
    setSelectedGuardianId('')
    // busca os responsáveis vinculados
    setLoadingGuardians(true)
    try {
      const data = await adminFetchJson<{ guardians: GuardianOption[] }>(
        `/api/admin/kids-checkin/children/${child.id}/guardians`
      )
      const list = data.guardians ?? []
      setGuardians(list)
      // auto-seleciona se houver apenas um
      if (list.length === 1) setSelectedGuardianId(list[0].id)
    } catch {
      setGuardians([])
    } finally {
      setLoadingGuardians(false)
    }
  }

  function clearChild() {
    setSelectedChild(null)
    setGuardians([])
    setSelectedGuardianId('')
    setNotes('')
    setSaveError(null)
    setSaveSuccess(false)
  }

  // ─ Registrar check-in ─────────────────────────────────────────────────────
  async function handleCheckin() {
    if (!selectedChild || !selectedService) return
    setSaving(true)
    setSaveError(null)
    setSaveSuccess(false)
    try {
      const guardian = guardians.find((g) => g.id === selectedGuardianId) ?? null
      await adminFetchJson('/api/admin/kids-checkin', {
        method: 'POST',
        body: JSON.stringify({
          child_id: selectedChild.id,
          service_id: selectedService.id,
          service_name: selectedService.name,
          notes: notes.trim() || null,
          guardian_id: guardian?.id ?? null,
          guardian_name: guardian?.full_name ?? null,
        }),
      })
      setSaveSuccess(true)
      clearChild()
      loadCheckins()
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Erro ao registrar check-in.')
    } finally {
      setSaving(false)
    }
  }

  // ─ Registrar checkout ─────────────────────────────────────────────────────
  async function handleCheckout(checkinId: string) {
    try {
      await adminFetchJson(`/api/admin/kids-checkin/${checkinId}`, {
        method: 'PATCH',
        body: JSON.stringify({ checked_out_at: new Date().toISOString() }),
      })
      loadCheckins()
    } catch {
      // silently fail — usuário pode usar refresh
    }
  }

  // ─ Remover check-in ───────────────────────────────────────────────────────
  // ─ estatística rápida ─────────────────────────────────────────────────────
  const totalPresent = checkins.filter((c) => !c.checked_out_at).length
  const totalCheckout = checkins.filter((c) => !!c.checked_out_at).length

  // ─ JSX ────────────────────────────────────────────────────────────────────
  return (
    <PageAccessGuard pageKey="pessoas">
      <div className="p-6 md:p-8 max-w-6xl mx-auto">
        <AdminPageHeader
          icon={UserCheck}
          title="Check-in Sara Kids"
          subtitle="Registre a presença das crianças nos cultos"
          backLink={{ href: '/admin/sara-kids', label: 'Voltar ao Sara Kids' }}
          actions={
            <Link
              href="/admin/sara-kids/presentes"
              className="flex items-center gap-2 rounded-xl bg-[#c62737]/10 border border-[#c62737]/20 px-4 py-2
                         text-xs font-semibold text-[#c62737] hover:bg-[#c62737]/20 transition-colors"
            >
              <Heart size={14} /> Ver presentes
            </Link>
          }
        />

        {/* ─ Filtros — culto + data ────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Configuração do culto</p>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Culto <span className="text-[#c62737]">*</span>
              </label>
              <CustomSelect
                value={selectedService?.id ?? ''}
                onChange={(id) => {
                  const svc = services.find((s) => s.id === id) ?? null
                  setSelectedService(svc)
                }}
                options={services.map((s) => ({ value: s.id, label: s.name }))}
                placeholder="Selecione o culto…"
                allowEmpty={false}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Data</label>
              <DatePickerInput
                value={dateFilter}
                onChange={(v) => setDateFilter(v || todayISO())}
              />
            </div>
          </div>
        </div>

        {selectedService ? (
          <>
            {/* ─ Stats + Painel de registro ───────────────────────────────── */}
            <div className="grid gap-5 lg:grid-cols-3 mb-6">

              {/* Card: Presentes */}
              <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                  <Users size={22} className="text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Presentes</p>
                  <p className="text-3xl font-bold text-emerald-700 leading-none mt-0.5">{totalPresent}</p>
                </div>
              </div>

              {/* Card: Saídas */}
              <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                  <LogOut size={22} className="text-slate-500" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Saídas</p>
                  <p className="text-3xl font-bold text-slate-700 leading-none mt-0.5">{totalCheckout}</p>
                </div>
              </div>

              {/* Card: Culto selecionado */}
              <div className="rounded-xl border border-[#c62737]/20 bg-gradient-to-br from-[#c62737]/5 to-white p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#c62737]/10 flex items-center justify-center shrink-0">
                  <Heart size={22} className="text-[#c62737]" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[#c62737] uppercase tracking-wide">Culto</p>
                  <p className="text-sm font-bold text-slate-800 leading-tight mt-0.5 truncate">{selectedService.name}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                    <Calendar size={10} />
                    {new Date(dateFilter + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
                  </p>
                </div>
              </div>
            </div>

            {/* ─ Painel de registro ───────────────────────────────────────── */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm mb-8">
              {/* Header do painel */}
              <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50/60 rounded-t-xl overflow-hidden">
                <div className="w-9 h-9 rounded-xl bg-[#c62737]/10 flex items-center justify-center shrink-0">
                  <QrCode size={17} className="text-[#c62737]" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800 text-sm">Registrar Check-in</p>
                  <p className="text-xs text-slate-500">{selectedService.name}</p>
                </div>
              </div>

              <div className="p-6">
                {/* Busca de criança */}
                {!selectedChild ? (
                  <div className="relative">
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Buscar criança
                    </label>
                    <div className="relative">
                      <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        ref={searchRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Digite o nome da criança…"
                        className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-9 text-sm text-slate-800
                                   focus:border-[#c62737] focus:ring-2 focus:ring-[#c62737]/20 outline-none transition-all
                                   placeholder:text-slate-400"
                      />
                      {searching && (
                        <RefreshCw size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />
                      )}
                    </div>

                    {/* Dropdown de resultados */}
                    {searchResults.length > 0 && (
                      <div
                        ref={dropdownRef}
                        className="absolute z-20 mt-2 w-full rounded-2xl border-2 border-slate-200 bg-white shadow-[0_25px_50px_-12px_rgba(15,23,42,0.2)] overflow-hidden"
                      >
                        {searchResults.map((child) => (
                          <button
                            key={child.id}
                            type="button"
                            onClick={() => selectChild(child)}
                            className="w-full px-4 py-3 text-left hover:bg-[#c62737]/5 transition-colors flex items-center gap-3 border-b border-slate-50 last:border-0"
                          >
                            <div className="w-8 h-8 rounded-full bg-[#c62737]/10 flex items-center justify-center shrink-0">
                              <Baby size={15} className="text-[#c62737]" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-medium text-slate-800 block leading-tight">{child.full_name}</span>
                              <span className="text-xs text-slate-400">{calcAge(child.birth_date)}</span>
                            </div>
                            <CheckCircle2 size={14} className="text-slate-200 shrink-0" />
                          </button>
                        ))}
                      </div>
                    )}

                    {searchQuery.length >= 2 && searchResults.length === 0 && !searching && (
                      <div className="mt-3 flex flex-col items-center py-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        <Baby size={24} className="text-slate-300 mb-1.5" />
                        <p className="text-xs text-slate-500 font-medium">
                          Nenhuma criança encontrada para &quot;{searchQuery}&quot;
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Criança selecionada */
                  <div>
                    {/* Banner da criança */}
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-[#c62737]/5 border border-[#c62737]/20 mb-5">
                      <div className="w-11 h-11 rounded-full bg-[#c62737]/15 flex items-center justify-center shrink-0">
                        <Baby size={20} className="text-[#c62737]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-800 text-sm leading-tight">{selectedChild.full_name}</p>
                        <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                          <Calendar size={10} />
                          {calcAge(selectedChild.birth_date)}
                        </p>
                      </div>
                      <button
                        onClick={clearChild}
                        className="p-1.5 rounded-lg text-slate-400 hover:bg-[#c62737]/10 hover:text-[#c62737] transition-colors shrink-0"
                        title="Trocar criança"
                      >
                        <X size={15} />
                      </button>
                    </div>

                    {/* Seletor de responsável */}
                    {loadingGuardians ? (
                      <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-100 px-4 py-3 mb-4">
                        <RefreshCw size={13} className="animate-spin shrink-0" />
                        Buscando responsáveis vinculados…
                      </div>
                    ) : guardians.length > 0 ? (
                      <div className="mb-4">
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Quem trouxe a criança? <span className="text-[#c62737]">*</span>
                        </label>
                        <CustomSelect
                          value={selectedGuardianId}
                          onChange={setSelectedGuardianId}
                          options={guardians.map((g) => ({
                            value: g.id,
                            label: g.relationship_type
                              ? `${g.full_name} (${g.relationship_type})`
                              : g.full_name,
                          }))}
                          placeholder="Selecione o responsável…"
                        />
                      </div>
                    ) : null}

                    {/* Observações */}
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Observações <span className="text-slate-400 font-normal">(opcional)</span>
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Ex: alergia, medicação, instrução especial…"
                      rows={3}
                      className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-3.5 text-sm text-slate-800
                                 focus:border-[#c62737] focus:ring-2 focus:ring-[#c62737]/20 outline-none transition-all
                                 resize-none placeholder:text-slate-400 mb-4"
                    />

                    {/* Horário de entrada */}
                    <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-50 rounded-lg px-3 py-2 mb-4 border border-slate-100">
                      <Clock size={12} className="shrink-0" />
                      <span>Entrada: <span className="font-semibold text-slate-600">{fmtDateTime(new Date().toISOString())}</span></span>
                    </div>

                    {saveError && (
                      <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3.5 py-2.5 mb-4 flex items-center gap-2">
                        <X size={13} className="shrink-0" />
                        {saveError}
                      </div>
                    )}

                    <button
                      onClick={handleCheckin}
                      disabled={saving}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#c62737] py-3 text-sm font-bold text-white
                                 hover:bg-[#9e1f2e] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-sm"
                    >
                      {saving ? (
                        <RefreshCw size={15} className="animate-spin" />
                      ) : (
                        <CheckCircle2 size={15} />
                      )}
                      Confirmar Check-in
                    </button>
                  </div>
                )}

                {saveSuccess && (
                  <div className="mt-4 flex items-center gap-2.5 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                    <CheckCircle2 size={16} className="shrink-0" />
                    <span className="text-sm font-semibold">Check-in registrado com sucesso!</span>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-14 text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <Users size={28} className="text-slate-300" />
            </div>
            <p className="text-slate-600 font-semibold">Selecione um culto para começar</p>
            <p className="text-sm text-slate-400 mt-1">Escolha o culto no campo acima para registrar presenças</p>
          </div>
        )}

        {/* ─ Lista de check-ins ───────────────────────────────────────────── */}
        {selectedService && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <ClipboardList size={17} className="text-slate-500" />
                <h2 className="font-bold text-slate-800 text-sm">Registro do Dia</h2>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">
                  {checkins.length}
                </span>
              </div>
              <button
                onClick={loadCheckins}
                disabled={loadingCheckins}
                className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-[#c62737] transition-colors px-3 py-1.5 rounded-lg hover:bg-[#c62737]/5"
              >
                <RefreshCw size={13} className={loadingCheckins ? 'animate-spin' : ''} />
                Atualizar
              </button>
            </div>

            {loadingCheckins ? (
              <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
                <div className="w-6 h-6 rounded-full border-2 border-slate-200 border-t-[#c62737] animate-spin mx-auto mb-2" />
                <p className="text-sm text-slate-400">Carregando registros…</p>
              </div>
            ) : checkins.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center">
                <Baby size={32} className="text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-500">Nenhum check-in registrado nesta data.</p>
                <p className="text-xs text-slate-400 mt-1">Os registros aparecerão aqui assim que forem adicionados.</p>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                {/* versão desktop */}
                <table className="w-full text-sm hidden md:table">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="text-left px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Criança</th>
                      <th className="text-left px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Entrada</th>
                      <th className="text-left px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Saída</th>
                      <th className="text-left px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Responsável</th>
                      <th className="text-left px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Obs.</th>
                      <th className="px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Detalhes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {checkins.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#c62737]/10 flex items-center justify-center shrink-0">
                              <Baby size={14} className="text-[#c62737]" />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800 text-sm leading-tight">{c.child?.full_name ?? '—'}</p>
                              <p className="text-xs text-slate-400">{calcAge(c.child?.birth_date ?? null)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                            <Clock size={10} />{fmtTime(c.checked_in_at)}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          {c.checked_out_at ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 text-xs font-bold border border-slate-200">
                              <LogOut size={10} />{fmtTime(c.checked_out_at)}
                            </span>
                          ) : (
                            <button
                              onClick={() => handleCheckout(c.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-slate-200 text-slate-400
                                         hover:border-[#c62737]/40 hover:text-[#c62737] hover:bg-[#c62737]/5
                                         text-xs font-semibold transition-all"
                            >
                              <LogOut size={10} /> Checkout
                            </button>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-500">{c.guardian_name ?? '—'}</td>
                        <td className="px-5 py-3.5 text-xs text-slate-400 max-w-[140px] truncate" title={c.notes || undefined}>{c.notes || '—'}</td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            onClick={() => setDetailCheckin(c)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium
                                       text-slate-500 border border-slate-200 hover:border-[#c62737]/40
                                       hover:text-[#c62737] hover:bg-[#c62737]/5 transition-all"
                          >
                            <Eye size={12} /> Ver
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* versão mobile — cards */}
                <div className="md:hidden divide-y divide-slate-100">
                  {checkins.map((c) => (
                    <div key={c.id} className="px-4 py-4 flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#c62737]/10 flex items-center justify-center shrink-0">
                        <Baby size={17} className="text-[#c62737]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-800 text-sm leading-tight">{c.child?.full_name ?? '—'}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{calcAge(c.child?.birth_date ?? null)}</p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                            <Clock size={10} />{fmtTime(c.checked_in_at)}
                          </span>
                          {c.checked_out_at ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-xs font-bold border border-slate-200">
                              <LogOut size={10} />{fmtTime(c.checked_out_at)}
                            </span>
                          ) : (
                            <button
                              onClick={() => handleCheckout(c.id)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-slate-200 text-slate-400
                                         hover:border-[#c62737]/40 hover:text-[#c62737] hover:bg-[#c62737]/5
                                         text-xs font-semibold transition-all"
                            >
                              <LogOut size={10} /> Checkout
                            </button>
                          )}
                        </div>
                        {c.guardian_name && (
                          <p className="text-[11px] text-slate-500 mt-1.5">
                            Responsável: <span className="font-semibold">{c.guardian_name}</span>
                          </p>
                        )}
                        {c.notes && <p className="text-xs text-slate-500 mt-1.5 italic bg-slate-50 rounded-lg px-2 py-1">{c.notes}</p>}
                        <p className="text-[11px] text-slate-400 mt-1.5">Por: {c.registered_by_name ?? '—'}</p>
                      </div>
                      <button
                        onClick={() => setDetailCheckin(c)}
                        className="p-2 rounded-xl border border-slate-200 text-slate-400
                                   hover:border-[#c62737]/40 hover:text-[#c62737] hover:bg-[#c62737]/5
                                   transition-all shrink-0"
                        title="Ver detalhes"
                      >
                        <Eye size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─ Modal de detalhes ──────────────────────────────────────────── */}
      {detailCheckin && (
        <CheckinDetailModal
          checkin={detailCheckin}
          onClose={() => setDetailCheckin(null)}
        />
      )}
    </PageAccessGuard>
  )
}
