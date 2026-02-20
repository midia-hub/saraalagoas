'use client'

import { ChevronDown, Calendar, Clock } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

interface DayOfWeekSelectProps {
  value: number
  onChange: (value: number) => void
  label?: string
  className?: string
}

const DAYS = [
  { value: 0, label: 'Domingo', emoji: '🕐', color: 'text-blue-600' },
  { value: 1, label: 'Segunda', emoji: '📅', color: 'text-slate-600' },
  { value: 2, label: 'Terça', emoji: '📅', color: 'text-slate-600' },
  { value: 3, label: 'Quarta', emoji: '📅', color: 'text-slate-600' },
  { value: 4, label: 'Quinta', emoji: '📅', color: 'text-slate-600' },
  { value: 5, label: 'Sexta', emoji: '📅', color: 'text-slate-600' },
  { value: 6, label: 'Sábado', emoji: '🛕', color: 'text-purple-600' },
]

export function DayOfWeekSelect({ value, onChange, label, className = '' }: DayOfWeekSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedDay = DAYS.find(d => d.value === value)

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {label && <label className="block text-xs font-medium text-slate-700 mb-2">{label}</label>}
      
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg shadow-sm hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-[#c62737]/30 focus:border-[#c62737] transition flex items-center justify-between text-left"
      >
        <span className="flex items-center gap-2">
          <span className="text-lg">{selectedDay?.emoji}</span>
          <span className="font-medium text-slate-900">{selectedDay?.label}</span>
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-500 transition ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-300 rounded-lg shadow-lg z-50 overflow-hidden">
          <div className="max-h-64 overflow-y-auto">
            {DAYS.map(day => (
              <button
                key={day.value}
                onClick={() => {
                  onChange(day.value)
                  setIsOpen(false)
                }}
                className={`w-full px-4 py-3 text-left hover:bg-slate-50 transition flex items-center gap-3 border-b border-slate-100 last:border-b-0 ${
                  value === day.value ? 'bg-blue-50 border-l-4 border-l-[#c62737]' : ''
                }`}
              >
                <span className="text-xl">{day.emoji}</span>
                <div className="flex-1">
                  <div className={`font-medium ${value === day.value ? 'text-[#c62737]' : 'text-slate-900'}`}>
                    {day.label}
                  </div>
                </div>
                {value === day.value && (
                  <div className="w-2 h-2 rounded-full bg-[#c62737]"></div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

interface ArenaSelectProps {
  value: string | null
  onChange: (value: string | null) => void
  arenas: Array<{ id: string; name: string }>
  label?: string
  placeholder?: string
  className?: string
}

export function ArenaSelect({ value, onChange, arenas, label, placeholder = 'Selecione uma arena...', className = '' }: ArenaSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedArena = arenas.find(a => a.id === value)

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {label && <label className="block text-xs font-medium text-slate-700 mb-2">{label}</label>}
      
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg shadow-sm hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-[#c62737]/30 focus:border-[#c62737] transition flex items-center justify-between text-left"
      >
        <span className="flex items-center gap-2">
          <span className="text-lg">🏟️</span>
          <span className={`font-medium ${selectedArena ? 'text-slate-900' : 'text-slate-400'}`}>
            {selectedArena?.name || placeholder}
          </span>
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-500 transition ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-300 rounded-lg shadow-lg z-50 overflow-hidden">
          {arenas.length === 0 ? (
            <div className="px-4 py-6 text-center text-slate-500 text-sm">
              Nenhuma arena disponível
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              {arenas.map(arena => (
                <button
                  key={arena.id}
                  onClick={() => {
                    onChange(arena.id)
                    setIsOpen(false)
                  }}
                  className={`w-full px-4 py-3 text-left hover:bg-slate-50 transition flex items-center gap-3 border-b border-slate-100 last:border-b-0 ${
                    value === arena.id ? 'bg-blue-50 border-l-4 border-l-[#c62737]' : ''
                  }`}
                >
                  <span className="text-xl">🏟️</span>
                  <div className="flex-1">
                    <div className={`font-medium ${value === arena.id ? 'text-[#c62737]' : 'text-slate-900'}`}>
                      {arena.name}
                    </div>
                  </div>
                  {value === arena.id && (
                    <div className="w-2 h-2 rounded-full bg-[#c62737]"></div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface TimeSelectProps {
  value: string
  onChange: (value: string) => void
  label?: string
  className?: string
}

export function TimeSelect({ value, onChange, label, className = '' }: TimeSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [customTime, setCustomTime] = useState(value)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Common times
  const commonTimes = [
    '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
    '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'
  ]

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const handleCustomTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setCustomTime(newValue)
  }

  const handleCustomTimeSubmit = () => {
    if (customTime && /^\d{2}:\d{2}$/.test(customTime)) {
      onChange(customTime)
      setIsOpen(false)
    }
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {label && <label className="block text-xs font-medium text-slate-700 mb-2">{label}</label>}
      
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg shadow-sm hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-[#c62737]/30 focus:border-[#c62737] transition flex items-center justify-between text-left"
      >
        <span className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-slate-500" />
          <span className="font-medium text-slate-900">{value}</span>
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-500 transition ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-300 rounded-lg shadow-lg z-50 overflow-hidden">
          {/* Input customizado para horário */}
          <div className="p-3 border-b border-slate-200">
            <label className="block text-xs font-medium text-slate-600 mb-2">Digitar horário personalizado:</label>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="time"
                value={customTime}
                onChange={handleCustomTimeChange}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleCustomTimeSubmit()
                  }
                }}
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c62737]/30 focus:border-[#c62737]"
                placeholder="HH:MM"
              />
              <button
                onClick={handleCustomTimeSubmit}
                className="px-3 py-2 bg-[#c62737] text-white rounded-lg text-sm font-medium hover:bg-[#a81f2c] transition"
              >
                OK
              </button>
            </div>
          </div>

          {/* Lista de horários comuns */}
          <div className="max-h-64 overflow-y-auto">
            <div className="px-4 py-2 text-xs font-medium text-slate-500 bg-slate-50">Horários comuns:</div>
            {commonTimes.map(time => (
              <button
                key={time}
                onClick={() => {
                  onChange(time)
                  setCustomTime(time)
                  setIsOpen(false)
                }}
                className={`w-full px-4 py-3 text-left hover:bg-slate-50 transition flex items-center gap-3 border-b border-slate-100 last:border-b-0 ${
                  value === time ? 'bg-blue-50 border-l-4 border-l-[#c62737]' : ''
                }`}
              >
                <Clock className="w-4 h-4 text-slate-400" />
                <div className="flex-1">
                  <div className={`font-medium ${value === time ? 'text-[#c62737]' : 'text-slate-900'}`}>
                    {time}
                  </div>
                </div>
                {value === time && (
                  <div className="w-2 h-2 rounded-full bg-[#c62737]"></div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
