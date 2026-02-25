'use client'

import { useMemo } from 'react'
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

export function DateSelectInput({ value, onChange }: DateSelectInputProps) {
  // Decompõe YYYY-MM-DD
  const [yearStr, monthStr, dayStr] = value ? value.split('-') : ['', '', '']
  const year  = yearStr  ? parseInt(yearStr,  10) : 0
  const month = monthStr ? parseInt(monthStr, 10) : 0
  const day   = dayStr   ? parseInt(dayStr,   10) : 0

  function emit(d: number, m: number, y: number) {
    if (d && m && y) {
      const mm = String(m).padStart(2, '0')
      const dd = String(d).padStart(2, '0')
      onChange(`${y}-${mm}-${dd}`)
    } else {
      onChange('')
    }
  }

  // Dias disponíveis para mês/ano selecionado
  const maxDay = daysInMonth(month, year)
  const dayOptions = useMemo(
    () =>
      Array.from({ length: maxDay }, (_, i) => ({
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
    () =>
      Array.from({ length: 100 }, (_, i) => {
        const y = currentYear - i
        return { value: String(y), label: String(y) }
      }),
    [currentYear]
  )

  // Garante que o dia continua válido quando muda o mês/ano
  function handleMonth(val: string) {
    const m = parseInt(val, 10) || 0
    const newMax = daysInMonth(m, year)
    const safeDay = day > newMax ? newMax : day
    emit(safeDay, m, year)
  }

  function handleYear(val: string) {
    const y = parseInt(val, 10) || 0
    const newMax = daysInMonth(month, y)
    const safeDay = day > newMax ? newMax : day
    emit(safeDay, month, y)
  }

  function handleDay(val: string) {
    emit(parseInt(val, 10) || 0, month, year)
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {/* Dia */}
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

      {/* Mês */}
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

      {/* Ano */}
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
