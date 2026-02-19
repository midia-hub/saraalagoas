'use client'

import { useState, useEffect } from 'react'
import { DollarSign, CheckCircle2, XCircle, Clock, Filter, Search, ArrowLeft } from 'lucide-react'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { adminFetchJson } from '@/lib/admin-client'
import { Button } from '@/components/ui/Button'
import { Toast } from '@/components/Toast'
import Link from 'next/link'

type PDRealization = {
  id: string
  realization_date: string
  pd_value: number
  pd_approval_status: 'pending' | 'approved' | 'rejected'
  created_at: string
  attendance_edit_used: boolean
  attendances?: any[]
  cell: {
    id: string
    name: string
    leader?: { full_name: string }
  }
}

export default function PDManagementPage() {
  const [realizations, setRealizations] = useState<PDRealization[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending')
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; message: string } | null>(null)
  const [deadlineDate, setDeadlineDate] = useState<string>('')
  const [editingDeadline, setEditingDeadline] = useState(false)
  const [tempDeadline, setTempDeadline] = useState<string>('')

  async function loadData() {
    setLoading(true)
    try {
      const data = await adminFetchJson<{ items: PDRealization[] }>('/api/admin/celulas/pd-management')
      setRealizations(data.items || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function loadDeadline() {
    try {
      const data = await adminFetchJson<{ deadline_date: string | null }>('/api/admin/celulas/pd-config')
      setDeadlineDate(data.deadline_date || '')
      setTempDeadline(data.deadline_date || '')
    } catch (err) {
      console.error('Erro ao carregar data de corte:', err)
    }
  }

  async function saveDeadline() {
    if (!tempDeadline) {
      setToast({ type: 'err', message: 'Data de corte é obrigatória.' })
      return
    }
    
    try {
      await adminFetchJson('/api/admin/celulas/pd-config', {
        method: 'PATCH',
        body: JSON.stringify({ deadline_date: tempDeadline })
      })
      setDeadlineDate(tempDeadline)
      setEditingDeadline(false)
      setToast({ type: 'ok', message: 'Data de corte atualizada com sucesso!' })
    } catch (err: any) {
      setToast({ type: 'err', message: err.message || 'Erro ao atualizar data de corte.' })
    }
  }

  useEffect(() => {
    loadData()
    loadDeadline()
  }, [])

  async function handleApprove(id: string, newValue?: number) {
    try {
      await adminFetchJson(`/api/admin/celulas/pd-management/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ pd_value: newValue })
      })
      setToast({ type: 'ok', message: 'PD aprovado com sucesso!' })
      loadData()
    } catch (err: any) {
      setToast({ type: 'err', message: err.message || 'Erro ao aprovar PD.' })
    }
  }

  async function handleReject(id: string) {
    try {
      await adminFetchJson(`/api/admin/celulas/pd-management/${id}/reject`, {
        method: 'POST'
      })
      setToast({ type: 'ok', message: 'PD rejeitado.' })
      loadData()
    } catch (err: any) {
      setToast({ type: 'err', message: err.message || 'Erro ao rejeitar PD.' })
    }
  }

  const filtered = realizations.filter(r => {
    // Filtrar apenas realizações com pelo menos uma frequência (célula foi realizada)
    const hasAttendances = r.attendances?.length ?? 0 > 0
    if (!hasAttendances) return false
    
    if (filter !== 'all' && r.pd_approval_status !== filter) return false
    if (search && !r.cell.name.toLowerCase().includes(search.toLowerCase()) && 
        !r.cell.leader?.full_name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const stats = {
    pending: realizations.filter(r => (r.attendances?.length ?? 0) > 0 && r.pd_approval_status === 'pending').length,
    approved: realizations.filter(r => (r.attendances?.length ?? 0) > 0 && r.pd_approval_status === 'approved').length,
    rejected: realizations.filter(r => (r.attendances?.length ?? 0) > 0 && r.pd_approval_status === 'rejected').length,
    total: realizations.reduce((sum, r) => {
      const hasAttendances = (r.attendances?.length ?? 0) > 0
      return sum + (hasAttendances && r.pd_approval_status === 'approved' ? r.pd_value : 0)
    }, 0)
  }

  return (
    <PageAccessGuard pageKey="celulas">
      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/admin/celulas" className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
            <ArrowLeft size={24} />
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-slate-800">Gerenciamento de Parceiro de Deus</h1>
            <p className="text-slate-500">Aprovar, rejeitar ou editar valores de PD das células</p>
          </div>
        </div>

        {/* Data de Corte */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <h2 className="text-sm font-bold text-blue-900 uppercase mb-1">Data Limite para Preenchimento do PD</h2>
              <p className="text-xs text-blue-700">
                Até esta data, os líderes podem preencher o valor do Parceiro de Deus. Após esta data, apenas visualização.
              </p>
            </div>
            {editingDeadline ? (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={tempDeadline}
                  onChange={(e) => setTempDeadline(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                />
                <Button size="sm" onClick={saveDeadline} className="bg-blue-600 hover:bg-blue-700">
                  Salvar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setTempDeadline(deadlineDate)
                    setEditingDeadline(false)
                  }}
                >
                  Cancelar
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-2xl font-bold text-blue-900">
                    {deadlineDate ? new Date(deadlineDate + 'T12:00:00').toLocaleDateString('pt-BR') : 'Não definida'}
                  </p>
                  {deadlineDate && (
                    <p className="text-xs text-blue-600">
                      {new Date(deadlineDate + 'T12:00:00') >= new Date() ? 'Dentro do prazo' : 'Prazo expirado'}
                    </p>
                  )}
                </div>
                <Button size="sm" variant="secondary" onClick={() => setEditingDeadline(true)}>
                  Alterar
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-xl p-6 border border-amber-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-amber-700 uppercase mb-1">Pendentes</p>
                <p className="text-3xl font-bold text-amber-900">{stats.pending}</p>
              </div>
              <Clock className="text-amber-600" size={32} />
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-xl p-6 border border-emerald-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-emerald-700 uppercase mb-1">Aprovados</p>
                <p className="text-3xl font-bold text-emerald-900">{stats.approved}</p>
              </div>
              <CheckCircle2 className="text-emerald-600" size={32} />
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-red-100/50 rounded-xl p-6 border border-red-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-red-700 uppercase mb-1">Rejeitados</p>
                <p className="text-3xl font-bold text-red-900">{stats.rejected}</p>
              </div>
              <XCircle className="text-red-600" size={32} />
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-6 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-blue-700 uppercase mb-1">Total Aprovado</p>
                <p className="text-2xl font-bold text-blue-900">R$ {stats.total.toFixed(2)}</p>
              </div>
              <DollarSign className="text-blue-600" size={32} />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Buscar por célula ou líder..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
              />
            </div>
            <div className="flex gap-2">
              {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    filter === f
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f === 'all' ? 'Todos' : f === 'pending' ? 'Pendentes' : f === 'approved' ? 'Aprovados' : 'Rejeitados'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left p-4 text-xs font-bold text-slate-600 uppercase">Célula</th>
                  <th className="text-left p-4 text-xs font-bold text-slate-600 uppercase">Líder</th>
                  <th className="text-left p-4 text-xs font-bold text-slate-600 uppercase">Data</th>
                  <th className="text-right p-4 text-xs font-bold text-slate-600 uppercase">Valor PD</th>
                  <th className="text-center p-4 text-xs font-bold text-slate-600 uppercase">Editada</th>
                  <th className="text-center p-4 text-xs font-bold text-slate-600 uppercase">Status</th>
                  <th className="text-center p-4 text-xs font-bold text-slate-600 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-500">Carregando...</td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12">
                      <div className="text-slate-500 space-y-1">
                        <p className="font-medium">Nenhuma realização encontrada</p>
                        <p className="text-xs text-slate-400">Apenas células com frequências registradas aparecem aqui</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => (
                    <PDRow
                      key={r.id}
                      realization={r}
                      onApprove={handleApprove}
                      onReject={handleReject}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {toast && (
          <Toast visible message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        )}
      </div>
    </PageAccessGuard>
  )
}

function PDRow({
  realization,
  onApprove,
  onReject
}: {
  realization: PDRealization
  onApprove: (id: string, newValue?: number) => void
  onReject: (id: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(realization.pd_value)

  const statusConfig = {
    pending: { label: 'Pendente', bg: 'bg-amber-100', text: 'text-amber-700', icon: Clock },
    approved: { label: 'Aprovado', bg: 'bg-emerald-100', text: 'text-emerald-700', icon: CheckCircle2 },
    rejected: { label: 'Rejeitado', bg: 'bg-red-100', text: 'text-red-700', icon: XCircle }
  }

  const config = statusConfig[realization.pd_approval_status]
  const Icon = config.icon

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
      <td className="p-4">
        <Link href={`/admin/celulas/${realization.cell.id}`} className="font-semibold text-slate-800 hover:text-emerald-600">
          {realization.cell.name}
        </Link>
      </td>
      <td className="p-4 text-slate-600">{realization.cell.leader?.full_name || '-'}</td>
      <td className="p-4 text-slate-600">
        {new Date(realization.realization_date + 'T12:00:00').toLocaleDateString('pt-BR')}
      </td>
      <td className="p-4 text-right">
        {editing ? (
          <input
            type="number"
            step="0.01"
            value={editValue}
            onChange={(e) => setEditValue(parseFloat(e.target.value) || 0)}
            className="w-28 px-2 py-1 text-right rounded border border-slate-300 focus:border-emerald-500 outline-none"
          />
        ) : (
          <span className="font-bold text-slate-800">R$ {realization.pd_value.toFixed(2)}</span>
        )}
      </td>
      <td className="p-4">
        <div className="flex justify-center">
          {realization.attendance_edit_used ? (
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
              Sim
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
              Não
            </span>
          )}
        </div>
      </td>
      <td className="p-4">
        <div className="flex justify-center">
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${config.bg} ${config.text} flex items-center gap-1`}>
            <Icon size={12} />
            {config.label}
          </span>
        </div>
      </td>
      <td className="p-4">
        <div className="flex items-center justify-center gap-2">
          {realization.pd_approval_status === 'pending' && (
            <>
              {editing ? (
                <>
                  <Button
                    size="sm"
                    onClick={() => {
                      onApprove(realization.id, editValue)
                      setEditing(false)
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    Salvar e Aprovar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditValue(realization.pd_value)
                      setEditing(false)
                    }}
                  >
                    Cancelar
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setEditing(true)}
                  >
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => onApprove(realization.id)}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    Aprovar
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => onReject(realization.id)}
                  >
                    Rejeitar
                  </Button>
                </>
              )}
            </>
          )}
          {realization.pd_approval_status === 'approved' && (
            <span className="text-xs text-slate-500 italic">Confirmado</span>
          )}
          {realization.pd_approval_status === 'rejected' && (
            <span className="text-xs text-slate-500 italic">Rejeitado</span>
          )}
        </div>
      </td>
    </tr>
  )
}
