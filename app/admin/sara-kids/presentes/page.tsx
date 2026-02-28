'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  UserCheck,
  Phone,
  PhoneCall,
  LogOut,
  RefreshCw,
  Clock,
  Heart,
  Users,
  CheckSquare,
  Square,
  MessageCircle,
  X,
  CheckCircle2,
  AlertCircle,
  CalendarDays,
  Wifi,
  SmilePlus,
} from 'lucide-react'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { AdminPageHeader } from '@/app/admin/AdminPageHeader'
import { adminFetchJson } from '@/lib/admin-client'
import { siteConfig } from '@/config/site'
import { CustomSelect } from '@/components/ui/CustomSelect'
import { DatePickerInput } from '@/components/ui/DatePickerInput'
import { Toast } from '@/components/Toast'

// ── Tipos ───────────────────────────────────────────────────────────────────

interface Service {
  id: string
  name: string
}

interface PresenteCheckin {
  id: string
  child_id: string
  service_id: string
  service_name: string
  checked_in_at: string
  checked_out_at: string | null
  registered_by_name: string | null
  notes: string | null
  guardian_id: string | null
  guardian_name: string | null
  delivered_to_id: string | null
  delivered_to_name: string | null
  child: { id: string; full_name: string; birth_date: string | null } | null
  guardian: { id: string; full_name: string; mobile_phone: string | null; phone: string | null } | null
}

type KidsJobStatus = 'queued' | 'running' | 'completed' | 'failed'

type KidsNotificationJobResult = {
  ok: true
  summary: { success: number; errors: number; total: number }
  results: Array<{ checkinId: string; success: boolean; error?: string }>
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

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function fmtDateBR(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function todayISO(): string {
  return new Date().toISOString().substring(0, 10)
}

function getGuardianPhone(c: PresenteCheckin): string | null {
  return (
    c.guardian?.mobile_phone?.replace(/\D/g, '') ||
    c.guardian?.phone?.replace(/\D/g, '') ||
    null
  )
}

// ── Avatar colorido por iniciais ───────────────────────────────────────────

const AVATAR_PALETTE = [
  { bg: 'bg-violet-100',  text: 'text-violet-700' },
  { bg: 'bg-sky-100',     text: 'text-sky-700' },
  { bg: 'bg-amber-100',   text: 'text-amber-700' },
  { bg: 'bg-teal-100',    text: 'text-teal-700' },
  { bg: 'bg-pink-100',    text: 'text-pink-700' },
  { bg: 'bg-indigo-100',  text: 'text-indigo-700' },
  { bg: 'bg-orange-100',  text: 'text-orange-700' },
  { bg: 'bg-cyan-100',    text: 'text-cyan-700' },
]

function getAvatarStyle(name: string) {
  const code = (name.charCodeAt(0) || 0) + (name.charCodeAt(1) || 0)
  return AVATAR_PALETTE[code % AVATAR_PALETTE.length]
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// ── Modal de check-out (registro "entregue a") ────────────────────────────

interface GuardianOption {
  id: string
  full_name: string
  relationship_type: string
}

function CheckoutModal({
  checkin,
  onConfirm,
  onClose,
}: {
  checkin: PresenteCheckin
  onConfirm: (deliveredToId: string | null, deliveredToName: string) => void
  onClose: () => void
}) {
  const [guardians, setGuardians] = useState<GuardianOption[]>([])
  const [loadingGuardians, setLoadingGuardians] = useState(true)
  const [selected, setSelected] = useState<string | 'outro' | null>(null)
  const [outroName, setOutroName] = useState('')

  useEffect(() => {
    setLoadingGuardians(true)
    adminFetchJson<{ guardians: GuardianOption[] }>(`/api/admin/kids-checkin/${checkin.id}/guardians`)
      .then((data) => {
        setGuardians(data.guardians ?? [])
        // Pré-seleciona o responsável registrado no check-in se disponível
        if (data.guardians?.length > 0) setSelected(data.guardians[0].id)
      })
      .catch(() => setGuardians([]))
      .finally(() => setLoadingGuardians(false))
  }, [checkin.id])

  function handleConfirm() {
    if (selected === 'outro') {
      if (!outroName.trim()) return
      onConfirm(null, outroName.trim())
    } else if (selected) {
      const g = guardians.find((x) => x.id === selected)
      onConfirm(selected, g?.full_name ?? '')
    }
  }

  const canConfirm = selected === 'outro' ? outroName.trim().length > 0 : !!selected

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-slate-700 to-slate-600 text-white">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <LogOut size={16} />
          </div>
          <div className="flex-1">
            <p className="font-bold text-sm">Check-out</p>
            <p className="text-xs text-white/70 truncate">{checkin.child?.full_name ?? '—'}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/20 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 pt-4 pb-2">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-tight mb-3">Entregue a quem?</p>

          {loadingGuardians ? (
            <div className="flex items-center gap-2 py-4 justify-center text-slate-400">
              <RefreshCw size={14} className="animate-spin" />
              <span className="text-sm">Carregando responsáveis…</span>
            </div>
          ) : (
            <div className="space-y-2">
              {guardians.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setSelected(g.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left ${
                    selected === g.id
                      ? 'border-[#c62737] bg-[#c62737]/5'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                    selected === g.id ? 'border-[#c62737]' : 'border-slate-300'
                  }`}>
                    {selected === g.id && <div className="w-2 h-2 rounded-full bg-[#c62737]" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 leading-tight truncate">{g.full_name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{g.relationship_type}</p>
                  </div>
                </button>
              ))}

              {/* Opção Outro */}
              <button
                onClick={() => setSelected('outro')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left ${
                  selected === 'outro'
                    ? 'border-[#c62737] bg-[#c62737]/5'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                  selected === 'outro' ? 'border-[#c62737]' : 'border-slate-300'
                }`}>
                  {selected === 'outro' && <div className="w-2 h-2 rounded-full bg-[#c62737]" />}
                </div>
                <p className="text-sm font-semibold text-slate-800">Outro</p>
              </button>

              {selected === 'outro' && (
                <input
                  autoFocus
                  type="text"
                  placeholder="Nome de quem retirou a criança"
                  value={outroName}
                  onChange={(e) => setOutroName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && canConfirm && handleConfirm()}
                  className="w-full mt-1 px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-[#c62737] focus:outline-none text-sm text-slate-800 transition-colors"
                />
              )}
            </div>
          )}
        </div>

        <div className="px-5 py-4 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="flex-1 py-2.5 rounded-xl bg-[#c62737] text-sm font-bold text-white hover:bg-[#9e1f2e] transition-colors disabled:opacity-40"
          >
            Confirmar Check-out
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal de chamada em lote ─────────────────────────────────────────────────

function CallModal({
  items,
  onClose,
  onNotify,
}: {
  items: PresenteCheckin[]
  onClose: () => void
  onNotify: (type: 'ok' | 'err', message: string) => void
}) {
  const [called, setCalled] = useState<Set<string>>(new Set())
  const [msgType, setMsgType] = useState<'alerta' | 'encerramento'>('encerramento')
  const [sendingAll, setSendingAll] = useState(false)
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set())

  async function acompanharJob(jobId: string) {
    for (let attempt = 0; attempt < 120; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 2500))
      const status = await adminFetchJson<{
        ok: boolean
        job: {
          status: KidsJobStatus
          result: KidsNotificationJobResult | null
          error: string | null
        }
      }>(`/api/admin/kids-checkin/notifications?job_id=${jobId}`)

      if (status.job.status === 'completed') return status.job.result
      if (status.job.status === 'failed') {
        throw new Error(status.job.error || 'Falha ao processar notificações.')
      }
    }

    throw new Error('Tempo de processamento excedido para as notificações.')
  }

  async function callOne(c: PresenteCheckin) {
    if (called.has(c.id) || processingIds.has(c.id)) return
    setProcessingIds((prev) => new Set([...prev, c.id]))

    try {
      const start = await adminFetchJson<{ ok: boolean; job_id: string }>('/api/admin/kids-checkin/notifications', {
        method: 'POST',
        body: JSON.stringify({ type: msgType, checkinIds: [c.id] }),
      })

      onNotify('ok', 'Disparo iniciado. Você será avisado ao finalizar.')

      void acompanharJob(start.job_id)
        .then((result) => {
          if (result && result.summary.success > 0) {
            setCalled((prev) => new Set([...prev, c.id]))
            onNotify('ok', 'Disparo finalizado com sucesso.')
          } else {
            onNotify('err', 'Disparo finalizado sem envios bem-sucedidos.')
          }
        })
        .catch((err) => {
          onNotify('err', err instanceof Error ? err.message : 'Erro ao processar disparo.')
        })
        .finally(() => {
          setProcessingIds((prev) => {
            const next = new Set(prev)
            next.delete(c.id)
            return next
          })
        })
    } catch (err) {
      onNotify('err', err instanceof Error ? err.message : 'Erro ao iniciar disparo.')
      setProcessingIds((prev) => {
        const next = new Set(prev)
        next.delete(c.id)
        return next
      })
    }
  }

  async function callRemaining() {
    const remaining = items.filter((i) => !called.has(i.id))
    if (remaining.length === 0) return
    setSendingAll(true)
    try {
      const start = await adminFetchJson<{ ok: boolean; job_id: string }>('/api/admin/kids-checkin/notifications', {
        method: 'POST',
        body: JSON.stringify({ type: msgType, checkinIds: remaining.map((i) => i.id) }),
      })

      onNotify('ok', `Disparos iniciados para ${remaining.length} responsável(is).`)
      setSendingAll(false)

      void acompanharJob(start.job_id)
        .then((result) => {
          if (!result) {
            onNotify('err', 'Processamento finalizado sem retorno de resultado.')
            return
          }

          const successIds = new Set(result.results.filter(r => r.success).map(r => r.checkinId))
          setCalled((prev) => {
            const next = new Set(prev)
            for (const successId of successIds) next.add(successId)
            return next
          })

          if (result.summary.errors === 0) {
            onNotify('ok', `Disparos finalizados: ${result.summary.success} enviado(s).`)
          } else {
            onNotify('err', `Disparos finalizados com ${result.summary.errors} erro(s).`)
          }
        })
        .catch((err) => {
          onNotify('err', err instanceof Error ? err.message : 'Erro ao processar disparos.')
        })
    } catch (err) {
      setSendingAll(false)
      onNotify('err', err instanceof Error ? err.message : 'Erro ao iniciar disparos.')
    }
  }

  const allCalled = items.every((i) => called.has(i.id))

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget && !sendingAll) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-[#c62737] to-[#9e1f2e] text-white">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <PhoneCall size={17} />
          </div>
          <div className="flex-1">
            <p className="font-bold text-sm">Chamar Responsáveis</p>
            <p className="text-xs text-white/70">{items.length} criança{items.length !== 1 ? 's' : ''} selecionada{items.length !== 1 ? 's' : ''}</p>
          </div>
          {!sendingAll && (
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/20 transition-colors">
              <X size={16} />
            </button>
          )}
        </div>

        {/* Seletor de Tipo */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between gap-4">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-tight">Tipo de mensagem</span>
          <div className="flex p-0.5 rounded-xl bg-slate-200 shrink-0">
            <button 
              onClick={() => setMsgType('alerta')}
              disabled={called.size > 0 || sendingAll}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                msgType === 'alerta' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              } disabled:opacity-50`}
            >
              Urgente/Alerta
            </button>
            <button 
              onClick={() => setMsgType('encerramento')}
              disabled={called.size > 0 || sendingAll}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                msgType === 'encerramento' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              } disabled:opacity-50`}
            >
              Encerramento
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-slate-100">
          <div
            className="h-full bg-[#c62737] transition-all duration-500"
            style={{ width: items.length ? `${(called.size / items.length) * 100}%` : '0%' }}
          />
        </div>

        <div className="divide-y divide-slate-100 max-h-[55vh] overflow-y-auto">
          {items.map((c) => {
            const phone = getGuardianPhone(c)
            const isCalled = called.has(c.id)
            const isProcessing = processingIds.has(c.id)
            const childName = c.child?.full_name ?? ''
            const avatar = getAvatarStyle(childName)

            return (
              <div key={c.id} className={`px-5 py-3.5 flex items-center gap-3.5 transition-colors ${isCalled ? 'bg-slate-50/80' : ''}`}>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                  isCalled ? 'bg-slate-200 text-slate-400' : `${avatar.bg} ${avatar.text}`
                }`}>
                  {isCalled ? <CheckCircle2 size={16} /> : getInitials(childName)}
                </div>

                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm leading-tight truncate ${
                    isCalled ? 'text-slate-400 line-through' : 'text-slate-800'
                  }`}>
                    {childName || '—'}
                  </p>
                  {c.guardian_name || c.guardian?.full_name ? (
                    <p className="text-xs text-slate-500 mt-0.5 truncate flex items-center gap-1">
                      <UserCheck size={9} className="shrink-0" />
                      {c.guardian_name ?? c.guardian?.full_name}
                      {phone && <span className="text-slate-300 ml-0.5">· ···{phone.slice(-4)}</span>}
                    </p>
                  ) : (
                    <p className="text-xs text-rose-500 mt-0.5 flex items-center gap-1">
                      <AlertCircle size={9} /> Sem responsável cadastrado
                    </p>
                  )}
                </div>

                {phone ? (
                  <button
                    onClick={() => callOne(c)}
                    disabled={isCalled || isProcessing || sendingAll}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                      isCalled
                        ? 'bg-slate-100 text-slate-400 border border-slate-200'
                        : 'bg-[#25D366] text-white hover:bg-[#1ebe59] shadow-sm'
                    }`}
                  >
                    {isCalled
                      ? <><CheckCircle2 size={12} /> Enviado</>
                      : isProcessing
                        ? <><RefreshCw size={12} className="animate-spin" /> Processando</>
                        : <><MessageCircle size={12} /> Chamar</>}
                  </button>
                ) : (
                  <span className="text-xs text-slate-400 shrink-0 flex items-center gap-1 px-2">
                    <Phone size={10} /> sem tel.
                  </span>
                )}
              </div>
            )
          })}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between gap-3 font-sans">
          {allCalled ? (
            <p className="text-xs text-[#c62737] font-semibold flex items-center gap-1.5">
              <CheckCircle2 size={14} /> Todos chamados!
            </p>
          ) : (
            <div className="flex-1">
              <button
                onClick={callRemaining}
                disabled={sendingAll}
                className="w-full h-11 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#c62737] text-white text-sm font-bold hover:bg-[#9e1f2e] transition-colors disabled:opacity-50"
              >
                {sendingAll ? <RefreshCw size={14} className="animate-spin" /> : <PhoneCall size={14} />}
                {sendingAll ? 'Iniciando...' : `Chamar ${items.length - called.size} restantes`}
              </button>
            </div>
          )}
          {!sendingAll && (
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Fechar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Componente principal ────────────────────────────────────────────────────

export default function KidsPresentesPage() {
  const [services] = useState<Service[]>(
    siteConfig.services.map((s) => ({ id: s.id, name: s.name }))
  )
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [dateFilter, setDateFilter] = useState<string>(todayISO())

  const [checkins, setCheckins] = useState<PresenteCheckin[]>([])
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // multi-select
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showCallModal, setShowCallModal] = useState(false)

  // checkout in-line
  const [checkingOut, setCheckingOut] = useState<Set<string>>(new Set())
  const [checkoutTarget, setCheckoutTarget] = useState<PresenteCheckin | null>(null)
  const [callingSingle, setCallingSingle] = useState<Set<string>>(new Set())
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; message: string } | null>(null)

  const acompanharJob = useCallback(async (jobId: string) => {
    for (let attempt = 0; attempt < 120; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 2500))
      const status = await adminFetchJson<{
        ok: boolean
        job: {
          status: KidsJobStatus
          result: KidsNotificationJobResult | null
          error: string | null
        }
      }>(`/api/admin/kids-checkin/notifications?job_id=${jobId}`)

      if (status.job.status === 'completed') return status.job.result
      if (status.job.status === 'failed') {
        throw new Error(status.job.error || 'Falha ao processar notificações.')
      }
    }

    throw new Error('Tempo de processamento excedido para as notificações.')
  }, [])

  async function handleSingleCall(id: string) {
    if (callingSingle.has(id)) return
    setCallingSingle((prev) => new Set([...prev, id]))
    try {
      const start = await adminFetchJson<{ ok: boolean; job_id: string }>('/api/admin/kids-checkin/notifications', {
        method: 'POST',
        body: JSON.stringify({ type: 'alerta', checkinIds: [id] }),
      })

      setToast({ type: 'ok', message: 'Disparo iniciado. Você será avisado ao finalizar.' })

      void acompanharJob(start.job_id)
        .then((result) => {
          if (!result) {
            setToast({ type: 'err', message: 'Disparo finalizado sem retorno de resultado.' })
            return
          }

          if (result.summary.errors === 0) {
            setToast({ type: 'ok', message: `Disparo finalizado: ${result.summary.success} enviado(s).` })
          } else {
            setToast({ type: 'err', message: `Disparo finalizado com ${result.summary.errors} erro(s).` })
          }
        })
        .catch((err) => {
          setToast({ type: 'err', message: err instanceof Error ? err.message : 'Erro ao processar disparo.' })
        })
    } catch (err) {
      setToast({ type: 'err', message: err instanceof Error ? err.message : 'Erro ao iniciar disparo.' })
    } finally {
      setCallingSingle((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  // auto-refresh
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const loadPresentes = useCallback(async (silent = false) => {
    if (!selectedService) return
    if (!silent) setLoading(true)
    try {
      const params = new URLSearchParams({
        service_id: selectedService.id,
        date: dateFilter,
      })
      const data = await adminFetchJson<{ checkins: PresenteCheckin[] }>(
        `/api/admin/kids-checkin?${params}`
      )
      // apenas sem checkout
      const presentes = (data.checkins ?? []).filter((c) => !c.checked_out_at)
      setCheckins(presentes)
      setLastUpdated(new Date())
      // limpa seleção que pode ter saído
      setSelected((prev) => {
        const stillPresent = new Set(presentes.map((c) => c.id))
        return new Set([...prev].filter((id) => stillPresent.has(id)))
      })
    } catch {
      if (!silent) setCheckins([])
    } finally {
      if (!silent) setLoading(false)
    }
  }, [selectedService, dateFilter])

  useEffect(() => {
    loadPresentes()
  }, [loadPresentes])

  // auto-refresh a cada 30s
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (selectedService) {
      timerRef.current = setInterval(() => loadPresentes(true), 30_000)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [loadPresentes, selectedService])

  // ─ Seleção ────────────────────────────────────────────────────────────────
  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === checkins.length) setSelected(new Set())
    else setSelected(new Set(checkins.map((c) => c.id)))
  }

  // ─ Checkout ───────────────────────────────────────────────────────────────
  async function doCheckout(checkinId: string, deliveredToId: string | null, deliveredToName: string) {
    setCheckoutTarget(null)
    setCheckingOut((prev) => new Set([...prev, checkinId]))
    try {
      await adminFetchJson(`/api/admin/kids-checkin/${checkinId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          checked_out_at: new Date().toISOString(),
          delivered_to_id: deliveredToId,
          delivered_to_name: deliveredToName,
        }),
      })
      await loadPresentes(true)
    } finally {
      setCheckingOut((prev) => {
        const next = new Set(prev)
        next.delete(checkinId)
        return next
      })
    }
  }

  /** Alias de compatibilidade — mantém os botões de check-out funcionando via modal */
  function handleCheckout(checkin: PresenteCheckin) {
    setCheckoutTarget(checkin)
  }

  // ─ Dados derivados ────────────────────────────────────────────────────────
  const selectedItems = checkins.filter((c) => selected.has(c.id))
  const allSelected = checkins.length > 0 && selected.size === checkins.length
  const someSelected = selected.size > 0 && !allSelected
  const countGuardian = checkins.filter(c => c.guardian_id || c.guardian_name).length
  const countNoPhone = checkins.filter(c => !getGuardianPhone(c)).length
  const isToday = dateFilter === todayISO()

  return (
    <PageAccessGuard pageKey="pessoas">
      <div className="p-6 md:p-8 max-w-5xl mx-auto">
        <AdminPageHeader
          icon={UserCheck}
          title="Crianças no Culto"
          subtitle="Crianças com check-in ativo no culto selecionado"
          backLink={{ href: '/admin/sara-kids', label: 'Voltar ao Sara Kids' }}
        />

        {/* ─ Filtros ──────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-6">
          <div className="px-5 pt-4 pb-2 border-b border-slate-100 flex items-center gap-2">
            <CalendarDays size={14} className="text-[#c62737]" />
            <p className="text-xs font-bold text-slate-600 uppercase tracking-widest">Selecionar culto</p>
          </div>
          <div className="p-5 grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Culto <span className="text-[#c62737]">*</span>
              </label>
              <CustomSelect
                value={selectedService?.id ?? ''}
                onChange={(id) => {
                  const svc = services.find((s) => s.id === id) ?? null
                  setSelectedService(svc)
                  setSelected(new Set())
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
                onChange={(v) => { setDateFilter(v || todayISO()); setSelected(new Set()) }}
              />
            </div>
          </div>
        </div>

        {!selectedService ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center mx-auto mb-5">
              <Users size={28} className="text-slate-300" />
            </div>
            <p className="text-slate-700 font-semibold text-base">Selecione um culto para visualizar</p>
            <p className="text-sm text-slate-400 mt-1.5">Escolha o culto e a data nos filtros acima</p>
          </div>
        ) : (
          <>
            {/* ─ Banner do culto ativo ──────────────────────────────────── */}
            <div className="mb-5 rounded-2xl bg-gradient-to-r from-[#c62737] to-[#9e1f2e] p-5 text-white shadow-lg shadow-[#c62737]/20 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                <Heart size={22} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white/60 uppercase tracking-widest">Culto ativo</p>
                <p className="font-bold text-lg leading-tight truncate">{selectedService.name}</p>
                <p className="text-sm text-white/70 mt-0.5">{fmtDateBR(dateFilter)}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-4xl font-black leading-none">{loading ? '—' : checkins.length}</p>
                <p className="text-xs text-white/60 uppercase tracking-wider mt-0.5">crianças</p>
              </div>
            </div>

            {/* ─ Stats row ──────────────────────────────────────────────── */}
            {!loading && checkins.length > 0 && (
              <div className="flex flex-wrap gap-2.5 mb-5">
                <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 shadow-sm">
                  <UserCheck size={13} className="text-slate-400" />
                  <span className="text-xs text-slate-600">
                    <span className="font-bold text-slate-800">{countGuardian}</span> com responsável
                  </span>
                </div>
                {countNoPhone > 0 && (
                  <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200">
                    <AlertCircle size={13} className="text-amber-500" />
                    <span className="text-xs text-amber-700">
                      <span className="font-bold">{countNoPhone}</span> sem telefone
                    </span>
                  </div>
                )}
                {isToday && (
                  <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 shadow-sm ml-auto">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                    <span className="text-xs text-slate-500">
                      {lastUpdated
                        ? <>Atualizado às <span className="font-semibold">{lastUpdated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span></>
                        : 'Ao vivo'
                      }
                    </span>
                    <button
                      onClick={() => loadPresentes()}
                      disabled={loading}
                      className="ml-0.5 p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-[#c62737] transition-colors"
                      title="Atualizar agora"
                    >
                      <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
                    </button>
                  </div>
                )}
              </div>
            )}

            {!loading && checkins.length === 0 && (
              <div className="flex justify-end mb-4">
                <button
                  onClick={() => loadPresentes()}
                  disabled={loading}
                  className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-[#c62737] px-3 py-1.5 rounded-lg hover:bg-[#c62737]/5 transition-colors"
                >
                  <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                  Atualizar
                </button>
              </div>
            )}

            {/* ─ Barra de ação em lote ──────────────────────────────────── */}
            {selected.size > 0 && (
              <div className="mb-4 flex items-center gap-3 px-5 py-3 rounded-2xl bg-[#c62737] text-white shadow-lg shadow-[#c62737]/30">
                <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                  <PhoneCall size={14} />
                </div>
                <span className="text-sm font-semibold flex-1">
                  {selected.size} criança{selected.size !== 1 ? 's' : ''} selecionada{selected.size !== 1 ? 's' : ''}
                </span>
                <button
                  onClick={() => setShowCallModal(true)}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-white text-[#c62737] text-xs font-bold hover:bg-white/90 transition-colors"
                >
                  <MessageCircle size={13} />
                  Chamar responsáveis
                </button>
                <button
                  onClick={() => setSelected(new Set())}
                  className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                  title="Limpar seleção"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* ─ Lista ──────────────────────────────────────────────────── */}
            {loading ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-14 text-center shadow-sm">
                <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-[#c62737] animate-spin mx-auto mb-3" />
                <p className="text-sm text-slate-400 font-medium">Carregando crianças…</p>
              </div>
            ) : checkins.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center mx-auto mb-5">
                  <SmilePlus size={28} className="text-slate-300" />
                </div>
                <p className="text-slate-700 font-semibold text-base">Nenhuma criança presente</p>
                <p className="text-sm text-slate-400 mt-1.5 max-w-xs mx-auto">
                  Ainda não há check-ins ativos para este culto nesta data.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">

                {/* ── Desktop table ─────────────────────────────────────── */}
                <table className="w-full text-sm hidden md:table">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="bg-slate-50 px-4 py-3 w-10">
                        <button
                          onClick={toggleAll}
                          className="flex items-center justify-center text-slate-400 hover:text-[#c62737] transition-colors"
                          title={allSelected ? 'Desmarcar todos' : 'Selecionar todos'}
                        >
                          {allSelected
                            ? <CheckSquare size={15} className="text-[#c62737]" />
                            : someSelected
                              ? <CheckSquare size={15} className="text-slate-300" />
                              : <Square size={15} />
                          }
                        </button>
                      </th>
                      <th className="bg-slate-50 text-left px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Criança</th>
                      <th className="bg-slate-50 text-left px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Entrada</th>
                      <th className="bg-slate-50 text-left px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Responsável</th>
                      <th className="bg-slate-50 px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {checkins.map((c) => {
                      const phone = getGuardianPhone(c)
                      const isSelected = selected.has(c.id)
                      const isCheckingOut = checkingOut.has(c.id)
                      const childName = c.child?.full_name ?? ''
                      const avatar = getAvatarStyle(childName)

                      return (
                        <tr
                          key={c.id}
                          className={`transition-colors ${isSelected ? 'bg-[#c62737]/[0.03]' : 'hover:bg-slate-50/70'}`}
                        >
                          <td className="px-4 py-4 text-center">
                            <button
                              onClick={() => toggleSelect(c.id)}
                              className="text-slate-300 hover:text-[#c62737] transition-colors"
                            >
                              {isSelected
                                ? <CheckSquare size={15} className="text-[#c62737]" />
                                : <Square size={15} />
                              }
                            </button>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${avatar.bg} ${avatar.text}`}>
                                {getInitials(childName)}
                              </div>
                              <div>
                                <p className="font-semibold text-slate-800 text-sm leading-tight">{childName || '—'}</p>
                                <p className="text-xs text-slate-400 mt-0.5">{calcAge(c.child?.birth_date ?? null)}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#c62737]/8 text-[#c62737] text-xs font-bold border border-[#c62737]/20">
                              <Clock size={10} />
                              {fmtTime(c.checked_in_at)}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            {c.guardian_name || c.guardian?.full_name ? (
                              <div>
                                <p className="text-sm font-medium text-slate-700 leading-tight">
                                  {c.guardian_name ?? c.guardian?.full_name}
                                </p>
                                {phone
                                  ? <p className="text-xs text-slate-400 mt-0.5 font-mono">···{phone.slice(-4)}</p>
                                  : <p className="text-xs text-amber-500 mt-0.5 flex items-center gap-1">
                                      <AlertCircle size={9} /> sem telefone
                                    </p>
                                }
                              </div>
                            ) : (
                              <span className="text-xs text-slate-300 italic">não informado</span>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2 justify-end">
                              {phone ? (
                                <button
                                  onClick={() => handleSingleCall(c.id)}
                                  disabled={callingSingle.has(c.id)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#25D366] text-white text-xs font-bold hover:bg-[#1ebe59] transition-colors shadow-sm disabled:opacity-50"
                                  title="Chamar via WhatsApp"
                                >
                                  {callingSingle.has(c.id) 
                                    ? <RefreshCw size={12} className="animate-spin" />
                                    : <MessageCircle size={12} />
                                  }
                                  Chamar
                                </button>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-400 text-xs font-medium">
                                  <Phone size={11} /> sem tel.
                                </span>
                              )}
                              <button
                                onClick={() => handleCheckout(c)}
                                disabled={isCheckingOut}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600
                                           hover:border-[#c62737]/40 hover:bg-[#c62737]/5 hover:text-[#c62737]
                                           text-xs font-semibold transition-all disabled:opacity-50"
                              >
                                {isCheckingOut
                                  ? <RefreshCw size={12} className="animate-spin" />
                                  : <LogOut size={12} />
                                }
                                {isCheckingOut ? 'Saindo…' : 'Check-out'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>

                {/* ── Mobile cards ──────────────────────────────────────── */}
                <div className="md:hidden divide-y divide-slate-100">
                  <div className="px-4 py-2.5 bg-slate-50 flex items-center gap-3">
                    <button
                      onClick={toggleAll}
                      className="flex items-center gap-2 text-xs text-slate-500 hover:text-[#c62737] transition-colors"
                    >
                      {allSelected
                        ? <CheckSquare size={14} className="text-[#c62737]" />
                        : <Square size={14} />
                      }
                      {allSelected ? 'Desmarcar todos' : 'Selecionar todos'}
                    </button>
                  </div>
                  {checkins.map((c) => {
                    const phone = getGuardianPhone(c)
                    const isSelected = selected.has(c.id)
                    const isCheckingOut = checkingOut.has(c.id)
                    const childName = c.child?.full_name ?? ''
                    const avatar = getAvatarStyle(childName)

                    return (
                      <div
                        key={c.id}
                        className={`px-4 py-4 transition-colors ${isSelected ? 'bg-[#c62737]/[0.03]' : ''}`}
                      >
                        <div className="flex items-start gap-3">
                          <button
                            onClick={() => toggleSelect(c.id)}
                            className="mt-1 text-slate-300 hover:text-[#c62737] transition-colors shrink-0"
                          >
                            {isSelected
                              ? <CheckSquare size={16} className="text-[#c62737]" />
                              : <Square size={16} />
                            }
                          </button>
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${avatar.bg} ${avatar.text}`}>
                            {getInitials(childName)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="font-bold text-slate-800 text-sm leading-tight">{childName || '—'}</p>
                                <p className="text-xs text-slate-400 mt-0.5">{calcAge(c.child?.birth_date ?? null)}</p>
                              </div>
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#c62737]/8 text-[#c62737] text-[10px] font-bold border border-[#c62737]/20 shrink-0">
                                <Clock size={9} /> {fmtTime(c.checked_in_at)}
                              </span>
                            </div>
                            {(c.guardian_name || c.guardian?.full_name) ? (
                              <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500">
                                <UserCheck size={11} className="shrink-0 text-slate-400" />
                                <span className="font-medium text-slate-700">{c.guardian_name ?? c.guardian?.full_name}</span>
                                {phone
                                  ? <span className="text-slate-400 font-mono">· ···{phone.slice(-4)}</span>
                                  : <span className="text-amber-500 flex items-center gap-0.5"><AlertCircle size={9} /> sem tel.</span>
                                }
                              </div>
                            ) : (
                              <p className="text-xs text-slate-400 italic mt-1.5">Responsável não informado</p>
                            )}
                            {c.notes && (
                              <p className="text-xs text-slate-400 mt-1.5 italic border-l-2 border-slate-200 pl-2">{c.notes}</p>
                            )}
                            <div className="flex items-center gap-2 mt-3">
                              {phone ? (
                                <button
                                  onClick={() => handleSingleCall(c.id)}
                                  disabled={callingSingle.has(c.id)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#25D366] text-white text-xs font-bold hover:bg-[#1ebe59] transition-colors shadow-sm disabled:opacity-50"
                                >
                                  {callingSingle.has(c.id)
                                    ? <RefreshCw size={12} className="animate-spin" />
                                    : <MessageCircle size={12} />
                                  }
                                  Chamar
                                </button>
                              ) : (
                                <span className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-400 text-xs shadow-sm">
                                  <Phone size={11} /> sem tel.
                                </span>
                              )}
                              <button
                                onClick={() => handleCheckout(c)}
                                disabled={isCheckingOut}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600
                                           hover:border-[#c62737]/40 hover:bg-[#c62737]/5 hover:text-[#c62737]
                                           text-xs font-semibold transition-all disabled:opacity-50 shadow-sm"
                              >
                                {isCheckingOut ? <RefreshCw size={11} className="animate-spin" /> : <LogOut size={11} />}
                                {isCheckingOut ? 'Saindo…' : 'Check-out'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ─ Footer de atualização automática ─────────────────────── */}
            {checkins.length > 0 && isToday && (
              <div className="flex items-center justify-center gap-2 mt-4">
                <Wifi size={11} className="text-slate-300" />
                <p className="text-[11px] text-slate-400">
                  Atualização automática a cada <span className="font-semibold">30 segundos</span>
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal de check-out */}
      {checkoutTarget && (
        <CheckoutModal
          checkin={checkoutTarget}
          onConfirm={(deliveredToId, deliveredToName) =>
            doCheckout(checkoutTarget.id, deliveredToId, deliveredToName)
          }
          onClose={() => setCheckoutTarget(null)}
        />
      )}

      {/* Modal de chamada em lote */}
      {showCallModal && (
        <CallModal
          items={selectedItems}
          onClose={() => setShowCallModal(false)}
          onNotify={(type, message) => setToast({ type, message })}
        />
      )}

      <Toast
        visible={!!toast}
        message={toast?.message ?? ''}
        type={toast?.type ?? 'ok'}
        onClose={() => setToast(null)}
      />
    </PageAccessGuard>
  )
}
