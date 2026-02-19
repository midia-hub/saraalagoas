'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import useSWR from 'swr'
import { 
  ArrowLeft, 
  Calendar, 
  Users, 
  MapPin, 
  Clock, 
  Plus, 
  ChevronLeft,
  ChevronRight,
  UserCheck,
  History,
  Pencil,
  Trash2,
  Loader2,
  DollarSign,
  UserPlus,
  Info,
  X,
  ShieldCheck
} from 'lucide-react'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { adminFetchJson } from '@/lib/admin-client'
import { Button } from '@/components/ui/Button'
import { Toast } from '@/components/Toast'
import { AttendanceGrid } from '@/components/celulas/AttendanceGrid'
import { PDSection } from '@/components/celulas/PDSection'
import { CelulaForm } from '@/components/celulas/CelulaForm'
import { useRBAC } from '@/lib/hooks/useRBAC'
import Link from 'next/link'

const DAY_MAP: Record<string, number> = {
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6
}

export default function CelulaDetalhePage() {
  const params = useParams()
  const router = useRouter()
  const rawId = params?.id as string
  const id = rawId?.replace(/\/$/, '')
  const { hasAppPermission } = useRBAC()

  const [cell, setCell] = useState<any>(null)
  const [realizations, setRealizations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; message: string } | null>(null)
  const [visitorsAdded, setVisitorsAdded] = useState<string[]>([])
  // Track ongoing toggles to prevent double-clicks
  const pendingToggles = useMemo(() => new Set<string>(), [])
  const { data: cellPeopleData, mutate: mutateCellPeople } = useSWR(
    id ? `/api/admin/celulas/${id}/people` : null,
    (url) => adminFetchJson<{ items: any[] }>(url)
  )
  const cellPeople = cellPeopleData?.items || []

  // Controle de mês para o Grid
  const [viewDate, setViewDate] = useState(new Date())

  // Estado para detalhes de uma data específica (PD e Visitantes)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [editDateOpen, setEditDateOpen] = useState(false)
  const [editDateValue, setEditDateValue] = useState('')
  const [editingPDValue, setEditingPDValue] = useState<number>(0)
  const [showRules, setShowRules] = useState(false)

  async function loadData() {
    setLoading(true)
    try {
      const [cellData, relsData] = await Promise.all([
        adminFetchJson<{ item: any }>(`/api/admin/celulas/${id}`),
        adminFetchJson<{ items: any[] }>(`/api/admin/celulas/realizacoes?cell_id=${id}`)
      ])
      setCell(cellData.item)
      setRealizations(relsData.items || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (id) loadData()
  }, [id])

  // Cálculo das datas da célula no mês selecionado
  const monthDates = useMemo(() => {
    if (!cell) return []
    
    const year = viewDate.getFullYear()
    const month = viewDate.getMonth()
    const targetDay = DAY_MAP[cell.day_of_week]
    const createdAt = new Date(cell.created_at)
    
    const dates: string[] = []
    const d = new Date(year, month, 1)
    
    // Encontrar primeiro dia do mês que corresponde ao dia da semana
    while (d.getDay() !== targetDay) {
      d.setDate(d.getDate() + 1)
    }
    
    while (d.getMonth() === month) {
      // Só incluir se for após a criação da célula
      if (d >= new Date(createdAt.getFullYear(), createdAt.getMonth(), createdAt.getDate())) {
        
        // Lógica de frequência
        let shouldInclude = true
        if (cell.frequency === 'biweekly') {
          const diffTime = Math.abs(d.getTime() - createdAt.getTime())
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
          const weeks = Math.floor(diffDays / 7)
          if (weeks % 2 !== 0) shouldInclude = false
        } else if (cell.frequency === 'monthly') {
          // Simplificado: primeira ocorrência do mês
          if (dates.length > 0) shouldInclude = false
        }
        
        if (shouldInclude) {
          dates.push(d.toISOString().split('T')[0])
        }
      }
      d.setDate(d.getDate() + 7)
    }
    
    return dates
  }, [cell, viewDate])

  const gridMembers = useMemo(() => {
    if (!cell) return []

    const coreIds = new Set<string>()
    const members: any[] = []

    if (cell.leader) {
      coreIds.add(cell.leader.id)
      members.push({ person: cell.leader, id: cell.leader.id })
    }

    if (cell.co_leader) {
      coreIds.add(cell.co_leader.id)
      members.push({ person: cell.co_leader, id: cell.co_leader.id })
    }

    for (const cp of cellPeople) {
      if (cp.person_id && coreIds.has(cp.person_id)) continue
      members.push({
        ...cp,
        cell_person_id: cp.id,
        person: cp.person || (cp.person_id ? { id: cp.person_id, full_name: cp.person?.full_name } : { id: cp.id, full_name: cp.full_name })
      })
    }

    return members
  }, [cell, cellPeople])

  const currentRealization = useMemo(() => {
    if (!selectedDate) return null
    return realizations.find(r => r.realization_date.startsWith(selectedDate)) || {
      realization_date: selectedDate,
      pd_value: 0,
      attendances: [],
      visitors: []
    }
  }, [selectedDate, realizations])

  useEffect(() => {
    if (selectedDate) {
      setEditDateValue(selectedDate)
      setEditDateOpen(false)
      const rel = realizations.find(r => r.realization_date.startsWith(selectedDate))
      setEditingPDValue(rel?.pd_value || 0)
    }
  }, [selectedDate, realizations])

  async function handleToggleAttendance(personId: string, date: string, currentStatus: string | null, cellPersonId?: string) {
    const nextStatus = currentStatus === 'V' ? 'X' : currentStatus === 'X' ? null : 'V'
    
    // Se passarem um personId que nao parece um UUID (ex prefixo),
    // ou se o personId for igual ao cellPersonId, entao provavelmente person_id e nulo.
    // Mas no banco, ambos sao UUIDs. O ponto e diferenciar se personId e o ID global ou o ID do vinculo.
    // Na AttendanceGrid, toggleKeyId e person.id || cellPerson.id.
    
    // Resolvemos: Se cellPersonId existe e e IGUAL ao personId passado, assume-se que person_id e nulo.
    const actualPersonId = cellPersonId === personId ? null : personId
    const actualCellPersonId = cellPersonId || (cellPersonId === personId ? personId : null)

    const toggleKey = `${personId}_${date}`

    if (pendingToggles.has(toggleKey)) return
    pendingToggles.add(toggleKey)

    const rollbackRealizations = realizations
    setRealizations(prev => {
      const existingIdx = prev.findIndex(r => r.realization_date.startsWith(date))
      
      if (existingIdx === -1) {
        return prev.concat([{
          realization_date: date,
          pd_value: 0,
          attendances: nextStatus ? [{ cell_person_id: actualCellPersonId, person_id: actualPersonId, status: nextStatus }] : [],
          visitors: []
        }])
      }

      const rel = prev[existingIdx]
      const filtered = (rel.attendances || []).filter(
        (a: any) => {
          // Comparacao robusta: so remove se bater exatamente o que estamos enviando
          const matchesPerson = actualPersonId ? (a.person_id === actualPersonId) : false
          const matchesCellPerson = actualCellPersonId ? (a.cell_person_id === actualCellPersonId) : false
          return !matchesPerson && !matchesCellPerson
        }
      )
      
      const newAttendances = nextStatus
        ? [...filtered, { cell_person_id: actualCellPersonId, person_id: actualPersonId, status: nextStatus }]
        : filtered

      const updated = [...prev]
      updated[existingIdx] = { ...rel, attendances: newAttendances }
      return updated
    })

    try {
      await adminFetchJson('/api/admin/celulas/attendance-toggle', {
        method: 'POST',
        body: JSON.stringify({
          cell_id: id,
          realization_date: date,
          cell_person_id: actualCellPersonId,
          person_id: actualPersonId,
          status: nextStatus
        })
      })
    } catch (err: any) {
      setRealizations(rollbackRealizations)
      setToast({ type: 'err', message: err.message || 'Erro ao atualizar presença.' })
    } finally {
      pendingToggles.delete(toggleKey)
    }
  }

  async function handleSaveDetails(pdValue: number, visitors: any[]) {
    if (!selectedDate) return
    setSaving(true)
    try {
      const existingRel = realizations.find(r => r.realization_date.startsWith(selectedDate))
      
      const payload = {
        cell_id: id,
        reference_month: selectedDate.slice(0, 7) + '-01',
        realization_date: selectedDate,
        pd_value: pdValue,
        attendances: (existingRel?.attendances || []).map((a: any) => ({
          cell_person_id: a.cell_person_id || null,
          person_id: a.person_id || null,
          status: a.status
        })),
        visitors: visitors.map((v: any) => ({
          full_name: v.full_name,
          phone: v.phone || ''
        }))
      }

      await adminFetchJson('/api/admin/celulas/realizacoes', {
        method: 'POST',
        body: JSON.stringify(payload)
      })

      setToast({ type: 'ok', message: 'Dados salvos com sucesso!' })
      // Nao fechar, apenas atualizar
      loadData()
    } catch (err: any) {
      setToast({ type: 'err', message: err.message || 'Erro ao salvar detalhes.' })
    } finally {
      setSaving(false)
    }
  }

  async function handleConfirmPD(realizationId: string) {
    try {
      await adminFetchJson('/api/admin/celulas/confirmar-pd', {
        method: 'POST',
        body: JSON.stringify({ realization_id: realizationId })
      })
      setToast({ type: 'ok', message: 'PD confirmado!' })
      loadData()
    } catch (err: any) {
      setToast({ type: 'err', message: err.message || 'Erro ao confirmar.' })
    }
  }

  async function handleAddVisitorToAttendance(visitor: { full_name: string; phone?: string }) {
    setSaving(true)
    try {
      const { item: createdVisitor } = await adminFetchJson<{ item: any }>(`/api/admin/celulas/${id}/people`, {
        method: 'POST',
        body: JSON.stringify({
          full_name: visitor.full_name,
          phone: visitor.phone || ''
        })
      })
      setVisitorsAdded([...visitorsAdded, createdVisitor.id])
      mutateCellPeople()
      setToast({ type: 'ok', message: `${visitor.full_name} adicionado(a) como visitante!` })
      loadData()
    } catch (err: any) {
      setToast({ type: 'err', message: err.message || 'Erro ao adicionar visitante.' })
    } finally {
      setSaving(false)
    }
  }

  async function handleAddPersonToAttendance(personId: string) {
    setSaving(true)
    try {
      const { item: cellPerson } = await adminFetchJson<{ item: any }>(`/api/admin/celulas/${id}/people`, {
        method: 'POST',
        body: JSON.stringify({ person_id: personId, type: 'visitor' })
      })
      setVisitorsAdded([...visitorsAdded, cellPerson.id])
      mutateCellPeople()
      setToast({ type: 'ok', message: 'Pessoa adicionada na lista de visitantes da célula!' })
      loadData()
    } catch (err: any) {
      setToast({ type: 'err', message: err.message || 'Erro ao adicionar pessoa.' })
    } finally {
      setSaving(false)
    }
  }

  async function handleRemoveMember(personId: string, cellPersonId?: string) {
    setSaving(true)
    try {
      // Registrar qual registro de cell_people estamos removendo
      const cellPersonRecord = cellPeople.find((cp: any) =>
        (cellPersonId ? cp.id === cellPersonId : cp.person_id === personId)
      )

      if (!cellPersonRecord) {
        throw new Error('Registro de vínculo não encontrado.')
      }

      // Uma única chamada atômica
      await adminFetchJson(`/api/admin/celulas/${id}/people?personId=${cellPersonRecord.id}`, {
        method: 'DELETE'
      })

      setToast({ type: 'ok', message: 'Membro removido com sucesso!' })
      
      // Atualizar localmente
      mutateCellPeople()
      await loadData()
    } catch (err: any) {
      setToast({ type: 'err', message: err.message || 'Erro ao remover membro.' })
    } finally {
      setSaving(false)
    }
  }

  if (loading && !cell) return <div className="p-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-600" /></div>
  if (!cell) return <div className="p-20 text-center text-slate-500">Célula não encontrada.</div>

  return (
    <PageAccessGuard pageKey="celulas">
      <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/admin/celulas" className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
              <ArrowLeft size={24} />
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-slate-800">{cell.name}</h1>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  cell.status === 'ativa' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                }`}>
                  {cell.status}
                </span>
              </div>
              <p className="text-slate-500 font-medium">{cell.church?.name}</p>
            </div>
          </div>

          <div className="flex gap-2">
            {hasAppPermission('cells_approve_pd') && (
              <Link href="/admin/celulas/pd-management">
                <Button variant="outline" className="gap-2">
                  <DollarSign size={18} /> Gerenciar PD
                </Button>
              </Link>
            )}
            <Button variant="outline" onClick={() => setShowRules(true)} className="gap-2">
              <Info size={18} /> Regras
            </Button>
            <Button variant="outline" onClick={() => setEditing(!editing)} className="gap-2">
              <Pencil size={18} /> {editing ? 'Cancelar Edição' : 'Editar Célula'}
            </Button>
          </div>
        </div>

        {editing ? (
          <CelulaForm initial={cell} onSubmit={async (data) => {
            setSaving(true)
            try {
              await adminFetchJson(`/api/admin/celulas/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
              setToast({ type: 'ok', message: 'Célula atualizada!' })
              setEditing(false)
              loadData()
            } catch (err: any) {
              setToast({ type: 'err', message: err.message || 'Erro ao atualizar.' })
            } finally {
              setSaving(false)
            }
          }} loading={saving} />
        ) : (
          <div className="space-y-8">
            {/* Grid de Presença */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                    <Calendar size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">Frequência Mensal</h2>
                    <p className="text-sm text-slate-500">Clique nos ícones para marcar presença (V) ou falta (X)</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 bg-slate-50 p-1 rounded-xl border border-slate-100">
                  <button 
                    onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}
                    className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all text-slate-600"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <span className="text-sm font-bold text-slate-700 min-w-[120px] text-center uppercase tracking-wide">
                    {viewDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
                  </span>
                  <button 
                    onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}
                    className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all text-slate-600"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>

              {/* Totalizadores */}
              {(() => {
                const monthRealizations = realizations.filter(r => {
                  const realizationDate = new Date(r.realization_date + 'T12:00:00')
                  const isInMonth = realizationDate.getMonth() === viewDate.getMonth() && 
                         realizationDate.getFullYear() === viewDate.getFullYear()
                  // Considerar apenas realizações que têm pelo menos uma frequência registrada
                  const hasAttendance = (r.attendances?.length ?? 0) > 0
                  return isInMonth && hasAttendance
                })
                
                let totalPresent = 0
                let totalAbsent = 0
                let totalRecorded = 0
                
                monthRealizations.forEach(rel => {
                  rel.attendances?.forEach((att: any) => {
                    if (att.status === 'V') totalPresent++
                    else if (att.status === 'X') totalAbsent++
                  })
                })
                
                totalRecorded = totalPresent + totalAbsent
                const percentagePresent = totalRecorded > 0 ? (totalPresent / totalRecorded * 100).toFixed(1) : '0'
                
                return (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-xl p-4 border border-emerald-200">
                      <p className="text-xs font-bold text-emerald-700 uppercase mb-1">Presenças</p>
                      <p className="text-2xl font-bold text-emerald-900">{totalPresent}</p>
                    </div>
                    <div className="bg-gradient-to-br from-red-50 to-red-100/50 rounded-xl p-4 border border-red-200">
                      <p className="text-xs font-bold text-red-700 uppercase mb-1">Faltas</p>
                      <p className="text-2xl font-bold text-red-900">{totalAbsent}</p>
                    </div>
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-4 border border-blue-200">
                      <p className="text-xs font-bold text-blue-700 uppercase mb-1">% Presença</p>
                      <p className="text-2xl font-bold text-blue-900">{percentagePresent}%</p>
                    </div>
                    <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-xl p-4 border border-amber-200">
                      <p className="text-xs font-bold text-amber-700 uppercase mb-1">Realizações</p>
                      <p className="text-2xl font-bold text-amber-900">{monthRealizations.length}</p>
                    </div>
                  </div>
                )
              })()}

              <AttendanceGrid 
                members={gridMembers}
                dates={monthDates} 
                attendances={realizations}
                onToggle={handleToggleAttendance}
                onAddVisitor={handleAddVisitorToAttendance}
                onAddPerson={handleAddPersonToAttendance}
                onRemoveMember={handleRemoveMember}
                coreMembers={[
                  ...(cell.leader ? [{ id: cell.leader.id, full_name: cell.leader.full_name, role: 'leader' as const }] : []),
                  ...(cell.co_leader ? [{ id: cell.co_leader.id, full_name: cell.co_leader.full_name, role: 'co-leader' as const }] : [])
                ]}
                visitors={visitorsAdded}
              />

              <div className="flex flex-wrap gap-6 pt-4 border-t border-slate-50">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                  <div className="w-3 h-3 rounded bg-emerald-500" /> Presente (V)
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                  <div className="w-3 h-3 rounded bg-red-500" /> Falta (X)
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                  <div className="w-3 h-3 rounded bg-slate-100 border border-slate-200" /> Não registrado
                </div>
              </div>
            </div>

            <div className="space-y-8">
              {/* Coluna Detalhes da Data */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <History size={22} className="text-emerald-600" />
                    Detalhes por Data
                  </h2>
                  <div className="flex gap-2">
                    {monthDates.map(date => (
                      <button
                        key={date}
                        onClick={() => setSelectedDate(date)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                          selectedDate === date
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-600/20'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-500'
                        }`}
                      >
                        {new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                      </button>
                    ))}
                  </div>
                </div>

                {selectedDate ? (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="bg-white rounded-2xl border-2 border-emerald-500 p-6 shadow-sm">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-slate-800">
                          Realização de {new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </h3>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedDate(null)}>Fechar</Button>
                      </div>

                      {currentRealization?.id && (hasAppPermission('usuarios') || hasAppPermission('cells_manage_all')) && (
                        <div className="mb-6 p-4 rounded-xl border border-slate-200 bg-slate-50">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <p className="text-sm font-semibold text-slate-700">Alterar data da realização</p>
                              <p className="text-xs text-slate-500">Disponível para administradores e líderes diretos.</p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditDateOpen((prev) => !prev)}
                            >
                              {editDateOpen ? 'Cancelar' : 'Alterar data'}
                            </Button>
                          </div>

                          {editDateOpen && (
                            <div className="mt-4 flex flex-col md:flex-row gap-3">
                              <select
                                value={editDateValue}
                                onChange={(e) => setEditDateValue(e.target.value)}
                                className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-sm focus:border-emerald-500 outline-none"
                              >
                                {monthDates.map((d) => (
                                  <option key={d} value={d}>
                                    {new Date(d + 'T12:00:00').toLocaleDateString('pt-BR')}
                                  </option>
                                ))}
                              </select>
                              <Button
                                size="sm"
                                onClick={async () => {
                                  if (!editDateValue || !monthDates.includes(editDateValue)) {
                                    setToast({ type: 'err', message: 'Selecione uma data valida.' })
                                    return
                                  }
                                  try {
                                    await adminFetchJson(`/api/admin/celulas/realizacoes/${currentRealization.id}`, {
                                      method: 'PATCH',
                                      body: JSON.stringify({ realization_date: editDateValue })
                                    })
                                    setToast({ type: 'ok', message: 'Data atualizada.' })
                                    setSelectedDate(editDateValue)
                                    setEditDateOpen(false)
                                    loadData()
                                  } catch (err: any) {
                                    setToast({ type: 'err', message: err.message || 'Erro ao alterar data.' })
                                  }
                                }}
                              >
                                Salvar
                              </Button>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="space-y-6">
                        <PDSection
                          value={editingPDValue}
                          approvalStatus={currentRealization?.pd_approval_status}
                          confirmed={currentRealization?.pd_confirmed}
                          confirmedBy={currentRealization?.confirmed_by?.person?.full_name}
                          filledBy={currentRealization?.filled_by?.person?.full_name}
                          filledAt={currentRealization?.pd_filled_at}
                          canConfirm={hasAppPermission('cells_approve_pd') && !!currentRealization?.id}
                          onConfirm={() => handleConfirmPD(currentRealization.id)}
                          onChange={(val) => setEditingPDValue(val)}
                          readOnly={false}
                          isAdmin={hasAppPermission('usuarios')}
                        />

                        {(currentRealization?.pd_approval_status !== 'approved' || hasAppPermission('usuarios')) && (
                          <Button
                            onClick={() => handleSaveDetails(editingPDValue, currentRealization?.visitors || [])}
                            disabled={saving}
                            className="w-full max-w-md bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20"
                          >
                            {saving ? 'Salvando...' : 'Salvar Detalhes'}
                          </Button>
                        )}
                        
                        <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl p-6 border border-slate-200">
                          <p className="text-sm font-semibold text-slate-700 mb-4">Resumo de Presença</p>
                          <div className="flex gap-6">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                              <span className="text-emerald-600 font-bold text-lg">
                                {currentRealization?.attendances?.filter((a: any) => a.status === 'V').length || 0}
                              </span>
                              <span className="text-slate-600 text-sm">Presentes</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-red-500"></div>
                              <span className="text-red-500 font-bold text-lg">
                                {currentRealization?.attendances?.filter((a: any) => a.status === 'X').length || 0}
                              </span>
                              <span className="text-slate-600 text-sm">Faltas</span>
                            </div>
                          </div>
                        </div>

                        {currentRealization?.approval_status === 'pending' && hasAppPermission('cells_approve_edit') && (
                          <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-200 p-6 rounded-xl">
                            <p className="text-sm text-amber-900 font-semibold mb-3">Edição tardia pendente de aprovação</p>
                            <Button
                              type="button"
                              onClick={async () => {
                                await adminFetchJson(`/api/admin/celulas/realizacoes/${currentRealization.id}/approve-edit`, { method: 'POST' })
                                loadData()
                              }}
                              className="w-full max-w-md"
                            >
                              Aprovar edição
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-20 text-center bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400">
                    Selecione uma data acima para gerenciar PD e Visitantes.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal de Regras */}
        {showRules && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowRules(false)}>
            <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <Info className="text-emerald-600" size={20} />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800">Regras das Células</h2>
                </div>
                <button onClick={() => setShowRules(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                  <X size={24} className="text-slate-500" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Frequência */}
                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-xl p-6 border border-emerald-200">
                  <h3 className="text-lg font-bold text-emerald-900 mb-4 flex items-center gap-2">
                    <UserCheck size={20} />
                    Registro de Frequência
                  </h3>
                  <ul className="space-y-3 text-sm text-emerald-800">
                    <li className="flex gap-3">
                      <span className="text-emerald-600 font-bold">•</span>
                      <span>A frequência só pode ser registrada <strong>na data da realização ou após</strong>. Não é permitido preencher antecipadamente.</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="text-emerald-600 font-bold">•</span>
                      <span>Após o prazo de edição, é permitido alterar uma data passada <strong>apenas uma vez</strong>.</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="text-emerald-600 font-bold">•</span>
                      <span>Edições tardias (após a janela de edição) entram em <strong>status pendente</strong> e precisam ser aprovadas.</span>
                    </li>
                  </ul>
                </div>

                {/* Promoção de Visitantes */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-6 border border-blue-200">
                  <h3 className="text-lg font-bold text-blue-900 mb-4 flex items-center gap-2">
                    <UserPlus size={20} />
                    Promoção de Visitante para Membro
                  </h3>
                  <div className="space-y-4">
                    <p className="text-sm text-blue-800">
                      Um visitante é <strong>automaticamente promovido a membro</strong> quando atinge uma das seguintes condições:
                    </p>
                    <div className="bg-white/60 rounded-lg p-4 space-y-3">
                      <div className="flex gap-3 text-sm text-blue-900">
                        <span className="font-bold text-blue-600">Regra A:</span>
                        <span><strong>3 presenças consecutivas</strong> nas últimas 3 realizações</span>
                      </div>
                      <div className="flex gap-3 text-sm text-blue-900">
                        <span className="font-bold text-blue-600">Regra B:</span>
                        <span><strong>4 presenças em 5 realizações</strong> (permitindo 1 falta)</span>
                      </div>
                    </div>
                    <p className="text-xs text-blue-700 italic">
                      * A promoção é automática e ocorre ao salvar a frequência.
                    </p>
                  </div>
                </div>

                {/* Parceiro de Deus (PD) */}
                <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-xl p-6 border border-amber-200">
                  <h3 className="text-lg font-bold text-amber-900 mb-4 flex items-center gap-2">
                    <DollarSign size={20} />
                    Parceiro de Deus (PD)
                  </h3>
                  <ul className="space-y-3 text-sm text-amber-800">
                    <li className="flex gap-3">
                      <span className="text-amber-600 font-bold">•</span>
                      <span>O valor do PD deve ser registrado para cada realização da célula.</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="text-amber-600 font-bold">•</span>
                      <span>O PD <strong>só pode ser confirmado após a célula ter sido realizada</strong> e as frequências terem sido editadas/registradas.</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="text-amber-600 font-bold">•</span>
                      <span>Existe uma <strong>data limite (corte)</strong> definida pelo Secretário PD no dashboard de gerenciamento.</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="text-amber-600 font-bold">•</span>
                      <span><strong>Até a data limite</strong>, os líderes podem preencher o valor do PD.</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="text-amber-600 font-bold">•</span>
                      <span><strong>Após a data limite</strong>, o preenchimento é bloqueado (apenas visualização) para usuários regulares.</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="text-amber-600 font-bold">•</span>
                      <span>A confirmação final do PD é feita por um usuário com permissão de <strong>Secretário PD</strong> através do dashboard de gerenciamento.</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="text-amber-600 font-bold">•</span>
                      <span>Uma vez confirmado, o valor do PD <strong>não pode mais ser alterado</strong> (exceto por administradores).</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="text-amber-600 font-bold">•</span>
                      <span>Se não houver arrecadação, marque a opção "Não houve arrecadação" e registre R$ 0,00.</span>
                    </li>
                  </ul>
                </div>

                {/* Permissões Especiais */}
                <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-xl p-6 border border-purple-200">
                  <h3 className="text-lg font-bold text-purple-900 mb-4 flex items-center gap-2">
                    <ShieldCheck size={20} />
                    Permissões Especiais
                  </h3>
                  <ul className="space-y-3 text-sm text-purple-800">
                    <li className="flex gap-3">
                      <span className="text-purple-600 font-bold">•</span>
                      <span><strong>Administradores</strong> têm acesso total e podem <strong>realizar alterações sem seguir as regras normais</strong>: editar PD aprovado, alterar datas múltiplas vezes, editar realizações fechadas, etc. sem afetar as permissões dos outros usuários.</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="text-purple-600 font-bold">•</span>
                      <span><strong>Secretário PD</strong> pode editar, aprovar ou rejeitar valores de PD através do <strong>Gerenciamento de PD</strong>.</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="text-purple-600 font-bold">•</span>
                      <span><strong>Líderes diretos</strong> podem alterar datas de realizações das células sob sua responsabilidade (limitado a uma alteração por data).</span>
                    </li>
                  </ul>
                </div>

                {/* Janela de Edição */}
                <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl p-6 border border-slate-200">
                  <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Clock size={20} />
                    Janela de Edição
                  </h3>
                  <ul className="space-y-3 text-sm text-slate-800">
                    <li className="flex gap-3">
                      <span className="text-slate-600 font-bold">•</span>
                      <span>Cada realização tem uma <strong>janela de edição</strong> calculada com base no dia e horário da célula.</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="text-slate-600 font-bold">•</span>
                      <span>Dentro da janela: edições são aplicadas <strong>imediatamente</strong>.</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="text-slate-600 font-bold">•</span>
                      <span>Fora da janela: edições entram em status <strong>pendente de aprovação</strong>.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {toast && (
          <Toast visible message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        )}
      </div>
    </PageAccessGuard>
  )
}
