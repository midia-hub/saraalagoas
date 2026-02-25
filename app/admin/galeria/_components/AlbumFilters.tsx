'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Search, X, ArrowUpDown, CalendarDays, LayoutGrid } from 'lucide-react'

export type AlbumTypeFilter = '' | 'culto' | 'evento'

export type PeriodFilter =
  | 'all'
  | 'last7'
  | 'last30'
  | 'this_month'
  | 'last_month'
  | string

export type SortOption = 'recent' | 'a-z' | 'photos'

export interface AlbumFiltersState {
  search: string
  type: AlbumTypeFilter
  period: PeriodFilter
  sort: SortOption
}

const DEFAULT_FILTERS: AlbumFiltersState = {
  search: '',
  type: '',
  period: 'all',
  sort: 'recent',
}

const PERIOD_OPTIONS: { value: PeriodFilter; label: string }[] = [
  { value: 'all', label: 'Qualquer data' },
  { value: 'last7', label: 'Últimos 7 dias' },
  { value: 'last30', label: 'Últimos 30 dias' },
  { value: 'this_month', label: 'Este mês' },
  { value: 'last_month', label: 'Mês passado' },
]

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'recent', label: 'Mais recentes' },
  { value: 'a-z', label: 'A–Z' },
  { value: 'photos', label: 'Mais fotos' },
]

const TYPE_TABS: { value: AlbumTypeFilter; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'culto', label: 'Culto' },
  { value: 'evento', label: 'Evento' },
]

export interface AlbumFiltersProps {
  state: AlbumFiltersState
  onChange: (state: AlbumFiltersState) => void
  hideSortByPhotos?: boolean
  totalVisible?: number
}

const SEARCH_DEBOUNCE_MS = 250

const selectCls =
  'appearance-none h-9 pl-8 pr-7 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#c62737]/20 focus:border-[#c62737] cursor-pointer hover:border-slate-300 transition-colors'

export function AlbumFilters({
  state,
  onChange,
  hideSortByPhotos = false,
  totalVisible,
}: AlbumFiltersProps) {
  const [searchInput, setSearchInput] = useState(state.search)
  const stateRef = useRef(state)
  stateRef.current = state

  useEffect(() => {
    const t = setTimeout(() => {
      onChange({ ...stateRef.current, search: searchInput.trim() })
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [searchInput, onChange])

  useEffect(() => {
    setSearchInput(state.search)
  }, [state.search])

  const handleClear = useCallback(() => {
    setSearchInput('')
    onChange(DEFAULT_FILTERS)
  }, [onChange])

  const hasActiveFilters =
    state.search !== '' ||
    state.type !== '' ||
    state.period !== 'all' ||
    state.sort !== 'recent'

  const sortOptions = hideSortByPhotos
    ? SORT_OPTIONS.filter((o) => o.value !== 'photos')
    : SORT_OPTIONS

  return (
    <div className="sticky top-0 z-10 -mx-6 md:-mx-8 px-6 md:px-8 py-3 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">

        {/* Search */}
        <div className="relative shrink-0 w-56">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar por nome..."
            className="h-9 w-full pl-8 pr-7 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#c62737]/20 focus:border-[#c62737] focus:bg-white outline-none transition-all placeholder:text-slate-400 text-slate-700 font-medium"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Divider */}
        <div className="h-5 w-px bg-slate-200 hidden sm:block" />

        {/* Type pill tabs */}
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
          {TYPE_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => onChange({ ...state, type: tab.value })}
              className={`px-3 h-8 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
                state.type === tab.value
                  ? tab.value === 'culto'
                    ? 'bg-violet-600 text-white shadow-sm'
                    : tab.value === 'evento'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-white/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="h-5 w-px bg-slate-200 hidden sm:block" />

        {/* Period select */}
        <div className="relative">
          <CalendarDays className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          <select
            value={state.period}
            onChange={(e) => onChange({ ...state, period: e.target.value as PeriodFilter })}
            className={selectCls}
          >
            {PERIOD_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
            <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Sort select */}
        <div className="relative">
          <ArrowUpDown className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          <select
            value={state.sort}
            onChange={(e) => onChange({ ...state, sort: e.target.value as SortOption })}
            className={selectCls}
          >
            {sortOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
            <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Result count + clear */}
        <div className="ml-auto flex items-center gap-2">
          {totalVisible != null && (
            <span className="text-xs text-slate-400 font-medium whitespace-nowrap hidden sm:block">
              {totalVisible} resultado{totalVisible !== 1 ? 's' : ''}
            </span>
          )}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClear}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors whitespace-nowrap"
            >
              <X className="w-3 h-3" />
              Limpar
            </button>
          )}
        </div>

      </div>
    </div>
  )
}
