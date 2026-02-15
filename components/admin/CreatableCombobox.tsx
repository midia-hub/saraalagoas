'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronDown, Loader2 } from 'lucide-react'
import { Spinner } from '@/components/ui/Spinner'

export type CreatableComboboxItem = { id: string; label: string; [k: string]: unknown }

export interface CreatableComboboxProps {
  /** URL base do lookup (ex: /api/admin/consolidacao/lookups/people). Será chamado com ?q= (GET). Ou use fetchItems para controle total (ex: token). */
  fetchUrl?: string
  /** Se fornecido, usa em vez de fetch na URL (útil para passar token via adminFetchJson). */
  fetchItems?: (q: string) => Promise<{ items: CreatableComboboxItem[] }>
  placeholder?: string
  /** Valor quando há item selecionado (label) */
  selectedLabel?: string
  /** ID do item selecionado (quando definido, freeText deve ser ignorado) */
  selectedId?: string
  /** Texto livre quando usuário digitou sem selecionar */
  freeText?: string
  /** Callback: (selectedId, freeText, selectedLabel?) — ao selecionar: (id, '', label); ao digitar livre: (undefined, text) */
  onChange: (selectedId: string | undefined, freeText: string, selectedLabel?: string) => void
  disabled?: boolean
  className?: string
  /** Nome do campo para acessibilidade */
  'aria-label'?: string
  /** Se fornecido, mostra opção "Registrar/Criar" ao digitar; ao escolher, chama e usa o item retornado. Não envia freeText no blur. */
  onCreate?: (name: string) => Promise<{ id: string; label: string } | null>
  /** Texto da opção de criar (ex: "Registrar equipe"). */
  createOptionLabel?: string
}

const DEBOUNCE_MS = 300

export function CreatableCombobox({
  fetchUrl,
  fetchItems: fetchItemsProp,
  placeholder = 'Selecione ou digite…',
  selectedLabel,
  selectedId,
  freeText,
  onChange,
  disabled = false,
  className = '',
  'aria-label': ariaLabel,
  onCreate,
  createOptionLabel = 'Registrar',
}: CreatableComboboxProps) {
  const [open, setOpen] = useState(false)
  const [inputValue, setInputValue] = useState(() => selectedId ? (selectedLabel ?? '') : (freeText ?? ''))
  const [items, setItems] = useState<CreatableComboboxItem[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [query, setQuery] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const fetchItems = useCallback(async (q: string) => {
    setLoading(true)
    try {
      if (fetchItemsProp) {
        const data = await fetchItemsProp(q.trim())
        setItems(Array.isArray(data.items) ? data.items : [])
        return
      }
      if (fetchUrl) {
        const url = `${fetchUrl}${fetchUrl.includes('?') ? '&' : '?'}q=${encodeURIComponent(q.trim())}`
        const res = await fetch(url, { credentials: 'same-origin', headers: { Accept: 'application/json' } })
        const data = await res.json().catch(() => ({}))
        setItems(Array.isArray(data.items) ? data.items : [])
      } else {
        setItems([])
      }
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [fetchUrl, fetchItemsProp])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setQuery(inputValue)
    }, DEBOUNCE_MS)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [inputValue])

  // Buscar e mostrar opções só depois que o usuário começar a digitar
  useEffect(() => {
    if (!open) return
    if (!query.trim()) {
      setItems([])
      return
    }
    fetchItems(query)
  }, [open, query, fetchItems])

  useEffect(() => {
    if (selectedId && selectedLabel !== undefined) setInputValue(selectedLabel)
    else if (selectedId === undefined && freeText !== undefined) setInputValue(freeText)
  }, [selectedId, selectedLabel, freeText])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (item: CreatableComboboxItem) => {
    onChange(item.id, '', item.label)
    setInputValue(item.label)
    setOpen(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    setInputValue(v)
    setOpen(true)
    if (!v.trim()) {
      onChange(undefined, '')
      setItems([])
    }
  }

  const handleBlur = () => {
    if (onCreate) {
      if (selectedId && selectedLabel) setInputValue(selectedLabel)
      else if (!selectedId) setInputValue('')
      return
    }
    const trimmed = inputValue.trim()
    if (trimmed && !selectedId) {
      onChange(undefined, trimmed)
    }
  }

  const handleCreate = async () => {
    const name = inputValue.trim()
    if (!name || !onCreate) return
    setCreating(true)
    try {
      const result = await onCreate(name)
      if (result) {
        onChange(result.id, '', result.label)
        setInputValue(result.label)
        setOpen(false)
      }
    } finally {
      setCreating(false)
    }
  }

  const trimmedInput = inputValue.trim()
  const canCreate = onCreate && trimmedInput.length > 0
  const exactMatch = items.some((i) => i.label.toLowerCase() === trimmedInput.toLowerCase())

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false)
      return
    }
    if (e.key === 'Enter' && open && items.length === 1) {
      e.preventDefault()
      handleSelect(items[0])
    }
  }

  const displayValue = selectedId ? (selectedLabel ?? inputValue) : inputValue

  return (
    <div ref={containerRef} className={`relative ${className}`.trim()}>
      <div className="relative">
        <input
          type="text"
          value={displayValue}
          onChange={handleInputChange}
          onFocus={() => setOpen(true)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          aria-label={ariaLabel}
          aria-expanded={open}
          aria-haspopup="listbox"
          role="combobox"
          className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-red-600 focus:ring-2 focus:ring-red-600/20 outline-none transition-all duration-200 pr-10"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ChevronDown className="w-5 h-5" />}
        </span>
      </div>

      {open && (
        <div
          className="absolute z-50 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg max-h-60 overflow-auto"
          role="listbox"
        >
          {loading && items.length === 0 && !canCreate ? (
            <div className="p-4 flex justify-center">
              <Spinner size="sm" />
            </div>
          ) : items.length === 0 && !canCreate ? (
            <div className="p-4 text-sm text-slate-500">
              {query.trim()
                ? onCreate
                  ? `Nenhum resultado. Use "${createOptionLabel}" abaixo para registrar.`
                  : 'Nenhum resultado. Você pode digitar e salvar como texto.'
                : 'Digite para buscar.'}
            </div>
          ) : null}
          {items.length > 0 ? (
            <ul className="py-1">
              {items.map((item) => (
                <li
                  key={item.id}
                  role="option"
                  tabIndex={0}
                  className="px-4 py-2 cursor-pointer hover:bg-slate-100 focus:bg-slate-100 outline-none"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    handleSelect(item)
                  }}
                >
                  {item.label}
                </li>
              ))}
            </ul>
          ) : null}
          {canCreate && !exactMatch ? (
            <div className="border-t border-slate-100 py-1">
              <button
                type="button"
                role="option"
                disabled={creating}
                className="w-full px-4 py-2 text-left text-sm text-[#c62737] hover:bg-[#c62737]/10 focus:bg-[#c62737]/10 outline-none disabled:opacity-60 flex items-center gap-2"
                onMouseDown={(e) => {
                  e.preventDefault()
                  handleCreate()
                }}
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : null}
                {createOptionLabel} &quot;{trimmedInput}&quot;
              </button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
