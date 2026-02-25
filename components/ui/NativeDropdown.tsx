'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'

export type DropdownOption = {
  value: string
  label: string
}

interface NativeDropdownProps {
  value: string
  onChange: (value: string) => void
  options: DropdownOption[]
  placeholder?: string
  searchable?: boolean
  /** ícone opcional exibido à esquerda do valor selecionado */
  icon?: React.ReactNode
}

export function NativeDropdown({
  value,
  onChange,
  options,
  placeholder = 'Selecione...',
  searchable = false,
  icon,
}: NativeDropdownProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const selected = options.find((o) => o.value === value)

  const filtered = search.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
    : options

  // Fecha ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Foca o campo de busca ao abrir
  useEffect(() => {
    if (open && searchable) {
      setTimeout(() => searchRef.current?.focus(), 50)
    }
  }, [open, searchable])

  function select(option: DropdownOption) {
    onChange(option.value)
    setOpen(false)
    setSearch('')
  }

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 text-base transition-all text-left
          ${open
            ? 'border-purple-500 ring-4 ring-purple-500/10 bg-white'
            : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
      >
        {icon && (
          <span className="shrink-0 text-slate-400">{icon}</span>
        )}
        <span className={`flex-1 truncate text-sm font-medium ${selected ? 'text-slate-900' : 'text-slate-400'}`}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          className={`shrink-0 w-4 h-4 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute z-50 mt-2 w-full bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-900/10 overflow-hidden"
          style={{ animation: 'dropdown-in 0.15s ease-out' }}
        >
          {/* Search */}
          {searchable && (
            <div className="p-2 border-b border-slate-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  ref={searchRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar..."
                  className="w-full pl-8 pr-3 py-2 text-sm text-slate-800 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/10"
                />
              </div>
            </div>
          )}

          {/* Options list */}
          <ul className="max-h-56 overflow-y-auto py-1.5 px-1.5 space-y-0.5">
            {filtered.length === 0 ? (
              <li className="px-3 py-3 text-sm text-center text-slate-400">
                Nenhuma opção encontrada
              </li>
            ) : (
              filtered.map((opt) => {
                const isSelected = opt.value === value
                return (
                  <li key={opt.value}>
                    <button
                      type="button"
                      onClick={() => select(opt)}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-colors
                        ${isSelected
                          ? 'bg-purple-50 text-purple-700'
                          : 'text-slate-700 hover:bg-slate-50'
                        }`}
                    >
                      <span>{opt.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 shrink-0 text-purple-600" />}
                    </button>
                  </li>
                )
              })
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
