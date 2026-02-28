'use client'

import { useEffect, useRef, useState } from 'react'
import { Search, X, Check, Users } from 'lucide-react'

export interface PersonOption {
  id:        string
  full_name: string
  phone?:    string
}

interface PeoplePickerModalProps {
  /** Todas as pessoas disponíveis */
  people:        PersonOption[]
  /** IDs já selecionados */
  selectedIds:   string[]
  /** Callback ao confirmar */
  onConfirm:     (ids: string[]) => void
  onClose:       () => void
  /** true → seleção única (radio), false → múltipla (default) */
  singleSelect?: boolean
  title?:        string
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const AVATAR_COLORS = [
  'bg-violet-100 text-violet-700',
  'bg-sky-100 text-sky-700',
  'bg-amber-100 text-amber-700',
  'bg-teal-100 text-teal-700',
  'bg-rose-100 text-rose-700',
  'bg-emerald-100 text-emerald-700',
  'bg-indigo-100 text-indigo-700',
  'bg-orange-100 text-orange-700',
]
function avatarColor(id: string) {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash + id.charCodeAt(i)) % AVATAR_COLORS.length
  return AVATAR_COLORS[hash]
}

export default function PeoplePickerModal({
  people,
  selectedIds,
  onConfirm,
  onClose,
  singleSelect = false,
  title = 'Selecionar responsável',
}: PeoplePickerModalProps) {
  const [q,       setQ]       = useState('')
  const [pending, setPending] = useState<string[]>(selectedIds)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const filtered = people.filter((p) =>
    p.full_name.toLowerCase().includes(q.toLowerCase()),
  )

  const toggle = (id: string) => {
    if (singleSelect) {
      setPending([id])
      return
    }
    setPending((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  const confirm = () => {
    onConfirm(pending)
    onClose()
  }

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[400]"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[410] w-full max-w-sm bg-white rounded-2xl shadow-2xl flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200 flex-shrink-0">
          <Users className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <h2 className="flex-1 text-sm font-semibold text-slate-800">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 hover:border-slate-300 focus-within:border-[#c62737] focus-within:ring-1 focus-within:ring-[#c62737] transition-colors bg-white">
            <Search className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Pesquisar pelo nome..."
              className="flex-1 text-sm outline-none bg-transparent text-slate-700 placeholder:text-slate-400"
            />
            {q && (
              <button
                type="button"
                onClick={() => setQ('')}
                className="text-slate-300 hover:text-slate-500"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {q && (
            <p className="text-[10px] text-slate-400 mt-1.5 ml-1">
              {filtered.length} resultado{filtered.length !== 1 ? 's' : ''} para "{q}"
            </p>
          )}
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-slate-400">Nenhuma pessoa encontrada.</p>
            </div>
          ) : (
            <ul>
              {filtered.map((person) => {
                const selected = pending.includes(person.id)
                return (
                  <li key={person.id}>
                    <button
                      type="button"
                      onClick={() => toggle(person.id)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors text-left ${
                        selected ? 'bg-[#c62737]/5' : ''
                      }`}
                    >
                      {/* Avatar */}
                      <div
                        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${avatarColor(person.id)}`}
                      >
                        {initials(person.full_name)}
                      </div>

                      {/* Nome */}
                      <span className="flex-1 text-sm text-slate-700 leading-tight">
                        {person.full_name}
                      </span>

                      {/* Checkbox / radio */}
                      <div
                        className={`flex-shrink-0 w-5 h-5 rounded-${singleSelect ? 'full' : 'md'} border-2 flex items-center justify-center transition-colors ${
                          selected
                            ? 'bg-[#c62737] border-[#c62737]'
                            : 'border-slate-300'
                        }`}
                      >
                        {selected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/60 rounded-b-2xl flex-shrink-0">
          <span className="text-xs text-slate-500">
            {pending.length > 0
              ? `${pending.length} selecionado${pending.length !== 1 ? 's' : ''}`
              : 'Nenhum selecionado'}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={confirm}
              className="px-4 py-1.5 rounded-xl bg-[#c62737] hover:bg-red-700 text-white text-xs font-semibold transition-colors"
            >
              Confirmar
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
