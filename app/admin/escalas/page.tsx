'use client'

import { useState, useEffect, useCallback } from 'react'
import { Calendar, Plus, Link2, Copy, Eye, Trash2, CheckCircle, XCircle, ChevronRight, Loader2, Music, MapPin, CalendarDays, Clock, Sparkles, ArrowLeft, Check, Tags, X, Users } from 'lucide-react'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { AdminPageHeader } from '@/app/admin/AdminPageHeader'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { CustomSelect } from '@/components/ui/CustomSelect'
import { adminFetchJson } from '@/lib/admin-client'
import { Toast } from '@/components/Toast'
import Link from 'next/link'

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

const MONTH_OPTIONS = MONTHS.map((m, i) => ({ value: String(i + 1), label: m }))

type EscalaLink = {
  id: string
  token: string
  ministry: string
  month: number
  year: number
  label: string | null
  status: 'active' | 'closed'
  church: { id: string; name: string } | null
}

type Ministry = { id: string; name: string }
type Church = { id: string; name: string }

type PreviewSlot = {
  type: string
  label: string
  date: string
  time_of_day: string
}

type CustomEvent = { label: string; date: string; time_of_day: string }

function publicUrl(token: string) {
  return `${window.location.origin}/escalas/${token}`
}

function monthLabel(m: number) { return MONTHS[m - 1] ?? m }

export default function EscalasPage() {
  const [items, setItems] = useState<EscalaLink[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; message: string } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<EscalaLink | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Modal de criação
  const [modalOpen, setModalOpen] = useState(false)
  const [step, setStep] = useState<'config' | 'preview'>('config')
  const [ministries, setMinistries] = useState<Ministry[]>([])
  const [churches, setChurches] = useState<Church[]>([])
  const [ministry, setMinistry] = useState('')
  const [churchId, setChurchId] = useState('')
  const [monthVal, setMonthVal] = useState(String(new Date().getMonth() + 1))
  const [yearVal, setYearVal] = useState(String(new Date().getFullYear()))
  const [label, setLabel] = useState('')
  const [previewSlots, setPreviewSlots] = useState<PreviewSlot[]>([])
  const [previewLoading, setPreviewLoading] = useState(false)
  const [customEvents, setCustomEvents] = useState<CustomEvent[]>([])
  const [evLabel, setEvLabel] = useState('')
  const [evDate, setEvDate] = useState('')
  const [evTime, setEvTime] = useState('19:00')
  const [saving, setSaving] = useState(false)

  // Funções necessárias por culto/slot
  const [funcoes, setFuncoes] = useState<string[]>([])
  const [funcaoInput, setFuncaoInput] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await adminFetchJson<{ items: EscalaLink[] }>('/api/admin/escalas')
      setItems(data.items ?? [])
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!modalOpen) return
    Promise.all([
      adminFetchJson<{ ministries: Ministry[] }>('/api/admin/ministries').catch(() => ({ ministries: [] })),
      adminFetchJson<{ items: Church[] }>('/api/admin/consolidacao/churches').catch(() => ({ items: [] })),
    ]).then(([m, c]) => {
      setMinistries(m.ministries ?? [])
      setChurches(c.items ?? [])
    })
  }, [modalOpen])

  // Gera preview de slots (apenas cultos/arenas, sem eventos customizados)
  const handlePreview = useCallback(async () => {
    if (!ministry || !churchId || !monthVal || !yearVal) {
      setToast({ type: 'err', message: 'Preencha todos os campos antes de prosseguir.' })
      return
    }
    setPreviewLoading(true)
    setStep('preview')
    try {
      // Busca cultos (incluindo nacionais/nulos se houver suporte na API ou trazemos aqui)
      // O endpoint worship-services aceita ?church_id=
      // Para garantir que trazemos tudo, fixaremos a API ou traremos church_id nulo também
      const [svcs, arenas] = await Promise.all([
        adminFetchJson<{ items: { id: string; name: string; day_of_week: number; time_of_day: string; is_arena: boolean }[] }>(
          `/api/admin/consolidacao/worship-services?church_id=${churchId}`
        ).catch(() => ({ items: [] })),
        adminFetchJson<{ items: { id: string; name: string; day_of_week: string; time_of_day: string }[] }>(
          `/api/admin/consolidacao/arenas?church_id=${churchId}`
        ).catch(() => ({ items: [] }))
      ])

      const m = Number(monthVal), y = Number(yearVal)
      const daysInMonth = new Date(y, m, 0).getDate()
      const generated: PreviewSlot[] = []

      const ARENA_DAY_MAP: Record<string, number> = {
        sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
      }

      for (let day = 1; day <= daysInMonth; day++) {
        // Usamos meio-dia para evitar problemas de timezone em datas
        const d = new Date(y, m - 1, day, 12, 0, 0)
        const weekday = d.getDay()
        const dateStr = d.toISOString().slice(0, 10)

        // Cultos
        for (const s of svcs.items ?? []) {
          if (Number(s.day_of_week) === weekday) {
            generated.push({ 
              type: s.is_arena ? 'arena' : 'culto', 
              label: s.name, 
              date: dateStr, 
              time_of_day: s.time_of_day.slice(0, 5) // Garante 00:00 format
            })
          }
        }

        // Arenas que não são worship-services
        for (const a of arenas.items ?? []) {
          const arenaDayInt = ARENA_DAY_MAP[a.day_of_week] ?? -1
          if (arenaDayInt === weekday) {
            // Evita duplicar se já veio via worship_services (ex. Culto Arena)
            const exists = generated.some(g => g.date === dateStr && g.label === a.name)
            if (!exists) {
              generated.push({ type: 'arena', label: a.name, date: dateStr, time_of_day: a.time_of_day.slice(0, 5) })
            }
          }
        }
      }
      // Ordena por data e horário para garantir consistência
      generated.sort((a, b) => a.date.localeCompare(b.date) || a.time_of_day.localeCompare(b.time_of_day))
      setPreviewSlots(generated)
    } catch (e) {
      console.error('Preview error:', e)
      setToast({ type: 'err', message: 'Erro ao carregar datas.' })
    } finally {
      setPreviewLoading(false)
    }
  }, [ministry, churchId, monthVal, yearVal])

  function addCustomEvent() {
    if (!evLabel.trim() || !evDate) {
      setToast({ type: 'err', message: 'Preencha nome e data do evento.' })
      return
    }
    setCustomEvents(prev => [...prev, { label: evLabel.trim(), date: evDate, time_of_day: evTime }])
    setEvLabel('')
    setEvDate('')
    setEvTime('19:00')
  }

  async function handleGenerate() {
    setSaving(true)
    try {
      const data = await adminFetchJson<{ link: { id: string; token: string } }>('/api/admin/escalas', {
        method: 'POST',
        body: JSON.stringify({ 
          ministry, 
          church_id: churchId, 
          month: Number(monthVal), 
          year: Number(yearVal), 
          label: label.trim() || null, 
          custom_events: customEvents, 
          preview_slots: previewSlots,
          funcoes 
        }),
      })
      setToast({ type: 'ok', message: 'Link gerado com sucesso!' })
      setModalOpen(false)
      resetModal()
      load()
    } catch (e) {
      setToast({ type: 'err', message: e instanceof Error ? e.message : 'Erro ao gerar link.' })
    } finally {
      setSaving(false)
    }
  }

  function resetModal() {
    setStep('config')
    setMinistry('')
    setChurchId('')
    setMonthVal(String(new Date().getMonth() + 1))
    setYearVal(String(new Date().getFullYear()))
    setLabel('')
    setPreviewSlots([])
    setCustomEvents([])
    setEvLabel('')
    setEvDate('')
    setEvTime('19:00')
    setFuncoes([])
    setFuncaoInput('')
  }

  async function copyLink(token: string) {
    try {
      await navigator.clipboard.writeText(publicUrl(token))
      setToast({ type: 'ok', message: 'Link copiado!' })
    } catch {
      setToast({ type: 'err', message: 'Não foi possível copiar o link.' })
    }
  }

  async function toggleStatus(item: EscalaLink) {
    const newStatus = item.status === 'active' ? 'closed' : 'active'
    try {
      await adminFetchJson(`/api/admin/escalas/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      })
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: newStatus } : i))
    } catch { /* ignore */ }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await adminFetchJson(`/api/admin/escalas/${deleteTarget.id}`, { method: 'DELETE' })
      setItems(prev => prev.filter(i => i.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch {
      setToast({ type: 'err', message: 'Erro ao excluir.' })
    } finally {
      setDeleting(false)
    }
  }

  const allSlots = [...previewSlots, ...customEvents.map(e => ({ ...e, type: 'evento' }))]
  const sortedSlots = allSlots.slice().sort((a, b) => a.date.localeCompare(b.date) || a.time_of_day.localeCompare(b.time_of_day))

  const TYPE_BADGE: Record<string, string> = {
    culto: 'bg-blue-100 text-blue-700',
    arena: 'bg-purple-100 text-purple-700',
    evento: 'bg-amber-100 text-amber-700',
  }

  return (
    <PageAccessGuard pageKey="escalas">
      <div className="p-6 md:p-8">
        <AdminPageHeader
          icon={Calendar}
          title="Escalas"
          subtitle="Gere links de disponibilidade por ministério e mês."
          actions={
            <button
              type="button"
              onClick={() => { resetModal(); setModalOpen(true) }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#c62737] text-white font-semibold hover:bg-[#a62030] transition-all shadow-lg shadow-[#c62737]/20"
            >
              <Plus size={18} /> Nova Escala
            </button>
          }
        />

        {/* Estatísticas rápidas */}
        {!loading && items.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mt-6 mb-2">
            <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#c62737]/10 flex items-center justify-center shrink-0">
                <Calendar className="text-[#c62737]" size={16} />
              </div>
              <div>
                <p className="text-xl font-bold text-slate-800 leading-none">{items.length}</p>
                <p className="text-xs text-slate-500 mt-0.5">Total de escalas</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                <CheckCircle className="text-emerald-600" size={16} />
              </div>
              <div>
                <p className="text-xl font-bold text-emerald-600 leading-none">{items.filter(i => i.status === 'active').length}</p>
                <p className="text-xs text-slate-500 mt-0.5">Abertas</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                <XCircle className="text-slate-400" size={16} />
              </div>
              <div>
                <p className="text-xl font-bold text-slate-500 leading-none">{items.filter(i => i.status === 'closed').length}</p>
                <p className="text-xs text-slate-500 mt-0.5">Encerradas</p>
              </div>
            </div>
          </div>
        )}

        {/* Lista */}
        <div className="space-y-3 mt-4">
          {loading ? (
            <div className="py-16 flex items-center justify-center">
              <Loader2 className="animate-spin text-[#c62737]" size={28} />
            </div>
          ) : items.length === 0 ? (
            <div className="py-20 text-center border border-dashed border-slate-200 rounded-2xl bg-white">
              <div className="w-14 h-14 rounded-2xl bg-[#c62737]/10 flex items-center justify-center mx-auto mb-4">
                <Calendar className="text-[#c62737]" size={26} />
              </div>
              <p className="font-semibold text-slate-700 mb-1">Nenhuma escala gerada ainda</p>
              <p className="text-sm text-slate-400">Clique em &ldquo;+ Nova Escala&rdquo; para começar.</p>
            </div>
          ) : items.map(item => (
            <div
              key={item.id}
              className={`bg-white rounded-2xl border overflow-hidden transition-shadow hover:shadow-md ${
                item.status === 'active' ? 'border-slate-200' : 'border-slate-100 opacity-75'
              }`}
            >
              {/* Faixa de status superior */}
              <div className={`h-1 w-full ${
                item.status === 'active' ? 'bg-gradient-to-r from-[#c62737] to-[#e05164]' : 'bg-slate-200'
              }`} />

              <div className="p-5">
                <div className="flex flex-wrap items-start gap-4">
                  {/* Ícone + info */}
                  <div className="w-11 h-11 rounded-xl bg-[#c62737]/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Music className="text-[#c62737]" size={20} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-bold text-slate-800 text-base truncate">{item.ministry}</h3>
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                        item.status === 'active'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        {item.status === 'active' ? '● Aberto' : '○ Encerrado'}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <CalendarDays size={12} className="text-slate-400" />
                        {monthLabel(item.month)}/{item.year}
                      </span>
                      {item.church && (
                        <span className="flex items-center gap-1">
                          <MapPin size={12} className="text-slate-400" />
                          {item.church.name}
                        </span>
                      )}
                      {item.label && (
                        <span className="flex items-center gap-1">
                          <Sparkles size={12} className="text-slate-400" />
                          {item.label}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                    <button
                      type="button"
                      onClick={() => copyLink(item.token)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-100 transition-colors"
                      title="Copiar link público"
                    >
                      <Copy size={13} /> Copiar link
                    </button>
                    <Link
                      href={`/admin/escalas/${item.id}/voluntarios`}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-100 transition-colors"
                    >
                      <Users size={13} /> Voluntários
                    </Link>
                    <Link
                      href={`/admin/escalas/${item.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#c62737]/5 border border-[#c62737]/20 text-[#c62737] text-xs font-semibold hover:bg-[#c62737]/10 transition-colors"
                    >
                      <Eye size={13} /> Respostas
                    </Link>
                    <button
                      type="button"
                      onClick={() => toggleStatus(item)}
                      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors border ${
                        item.status === 'active'
                          ? 'border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100'
                          : 'border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                      }`}
                    >
                      {item.status === 'active'
                        ? <><XCircle size={13} /> Encerrar</>
                        : <><CheckCircle size={13} /> Reativar</>
                      }
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(item)}
                      className="p-2 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100 transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal Nova Escala */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col" style={{ maxHeight: '92vh' }}>

            {/* Header com gradiente */}
            <div className="relative bg-gradient-to-br from-[#c62737] to-[#8b111f] px-6 pt-6 pb-5 text-white overflow-hidden shrink-0">
              {/* Círculo decorativo */}
              <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full bg-white/5" />
              <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-white/5" />

              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5 mb-1">
                    <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
                      <CalendarDays size={16} />
                    </div>
                    <h2 className="text-lg font-bold tracking-tight">Nova Escala</h2>
                  </div>
                  <p className="text-white/70 text-sm">
                    Gere um link de disponibilidade para os voluntários do ministério.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setModalOpen(false); resetModal() }}
                  className="shrink-0 w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white/80 hover:text-white"
                >
                  <XCircle size={16} />
                </button>
              </div>

              {/* Stepper */}
              <div className="relative flex items-center gap-0 mt-5">
                {/* Step 1 */}
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step === 'config' ? 'bg-white text-[#c62737] shadow-md' : 'bg-white/30 text-white'}`}>
                    {step === 'preview' ? <Check size={14} /> : '1'}
                  </div>
                  <span className={`text-sm font-medium transition-colors ${step === 'config' ? 'text-white' : 'text-white/60'}`}>Configuração</span>
                </div>
                {/* Linha */}
                <div className="flex-1 mx-3 h-px bg-white/20 relative">
                  <div className={`absolute inset-y-0 left-0 bg-white/60 transition-all duration-500 ${step === 'preview' ? 'w-full' : 'w-0'}`} />
                </div>
                {/* Step 2 */}
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step === 'preview' ? 'bg-white text-[#c62737] shadow-md' : 'bg-white/20 text-white/40'}`}>
                    2
                  </div>
                  <span className={`text-sm font-medium transition-colors ${step === 'preview' ? 'text-white' : 'text-white/40'}`}>Datas & eventos</span>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 px-6 py-6 space-y-5">
              {step === 'config' ? (
                <div className="space-y-4">
                  {/* Ministério */}
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                      <Music size={14} className="text-[#c62737]" />
                      Ministério <span className="text-[#c62737]">*</span>
                    </label>
                    <CustomSelect
                      value={ministry}
                      onChange={setMinistry}
                      placeholder="Selecione o ministério"
                      options={ministries.map(m => ({ value: m.name, label: m.name }))}
                    />
                  </div>

                  {/* Igreja */}
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                      <MapPin size={14} className="text-[#c62737]" />
                      Igreja <span className="text-[#c62737]">*</span>
                    </label>
                    <CustomSelect
                      value={churchId}
                      onChange={setChurchId}
                      placeholder="Selecione a igreja"
                      options={churches.map(c => ({ value: c.id, label: c.name }))}
                    />
                  </div>

                  {/* Mês e Ano lado a lado */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                        <CalendarDays size={14} className="text-[#c62737]" />
                        Mês <span className="text-[#c62737]">*</span>
                      </label>
                      <CustomSelect value={monthVal} onChange={setMonthVal} options={MONTH_OPTIONS} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                        <CalendarDays size={14} className="text-slate-400" />
                        Ano <span className="text-[#c62737]">*</span>
                      </label>
                      <CustomSelect
                        value={yearVal}
                        onChange={setYearVal}
                        options={[2025, 2026, 2027].map(y => ({ value: String(y), label: String(y) }))}
                      />
                    </div>
                  </div>

                  {/* Título */}
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                      <Sparkles size={14} className="text-slate-400" />
                      Título <span className="text-xs text-slate-400 font-normal ml-1">opcional</span>
                    </label>
                    <input
                      type="text"
                      value={label}
                      onChange={e => setLabel(e.target.value)}
                      placeholder="Ex.: Louvor Especial – Semana Santa"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#c62737] focus:ring-2 focus:ring-[#c62737]/10 outline-none text-sm transition-all"
                    />
                  </div>

                  {/* Dica */}
                  <div className="flex items-start gap-3 p-3.5 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700">
                    <CalendarDays size={15} className="mt-0.5 shrink-0 text-blue-500" />
                    <p>Os cultos e arenas da igreja selecionada serão carregados automaticamente para o período informado.</p>
                  </div>
                </div>
              ) : (
                <>
                  {previewLoading ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
                      <div className="w-12 h-12 rounded-full bg-[#c62737]/10 flex items-center justify-center animate-pulse">
                        <CalendarDays className="text-[#c62737]" size={22} />
                      </div>
                      <p className="text-sm font-medium">Carregando datas do mês...</p>
                    </div>
                  ) : (
                    <>
                      {/* Resumo da escala */}
                      <div className="flex items-center gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                        <div className="w-10 h-10 rounded-xl bg-[#c62737]/10 flex items-center justify-center shrink-0">
                          <Music className="text-[#c62737]" size={18} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800 truncate">{ministry}</p>
                          <p className="text-xs text-slate-500 truncate">
                            {MONTHS[Number(monthVal) - 1]}/{yearVal} · {churches.find(c => c.id === churchId)?.name ?? ''}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setStep('config')}
                          className="ml-auto shrink-0 text-xs text-[#c62737] font-semibold hover:underline"
                        >
                          Editar
                        </button>
                      </div>

                      {/* Funções necessárias */}
                      <div className="border border-violet-200 bg-violet-50/50 rounded-xl p-4 space-y-3">
                        <p className="text-sm font-semibold text-violet-700 flex items-center gap-1.5">
                          <Tags size={14} />
                          Funções necessárias
                          <span className="text-xs font-normal text-violet-500 ml-1">aplicadas a todos os cultos</span>
                        </p>

                        {/* Chips existentes */}
                        {funcoes.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {funcoes.map(f => (
                              <span
                                key={f}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-600 text-white text-xs font-semibold shadow-sm"
                              >
                                {f}
                                <button
                                  type="button"
                                  onClick={() => setFuncoes(prev => prev.filter(x => x !== f))}
                                  className="w-3.5 h-3.5 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center transition-colors shrink-0"
                                  title="Remover"
                                >
                                  <X size={9} />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Input de nova função */}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={funcaoInput}
                            onChange={e => setFuncaoInput(e.target.value)}
                            onKeyDown={e => {
                              if ((e.key === 'Enter' || e.key === ',') && funcaoInput.trim()) {
                                e.preventDefault()
                                const val = funcaoInput.trim().replace(/,$/, '')
                                if (val && !funcoes.includes(val)) setFuncoes(prev => [...prev, val])
                                setFuncaoInput('')
                              }
                            }}
                            placeholder="Ex.: Câmera, Transmissão, Áudio…"
                            className="flex-1 px-3.5 py-2.5 rounded-xl border border-violet-200 bg-white focus:border-violet-400 focus:ring-2 focus:ring-violet-100 outline-none text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const val = funcaoInput.trim()
                              if (val && !funcoes.includes(val)) setFuncoes(prev => [...prev, val])
                              setFuncaoInput('')
                            }}
                            disabled={!funcaoInput.trim()}
                            className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white text-sm font-semibold transition-colors shadow-sm"
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                        <p className="text-[11px] text-violet-400">Pressione Enter ou vírgula para adicionar. Recurso para controle interno da liderança.</p>
                      </div>

                      {/* Slots gerados */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                            <CalendarDays size={14} className="text-[#c62737]" />
                            Cultos e arenas gerados
                          </p>
                          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-500">
                            {previewSlots.length} datas
                          </span>
                        </div>

                        {previewSlots.length === 0 ? (
                          <div className="border border-dashed border-slate-200 rounded-xl p-6 text-center text-slate-400 text-sm">
                            <CalendarDays className="mx-auto mb-2 text-slate-300" size={28} />
                            Nenhum culto ou arena encontrado para essa igreja neste mês.
                          </div>
                        ) : (
                          <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1 dropdown-scrollbar">
                            {previewSlots.map((s, i) => {
                              const d = new Date(s.date + 'T00:00:00')
                              const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
                              return (
                                <div key={i} className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-100 text-sm hover:border-slate-200 transition-colors group">
                                  <div className="w-10 shrink-0 text-center">
                                    <p className="text-[10px] text-slate-400 font-medium uppercase leading-none">{dayNames[d.getDay()]}</p>
                                    <p className="text-base font-bold text-slate-700 leading-tight">{String(d.getDate()).padStart(2, '0')}</p>
                                  </div>
                                  <div className="w-px h-8 bg-slate-200 shrink-0" />
                                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${TYPE_BADGE[s.type]}`}>{s.type}</span>
                                  <span className="flex-1 font-medium text-slate-700 truncate">{s.label}</span>
                                  <span className="flex items-center gap-1 text-xs text-slate-400 shrink-0">
                                    <Clock size={11} />{s.time_of_day}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setPreviewSlots(prev => prev.filter((_, j) => j !== i))}
                                    className="shrink-0 w-6 h-6 rounded-full bg-red-50 text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-100 hover:text-red-600 flex items-center justify-center text-[10px] transition-all"
                                    title="Remover este culto"
                                  >
                                    ✕
                                  </button>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>

                      {/* Adicionar evento especial */}
                      <div className="border border-dashed border-amber-200 bg-amber-50/50 rounded-xl p-4 space-y-3">
                        <p className="text-sm font-semibold text-amber-700 flex items-center gap-1.5">
                          <Sparkles size={14} />
                          Adicionar evento especial
                        </p>
                        <div className="grid grid-cols-1 gap-2">
                          <input
                            type="text"
                            value={evLabel}
                            onChange={e => setEvLabel(e.target.value)}
                            placeholder="Nome do evento (ex.: Encontro de Casais)"
                            className="px-3.5 py-2.5 rounded-xl border border-amber-200 bg-white focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none text-sm"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="date"
                              value={evDate}
                              onChange={e => setEvDate(e.target.value)}
                              className="px-3.5 py-2.5 rounded-xl border border-amber-200 bg-white focus:border-amber-400 outline-none text-sm"
                            />
                            <div className="flex gap-2">
                              <input
                                type="time"
                                value={evTime}
                                onChange={e => setEvTime(e.target.value)}
                                className="flex-1 px-3.5 py-2.5 rounded-xl border border-amber-200 bg-white focus:border-amber-400 outline-none text-sm"
                              />
                              <button
                                type="button"
                                onClick={addCustomEvent}
                                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors shadow-sm"
                              >
                                <Plus size={16} />
                              </button>
                            </div>
                          </div>
                        </div>

                        {customEvents.length > 0 && (
                          <div className="space-y-1.5 pt-1">
                            {customEvents.map((ev, i) => (
                              <div key={i} className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-white border border-amber-200 text-sm">
                                <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-amber-100 text-amber-700 shrink-0">evento</span>
                                <span className="flex-1 font-medium text-slate-700 truncate">{ev.label}</span>
                                <span className="text-xs text-slate-400 shrink-0">
                                  {new Date(ev.date + 'T00:00:00').toLocaleDateString('pt-BR')} · {ev.time_of_day}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setCustomEvents(p => p.filter((_, j) => j !== i))}
                                  className="shrink-0 w-5 h-5 rounded-full bg-red-100 text-red-400 hover:bg-red-200 hover:text-red-600 flex items-center justify-center text-xs transition-colors"
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="shrink-0 px-6 py-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between gap-3">
              {step === 'preview' ? (
                <button
                  type="button"
                  onClick={() => setStep('config')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                >
                  <ArrowLeft size={15} /> Voltar
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => { setModalOpen(false); resetModal() }}
                  className="px-3 py-2 rounded-xl text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  Cancelar
                </button>
              )}

              <div className="flex items-center gap-2">
                {step === 'preview' && (
                  <button
                    type="button"
                    onClick={() => { setModalOpen(false); resetModal() }}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-100 transition-colors"
                  >
                    Cancelar
                  </button>
                )}
                {step === 'config' ? (
                  <button
                    type="button"
                    onClick={handlePreview}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#c62737] text-white text-sm font-semibold hover:bg-[#a62030] transition-all shadow-md shadow-[#c62737]/20 active:scale-95"
                  >
                    Ver datas <ChevronRight size={16} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={saving || sortedSlots.length === 0}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#c62737] text-white text-sm font-semibold hover:bg-[#a62030] disabled:opacity-50 transition-all shadow-md shadow-[#c62737]/20 active:scale-95"
                  >
                    {saving
                      ? <><Loader2 size={15} className="animate-spin" /> Gerando...</>
                      : <><Link2 size={15} /> Gerar link</>
                    }
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Excluir escala"
        message={`Excluir a escala de "${deleteTarget?.ministry}" de ${deleteTarget ? monthLabel(deleteTarget.month) : ''}/${deleteTarget?.year}? Todas as respostas serão perdidas.`}
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        variant="danger"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <Toast
        visible={!!toast}
        message={toast?.message ?? ''}
        type={toast?.type ?? 'ok'}
        onClose={() => setToast(null)}
      />
    </PageAccessGuard>
  )
}
