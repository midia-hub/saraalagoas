'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { CustomSelect } from '@/components/ui/CustomSelect'

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
    (v: string) => {
      onChange({ ...state, type: v as AlbumTypeFilter })
    },
    [state, onChange]
  )

  const handlePeriodChange = useCallback(
    (v: string) => {
      onChange({ ...state, period: v as PeriodFilter })
    },
    [state, onChange]
  )

  const handleSortChange = useCallback(
    (v: string) => {
      onChange({ ...state, sort: v as SortOption })
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
        <CustomSelect value={state.type} onChange={handleTypeChange} placeholder="Todos os tipos" options={[{ value: 'culto', label: 'Culto' }, { value: 'evento', label: 'Evento' }]} aria-label="Filtrar por tipo" />
        <CustomSelect value={state.period} onChange={handlePeriodChange} placeholder="Período" options={PERIOD_OPTIONS} allowEmpty={false} aria-label="Filtrar por período" />
        <CustomSelect value={state.sort} onChange={handleSortChange} placeholder="Ordenar" options={sortOptions} allowEmpty={false} aria-label="Ordenar" />
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
