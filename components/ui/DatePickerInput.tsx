'use client'

import { useRef, useEffect, useState } from 'react'
import Calendar from 'react-calendar'
import { Calendar as CalendarIcon } from 'lucide-react'
import { getTodayBrasilia } from '@/lib/date-utils'
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
}

export function DatePickerInput({
  id,
  value,
  onChange,
  placeholder = 'dd/mm/aaaa',
  required,
  className = '',
  inputClassName = '',
}: DatePickerInputProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const dateValue: Value = parseYMD(value) ?? null
  const displayStr = value ? toDisplay(value) : ''

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const handleSelect = (v: Value) => {
    const d = Array.isArray(v) ? v[0] : v
    if (d instanceof Date) {
      onChange(toYMD(d))
      setOpen(false)
    }
  }

  const handleLimpar = () => {
    onChange('')
    setOpen(false)
  }

  const handleHoje = () => {
    onChange(getTodayBrasilia())
    setOpen(false)
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        id={id}
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center gap-2 rounded-xl border border-slate-300 bg-white pl-11 pr-4 py-3 text-left transition-all duration-200 hover:border-slate-400 focus:border-red-600 focus:ring-2 focus:ring-red-600/20 focus:outline-none ${!displayStr ? 'text-slate-400' : 'text-slate-800'} ${inputClassName}`}
        aria-label="Selecionar data"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <CalendarIcon className="absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 shrink-0 text-slate-400" />
        <span>{displayStr || placeholder}</span>
      </button>

      {open && (
        <div
          className="absolute left-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
          role="dialog"
          aria-modal="true"
          aria-label="Calendário"
        >
          <div className="date-picker-calendar p-4">
            <Calendar
              locale="pt-BR"
              value={dateValue}
              onChange={handleSelect}
              next2Label={null}
              prev2Label={null}
              formatShortWeekday={(_, date) => ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'][date.getDay()]}
            />
          </div>
          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/80 px-4 py-3">
            <button
              type="button"
              onClick={handleLimpar}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-200/80 hover:text-slate-800"
            >
              Limpar
            </button>
            <button
              type="button"
              onClick={handleHoje}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 hover:text-red-700"
            >
              Hoje
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
