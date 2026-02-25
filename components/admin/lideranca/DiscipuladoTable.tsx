import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Check, X, Clock, Users, Loader2 } from 'lucide-react'

export type AttendanceItem = {
  disciple_id: string
  disciple_name: string
  email?: string
  phone?: string
  followup_id?: string | null
  followup_status?: string | null
  attended: number
  total: number
  percent: number
  last_date?: string
  completed_review_date?: string | null
}

function AttendanceBar({ percent }: { percent: number }) {
  const color = percent >= 75 ? 'bg-emerald-500' : percent >= 50 ? 'bg-amber-400' : 'bg-rose-400'
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(percent, 100)}%` }} />
      </div>
      <span className="text-xs font-bold text-slate-600 w-10 text-right shrink-0">{percent.toFixed(0)}%</span>
    </div>
  )
}

function StatusPill({ percent }: { percent: number }) {
  if (percent >= 75) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
      <Check className="w-3 h-3" /> Assíduo
    </span>
  )
  if (percent >= 50) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 ring-1 ring-amber-200">
      <Clock className="w-3 h-3" /> Regular
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 ring-1 ring-rose-200">
      <X className="w-3 h-3" /> Irregular
    </span>
  )
}

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}

const AVATAR_COLORS = [
  'bg-[#c62737]/10 text-[#c62737]',
  'bg-blue-100 text-blue-700',
  'bg-violet-100 text-violet-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
]

interface TableProps {
  items: AttendanceItem[]
  loading: boolean
  selectedIds?: string[]
  onToggleSelect?: (discipleId: string) => void
  onToggleSelectAll?: () => void
  onEnrollReview?: (item: AttendanceItem) => void
}

export function DiscipuladoTable({
  items,
  loading,
  selectedIds = [],
  onToggleSelect,
  onToggleSelectAll,
  onEnrollReview,
}: TableProps) {
  const selectionEnabled = typeof onToggleSelect === 'function'
  const reviewActionsEnabled = typeof onEnrollReview === 'function'
  const selectedSet = new Set(selectedIds)
  const allSelected = items.length > 0 && items.every((item) => selectedSet.has(item.disciple_id))

  if (loading) {
    return null
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-16 flex flex-col items-center justify-center gap-3 text-center">
        <div className="rounded-full bg-slate-50 p-4">
          <Users className="w-8 h-8 text-slate-300" />
        </div>
        <p className="text-sm font-semibold text-slate-600">Nenhum discípulo encontrado</p>
        <p className="text-xs text-slate-400">Verifique se há discípulos vinculados no período selecionado</p>
      </div>
    )
  }

  const avg = items.reduce((acc, i) => acc + i.percent, 0) / items.length

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Cabeçalho da tabela */}
      <div className={`border-b border-slate-100 bg-slate-50/60 px-5 py-3 hidden sm:grid ${selectionEnabled ? (reviewActionsEnabled ? 'grid-cols-[auto_2fr_1fr_2fr_1fr_auto]' : 'grid-cols-[auto_2fr_1fr_2fr_1fr]') : (reviewActionsEnabled ? 'grid-cols-[2fr_1fr_2fr_1fr_auto]' : 'grid-cols-[2fr_1fr_2fr_1fr]')} gap-4`}>
        {selectionEnabled && (
          <div className="flex items-center justify-center">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={() => onToggleSelectAll?.()}
              className="h-4 w-4 rounded border-slate-300 text-[#c62737] focus:ring-[#c62737]/30"
              aria-label="Selecionar todos"
            />
          </div>
        )}
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Discípulo</span>
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">Presenças</span>
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Frequência</span>
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">Status</span>
        {reviewActionsEnabled && (
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">Revisão</span>
        )}
      </div>

      <div className="divide-y divide-slate-100">
        {items.map((item, idx) => (
          <div
            key={item.disciple_id}
            className={`group flex flex-col sm:grid ${selectionEnabled ? (reviewActionsEnabled ? 'sm:grid-cols-[auto_2fr_1fr_2fr_1fr_auto]' : 'sm:grid-cols-[auto_2fr_1fr_2fr_1fr]') : (reviewActionsEnabled ? 'sm:grid-cols-[2fr_1fr_2fr_1fr_auto]' : 'sm:grid-cols-[2fr_1fr_2fr_1fr]')} gap-3 sm:gap-4 items-start sm:items-center px-5 py-4 hover:bg-slate-50/70 transition-colors`}
          >
            {selectionEnabled && (
              <div className="flex items-center justify-center pt-1 sm:pt-0">
                <input
                  type="checkbox"
                  checked={selectedSet.has(item.disciple_id)}
                  onChange={() => onToggleSelect?.(item.disciple_id)}
                  className="h-4 w-4 rounded border-slate-300 text-[#c62737] focus:ring-[#c62737]/30"
                  aria-label={`Selecionar ${item.disciple_name}`}
                />
              </div>
            )}

            {/* Avatar + Nome */}
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${AVATAR_COLORS[idx % AVATAR_COLORS.length]}`}>
                {getInitials(item.disciple_name)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{item.disciple_name}</p>
                {item.phone && <p className="text-xs text-slate-400 truncate">{item.phone}</p>}
                {!item.phone && item.email && <p className="text-xs text-slate-400 truncate">{item.email}</p>}
                {!item.phone && !item.email && (
                  <p className="text-xs text-slate-300">Sem contato</p>
                )}
              </div>
            </div>

            {/* Presenças */}
            <div className="text-center">
              <span className="text-base font-bold text-slate-800">{item.attended}</span>
              <span className="text-slate-300 mx-0.5">/</span>
              <span className="text-sm text-slate-400">{item.total}</span>
              {item.last_date && (
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Último: {format(new Date(item.last_date), "d MMM", { locale: ptBR })}
                </p>
              )}
            </div>

            {/* Barra de progresso */}
            <AttendanceBar percent={item.percent} />

            {/* Pill de status */}
            <div className="flex justify-center">
              <StatusPill percent={item.percent} />
            </div>

            {reviewActionsEnabled && (
              <div className="flex items-center justify-center gap-2 w-full sm:w-auto">
                {onEnrollReview && (
                  <button
                    type="button"
                    onClick={() => onEnrollReview(item)}
                    disabled={(item.followup_status ?? '') !== 'direcionado_revisao' || !!item.completed_review_date}
                    className="text-xs px-2.5 py-1.5 rounded-md bg-[#c62737] text-white hover:bg-[#b42332] transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Inscrever
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Rodapé */}
      <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/60 px-5 py-3">
        <span className="text-xs text-slate-500 font-medium">
          {items.length} discípulo{items.length !== 1 ? 's' : ''}
        </span>
        <span className="text-xs text-slate-500">
          Média geral: <strong className="text-slate-700">{avg.toFixed(1)}%</strong>
        </span>
      </div>
    </div>
  )
}
