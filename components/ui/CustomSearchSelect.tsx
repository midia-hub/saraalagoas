'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check, X } from 'lucide-react'

export type CustomSearchSelectOption = { value: string; label: string }

type CustomSearchSelectProps = {
  value: string
  onChange: (value: string) => void
  options: CustomSearchSelectOption[]
  placeholder?: string
  disabled?: boolean
  allowEmpty?: boolean
  id?: string
  'aria-label'?: string
}

export function CustomSearchSelect({
  value,
  onChange,
  options,
  placeholder = 'Digite para buscar...',
  disabled = false,
  allowEmpty = true,
  id,
  'aria-label': ariaLabel,
}: CustomSearchSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = options.find((o) => o.value === value)
  const display = selected ? selected.label : ''

  // Filtrar opções baseado na busca
  const filtered = options.filter((opt) =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  )

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus()
    }
  }, [open])

  const handleSelect = (optValue: string) => {
    onChange(optValue)
    setOpen(false)
    setSearch('')
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange('')
    setSearch('')
  }

  return (
    <div ref={ref} className="relative w-full">
      <div
        onClick={() => !disabled && setOpen(!open)}
        className="flex w-full items-center justify-between gap-3 rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-left text-slate-800 outline-none transition-all hover:border-slate-300 focus-within:border-[#c62737] focus-within:shadow-[0_0_0_3px_rgba(198,39,55,0.12)] disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 cursor-pointer"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        {open ? (
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            placeholder={placeholder}
            className="flex-1 bg-transparent outline-none text-slate-800 placeholder:text-slate-400"
            aria-label={ariaLabel}
          />
        ) : (
          <span className={`flex-1 truncate ${!selected ? 'text-slate-400' : ''}`}>
            {display || placeholder}
          </span>
        )}
        <div className="flex items-center gap-2 shrink-0">
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 hover:bg-slate-100 rounded transition-colors"
              aria-label="Limpar seleção"
            >
              <X size={16} className="text-slate-500" />
            </button>
          )}
          <ChevronDown size={18} className={`text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </div>

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
                onClick={() => handleSelect('')}
              >
                Nenhum
              </button>
            </li>
          )}
          {filtered.length === 0 && search ? (
            <li className="px-4 py-3 text-center text-sm text-slate-400">
              Nenhum resultado encontrado
            </li>
          ) : (
            filtered.map((opt, idx) => {
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
                    onClick={() => handleSelect(opt.value)}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSelected && <Check size={16} className="shrink-0 ml-2 text-[#c62737]" />}
                  </button>
                </li>
              )
            })
          )}
        </ul>
      )}
    </div>
  )
}
