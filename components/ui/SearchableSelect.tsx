'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check, Search, X } from 'lucide-react'

export type SearchableSelectOption = { value: string; label: string }

type SearchableSelectProps = {
  value: string
  onChange: (value: string) => void
  options: SearchableSelectOption[]
  placeholder?: string
  disabled?: boolean
  allowEmpty?: boolean
  id?: string
  'aria-label'?: string
}

/** Select que permite digitar para filtrar as opções; só aceita valores pré-definidos. */
export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = 'Selecione...',
  disabled = false,
  allowEmpty = true,
  id,
  'aria-label': ariaLabel,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = options.find((o) => o.value === value)
  const displayLabel = selected ? selected.label : ''

  const filteredOptions = filter.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(filter.trim().toLowerCase()))
    : options

  useEffect(() => {
    if (open) {
      setFilter(displayLabel)
      inputRef.current?.focus()
    } else {
      setFilter('')
    }
  }, [open, displayLabel])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  const handleSelect = (opt: SearchableSelectOption) => {
    onChange(opt.value)
    setOpen(false)
    setFilter('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && filteredOptions.length > 0) {
      e.preventDefault()
      handleSelect(filteredOptions[0])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  if (!selected && filter.trim()) {
    if (filteredOptions.length === 0) {
      // Sem opção selecionada = pode permitir custom
    } else if (filteredOptions.length === 1) {
      // Auto-select primeira opção se digita algo sem "enter"
    }
  } else if (selected) {
    setFilter(selected.label)
  }

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
        className="hidden"
      />

      <div
        className={`flex w-full items-center gap-3 rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-left outline-none transition-all hover:border-slate-300 focus-within:border-[#c62737] focus-within:shadow-[0_0_0_3px_rgba(198,39,55,0.12)] disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 ${open ? 'border-[#c62737] shadow-[0_0_0_3px_rgba(198,39,55,0.12)]' : ''}`}
        role="presentation"
      >
        <Search size={16} className="text-slate-400 shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
        />
        {filter && (
          <button
            type="button"
            onClick={() => {
              setFilter('')
              inputRef.current?.focus()
            }}
            className="p-1 text-slate-300 hover:text-slate-400 transition-colors"
          >
            <X size={16} />
          </button>
        )}
        <ChevronDown size={18} className={`shrink-0 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </div>

      {open && (
        <ul
          id={id ? `${id}-listbox` : undefined}
          role="listbox"
          className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border-2 border-slate-200 bg-white shadow-lg"
          style={{ maxHeight: '13rem', overflowY: 'auto' }}
        >
          {allowEmpty && (
            <li role="option" className="border-b border-slate-100">
              <button
                type="button"
                className="w-full px-4 py-3 text-left text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 active:bg-slate-100 flex items-center justify-between"
                onClick={() => {
                  onChange('')
                  setOpen(false)
                  setFilter('')
                }}
              >
                {placeholder}
              </button>
            </li>
          )}
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt, idx) => {
              const isSelected = value === opt.value
              return (
                <li key={opt.value} role="option" className={allowEmpty || idx > 0 ? 'border-t border-slate-100' : ''}>
                  <button
                    type="button"
                    className={`w-full px-4 py-3 text-left text-sm transition-colors flex items-center justify-between ${
                      isSelected
                        ? 'bg-[#c62737]/10 text-[#c62737] font-semibold'
                        : 'bg-white text-slate-800 hover:bg-slate-50 active:bg-slate-100'
                    }`}
                    onClick={() => handleSelect(opt)}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSelected && <Check size={16} className="shrink-0 ml-2" />}
                  </button>
                </li>
              )
            })
          ) : (
            <li className="border-t border-slate-100">
              <div className="px-4 py-3 text-sm text-slate-400 text-center">Nenhuma opção encontrada</div>
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
