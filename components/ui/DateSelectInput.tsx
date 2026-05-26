'use client'

import { useMemo, useState, useEffect, useRef } from 'react'
import { NativeDropdown } from './NativeDropdown'

interface DateSelectInputProps {
  /** Valor no formato YYYY-MM-DD ou '' */
  value: string
  onChange: (isoDate: string) => void
}

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

function daysInMonth(month: number, year: number): number {
  if (!month) return 31
  return new Date(year || 2000, month, 0).getDate()
}

function parseValue(v: string) {
  const [yearStr, monthStr, dayStr] = v ? v.split('-') : ['', '', '']
  return {
    year:  yearStr  ? parseInt(yearStr,  10) : 0,
    month: monthStr ? parseInt(monthStr, 10) : 0,
    day:   dayStr   ? parseInt(dayStr,   10) : 0,
  }
}

export function DateSelectInput({ value, onChange }: DateSelectInputProps) {
  const initial = parseValue(value)
  const [day,   setDay]   = useState(initial.day)
  const [month, setMonth] = useState(initial.month)
  const [year,  setYear]  = useState(initial.year)

  // Rastreia o último valor emitido para distinguir reset externo de round-trip
  const lastEmitted = useRef(value)

  useEffect(() => {
    // Ignora se foi o próprio componente que provocou a mudança
    if (value === lastEmitted.current) return
    lastEmitted.current = value
    const p = parseValue(value)
    setDay(p.day)
    setMonth(p.month)
    setYear(p.year)
  }, [value])

  function emit(d: number, m: number, y: number) {
    if (d && m && y) {
      const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      lastEmitted.current = iso
      onChange(iso)
    }
    // Seleção parcial: mantém estado interno mas não propaga '' ao pai
  }

  const maxDay = daysInMonth(month, year)

  function handleDay(val: string) {
    const d = parseInt(val, 10) || 0
    setDay(d)
    emit(d, month, year)
  }

  function handleMonth(val: string) {
    const m = parseInt(val, 10) || 0
    const newMax = daysInMonth(m, year)
    const safeDay = day > newMax ? newMax : day
    setMonth(m)
    if (safeDay !== day) setDay(safeDay)
    emit(safeDay, m, year)
  }

  function handleYear(val: string) {
    const y = parseInt(val, 10) || 0
    const newMax = daysInMonth(month, y)
    const safeDay = day > newMax ? newMax : day
    setYear(y)
    if (safeDay !== day) setDay(safeDay)
    emit(safeDay, month, y)
  }

  const dayOptions = useMemo(
    () => Array.from({ length: maxDay }, (_, i) => ({
      value: String(i + 1),
      label: String(i + 1).padStart(2, '0'),
    })),
    [maxDay]
  )

  const monthOptions = MONTHS.map((name, i) => ({
    value: String(i + 1),
    label: name,
  }))

  const currentYear = new Date().getFullYear()
  const yearOptions = useMemo(
    () => Array.from({ length: 100 }, (_, i) => {
      const y = currentYear - i
      return { value: String(y), label: String(y) }
    }),
    [currentYear]
  )

  return (
    <div className="grid grid-cols-3 gap-2">
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 pl-1">Dia</p>
        <NativeDropdown
          value={day ? String(day) : ''}
          onChange={handleDay}
          options={dayOptions}
          placeholder="--"
          searchable={false}
        />
      </div>

      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 pl-1">Mês</p>
        <NativeDropdown
          value={month ? String(month) : ''}
          onChange={handleMonth}
          options={monthOptions}
          placeholder="---"
          searchable
        />
      </div>

      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 pl-1">Ano</p>
        <NativeDropdown
          value={year ? String(year) : ''}
          onChange={handleYear}
          options={yearOptions}
          placeholder="----"
          searchable
        />
      </div>
    </div>
  )
}
