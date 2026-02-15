'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'

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
        if (!selected && filter.trim()) {
          setFilter('')
        } else if (selected) {
          setFilter(selected.label)
        }
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open, selected])

  const handleSelect = (opt: SearchableSelectOption) => {
    onChange(opt.value)
    setFilter(opt.label)
    setOpen(false)
  }

  const handleBlur = () => {
    if (!open) return
    const match = options.find((o) => o.label.toLowerCase() === filter.trim().toLowerCase())
    if (match) {
      onChange(match.value)
      setFilter(match.label)
    } else if (selected) {
      setFilter(selected.label)
    } else {
      setFilter('')
    }
  }

  return (
    <div ref={ref} className="relative w-full">
      <div
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? `${id ?? 'searchable'}-listbox` : undefined}
        aria-label={ariaLabel}
        className="flex w-full items-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-left outline-none transition-all hover:border-slate-300 focus-within:border-[#c62737] focus-within:shadow-[0_0_0_3px_rgba(198,39,55,0.12)] disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60"
        onClick={() => !disabled && setOpen(true)}
      >
        <input
          ref={inputRef}
          type="text"
          id={id}
          value={open ? filter : displayLabel}
          onChange={(e) => setFilter(e.target.value)}
          onFocus={() => !disabled && setOpen(true)}
          onBlur={handleBlur}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setOpen(false)
              setFilter(displayLabel)
              inputRef.current?.blur()
            }
            if (e.key === 'Enter' && filteredOptions.length === 1) {
              e.preventDefault()
              handleSelect(filteredOptions[0])
            }
          }}
          disabled={disabled}
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent text-slate-800 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed"
        />
        <ChevronDown size={18} className={`shrink-0 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </div>

      {open && (
        <ul
          id={id ? `${id}-listbox` : undefined}
          role="listbox"
          className="absolute z-50 mt-1.5 max-h-52 w-full overflow-auto rounded-xl border-2 border-slate-200 bg-white shadow-xl"
          style={{ maxHeight: '13rem' }}
        >
          {allowEmpty && (
            <li role="option">
              <button
                type="button"
                className="w-full px-4 py-2.5 text-left text-sm text-slate-800 transition-colors hover:bg-[#c62737]/10 hover:text-[#c62737]"
                onMouseDown={(e) => {
                  e.preventDefault()
                  onChange('')
                  setFilter('')
                  setOpen(false)
                }}
              >
                {placeholder}
              </button>
            </li>
          )}
          {filteredOptions.length === 0 ? (
            <li className="px-4 py-3 text-sm text-slate-500">Nenhuma opção encontrada</li>
          ) : (
            filteredOptions.map((opt) => (
              <li
                key={opt.value}
                role="option"
                aria-selected={value === opt.value}
                className={allowEmpty || filteredOptions.indexOf(opt) > 0 ? 'border-t border-slate-100' : ''}
              >
                <button
                  type="button"
                  className={`w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-[#c62737]/10 hover:text-[#c62737] ${value === opt.value ? 'bg-[#c62737]/10 text-[#c62737]' : 'text-slate-800'}`}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    handleSelect(opt)
                  }}
                >
                  {opt.label}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
