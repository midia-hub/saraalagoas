'use client'

import { useState, useEffect } from 'react'
import { adminFetchJson } from '@/lib/admin-client'
import { ReportsOverview } from '@/components/consolidacao/ReportsOverview'
import { AdminPageHeader } from '@/app/admin/AdminPageHeader'
import { BarChart3, RefreshCw } from 'lucide-react'
import { CustomSelect } from '@/components/ui/CustomSelect'

export default function RelatoriosPage() {
  const [churches, setChurches] = useState<{ id: string; name: string }[]>([])
  const [churchId, setChurchId] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    adminFetchJson('/api/admin/consolidacao/churches')
      .then((d: any) => {
        const list = d.churches ?? []
        setChurches(list)
        const saraSede = list.find((c: any) => c.name === 'Sara Sede Algoas')
        if (saraSede) setChurchId(saraSede.id)
      })
      .catch(() => {})
  }, [])

  const churchOptions = [
    { value: '', label: 'Todas as congregações' },
    ...churches.map((c) => ({ value: c.id, label: c.name })),
  ]

  return (
    <div className="p-6 md:p-8 space-y-6">
      <AdminPageHeader
        icon={BarChart3}
        title="Relatórios"
        subtitle="Visão geral e análise do processo de consolidação"
        backLink={{ href: '/admin/consolidacao/lista', label: 'Consolidação' }}
        actions={
          <div className="flex items-center gap-3">
            {churches.length > 1 && (
              <div className="min-w-52">
                <CustomSelect
                  value={churchId}
                  onChange={setChurchId}
                  options={churchOptions}
                  placeholder="Todas as congregações"
                  allowEmpty={true}
                />
              </div>
            )}
            <button
              onClick={() => setRefreshKey(k => k + 1)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:text-[#c62737] hover:border-[#c62737]/30 hover:bg-[#c62737]/5 transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              Atualizar
            </button>
          </div>
        }
      />
      <ReportsOverview key={refreshKey} churchId={churchId || undefined} />
    </div>
  )
}
