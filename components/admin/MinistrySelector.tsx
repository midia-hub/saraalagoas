'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { X, Plus, Loader2 } from 'lucide-react'
import { adminFetchJson } from '@/lib/admin-client'

interface Ministry {
  id: string
  name: string
}

interface MinistrySelectorProps {
  selected?: string[]
  onChange: (ministries: string[]) => void
  disabled?: boolean
}

export function MinistrySelector({ selected = [], onChange, disabled = false }: MinistrySelectorProps) {
  const [ministries, setMinistries] = useState<Ministry[]>([])
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Carregar lista de ministérios
  useEffect(() => {
    async function loadMinistries() {
      try {
        const data = await adminFetchJson<{ ministries: Ministry[] }>('/api/admin/ministries')
        setMinistries(data.ministries ?? [])
      } catch (err) {
        console.error('Erro ao carregar ministérios:', err)
        setMinistries([])
      } finally {
        setLoading(false)
      }
    }
    loadMinistries()
  }, [])

  // Adicionar ministério existente
  const handleAddMinistry = useCallback((name: string) => {
    if (!name.trim() || selected.includes(name)) return
    onChange([...selected, name])
    setInputValue('')
    inputRef.current?.focus()
  }, [selected, onChange])

  // Remover ministério
  const handleRemoveMinistry = useCallback((name: string) => {
    onChange(selected.filter(m => m !== name))
  }, [selected, onChange])

  // Criar novo ministério
  const handleCreateMinistry = async () => {
    const name = inputValue.trim()
    if (!name) return

    setCreating(true)
    try {
      const data = await adminFetchJson<{ ministry: Ministry }>('/api/admin/ministries', {
        method: 'POST',
        body: JSON.stringify({ name }),
      })
      if (data.ministry) {
        setMinistries(prev => [...prev, data.ministry])
        handleAddMinistry(name)
      }
    } catch (err) {
      console.error('Erro ao criar ministério:', err)
    } finally {
      setCreating(false)
    }
  }

  // Filtrar ministérios que não estão selecionados
  const availableMinistries = ministries.filter(m => !selected.includes(m.name))
  const filteredMinistries = inputValue.trim()
    ? availableMinistries.filter(m => m.name.toLowerCase().includes(inputValue.toLowerCase()))
    : availableMinistries

  const isNewMinistry = inputValue.trim() && !ministries.some(m => m.name.toLowerCase() === inputValue.toLowerCase())

  return (
    <div className="flex flex-col gap-3">
      {/* Ministérios Selecionados */}
      <div className="flex flex-wrap gap-2">
        {selected.map(ministry => (
          <div
            key={ministry}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-100 text-blue-800 text-sm font-medium"
          >
            {ministry}
            {!disabled && (
              <button
                type="button"
                onClick={() => handleRemoveMinistry(ministry)}
                className="p-0.5 rounded hover:bg-blue-200 transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Input e Dropdown */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault()
              if (isNewMinistry) {
                handleCreateMinistry()
              } else if (filteredMinistries.length === 1) {
                handleAddMinistry(filteredMinistries[0].name)
              }
            }
          }}
          placeholder="Adicione um ministério..."
          disabled={disabled}
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none bg-white disabled:bg-slate-50 disabled:text-slate-400"
        />

        {/* Dropdown de sugestões */}
        {!disabled && inputValue.trim() && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-10">
            {loading ? (
              <div className="p-3 text-center text-slate-500 flex items-center justify-center gap-2">
                <Loader2 size={14} className="animate-spin" /> Carregando...
              </div>
            ) : filteredMinistries.length > 0 ? (
              <>
                {/* Ministérios existentes */}
                {filteredMinistries.map(ministry => (
                  <button
                    key={ministry.id}
                    type="button"
                    onClick={() => handleAddMinistry(ministry.name)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0"
                  >
                    {ministry.name}
                  </button>
                ))}
              </>
            ) : null}

            {/* Opção criar novo */}
            {isNewMinistry && (
              <button
                type="button"
                onClick={handleCreateMinistry}
                disabled={creating}
                className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 transition-colors flex items-center gap-2 font-medium disabled:opacity-50"
              >
                {creating ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Criando...
                  </>
                ) : (
                  <>
                    <Plus size={14} /> Criar "{inputValue.trim()}"
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
