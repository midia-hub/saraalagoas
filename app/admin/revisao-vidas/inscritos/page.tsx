'use client'

import { useState, useEffect, useCallback } from 'react'
import { adminFetchJson } from '@/lib/admin-client'
import type { ReviewRegistrationEnriched } from '@/lib/consolidacao-types'
import { REVIEW_REG_STATUS_LABELS, REVIEW_REG_STATUS_COLORS, REVIEW_FLOW_STATUS_LABELS, REVIEW_FLOW_STATUS_COLORS } from '@/lib/consolidacao-types'
import {
  Loader2, RefreshCw, CheckCircle2, XCircle, Check,
  Search, Users, UserCheck, X, ClipboardList, ExternalLink, Link2, ClipboardCheck, Plus, Printer, QrCode, AlertTriangle,
} from 'lucide-react'
import Link from 'next/link'
import { AdminPageHeader } from '@/app/admin/AdminPageHeader'
import { RevisaoInscricaoModal } from '../RevisaoInscricaoModal'
import { ValidarPagamentoModal } from '../ValidarPagamentoModal'
import { RemoveInscricaoModal } from './RemoveInscricaoModal'

type ReviewEvent = {
  id: string
  name: string
  start_date: string
  end_date?: string
  active: boolean
  church_id?: string
  created_at?: string
  updated_at?: string
}

export default function RevisaoVidasInscritosPage() {
  const [regs, setRegs] = useState<ReviewRegistrationEnriched[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [copiedRegId, setCopiedRegId] = useState<string | null>(null)
  const [inscricaoModalOpen, setInscricaoModalOpen] = useState(false)
  const [events, setEvents] = useState<ReviewEvent[]>([])
  const [pagamentoModalOpen, setPagamentoModalOpen] = useState(false)
  const [pagamentoRegId, setPagamentoRegId] = useState<string>('')
  const [removeModalOpen, setRemoveModalOpen] = useState(false)
  const [removeRegId, setRemoveRegId] = useState<string>('')
  const [removePersonName, setRemovePersonName] = useState('')
  const [removeEventName, setRemoveEventName] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [showPrintLabels, setShowPrintLabels] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    setLoadError(null)
    Promise.all([
      adminFetchJson('/api/admin/consolidacao/revisao/registrations').catch((e: Error) => {
        setLoadError(e?.message ?? 'Erro ao carregar inscrições')
        return { registrations: [] }
      }),
      adminFetchJson('/api/admin/consolidacao/revisao/events').catch(() => ({ events: [] })),
    ])
      .then(([regsData, eventsData]: any) => {
        setRegs(regsData.registrations ?? regsData.items ?? [])
        setEvents(eventsData.events ?? eventsData.items ?? [])
      })
      .finally(() => setLoading(false))
  }, [])

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

  function openRemoveModal(regId: string, personName: string, eventName: string) {
    setRemoveRegId(regId)
    setRemovePersonName(personName)
    setRemoveEventName(eventName)
    setRemoveModalOpen(true)
  }

  async function confirmRemove() {
    try {
      await adminFetchJson(`/api/admin/consolidacao/revisao/registrations/${removeRegId}`, { method: 'DELETE' })
      setRemoveModalOpen(false)
      load()
    } catch (e) {
      console.error(e)
      throw e
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

  function getPersonName(r: ReviewRegistrationEnriched) {
    const name = (r.person?.full_name || (r as any).person_name || (r as any).full_name || '').trim()
    return name && name !== '—' ? name : '—'
  }

  const filtered = regs.filter(r =>
    !search ||
    getPersonName(r).toLowerCase().includes(search.toLowerCase()) ||
    r.person?.mobile_phone?.includes(search) ||
    r.event?.name?.toLowerCase().includes(search.toLowerCase())
  )

  const selectedRegs = regs.filter((r) => selectedIds.includes(r.id))
  const allVisibleSelected = filtered.length > 0 && filtered.every((r) => selectedIds.includes(r.id))

  function toggleSelection(regId: string) {
    setSelectedIds((prev) => (prev.includes(regId) ? prev.filter((id) => id !== regId) : [...prev, regId]))
  }

  function toggleSelectAllVisible() {
    if (allVisibleSelected) {
      const visibleSet = new Set(filtered.map((r) => r.id))
      setSelectedIds((prev) => prev.filter((id) => !visibleSet.has(id)))
      return
    }

    const merged = new Set(selectedIds)
    filtered.forEach((r) => merged.add(r.id))
    setSelectedIds(Array.from(merged))
  }

  function getPublicInfoLink(token: string | null | undefined) {
    return getPublicFormLink(token)
  }

  function getQrSrc(url: string) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(url)}`
  }

  function handleGeneratePdf() {
    if (selectedRegs.length === 0) return
    setShowPrintLabels(true)
    setTimeout(() => {
      window.print()
    }, 250)
  }

  const statusCounts = {
    total:    filtered.length,
    inscrito: filtered.filter(r => r.status === 'inscrito').length,
    concluiu: filtered.filter(r => r.status === 'concluiu').length,
  }

  // Contar inscrições por critério de fluxo
  const flowCounts = {
    preRevisaoCompleted: filtered.filter(r => r.pre_revisao_aplicado).length,
    pagamentoPendente: filtered.filter(r => r.payment_status === 'pending' || !r.payment_status).length,
    pagamentoValidado: filtered.filter(r => r.payment_status === 'validated').length,
    anamneseCompleted: filtered.filter(r => r.anamnese_completed).length,
    confirmado: filtered.filter(r => 
      r.pre_revisao_aplicado && 
      r.payment_status === 'validated' && 
      r.anamnese_completed
    ).length,
  }

  const stats = [
    {
      label: 'Total',
      value: statusCounts.total,
      icon: Users,
      color: 'text-slate-700',
      bg: 'bg-slate-100',
      ring: 'ring-slate-200',
    },
    {
      label: 'Inscritos',
      value: statusCounts.inscrito,
      icon: ClipboardList,
      color: 'text-blue-700',
      bg: 'bg-blue-50',
      ring: 'ring-blue-100',
    },
    {
      label: 'Concluíram',
      value: statusCounts.concluiu,
      icon: UserCheck,
      color: 'text-green-700',
      bg: 'bg-green-50',
      ring: 'ring-green-100',
    },
  ]

  const countLabel = loading
    ? 'Carregando…'
    : filtered.length === 1
      ? '1 inscrição'
      : `${filtered.length} inscrições`

  return (
    <div className="rv-no-print p-6 md:p-8 space-y-5 sm:space-y-6">
      {/* Header */}
      <AdminPageHeader
        icon={Users}
        title="Inscritos — Revisão de Vidas"
        subtitle="Acompanhamento de inscrições em todos os eventos"
        backLink={{ href: '/admin/revisao-vidas', label: 'Voltar aos eventos' }}
        actions={
          <div className="flex gap-2">
            <button
              onClick={handleGeneratePdf}
              disabled={selectedRegs.length === 0}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
              title={selectedRegs.length === 0 ? 'Selecione inscritos para gerar etiquetas' : 'Gerar etiquetas em PDF (A4)'}
            >
              <Printer className="w-4 h-4" />
              Etiquetas PDF ({selectedRegs.length})
            </button>
            <button
              onClick={() => setInscricaoModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-purple-600 text-white px-4 py-2 text-sm font-medium shadow-sm transition hover:bg-purple-700 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              Nova Inscrição
            </button>
            <button
              onClick={load}
              disabled={loading}
              title="Recarregar"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-800 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map(s => (
          <div
            key={s.label}
            className={`flex items-center gap-3 rounded-xl border bg-white p-3.5 sm:p-4 shadow-sm ring-1 ${s.ring}`}
          >
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${s.bg}`}>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <div>
              <div className={`text-xl font-bold leading-none ${s.color}`}>{loading ? '—' : s.value}</div>
              <div className="mt-1 text-xs font-medium text-slate-500">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Fluxo Status Cards */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50">
          <h3 className="font-bold text-slate-900">Progresso do Fluxo</h3>
          <p className="text-xs text-slate-500 mt-0.5">Critérios obrigatórios para confirmação</p>
        </div>
        <div className="divide-y divide-slate-100">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-5">
            {/* Pré-Revisão */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-purple-700">1</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">Pré-Revisão</p>
                  <p className="text-xs text-slate-500">Obrigatório</p>
                </div>
              </div>
              <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                <div className="text-2xl font-bold text-purple-700">{loading ? '—' : flowCounts.preRevisaoCompleted}</div>
                <div className="text-xs text-purple-600">{statusCounts.total > 0 ? Math.round((flowCounts.preRevisaoCompleted / statusCounts.total) * 100) : 0}% concluído</div>
              </div>
            </div>

            {/* Pagamento */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-green-700">2</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">Pagamento</p>
                  <p className="text-xs text-slate-500">Validado</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-amber-50 rounded-lg p-2 border border-amber-200">
                  <div className="text-sm font-bold text-amber-700">{loading ? '—' : flowCounts.pagamentoPendente}</div>
                  <div className="text-[10px] text-amber-600">Pendente</div>
                </div>
                <div className="bg-green-50 rounded-lg p-2 border border-green-200">
                  <div className="text-sm font-bold text-green-700">{loading ? '—' : flowCounts.pagamentoValidado}</div>
                  <div className="text-[10px] text-green-600">Validado</div>
                </div>
              </div>
            </div>

            {/* Anamnese */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-blue-700">3</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">Anamnese</p>
                  <p className="text-xs text-slate-500">Preenchida</p>
                </div>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                <div className="text-2xl font-bold text-blue-700">{loading ? '—' : flowCounts.anamneseCompleted}</div>
                <div className="text-xs text-blue-600">{statusCounts.total > 0 ? Math.round((flowCounts.anamneseCompleted / statusCounts.total) * 100) : 0}% concluído</div>
              </div>
            </div>
          </div>
          
          {/* Confirmados */}
          <div className="px-5 py-4 bg-emerald-50/50 border-t border-emerald-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-emerald-900">✓ Inscrições Confirmadas</p>
                <p className="text-xs text-emerald-700">Todos os critérios atendidos</p>
              </div>
              <div className="text-3xl font-bold text-emerald-700">{loading ? '—' : flowCounts.confirmado}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Table card — busca integrada no cabeçalho */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Toolbar: search + count */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome, telefone ou evento…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-8 text-sm text-slate-800 placeholder-slate-400 transition focus:border-[#c62737]/40 focus:outline-none focus:ring-2 focus:ring-[#c62737]/15"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {/* Count */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-sm font-semibold text-slate-700">{countLabel}</span>
            {search && !loading && (
              <span className="text-xs text-slate-400">de {regs.length}</span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={toggleSelectAllVisible}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              <ClipboardCheck className="w-3.5 h-3.5" />
              {allVisibleSelected ? 'Desmarcar visíveis' : 'Selecionar visíveis'}
            </button>
            {selectedIds.length > 0 && (
              <button
                onClick={() => setSelectedIds([])}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Limpar seleção
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="text-sm">Carregando inscrições…</span>
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-rose-500">
            <AlertTriangle className="w-7 h-7" />
            <p className="text-sm font-medium">{loadError}</p>
            <button onClick={load} className="text-xs text-[#c62737] hover:underline">Tentar novamente</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-400">
            <Users className="w-8 h-8 opacity-40" />
            <p className="text-sm font-medium">
              {search ? 'Nenhuma inscrição encontrada para esta busca.' : 'Nenhuma inscrição ainda.'}
            </p>
            {search && (
              <button onClick={() => setSearch('')} className="mt-1 text-xs text-[#c62737] hover:underline">
                Limpar busca
              </button>
            )}
          </div>
        ) : (
          <>
            {/* ── Mobile: card list ─────────────────────── */}
            <div className="divide-y divide-slate-100 md:hidden">
              {filtered.map(r => {
                const ActionButtons = (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => toggleSelection(r.id)}
                      title={selectedIds.includes(r.id) ? 'Remover da seleção' : 'Selecionar para etiqueta'}
                      className={`rounded-lg p-1.5 transition-colors ${selectedIds.includes(r.id) ? 'bg-purple-100 text-purple-700' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
                    >
                      <ClipboardCheck className="w-4 h-4" />
                    </button>
                    {updating === r.id ? (
                      <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                    ) : (
                      <>
                        {r.status !== 'concluiu' && (
                          <button
                            onClick={() => updateStatus(r.id, 'concluiu')}
                            title="Marcar como Concluiu"
                            className="rounded-lg p-1.5 text-green-600 transition-colors hover:bg-green-50"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => openRemoveModal(r.id, r.person?.full_name ?? 'Desconhecido', r.event?.name ?? 'Desconhecido')}
                          title="Remover inscrição"
                          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                )
                return (
                  <div key={r.id} className="flex flex-col gap-2 px-4 py-4">
                    {/* Row 1: name + actions */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold text-slate-800 text-sm leading-snug">
                          {getPersonName(r)}
                        </div>
                        {r.person?.mobile_phone && (
                          <div className="mt-0.5 text-xs text-slate-400">{r.person.mobile_phone}</div>
                        )}
                      </div>
                      {ActionButtons}
                    </div>
                    {/* Row 2: event + status */}
                    <div className="flex items-center justify-between gap-2">
                      <Link
                        href={`/admin/revisao-vidas/${r.event_id}`}
                        className="text-sm font-medium text-[#c62737] hover:underline truncate"
                      >
                        {r.event?.name ?? '—'}
                      </Link>
                      <span
                        className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                          REVIEW_REG_STATUS_COLORS[r.status] ?? 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                        {REVIEW_REG_STATUS_LABELS[r.status] ?? r.status}
                      </span>
                    </div>
                    {/* Row 3: leader */}
                    {(r.leader?.full_name || (r as any).leader_name_text) && (
                      <div className="text-xs text-slate-400">Líder: {r.leader?.full_name || (r as any).leader_name_text}</div>
                    )}
                    {(r as any).team_name && (
                      <div className="text-xs text-slate-400 uppercase tracking-tighter">Equipe: {(r as any).team_name}</div>
                    )}
                    <div className="flex items-center gap-2">
                      <a
                        href={getPublicFormLink(r.anamnese_token)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-1 text-xs rounded-md px-2 py-1 border ${r.anamnese_token ? 'text-blue-700 border-blue-200 bg-blue-50' : 'text-slate-300 border-slate-200 bg-slate-50 pointer-events-none'}`}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Abrir formulário
                      </a>
                      <button
                        onClick={() => copyPublicFormLink(r.id, r.anamnese_token)}
                        disabled={!r.anamnese_token}
                        className={`inline-flex items-center gap-1 text-xs rounded-md px-2 py-1 border ${r.anamnese_token ? 'text-slate-700 border-slate-200 bg-white' : 'text-slate-300 border-slate-200 bg-slate-50 cursor-not-allowed'}`}
                      >
                        {copiedRegId === r.id ? <ClipboardCheck className="w-3.5 h-3.5 text-emerald-600" /> : <Link2 className="w-3.5 h-3.5" />}
                        {copiedRegId === r.id ? 'Copiado' : 'Copiar link'}
                      </button>
                    </div>
                    {r.anamnese_completed_at && (
                      <div className="text-[11px] text-emerald-700">Anamnese preenchida</div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* ── Desktop: table ────────────────────────── */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <th className="px-3 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={toggleSelectAllVisible}
                        className="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                        title={allVisibleSelected ? 'Desmarcar visíveis' : 'Selecionar visíveis'}
                      />
                    </th>
                    <th className="px-5 py-3 text-left">Pessoa</th>
                    <th className="px-5 py-3 text-left">Evento</th>
                    <th className="px-5 py-3 text-left">Líder</th>
                    <th className="px-5 py-3 text-left">Anamnese</th>
                    <th className="px-5 py-3 text-left">Pagamento</th>
                    <th className="px-5 py-3 text-center">Status</th>
                    <th className="px-5 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map(r => (
                    <tr key={r.id} className="group transition-colors hover:bg-slate-50/60">
                      <td className="px-3 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(r.id)}
                          onChange={() => toggleSelection(r.id)}
                          className="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                          title={selectedIds.includes(r.id) ? 'Remover da seleção' : 'Selecionar para etiqueta'}
                        />
                      </td>
                      {/* Pessoa */}
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-slate-800 leading-snug">
                          {getPersonName(r)}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                          {r.person?.mobile_phone && (
                            <div className="text-xs text-slate-400">{r.person.mobile_phone}</div>
                          )}
                          {(r as any).team_name && (
                            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-tight bg-slate-100 px-1.5 rounded">
                              {(r as any).team_name}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Evento */}
                      <td className="px-5 py-3.5">
                        <Link
                          href={`/admin/revisao-vidas/${r.event_id}`}
                          className="font-medium text-[#c62737] hover:underline hover:text-[#a01e2a] transition-colors"
                        >
                          {r.event?.name ?? '—'}
                        </Link>
                      </td>

                      {/* Líder */}
                      <td className="px-5 py-3.5 text-slate-500 text-sm">
                        {r.leader?.full_name || (r as any).leader_name_text || <span className="text-slate-300">—</span>}
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <a
                            href={getPublicFormLink(r.anamnese_token)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`inline-flex items-center gap-1 text-xs font-medium rounded-md px-2 py-1 border ${r.anamnese_token ? 'text-blue-700 border-blue-200 bg-blue-50 hover:bg-blue-100' : 'text-slate-400 border-slate-200 bg-slate-50 pointer-events-none'}`}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Abrir
                          </a>
                          <button
                            onClick={() => copyPublicFormLink(r.id, r.anamnese_token)}
                            disabled={!r.anamnese_token}
                            className={`inline-flex items-center gap-1 text-xs font-medium rounded-md px-2 py-1 border ${r.anamnese_token ? 'text-slate-700 border-slate-200 bg-white hover:bg-slate-50' : 'text-slate-300 border-slate-200 bg-slate-50 cursor-not-allowed'}`}
                          >
                            {copiedRegId === r.id ? <ClipboardCheck className="w-3.5 h-3.5 text-emerald-600" /> : <Link2 className="w-3.5 h-3.5" />}
                            {copiedRegId === r.id ? 'Copiado' : 'Copiar'}
                          </button>
                        </div>
                        {r.anamnese_completed_at && (
                          <div className="mt-1 text-[11px] text-emerald-700">Preenchida</div>
                        )}
                      </td>

                      {/* Pagamento */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          {!r.payment_status || r.payment_status === 'pending' ? (
                            <button
                              onClick={() => {
                                setPagamentoRegId(r.id)
                                setPagamentoModalOpen(true)
                              }}
                              disabled={(r as any).calculated_status === 'bloqueado'}
                              className="inline-flex items-center gap-1 text-xs font-medium rounded-md px-2 py-1 border text-amber-700 border-amber-200 bg-amber-50 hover:bg-amber-100 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              📋 Validar
                            </button>
                          ) : r.payment_status === 'validated' ? (
                            <div className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-700">
                              <Check className="w-3.5 h-3.5" />
                              Validado
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-rose-100 text-rose-700">
                              Cancelado
                            </div>
                          )}
                        </div>
                        {r.payment_date && (
                          <div className="mt-1 text-[11px] text-slate-500">
                            {new Date(r.payment_date).toLocaleDateString('pt-BR')}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3.5 text-center">
                        {(() => {
                          const flowStatus = (r as any).calculated_status || r.status
                          const isBlocked = flowStatus === 'bloqueado'
                          const inFlowMode = ['aguardando_pre_revisao', 'aguardando_pagamento', 'aguardando_validacao', 'aguardando_anamnese', 'confirmado', 'bloqueado', 'inscrito'].includes(flowStatus)
                          
                          if (inFlowMode) {
                            return (
                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                  REVIEW_FLOW_STATUS_COLORS[flowStatus as any] ?? 'bg-slate-100 text-slate-500'
                                }`}
                              >
                                <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                                {REVIEW_FLOW_STATUS_LABELS[flowStatus as any] ?? flowStatus}
                              </span>
                            )
                          }
                          
                          return (
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                REVIEW_REG_STATUS_COLORS[r.status] ?? 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                              {REVIEW_REG_STATUS_LABELS[r.status] ?? r.status}
                            </span>
                          )
                        })()}
                      </td>

                      {/* Ações */}
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {(() => {
                            const isBlocked = (r as any).calculated_status === 'bloqueado'
                            if (updating === r.id) {
                              return <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                            }
                            return (
                              <>
                                {r.status !== 'concluiu' && (
                                  <button
                                    onClick={() => updateStatus(r.id, 'concluiu')}
                                    disabled={isBlocked}
                                    title={isBlocked ? 'Inscrição bloqueada - prazo expirou' : 'Marcar como Concluiu'}
                                    className="rounded-lg p-1.5 text-green-600 transition-colors hover:bg-green-50 hover:text-green-700 disabled:text-slate-400 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                                  >
                                    <CheckCircle2 className="w-4 h-4" />
                                  </button>
                                )}
                                {r.status !== 'concluiu' && (
                                  <button
                                    onClick={() => updateStatus(r.id, 'concluiu')}
                                    disabled={isBlocked}
                                    title={isBlocked ? 'Inscrição bloqueada - prazo expirou' : 'Marcar como Concluiu'}
                                    className="rounded-lg p-1.5 text-amber-600 transition-colors hover:bg-amber-50 hover:text-amber-700 disabled:text-slate-400 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                                  >
                                    <Check className="w-4 h-4" />
                                  </button>
                                )}
                                <button
                                  onClick={() => openRemoveModal(r.id, r.person?.full_name ?? 'Desconhecido', r.event?.name ?? 'Desconhecido')}
                                  title="Remover inscrição"
                                  className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              </>
                            )
                          })()}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {showPrintLabels && (
        <div className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm rv-print-root">
          <div className="rv-no-print sticky top-0 z-10 border-b border-slate-200 bg-white/95">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="text-sm font-bold text-slate-800">Etiquetas de Identificação</p>
                <p className="text-xs text-slate-500">{selectedRegs.length} selecionado(s) — formato A4</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-3 py-2 text-sm font-semibold text-white hover:bg-purple-700"
                >
                  <Printer className="w-4 h-4" />
                  Gerar PDF (A4)
                </button>
                <button
                  onClick={() => setShowPrintLabels(false)}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>

          <div className="mx-auto max-w-[210mm] bg-white min-h-[297mm] p-4 print:p-0">
            <div className="rv-label-grid">
              {selectedRegs.map((r) => {
                const infoLink = getPublicInfoLink(r.anamnese_token)
                const qrSrc = infoLink ? getQrSrc(infoLink) : ''
                const alertCount = (r as any).anamnese_alert_count ?? 0
                const photoUrl = ((r as any).anamnese_photo_url || r.person?.avatar_url || '').trim()
                const hasPhoto = !!photoUrl
                const teamName = (r as any).team_name || 'Não informada'
                const regNumber = String(r.id).slice(0, 8).toUpperCase()
                const participantName = (
                  r.person?.full_name ||
                  (r as any).person_name ||
                  (r as any).full_name ||
                  ''
                ).trim() || `Inscrito ${regNumber}`

                return (
                  <article key={r.id} className="rv-label-card">
                    <div className="rv-label-header">
                      <div className="rv-logo-wrap">
                        <img src="/brand/logo.png" alt="Logo" className="rv-logo" />
                      </div>
                      <span className="rv-chip">PARTICIPANTE</span>
                    </div>

                    <div className="rv-label-body">
                      <div className="rv-photo-wrap">
                        {hasPhoto ? (
                          <img src={photoUrl} alt={participantName} className="rv-photo" />
                        ) : null}
                      </div>

                      <div className="rv-main-info">
                        <h3 className="rv-name">{participantName}</h3>
                        <p className="rv-line">Inscrição: <strong>{regNumber}</strong></p>
                        <p className="rv-line">Equipe: <strong>{teamName}</strong></p>
                        <p className="rv-line">Líder: <strong>{r.leader?.full_name ?? '—'}</strong></p>
                        <div className={`rv-alert ${alertCount > 0 ? 'rv-alert-high' : 'rv-alert-ok'}`}>
                          {alertCount > 0 ? <AlertTriangle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                          {alertCount > 0 ? `Alerta anamnese (${alertCount})` : 'Sem alerta de anamnese'}
                        </div>
                      </div>

                      <div className="rv-qr-wrap">
                        {qrSrc ? (
                          <img src={qrSrc} alt="QR Code" className="rv-qr" />
                        ) : (
                          <div className="rv-qr-empty">
                            <QrCode className="w-6 h-6 text-slate-300" />
                          </div>
                        )}
                        <span className="rv-qr-caption">Info externa</span>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          </div>

          <style jsx global>{`
            .rv-label-grid {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 10mm;
              align-content: start;
            }
            .rv-label-card {
              border: 1px solid #e2e8f0;
              border-radius: 8mm;
              overflow: hidden;
              background: #ffffff;
              min-height: 58mm;
              display: flex;
              flex-direction: column;
            }
            .rv-label-header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 3mm 4mm;
              border-bottom: 1px solid #f1f5f9;
            }
            .rv-logo-wrap { width: 20mm; height: 8mm; display: flex; align-items: center; }
            .rv-logo { max-height: 100%; max-width: 100%; object-fit: contain; }
            .rv-chip {
              font-size: 9px;
              font-weight: 700;
              color: #1e3a8a;
              background: #dbeafe;
              border: 1px solid #bfdbfe;
              padding: 1mm 2mm;
              border-radius: 999px;
            }
            .rv-label-body {
              flex: 1;
              display: grid;
              grid-template-columns: 22mm 1fr 22mm;
              gap: 3mm;
              padding: 3.5mm 4mm 4mm;
              align-items: center;
            }
            .rv-photo-wrap {
              width: 22mm;
              height: 26mm;
              border-radius: 2mm;
              overflow: hidden;
              border: 1px solid #e2e8f0;
              background: #f8fafc;
            }
            .rv-photo {
              width: 100%;
              height: 100%;
              object-fit: cover;
            }
            .rv-main-info { min-width: 0; }
            .rv-name {
              margin: 0 0 1.2mm;
              font-size: 13px;
              line-height: 1.2;
              font-weight: 800;
              color: #0f172a;
              text-transform: uppercase;
            }
            .rv-line {
              margin: 0;
              font-size: 10px;
              line-height: 1.35;
              color: #334155;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .rv-alert {
              margin-top: 1.6mm;
              display: inline-flex;
              align-items: center;
              gap: 1mm;
              font-size: 9px;
              font-weight: 700;
              padding: 0.8mm 1.6mm;
              border-radius: 999px;
            }
            .rv-alert-high { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
            .rv-alert-ok { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
            .rv-qr-wrap {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              gap: 1mm;
            }
            .rv-qr {
              width: 20mm;
              height: 20mm;
              border: 1px solid #e2e8f0;
              border-radius: 1.5mm;
            }
            .rv-qr-empty {
              width: 20mm;
              height: 20mm;
              border: 1px dashed #cbd5e1;
              border-radius: 1.5mm;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .rv-qr-caption {
              font-size: 8px;
              color: #64748b;
              text-transform: uppercase;
              letter-spacing: 0.04em;
              font-weight: 700;
            }
            @media print {
              @page { size: A4 portrait; margin: 10mm; }
              body { background: white !important; }
              body * { visibility: hidden; }
              .rv-print-root, .rv-print-root * { visibility: visible; }
              .rv-print-root {
                position: absolute !important;
                inset: 0 !important;
                background: white !important;
              }
              .rv-print-root .rv-no-print { display: none !important; }
              .rv-label-grid { gap: 8mm; }
            }
          `}</style>
        </div>
      )}

      {/* Modal de Inscrição */}
      <RevisaoInscricaoModal
        isOpen={inscricaoModalOpen}
        onClose={() => setInscricaoModalOpen(false)}
        onSuccess={() => {
          setInscricaoModalOpen(false)
          load()
        }}
        events={events}
      />

      {/* Modal de Validação de Pagamento */}
      {pagamentoRegId && (
        <ValidarPagamentoModal
          isOpen={pagamentoModalOpen}
          onClose={() => {
            setPagamentoModalOpen(false)
            setPagamentoRegId('')
          }}
          onSuccess={() => {
            setPagamentoModalOpen(false)
            setPagamentoRegId('')
            load()
          }}
          registrationId={pagamentoRegId}
          personName={regs.find((r) => r.id === pagamentoRegId)?.person?.full_name}
          eventName={regs.find((r) => r.id === pagamentoRegId)?.event?.name}
        />
      )}

      {/* Modal de Remoção de Inscrição */}
      <RemoveInscricaoModal
        isOpen={removeModalOpen}
        personName={removePersonName}
        eventName={removeEventName}
        onClose={() => {
          setRemoveModalOpen(false)
          setRemoveRegId('')
          setRemovePersonName('')
          setRemoveEventName('')
        }}
        onConfirm={confirmRemove}
        isDeleting={updating === removeRegId}
      />
    </div>
  )
}
