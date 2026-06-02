'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, ShoppingBag, CreditCard, DollarSign, FileText, UserCheck, UserMinus, Send, Loader2, X, Mail } from 'lucide-react'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { Spinner } from '@/components/ui/Spinner'
import { Toast } from '@/components/Toast'
import { adminFetchJson, getAccessTokenOrThrow } from '@/lib/admin-client'
import { CustomerBalanceCards } from '@/components/admin/bookstore/CustomerBalanceCards'
import { PaymentForm, type PaymentFormPayload } from '@/components/admin/bookstore/PaymentForm'

type CustomerDetail = {
  id: string
  name: string
  phone: string | null
  email: string | null
  document: string | null
  notes: string | null
  can_buy_on_credit: boolean
  credit_limit: number
  active: boolean
  balance: {
    total_compras: number
    total_pago: number
    total_pendente: number
    qtd_vendas: number
    qtd_vendas_pendentes: number
  }
}

type SaleRow = {
  id: string
  sale_number: string
  sale_type: string
  total_amount: number
  discount_amount: number
  paid_amount: number
  pending_amount: number
  payment_method: string | null
  created_at: string
}

type PaymentRow = {
  id: string
  amount: number
  payment_method: string | null
  notes: string | null
  created_at: string
}

const TABS = [
  { key: 'compras', label: 'Compras', icon: ShoppingBag },
  { key: 'pagamentos', label: 'Pagamentos', icon: CreditCard },
  { key: 'registrar', label: 'Registrar pagamento', icon: DollarSign },
] as const

type CustomerUserLink = {
  linked: boolean
  user: { id: string; email: string | null; full_name: string | null } | null
  email: string | null
}

type RoleOption = { id: string; name: string; is_active: boolean }

export default function ClienteDetailPage() {
  const params = useParams()
  const id = (params?.id as string) ?? ''
  const [customer, setCustomer] = useState<CustomerDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]['key']>('compras')
  const [sales, setSales] = useState<SaleRow[]>([])
  const [payments, setPayments] = useState<PaymentRow[]>([])
  const [salesLoading, setSalesLoading] = useState(false)
  const [paymentsLoading, setPaymentsLoading] = useState(false)
  const [paymentSubmitLoading, setPaymentSubmitLoading] = useState(false)
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; message: string } | null>(null)
  const [userLink, setUserLink] = useState<CustomerUserLink | null>(null)
  const [userLinkModalOpen, setUserLinkModalOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteProfile, setInviteProfile] = useState('')
  const [roles, setRoles] = useState<RoleOption[]>([])
  const [loadingRoles, setLoadingRoles] = useState(false)
  const [inviteSending, setInviteSending] = useState(false)
  const [inviteMessage, setInviteMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const loadCustomer = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const data = await adminFetchJson<CustomerDetail>(`/api/admin/livraria/clientes/${id}`)
      setCustomer(data)
    } catch {
      setCustomer(null)
      setToast({ type: 'err', message: 'Cliente não encontrado.' })
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadCustomer()
  }, [loadCustomer])

  useEffect(() => {
    if (!id) return
    adminFetchJson<CustomerUserLink>(`/api/admin/livraria/clientes/${id}/user-link`)
      .then(setUserLink)
      .catch(() => setUserLink({ linked: false, user: null, email: null }))
  }, [id])

  useEffect(() => {
    if (!userLinkModalOpen) return
    setLoadingRoles(true)
    adminFetchJson<{ roles?: RoleOption[] }>('/api/admin/roles')
      .then((d) => setRoles((d.roles ?? []).filter((r) => r.is_active !== false)))
      .catch(() => setRoles([]))
      .finally(() => setLoadingRoles(false))
  }, [userLinkModalOpen])

  function openUserLinkModal() {
    setInviteEmail(customer?.email ?? '')
    setInviteProfile('')
    setInviteMessage(null)
    setUserLinkModalOpen(true)
  }

  async function handleUserLinkInvite(e: React.FormEvent) {
    e.preventDefault()
    const email = inviteEmail.trim()
    if (!email) {
      setInviteMessage({ type: 'err', text: 'Informe o e-mail.' })
      return
    }
    setInviteSending(true)
    setInviteMessage(null)
    try {
      const result = await adminFetchJson<{ message?: string }>(`/api/admin/livraria/clientes/${id}/user-link`, {
        method: 'POST',
        body: JSON.stringify({ email, profile: inviteProfile }),
      })
      setInviteMessage({ type: 'ok', text: result?.message || 'Convite enviado com sucesso.' })
      const updated = await adminFetchJson<CustomerUserLink>(`/api/admin/livraria/clientes/${id}/user-link`)
      setUserLink(updated)
      setTimeout(() => {
        setUserLinkModalOpen(false)
        setInviteMessage(null)
      }, 2000)
    } catch (err) {
      setInviteMessage({ type: 'err', text: err instanceof Error ? err.message : 'Erro ao enviar convite.' })
    } finally {
      setInviteSending(false)
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    const hash = window.location.hash
    if (hash === '#registrar') setActiveTab('registrar')
  }, [])

  useEffect(() => {
    if (!id || activeTab !== 'compras') return
    setSalesLoading(true)
    adminFetchJson<{ items: SaleRow[] }>(`/api/admin/livraria/clientes/${id}/compras`)
      .then((d) => setSales(d.items ?? []))
      .catch(() => setSales([]))
      .finally(() => setSalesLoading(false))
  }, [id, activeTab])

  useEffect(() => {
    if (!id || activeTab !== 'pagamentos') return
    setPaymentsLoading(true)
    adminFetchJson<{ items: PaymentRow[] }>(`/api/admin/livraria/clientes/${id}/pagamentos`)
      .then((d) => setPayments(d.items ?? []))
      .catch(() => setPayments([]))
      .finally(() => setPaymentsLoading(false))
  }, [id, activeTab])

  async function handlePaymentSubmit(payload: PaymentFormPayload) {
    setPaymentSubmitLoading(true)
    try {
      const token = await getAccessTokenOrThrow()
      const body: { amount: number; payment_method?: string; notes?: string; allocations?: Array<{ sale_id: string; amount: number }> } = {
        amount: payload.amount,
        payment_method: payload.payment_method ?? undefined,
        notes: payload.notes ?? undefined,
      }
      if (payload.allocations && payload.allocations.length > 0) {
        body.allocations = payload.allocations
      }
      const r = await fetch(`/api/admin/livraria/clientes/${id}/pagamentos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      const res = await r.json()
      if (!r.ok) throw new Error(res.error || 'Erro ao registrar pagamento')
      setToast({ type: 'ok', message: 'Pagamento registrado com sucesso.' })
      setActiveTab('pagamentos')
      loadCustomer()
      setPayments([])
      adminFetchJson<{ items: PaymentRow[] }>(`/api/admin/livraria/clientes/${id}/pagamentos`)
        .then((d) => setPayments(d.items ?? []))
        .catch(() => {})
    } catch (e) {
      setToast({ type: 'err', message: e instanceof Error ? e.message : 'Erro ao registrar.' })
    } finally {
      setPaymentSubmitLoading(false)
    }
  }

  const pendingSales = sales.filter((s) => s.pending_amount > 0)

  if (loading || !id) {
    return (
      <PageAccessGuard pageKey="livraria_clientes">
        <div className="p-4 flex items-center justify-center min-h-[200px]">
          <Spinner size="lg" text="Carregando..." />
        </div>
      </PageAccessGuard>
    )
  }

  if (!customer) {
    return (
      <PageAccessGuard pageKey="livraria_clientes">
        <div className="p-4">
          <p className="text-slate-600">Cliente não encontrado.</p>
          <Link href="/admin/livraria/clientes" className="text-[#c62737] hover:underline mt-2 inline-block">
            Voltar para clientes
          </Link>
        </div>
      </PageAccessGuard>
    )
  }

  return (
    <PageAccessGuard pageKey="livraria_clientes">
      <div className="p-4 sm:p-6 md:p-8">
        <div className="mb-6 flex items-center gap-3">
          <Link
            href="/admin/livraria/clientes"
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
            aria-label="Voltar"
          >
            <ArrowLeft size={20} />
          </Link>
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800">{customer.name}</h1>
            <p className="text-slate-500 text-sm">
              {customer.phone && `${customer.phone}`}
              {customer.phone && customer.email && ' · '}
              {customer.email && customer.email}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {customer.can_buy_on_credit ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
                  Fiado habilitado
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                  Somente à vista
                </span>
              )}
              {userLink !== null && (
                userLink.linked ? (
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                    <UserCheck size={13} />
                    Usuário vinculado
                    {userLink.user?.email && <span className="text-slate-400 font-normal">({userLink.user.email})</span>}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={openUserLinkModal}
                    className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-slate-200 text-amber-700 hover:bg-amber-50 transition-colors"
                  >
                    <UserMinus size={12} />
                    Sem usuário — Vincular
                  </button>
                )
              )}
            </div>
          </div>
        </div>

        <CustomerBalanceCards
          totalCompras={customer.balance.total_compras}
          totalPago={customer.balance.total_pago}
          totalPendente={customer.balance.total_pendente}
          className="mb-6"
        />

        <div className="flex border-b border-slate-200 gap-1 mb-4">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 -mb-px ${
                activeTab === tab.key
                  ? 'border-[#c62737] text-[#c62737] bg-white'
                  : 'border-transparent text-slate-600 hover:text-slate-800'
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'compras' && (
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            {salesLoading ? (
              <div className="p-8 flex justify-center">
                <Spinner />
              </div>
            ) : sales.length === 0 ? (
              <p className="p-8 text-slate-500 text-center">Nenhuma compra encontrada.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="p-3 text-left font-medium">Nº Venda</th>
                      <th className="p-3 text-left font-medium">Data</th>
                      <th className="p-3 text-left font-medium">Tipo</th>
                      <th className="p-3 text-right font-medium">Total</th>
                      <th className="p-3 text-right font-medium">Pago</th>
                      <th className="p-3 text-right font-medium">Pendente</th>
                      <th className="p-3 text-right"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.map((s) => (
                      <tr key={s.id} className="border-b border-slate-100">
                        <td className="p-3 font-medium">{s.sale_number}</td>
                        <td className="p-3 text-slate-600">{new Date(s.created_at).toLocaleDateString('pt-BR')}</td>
                        <td className="p-3">
                          {s.sale_type === 'CREDIT' ? (
                            <span className="text-amber-600 text-xs">Fiado</span>
                          ) : (
                            <span className="text-slate-500 text-xs">À vista</span>
                          )}
                        </td>
                        <td className="p-3 text-right">R$ {(s.total_amount - (s.discount_amount || 0)).toFixed(2)}</td>
                        <td className="p-3 text-right text-emerald-600">R$ {s.paid_amount.toFixed(2)}</td>
                        <td className="p-3 text-right text-amber-600">R$ {s.pending_amount.toFixed(2)}</td>
                        <td className="p-3 text-right">
                          <Link
                            href={`/admin/livraria/vendas/${s.id}/recibo`}
                            className="text-[#c62737] hover:underline text-xs"
                          >
                            Recibo
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'pagamentos' && (
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            {paymentsLoading ? (
              <div className="p-8 flex justify-center">
                <Spinner />
              </div>
            ) : payments.length === 0 ? (
              <p className="p-8 text-slate-500 text-center">Nenhum pagamento registrado.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="p-3 text-left font-medium">Data</th>
                      <th className="p-3 text-right font-medium">Valor</th>
                      <th className="p-3 text-left font-medium">Forma</th>
                      <th className="p-3 text-left font-medium">Observação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id} className="border-b border-slate-100">
                        <td className="p-3 text-slate-600">{new Date(p.created_at).toLocaleString('pt-BR')}</td>
                        <td className="p-3 text-right font-medium text-emerald-600">R$ {p.amount.toFixed(2)}</td>
                        <td className="p-3">{p.payment_method ?? '—'}</td>
                        <td className="p-3 text-slate-500">{p.notes ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'registrar' && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 max-w-md">
            {customer.balance.total_pendente <= 0 ? (
              <p className="text-slate-500">Este cliente não possui saldo pendente.</p>
            ) : (
              <PaymentForm
                pendingAmount={customer.balance.total_pendente}
                pendingSales={pendingSales.map((s) => ({
                  id: s.id,
                  sale_number: s.sale_number,
                  created_at: s.created_at,
                  pending_amount: s.pending_amount,
                }))}
                onSubmit={handlePaymentSubmit}
                loading={paymentSubmitLoading}
              />
            )}
          </div>
        )}

        {toast && (
          <Toast visible message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        )}

        {userLinkModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => !inviteSending && setUserLinkModalOpen(false)}
          >
            <div
              className="bg-white rounded-2xl shadow-lg max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                  <Mail size={20} className="text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-slate-800">Vincular usuário</h3>
                  <p className="text-sm text-slate-500 truncate">{customer.name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setUserLinkModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleUserLinkInvite} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
                  {customer.email ? (
                    <>
                      <div className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-700">
                        {customer.email}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        O convite será enviado para o e-mail do cadastro.
                      </p>
                    </>
                  ) : (
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="email@exemplo.com"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-[#c62737] outline-none"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Perfil de acesso (opcional)</label>
                  {loadingRoles ? (
                    <p className="text-xs text-slate-400">Carregando perfis...</p>
                  ) : (
                    <select
                      value={inviteProfile}
                      onChange={(e) => setInviteProfile(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-[#c62737] outline-none"
                    >
                      <option value="">Sem perfil definido</option>
                      {roles.map((r) => (
                        <option key={r.id} value={r.name}>{r.name}</option>
                      ))}
                    </select>
                  )}
                </div>

                {inviteMessage && (
                  <div
                    className={`p-3 rounded-lg text-sm font-medium ${
                      inviteMessage.type === 'ok' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {inviteMessage.text}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setUserLinkModalOpen(false)}
                    disabled={inviteSending}
                    className="flex-1 px-4 py-2 text-sm text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={inviteSending}
                    className="flex-1 px-4 py-2 text-sm bg-[#c62737] text-white rounded-lg hover:bg-[#a01f2d] disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                  >
                    {inviteSending && <Loader2 size={14} className="animate-spin" />}
                    {inviteSending ? 'Enviando...' : 'Enviar convite'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </PageAccessGuard>
  )
}
