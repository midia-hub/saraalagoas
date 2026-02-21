'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'

export type CustomSelectOption = { value: string; label: string }

type CustomSelectProps = {
  value: string
  onChange: (value: string) => void
  options: CustomSelectOption[]
  placeholder?: string
  disabled?: boolean
  allowEmpty?: boolean
  required?: boolean
  id?: string
  'aria-label'?: string
}

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'Selecione...',
  disabled = false,
  allowEmpty = true,
  id,
  'aria-label': ariaLabel,
}: CustomSelectProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const selected = options.find((o) => o.value === value)
  const display = selected ? selected.label : placeholder

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        id={id}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? `${id}-listbox` : undefined}
        role="combobox"
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-left text-slate-800 outline-none transition-all hover:border-slate-300 focus:border-[#c62737] focus:shadow-[0_0_0_3px_rgba(198,39,55,0.12)] disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
      >
        <span className={`flex-1 truncate ${!selected ? 'text-slate-400' : ''}`}>{display}</span>
        <ChevronDown size={18} className={`shrink-0 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ul
          id={id ? `${id}-listbox` : undefined}
          role="listbox"
          className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200/90 bg-white/95 shadow-[0_16px_40px_-18px_rgba(15,23,42,0.45)] backdrop-blur-sm"
          style={{ maxHeight: '16rem', overflowY: 'auto' }}
        >
          {allowEmpty && (
            <li role="option" className="border-b border-slate-100/80 last:border-b-0">
              <button
                type="button"
                className="w-full px-4 py-3 text-left text-sm font-medium text-slate-500 transition-colors hover:bg-slate-50 active:bg-slate-100 flex items-center justify-between"
                onClick={() => {
                  onChange('')
                  setOpen(false)
                }}
              >
                {placeholder}
              </button>
            </li>
          )}
          {options.map((opt, idx) => {
            const isSelected = value === opt.value
            return (
              <li key={opt.value} role="option" className={allowEmpty || idx > 0 ? 'border-t border-slate-100/80' : ''}>
                <button
                  type="button"
                  className={`w-full px-4 py-3 text-left text-sm transition-all duration-150 flex items-center justify-between ${
                    isSelected
                      ? 'bg-[#c62737]/10 text-[#c62737] font-semibold'
                      : 'bg-white text-slate-700 hover:bg-slate-50 active:bg-slate-100'
                  }`}
                  onClick={() => {
                    onChange(opt.value)
                    setOpen(false)
                  }}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && <Check size={16} className="shrink-0 ml-2 text-[#c62737]" />}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
