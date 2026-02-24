'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Building2,
  Calendar,
  Clock,
  Users,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Phone,
  User,
  FileText,
  Loader2,
  BadgeCheck,
  MapPin,
  Info,
  ChevronLeft,
  X,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────

type Room = {
  id: string
  name: string
  description: string | null
  capacity: number | null
  available_days: number[]
  available_start_time: string
  available_end_time: string
  day_times?: Record<number, { start: string; end: string }>
}

type Step = 'sala' | 'horario' | 'dados' | 'sucesso'

const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const DAY_NAMES_FULL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

function formatDate(iso: string) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function getTodayBrasilia() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
}

function getDayOfWeek(dateStr: string): number {
  if (!dateStr) return -1
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).getDay()
}

function formatTime(time: string): string {
  if (!time) return ''
  return time.substring(0, 5)
}

function generateTimeSlots(start: string, end: string, step = 30) {
  const slots: string[] = []
  if (!start || !end) return slots
  const startFormatted = formatTime(start)
  const endFormatted = formatTime(end)
  const [sh, sm] = startFormatted.split(':').map(Number)
  const [eh, em] = endFormatted.split(':').map(Number)
  if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return slots
  let cur = sh * 60 + sm
  const endMins = eh * 60 + em
  while (cur <= endMins) {
    const hh = String(Math.floor(cur / 60)).padStart(2, '0')
    const mm = String(cur % 60).padStart(2, '0')
    slots.push(`${hh}:${mm}`)
    cur += step
  }
  return slots
}

// ── Custom DatePicker ──────────────────────────────────────────────────────

const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const DAY_LABELS_SHORT = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

function CustomDatePicker({ value, onChange, minDate }: { value: string; onChange: (date: string) => void; minDate: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [viewMonth, setViewMonth] = useState(new Date())
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const displayValue = value ? formatDate(value) : ''
  const year = viewMonth.getFullYear()
  const month = viewMonth.getMonth()

  const firstDayOfMonth = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const days: (number | null)[] = []
  for (let i = 0; i < firstDayOfMonth; i++) days.push(null)
  for (let d = 1; d <= daysInMonth; d++) days.push(d)

  const minDateObj = minDate ? new Date(minDate) : null
  const selectedDateObj = value ? new Date(value) : null

  function selectDate(day: number) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    onChange(dateStr)
    setIsOpen(false)
  }

  function goToToday() {
    const today = getTodayBrasilia()
    onChange(today)
    setIsOpen(false)
  }

  return (
    <div className="relative" ref={pickerRef}>
      <div className="relative">
        <Calendar size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10" />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full border border-slate-200 rounded-xl pl-10 pr-10 py-3 text-sm bg-slate-50 focus:ring-2 focus:ring-red-100 focus:border-[#c62737] outline-none transition hover:bg-slate-100 text-left"
        >
          {displayValue || 'Selecione'}
        </button>
        <ChevronRight size={14} className={`absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-slate-400 pointer-events-none transition-transform ${isOpen ? '-rotate-90' : 'rotate-90'}`} />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 z-50 w-80">
          {/* Header */}
          <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100">
            <button
              type="button"
              onClick={() => setViewMonth(new Date(year, month - 1, 1))}
              className="p-1.5 hover:bg-slate-100 rounded-lg transition"
            >
              <ChevronLeft size={18} className="text-slate-600" />
            </button>
            <span className="font-semibold text-slate-800 text-sm">
              {MONTH_NAMES[month]} {year}
            </span>
            <button
              type="button"
              onClick={() => setViewMonth(new Date(year, month + 1, 1))}
              className="p-1.5 hover:bg-slate-100 rounded-lg transition"
            >
              <ChevronRight size={18} className="text-slate-600" />
            </button>
          </div>

          {/* Days header */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAY_LABELS_SHORT.map((d, i) => (
              <div key={i} className="text-center text-xs font-semibold text-slate-500 py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, idx) => {
              if (!day) return <div key={idx} />
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const dateObj = new Date(year, month, day)
              const isDisabled = minDateObj ? dateObj < minDateObj : false
              const isSelected = selectedDateObj ? 
                dateObj.getFullYear() === selectedDateObj.getFullYear() &&
                dateObj.getMonth() === selectedDateObj.getMonth() &&
                dateObj.getDate() === selectedDateObj.getDate() : false

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => selectDate(day)}
                  className={`aspect-square flex items-center justify-center text-sm rounded-lg transition
                    ${isSelected 
                      ? 'bg-[#c62737] text-white font-bold shadow-md' 
                      : isDisabled
                        ? 'text-slate-300 cursor-not-allowed'
                        : 'hover:bg-slate-100 text-slate-700'
                    }`}
                >
                  {day}
                </button>
              )
            })}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => { onChange(''); setIsOpen(false) }}
              className="text-xs text-slate-500 hover:text-[#c62737] transition font-medium"
            >
              Limpar
            </button>
            <button
              type="button"
              onClick={goToToday}
              className="text-xs text-[#c62737] hover:text-[#9e1f2e] transition font-semibold"
            >
              Hoje
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Custom TimeSelect ──────────────────────────────────────────────────────

function CustomTimeSelect({ 
  value, 
  onChange, 
  options, 
  placeholder = 'Selecione',
  isDisabled
}: { 
  value: string
  onChange: (time: string) => void
  options: string[]
  placeholder?: string
  isDisabled?: (time: string) => boolean
}) {
  const [isOpen, setIsOpen] = useState(false)
  const selectRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (selectRef.current && !selectRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  function selectTime(time: string) {
    if (!isDisabled || !isDisabled(time)) {
      onChange(time)
      setIsOpen(false)
    }
  }

  return (
    <div className="relative" ref={selectRef}>
      <div className="relative">
        <Clock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10" />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full border border-slate-200 rounded-xl pl-10 pr-10 py-3 text-sm bg-slate-50 focus:ring-2 focus:ring-red-100 focus:border-[#c62737] outline-none transition hover:bg-slate-100 text-left"
        >
          {value || placeholder}
        </button>
        <ChevronRight size={14} className={`absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-slate-400 pointer-events-none transition-transform ${isOpen ? '-rotate-90' : 'rotate-90'}`} />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 w-full max-h-60 overflow-y-auto">
          {options.map((time) => {
            const disabled = isDisabled ? isDisabled(time) : false
            const selected = time === value

            return (
              <button
                key={time}
                type="button"
                disabled={disabled}
                onClick={() => selectTime(time)}
                className={`w-full px-4 py-2.5 text-left text-sm transition
                  ${selected 
                    ? 'bg-[#c62737] text-white font-semibold' 
                    : disabled
                      ? 'text-slate-300 cursor-not-allowed'
                      : 'hover:bg-slate-100 text-slate-700'
                  }`}
              >
                {time}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Steps Header ───────────────────────────────────────────────────────────

const STEPS = [
  { key: 'sala', label: 'Escolher Sala', icon: Building2 },
  { key: 'horario', label: 'Data & Horário', icon: Calendar },
  { key: 'dados', label: 'Seus Dados', icon: User },
] as const

function StepsHeader({ current }: { current: Step }) {
  const stepOrder: Step[] = ['sala', 'horario', 'dados', 'sucesso']
  const currentIndex = stepOrder.indexOf(current)

  return (
    <div className="flex items-center justify-center gap-0 w-full max-w-lg mx-auto">
      {STEPS.map((step, idx) => {
        const stepIdx = stepOrder.indexOf(step.key as Step)
        const done = stepIdx < currentIndex
        const active = step.key === current
        const Icon = step.icon
        return (
          <div key={step.key} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all
                  ${done ? 'bg-emerald-500 border-emerald-500 text-white' :
                    active ? 'bg-white border-[#c62737] text-[#c62737] shadow-md' :
                    'bg-white border-slate-200 text-slate-400'}`}
              >
                {done ? <CheckCircle2 size={20} /> : <Icon size={18} />}
              </div>
              <span className={`text-xs mt-1.5 font-medium text-center leading-tight
                ${active ? 'text-[#c62737]' : done ? 'text-emerald-600' : 'text-slate-400'}`}>
                {step.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div className={`h-0.5 w-8 mb-5 transition-colors ${done ? 'bg-emerald-400' : 'bg-slate-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Room Card ──────────────────────────────────────────────────────────────

function RoomCard({ room, selected, onSelect }: { room: Room; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left rounded-2xl border-2 p-5 transition-all cursor-pointer group
        ${selected
          ? 'border-[#c62737] bg-red-50/60 shadow-md shadow-red-100'
          : 'border-slate-200 bg-white hover:border-red-200 hover:shadow-sm'
        }`}
    >
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors
          ${selected ? 'bg-[#c62737] text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-red-100 group-hover:text-[#c62737]'}`}>
          <Building2 size={22} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className={`font-semibold text-base ${selected ? 'text-[#c62737]' : 'text-slate-800'}`}>
              {room.name}
            </h3>
            {selected && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                <CheckCircle2 size={11} /> Selecionada
              </span>
            )}
          </div>
          {room.description && (
            <p className="text-sm text-slate-500 mt-0.5 line-clamp-2">{room.description}</p>
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5">
            {room.capacity && (
              <span className="flex items-center gap-1.5 text-xs text-slate-500">
                <Users size={13} /> Até {room.capacity} pessoas
              </span>
            )}
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
              <Clock size={13} /> {formatTime(room.available_start_time)} – {formatTime(room.available_end_time)}
            </span>
          </div>
          <div className="flex gap-1 mt-2.5 flex-wrap">
            {DAY_NAMES.map((d, i) => (
              <span
                key={i}
                className={`text-xs px-2 py-0.5 rounded-md font-medium
                  ${room.available_days.includes(i)
                    ? selected ? 'bg-[#c62737]/15 text-[#c62737]' : 'bg-blue-100 text-blue-700'
                    : 'bg-slate-100 text-slate-300'
                  }`}
              >
                {d}
              </span>
            ))}
          </div>
        </div>
        <ChevronRight
          size={18}
          className={`shrink-0 mt-1 transition-colors ${selected ? 'text-[#c62737]' : 'text-slate-300 group-hover:text-slate-400'}`}
        />
      </div>
    </button>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function ReservarSalaPage() {
  const [step, setStep] = useState<Step>('sala')
  const [rooms, setRooms] = useState<Room[]>([])
  const [loadingRooms, setLoadingRooms] = useState(true)
  const [roomsError, setRoomsError] = useState('')

  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [reason, setReason] = useState('')
  const [peopleCount, setPeopleCount] = useState('')

  const [availability, setAvailability] = useState<null | { available: boolean; reason?: string }>(null)
  const [checkingAvailability, setCheckingAvailability] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [reservationId, setReservationId] = useState('')

  // Sugestões de pessoas
  const [personSuggestions, setPersonSuggestions] = useState<any[]>([])
  const [showPersonSuggestions, setShowPersonSuggestions] = useState(false)

  const today = useMemo(() => getTodayBrasilia(), [])

  // Buscar sugestões de pessoas
  useEffect(() => {
    if (name.length < 3) {
      setPersonSuggestions([])
      setShowPersonSuggestions(false)
      return
    }

    const timer = setTimeout(() => {
      fetch(`/api/public/lookups/people?q=${encodeURIComponent(name)}`)
        .then(r => r.json())
        .then(data => {
          setPersonSuggestions(data.items || [])
          setShowPersonSuggestions((data.items || []).length > 0)
        })
    }, 500)

    return () => clearTimeout(timer)
  }, [name])

  // Fetch rooms
  useEffect(() => {
    fetch('/api/public/reservas/rooms')
      .then(r => r.json())
      .then(d => {
        setRooms(d.items ?? [])
        setLoadingRooms(false)
      })
      .catch(() => {
        setRoomsError('Não foi possível carregar as salas. Tente novamente.')
        setLoadingRooms(false)
      })
  }, [])

  // Check availability when date/time changes
  const checkAvailability = useCallback(async () => {
    if (!selectedRoom || !date || !startTime || !endTime) return
    setCheckingAvailability(true)
    setAvailability(null)
    try {
      const params = new URLSearchParams({
        roomId: selectedRoom.id,
        date,
        start_time: startTime,
        end_time: endTime,
      })
      const res = await fetch(`/api/public/reservas/check-availability?${params}`)
      const data = await res.json()
      setAvailability({ available: data.available, reason: data.reason })
    } catch {
      setAvailability({ available: false, reason: 'Erro ao verificar disponibilidade.' })
    } finally {
      setCheckingAvailability(false)
    }
  }, [selectedRoom, date, startTime, endTime])

  useEffect(() => {
    if (date && startTime && endTime && selectedRoom) {
      checkAvailability()
    } else {
      setAvailability(null)
    }
  }, [date, startTime, endTime, selectedRoom, checkAvailability])

  const dayOfWeek = getDayOfWeek(date)
  const isDayAllowed = selectedRoom && date ? selectedRoom.available_days.includes(dayOfWeek) : true

  const timeSlots = useMemo(() => {
    if (!selectedRoom) return []
    
    // Se há data selecionada e day_times configurado, usar horários específicos do dia
    if (date && selectedRoom.day_times) {
      const dayOfWeek = getDayOfWeek(date)
      const dayTime = selectedRoom.day_times[dayOfWeek]
      if (dayTime) {
        const start = dayTime.start + ':00'
        const end = dayTime.end + ':00'
        return generateTimeSlots(start, end, 30)
      }
    }
    
    // Fallback para horários gerais
    const start = selectedRoom.available_start_time || '08:00:00'
    const end = selectedRoom.available_end_time || '22:00:00'
    return generateTimeSlots(start, end, 30)
  }, [selectedRoom, date])

  // Limpa horários quando os slots disponíveis mudarem
  useEffect(() => {
    if (startTime && timeSlots.length > 0 && !timeSlots.includes(startTime)) {
      setStartTime('')
      setAvailability(null)
    }
    if (endTime && timeSlots.length > 0 && !timeSlots.includes(endTime)) {
      setEndTime('')
      setAvailability(null)
    }
  }, [timeSlots, startTime, endTime])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedRoom || !date || !startTime || !endTime || !name) return
    setSubmitting(true)
    setSubmitError('')
    try {
      const res = await fetch('/api/public/reservas/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: selectedRoom.id,
          date,
          start_time: startTime,
          end_time: endTime,
          requester_name: name,
          requester_phone: phone,
          reason,
          people_count: peopleCount ? Number(peopleCount) : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setSubmitError(data.error ?? 'Erro ao enviar solicitação.')
        return
      }
      setReservationId(data.reservation?.id ?? '')
      setStep('sucesso')
    } catch {
      setSubmitError('Erro de conexão. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Render ──

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(160deg, #f8fafc 0%, #f1f5f9 100%)' }}>
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/60 bg-white/80 backdrop-blur-md shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2.5 group">
            <Image src="/brand/logo.png" alt="Sara Alagoas" width={36} height={36} className="rounded-lg" />
            <span className="font-bold text-slate-800 text-sm hidden sm:block">Sara Sede Alagoas</span>
          </Link>
          <span className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: '#c62737' }}>
            <Building2 size={16} />
            Reserva de Sala
          </span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 pb-16">
        {step !== 'sucesso' && (
          <div className="mb-8">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-slate-900">Solicitar Reserva de Sala</h1>
              <p className="text-slate-500 text-sm mt-1">
                Preencha os dados abaixo para solicitar o uso de um espaço da Igreja
              </p>
            </div>
            <StepsHeader current={step} />
          </div>
        )}

        {/* ── STEP 1: Escolher sala ── */}
        {step === 'sala' && (
          <div className="space-y-4">
            {loadingRooms && (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                <Loader2 size={32} className="animate-spin" />
                <span className="text-sm">Carregando salas disponíveis…</span>
              </div>
            )}
            {roomsError && (
              <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertCircle size={16} /> {roomsError}
              </div>
            )}
            {!loadingRooms && !roomsError && rooms.length === 0 && (
              <div className="text-center py-16 text-slate-400">
                <Building2 size={40} className="mx-auto mb-3 opacity-30" />
                <p className="font-medium">Nenhuma sala disponível no momento</p>
              </div>
            )}
            {rooms.map(room => (
              <RoomCard
                key={room.id}
                room={room}
                selected={selectedRoom?.id === room.id}
                onSelect={() => setSelectedRoom(room)}
              />
            ))}
            {rooms.length > 0 && (
              <div className="pt-2">
                <button
                  type="button"
                  disabled={!selectedRoom}
                  onClick={() => setStep('horario')}
                  className="w-full py-3.5 rounded-2xl font-semibold text-white text-sm transition-all
                    disabled:opacity-40 disabled:cursor-not-allowed
                    shadow-lg active:scale-[0.98]"
                  style={{ background: selectedRoom ? 'linear-gradient(135deg, #c62737 0%, #9e1f2e 100%)' : undefined, backgroundColor: !selectedRoom ? '#e2e8f0' : undefined }}
                >
                  <span className="flex items-center justify-center gap-2">
                    Continuar <ChevronRight size={18} />
                  </span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2: Data e Horário ── */}
        {step === 'horario' && selectedRoom && (
          <form
            onSubmit={(e) => { e.preventDefault(); if (availability?.available) setStep('dados') }}
            className="space-y-5"
          >
            {/* Sala selecionada */}
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center shrink-0" style={{ color: '#c62737' }}>
                <Building2 size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-400 font-medium">Sala selecionada</p>
                <p className="font-semibold text-slate-800 text-sm">{selectedRoom.name}</p>
              </div>
              <button
                type="button"
                onClick={() => { setStep('sala'); setDate(''); setStartTime(''); setEndTime(''); setAvailability(null) }}
                className="text-xs text-slate-400 hover:text-[#c62737] transition-colors font-medium"
              >
                Trocar
              </button>
            </div>

            {/* Info dias disponíveis */}
            <div className="flex items-start gap-2 rounded-xl bg-blue-50 border border-blue-100 px-3.5 py-2.5 text-xs text-blue-700">
              <Info size={14} className="shrink-0 mt-0.5" />
              <span>
                {date && selectedRoom.day_times ? (
                  <>
                    Disponível em <strong>{formatDate(date)}</strong> das{' '}
                    <strong>{selectedRoom.day_times[dayOfWeek]?.start || '08:00'}</strong> às{' '}
                    <strong>{selectedRoom.day_times[dayOfWeek]?.end || '22:00'}</strong>
                  </>
                ) : (
                  <>
                    Disponível às <strong>{DAY_NAMES_FULL.filter((_, i) => selectedRoom.available_days.includes(i)).join(', ')}</strong>
                  </>
                )}
              </span>
            </div>

            {/* Data */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-1.5">
                  <Calendar size={13} /> Data do evento *
                </label>
                <CustomDatePicker
                  value={date}
                  onChange={(newDate) => { setDate(newDate); setAvailability(null) }}
                  minDate={today}
                />
                {date && !isDayAllowed && (
                  <span className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-1">
                    <AlertCircle size={13} />
                    {DAY_NAMES_FULL[dayOfWeek]} não é um dia disponível para esta sala.
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-1.5">
                    <Clock size={13} /> Início *
                  </label>
                  <CustomTimeSelect
                    value={startTime}
                    onChange={(time) => { setStartTime(time); setAvailability(null) }}
                    options={timeSlots.slice(0, -1)}
                    placeholder="Selecione"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-1.5">
                    <Clock size={13} /> Término *
                  </label>
                  <CustomTimeSelect
                    value={endTime}
                    onChange={(time) => { setEndTime(time); setAvailability(null) }}
                    options={timeSlots.slice(1)}
                    placeholder="Selecione"
                    isDisabled={(time) => startTime ? time <= startTime : false}
                  />
                </div>
              </div>

              {/* Availability status */}
              {checkingAvailability && (
                <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-50 rounded-xl px-3 py-2.5">
                  <Loader2 size={15} className="animate-spin" />
                  Verificando disponibilidade…
                </div>
              )}
              {!checkingAvailability && availability && (
                <div className={`flex items-center gap-2 text-sm rounded-xl px-3 py-2.5 border ${
                  availability.available
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : 'bg-red-50 border-red-200 text-red-700'
                }`}>
                  {availability.available
                    ? <><CheckCircle2 size={16} /> Horário disponível! Pode continuar.</>
                    : <><AlertCircle size={16} /> {availability.reason ?? 'Horário indisponível.'}</>}
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setStep('sala')}
                className="flex items-center gap-1.5 px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-600 text-sm font-medium hover:bg-slate-50 transition"
              >
                <ArrowLeft size={16} /> Voltar
              </button>
              <button
                type="submit"
                disabled={!availability?.available || !date || !startTime || !endTime}
                className="flex-1 py-3 rounded-2xl font-semibold text-white text-sm transition-all
                  disabled:opacity-40 disabled:cursor-not-allowed shadow-lg active:scale-[0.98]"
                style={{ background: 'linear-gradient(135deg, #c62737 0%, #9e1f2e 100%)' }}
              >
                <span className="flex items-center justify-center gap-2">
                  Continuar <ChevronRight size={18} />
                </span>
              </button>
            </div>
          </form>
        )}

        {/* ── STEP 3: Dados pessoais ── */}
        {step === 'dados' && selectedRoom && (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Resumo */}
            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden">
              <div className="px-5 py-3 bg-slate-50">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Resumo da reserva</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 divide-x divide-slate-100">
                <div className="px-4 py-3 flex flex-col gap-0.5">
                  <span className="text-xs text-slate-400 flex items-center gap-1"><Building2 size={11} /> Sala</span>
                  <span className="font-semibold text-slate-800 text-sm">{selectedRoom.name}</span>
                </div>
                <div className="px-4 py-3 flex flex-col gap-0.5">
                  <span className="text-xs text-slate-400 flex items-center gap-1"><Calendar size={11} /> Data</span>
                  <span className="font-semibold text-slate-800 text-sm">{formatDate(date)}</span>
                </div>
                <div className="px-4 py-3 flex flex-col gap-0.5 col-span-2 sm:col-span-1">
                  <span className="text-xs text-slate-400 flex items-center gap-1"><Clock size={11} /> Horário</span>
                  <span className="font-semibold text-slate-800 text-sm">{startTime} – {endTime}</span>
                </div>
              </div>
            </div>

            {/* Dados pessoais */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <User size={15} style={{ color: '#c62737' }} /> Dados do solicitante
              </h3>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Nome completo *</label>
                <div className="relative">
                  <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="Seu nome"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onBlur={() => setTimeout(() => setShowPersonSuggestions(false), 200)}
                    onFocus={() => name.length >= 3 && setShowPersonSuggestions(personSuggestions.length > 0)}
                    className="w-full border border-slate-200 rounded-xl pl-9 pr-4 py-3 text-sm bg-slate-50 focus:ring-2 focus:ring-red-100 focus:border-[#c62737] outline-none transition"
                  />
                  {showPersonSuggestions && (
                    <div className="absolute top-[calc(100%+4px)] left-0 w-full bg-white border border-slate-200 rounded-xl shadow-xl z-[60] py-1 animate-in fade-in slide-in-from-top-1 px-1">
                      {personSuggestions.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault()
                            setName(p.full_name)
                            if (p.mobile_phone) setPhone(p.mobile_phone)
                            setShowPersonSuggestions(false)
                          }}
                          className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-red-50 transition-colors flex items-center justify-between group"
                        >
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-slate-700 group-hover:text-[#c62737]">{p.full_name}</span>
                            {p.mobile_phone && <span className="text-[10px] text-slate-400">{p.mobile_phone}</span>}
                          </div>
                          <div className="h-5 w-5 rounded-full bg-slate-100 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <ChevronRight size={12} className="text-[#c62737]" />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">WhatsApp *</label>
                <div className="relative">
                  <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    required
                    placeholder="(82) 9 0000-0000"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl pl-9 pr-4 py-3 text-sm bg-slate-50 focus:ring-2 focus:ring-red-100 focus:border-[#c62737] outline-none transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-1">
                    <Users size={12} /> Nº de pessoas
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={selectedRoom.capacity ?? undefined}
                    placeholder="Ex: 20"
                    value={peopleCount}
                    onChange={e => setPeopleCount(e.target.value)}
                    className="border border-slate-200 rounded-xl px-4 py-3 text-sm bg-slate-50 focus:ring-2 focus:ring-red-100 focus:border-[#c62737] outline-none transition"
                  />
                </div>
                {selectedRoom.capacity && (
                  <div className="flex items-end pb-3">
                    <span className="text-xs text-slate-400">
                      Capacidade máxima: <strong className="text-slate-600">{selectedRoom.capacity} pessoas</strong>
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Motivo */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-2">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-1.5">
                <FileText size={13} /> Motivo / Descrição do evento
              </label>
              <textarea
                placeholder="Ex: Reunião de célula, ensaio do coral, capacitação…"
                value={reason}
                onChange={e => setReason(e.target.value)}
                rows={3}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-slate-50 focus:ring-2 focus:ring-red-100 focus:border-[#c62737] outline-none transition resize-none"
              />
            </div>

            {submitError && (
              <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertCircle size={15} /> {submitError}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setStep('horario')}
                className="flex items-center gap-1.5 px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-600 text-sm font-medium hover:bg-slate-50 transition"
              >
                <ArrowLeft size={16} /> Voltar
              </button>
              <button
                type="submit"
                disabled={submitting || !name || !phone}
                className="flex-1 py-3 rounded-2xl font-semibold text-white text-sm transition-all
                  disabled:opacity-40 disabled:cursor-not-allowed shadow-lg active:scale-[0.98]"
                style={{ background: 'linear-gradient(135deg, #c62737 0%, #9e1f2e 100%)' }}
              >
                {submitting
                  ? <span className="flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> Enviando…</span>
                  : <span className="flex items-center justify-center gap-2">Enviar solicitação <ChevronRight size={18} /></span>
                }
              </button>
            </div>
          </form>
        )}

        {/* ── SUCESSO ── */}
        {step === 'sucesso' && (
          <div className="flex flex-col items-center text-center py-10 gap-6">
            <div
              className="w-24 h-24 rounded-3xl flex items-center justify-center shadow-xl"
              style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
            >
              <BadgeCheck size={48} className="text-white" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-slate-900">Solicitação enviada!</h2>
              <p className="text-slate-500 max-w-sm">
                Sua solicitação foi enviada com sucesso para análise. Você será avisado via{' '}
                <strong className="text-slate-700">WhatsApp</strong> assim que ela for aprovada.
              </p>
            </div>

            {/* Resumo final */}
            {selectedRoom && (
              <div className="w-full max-w-sm rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-slate-50 border-b border-slate-100 px-4 py-2.5">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Detalhes da reserva</p>
                </div>
                <div className="divide-y divide-slate-100">
                  <div className="flex items-center gap-3 px-4 py-3">
                    <Building2 size={16} className="text-slate-400 shrink-0" />
                    <div>
                      <p className="text-xs text-slate-400">Sala</p>
                      <p className="text-sm font-medium text-slate-700">{selectedRoom.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 px-4 py-3">
                    <Calendar size={16} className="text-slate-400 shrink-0" />
                    <div>
                      <p className="text-xs text-slate-400">Data</p>
                      <p className="text-sm font-medium text-slate-700">{formatDate(date)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 px-4 py-3">
                    <Clock size={16} className="text-slate-400 shrink-0" />
                    <div>
                      <p className="text-xs text-slate-400">Horário</p>
                      <p className="text-sm font-medium text-slate-700">{startTime} – {endTime}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 px-4 py-3">
                    <User size={16} className="text-slate-400 shrink-0" />
                    <div>
                      <p className="text-xs text-slate-400">Solicitante</p>
                      <p className="text-sm font-medium text-slate-700">{name}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 w-full max-w-xs mt-2">
              <button
                type="button"
                onClick={() => {
                  setStep('sala')
                  setSelectedRoom(null)
                  setDate('')
                  setStartTime('')
                  setEndTime('')
                  setName('')
                  setPhone('')
                  setReason('')
                  setPeopleCount('')
                  setAvailability(null)
                  setReservationId('')
                }}
                className="flex-1 py-3 rounded-2xl font-semibold text-sm border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition shadow-sm"
              >
                Nova solicitação
              </button>
              <Link
                href="/"
                className="flex-1 py-3 rounded-2xl font-semibold text-white text-sm text-center transition shadow-lg"
                style={{ background: 'linear-gradient(135deg, #c62737 0%, #9e1f2e 100%)' }}
              >
                Ir para o início
              </Link>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/60 bg-white/60 backdrop-blur-sm py-6 mt-4">
        <div className="max-w-2xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <MapPin size={12} /> Sara Nossa Terra — Sede Alagoas
          </span>
          <Link href="/privacidade" className="hover:text-slate-600 transition-colors">
            Política de Privacidade
          </Link>
        </div>
      </footer>
    </div>
  )
}
