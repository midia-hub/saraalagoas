'use client'

import { FollowupStatus, FOLLOWUP_STATUS_LABELS } from '@/lib/consolidacao-types'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import { CustomSelect } from '@/components/ui/CustomSelect'
import { DatePickerInput } from '@/components/ui/DatePickerInput'

interface Church { id: string; name: string }

interface Props {
  status: string
  churchId: string
  q: string
  from: string
  to: string
  churches: Church[]
  onStatusChange: (v: string) => void
  onChurchChange: (v: string) => void
  onQChange: (v: string) => void
  onFromChange: (v: string) => void
  onToChange: (v: string) => void
}

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Todos os status' },
  ...(['em_acompanhamento', 'direcionado_revisao', 'inscrito_revisao', 'concluiu_revisao', 'encerrado'] as FollowupStatus[]).map(
    (s) => ({ value: s, label: FOLLOWUP_STATUS_LABELS[s] })
  ),
]

const inputBase = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#c62737]/25 focus:border-[#c62737]/40 transition-colors'

export function FollowupFilters({
  status, churchId, q, from, to, churches,
  onStatusChange, onChurchChange, onQChange, onFromChange, onToChange,
}: Props) {
  const hasFilters = !!(q || status || churchId || from || to)

  function clearAll() {
    onQChange('')
    onStatusChange('')
    onChurchChange('')
    onFromChange('')
    onToChange('')
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-slate-600">
          <SlidersHorizontal className="w-4 h-4" />
          <span className="text-sm font-semibold text-slate-700">Filtros</span>
        </div>
        {hasFilters && (
          <button
            onClick={clearAll}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#c62737] hover:text-[#a81f2c] transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Limpar filtros
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Busca */}
        <div className="lg:col-span-2">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Busca</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={q}
              onChange={(e) => onQChange(e.target.value)}
              placeholder="Nome, telefone..."
              className={`${inputBase} pl-9`}
            />
            {q && (
              <button onClick={() => onQChange('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Status */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Status</label>
          <CustomSelect
            value={status}
            onChange={onStatusChange}
            options={STATUS_OPTIONS}
            placeholder="Todos os status"
            allowEmpty={true}
          />
        </div>

        {/* Igreja */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Igreja</label>
          <CustomSelect
            value={churchId}
            onChange={onChurchChange}
            options={[
              { value: '', label: 'Todas' },
              ...churches.map((c) => ({ value: c.id, label: c.name }))
            ]}
            placeholder="Selecionar..."
            allowEmpty={true}
          />
        </div>
      </div>

      {/* Período */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Período de conversão</label>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex-1 min-w-40">
            <DatePickerInput
              value={from}
              onChange={onFromChange}
              placeholder="De..."
            />
          </div>
          <span className="text-slate-400 text-sm select-none">até</span>
          <div className="flex-1 min-w-40">
            <DatePickerInput
              value={to}
              onChange={onToChange}
              placeholder="Até..."
            />
          </div>
          {(from || to) && (
            <button
              onClick={() => { onFromChange(''); onToChange('') }}
              className="text-xs text-slate-400 hover:text-[#c62737] transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
