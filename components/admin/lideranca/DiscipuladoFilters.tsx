import { useState, useEffect } from 'react'
import { adminFetchJson } from '@/lib/admin-client'
import { CalendarDays, ChevronDown, ListFilter } from 'lucide-react'
import { CustomSelect } from '@/components/ui/CustomSelect'

interface FiltersProps {
  onFilter: (params: FilterParams) => void
  loading: boolean
}

export type FilterParams = {
  start: string
  end: string
  service_id: string
}

const PRESETS = [
  { label: '7 dias', days: 7 },
  { label: '30 dias', days: 30 },
  { label: '90 dias', days: 90 },
]

export function DiscipuladoFilters({ onFilter, loading }: FiltersProps) {
  const today = new Date()
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]
  const todayStr = today.toISOString().split('T')[0]

  const [services, setServices] = useState<{ id: string; name: string }[]>([])
  const [params, setParams] = useState<FilterParams>({
    start: firstDayOfMonth,
    end: todayStr,
    service_id: 'all',
  })

  useEffect(() => {
    adminFetchJson('/api/admin/lideranca/cultos')
      .then(data => { if (Array.isArray(data)) setServices(data) })
      .catch(console.error)
  }, [])

  const applyPreset = (days: number) => {
    const newParams = {
      ...params,
      start: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0],
    }
    setParams(newParams)
    onFilter(newParams)
  }

  const handleChange = (key: keyof FilterParams, value: string) => {
    const newParams = { ...params, [key]: value }
    setParams(newParams)
    onFilter(newParams)
  }

  const inputCls = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm outline-none focus:border-[#c62737] focus:ring-2 focus:ring-[#c62737]/20 transition-all'

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3">
        <ListFilter className="w-4 h-4 text-slate-400" />
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Filtros</span>
      </div>

      <div className="flex flex-col md:flex-row gap-5 p-5">
        {/* Período */}
        <div className="flex-1 space-y-2">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <CalendarDays className="w-3.5 h-3.5" /> Período
          </label>
          <div className="flex items-center gap-2">
            <input type="date" value={params.start} onChange={e => handleChange('start', e.target.value)} className={inputCls} />
            <span className="text-slate-300 font-bold">→</span>
            <input type="date" value={params.end} onChange={e => handleChange('end', e.target.value)} className={inputCls} />
          </div>
          <div className="flex gap-2">
            {PRESETS.map(p => (
              <button
                key={p.days}
                onClick={() => applyPreset(p.days)}
                className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-500 hover:border-[#c62737]/40 hover:bg-[#c62737]/5 hover:text-[#c62737] transition-all"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Culto */}
        <div className="flex-1 space-y-2">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <ChevronDown className="w-3.5 h-3.5" /> Culto / Rede
          </label>
          <CustomSelect
            value={params.service_id}
            onChange={(value) => handleChange('service_id', value || 'all')}
            placeholder="Todos os cultos"
            allowEmpty={false}
            options={[
              { value: 'all', label: 'Todos os cultos' },
              ...services.map((s) => ({ value: s.id, label: s.name })),
            ]}
          />
        </div>
      </div>
    </div>
  )
}
