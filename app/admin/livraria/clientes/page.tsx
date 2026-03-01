'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Plus, Pencil, Search, Eye, CreditCard, User, DollarSign, FileText, Bookmark } from 'lucide-react'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { Toast } from '@/components/Toast'
import { adminFetchJson, getAccessTokenOrThrow } from '@/lib/admin-client'
import { CustomerFormModal, type CustomerFormData } from '@/components/admin/bookstore/CustomerFormModal'
import { AllocatePaymentModal } from '@/components/admin/bookstore/AllocatePaymentModal'
import type { PaymentFormPayload } from '@/components/admin/bookstore/PaymentForm'

type Customer = {
  id: string
  name: string
  phone: string | null
  email: string | null
  document?: string | null
  notes?: string | null
  can_buy_on_credit: boolean
  credit_limit?: number
  active: boolean
  total_pendente?: number
}

type FiadoItem = {
  customer_id: string
  name: string
  total_pendente: number
  qtd_vendas_pendentes: number
  ultima_compra: string | null
}

type FiadoResponse = {
  items: FiadoItem[]
  total_pendente_geral: number
  total_clientes: number
}

type ReservationItem = {
  id: string
  status: string
  customer_name: string | null
  customer_phone: string | null
  notes: string | null
  created_at: string
  created_by: string | null
  items: Array<{ name: string; quantity: number; unit_price: number; total_price: number }>
  total_amount: number
}

type Tab = 'clientes' | 'fiado' | 'reservas'

function LivrariaClientesInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab') as Tab | null
  const [activeTab, setActiveTab] = useState<Tab>(
    tabParam === 'fiado' ? 'fiado' : tabParam === 'reservas' ? 'reservas' : 'clientes'
  )

  // ── Clientes state ──────────────────────────────────────────────
  const [items, setItems] = useState<Customer[]>([])
  const [loadingClientes, setLoadingClientes] = useState(false)
  const [search, setSearch] = useState('')
  const [filterActive, setFilterActive] = useState(true)
  const [filterCanCredit, setFilterCanCredit] = useState<'all' | 'yes' | 'no'>('all')
  const [filterWithPending, setFilterWithPending] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [saveLoading, setSaveLoading] = useState(false)

  // ── Fiado state ─────────────────────────────────────────────────
  const [fiadoData, setFiadoData] = useState<FiadoResponse | null>(null)
  const [loadingFiado, setLoadingFiado] = useState(false)
  const [fiadoSearch, setFiadoSearch] = useState('')
  const [pendenteMin, setPendenteMin] = useState('')
  const [vencidos, setVencidos] = useState(false)
  const [paymentModal, setPaymentModal] = useState<FiadoItem | null>(null)
  const [paymentLoading, setPaymentLoading] = useState(false)

  // ── Reservas state ──────────────────────────────────────────────
  const [reservas, setReservas] = useState<ReservationItem[]>([])
  const [loadingReservas, setLoadingReservas] = useState(false)
  const [reservationStatus, setReservationStatus] = useState('')
  const [cancelTarget, setCancelTarget] = useState<ReservationItem | null>(null)
  const [cancelLoading, setCancelLoading] = useState(false)

  // ── Shared state ────────────────────────────────────────────────
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; message: string } | null>(null)

  // ── Loaders ─────────────────────────────────────────────────────
  const loadClientes = useCallback(async () => {
    setLoadingClientes(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (!filterActive) params.set('active', 'false')
      if (filterCanCredit === 'yes') params.set('can_credit', 'true')
      if (filterCanCredit === 'no') params.set('can_credit', 'false')
      if (filterWithPending) params.set('with_pending', 'true')
      params.set('include_balance', 'true')
      const data = await adminFetchJson<{ items: Customer[] }>(`/api/admin/livraria/clientes?${params}`)
      setItems(data.items ?? [])
    } catch {
      setToast({ type: 'err', message: 'Erro ao carregar clientes.' })
      setItems([])
    } finally {
      setLoadingClientes(false)
    }
  }, [search, filterActive, filterCanCredit, filterWithPending])

  const loadFiado = useCallback(async () => {
    setLoadingFiado(true)
    try {
      const params = new URLSearchParams()
      if (fiadoSearch) params.set('search', fiadoSearch)
      if (pendenteMin) params.set('pendente_min', pendenteMin)
      if (vencidos) params.set('vencidos', 'true')
      const res = await adminFetchJson<FiadoResponse>(`/api/admin/livraria/fiado?${params}`)
      setFiadoData(res)
    } catch {
      setFiadoData({ items: [], total_pendente_geral: 0, total_clientes: 0 })
    } finally {
      setLoadingFiado(false)
    }
  }, [fiadoSearch, pendenteMin, vencidos])

  const loadReservas = useCallback(async () => {
    setLoadingReservas(true)
    try {
      const params = new URLSearchParams()
      if (reservationStatus) params.set('status', reservationStatus)
      const data = await adminFetchJson<{ items: ReservationItem[] }>(`/api/admin/livraria/vendas/reservas?${params}`)
      setReservas(data.items ?? [])
    } catch {
      setReservas([])
    } finally {
      setLoadingReservas(false)
    }
  }, [reservationStatus])

  useEffect(() => {
    if (activeTab === 'clientes') loadClientes()
  }, [activeTab, loadClientes])

  useEffect(() => {
    if (activeTab === 'fiado') loadFiado()
  }, [activeTab, loadFiado])

  useEffect(() => {
    if (activeTab === 'reservas') loadReservas()
  }, [activeTab, loadReservas])

  // ── Tab switch ──────────────────────────────────────────────────
  function switchTab(tab: Tab) {
    setActiveTab(tab)
    const url = tab !== 'clientes' ? `/admin/livraria/clientes?tab=${tab}` : '/admin/livraria/clientes'
    router.replace(url, { scroll: false })
  }

  // ── Clientes handlers ───────────────────────────────────────────
  async function handleSave(data: CustomerFormData) {
    setSaveLoading(true)
    try {
      const token = await getAccessTokenOrThrow()
      if (editing) {
        const r = await fetch(`/api/admin/livraria/clientes/${editing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(data),
        })
        const res = await r.json()
        if (!r.ok) throw new Error(res.error || 'Erro ao salvar')
        setToast({ type: 'ok', message: 'Cliente atualizado.' })
      } else {
        const r = await fetch('/api/admin/livraria/clientes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(data),
        })
        const res = await r.json()
        if (!r.ok) throw new Error(res.error || 'Erro ao criar')
        setToast({ type: 'ok', message: 'Cliente criado.' })
      }
      setModalOpen(false)
      setEditing(null)
      loadClientes()
    } catch (e) {
      setToast({ type: 'err', message: e instanceof Error ? e.message : 'Erro ao salvar.' })
    } finally {
      setSaveLoading(false)
    }
  }

  // ── Fiado handlers ──────────────────────────────────────────────
  async function handlePaymentSubmit(customerId: string, payload: PaymentFormPayload) {
    setPaymentLoading(true)
    try {
      const token = await getAccessTokenOrThrow()
      const body: { amount: number; payment_method?: string; notes?: string; allocations?: Array<{ sale_id: string; amount: number }> } = {
        amount: payload.amount,
        payment_method: payload.payment_method ?? undefined,
        notes: payload.notes ?? undefined,
      }
      if (payload.allocations && payload.allocations.length > 0) body.allocations = payload.allocations
      const r = await fetch(`/api/admin/livraria/clientes/${customerId}/pagamentos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      const res = await r.json()
      if (!r.ok) throw new Error(res.error || 'Erro ao registrar pagamento')
      setToast({ type: 'ok', message: 'Pagamento registrado com sucesso.' })
      setPaymentModal(null)
      loadFiado()
    } catch (e) {
      setToast({ type: 'err', message: e instanceof Error ? e.message : 'Erro ao registrar.' })
    } finally {
      setPaymentLoading(false)
    }
  }

  // ── Reservas handlers ───────────────────────────────────────────
  async function handleCancelReservation() {
    if (!cancelTarget) return
    setCancelLoading(true)
    try {
      await adminFetchJson(`/api/admin/livraria/vendas/reservas/${cancelTarget.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'cancel' }),
      })
      setToast({ type: 'ok', message: 'Reserva cancelada.' })
      setCancelTarget(null)
      loadReservas()
    } catch (e) {
      setToast({ type: 'err', message: e instanceof Error ? e.message : 'Erro ao cancelar reserva.' })
    } finally {
      setCancelLoading(false)
    }
  }

  const formatDate = (s: string) => new Date(s).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
  const reservationStatusLabels: Record<string, string> = { OPEN: 'Aberta', CANCELLED: 'Cancelada', CONVERTED: 'Convertida' }

  // ── Render ──────────────────────────────────────────────────────
  return (
    <PageAccessGuard pageKey="livraria_clientes">
      <div className="p-4 sm:p-6 md:p-8">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <Link
            href="/admin/livraria/dashboard"
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
            aria-label="Voltar"
          >
            <ArrowLeft size={20} />
          </Link>
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Clientes, Fiado & Reservas</h1>
            <p className="text-slate-500 text-sm">Gestão de clientes, pendências e reservas</p>
          </div>
          {activeTab === 'clientes' && (
            <Button onClick={() => { setEditing(null); setModalOpen(true) }}>
              <Plus size={18} className="mr-1" />
              Criar cliente
            </Button>
          )}
          {activeTab === 'fiado' && (
            <Link
              href="/admin/livraria/fiado/relatorio"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm"
            >
              <FileText size={18} />
              Relatório
            </Link>
          )}
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-1 border-b border-slate-200">
          <button
            type="button"
            onClick={() => switchTab('clientes')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === 'clientes'
                ? 'border-[#c62737] text-[#c62737]'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <User size={16} />
            Clientes
          </button>
          <button
            type="button"
            onClick={() => switchTab('fiado')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === 'fiado'
                ? 'border-[#c62737] text-[#c62737]'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <CreditCard size={16} />
            Fiado
          </button>
          <button
            type="button"
            onClick={() => switchTab('reservas')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === 'reservas'
                ? 'border-[#c62737] text-[#c62737]'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <Bookmark size={16} />
            Reservas
          </button>
        </div>

        {/* ── Tab: Clientes ───────────────────────────────────────── */}
        {activeTab === 'clientes' && (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="search"
                  placeholder="Buscar por nome ou telefone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-slate-800 focus:border-[#c62737] focus:ring-2 focus:ring-[#c62737]/20 outline-none"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={filterActive}
                  onChange={(e) => setFilterActive(e.target.checked)}
                  className="rounded border-slate-300"
                />
                Ativos
              </label>
              <select
                value={filterCanCredit}
                onChange={(e) => setFilterCanCredit(e.target.value as 'all' | 'yes' | 'no')}
                className="px-3 py-2 border border-slate-200 rounded-xl text-slate-800 text-sm focus:border-[#c62737] focus:ring-2 focus:ring-[#c62737]/20 outline-none"
              >
                <option value="all">Todos</option>
                <option value="yes">Pode comprar fiado</option>
                <option value="no">Somente à vista</option>
              </select>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={filterWithPending}
                  onChange={(e) => setFilterWithPending(e.target.checked)}
                  className="rounded border-slate-300"
                />
                Com saldo pendente
              </label>
            </div>

            {loadingClientes ? (
              <div className="flex items-center justify-center py-12">
                <Spinner size="lg" text="Carregando..." />
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="p-3 text-left font-medium text-slate-700">Nome</th>
                        <th className="p-3 text-left font-medium text-slate-700">Telefone</th>
                        <th className="p-3 text-left font-medium text-slate-700">Fiado</th>
                        <th className="p-3 text-right font-medium text-slate-700">Saldo pendente</th>
                        <th className="p-3 w-24 text-right font-medium text-slate-700">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-slate-500">
                            Nenhum cliente encontrado.
                          </td>
                        </tr>
                      ) : (
                        items.map((c) => (
                          <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                            <td className="p-3 font-medium text-slate-800">{c.name}</td>
                            <td className="p-3 text-slate-600">{c.phone ?? '—'}</td>
                            <td className="p-3">
                              {c.can_buy_on_credit ? (
                                <span className="text-[#c62737] text-xs font-medium">Sim</span>
                              ) : (
                                <span className="text-slate-400">Não</span>
                              )}
                            </td>
                            <td className="p-3 text-right">
                              {(c.total_pendente ?? 0) > 0 ? (
                                <span className="text-amber-600 font-medium">R$ {(c.total_pendente ?? 0).toFixed(2)}</span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex justify-end gap-1">
                                <Link
                                  href={`/admin/livraria/clientes/${c.id}`}
                                  className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600"
                                  aria-label="Ver detalhes"
                                >
                                  <Eye size={16} />
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => { setEditing(c); setModalOpen(true) }}
                                  className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600"
                                  aria-label="Editar"
                                >
                                  <Pencil size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <CustomerFormModal
              open={modalOpen}
              initial={editing ? {
                name: editing.name,
                phone: editing.phone ?? '',
                email: editing.email ?? '',
                document: editing.document ?? '',
                notes: editing.notes ?? '',
                can_buy_on_credit: editing.can_buy_on_credit,
                credit_limit: editing.credit_limit ?? 0,
                active: editing.active,
              } : null}
              onSave={handleSave}
              onCancel={() => { setModalOpen(false); setEditing(null) }}
              loading={saveLoading}
            />
          </>
        )}

        {/* ── Tab: Fiado ──────────────────────────────────────────── */}
        {activeTab === 'fiado' && (
          <>
            {fiadoData && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <div className="flex items-center gap-2 text-slate-600 mb-1">
                    <CreditCard size={18} />
                    <span className="text-sm font-medium">Total pendente</span>
                  </div>
                  <p className="text-2xl font-bold text-amber-600">R$ {fiadoData.total_pendente_geral.toFixed(2)}</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <div className="flex items-center gap-2 text-slate-600 mb-1">
                    <User size={18} />
                    <span className="text-sm font-medium">Clientes com pendência</span>
                  </div>
                  <p className="text-2xl font-bold text-slate-800">{fiadoData.total_clientes}</p>
                </div>
              </div>
            )}

            <div className="mb-4 flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="search"
                  placeholder="Buscar cliente..."
                  value={fiadoSearch}
                  onChange={(e) => setFiadoSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-slate-800 focus:border-[#c62737] focus:ring-2 focus:ring-[#c62737]/20 outline-none"
                />
              </div>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="Pendência mín. (R$)"
                value={pendenteMin}
                onChange={(e) => setPendenteMin(e.target.value)}
                className="w-40 px-3 py-2 border border-slate-200 rounded-xl text-slate-800 focus:border-[#c62737] focus:ring-2 focus:ring-[#c62737]/20 outline-none"
              />
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={vencidos}
                  onChange={(e) => setVencidos(e.target.checked)}
                  className="rounded border-slate-300"
                />
                Vencidos
              </label>
            </div>

            {loadingFiado ? (
              <div className="flex items-center justify-center py-12">
                <Spinner size="lg" text="Carregando..." />
              </div>
            ) : fiadoData && fiadoData.items.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
                Nenhum cliente com saldo pendente.
              </div>
            ) : fiadoData ? (
              <div className="rounded-xl border border-slate-200 bg-white">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="p-3 text-left font-medium text-slate-700">Cliente</th>
                        <th className="p-3 text-right font-medium text-slate-700">Saldo pendente</th>
                        <th className="p-3 text-left font-medium text-slate-700">Última compra</th>
                        <th className="p-3 w-48 text-right font-medium text-slate-700">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fiadoData.items.map((row) => (
                        <tr key={row.customer_id} className="border-b border-slate-100 hover:bg-slate-50/50">
                          <td className="p-3 font-medium text-slate-800">{row.name}</td>
                          <td className="p-3 text-right font-medium text-amber-600">R$ {row.total_pendente.toFixed(2)}</td>
                          <td className="p-3 text-slate-600">
                            {row.ultima_compra ? new Date(row.ultima_compra).toLocaleDateString('pt-BR') : '—'}
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex justify-end gap-2">
                              <Link
                                href={`/admin/livraria/clientes/${row.customer_id}`}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-sm"
                              >
                                <User size={14} />
                                Ver
                              </Link>
                              <button
                                type="button"
                                onClick={() => setPaymentModal(row)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#c62737] text-white text-sm hover:bg-[#9e1f2e]"
                              >
                                <DollarSign size={14} />
                                Pagamento
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            {paymentModal && (
              <AllocatePaymentModal
                open={!!paymentModal}
                customerId={paymentModal.customer_id}
                customerName={paymentModal.name}
                onSuccess={() => setPaymentModal(null)}
                onCancel={() => setPaymentModal(null)}
                onSubmit={(payload) => handlePaymentSubmit(paymentModal.customer_id, payload)}
                loading={paymentLoading}
              />
            )}
          </>
        )}

        {/* ── Tab: Reservas ───────────────────────────────────────── */}
        {activeTab === 'reservas' && (
          <>
            <div className="mb-4">
              <select
                value={reservationStatus}
                onChange={(e) => setReservationStatus(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-xl text-slate-800 text-sm focus:border-[#c62737] focus:ring-2 focus:ring-[#c62737]/20 outline-none bg-white"
              >
                <option value="">Todos os status</option>
                <option value="OPEN">Aberta</option>
                <option value="CANCELLED">Cancelada</option>
                <option value="CONVERTED">Convertida</option>
              </select>
            </div>

            {loadingReservas ? (
              <div className="flex justify-center py-12">
                <Spinner size="lg" text="Carregando..." />
              </div>
            ) : (
              <div className="space-y-4">
                {reservas.map((r) => (
                  <div key={r.id} className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="font-medium text-slate-800">{formatDate(r.created_at)}</span>
                        <span className="ml-2 text-sm text-slate-500">
                          {r.customer_name || 'Sem nome'} · {reservationStatusLabels[r.status] ?? r.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800">R$ {r.total_amount.toFixed(2)}</span>
                        {r.status === 'OPEN' && (
                          <Button
                            type="button"
                            variant="danger"
                            size="sm"
                            onClick={() => setCancelTarget(r)}
                          >
                            Cancelar
                          </Button>
                        )}
                      </div>
                    </div>
                    <ul className="mt-2 text-sm text-slate-600 list-disc list-inside">
                      {r.items.map((i, idx) => (
                        <li key={idx}>
                          {i.name} × {i.quantity} — R$ {i.total_price.toFixed(2)}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                {reservas.length === 0 && (
                  <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
                    Nenhuma reserva encontrada.
                  </div>
                )}
              </div>
            )}

            <ConfirmDialog
              open={!!cancelTarget}
              title="Cancelar reserva"
              message="Tem certeza que deseja cancelar esta reserva? Esta ação não pode ser desfeita."
              confirmLabel="Cancelar reserva"
              cancelLabel="Voltar"
              variant="danger"
              loading={cancelLoading}
              onConfirm={handleCancelReservation}
              onCancel={() => setCancelTarget(null)}
            />
          </>
        )}

        {toast && (
          <Toast visible message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        )}
      </div>
    </PageAccessGuard>
  )
}

export default function LivrariaClientesPage() {
  return (
    <Suspense>
      <LivrariaClientesInner />
    </Suspense>
  )
}
