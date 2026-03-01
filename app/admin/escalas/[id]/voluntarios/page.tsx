'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import {
  Users, Loader2, CheckCircle2, XCircle, Search,
  Tag, ChevronDown, X, AlertCircle, Eye, Music,
  CheckCircle, ClipboardList, Sparkles, RefreshCw,
  Save, Globe, ExternalLink, ArrowLeftRight,
  Send, Bell, CalendarCheck, MessageSquare, FlaskConical,
  CheckCircle as CheckCircleIcon, XCircle as XCircleIcon,
} from 'lucide-react'
import Link from 'next/link'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { AdminPageHeader } from '@/app/admin/AdminPageHeader'
import { adminFetchJson } from '@/lib/admin-client'
import { Toast } from '@/components/Toast'

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

type VolunteerRow = {
  id: string
  full_name: string
  ativo: boolean
  vai_servir: boolean | null
  funcoes: string[]
}

type EscalaDetail = {
  id: string
  token: string
  ministry: string
  month: number
  year: number
  label: string | null
  church: { name: string } | null
}

type ApiData = {
  link: EscalaDetail
  funcoes_disponiveis: string[]
  volunteers: VolunteerRow[]
}

type RecipientPreview = {
  person_id: string
  person_name: string
  phone: string | null
  phone_last4: string | null
  has_phone: boolean
  slots: { slot_id: string; label: string; date: string; time_of_day: string; type: string; funcao: string }[]
}

type AssignmentRow = { funcao: string; person_id: string; person_name: string; trocado?: boolean }
type SlotResult = {
  slot_id: string; type: string; label: string; date: string
  time_of_day: string; sort_order: number
  assignments: AssignmentRow[]; faltando: string[]
}
type GerarResult = { slots: SlotResult[]; alertas: string[] }
type EscalaPublicada = {
  id: string; status: 'rascunho' | 'publicada'
  dados: GerarResult; alertas: string[]
  gerada_em: string; publicada_em: string | null
}

type DisparoJobStatus = 'queued' | 'running' | 'completed' | 'failed'

// ── Seletor de funções ──────────────────────────────────────────────────────
function FuncoesSelector({
  value, options, onChange, disabled,
}: {
  value: string[]
  options: string[]
  onChange: (v: string[]) => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (options.length === 0) {
    return <span className="text-xs text-slate-400 italic">Nenhuma função definida</span>
  }

  function toggle(f: string) {
    onChange(value.includes(f) ? value.filter(x => x !== f) : [...value, f])
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
          value.length > 0
            ? 'bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100'
            : 'bg-white border-slate-200 text-slate-400 hover:border-violet-300'
        }`}
      >
        <Tag size={11} className={value.length > 0 ? 'text-violet-500' : 'text-slate-400'} />
        {value.length === 0 ? 'Atribuir funções' : `${value.length} função${value.length > 1 ? 'ões' : ''}`}
        <ChevronDown size={10} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {value.map(f => (
            <span key={f} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 text-[11px] font-semibold">
              {f}
              {!disabled && (
                <button type="button" onClick={() => toggle(f)} className="hover:text-violet-900 ml-0.5">
                  <X size={8} />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {open && (
        <div className="absolute top-full left-0 mt-1.5 z-30 bg-white border border-slate-200 rounded-xl shadow-xl p-2 min-w-[160px] space-y-0.5">
          {options.map(f => (
            <button
              key={f}
              type="button"
              onClick={() => toggle(f)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                value.includes(f) ? 'bg-violet-600 text-white' : 'text-slate-700 hover:bg-violet-50'
              }`}
            >
              {value.includes(f)
                ? <CheckCircle2 size={13} />
                : <div className="w-3 h-3 rounded-full border-2 border-slate-300" />
              }
              {f}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Seletor de Voluntário para Escala ───────────────────────────────────────
function VolunteerAssignmentSelector({
  slot,
  funcao,
  currentPersonId,
  allVolunteers,
  allSlots,
  onAssign,
}: {
  slot: SlotResult
  funcao: string
  currentPersonId?: string
  allVolunteers: VolunteerRow[]
  allSlots: SlotResult[]
  onAssign: (personId: string | null) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Voluntários disponíveis (quem tem a função e marcou que vai servir)
  const disponiveis = allVolunteers.filter(v => 
    v.ativo && 
    v.vai_servir === true && 
    v.funcoes.includes(funcao)
  )

  // Quem está ocupado NO MESMO SLOT
  const busyInSlotIds = slot.assignments.map(a => a.person_id)

  // Quem está ocupado NO MESMO DIA (em outros slots)
  const busyInDayIds = allSlots
    .filter(s => s.date === slot.date && s.slot_id !== slot.slot_id)
    .flatMap(s => s.assignments.map(a => a.person_id))

  const filtered = disponiveis.filter(v => 
    v.full_name.toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => a.full_name.localeCompare(b.full_name))

  const currentVol = allVolunteers.find(v => v.id === currentPersonId)

  return (
    <div ref={ref} className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all group ${
          currentVol 
            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' 
            : 'bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-200 border-dashed'
        }`}
      >
        {currentVol ? (
          <>
            {currentVol.full_name}
            {slot.assignments.find(a => a.person_id === currentPersonId)?.trocado && (
              <span className="text-[9px] opacity-70">↔</span>
            )}
          </>
        ) : (
          <>
            <AlertCircle size={10} />
            Vaga aberta
          </>
        )}
        <ChevronDown size={10} className={`opacity-40 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 z-50 bg-white border border-slate-200 rounded-2xl shadow-2xl p-2 min-w-[240px] max-h-[300px] flex flex-col">
          <div className="px-2 py-1.5 border-b border-slate-100 mb-1">
            <input
              autoFocus
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar voluntário…"
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border-none text-xs focus:ring-1 focus:ring-violet-500 outline-none"
            />
          </div>

          <div className="flex-1 overflow-auto space-y-0.5 custom-scrollbar">
            {/* Opção para limpar */}
            {currentPersonId && (
              <button
                type="button"
                onClick={() => { onAssign(null); setOpen(false) }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-red-500 hover:bg-red-50 transition-colors"
              >
                <X size={12} /> Remover voluntário
              </button>
            )}

            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-center text-slate-400 text-xs italic">
                Nenhum disponível para esta função
              </div>
            ) : (
              filtered.map(v => {
                const isSelected = v.id === currentPersonId
                const isBusySlot = busyInSlotIds.includes(v.id) && !isSelected
                const isBusyDay = busyInDayIds.includes(v.id) && !isSelected

                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => { onAssign(v.id); setOpen(false) }}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left ${
                      isSelected ? 'bg-violet-600 text-white shadow-md shadow-violet-200' 
                      : (isBusySlot || isBusyDay) ? 'bg-amber-50 text-amber-700 hover:bg-amber-100/80 border border-amber-100'
                      : 'text-slate-700 hover:bg-violet-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${isSelected ? 'bg-white' : (isBusySlot || isBusyDay) ? 'bg-amber-400' : 'bg-emerald-500'}`} />
                      <span className="truncate">{v.full_name}</span>
                    </div>
                    {isBusySlot && <span className="text-[9px] text-amber-600 font-bold whitespace-nowrap uppercase tracking-tighter">Mesmo Culto</span>}
                    {isBusyDay && !isBusySlot && <span className="text-[9px] text-amber-600 font-bold whitespace-nowrap uppercase tracking-tighter">Outro Horário</span>}
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

// ── Página ──────────────────────────────────────────────────────────────────
export default function EscalaVoluntariosPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id

  const [data, setData] = useState<ApiData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filterServir, setFilterServir] = useState<'all' | 'sim' | 'nao' | 'indefinido'>('all')
  const [saving, setSaving] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; message: string } | null>(null)
  const [localData, setLocalData] = useState<Record<string, VolunteerRow>>({})

  // Geração de escala
  const [gerarLoading, setGerarLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [showAlerts, setShowAlerts] = useState(true)
  const [gerarResult, setGerarResult] = useState<GerarResult | null>(null)
  const [publicadaInfo, setPublicadaInfo] = useState<EscalaPublicada | null>(null)
  const [savingEscala, setSavingEscala] = useState(false)

  // Disparos
  const [disparosTeste, setDisparosTeste] = useState(false)
  const [disparosPhone, setDisparosPhone] = useState('')
  const [disparosNome, setDisparosNome] = useState('')
  const [disparosLoading, setDisparosLoading] = useState<string | null>(null)
  const [disparosStatus, setDisparosStatus] = useState<Record<string, DisparoJobStatus | null>>({})
  const [disparosResult, setDisparosResult] = useState<Record<string, { enviados: number; erros: number; aviso?: string } | null>>({})

  // Prévia de destinatários de disparo
  const [showMsgPreview, setShowMsgPreview] = useState(false)
  const [previewTipo, setPreviewTipo] = useState<'mes' | 'lembrete_3dias' | 'lembrete_1dia' | 'dia_da_escala'>('mes')
  const [recipientsData, setRecipientsData] = useState<RecipientPreview[] | null>(null)
  const [recipientsLoading, setRecipientsLoading] = useState(false)
  const [recipientsSemTel, setRecipientsSemTel] = useState(0)
  const [recipientsComTel, setRecipientsComTel] = useState(0)

  const acompanharDisparo = useCallback(async (tipo: string, jobId: string) => {
    for (let attempt = 0; attempt < 120; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 2500))

      const statusRes = await adminFetchJson<{
        ok: boolean
        job: {
          status: DisparoJobStatus
          result: { ok: boolean; enviados: number; erros: number; aviso?: string } | null
          error: string | null
        }
      }>(`/api/admin/escalas/${id}/disparar?job_id=${jobId}`)

      const status = statusRes.job.status
      setDisparosStatus(prev => ({ ...prev, [tipo]: status }))

      if (status === 'completed') {
        const result = statusRes.job.result
        if (result) {
          setDisparosResult(prev => ({ ...prev, [tipo]: { enviados: result.enviados, erros: result.erros, aviso: result.aviso } }))
          if (result.erros === 0) {
            setToast({ type: 'ok', message: `Disparo "${tipo}" finalizado: ${result.enviados} enviado(s).` })
          } else {
            setToast({ type: 'err', message: `Disparo "${tipo}" finalizado com ${result.erros} erro(s).` })
          }
        } else {
          setToast({ type: 'ok', message: `Disparo "${tipo}" finalizado.` })
        }
        setDisparosLoading(null)
        return
      }

      if (status === 'failed') {
        setDisparosLoading(null)
        setToast({ type: 'err', message: statusRes.job.error || `Falha ao finalizar disparo "${tipo}".` })
        return
      }
    }

    setDisparosLoading(null)
    setToast({ type: 'err', message: `Tempo de acompanhamento excedido para disparo "${tipo}".` })
  }, [id])

  async function handleDisparar(tipo: string) {
    if (disparosTeste && !disparosPhone.trim()) {
      setToast({ type: 'err', message: 'Informe o telefone para o modo teste.' })
      return
    }
    setDisparosLoading(tipo)
    setDisparosResult(prev => ({ ...prev, [tipo]: null }))
    try {
      const res = await adminFetchJson<{ ok: boolean; job_id: string; status: DisparoJobStatus }>(
        `/api/admin/escalas/${id}/disparar`,
        {
          method: 'POST',
          body: JSON.stringify({
            tipo,
            teste: disparosTeste,
            phone_teste: disparosPhone.trim() || undefined,
            nome_teste: disparosNome.trim() || undefined,
          }),
        },
      )
      setDisparosStatus(prev => ({ ...prev, [tipo]: res.status }))
      setToast({ type: 'ok', message: `Disparo "${tipo}" iniciado. Você será notificado quando finalizar.` })
      void acompanharDisparo(tipo, res.job_id)
    } catch (e) {
      setToast({ type: 'err', message: e instanceof Error ? e.message : 'Erro ao disparar.' })
      setDisparosLoading(null)
    }
  }

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const res = await adminFetchJson<ApiData>(`/api/admin/escalas/${id}/voluntarios`)
      setData(res)
      const map: Record<string, VolunteerRow> = {}
      for (const v of res.volunteers) { map[v.id] = { ...v } }
      setLocalData(map)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  // Carrega info de escala já publicada/rascunho
  const loadPublicada = useCallback(async () => {
    if (!id) return
    try {
      const res = await adminFetchJson<{ publicada: EscalaPublicada | null }>(`/api/admin/escalas/${id}/publicada`)
      setPublicadaInfo(res.publicada)
    } catch { /* silencia */ }
  }, [id])

  useEffect(() => { loadPublicada() }, [loadPublicada])

  async function gerar() {
    setGerarLoading(true)
    try {
      const res = await adminFetchJson<GerarResult>(`/api/admin/escalas/${id}/gerar`, { method: 'POST' })
      setGerarResult(res)
      setModalOpen(true)
    } catch (e) {
      setToast({ type: 'err', message: e instanceof Error ? e.message : 'Erro ao gerar escala.' })
    } finally {
      setGerarLoading(false)
    }
  }

  // Atribuição manual de voluntários dentro do modal de preview
  const handleAssignVolunteer = useCallback((slotId: string, funcao: string, personId: string | null) => {
    setGerarResult(prev => {
      if (!prev) return null
      const updatedSlots = prev.slots.map(slot => {
        if (slot.slot_id !== slotId) return slot

        // 1. Remove atribuição anterior desta função se houver
        const remainingAssignments = slot.assignments.filter(a => a.funcao !== funcao)
        
        const newAssignments = [...remainingAssignments]
        const newFaltando = slot.faltando.filter(f => f !== funcao)

        if (personId) {
          const vol = localData[personId]
          if (vol) {
            newAssignments.push({
              funcao,
              person_id: vol.id,
              person_name: vol.full_name,
              trocado: true, // Indica que foi alterado manualmente ou regerado
            })
          }
        } else {
          // Se personId é null, removemos o voluntário e volta a ficar vaga aberta
          newFaltando.push(funcao)
        }

        return {
          ...slot,
          assignments: newAssignments,
          faltando: newFaltando,
        }
      })

      // Atualiza alertas com base no novo estado
      const newAlertas = updatedSlots.flatMap(s => 
        s.faltando.map(f => `Nenhum voluntário escalado como ${f} para o culto de ${s.date} (${s.label})`)
      )

      return { ...prev, slots: updatedSlots, alertas: newAlertas }
    })
  }, [localData])

  async function salvarEscala(status: 'rascunho' | 'publicada') {
    if (!gerarResult) return
    setSavingEscala(true)
    try {
      await adminFetchJson(`/api/admin/escalas/${id}/publicada`, {
        method: 'POST',
        body: JSON.stringify({ status, dados: gerarResult, alertas: gerarResult.alertas }),
      })
      setToast({ type: 'ok', message: status === 'publicada' ? 'Escala publicada com sucesso!' : 'Rascunho salvo.' })
      await loadPublicada()
      if (status === 'publicada') setModalOpen(false)
    } catch {
      setToast({ type: 'err', message: 'Erro ao salvar.' })
    } finally {
      setSavingEscala(false)
    }
  }

  async function save(personId: string, patch: Partial<VolunteerRow>) {
    const current = localData[personId]
    if (!current) return
    const updated = { ...current, ...patch }
    setLocalData(prev => ({ ...prev, [personId]: updated }))
    setSaving(personId)
    try {
      await adminFetchJson(`/api/admin/escalas/${id}/voluntarios`, {
        method: 'PUT',
        body: JSON.stringify({ person_id: personId, ...updated }),
      })
    } catch {
      setLocalData(prev => ({ ...prev, [personId]: current }))
      setToast({ type: 'err', message: 'Erro ao salvar. Tente novamente.' })
    } finally {
      setSaving(null)
    }
  }

  if (loading) return (
    <PageAccessGuard pageKey="escalas">
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Loader2 className="animate-spin text-[#c62737]" size={32} />
          <p className="text-sm">Carregando voluntários…</p>
        </div>
      </div>
    </PageAccessGuard>
  )

  if (error || !data) return (
    <PageAccessGuard pageKey="escalas">
      <div className="p-8 text-center text-red-500">{error || 'Erro.'}</div>
    </PageAccessGuard>
  )

  const { link, funcoes_disponiveis } = data
  const allVolunteers = Object.values(localData)

  const ativos = allVolunteers.filter(v => v.ativo).length
  const vaoServir = allVolunteers.filter(v => v.vai_servir === true).length
  const indefinido = allVolunteers.filter(v => v.vai_servir === null && v.ativo).length

  let filtered = allVolunteers.filter(v =>
    v.full_name.toLowerCase().includes(search.toLowerCase())
  )
  if (filterServir === 'sim') filtered = filtered.filter(v => v.vai_servir === true)
  else if (filterServir === 'nao') filtered = filtered.filter(v => v.vai_servir === false)
  else if (filterServir === 'indefinido') filtered = filtered.filter(v => v.vai_servir === null && v.ativo)

  return (
    <PageAccessGuard pageKey="escalas">
      <div className="p-6 md:p-8">
        <AdminPageHeader
          icon={Users}
          title={`Voluntários — ${link.ministry}`}
          subtitle={`${MONTHS[(link.month ?? 1) - 1]}/${link.year} · ${link.church?.name ?? ''}${link.label ? ` · ${link.label}` : ''}`}
          backLink={{ href: '/admin/escalas', label: 'Voltar às escalas' }}
          actions={
            <div className="flex items-center gap-2 flex-wrap">
              {publicadaInfo?.status === 'publicada' && (
                <Link
                  href={`/escalas/${data?.link?.token}/escala`}
                  target="_blank"
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-semibold hover:bg-emerald-100 transition-colors"
                >
                  <Globe size={14} /> Escala pública
                </Link>
              )}
              <Link
                href={`/admin/escalas/${id}/trocas`}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm font-semibold hover:bg-amber-100 transition-colors"
              >
                <ArrowLeftRight size={14} /> Trocas
              </Link>
              <button
                type="button"
                onClick={gerar}
                disabled={gerarLoading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#c62737] text-white text-sm font-semibold hover:bg-[#a81f2e] transition-colors disabled:opacity-50 shadow-sm"
              >
                {gerarLoading
                  ? <Loader2 size={14} className="animate-spin" />
                  : <Sparkles size={14} />}
                {publicadaInfo ? 'Regerar' : 'Gerar Escala'}
              </button>
              <Link
                href={`/admin/escalas/${id}`}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[#c62737]/5 border border-[#c62737]/20 text-[#c62737] text-sm font-semibold hover:bg-[#c62737]/10 transition-colors"
              >
                <Eye size={14} /> Respostas
              </Link>
            </div>
          }
        />

        {/* Cards de resumo */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total', value: allVolunteers.length, color: 'text-slate-700', bg: 'bg-slate-50', border: 'border-slate-200', icon: <Users size={16} className="text-slate-400" />, filter: 'all' as const },
            { label: 'Ativos', value: ativos, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', icon: <CheckCircle size={16} className="text-emerald-500" />, filter: 'all' as const },
            { label: 'Vão servir', value: vaoServir, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', icon: <CheckCircle2 size={16} className="text-blue-500" />, filter: 'sim' as const },
            { label: 'Não definido', value: indefinido, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', icon: <ClipboardList size={16} className="text-amber-500" />, filter: 'indefinido' as const },
          ].map(s => (
            <button
              key={s.label}
              type="button"
              onClick={() => setFilterServir(s.filter)}
              className={`${s.bg} border ${s.border} rounded-2xl p-4 text-left hover:opacity-80 transition-opacity ${filterServir === s.filter && s.filter !== 'all' ? 'ring-2 ring-offset-1 ring-current' : ''}`}
            >
              <div className="flex items-center justify-between mb-2">
                {s.icon}
                <span className={`text-2xl font-bold ${s.color}`}>{s.value}</span>
              </div>
              <p className="text-xs text-slate-500 font-medium">{s.label}</p>
            </button>
          ))}
        </div>

        {/* Aviso sem funções */}
        {funcoes_disponiveis.length === 0 && (
          <div className="flex items-start gap-3 mb-5 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-sm text-amber-700">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <p>Nenhuma função definida nos cultos desta escala. Adicione funções ao criar/editar a escala para ativá-las aqui.</p>
          </div>
        )}

        {/* Filtros + busca */}
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar voluntário…"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:border-[#c62737] focus:ring-2 focus:ring-[#c62737]/10 transition-all"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {(['all', 'sim', 'nao', 'indefinido'] as const).map(f => {
              const labels = { all: 'Todos', sim: 'Vai servir', nao: 'Não vai', indefinido: 'Indefinido' }
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilterServir(f)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                    filterServir === f
                      ? 'bg-[#c62737] border-[#c62737] text-white shadow-sm'
                      : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  {labels[f]}
                </button>
              )
            })}
          </div>
        </div>

        {/* Lista vazia */}
        {allVolunteers.length === 0 ? (
          <div className="py-20 text-center border border-dashed border-slate-200 rounded-2xl bg-white">
            <div className="w-14 h-14 rounded-2xl bg-[#c62737]/10 flex items-center justify-center mx-auto mb-4">
              <Music className="text-[#c62737]" size={26} />
            </div>
            <p className="font-semibold text-slate-700 mb-1">Nenhum voluntário cadastrado</p>
            <p className="text-sm text-slate-400">Não há pessoas vinculadas a este ministério e igreja.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(v => {
              const row = localData[v.id] ?? v
              const isSaving = saving === v.id
              const initials = v.full_name.trim().split(' ').filter(Boolean)
                .slice(0, 2).map((n: string) => n[0].toUpperCase()).join('')

              // Borda esquerda colorida por status
              const borderAccent = !row.ativo
                ? 'border-l-slate-200'
                : row.vai_servir === true
                ? 'border-l-blue-500'
                : row.vai_servir === false
                ? 'border-l-red-400'
                : 'border-l-slate-300'

              const statusBadge = !row.ativo
                ? { text: 'Inativo', cls: 'bg-slate-100 text-slate-400' }
                : row.vai_servir === true
                ? { text: 'Vai servir', cls: 'bg-blue-100 text-blue-700' }
                : row.vai_servir === false
                ? { text: 'Não vai', cls: 'bg-red-100 text-red-600' }
                : { text: 'Indefinido', cls: 'bg-amber-100 text-amber-600' }

              return (
                <div
                  key={v.id}
                  className={`bg-white rounded-2xl border border-slate-200 border-l-4 ${borderAccent} transition-all hover:shadow-sm ${!row.ativo ? 'opacity-60' : ''}`}
                >
                  <div className="p-4 flex flex-wrap items-center gap-4">

                    {/* Avatar + nome + badge */}
                    <div className="flex items-center gap-3 flex-1 min-w-[180px]">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                        !row.ativo ? 'bg-slate-200' : 'bg-gradient-to-br from-[#c62737] to-[#9b1e2b]'
                      }`}>
                        <span className={`text-xs font-bold ${!row.ativo ? 'text-slate-500' : 'text-white'}`}>{initials}</span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={`font-semibold text-sm truncate ${row.ativo ? 'text-slate-800' : 'text-slate-400 line-through'}`}>
                            {v.full_name}
                          </p>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${statusBadge.cls}`}>
                            {statusBadge.text}
                          </span>
                        </div>
                        {isSaving && (
                          <p className="text-xs text-[#c62737] flex items-center gap-1 mt-0.5">
                            <Loader2 size={9} className="animate-spin" /> Salvando…
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Controles */}
                    <div className="flex items-center gap-5 ml-auto flex-wrap">

                      {/* Vai servir */}
                      <div className="flex flex-col items-center gap-1.5">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Vai servir</p>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            title="Sim — vai servir"
                            disabled={isSaving}
                            onClick={() => save(v.id, { vai_servir: row.vai_servir === true ? null : true })}
                            className={`w-9 h-9 rounded-xl flex items-center justify-center border-2 transition-all ${
                              row.vai_servir === true
                                ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200'
                                : 'border-slate-200 text-slate-300 hover:border-blue-300 hover:text-blue-400'
                            } disabled:opacity-30`}
                          >
                            <CheckCircle2 size={16} />
                          </button>
                          <button
                            type="button"
                            title="Não vai servir"
                            disabled={isSaving}
                            onClick={() => save(v.id, { vai_servir: row.vai_servir === false ? null : false })}
                            className={`w-9 h-9 rounded-xl flex items-center justify-center border-2 transition-all ${
                              row.vai_servir === false
                                ? 'bg-red-500 border-red-500 text-white shadow-md shadow-red-200'
                                : 'border-slate-200 text-slate-300 hover:border-red-300 hover:text-red-400'
                            } disabled:opacity-30`}
                          >
                            <XCircle size={16} />
                          </button>
                        </div>
                      </div>

                      <div className="w-px h-10 bg-slate-100 hidden sm:block" />

                      {/* Funções */}
                      <div className="flex flex-col gap-1.5">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Funções</p>
                        <FuncoesSelector
                          value={row.funcoes}
                          options={funcoes_disponiveis}
                          disabled={isSaving}
                          onChange={funcoes => save(v.id, { funcoes })}
                        />
                      </div>

                    </div>
                  </div>
                </div>
              )
            })}

            {filtered.length === 0 && (
              <div className="py-12 text-center text-slate-400 text-sm">
                Nenhum resultado para &ldquo;{search}&rdquo;
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Prévia / Destinatários dos Disparos ──────────────────────────── */}
      {publicadaInfo?.dados?.slots && publicadaInfo.dados.slots.length > 0 && (() => {
        const DIAS_SEMANA = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado']
        function getDiaSemana(d: string) {
          const [y, m, day] = d.split('-').map(Number)
          return DIAS_SEMANA[new Date(y, m - 1, day).getDay()]
        }
        function formatBr(d: string) {
          const [, m, day] = d.split('-')
          return `${day}/${m}`
        }
        const link = data?.link
        const churchName = link?.church?.name ?? link?.ministry ?? ''

        async function fetchRecipients() {
          if (recipientsLoading || recipientsData) return
          setRecipientsLoading(true)
          try {
            const res = await adminFetchJson<{
              ok: boolean; recipients: RecipientPreview[]
              com_telefone: number; sem_telefone: number; total: number
            }>(`/api/admin/escalas/${id}/preview-disparos`)
            setRecipientsData(res.recipients)
            setRecipientsComTel(res.com_telefone)
            setRecipientsSemTel(res.sem_telefone)
          } catch {
            setRecipientsData([])
          } finally {
            setRecipientsLoading(false)
          }
        }

        // Montagem da prévia de mensagem por tipo: agrupa por pessoa a partir de publicadaInfo
        const slotsData = publicadaInfo.dados.slots
        const byPersonMsg: Record<string, { name: string; pSlots: Array<{ label: string; date: string; time: string; funcao: string }> }> = {}
        for (const slot of slotsData) {
          for (const a of slot.assignments) {
            if (!byPersonMsg[a.person_id]) byPersonMsg[a.person_id] = { name: a.person_name, pSlots: [] }
            byPersonMsg[a.person_id].pSlots.push({ label: slot.label, date: slot.date, time: slot.time_of_day, funcao: a.funcao })
          }
        }
        const slotsOrdenados = [...slotsData]
          .filter(s => s.assignments.length > 0)
          .sort((a, b) => a.date.localeCompare(b.date) || a.time_of_day.localeCompare(b.time_of_day))

        const totalMsgs = previewTipo === 'mes'
          ? Object.keys(byPersonMsg).length
          : slotsOrdenados.reduce((acc, s) => acc + new Set(s.assignments.map(a => a.person_id)).size, 0)

        return (
          <div className="mx-6 md:mx-8 mb-8 bg-white rounded-2xl border border-slate-200 shadow-sm">
            {/* Header colapsável */}
            <button
              type="button"
              onClick={() => {
                const next = !showMsgPreview
                setShowMsgPreview(next)
                if (next) fetchRecipients()
              }}
              className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50/60 transition-colors rounded-2xl"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                  <MessageSquare size={16} className="text-green-600" />
                </div>
                <div className="text-left">
                  <h2 className="font-bold text-slate-800 text-base leading-tight">Destinatários dos Disparos</h2>
                  <p className="text-xs text-slate-400">
                    {recipientsData
                      ? <>
                          <span className="text-green-600 font-semibold">{recipientsComTel} com telefone</span>
                          {recipientsSemTel > 0 && <span className="text-red-500 font-semibold"> · {recipientsSemTel} sem telefone</span>}
                          <span className="text-slate-400"> · {previewTipo === 'mes' ? Object.keys(byPersonMsg).length : totalMsgs} mensagens a enviar</span>
                        </>
                      : 'Veja quem vai receber cada tipo de disparo e verifique telefones.'}
                  </p>
                </div>
              </div>
              <ChevronDown size={18} className={`text-slate-400 transition-transform duration-200 ${showMsgPreview ? 'rotate-180' : ''}`} />
            </button>

            {showMsgPreview && (
              <div className="border-t border-slate-100">
                {/* Seletor de tipo */}
                <div className="flex flex-wrap gap-2 px-6 pt-5 pb-4">
                  {([
                    { tipo: 'mes' as const, label: 'Escala do Mês', color: 'bg-violet-100 text-violet-700 hover:bg-violet-200' },
                    { tipo: 'lembrete_3dias' as const, label: 'Lembrete 3 dias', color: 'bg-amber-100 text-amber-700 hover:bg-amber-200' },
                    { tipo: 'lembrete_1dia' as const, label: 'Lembrete 1 dia', color: 'bg-blue-100 text-blue-700 hover:bg-blue-200' },
                    { tipo: 'dia_da_escala' as const, label: 'No dia', color: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' },
                  ]).map(({ tipo, label, color }) => (
                    <button
                      key={tipo}
                      type="button"
                      onClick={() => setPreviewTipo(tipo)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                        previewTipo === tipo ? 'bg-[#c62737] text-white shadow-sm' : color
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* ─── Tabela de destinatários ─── */}
                <div className="px-6 pb-6 space-y-5">
                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        {previewTipo === 'mes' ? 'Receberão a escala do mês' : `Receberão o lembrete "${previewTipo.replace(/_/g,' ')}"`}
                      </span>
                      {recipientsLoading && <Loader2 size={13} className="animate-spin text-slate-400 ml-auto" />}
                      {recipientsData && !recipientsLoading && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setRecipientsData(null); fetchRecipients() }}
                          className="ml-auto text-[10px] text-slate-400 hover:text-slate-600 flex items-center gap-1"
                        >
                          <RefreshCw size={11} /> Atualizar
                        </button>
                      )}
                    </div>

                    {recipientsLoading ? (
                      <div className="py-10 flex items-center justify-center gap-2 text-slate-400 text-sm">
                        <Loader2 size={18} className="animate-spin text-[#c62737]" /> Verificando telefones…
                      </div>
                    ) : !recipientsData ? (
                      <div className="py-8 text-center text-slate-400 text-sm">Abrindo…</div>
                    ) : recipientsData.length === 0 ? (
                      <div className="py-8 text-center text-slate-400 text-sm italic">Nenhum voluntário na escala.</div>
                    ) : (() => {
                      const rows: RecipientPreview[] = recipientsData
                      const semTel = rows.filter(r => !r.has_phone)
                      return (
                        <>
                          {semTel.length > 0 && (
                            <div className="px-4 py-3 bg-red-50 border-b border-red-100 flex items-start gap-2">
                              <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
                              <p className="text-xs text-red-600">
                                <strong>{semTel.length} voluntário{semTel.length !== 1 ? 's' : ''} sem telefone cadastrado</strong> — não receberão mensagem.{' '}
                                {semTel.slice(0, 3).map(r => r.person_name.split(' ')[0]).join(', ')}{semTel.length > 3 ? ` e mais ${semTel.length - 3}` : ''}.
                              </p>
                            </div>
                          )}
                          <div className="divide-y divide-slate-100">
                            {rows.map(r => {
                              const slotsOrdered = [...r.slots].sort((a,b) => a.date.localeCompare(b.date))
                              return (
                                <div key={r.person_id} className={`flex flex-wrap items-start gap-3 px-4 py-3 hover:bg-slate-50/50 transition-colors ${!r.has_phone ? 'opacity-60' : ''}`}>
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold ${
                                    r.has_phone ? 'bg-gradient-to-br from-[#c62737] to-[#9b1e2b] text-white' : 'bg-slate-200 text-slate-500'
                                  }`}>
                                    {r.person_name.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="flex-1 min-w-[160px]">
                                    <p className="text-sm font-semibold text-slate-800 leading-tight">{r.person_name}</p>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {slotsOrdered.map((s, i) => (
                                        <span key={i} className="inline-flex items-center gap-1 text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                                          <span className="font-semibold text-[#c62737]">{s.funcao}</span>
                                          <span className="text-slate-400">·</span>
                                          {getDiaSemana(s.date).slice(0,3)}, {formatBr(s.date)} {s.time_of_day}h
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                  <div className="shrink-0 flex items-center gap-1.5 ml-auto">
                                    {r.has_phone ? (
                                      <>
                                        <CheckCircleIcon size={14} className="text-green-500" />
                                        <span className="text-xs text-slate-500 font-mono">••••{r.phone_last4}</span>
                                      </>
                                    ) : (
                                      <>
                                        <XCircleIcon size={14} className="text-red-400" />
                                        <span className="text-xs text-red-400 font-semibold">Sem telefone</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                          <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center gap-3 text-xs flex-wrap">
                            <span className="text-slate-500">Total: <strong>{rows.length}</strong></span>
                            <span className="text-green-600">Receberão: <strong>{rows.filter(r => r.has_phone).length}</strong></span>
                            {semTel.length > 0 && <span className="text-red-500">Sem telefone: <strong>{semTel.length}</strong></span>}
                          </div>
                        </>
                      )
                    })()}
                  </div>

                  {/* ─── Prévia das mensagens ─── */}
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Prévia das mensagens</p>

                    {previewTipo === 'mes' ? (
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {Object.values(byPersonMsg).length === 0 ? (
                          <p className="text-sm text-slate-400 italic text-center py-6 col-span-full">Nenhum voluntário escalado.</p>
                        ) : Object.values(byPersonMsg).map(({ name, pSlots }) => {
                          const firstName = name.split(' ')[0]
                          return (
                            <div key={name} className="rounded-xl border border-slate-200 overflow-hidden">
                              <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-violet-100 flex items-center justify-center text-[10px] font-bold text-violet-700 shrink-0">{name.charAt(0)}</div>
                                <span className="text-xs font-semibold text-slate-700 truncate">{name}</span>
                                <span className="text-[10px] text-slate-400 ml-auto shrink-0">{pSlots.length} culto{pSlots.length !== 1 ? 's' : ''}</span>
                              </div>
                              <div className="bg-[#e5ddd5] p-2.5">
                                <div className="bg-white rounded-lg rounded-tl-none px-3 py-2.5 shadow-sm max-w-[90%] text-[11px] text-slate-700 leading-relaxed space-y-0.5">
                                  <p><strong>Olá, {firstName}! 👋</strong></p>
                                  <p>Sua escala de <strong>{MONTHS[(link?.month ?? 1) - 1]}/{link?.year}</strong> — <em>{churchName}</em>:</p>
                                  <div className="mt-1 pt-1.5 border-t border-slate-100 space-y-0.5">
                                    {pSlots.map((s, i) => (
                                      <p key={i} className="text-[10px] text-slate-600">
                                        📅 <strong>{getDiaSemana(s.date)}, {formatBr(s.date)}</strong> · {s.time}h
                                        <span className="text-slate-400"> — {s.label} · </span>
                                        <span className="text-[#c62737] font-semibold">{s.funcao}</span>
                                      </p>
                                    ))}
                                  </div>
                                  <p className="pt-1 mt-1 border-t border-slate-100 text-slate-500">Obrigado por servir! 🙏</p>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {slotsOrdenados.length === 0 ? (
                          <p className="text-sm text-slate-400 italic text-center py-6">Nenhum slot com voluntários escalados.</p>
                        ) : slotsOrdenados.map(slot => {
                          const byPersonSlot: Record<string, { name: string; funcoes: string[] }> = {}
                          for (const a of slot.assignments) {
                            if (!byPersonSlot[a.person_id]) byPersonSlot[a.person_id] = { name: a.person_name, funcoes: [] }
                            if (!byPersonSlot[a.person_id].funcoes.includes(a.funcao)) byPersonSlot[a.person_id].funcoes.push(a.funcao)
                          }
                          const pessoas = Object.values(byPersonSlot)
                          const diaSemana = getDiaSemana(slot.date)
                          const dataBr = formatBr(slot.date)
                          const local = `${slot.label} — ${churchName}`
                          return (
                            <div key={slot.slot_id} className="rounded-xl border border-slate-200 overflow-hidden">
                              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center gap-2">
                                <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0 ${
                                  slot.type === 'culto' ? 'bg-[#c62737]/10 text-[#c62737]'
                                  : slot.type === 'arena' ? 'bg-purple-100 text-purple-700'
                                  : 'bg-amber-100 text-amber-700'
                                }`}>{slot.type}</span>
                                <span className="text-xs font-bold text-slate-800">{slot.label}</span>
                                <span className="text-[11px] text-slate-500">📅 {diaSemana}, {dataBr} · ⏰ {slot.time_of_day}h</span>
                                <span className="text-[11px] text-slate-400 ml-auto">{pessoas.length} voluntário{pessoas.length !== 1 ? 's' : ''}</span>
                              </div>
                              <div className="bg-[#e5ddd5] p-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                {pessoas.map(({ name, funcoes: fs }) => {
                                  const firstName = name.split(' ')[0]
                                  const funcaoStr = fs.join(', ')
                                  const semFone = recipientsData?.find(r => r.person_name === name && !r.has_phone)
                                  return (
                                    <div key={name} className={`bg-white rounded-lg rounded-tl-none px-3 py-2.5 shadow-sm text-[11px] text-slate-700 leading-relaxed ${semFone ? 'opacity-50 border border-red-200' : ''}`}>
                                      {previewTipo === 'lembrete_3dias' && (
                                        <>
                                          <p><strong>Olá, {firstName}! 👋</strong></p>
                                          <p className="mt-0.5">Você está escalado(a) em <span className="text-[#c62737] font-semibold">{funcaoStr}</span> no culto de <strong>{diaSemana}, {dataBr}</strong> às <strong>{slot.time_of_day}h</strong>.</p>
                                          <p className="mt-0.5">📍 {local}</p>
                                          <p className="mt-0.5 text-slate-500">Conta com você! 🙌</p>
                                        </>
                                      )}
                                      {previewTipo === 'lembrete_1dia' && (
                                        <>
                                          <p><strong>Olá, {firstName}! 👋</strong></p>
                                          <p className="mt-0.5">Lembrete: <strong>amanhã</strong> você está escalado(a) em <span className="text-[#c62737] font-semibold">{funcaoStr}</span> — <strong>{diaSemana}, {dataBr}</strong> às <strong>{slot.time_of_day}h</strong>.</p>
                                          <p className="mt-0.5">📍 {local}</p>
                                          <p className="mt-0.5 text-slate-500">A gente conta com você! 🙏</p>
                                        </>
                                      )}
                                      {previewTipo === 'dia_da_escala' && (
                                        <>
                                          <p><strong>Bom dia, {firstName}! ☀️</strong></p>
                                          <p className="mt-0.5">Hoje é dia de servir! Você está escalado(a) em <span className="text-[#c62737] font-semibold">{funcaoStr}</span> às <strong>{slot.time_of_day}h</strong>.</p>
                                          <p className="mt-0.5">📍 {local}</p>
                                        </>
                                      )}
                                      <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-slate-100">
                                        <span className="text-[9px] text-slate-400 font-semibold truncate max-w-[70%]">{name}</span>
                                        {semFone
                                          ? <span className="text-[9px] text-red-400 font-semibold flex items-center gap-0.5"><XCircleIcon size={9} /> sem telefone</span>
                                          : <span className="text-[9px] text-green-500 flex items-center gap-0.5"><CheckCircleIcon size={9} /> enviará</span>
                                        }
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })()}

      {/* ── Seção de Disparos ──────────────────────────── */}
      {publicadaInfo?.status === 'publicada' && (
        <div className="mx-6 md:mx-8 mb-8 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
              <Send size={16} className="text-blue-600" />
            </div>
            <div className="flex-1">
              <h2 className="font-bold text-slate-800 text-base leading-tight">Disparos de Mensagem</h2>
              <p className="text-xs text-slate-400">Envie notificações automáticas via WhatsApp para os voluntários escalados.</p>
            </div>
          </div>

          {/* Modo teste */}
          <div className="px-6 py-4 bg-amber-50 border-b border-amber-100 flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <div
                onClick={() => setDisparosTeste(v => !v)}
                className={`w-10 h-5 rounded-full relative transition-colors ${
                  disparosTeste ? 'bg-amber-500' : 'bg-slate-200'
                }`}
              >
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                  disparosTeste ? 'translate-x-5' : 'translate-x-0.5'
                }`} />
              </div>
              <span className="text-sm font-semibold text-amber-700 flex items-center gap-1.5">
                <FlaskConical size={13} /> Modo Teste
              </span>
            </label>
            {disparosTeste && (
              <div className="flex flex-wrap gap-2 flex-1 min-w-[240px]">
                <input
                  type="text"
                  value={disparosPhone}
                  onChange={e => setDisparosPhone(e.target.value)}
                  placeholder="Telefone de teste (DDD + número)"
                  className="flex-1 min-w-[200px] px-3 py-1.5 rounded-xl border border-amber-200 bg-white text-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
                />
                <input
                  type="text"
                  value={disparosNome}
                  onChange={e => setDisparosNome(e.target.value)}
                  placeholder="Nome exibido (opcional)"
                  className="flex-1 min-w-[160px] px-3 py-1.5 rounded-xl border border-amber-200 bg-white text-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
                />
              </div>
            )}
            {disparosTeste && (
              <p className="text-xs text-amber-600 w-full">Apenas 1 mensagem será enviada para o número de teste acima.</p>
            )}
          </div>

          {/* Lista de ações */}
          <div className="divide-y divide-slate-100">
            {([
              {
                tipo: 'mes',
                icon: <MessageSquare size={16} className="text-violet-600" />,
                bg: 'bg-violet-50',
                title: 'Escala do mês',
                desc: 'Envia a lista completa de alocações do mês para cada voluntário.',
              },
              {
                tipo: 'lembrete_3dias',
                icon: <Bell size={16} className="text-amber-600" />,
                bg: 'bg-amber-50',
                title: 'Lembrete — 3 dias antes',
                desc: 'Envia lembrete para quem serve em 3 dias. Execute periodicamente.',
              },
              {
                tipo: 'lembrete_1dia',
                icon: <Bell size={16} className="text-blue-600" />,
                bg: 'bg-blue-50',
                title: 'Lembrete — 1 dia antes',
                desc: 'Envia lembrete para quem serve amanhã. Execute no dia anterior.',
              },
              {
                tipo: 'dia_da_escala',
                icon: <CalendarCheck size={16} className="text-emerald-600" />,
                bg: 'bg-emerald-50',
                title: 'Lembrete — dia da escala',
                desc: 'Envia lembrete no próprio dia do culto/evento. Execute na manhã do evento.',
              },
            ] as const).map(({ tipo, icon, bg, title, desc }) => {
              const res = disparosResult[tipo]
              const isLoading = disparosLoading === tipo
              const status = disparosStatus[tipo]
              return (
                <div key={tipo} className="flex flex-wrap items-center gap-4 px-6 py-4 hover:bg-slate-50/60 transition-colors">
                  <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center shrink-0`}>{icon}</div>
                  <div className="flex-1 min-w-[180px]">
                    <p className="font-semibold text-slate-800 text-sm">{title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                    {isLoading && (
                      <p className="text-xs text-blue-600 mt-1">
                        {status === 'queued' ? 'Disparo na fila de processamento...' : 'Disparo em processamento no backend...'}
                      </p>
                    )}
                    {res?.aviso && (
                      <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                        <AlertCircle size={11} /> {res.aviso}
                      </p>
                    )}
                  </div>
                  {res && !res.aviso && (
                    <div className="flex items-center gap-3 text-xs font-semibold">
                      <span className="flex items-center gap-1 text-emerald-600">
                        <CheckCircleIcon size={13} /> {res.enviados} enviado{res.enviados !== 1 ? 's' : ''}
                      </span>
                      {res.erros > 0 && (
                        <span className="flex items-center gap-1 text-red-500">
                          <XCircleIcon size={13} /> {res.erros} erro{res.erros !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  )}
                  <button
                    type="button"
                    disabled={!!disparosLoading || !publicadaInfo}
                    onClick={() => handleDisparar(tipo)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors disabled:opacity-40 shadow-sm shrink-0"
                  >
                    {isLoading
                      ? <Loader2 size={13} className="animate-spin" />
                      : <Send size={13} />}
                    {isLoading ? 'Processando…' : disparosTeste ? 'Testar' : 'Enviar'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* bloco removido — prévia está acima */}
      {false && (() => {
        function getDiaSemana(_d: string) { return '' }
        function formatBr(_d: string) { return '' }
        const link = data?.link
        const churchName = link?.church?.name ?? link?.ministry ?? ''

        async function fetchRecipients() {
          if (recipientsLoading || recipientsData) return
          setRecipientsLoading(true)
          try {
            const res = await adminFetchJson<{
              ok: boolean; recipients: RecipientPreview[]
              com_telefone: number; sem_telefone: number; total: number
            }>(`/api/admin/escalas/${id}/preview-disparos`)
            setRecipientsData(res.recipients)
            setRecipientsComTel(res.com_telefone)
            setRecipientsSemTel(res.sem_telefone)
          } catch {
            setRecipientsData([])
          } finally {
            setRecipientsLoading(false)
          }
        }

        // Montagem da prévia de mensagem por tipo: agrupa por pessoa a partir de publicadaInfo
        const slotsData = publicadaInfo.dados.slots
        const byPersonMsg: Record<string, { name: string; pSlots: Array<{ label: string; date: string; time: string; funcao: string }> }> = {}
        for (const slot of slotsData) {
          for (const a of slot.assignments) {
            if (!byPersonMsg[a.person_id]) byPersonMsg[a.person_id] = { name: a.person_name, pSlots: [] }
            byPersonMsg[a.person_id].pSlots.push({ label: slot.label, date: slot.date, time: slot.time_of_day, funcao: a.funcao })
          }
        }
        const slotsOrdenados = [...slotsData]
          .filter(s => s.assignments.length > 0)
          .sort((a, b) => a.date.localeCompare(b.date) || a.time_of_day.localeCompare(b.time_of_day))

        const totalMsgs = previewTipo === 'mes'
          ? Object.keys(byPersonMsg).length
          : slotsOrdenados.reduce((acc, s) => acc + new Set(s.assignments.map(a => a.person_id)).size, 0)

        return (
          <div className="mx-6 md:mx-8 mb-8 bg-white rounded-2xl border border-slate-200 shadow-sm">
            {/* Header colapsável */}
            <button
              type="button"
              onClick={() => {
                const next = !showMsgPreview
                setShowMsgPreview(next)
                if (next) fetchRecipients()
              }}
              className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50/60 transition-colors rounded-2xl"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                  <MessageSquare size={16} className="text-green-600" />
                </div>
                <div className="text-left">
                  <h2 className="font-bold text-slate-800 text-base leading-tight">Destinatários dos Disparos</h2>
                  <p className="text-xs text-slate-400">
                    {recipientsData
                      ? <>
                          <span className="text-green-600 font-semibold">{recipientsComTel} com telefone</span>
                          {recipientsSemTel > 0 && <span className="text-red-500 font-semibold"> · {recipientsSemTel} sem telefone</span>}
                          <span className="text-slate-400"> · {previewTipo === 'mes' ? Object.keys(byPersonMsg).length : totalMsgs} mensagens a enviar</span>
                        </>
                      : 'Veja quem vai receber cada tipo de disparo e verifique telefones.'}
                  </p>
                </div>
              </div>
              <ChevronDown size={18} className={`text-slate-400 transition-transform duration-200 ${showMsgPreview ? 'rotate-180' : ''}`} />
            </button>

            {showMsgPreview && (
              <div className="border-t border-slate-100">
                {/* Seletor de tipo */}
                <div className="flex flex-wrap gap-2 px-6 pt-5 pb-4">
                  {([
                    { tipo: 'mes' as const, label: 'Escala do Mês', color: 'bg-violet-100 text-violet-700 hover:bg-violet-200' },
                    { tipo: 'lembrete_3dias' as const, label: 'Lembrete 3 dias', color: 'bg-amber-100 text-amber-700 hover:bg-amber-200' },
                    { tipo: 'lembrete_1dia' as const, label: 'Lembrete 1 dia', color: 'bg-blue-100 text-blue-700 hover:bg-blue-200' },
                    { tipo: 'dia_da_escala' as const, label: 'No dia', color: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' },
                  ]).map(({ tipo, label, color }) => (
                    <button
                      key={tipo}
                      type="button"
                      onClick={() => setPreviewTipo(tipo)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                        previewTipo === tipo ? 'bg-[#c62737] text-white shadow-sm' : color
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* ─── Tabela de destinatários ─── */}
                <div className="px-6 pb-6 space-y-5">
                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        {previewTipo === 'mes' ? 'Receberão a escala do mês' : `Receberão o lembrete "${previewTipo.replace(/_/g,' ')}"`}
                      </span>
                      {recipientsLoading && <Loader2 size={13} className="animate-spin text-slate-400 ml-auto" />}
                      {recipientsData && !recipientsLoading && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setRecipientsData(null); fetchRecipients() }}
                          className="ml-auto text-[10px] text-slate-400 hover:text-slate-600 flex items-center gap-1"
                        >
                          <RefreshCw size={11} /> Atualizar
                        </button>
                      )}
                    </div>

                    {recipientsLoading ? (
                      <div className="py-10 flex items-center justify-center gap-2 text-slate-400 text-sm">
                        <Loader2 size={18} className="animate-spin text-[#c62737]" /> Verificando telefones…
                      </div>
                    ) : !recipientsData ? (
                      <div className="py-8 text-center text-slate-400 text-sm">Abrindo…</div>
                    ) : recipientsData.length === 0 ? (
                      <div className="py-8 text-center text-slate-400 text-sm italic">Nenhum voluntário na escala.</div>
                    ) : (() => {
                      // Filtra quem vai receber de acordo com tipo
                      let rows: RecipientPreview[] = []
                      if (previewTipo === 'mes') {
                        rows = recipientsData
                      } else {
                        // Para lembretes, mostra TODOS escalados (já que qualquer slot pode ser o alvo)
                        // e marca quantos cultos cada um tem
                        rows = recipientsData
                      }
                      const semTel = rows.filter(r => !r.has_phone)
                      return (
                        <>
                          {semTel.length > 0 && (
                            <div className="px-4 py-3 bg-red-50 border-b border-red-100 flex items-start gap-2">
                              <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
                              <p className="text-xs text-red-600">
                                <strong>{semTel.length} voluntário{semTel.length !== 1 ? 's' : ''} sem telefone cadastrado</strong> — não receberão mensagem.{' '}
                                {semTel.slice(0, 3).map(r => r.person_name.split(' ')[0]).join(', ')}{semTel.length > 3 ? ` e mais ${semTel.length - 3}` : ''}.
                              </p>
                            </div>
                          )}
                          <div className="divide-y divide-slate-100">
                            {rows.map(r => {
                              const slotsOrdered = [...r.slots].sort((a,b) => a.date.localeCompare(b.date))
                              return (
                                <div key={r.person_id} className={`flex flex-wrap items-start gap-3 px-4 py-3 hover:bg-slate-50/50 transition-colors ${!r.has_phone ? 'opacity-60' : ''}`}>
                                  {/* Avatar */}
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold ${
                                    r.has_phone ? 'bg-gradient-to-br from-[#c62737] to-[#9b1e2b] text-white' : 'bg-slate-200 text-slate-500'
                                  }`}>
                                    {r.person_name.charAt(0).toUpperCase()}
                                  </div>
                                  {/* Nome + cultos */}
                                  <div className="flex-1 min-w-[160px]">
                                    <p className="text-sm font-semibold text-slate-800 leading-tight">{r.person_name}</p>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {slotsOrdered.map((s, i) => (
                                        <span key={i} className="inline-flex items-center gap-1 text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                                          <span className="font-semibold text-[#c62737]">{s.funcao}</span>
                                          <span className="text-slate-400">·</span>
                                          {getDiaSemana(s.date).slice(0,3)}, {formatBr(s.date)} {s.time_of_day}h
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                  {/* Status telefone */}
                                  <div className="shrink-0 flex items-center gap-1.5 ml-auto">
                                    {r.has_phone ? (
                                      <>
                                        <CheckCircleIcon size={14} className="text-green-500" />
                                        <span className="text-xs text-slate-500 font-mono">••••{r.phone_last4}</span>
                                      </>
                                    ) : (
                                      <>
                                        <XCircleIcon size={14} className="text-red-400" />
                                        <span className="text-xs text-red-400 font-semibold">Sem telefone</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                          <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center gap-3 text-xs flex-wrap">
                            <span className="text-slate-500">Total: <strong>{rows.length}</strong></span>
                            <span className="text-green-600">Receberão: <strong>{rows.filter(r => r.has_phone).length}</strong></span>
                            {semTel.length > 0 && <span className="text-red-500">Sem telefone: <strong>{semTel.length}</strong></span>}
                          </div>
                        </>
                      )
                    })()}
                  </div>

                  {/* ─── Prévia das mensagens ─── */}
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Prévia das mensagens</p>

                    {previewTipo === 'mes' ? (
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {Object.values(byPersonMsg).length === 0 ? (
                          <p className="text-sm text-slate-400 italic text-center py-6 col-span-full">Nenhum voluntário escalado.</p>
                        ) : Object.values(byPersonMsg).map(({ name, pSlots }) => {
                          const firstName = name.split(' ')[0]
                          return (
                            <div key={name} className="rounded-xl border border-slate-200 overflow-hidden">
                              <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-violet-100 flex items-center justify-center text-[10px] font-bold text-violet-700 shrink-0">{name.charAt(0)}</div>
                                <span className="text-xs font-semibold text-slate-700 truncate">{name}</span>
                                <span className="text-[10px] text-slate-400 ml-auto shrink-0">{pSlots.length} culto{pSlots.length !== 1 ? 's' : ''}</span>
                              </div>
                              <div className="bg-[#e5ddd5] p-2.5">
                                <div className="bg-white rounded-lg rounded-tl-none px-3 py-2.5 shadow-sm max-w-[90%] text-[11px] text-slate-700 leading-relaxed space-y-0.5">
                                  <p><strong>Olá, {firstName}! 👋</strong></p>
                                  <p>Sua escala de <strong>{MONTHS[(link?.month ?? 1) - 1]}/{link?.year}</strong> — <em>{churchName}</em>:</p>
                                  <div className="mt-1 pt-1.5 border-t border-slate-100 space-y-0.5">
                                    {pSlots.map((s, i) => (
                                      <p key={i} className="text-[10px] text-slate-600">
                                        📅 <strong>{getDiaSemana(s.date)}, {formatBr(s.date)}</strong> · {s.time}h
                                        <span className="text-slate-400"> — {s.label} · </span>
                                        <span className="text-[#c62737] font-semibold">{s.funcao}</span>
                                      </p>
                                    ))}
                                  </div>
                                  <p className="pt-1 mt-1 border-t border-slate-100 text-slate-500">Obrigado por servir! 🙏</p>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {slotsOrdenados.length === 0 ? (
                          <p className="text-sm text-slate-400 italic text-center py-6">Nenhum slot com voluntários escalados.</p>
                        ) : slotsOrdenados.map(slot => {
                          const byPersonSlot: Record<string, { name: string; funcoes: string[] }> = {}
                          for (const a of slot.assignments) {
                            if (!byPersonSlot[a.person_id]) byPersonSlot[a.person_id] = { name: a.person_name, funcoes: [] }
                            if (!byPersonSlot[a.person_id].funcoes.includes(a.funcao)) byPersonSlot[a.person_id].funcoes.push(a.funcao)
                          }
                          const pessoas = Object.values(byPersonSlot)
                          const diaSemana = getDiaSemana(slot.date)
                          const dataBr = formatBr(slot.date)
                          const local = `${slot.label} — ${churchName}`
                          return (
                            <div key={slot.slot_id} className="rounded-xl border border-slate-200 overflow-hidden">
                              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center gap-2">
                                <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0 ${
                                  slot.type === 'culto' ? 'bg-[#c62737]/10 text-[#c62737]'
                                  : slot.type === 'arena' ? 'bg-purple-100 text-purple-700'
                                  : 'bg-amber-100 text-amber-700'
                                }`}>{slot.type}</span>
                                <span className="text-xs font-bold text-slate-800">{slot.label}</span>
                                <span className="text-[11px] text-slate-500">📅 {diaSemana}, {dataBr} · ⏰ {slot.time_of_day}h</span>
                                <span className="text-[11px] text-slate-400 ml-auto">{pessoas.length} voluntário{pessoas.length !== 1 ? 's' : ''}</span>
                              </div>
                              <div className="bg-[#e5ddd5] p-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                {pessoas.map(({ name, funcoes: fs }) => {
                                  const firstName = name.split(' ')[0]
                                  const funcaoStr = fs.join(', ')
                                  const semFone = recipientsData?.find(r => r.person_name === name && !r.has_phone)
                                  return (
                                    <div key={name} className={`bg-white rounded-lg rounded-tl-none px-3 py-2.5 shadow-sm text-[11px] text-slate-700 leading-relaxed ${semFone ? 'opacity-50 border border-red-200' : ''}`}>
                                      {previewTipo === 'lembrete_3dias' && (
                                        <>
                                          <p><strong>Olá, {firstName}! 👋</strong></p>
                                          <p className="mt-0.5">Você está escalado(a) em <span className="text-[#c62737] font-semibold">{funcaoStr}</span> no culto de <strong>{diaSemana}, {dataBr}</strong> às <strong>{slot.time_of_day}h</strong>.</p>
                                          <p className="mt-0.5">📍 {local}</p>
                                          <p className="mt-0.5 text-slate-500">Conta com você! 🙌</p>
                                        </>
                                      )}
                                      {previewTipo === 'lembrete_1dia' && (
                                        <>
                                          <p><strong>Olá, {firstName}! 👋</strong></p>
                                          <p className="mt-0.5">Lembrete: <strong>amanhã</strong> você está escalado(a) em <span className="text-[#c62737] font-semibold">{funcaoStr}</span> — <strong>{diaSemana}, {dataBr}</strong> às <strong>{slot.time_of_day}h</strong>.</p>
                                          <p className="mt-0.5">📍 {local}</p>
                                          <p className="mt-0.5 text-slate-500">A gente conta com você! 🙏</p>
                                        </>
                                      )}
                                      {previewTipo === 'dia_da_escala' && (
                                        <>
                                          <p><strong>Bom dia, {firstName}! ☀️</strong></p>
                                          <p className="mt-0.5">Hoje é dia de servir! Você está escalado(a) em <span className="text-[#c62737] font-semibold">{funcaoStr}</span> às <strong>{slot.time_of_day}h</strong>.</p>
                                          <p className="mt-0.5">📍 {local}</p>
                                        </>
                                      )}
                                      <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-slate-100">
                                        <span className="text-[9px] text-slate-400 font-semibold truncate max-w-[70%]">{name}</span>
                                        {semFone
                                          ? <span className="text-[9px] text-red-400 font-semibold flex items-center gap-0.5"><XCircleIcon size={9} /> sem telefone</span>
                                          : <span className="text-[9px] text-green-500 flex items-center gap-0.5"><CheckCircleIcon size={9} /> enviará</span>
                                        }
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })()}

      <Toast visible={!!toast} message={toast?.message ?? ''} type={toast?.type ?? 'ok'} onClose={() => setToast(null)} />

      {/* ── Modal de geração ──────────────────────────────── */}
      {modalOpen && gerarResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-[95vw] lg:max-w-7xl h-[92vh] flex flex-col">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#c62737]/10 flex items-center justify-center">
                  <Sparkles size={18} className="text-[#c62737]" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-800 text-lg leading-tight">Escala Gerada</h2>
                  <p className="text-xs text-slate-400">{gerarResult.slots.length} cultos/eventos · {gerarResult.alertas.length > 0 ? `${gerarResult.alertas.length} aviso(s)` : 'sem avisos'}</p>
                </div>
              </div>
              <button onClick={() => setModalOpen(false)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Alertas */}
            {gerarResult.alertas.length > 0 && (
              <div className="mx-6 mt-4 bg-amber-50 border border-amber-200 rounded-2xl overflow-hidden shrink-0">
                <button 
                  onClick={() => setShowAlerts(!showAlerts)}
                  className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-amber-100/50 transition-colors"
                >
                  <div className="flex items-center gap-2 text-amber-700 font-bold text-xs uppercase tracking-wider">
                    <AlertCircle size={15} className="text-amber-500" /> Atenção — {gerarResult.alertas.length} funções não preenchidas
                  </div>
                  <ChevronDown size={16} className={`text-amber-600 transition-transform duration-300 ${showAlerts ? 'rotate-180' : ''}`} />
                </button>
                {showAlerts && (
                  <div className="px-5 pb-4 max-h-40 overflow-y-auto custom-scrollbar border-t border-amber-200/50 pt-3">
                    <ul className="space-y-1.5">
                      {gerarResult.alertas.map((a, i) => (
                        <li key={i} className="text-[11px] text-amber-600/90 flex items-start gap-2 leading-relaxed">
                          <span className="mt-1.5 w-1 h-1 rounded-full bg-amber-400 shrink-0" />{a}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Tabela: linhas = cultos, colunas = funções */}
            {(() => {
              // Garante ordem cronológica independente do tipo
              const sortedGerarSlots = [...gerarResult.slots].sort((a, b) => a.date.localeCompare(b.date) || a.time_of_day.localeCompare(b.time_of_day))

              // Coleta todas as funções únicas, mantendo ordem de aparição
              const allFuncoes = Array.from(new Set(
                sortedGerarSlots.flatMap(s => [
                  ...s.assignments.map(a => a.funcao),
                  ...s.faltando,
                ])
              ))
              // Monta mapa função → person por slot
              const slotMap: Record<string, Record<string, { name: string; trocado?: boolean } | null>> = {}
              for (const slot of sortedGerarSlots) {
                slotMap[slot.slot_id] = {}
                for (const f of allFuncoes) {
                  const a = slot.assignments.find(x => x.funcao === f)
                  if (a) slotMap[slot.slot_id][f] = { name: a.person_name, trocado: a.trocado }
                  else if (slot.faltando.includes(f)) slotMap[slot.slot_id][f] = null
                  else slotMap[slot.slot_id][f] = undefined as any // função não pertence a este slot
                }
              }
              return (
                <div className="flex-1 overflow-auto px-6 pt-6 pb-60 custom-scrollbar relative z-0">
                  <table className="min-w-full border-separate border-spacing-0 text-sm">
                    <thead>
                      <tr>
                        <th className="sticky left-0 z-10 bg-slate-50 border border-slate-200 rounded-tl-xl px-4 py-3 text-left font-semibold text-slate-600 whitespace-nowrap min-w-[160px]">
                          Culto / Dia
                        </th>
                        {allFuncoes.map((f, fi) => (
                          <th key={f} className={`bg-violet-50 border-t border-b border-r border-slate-200 ${fi === allFuncoes.length - 1 ? 'rounded-tr-xl' : ''} px-4 py-3 text-center font-semibold text-violet-700 whitespace-nowrap min-w-[140px]`}>
                            {f}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sortedGerarSlots.map((slot, si) => {
                        const dateLabel = new Date(slot.date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })
                        const hasProblema = slot.faltando.length > 0
                        const isLast = si === sortedGerarSlots.length - 1
                        return (
                          <tr key={slot.slot_id} className={hasProblema ? 'bg-amber-50/60' : si % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                            {/* Célula da linha: culto */}
                            <td className={`sticky left-0 z-10 border-l border-b border-r border-slate-200 ${isLast ? 'rounded-bl-xl' : ''} px-4 py-3 ${hasProblema ? 'bg-amber-50' : si % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                              <div className="flex items-center gap-2">
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                                  slot.type === 'culto' ? 'bg-[#c62737]/10 text-[#c62737]'
                                  : slot.type === 'arena' ? 'bg-purple-100 text-purple-700'
                                  : 'bg-blue-100 text-blue-700'
                                }`}>{slot.type}</span>
                                <div>
                                  <p className="font-semibold text-slate-800 leading-tight text-xs">{slot.label}</p>
                                  <p className="text-[10px] text-slate-400">{dateLabel} · {slot.time_of_day}</p>
                                </div>
                              </div>
                            </td>
                            {/* Células das funções */}
                            {allFuncoes.map((f, fi) => {
                              const val = slotMap[slot.slot_id]?.[f]
                              const isLastCol = fi === allFuncoes.length - 1
                              if (val === undefined) {
                                // Função não pertence a este slot
                                return (
                                  <td key={f} className={`border-b border-r border-slate-200 ${isLast && isLastCol ? 'rounded-br-xl' : ''} px-4 py-3 text-center`}>
                                    <span className="text-slate-200 text-base">—</span>
                                  </td>
                                )
                              }
                              
                              // Se val for null (vaga aberta) ou tiver um valor (voluntário)
                              const currentPersonId = slot.assignments.find(a => a.funcao === f)?.person_id
                              
                              return (
                                <td 
                                  key={f} 
                                  className={`border-b border-r border-slate-200 ${isLast && isLastCol ? 'rounded-br-xl' : ''} px-1.5 py-4 text-center overflow-visible active:z-50`}
                                >
                                  <VolunteerAssignmentSelector
                                    slot={slot}
                                    funcao={f}
                                    currentPersonId={currentPersonId}
                                    allVolunteers={allVolunteers}
                                    allSlots={gerarResult.slots}
                                    onAssign={personId => handleAssignVolunteer(slot.slot_id, f, personId)}
                                  />
                                </td>
                              )
                            })}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )
            })()}

            {/* Footer com ações */}
            <div className="flex items-center justify-between gap-3 px-6 py-5 border-t border-slate-100 flex-wrap shrink-0 bg-white rounded-b-3xl">
              <button
                type="button"
                onClick={gerar}
                disabled={gerarLoading || savingEscala}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors disabled:opacity-40"
              >
                {gerarLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                Gerar novamente
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => salvarEscala('rascunho')}
                  disabled={savingEscala || gerarLoading}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors disabled:opacity-40"
                >
                  {savingEscala ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Salvar rascunho
                </button>
                <button
                  type="button"
                  onClick={() => salvarEscala('publicada')}
                  disabled={savingEscala || gerarLoading}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-40 shadow-sm"
                >
                  {savingEscala ? <Loader2 size={14} className="animate-spin" /> : <Globe size={14} />}
                  Publicar escala
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageAccessGuard>
  )
}