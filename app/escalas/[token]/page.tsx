'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import { AlertCircle, Calendar, CheckCircle2, Clock, Loader2, Music, Search, Send, User, XCircle } from 'lucide-react'

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

type Slot = {
  id: string
  type: 'culto' | 'arena' | 'evento'
  label: string
  date: string
  time_of_day: string
  sort_order: number
  funcoes: string[]
}

type Volunteer = { id: string; full_name: string; funcoes?: string[] }
type Resposta = { slot_id: string; disponivel: boolean }

type ApiData = {
  link: {
    id: string
    ministry: string
    month: number
    year: number
    label: string | null
    status: 'active' | 'closed'
    church: { name: string } | null
  }
  slots: Slot[]
  volunteers: Volunteer[]
  respostas: Resposta[]
  funcoes_disponiveis: string[]
}

const TYPE_CONFIG: Record<string, { pill: string; icon: string }> = {
  culto: { pill: 'bg-blue-100 text-blue-700', icon: '⛪' },
  arena: { pill: 'bg-purple-100 text-purple-700', icon: '🎸' },
  evento: { pill: 'bg-amber-100 text-amber-700', icon: '⭐' },
}

const DAY_NAMES_FULL = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']
const DAY_ABBR = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export default function PublicEscalaPage() {
  const params = useParams<{ token: string }>()
  const token = params?.token

  const [apiData, setApiData] = useState<ApiData | null>(null)
  const [loadError, setLoadError] = useState('')
  const [loading, setLoading] = useState(true)

  const [selectedVolunteer, setSelectedVolunteer] = useState('')
  const [selectedFunctions, setSelectedFunctions] = useState<string[]>([])
  const [availability, setAvailability] = useState<Record<string, boolean>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [volunteerSearch, setVolunteerSearch] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/public/escalas/${token}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? `Erro ${res.status}`)
      }
      const data: ApiData = await res.json()
      setApiData(data)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Erro ao carregar.')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!apiData || !selectedVolunteer) return
    
    // Inicia disponibilidade
    const initial: Record<string, boolean> = {}
    for (const s of apiData.slots) {
      const existing = apiData.respostas.find(r => r.slot_id === s.id)
      initial[s.id] = existing ? existing.disponivel : true
    }
    setAvailability(initial)

    // Inicia funções (as que ele já tem no perfil)
    const v = apiData.volunteers.find(v => v.id === selectedVolunteer)
    setSelectedFunctions(v?.funcoes || [])
  }, [selectedVolunteer, apiData])

  function toggleSlot(slotId: string) {
    setAvailability(prev => ({ ...prev, [slotId]: !prev[slotId] }))
  }

  function toggleFunction(fn: string) {
    setSelectedFunctions(prev => 
      prev.includes(fn) ? prev.filter(f => f !== fn) : [...prev, fn]
    )
  }

  async function handleSubmit() {
    if (!selectedVolunteer) return
    setSubmitting(true)
    setSubmitError('')
    try {
      const slots = Object.entries(availability).map(([slot_id, disponivel]) => ({ slot_id, disponivel }))
      const res = await fetch(`/api/public/escalas/${token}/disponibilidade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          person_id: selectedVolunteer, 
          slots,
          funcoes: selectedFunctions 
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? `Erro ${res.status}`)
      }
      setSubmitted(true)
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Erro ao enviar.')
    } finally {
      setSubmitting(false)
    }
  }

  const sortedSlots = apiData
    ? [...apiData.slots].sort((a, b) => a.date.localeCompare(b.date) || a.time_of_day.localeCompare(b.time_of_day))
    : []

  const slotsByDate: Record<string, Slot[]> = {}
  for (const s of sortedSlots) {
    if (!slotsByDate[s.date]) slotsByDate[s.date] = []
    slotsByDate[s.date].push(s)
  }

  const availableCount = Object.values(availability).filter(Boolean).length
  const unavailableCount = Object.values(availability).filter(v => !v).length
  const totalSlots = sortedSlots.length
  const progressPct = totalSlots > 0 ? Math.round((availableCount / totalSlots) * 100) : 0

  const volunteerName = apiData?.volunteers.find(v => v.id === selectedVolunteer)?.full_name ?? ''

  // ── Loading ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f14] flex flex-col items-center justify-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-[#c62737]/20 flex items-center justify-center">
          <Music className="text-[#c62737]" size={28} />
        </div>
        <Loader2 className="animate-spin text-[#c62737]" size={28} />
        <p className="text-white/40 text-sm">Carregando escala...</p>
      </div>
    )
  }

  // ── Erro de carregamento ──────────────────────────────────────
  if (loadError) {
    return (
      <div className="min-h-screen bg-[#0f0f14] flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-8 text-center max-w-sm w-full shadow-2xl">
          <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <XCircle className="text-red-500" size={28} />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Link inválido</h2>
          <p className="text-slate-500 text-sm">{loadError}</p>
        </div>
      </div>
    )
  }

  if (!apiData) return null

  const { link, volunteers } = apiData

  // ── Encerrado ─────────────────────────────────────────────────
  if (link.status === 'closed') {
    return (
      <div className="min-h-screen bg-[#0f0f14] flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-3xl overflow-hidden shadow-2xl shadow-black/40">
            {/* Faixa superior */}
            <div className="bg-slate-100 px-6 pt-10 pb-8 text-center relative overflow-hidden border-b border-slate-100">
              <div className="absolute inset-0 opacity-5 bg-[radial-gradient(circle_at_top_right,black,transparent)]" />
              <div className="relative">
                <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-5">
                  <XCircle className="text-slate-400" size={32} />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 leading-tight">Escala encerrada</h2>
                <p className="text-slate-500 text-sm mt-2 font-medium">Não estamos mais aceitando respostas.</p>
              </div>
            </div>

            {/* Detalhes */}
            <div className="p-7 space-y-6">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#c62737]/10 flex items-center justify-center shrink-0">
                    <Music className="text-[#c62737]" size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider leading-none mb-1">Ministério</p>
                    <p className="font-bold text-slate-800 text-sm truncate">{link.ministry}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                    <Calendar size={16} className="text-blue-500" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider leading-none mb-1">Período</p>
                    <p className="font-bold text-slate-800 text-sm">
                      {MONTHS[(link.month ?? 1) - 1]} de {link.year}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex gap-3">
                <AlertCircle className="text-amber-500 shrink-0" size={18} />
                <p className="text-xs text-amber-700 leading-relaxed font-medium">
                  O período de coleta de disponibilidade para este mês foi finalizado pelo administrador. Caso precise alterar algo urgente, entre em contato direto com seu líder.
                </p>
              </div>
            </div>
          </div>
          
          <p className="text-center text-white/25 text-[10px] mt-8 uppercase tracking-[0.2em] font-bold">
            Sara Nossa Terra · Gestão de Escalas
          </p>
        </div>
      </div>
    )
  }

  // ── Sucesso ───────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-[#0f0f14] flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Card de sucesso */}
          <div className="bg-white rounded-3xl overflow-hidden shadow-2xl shadow-black/40">
            {/* Faixa verde */}
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 px-6 pt-8 pb-10 text-center relative overflow-hidden">
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,white,transparent)]" />
              <div className="relative">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                  <CheckCircle2 className="text-white" size={34} />
                </div>
                <h2 className="text-2xl font-bold text-white leading-tight">Tudo certo!</h2>
                <p className="text-white/80 text-sm mt-1">Sua disponibilidade foi registrada.</p>
              </div>
            </div>

            {/* Resumo */}
            <div className="p-6 space-y-4">
              {volunteerName && (
                <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-3">
                  <div className="w-9 h-9 rounded-full bg-[#c62737]/10 flex items-center justify-center shrink-0">
                    <User className="text-[#c62737]" size={16} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Voluntário</p>
                    <p className="font-semibold text-slate-800 text-sm">{volunteerName}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-emerald-600">{availableCount}</p>
                  <p className="text-xs text-emerald-600/70 mt-0.5">Disponível</p>
                </div>
                <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-red-500">{unavailableCount}</p>
                  <p className="text-xs text-red-500/70 mt-0.5">Indisponível</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => { setSubmitted(false); setSelectedVolunteer(''); setAvailability({}) }}
                className="w-full py-3 rounded-xl border-2 border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors"
              >
                Enviar outra resposta
              </button>
            </div>
          </div>

          <p className="text-center text-white/25 text-xs mt-6">Sara Nossa Terra · Escalas</p>
        </div>
      </div>
    )
  }

  // ── Página principal ──────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0f0f14] flex flex-col">

      {/* Hero Header */}
      <div className="relative bg-gradient-to-b from-[#c62737] to-[#9b1e2b] px-6 pt-10 pb-14 text-center overflow-hidden shrink-0">
        {/* Decoração */}
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/5" />
        <div className="absolute -bottom-16 -left-10 w-52 h-52 rounded-full bg-black/10" />
        <div className="relative">
          <div className="w-12 h-12 bg-white/15 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <Music size={24} className="text-white" />
          </div>
          <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-1">Ministério</p>
          <h1 className="text-3xl font-extrabold text-white leading-tight">{link.ministry}</h1>
          <p className="text-white/70 text-sm mt-2">
            {MONTHS[(link.month ?? 1) - 1]} de {link.year}
            {link.church ? ` · ${link.church.name}` : ''}
          </p>
          {link.label && (
            <span className="inline-block mt-3 px-3 py-1 rounded-full bg-white/15 text-white/90 text-xs font-medium">
              {link.label}
            </span>
          )}
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 -mt-6 rounded-t-3xl bg-[#f8f9fb] overflow-hidden flex flex-col">
        <div className="max-w-xl mx-auto w-full px-4 pt-8 pb-32 space-y-5 flex-1">

          {/* Card: Seleção de voluntário */}
          {!selectedVolunteer ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              {/* Cabeçalho */}
              <div className="px-5 pt-5 pb-4">
                <div className="flex items-center gap-2.5 mb-0.5">
                  <div className="w-7 h-7 rounded-lg bg-[#c62737]/10 flex items-center justify-center shrink-0">
                    <User size={13} className="text-[#c62737]" />
                  </div>
                  <h2 className="font-bold text-slate-800 text-sm">Quem é você?</h2>
                </div>
                <p className="text-xs text-slate-400 ml-9">Toque no seu nome para continuar</p>
              </div>

              {/* Busca */}
              {volunteers.length > 6 && (
                <div className="px-4 pb-3">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      ref={searchRef}
                      type="text"
                      value={volunteerSearch}
                      onChange={e => setVolunteerSearch(e.target.value)}
                      placeholder="Buscar nome…"
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-[#c62737] focus:ring-2 focus:ring-[#c62737]/10 transition-all"
                    />
                  </div>
                </div>
              )}

              {/* Lista de nomes */}
              <div className="px-3 pb-4 max-h-72 overflow-y-auto space-y-1">
                {volunteers.length === 0 ? (
                  <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-3 text-center">
                    Nenhum voluntário cadastrado para esse ministério.
                  </p>
                ) : (
                  (() => {
                    const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase()
                    const search = normalize(volunteerSearch)
                    const filtered = volunteers.filter(v =>
                      normalize(v.full_name).includes(search)
                    )
                    if (filtered.length === 0) return (
                      <p className="text-xs text-slate-400 text-center py-4">Nenhum resultado para "{volunteerSearch}"</p>
                    )
                    return filtered.map(v => {
                      const initials = v.full_name.trim().split(' ').filter(Boolean)
                        .slice(0, 2).map(n => n[0].toUpperCase()).join('')
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => { setSelectedVolunteer(v.id); setVolunteerSearch('') }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#c62737]/5 active:bg-[#c62737]/10 transition-colors text-left group"
                        >
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#c62737] to-[#9b1e2b] flex items-center justify-center shrink-0 shadow-sm">
                            <span className="text-white text-xs font-bold tracking-wide">{initials}</span>
                          </div>
                          <span className="flex-1 text-sm font-semibold text-slate-700 group-hover:text-[#c62737] transition-colors truncate">
                            {v.full_name}
                          </span>
                          <div className="w-6 h-6 rounded-full border-2 border-slate-200 group-hover:border-[#c62737] group-hover:bg-[#c62737] flex items-center justify-center transition-all shrink-0">
                            <div className="w-2 h-2 rounded-full bg-transparent group-hover:bg-white transition-colors" />
                          </div>
                        </button>
                      )
                    })
                  })()
                )}
              </div>
            </div>
          ) : (
            /* Nome selecionado — badge para trocar */
            <button
              type="button"
              onClick={() => { setSelectedVolunteer(''); setAvailability({}); setSelectedFunctions([]); setVolunteerSearch('') }}
              className="w-full flex items-center gap-3 bg-white rounded-2xl shadow-sm border border-slate-100 px-4 py-3.5 text-left hover:border-[#c62737]/30 transition-colors group"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#c62737] to-[#9b1e2b] flex items-center justify-center shrink-0 shadow-sm">
                <span className="text-white text-xs font-bold">
                  {volunteerName.trim().split(' ').filter(Boolean).slice(0, 2).map(n => n[0].toUpperCase()).join('')}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-400">Respondendo como</p>
                <p className="font-bold text-slate-800 text-sm truncate">{volunteerName}</p>
              </div>
              <span className="text-xs text-[#c62737] font-semibold group-hover:underline shrink-0">Trocar</span>
            </button>
          )}

          {/* Funções / Habilidades */}
          {selectedVolunteer && apiData.funcoes_disponiveis.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Music className="text-blue-600" size={14} />
                </div>
                <h2 className="font-bold text-slate-800 text-sm">O que você pode fazer?</h2>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {apiData.funcoes_disponiveis.map(fn => {
                  const active = selectedFunctions.includes(fn)
                  return (
                    <button
                      key={fn}
                      type="button"
                      onClick={() => toggleFunction(fn)}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all border-2 ${
                        active 
                        ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200' 
                        : 'bg-white border-slate-100 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      {fn}
                    </button>
                  )
                })}
              </div>
              
              <p className="text-[10px] text-slate-400 mt-4 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                Selecione as funções que você está apto e disposto a exercer neste mês. Isso ajuda o líder na distribuição.
              </p>
            </div>
          )}

          {/* Agenda do mês */}
          {selectedVolunteer && (
            <>
              {/* Contador de progresso */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-semibold text-slate-500">Sua disponibilidade</span>
                  <span className="text-xs font-bold text-slate-700">{availableCount}/{totalSlots} datas</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#c62737] to-[#e05164] rounded-full transition-all duration-500"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Toque nos cultos em que você <strong className="text-slate-600">não poderá</strong> participar para marcá-los como indisponível.
                </p>
              </div>

              {/* Dias */}
              <div className="space-y-3">
                {Object.keys(slotsByDate).sort().map(date => {
                  const d = new Date(date + 'T12:00:00')
                  const dayFull = DAY_NAMES_FULL[d.getDay()]
                  const dayAbbr = DAY_ABBR[d.getDay()]
                  const dayNum = d.getDate()
                  const monthAbbr = MONTHS[d.getMonth()].slice(0, 3)
                  const allAvail = slotsByDate[date].every(s => availability[s.id] !== false)

                  return (
                    <div key={date} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                      {/* Cabeçalho do dia */}
                      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 bg-slate-50/70">
                        <div className="w-11 h-11 rounded-xl bg-[#c62737] flex flex-col items-center justify-center shrink-0 shadow-sm shadow-[#c62737]/30">
                          <span className="text-[9px] text-white/75 font-bold uppercase leading-none tracking-wide">{dayAbbr}</span>
                          <span className="text-lg font-extrabold text-white leading-tight">{dayNum}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-800 text-sm">{dayFull}</p>
                          <p className="text-xs text-slate-400">{monthAbbr} · {slotsByDate[date].length} {slotsByDate[date].length === 1 ? 'culto' : 'cultos'}</p>
                        </div>
                        {allAvail
                          ? <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full shrink-0">Disponível</span>
                          : <span className="text-xs font-semibold text-red-500 bg-red-50 border border-red-100 px-2.5 py-1 rounded-full shrink-0">Indisponível</span>
                        }
                      </div>

                      {/* Slots do dia */}
                      <div className="divide-y divide-slate-100">
                        {slotsByDate[date].map(slot => {
                          const disp = availability[slot.id] !== false
                          const cfg = TYPE_CONFIG[slot.type] ?? TYPE_CONFIG.culto
                          return (
                            <button
                              key={slot.id}
                              type="button"
                              onClick={() => toggleSlot(slot.id)}
                              className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors active:scale-[0.99] ${disp ? 'hover:bg-slate-50' : 'bg-red-50/60 hover:bg-red-50'}`}
                            >
                              <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold shrink-0 ${cfg.pill}`}>
                                {slot.type}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className={`font-semibold text-sm truncate ${disp ? 'text-slate-800' : 'text-slate-500'}`}>
                                  {slot.label}
                                </p>
                                <p className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                                  <Clock size={10} /> {slot.time_of_day}
                                </p>
                              </div>
                              <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${disp ? 'bg-emerald-100' : 'bg-red-100'}`}>
                                {disp
                                  ? <CheckCircle2 className="text-emerald-500" size={18} />
                                  : <XCircle className="text-red-500" size={18} />
                                }
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>

              {submitError && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
                  <XCircle size={16} className="shrink-0" />
                  {submitError}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Botão fixo no rodapé */}
      {selectedVolunteer && (
        <div className="fixed bottom-0 left-0 right-0 z-20 px-4 pb-6 pt-3 bg-gradient-to-t from-[#f8f9fb] via-[#f8f9fb]/95 to-transparent pointer-events-none">
          <div className="max-w-xl mx-auto pointer-events-auto">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#c62737] to-[#d63344] text-white font-bold text-base shadow-xl shadow-[#c62737]/30 hover:from-[#a62030] hover:to-[#c62737] disabled:opacity-60 transition-all flex items-center justify-center gap-2.5 active:scale-[0.98]"
            >
              {submitting
                ? <><Loader2 className="animate-spin" size={19} /> Enviando...</>
                : <><Send size={17} /> Confirmar disponibilidade</>
              }
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
