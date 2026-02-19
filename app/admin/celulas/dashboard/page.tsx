'use client'

import { useState, useEffect } from 'react'
import { LayoutDashboard, RefreshCw } from 'lucide-react'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { adminFetchJson } from '@/lib/admin-client'
import { computeEliteCells } from '@/lib/cells-elite'
import { Button } from '@/components/ui/Button'
import { CelulasDashboard } from '@/components/celulas/CelulasDashboard'
import { AdminPageHeader } from '@/app/admin/AdminPageHeader'

export default function CelulasDashboardPage() {
  const [stats, setStats] = useState<any>(null)
  const [cells, setCells] = useState<any[]>([])
  const [eliteCellIds, setEliteCellIds] = useState<Set<string>>(new Set())
  const [realizations, setRealizations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  async function loadData() {
    setLoading(true)
    try {
      const [cellsData, relsData] = await Promise.all([
        adminFetchJson<{ items: any[] }>('/api/admin/celulas?status=ativa'),
        adminFetchJson<{ items: any[] }>('/api/admin/celulas/realizacoes'),
      ]).catch(() => [ { items: [] }, { items: [] } ])

      const activeCells = cellsData.items || []
      const allRels = relsData.items || []
      
      const now = new Date()
      const currentMonth = now.toISOString().slice(0, 7) + '-01'
      
      // Realizações do mês atual
      const monthRels = allRels.filter((r: any) => r.reference_month === currentMonth)
      
      // Cálculo REAL da média de presença e visitantes
      let totalAttRecords = 0
      let totalPresentGrid = 0
      let totalMembersPresent = 0
      let totalVisitorsInMeetings = 0
      
      monthRels.forEach((rel: any) => {
        // Quick visitors (Added via the "Visitors in Day" section)
        const meetingVisitors = rel.visitors || []
        totalVisitorsInMeetings += meetingVisitors.length

        // Attendance grid
        const att = rel.attendances || []
        att.forEach((a: any) => {
          totalAttRecords++
          if (a.status === 'V') {
            totalPresentGrid++
            const isVisitor = a.cell_person?.type === 'visitor'
            if (isVisitor) {
              totalVisitorsInMeetings++
            } else {
              totalMembersPresent++
            }
          }
        })
      })

      const avgAttendance = totalAttRecords > 0 
        ? Math.round((totalPresentGrid / totalAttRecords) * 100) + '%' 
        : '0%'

      const totalVisitors = totalVisitorsInMeetings

      const pdTotal = allRels.reduce((acc: number, r: any) => acc + (r.pd_value || 0), 0)
      const pdPending = allRels.filter((r: any) => r.pd_approval_status === 'pending').reduce((acc: number, r: any) => acc + (r.pd_value || 0), 0)

      const eliteIds = computeEliteCells({ monthKey: currentMonth, realizations: allRels })
      setEliteCellIds(eliteIds)
      setRealizations(allRels)

      setCells(activeCells)
      setStats({
        totalActive: activeCells.length,
        monthRealizations: monthRels.length,
        avgAttendance,
        totalVisitors,
        totalPresent: totalMembersPresent,
        totalPresentGrid,
        totalMembersRegistered: totalAttRecords,
        pdTotal,
        pdPending,
        growth: '--'
      })
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  return (
    <PageAccessGuard pageKey="celulas">
      <div className="p-6 md:p-8 space-y-6">
        <AdminPageHeader
          icon={LayoutDashboard}
          title="Dashboard de Células"
          subtitle="Indicadores estratégicos e cobertura territorial"
          backLink={{ href: '/admin/celulas', label: 'Células' }}
          actions={
            <Button onClick={loadData} variant="outline" className="gap-2">
              <RefreshCw size={16} />
              Atualizar Dados
            </Button>
          }
        />

        {loading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-28 bg-slate-100 animate-pulse rounded-2xl border border-slate-200" />
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-48 bg-slate-100 animate-pulse rounded-2xl border border-slate-200" />
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 h-[540px] bg-slate-100 animate-pulse rounded-2xl border border-slate-200" />
              <div className="space-y-5">
                <div className="h-48 bg-slate-100 animate-pulse rounded-2xl border border-slate-200" />
                <div className="h-64 bg-slate-100 animate-pulse rounded-2xl border border-slate-200" />
              </div>
            </div>
          </div>
        ) : stats && (
          <CelulasDashboard stats={stats} cells={cells} eliteCellIds={eliteCellIds} realizations={realizations} />
        )}
      </div>
    </PageAccessGuard>
  )
}
