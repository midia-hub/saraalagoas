'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Calendar as CalendarIcon, X } from 'lucide-react'
import { CustomSelect } from '@/components/ui/CustomSelect'

interface DateFiltersProps {
  yearFilter: string
  monthFilter: string
  years: string[]
  months: { value: string; label: string }[]
}

export function DateFilters({ yearFilter, monthFilter, years, months }: DateFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    // Usar scroll: false para evitar pular para o topo
    router.push(`/galeria?${params.toString()}`, { scroll: false })
  }

  const clearFilters = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('year')
    params.delete('month')
    params.delete('type') // Limpar tudo para resetar ao estado inicial
    router.push(`/galeria`, { scroll: false })
  }

  const yearOptions = years.map(y => ({ value: y, label: y }))
  const monthOptions = months.map(m => ({ value: m.value, label: m.label }))

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-center w-full md:w-auto">
      <div className="flex gap-2 items-center w-full sm:w-80">
        <div className="w-1/2">
          <CustomSelect
            value={yearFilter}
            onChange={(val) => updateFilter('year', val)}
            options={yearOptions}
            placeholder="Ano"
          />
        </div>
        <div className="w-1/2">
          <CustomSelect
            value={monthFilter}
            onChange={(val) => updateFilter('month', val)}
            options={monthOptions}
            placeholder="Mês"
          />
        </div>
      </div>

      {(yearFilter || monthFilter) && (
        <button
          onClick={clearFilters}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-sara-red hover:bg-sara-red/5 rounded-lg transition-colors whitespace-nowrap"
        >
          <X size={14} />
          LIMPAR FILTROS
        </button>
      )}
    </div>
  )
}
