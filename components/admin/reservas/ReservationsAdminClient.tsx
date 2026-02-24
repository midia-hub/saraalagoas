'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { adminFetchJson } from '@/lib/admin-client'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Clock,
  CheckCircle2,
  XCircle,
  Ban,
  Building2,
  User,
  Phone,
  CalendarDays,
  BarChart3,
  Filter,
  RefreshCw,
  CheckCheck,
  AlertCircle,
  Trophy,
  Loader2,
  FileText,
  X,
} from 'lucide-react'

type ReservationItem = {
  id: string
  room_id: string
  requester_name: string
  requester_phone: string | null
  start_datetime: string
  end_datetime: string
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  cancelled_reason: string | null
  room?: { id: string; name: string } | null
}

type StatsPayload = {
  pending_count: number
  approved_month_count: number
  most_used_rooms: Array<{ room_id: string; room_name: string; count: number }>
  upcoming: Array<{
    id: string
    start_datetime: string
    end_datetime: string
    status: string
    requester_name: string
    room?: { name?: string } | null
  }>
}

type RoomsPayload = {
  rooms: Array<{ id: string; name: string }>
}

const DATE_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  dateStyle: 'short',
})
const TIME_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  hour: '2-digit',
  minute: '2-digit',
})

const STATUS_CONFIG: Record<ReservationItem['status'], { label: string; className: string; icon: React.ReactNode }> = {
  pending:   { label: 'Pendente',   className: 'bg-amber-100 text-amber-800 border border-amber-200',   icon: <Clock size={12} /> },
  approved:  { label: 'Aprovada',   className: 'bg-emerald-100 text-emerald-800 border border-emerald-200', icon: <CheckCircle2 size={12} /> },
  rejected:  { label: 'Rejeitada',  className: 'bg-red-100 text-red-800 border border-red-200',         icon: <XCircle size={12} /> },
  cancelled: { label: 'Cancelada',  className: 'bg-slate-100 text-slate-600 border border-slate-200',   icon: <Ban size={12} /> },
}

export default function ReservationsAdminClient() {
  const [rooms, setRooms] = useState<Array<{ id: string; name: string }>>([])
  const [items, setItems] = useState<ReservationItem[]>([])
  const [stats, setStats] = useState<StatsPayload | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [actionLoadingId, setActionLoadingId] = useState('')

  const [roomFilter, setRoomFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Modal de justificativa
  const [modalAction, setModalAction] = useState<{ id: string; action: 'reject' | 'cancel' } | null>(null)
  const [modalReason, setModalReason] = useState('')
  const [modalLoading, setModalLoading] = useState(false)

  const reservationBeingModalized = useMemo(() => {
    if (!modalAction) return null
    return items.find(r => r.id === modalAction.id) || null
  }, [modalAction, items])

  const queryString = useMemo(() => {
    const p = new URLSearchParams()
    if (roomFilter) p.set('room_id', roomFilter)
    if (statusFilter) p.set('status', statusFilter)
    if (dateFrom) p.set('date_from', dateFrom)
    if (dateTo) p.set('date_to', dateTo)
    return p.toString()
  }, [roomFilter, statusFilter, dateFrom, dateTo])

  async function loadRooms() {
    try {
      const json = await adminFetchJson<RoomsPayload>('/api/admin/reservas/rooms')
      setRooms(json.rooms ?? [])
    } catch {
      setRooms([])
    }
  }

  const loadList = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const url = queryString ? `/api/admin/reservas/list?${queryString}` : '/api/admin/reservas/list'
      const json = await adminFetchJson<{ reservations: ReservationItem[]; stats: StatsPayload }>(url)
      setItems(json.reservations ?? [])
      setStats(json.stats ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar reservas')
      setItems([])
      setStats(null)
    } finally {
      setLoading(false)
    }
  }, [queryString])

  useEffect(() => {
    loadRooms()
  }, [])

  useEffect(() => {
    loadList()
  }, [loadList])

  async function runAction(id: string, action: 'approve' | 'reject' | 'cancel') {
    if (action === 'approve') {
      setActionLoadingId(id)
      try {
        await adminFetchJson(`/api/admin/reservas/reservations/${id}/approve`, {
          method: 'POST',
          body: JSON.stringify({}),
        })
        await loadList()
      } catch (err) {
        window.alert(err instanceof Error ? err.message : 'Falha na aprovação')
      } finally {
        setActionLoadingId('')
      }
      return
    }

    // Para rejeitar ou cancelar, abrir modal
    setModalAction({ id, action })
    setModalReason('')
  }

  async function handleConfirmModal() {
    if (!modalAction) return
    setModalLoading(true)
    try {
      await adminFetchJson(`/api/admin/reservas/reservations/${modalAction.id}/${modalAction.action}`, {
        method: 'POST',
        body: JSON.stringify(modalReason.trim() ? { reason: modalReason.trim() } : {}),
      })
      setModalAction(null)
      await loadList()
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Falha na ação')
    } finally {
      setModalLoading(false)
    }
  }

  return (
    <div className="space-y-6">

      {/* ── CARDS DE RESUMO ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Pendentes"
          value={stats?.pending_count ?? 0}
          icon={<Clock size={22} />}
          colorClass="text-amber-600 bg-amber-50 border-amber-100"
        />
        <StatCard
          label="Aprovadas no mês"
          value={stats?.approved_month_count ?? 0}
          icon={<CheckCheck size={22} />}
          colorClass="text-emerald-600 bg-emerald-50 border-emerald-100"
        />
        <StatCard
          label="Sala mais usada"
          value={stats?.most_used_rooms?.[0]?.room_name ?? '—'}
          sub={stats?.most_used_rooms?.[0] ? `${stats.most_used_rooms[0].count} reservas` : ''}
          icon={<Trophy size={22} />}
          colorClass="text-violet-600 bg-violet-50 border-violet-100"
        />
        <StatCard
          label="Próximas reservas"
          value={stats?.upcoming?.length ?? 0}
          icon={<CalendarDays size={22} />}
          colorClass="text-blue-600 bg-blue-50 border-blue-100"
        />
      </div>

      {/* ── TIMELINE ── */}
      {(stats?.upcoming?.length ?? 0) > 0 && (
        <div className="rounded-2xl border bg-white shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays size={18} className="text-blue-600" />
            <h3 className="font-semibold text-slate-800">Próximas Reservas</h3>
          </div>
          <ol className="relative border-l-2 border-slate-100 pl-5 space-y-4">
            {stats!.upcoming.map((event) => (
              <li key={event.id} className="relative">
                <span className="absolute -left-[21px] flex items-center justify-center w-4 h-4 rounded-full bg-blue-500 mt-0.5" />
                <p className="text-sm font-medium text-slate-800">
                  {event.room?.name ?? 'Sala'} — {event.requester_name}
                </p>
                <p className="text-xs text-slate-500">
                  {DATE_FORMATTER.format(new Date(event.start_datetime))} &nbsp;
                  {TIME_FORMATTER.format(new Date(event.start_datetime))} - {TIME_FORMATTER.format(new Date(event.end_datetime))}
                </p>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* ── FILTROS ── */}
      <div className="rounded-2xl border bg-white shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={16} className="text-slate-500" />
          <span className="text-sm font-semibold text-slate-700">Filtrar reservas</span>
          <button
            type="button"
            onClick={loadList}
            title="Atualizar"
            className="ml-auto text-slate-500 hover:text-blue-600 transition-colors"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500">Sala</label>
            <select
              className="border rounded-lg px-3 py-2 text-sm bg-slate-50 focus:ring-2 focus:ring-blue-200 outline-none"
              value={roomFilter}
              onChange={(e) => setRoomFilter(e.target.value)}
            >
              <option value="">Todas as salas</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>{room.name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500">Status</label>
            <select
              className="border rounded-lg px-3 py-2 text-sm bg-slate-50 focus:ring-2 focus:ring-blue-200 outline-none"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Todos os status</option>
              <option value="pending">Pendente</option>
              <option value="approved">Aprovada</option>
              <option value="rejected">Rejeitada</option>
              <option value="cancelled">Cancelada</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500">De</label>
            <input
              type="date"
              className="border rounded-lg px-3 py-2 text-sm bg-slate-50 focus:ring-2 focus:ring-blue-200 outline-none"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500">Até</label>
            <input
              type="date"
              className="border rounded-lg px-3 py-2 text-sm bg-slate-50 focus:ring-2 focus:ring-blue-200 outline-none"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ── FEEDBACK ── */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* ── TABELA ── */}
      <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b bg-slate-50">
          <BarChart3 size={18} className="text-slate-500" />
          <span className="font-semibold text-slate-700 text-sm">
            {loading ? 'Carregando…' : `${items.length} reserva${items.length !== 1 ? 's' : ''} encontrada${items.length !== 1 ? 's' : ''}`}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500 bg-slate-50/60">
                <th className="px-5 py-3">Sala</th>
                <th className="px-5 py-3">Solicitante</th>
                <th className="px-5 py-3">Data</th>
                <th className="px-5 py-3">Horário</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((r) => {
                const isActionLoading = actionLoadingId === r.id
                const sc = STATUS_CONFIG[r.status]
                return (
                  <tr key={r.id} className="hover:bg-slate-50/50 transition-colors align-top">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2 font-medium text-slate-800">
                        <Building2 size={14} className="text-slate-400 shrink-0" />
                        {r.room?.name ?? r.room_id}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1 text-slate-800 font-medium">
                        <User size={13} className="text-slate-400 shrink-0" />
                        {r.requester_name}
                      </div>
                      {r.requester_phone && (
                        <div className="flex items-center gap-1 text-slate-500 text-xs mt-0.5">
                          <Phone size={11} className="shrink-0" />
                          {r.requester_phone}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3 text-slate-700 whitespace-nowrap">
                      {DATE_FORMATTER.format(new Date(r.start_datetime))}
                    </td>
                    <td className="px-5 py-3 text-slate-700 whitespace-nowrap">
                      {TIME_FORMATTER.format(new Date(r.start_datetime))} — {TIME_FORMATTER.format(new Date(r.end_datetime))}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${sc.className}`}>
                        {sc.icon} {sc.label}
                      </span>
                      {r.cancelled_reason && (
                        <div className="mt-1 text-xs text-slate-400 italic max-w-[160px] truncate" title={r.cancelled_reason}>
                          {r.cancelled_reason}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center flex-wrap gap-1.5">
                        {r.status === 'pending' && (
                          <>
                            <button
                              type="button"
                              disabled={isActionLoading}
                              onClick={() => runAction(r.id, 'approve')}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium px-3 py-1.5 disabled:opacity-50 transition-colors"
                            >
                              <CheckCircle2 size={13} /> Aprovar
                            </button>
                            <button
                              type="button"
                              disabled={isActionLoading}
                              onClick={() => runAction(r.id, 'reject')}
                              className="inline-flex items-center gap-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium px-3 py-1.5 disabled:opacity-50 transition-colors"
                            >
                              <XCircle size={13} /> Rejeitar
                            </button>
                          </>
                        )}
                        {r.status !== 'cancelled' && r.status !== 'rejected' && (
                          <button
                            type="button"
                            disabled={isActionLoading}
                            onClick={() => runAction(r.id, 'cancel')}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-medium px-3 py-1.5 disabled:opacity-50 transition-colors"
                          >
                            <Ban size={13} /> Cancelar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {items.length === 0 && !loading && (
                <tr>
                  <td className="px-5 py-12 text-center text-slate-400" colSpan={6}>
                    <CalendarDays size={36} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Nenhuma reserva encontrada.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODAL DE JUSTIFICATIVA (REJEIÇÃO / CANCELAMENTO) ── */}
      <AnimatePresence>
        {modalAction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => !modalLoading && setModalAction(null)}
            />
            {/* Content */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="relative w-full max-w-md overflow-hidden bg-white rounded-2xl shadow-2xl border border-slate-200"
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-xl ${modalAction.action === 'reject' ? 'bg-amber-100' : 'bg-slate-100'}`}>
                    {modalAction.action === 'reject' ? (
                      <XCircle size={24} className="text-amber-600" />
                    ) : (
                      <Ban size={24} className="text-slate-600" />
                    )}
                  </div>
                  {!modalLoading && (
                    <button
                      onClick={() => setModalAction(null)}
                      className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
                    >
                      <X size={20} />
                    </button>
                  )}
                </div>

                <div className="mb-6">
                  <h3 className="text-xl font-bold text-slate-900">
                    {modalAction.action === 'reject' ? 'Rejeitar solicitação' : 'Cancelar reserva'}
                  </h3>
                  {reservationBeingModalized && (
                    <p className="text-sm text-slate-500 mt-1">
                      Reserva para <strong className="text-slate-700">{reservationBeingModalized.room?.name}</strong> de <strong className="text-slate-700">{reservationBeingModalized.requester_name}</strong>.
                    </p>
                  )}
                </div>

                {/* Input */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText size={13} /> Justificativa (Opcional)
                    </label>
                    <textarea
                      autoFocus
                      value={modalReason}
                      onChange={(e) => setModalReason(e.target.value)}
                      placeholder="Ex: Sala reservada para manutenção..."
                      className="w-full h-32 p-3 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all resize-none placeholder:text-slate-300"
                      disabled={modalLoading}
                    />
                    <p className="text-[10px] text-slate-400">
                      * Essa mensagem será arquivada no log da reserva.
                    </p>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setModalAction(null)}
                      disabled={modalLoading}
                      className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
                    >
                      Voltar
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmModal}
                      disabled={modalLoading}
                      className={`flex-[2] py-2.5 rounded-xl text-white text-sm font-bold shadow-lg shadow-blue-900/10 active:scale-[0.98] transition-all flex items-center justify-center gap-2
                        ${modalAction.action === 'reject' ? 'bg-[#c62737] hover:bg-[#a01f2d]' : 'bg-slate-800 hover:bg-slate-900'}`}
                    >
                      {modalLoading ? (
                        <>
                          <Loader2 size={16} className="animate-spin" /> Processando...
                        </>
                      ) : (
                        <>
                          Confirmar {modalAction.action === 'reject' ? 'rejeição' : 'cancelamento'}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

function StatCard({
  label,
  value,
  sub,
  icon,
  colorClass,
}: {
  label: string
  value: string | number
  sub?: string
  icon: React.ReactNode
  colorClass: string
}) {
  return (
    <div className="rounded-2xl border bg-white shadow-sm p-5 flex items-start gap-4">
      <div className={`rounded-xl border p-2.5 ${colorClass}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500 mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-slate-800 leading-tight truncate">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}
