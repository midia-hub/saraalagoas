'use client'

import { useRef, useEffect, useState } from 'react'
import Calendar from 'react-calendar'
import {
  ChevronLeft,
  ChevronRight,
  X,
  CalendarDays,
  Trash2,
  Target,
  ArrowRight
} from 'lucide-react'
import { getTodayBrasilia } from '@/lib/date-utils'
import { motion, AnimatePresence } from 'framer-motion'
import 'react-calendar/dist/Calendar.css'

type ValuePiece = Date | null
type Value = ValuePiece | [ValuePiece, ValuePiece]

function toYMD(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function toDisplay(ymd: string): string {
  if (!ymd || ymd.length < 10) return ''
  const [y, m, d] = ymd.slice(0, 10).split('-')
  return d && m && y ? `${d}/${m}/${y}` : ymd
}

function parseYMD(ymd: string): Date | null {
  if (!ymd || ymd.length < 10) return null
  const [y, m, d] = ymd.slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return null
  const date = new Date(y, m - 1, d)
  return isNaN(date.getTime()) ? null : date
}

export type DatePickerInputProps = {
  id?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  className?: string
  inputClassName?: string
  minDate?: Date
  maxDate?: Date
  isDateDisabled?: (date: Date) => boolean
}

export function DatePickerInput({
  id,
  value,
  onChange,
  placeholder = 'dd/mm/aaaa',
  required,
  className = '',
  inputClassName = '',
  minDate,
  maxDate,
  isDateDisabled,
}: DatePickerInputProps) {
  const [open, setOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  const dateValue: Value = parseYMD(value) ?? null
  const displayStr = value ? toDisplay(value) : ''

  // Sincroniza o estado local quando o valor externo muda (ex: via calendário)
  useEffect(() => {
    setInputValue(displayStr)
  }, [displayStr])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  const handleSelect = (v: Value) => {
    const d = Array.isArray(v) ? v[0] : v
    if (d instanceof Date) {
      onChange(toYMD(d))
      setOpen(false)
    }
  }

  const handleLimpar = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    setInputValue('')
    onChange('')
    setOpen(false)
  }

  const handleHoje = () => {
    const hoje = getTodayBrasilia()
    setInputValue(toDisplay(hoje))
    onChange(hoje)
    setOpen(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, '')
    if (v.length > 8) v = v.slice(0, 8)

    // Aplica máscara dd/mm/aaaa
    let masked = v
    if (v.length > 2) masked = v.slice(0, 2) + '/' + v.slice(2)
    if (v.length > 4) masked = v.slice(0, 2) + '/' + v.slice(2, 4) + '/' + v.slice(4)

    setInputValue(masked)

    // Se tiver 10 caracteres (dd/mm/aaaa), tenta converter para YYYY-MM-DD e disparar onChange
    if (masked.length === 10) {
      const [d, m, y] = masked.split('/')
      const ymd = `${y}-${m}-${d}`
      const date = parseYMD(ymd)
      if (date) {
        onChange(ymd)
      }
    } else if (masked.length === 0) {
      onChange('')
    }
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* ... (styles remain same) */}
      <style jsx global>{`
                .premium-calendar {
                    border: none !important;
                    font-family: inherit !important;
                    width: 100% !important;
                    max-width: 280px;
                    background: transparent !important;
                }
                .premium-calendar .react-calendar__navigation {
                    margin-bottom: 1rem !important;
                    height: 40px !important;
                    display: flex !important;
                    gap: 6px !important;
                }
                .premium-calendar .react-calendar__navigation button {
                    min-width: 36px !important;
                    height: 36px !important;
                    background: #f8fafc !important;
                    font-weight: 700 !important;
                    color: #1e293b !important;
                    font-size: 0.85rem !important;
                    border-radius: 12px !important;
                    transition: all 0.2s ease !important;
                }
                .premium-calendar .react-calendar__navigation button:hover:enabled {
                    background-color: #f1f5f9 !important;
                    transform: translateY(-1px) !important;
                }
                .premium-calendar .react-calendar__navigation button.react-calendar__navigation__label {
                    flex-grow: 1 !important;
                    background: #fff5f5 !important;
                    color: #c62737 !important;
                    font-weight: 800 !important;
                    text-transform: uppercase !important;
                    letter-spacing: 0.02em !important;
                }
                .premium-calendar .react-calendar__month-view__weekdays {
                    font-weight: 800 !important;
                    text-transform: uppercase !important;
                    font-size: 0.6rem !important;
                    color: #94a3b8 !important;
                    padding-bottom: 0.5rem !important;
                }
                .premium-calendar .react-calendar__month-view__weekdays__weekday abbr {
                    text-decoration: none !important;
                }
                .premium-calendar .react-calendar__tile {
                    padding: 0.75rem 0.5rem !important;
                    border-radius: 12px !important;
                    font-weight: 700 !important;
                    color: #64748b !important;
                    font-size: 0.8rem !important;
                    transition: all 0.2s ease !important;
                    position: relative !important;
                }
                .premium-calendar .react-calendar__tile:hover:enabled {
                    background-color: #f1f5f9 !important;
                    color: #c62737 !important;
                }
                .premium-calendar .react-calendar__tile--now {
                    background: #fff8f8 !important;
                    color: #c62737 !important;
                }
                .premium-calendar .react-calendar__tile--active {
                    background: #c62737 !important;
                    color: white !important;
                    box-shadow: 0 4px 12px -2px rgba(198, 39, 55, 0.3) !important;
                }
                .premium-calendar .react-calendar__month-view__days__day--neighboringMonth {
                    color: #cbd5e1 !important;
                    opacity: 0.4 !important;
                }
            `}</style>

      <div
        className={`group relative flex w-full items-center transition-all duration-300 ${open ? 'z-50' : 'z-auto'}`}
      >
        <div
          onClick={() => setOpen(!open)}
          className={`absolute left-4 top-1/2 -translate-y-1/2 cursor-pointer transition-colors duration-300 ${open ? 'text-[#c62737]' : 'text-slate-400 group-hover:text-slate-500'}`}
        >
          <CalendarDays size={18} />
        </div>

        <input
          id={id}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className={`w-full rounded-xl border-2 bg-white pl-11 pr-10 py-2.5 text-sm font-medium outline-none transition-all duration-300
                        ${open
              ? 'border-[#c62737] ring-4 ring-[#c62737]/10 shadow-md'
              : 'border-slate-200 hover:border-slate-300 shadow-sm'}
                        ${!displayStr ? 'text-slate-400 placeholder:text-slate-400' : 'text-slate-900'}
                        ${inputClassName}`}
        />

        {displayStr && (
          <button
            type="button"
            onClick={handleLimpar}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-300 transition-all hover:bg-[#c62737]/10 hover:text-[#c62737]"
            title="Limpar"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute left-0 top-full z-[100] mt-2 w-full min-w-[300px] max-w-sm origin-top"
          >
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50">
              <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Calendário</span>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="px-3 pb-3">
                <Calendar
                  locale="pt-BR"
                  value={dateValue}
                  onChange={handleSelect}
                  className="premium-calendar"
                  minDate={minDate}
                  maxDate={maxDate}
                  tileDisabled={({ date }) => isDateDisabled ? isDateDisabled(date) : false}
                  nextLabel={<ChevronRight size={18} />}
                  prevLabel={<ChevronLeft size={18} />}
                  next2Label={null}
                  prev2Label={null}
                  formatShortWeekday={(_, date) => ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'][date.getDay()]}
                />
              </div>

              <div className="flex border-t border-slate-100 bg-slate-50 p-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleLimpar()}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-800 hover:border-slate-300 transition-all"
                >
                  <Trash2 size={14} />
                  Limpar
                </button>
                <button
                  type="button"
                  onClick={handleHoje}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#c62737] text-xs font-bold text-white hover:bg-[#a81f2c] shadow-sm transition-all"
                >
                  <Target size={14} />
                  Hoje
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
