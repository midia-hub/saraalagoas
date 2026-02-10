'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

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
  { value: 'all', label: 'Todos' },
  { value: 'last7', label: 'Últimos 7 dias' },
  { value: 'last30', label: 'Últimos 30 dias' },
  { value: 'this_month', label: 'Este mês' },
  { value: 'last_month', label: 'Mês passado' },
]

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'recent', label: 'Recentes' },
  { value: 'a-z', label: 'A–Z' },
  { value: 'photos', label: 'Mais fotos' },
]

export interface AlbumFiltersProps {
  state: AlbumFiltersState
  onChange: (state: AlbumFiltersState) => void
  /** Se true, esconde a opção "Mais fotos" no sort (quando não há photosCount) */
  hideSortByPhotos?: boolean
}

const SEARCH_DEBOUNCE_MS = 300

export function AlbumFilters({
  state,
  onChange,
  hideSortByPhotos = false,
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

  const handleTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onChange({ ...state, type: e.target.value as AlbumTypeFilter })
    },
    [state, onChange]
  )

  const handlePeriodChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onChange({ ...state, period: e.target.value as PeriodFilter })
    },
    [state, onChange]
  )

  const handleSortChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onChange({ ...state, sort: e.target.value as SortOption })
    },
    [state, onChange]
  )

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
    <div className="sticky top-0 z-10 -mx-2 px-2 py-3 bg-slate-50/95 backdrop-blur border-b border-slate-200">
      <div className="flex flex-wrap items-center gap-2 md:gap-3">
        <input
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Buscar por nome..."
          className="flex-1 min-w-[140px] max-w-[220px] px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#c62737]/30 focus:border-[#c62737] outline-none"
          aria-label="Buscar álbum por nome"
        />
        <select
          value={state.type}
          onChange={handleTypeChange}
          className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#c62737]/30 focus:border-[#c62737] outline-none"
          aria-label="Filtrar por tipo"
        >
          <option value="">Todos os tipos</option>
          <option value="culto">Culto</option>
          <option value="evento">Evento</option>
        </select>
        <select
          value={state.period}
          onChange={handlePeriodChange}
          className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#c62737]/30 focus:border-[#c62737] outline-none"
          aria-label="Filtrar por período"
        >
          {PERIOD_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <select
          value={state.sort}
          onChange={handleSortChange}
          className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#c62737]/30 focus:border-[#c62737] outline-none"
          aria-label="Ordenar"
        >
          {sortOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleClear}
            className="px-3 py-2 text-sm text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg hover:bg-white transition-colors"
          >
            Limpar
          </button>
        )}
      </div>
    </div>
  )
}
