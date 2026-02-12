'use client'

import Select from 'react-select'
import { Filter } from 'lucide-react'
import type { MetaIntegrationOption } from './types'
import { DATE_RANGE_OPTIONS, SCHEDULED_STATUS_OPTIONS } from './types'

export type PostFiltersState = {
  status: string
  dateRange: string
  accountId: string
}

type PostFiltersProps = {
  filters: PostFiltersState
  onFiltersChange: (next: Partial<PostFiltersState>) => void
  integrations: MetaIntegrationOption[]
  /** Se true, mostra filtros para postagens programadas; senão para lista geral. */
  forScheduled?: boolean
}

const dateOptions = DATE_RANGE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))
const statusOptions = SCHEDULED_STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label }))

export function PostFilters({
  filters,
  onFiltersChange,
  integrations,
  forScheduled = true,
}: PostFiltersProps) {
  const accountOptions = [
    { value: '', label: 'Todas as contas' },
    ...integrations.map((i) => ({ value: i.value, label: i.label })),
  ]

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="flex items-center gap-1.5 text-sm font-medium text-slate-600">
        <Filter className="h-4 w-4" />
        Filtros
      </span>
      {forScheduled && (
        <div className="w-40">
          <Select
            options={statusOptions}
            value={statusOptions.find((o) => o.value === filters.status) ?? statusOptions[0]}
            onChange={(opt) => opt && onFiltersChange({ status: opt.value })}
            placeholder="Status"
            classNamePrefix="react-select"
            isSearchable={false}
            aria-label="Filtrar por status"
          />
        </div>
      )}
      <div className="w-44">
        <Select
          options={dateOptions}
          value={dateOptions.find((o) => o.value === filters.dateRange) ?? dateOptions[0]}
          onChange={(opt) => opt && onFiltersChange({ dateRange: opt.value })}
          placeholder="Período"
          classNamePrefix="react-select"
          isSearchable={false}
          aria-label="Filtrar por período"
        />
      </div>
      {integrations.length > 0 && (
        <div className="w-52">
          <Select
            options={accountOptions}
            value={accountOptions.find((o) => o.value === filters.accountId) ?? accountOptions[0]}
            onChange={(opt) => onFiltersChange({ accountId: opt?.value ?? '' })}
            placeholder="Conta"
            classNamePrefix="react-select"
            isSearchable={integrations.length > 5}
            aria-label="Filtrar por conta"
          />
        </div>
      )}
    </div>
  )
}
