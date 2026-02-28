'use client'

import { useState } from 'react'

interface ChecklistItem {
  id:     string
  label:  string
  done:   boolean
  custom: boolean
}

const PRESET_ITEMS: Omit<ChecklistItem, 'done' | 'custom'>[] = [
  { id: 'urgency',       label: 'Avaliar urgência e prioridade' },
  { id: 'type',          label: 'Definir tipo de entrega (arte / vídeo / escala)' },
  { id: 'deadline',      label: 'Verificar prazo e viabilidade' },
  { id: 'responsible',   label: 'Identificar responsáveis' },
  { id: 'existing',      label: 'Verificar se há material existente' },
  { id: 'flow',          label: 'Definir fluxo de aprovação' },
]

interface TriagemPanelProps {
  stepId:     string
  demandId:   string
  metadata:   Record<string, unknown>
  onSaved:    (newMeta: Record<string, unknown>) => void
  saving:     boolean
  onPatchMeta: (meta: Record<string, unknown>) => Promise<void>
}

export default function TriagemPanel({
  metadata,
  onPatchMeta,
  saving,
}: TriagemPanelProps) {
  const initialItems = (): ChecklistItem[] => {
    const saved = (metadata.checklist as ChecklistItem[] | undefined) ?? []
    if (saved.length > 0) return saved

    return PRESET_ITEMS.map((p) => ({
      ...p,
      done:   false,
      custom: false,
    }))
  }

  const [items,   setItems]   = useState<ChecklistItem[]>(initialItems)
  const [newItem, setNewItem] = useState('')
  const [dirty,   setDirty]   = useState(false)

  const toggle = (id: string) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, done: !i.done } : i)))
    setDirty(true)
  }

  const addCustom = () => {
    const label = newItem.trim()
    if (!label) return
    setItems((prev) => [
      ...prev,
      { id: `custom_${Date.now()}`, label, done: false, custom: true },
    ])
    setNewItem('')
    setDirty(true)
  }

  const removeCustom = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
    setDirty(true)
  }

  const save = async () => {
    await onPatchMeta({ ...metadata, checklist: items })
    setDirty(false)
  }

  const done  = items.filter((i) => i.done).length
  const total = items.length
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <div className="space-y-5">
      {/* Progresso */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-slate-700">
            Progresso da triagem
          </span>
          <span className="text-sm font-semibold text-[#c62737]">
            {done}/{total} ({pct}%)
          </span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#c62737] rounded-full transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Lista */}
      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors"
          >
            <button
              type="button"
              onClick={() => toggle(item.id)}
              className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                item.done
                  ? 'bg-[#c62737] border-[#c62737]'
                  : 'bg-white border-slate-300 hover:border-[#c62737]'
              }`}
            >
              {item.done && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
            <span
              className={`flex-1 text-sm ${
                item.done ? 'line-through text-slate-400' : 'text-slate-700'
              }`}
            >
              {item.label}
            </span>
            {item.custom && (
              <button
                type="button"
                onClick={() => removeCustom(item.id)}
                className="text-slate-300 hover:text-red-500 transition-colors text-xs"
              >
                ✕
              </button>
            )}
          </li>
        ))}
      </ul>

      {/* Adicionar item */}
      <div className="flex gap-2">
        <input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addCustom()}
          placeholder="Adicionar item personalizado..."
          className="flex-1 px-3 py-2 text-sm rounded-xl border border-slate-200 hover:border-slate-300 focus:border-[#c62737] focus:ring-1 focus:ring-[#c62737] outline-none transition-colors"
        />
        <button
          type="button"
          onClick={addCustom}
          className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-medium transition-colors"
        >
          + Adicionar
        </button>
      </div>

      {/* Salvar */}
      {dirty && (
        <div className="pt-1">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="w-full py-2.5 rounded-xl bg-[#c62737] hover:bg-red-700 text-white text-sm font-semibold transition-colors disabled:opacity-60"
          >
            {saving ? 'Salvando...' : 'Salvar checklist'}
          </button>
        </div>
      )}
    </div>
  )
}
