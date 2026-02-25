'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { ChevronDown, Check, Search, X, User } from 'lucide-react'

export type CustomSelectOption = { value: string; label: string; description?: string }

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
  searchPlaceholder?: string
  showIcon?: boolean
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
  searchPlaceholder = 'Pesquisar...',
  showIcon = true,
}: CustomSelectProps) {
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = options.find((o) => o.value === value)
  const display = selected ? selected.label : placeholder

  const filteredOptions = useMemo(() => {
    const term = filter.trim().toLowerCase()
    if (!term) return options
    return options.filter((o) => (o.label || '').toLowerCase().includes(term))
  }, [filter, options])

  useEffect(() => {
    if (open) {
      setFilter('')
      setTimeout(() => inputRef.current?.focus(), 10)
    }
  }, [open])

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
        className={`flex min-h-[44px] w-full items-center justify-between gap-3 rounded-2xl border-2 px-4 py-2.5 text-left text-slate-800 outline-none transition-all duration-200 ${
          open
            ? 'border-[#c62737] bg-white shadow-[0_0_0_4px_rgba(198,39,55,0.15)]'
            : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
        } disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400`}
      >
        <span className={`flex-1 truncate text-sm ${!selected ? 'text-slate-400' : 'text-slate-800 font-medium'}`}>{display}</span>
        <ChevronDown size={18} className={`shrink-0 text-slate-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div
          id={id ? `${id}-listbox` : undefined}
          role="listbox"
          className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border-2 border-slate-200 bg-white shadow-[0_25px_50px_-12px_rgba(15,23,42,0.35)]"
        >
          {/* Header com barra de pesquisa */}
          <div className="sticky top-0 z-10 border-b border-slate-100 bg-gradient-to-b from-slate-50 via-slate-50 to-white px-3 py-3">
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 focus-within:border-[#c62737] focus-within:shadow-[0_0_0_3px_rgba(198,39,55,0.1)] transition-all">
              <Search size={16} className="text-slate-400 flex-shrink-0" />
              <input
                ref={inputRef}
                type="search"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setOpen(false)
                  if (e.key === 'Enter' && filteredOptions.length > 0) {
                    onChange(filteredOptions[0].value)
                    setOpen(false)
                  }
                }}
                placeholder={searchPlaceholder}
                autoComplete="off"
                spellCheck="false"
                className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
              />
              {!!filter && (
                <button
                  type="button"
                  onClick={() => {
                    setFilter('')
                    inputRef.current?.focus()
                  }}
                  className="p-0.5 text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0"
                  aria-label="Limpar pesquisa"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <div className="mt-2 flex items-center justify-between px-1">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {filteredOptions.length} resultado{filteredOptions.length !== 1 ? 's' : ''}
              </p>
              {filteredOptions.length > 5 && (
                <p className="text-xs text-slate-400">Use setas para navegar</p>
              )}
            </div>
          </div>

          <ul style={{ maxHeight: '22rem', overflowY: 'auto' }} className="py-2 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-50">

            {allowEmpty && (
              <li role="option" className="px-2 py-1">
                <button
                  type="button"
                  className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-500 transition-all hover:bg-slate-50 active:bg-slate-100 flex items-center gap-2"
                  onClick={() => {
                    onChange('')
                    setOpen(false)
                  }}
                >
                  <span className="text-xs opacity-50">✕</span>
                  {placeholder}
                </button>
              </li>
            )}

            {filteredOptions.length === 0 && (
              <li>
                <div className="px-4 py-8 text-center">
                  <div className="mx-auto w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mb-2">
                    <Search size={18} className="text-slate-400" />
                  </div>
                  <p className="text-sm text-slate-500">Nenhuma opção encontrada</p>
                  <p className="text-xs text-slate-400 mt-1">Tente alterar os termos de busca</p>
                </div>
              </li>
            )}

            {filteredOptions.map((opt) => {
              const isSelected = value === opt.value
              return (
                <li key={opt.value} role="option" className="px-2 py-1">
                  <button
                    type="button"
                    className={`w-full rounded-xl px-3 py-2.5 text-left text-sm transition-all duration-150 flex items-center justify-between ${
                      isSelected
                        ? 'bg-[#c62737]/10 text-[#c62737] font-semibold ring-1.5 ring-[#c62737]/30'
                        : 'bg-white text-slate-700 hover:bg-slate-50 active:bg-slate-100'
                    }`}
                    onClick={() => {
                      onChange(opt.value)
                      setOpen(false)
                    }}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {showIcon && (
                        <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                          isSelected 
                            ? 'bg-[#c62737]/20 text-[#c62737]'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {opt.label.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="truncate">{opt.label}</p>
                        {opt.description && (
                          <p className="text-xs opacity-60 mt-0.5 truncate">{opt.description}</p>
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <Check size={18} className="shrink-0 ml-2 text-[#c62737]" />
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
