'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check, Building2, LayoutGrid } from 'lucide-react'

interface Church { id: string; name: string }
interface Arena  { id: string; name: string }
interface Team   { id: string; name: string }

interface Props {
  churches:         Church[]
  arenas:           Arena[]
  teams:            Team[]
  selectedChurchId: string | null
  selectedArenaId:  string | null
  activeTeamIds:    Set<string>
  onChurchChange:   (id: string) => void
  onArenaChange:    (id: string | null) => void
  onTeamToggle:     (id: string) => void
  onClearTeams:     () => void
  loading?:         boolean
}

function Dropdown({
  icon: Icon,
  label,
  options,
  selectedId,
  onSelect,
  disabled,
  placeholder,
}: {
  icon: React.ElementType
  label: string
  options: { id: string; name: string }[]
  selectedId: string | null
  onSelect: (id: string) => void
  disabled?: boolean
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = options.find((o) => o.id === selectedId)

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [open])

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-2 h-9 px-3 rounded-xl border text-sm font-semibold transition-colors ${
          disabled
            ? 'bg-slate-50 border-slate-200 text-slate-300 cursor-not-allowed'
            : selectedId
            ? 'bg-[#c62737]/5 border-[#c62737]/30 text-[#c62737] hover:bg-[#c62737]/10'
            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
        }`}
      >
        <Icon size={14} className="shrink-0" />
        <span className="max-w-[160px] truncate">{selected?.name ?? placeholder ?? label}</span>
        <ChevronDown size={13} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && !disabled && (
        <div className="absolute left-0 top-full mt-1.5 min-w-[200px] max-w-[260px] bg-white rounded-xl border border-slate-200 shadow-lg z-50 overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
          </div>
          <div className="py-1 max-h-56 overflow-y-auto">
            {options.length === 0 && (
              <p className="px-3 py-2 text-xs text-slate-400 italic">Nenhum cadastrado</p>
            )}
            {options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => { onSelect(opt.id); setOpen(false) }}
                className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors ${
                  selectedId === opt.id
                    ? 'bg-[#c62737]/5 text-[#c62737] font-semibold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="truncate">{opt.name}</span>
                {selectedId === opt.id && <Check size={13} className="shrink-0 ml-2" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function CelulasDashboardFilterBar({
  churches,
  arenas,
  teams,
  selectedChurchId,
  selectedArenaId,
  activeTeamIds,
  onChurchChange,
  onArenaChange,
  onTeamToggle,
  onClearTeams,
  loading,
}: Props) {
  const allTeamsActive = activeTeamIds.size === 0

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Church */}
      <Dropdown
        icon={Building2}
        label="Igreja"
        options={churches}
        selectedId={selectedChurchId}
        onSelect={onChurchChange}
        placeholder="Selecionar igreja"
        disabled={loading}
      />

      {/* Separator */}
      {churches.length > 0 && (
        <span className="text-slate-300 select-none shrink-0">›</span>
      )}

      {/* Arena */}
      <Dropdown
        icon={LayoutGrid}
        label="Arena"
        options={arenas}
        selectedId={selectedArenaId}
        onSelect={onArenaChange}
        placeholder={arenas.length === 0 ? 'Sem arenas' : 'Selecionar arena'}
        disabled={loading || !selectedChurchId || arenas.length === 0}
      />

      {/* Teams — only show when an arena is selected and has teams */}
      {selectedArenaId && teams.length > 0 && (
        <>
          <span className="text-slate-300 select-none shrink-0">›</span>

          {/* "Todas" pill */}
          <button
            type="button"
            onClick={onClearTeams}
            className={`inline-flex items-center h-9 px-3 rounded-xl border text-xs font-bold transition-colors ${
              allTeamsActive
                ? 'bg-slate-800 border-slate-800 text-white'
                : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
            }`}
          >
            Todas
          </button>

          {teams.map((team) => {
            const active = activeTeamIds.has(team.id)
            return (
              <button
                key={team.id}
                type="button"
                onClick={() => onTeamToggle(team.id)}
                className={`inline-flex items-center h-9 px-3 rounded-xl border text-xs font-bold transition-colors ${
                  active
                    ? 'bg-[#c62737] border-[#c62737] text-white shadow-sm shadow-[#c62737]/25'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                {team.name}
              </button>
            )
          })}
        </>
      )}
    </div>
  )
}
