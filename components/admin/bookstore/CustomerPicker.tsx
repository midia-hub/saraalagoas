'use client'

import { useState, useEffect, useRef } from 'react'
import { adminFetchJson } from '@/lib/admin-client'

export interface CustomerOption {
  id: string
  name: string
  phone: string | null
  email: string | null
  can_buy_on_credit: boolean
}

interface CustomerPickerProps {
  value: CustomerOption | null
  onChange: (customer: CustomerOption | null) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  id?: string
  /** Se true, mostra apenas clientes que podem comprar fiado (para uso no PDV fiado) */
  onlyCredit?: boolean
}

export function CustomerPicker({
  value,
  onChange,
  placeholder = 'Buscar cliente por nome ou telefone...',
  disabled = false,
  className = '',
  id,
  onlyCredit = false,
}: CustomerPickerProps) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [options, setOptions] = useState<CustomerOption[]>([])
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open || search.length < 2) {
      setOptions([])
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setLoading(true)
      const params = new URLSearchParams({ search })
      if (onlyCredit) params.set('can_credit', 'true')
      adminFetchJson<{ items: Array<{ id: string; name: string; phone: string | null; email: string | null; can_buy_on_credit: boolean }> }>(
        `/api/admin/livraria/clientes?${params}`
      )
        .then((data) => {
          setOptions(
            (data.items ?? []).map((c) => ({
              id: c.id,
              name: c.name,
              phone: c.phone ?? null,
              email: c.email ?? null,
              can_buy_on_credit: c.can_buy_on_credit,
            }))
          )
        })
        .catch(() => setOptions([]))
        .finally(() => setLoading(false))
      debounceRef.current = null
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [search, open, onlyCredit])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const displayValue = value ? `${value.name}${value.phone ? ` · ${value.phone}` : ''}` : ''

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="flex gap-1">
        <input
          id={id}
          type="text"
          value={open ? search : displayValue}
          onChange={(e) => {
            setSearch(e.target.value)
            if (!open) setOpen(true)
            if (!e.target.value) onChange(null)
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800"
          autoComplete="off"
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange(null)
              setSearch('')
            }}
            className="px-2 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-100"
            aria-label="Limpar cliente"
          >
            ✕
          </button>
        )}
      </div>
      {open && (search.length >= 2 || options.length > 0) && (
        <ul
          className="absolute z-50 w-full mt-1 max-h-48 overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg"
          role="listbox"
        >
          {loading ? (
            <li className="px-3 py-4 text-sm text-slate-500">Buscando...</li>
          ) : options.length === 0 ? (
            <li className="px-3 py-4 text-sm text-slate-500">
              {search.length < 2 ? 'Digite ao menos 2 caracteres' : 'Nenhum cliente encontrado'}
            </li>
          ) : (
            options.map((c) => (
              <li
                key={c.id}
                role="option"
                className="px-3 py-2 cursor-pointer hover:bg-slate-100 border-b border-slate-100 last:border-0"
                onClick={() => {
                  onChange(c)
                  setSearch('')
                  setOpen(false)
                }}
              >
                <span className="font-medium text-slate-800">{c.name}</span>
                {c.phone && <span className="text-slate-500 text-sm ml-2">{c.phone}</span>}
                {c.can_buy_on_credit && (
                  <span className="ml-2 text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">Fiado</span>
                )}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
