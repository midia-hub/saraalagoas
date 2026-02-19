'use client'

import { useState, useEffect } from 'react'
import { UsersRound, Plus, Search, MapPin, Filter } from 'lucide-react'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { adminFetchJson } from '@/lib/admin-client'
import { Button } from '@/components/ui/Button'
import { CustomSelect } from '@/components/ui/CustomSelect'
import { CelulaForm } from '@/components/celulas/CelulaForm'
import { Toast } from '@/components/Toast'
import Link from 'next/link'

export default function CelulasPage() {
  const [cells, setCells] = useState<any[]>([])
  const [churches, setChurches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; message: string } | null>(null)

  // Filtros
  const [q, setQ] = useState('')
  const [churchId, setChurchId] = useState('')
  const [status, setStatus] = useState('ativa')

  async function loadData() {
    setLoading(true)
    try {
      const [cellsData, churchesData] = await Promise.all([
        adminFetchJson<{ items: any[] }>(`/api/admin/celulas?church_id=${churchId}&status=${status}`),
        adminFetchJson<{ items: any[] }>('/api/admin/consolidacao/churches')
      ])
      setCells(cellsData.items || [])
      setChurches(churchesData.items || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [churchId, status])

  const filteredCells = cells.filter(c => 
    c.name.toLowerCase().includes(q.toLowerCase()) ||
    c.leader?.full_name?.toLowerCase().includes(q.toLowerCase())
  )

  async function handleCreate(data: any) {
    setSaving(true)
    try {
      await adminFetchJson('/api/admin/celulas', {
        method: 'POST',
        body: JSON.stringify(data)
      })
      setToast({ type: 'ok', message: 'Célula criada com sucesso!' })
      setShowShowForm(false)
      loadData()
    } catch (err: any) {
      setToast({ type: 'err', message: err.message || 'Erro ao criar célula.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <PageAccessGuard pageKey="celulas">
      <div className="p-6 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <UsersRound className="text-emerald-600" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Células</h1>
              <p className="text-slate-500">Gestão estratégica de células e redes</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Link href="/admin/celulas/dashboard">
              <Button variant="outline" className="gap-2">
                Ver Dashboard
              </Button>
            </Link>
            <Button onClick={() => setShowShowForm(true)} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
              <Plus size={20} /> Nova Célula
            </Button>
          </div>
        </div>

        {showForm ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => setShowShowForm(false)} className="text-slate-500">
                Cancelar
              </Button>
              <h2 className="text-lg font-bold text-slate-800">Cadastrar Nova Célula</h2>
            </div>
            <CelulaForm onSubmit={handleCreate} loading={saving} />
          </div>
        ) : (
          <>
            {/* Filtros */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  value={q}
                  onChange={e => setQ(e.target.value)}
                  placeholder="Buscar por nome ou líder..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:border-emerald-500 outline-none"
                />
              </div>
              <CustomSelect
                value={churchId}
                onChange={setChurchId}
                options={churches.map(c => ({ value: c.id, label: c.name }))}
                placeholder="Todas as Igrejas"
              />
              <CustomSelect
                value={status}
                onChange={setStatus}
                options={[
                  { value: 'ativa', label: 'Ativas' },
                  { value: 'inativa', label: 'Inativas' },
                ]}
              />
            </div>

            {/* Lista */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-48 bg-slate-100 animate-pulse rounded-2xl border border-slate-200" />
                ))
              ) : filteredCells.length > 0 ? (
                filteredCells.map((cell) => (
                  <Link key={cell.id} href={`/admin/celulas/${cell.id}`}>
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg hover:border-emerald-500/30 transition-all group">
                      <div className="flex justify-between items-start mb-4">
                        <div className="space-y-1">
                          <h3 className="font-bold text-slate-800 group-hover:text-emerald-600 transition-colors">{cell.name}</h3>
                          <p className="text-xs text-slate-500 uppercase font-semibold tracking-wider">{cell.church?.name}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${
                          cell.status === 'ativa' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {cell.status}
                        </span>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <UsersRound size={16} className="text-slate-400" />
                          <span>Líder: <strong className="text-slate-700">{cell.leader?.full_name || '—'}</strong></span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <MapPin size={16} className="text-slate-400" />
                          <span className="truncate">{cell.neighborhood || 'Local não informado'}</span>
                        </div>
                      </div>

                      <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between">
                        <span className="text-xs text-slate-400">
                          {cell.day_of_week === 'mon' && 'Segunda'}
                          {cell.day_of_week === 'tue' && 'Terça'}
                          {cell.day_of_week === 'wed' && 'Quarta'}
                          {cell.day_of_week === 'thu' && 'Quinta'}
                          {cell.day_of_week === 'fri' && 'Sexta'}
                          {cell.day_of_week === 'sat' && 'Sábado'}
                          {cell.day_of_week === 'sun' && 'Domingo'}
                          {' • '}{cell.time_of_day?.slice(0, 5)}
                        </span>
                        <div className="text-emerald-600 font-bold text-xs group-hover:translate-x-1 transition-transform flex items-center gap-1">
                          Ver Detalhes →
                        </div>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="col-span-full py-20 text-center text-slate-400">
                  Nenhuma célula encontrada com os filtros aplicados.
                </div>
              )}
            </div>
          </>
        )}

        {toast && (
          <Toast visible message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        )}
      </div>
    </PageAccessGuard>
  )
}
