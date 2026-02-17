'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { UserCheck, ArrowLeft, Plus, Pencil, Search, Eye } from 'lucide-react'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { Toast } from '@/components/Toast'
import { adminFetchJson, getAccessTokenOrThrow } from '@/lib/admin-client'
import { CustomerFormModal, type CustomerFormData } from '@/components/admin/bookstore/CustomerFormModal'

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

export default function LivrariaClientesPage() {
  const [items, setItems] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterActive, setFilterActive] = useState(true)
  const [filterCanCredit, setFilterCanCredit] = useState<'all' | 'yes' | 'no'>('all')
  const [filterWithPending, setFilterWithPending] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [saveLoading, setSaveLoading] = useState(false)
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; message: string } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
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
      setLoading(false)
    }
  }, [search, filterActive, filterCanCredit, filterWithPending])

  useEffect(() => {
    load()
  }, [load])

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
      load()
    } catch (e) {
      setToast({ type: 'err', message: e instanceof Error ? e.message : 'Erro ao salvar.' })
    } finally {
      setSaveLoading(false)
    }
  }

  return (
    <PageAccessGuard pageKey="livraria_clientes">
      <div className="p-4 sm:p-6 md:p-8">
        <div className="mb-6 flex items-center gap-3">
          <Link
            href="/admin/livraria/dashboard"
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
            aria-label="Voltar"
          >
            <ArrowLeft size={20} />
          </Link>
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Clientes</h1>
            <p className="text-slate-500 text-sm">Cadastro e gestão de clientes da livraria</p>
          </div>
          <Button onClick={() => { setEditing(null); setModalOpen(true) }}>
            <Plus size={18} className="mr-1" />
            Criar cliente
          </Button>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="search"
              placeholder="Buscar por nome ou telefone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-slate-800"
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
            className="px-3 py-2 border border-slate-300 rounded-lg text-slate-800 text-sm"
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

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner size="lg" text="Carregando..." />
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
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
                            <span className="text-emerald-600 text-xs font-medium">Sim</span>
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

        {toast && (
          <Toast visible message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        )}
      </div>
    </PageAccessGuard>
  )
}
