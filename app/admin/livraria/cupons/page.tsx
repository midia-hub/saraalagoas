'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Ticket, ArrowLeft, Plus, Pencil, Trash2, Search } from 'lucide-react'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { Toast } from '@/components/Toast'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { adminFetchJson, getAccessTokenOrThrow } from '@/lib/admin-client'

type Coupon = {
  id: string
  code: string
  description: string | null
  discount_type: 'value' | 'percent'
  discount_value: number
  min_purchase: number
  valid_from: string | null
  valid_until: string | null
  usage_limit: number | null
  used_count: number
  active: boolean
  created_at: string
}

export default function LivrariaCuponsPage() {
  const [items, setItems] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Coupon | null>(null)
  const [saveLoading, setSaveLoading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Coupon | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; message: string } | null>(null)
  const [form, setForm] = useState({
    code: '',
    description: '',
    discount_type: 'value' as 'value' | 'percent',
    discount_value: '',
    min_purchase: '',
    valid_from: '',
    valid_until: '',
    usage_limit: '',
    active: true,
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      params.set('active', 'false')
      const data = await adminFetchJson<{ items: Coupon[] }>(`/api/admin/livraria/cupons?${params}`)
      setItems(data.items ?? [])
    } catch {
      setItems([])
      setToast({ type: 'err', message: 'Erro ao carregar cupons.' })
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    load()
  }, [load])

  function openCreate() {
    setEditing(null)
    setForm({
      code: '',
      description: '',
      discount_type: 'value',
      discount_value: '',
      min_purchase: '',
      valid_from: '',
      valid_until: '',
      usage_limit: '',
      active: true,
    })
    setModalOpen(true)
  }

  function openEdit(c: Coupon) {
    setEditing(c)
    setForm({
      code: c.code,
      description: c.description ?? '',
      discount_type: c.discount_type,
      discount_value: String(c.discount_value),
      min_purchase: String(c.min_purchase ?? 0),
      valid_from: c.valid_from ? c.valid_from.slice(0, 16) : '',
      valid_until: c.valid_until ? c.valid_until.slice(0, 16) : '',
      usage_limit: c.usage_limit != null ? String(c.usage_limit) : '',
      active: c.active,
    })
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form.code.trim()) {
      setToast({ type: 'err', message: 'Código é obrigatório.' })
      return
    }
    const discountValue = parseFloat(form.discount_value) || 0
    if (form.discount_type === 'percent' && discountValue > 100) {
      setToast({ type: 'err', message: 'Porcentagem não pode ser maior que 100.' })
      return
    }
    setSaveLoading(true)
    try {
      const token = await getAccessTokenOrThrow()
      const body = {
        code: form.code.trim(),
        description: form.description.trim() || null,
        discount_type: form.discount_type,
        discount_value: discountValue,
        min_purchase: parseFloat(form.min_purchase) || 0,
        valid_from: form.valid_from ? new Date(form.valid_from).toISOString() : null,
        valid_until: form.valid_until ? new Date(form.valid_until).toISOString() : null,
        usage_limit: form.usage_limit ? Math.floor(parseFloat(form.usage_limit)) : null,
        active: form.active,
      }
      if (editing) {
        const r = await fetch(`/api/admin/livraria/cupons/${editing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(body),
        })
        const res = await r.json()
        if (!r.ok) throw new Error(res.error || 'Erro ao salvar')
        setToast({ type: 'ok', message: 'Cupom atualizado.' })
      } else {
        const r = await fetch('/api/admin/livraria/cupons', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(body),
        })
        const res = await r.json()
        if (!r.ok) throw new Error(res.error || 'Erro ao criar')
        setToast({ type: 'ok', message: 'Cupom criado.' })
      }
      setModalOpen(false)
      load()
    } catch (e) {
      setToast({ type: 'err', message: e instanceof Error ? e.message : 'Erro ao salvar.' })
    } finally {
      setSaveLoading(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      const token = await getAccessTokenOrThrow()
      const r = await fetch(`/api/admin/livraria/cupons/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!r.ok) {
        const res = await r.json()
        throw new Error(res.error || 'Erro ao excluir')
      }
      setToast({ type: 'ok', message: 'Cupom excluído.' })
      setDeleteTarget(null)
      load()
    } catch (e) {
      setToast({ type: 'err', message: e instanceof Error ? e.message : 'Erro ao excluir.' })
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <PageAccessGuard pageKey="livraria_cupons">
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
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Cupons</h1>
            <p className="text-slate-500 text-sm">Cupons de desconto (valor ou porcentagem)</p>
          </div>
          <Button onClick={openCreate}>
            <Plus size={18} className="mr-1" />
            Novo cupom
          </Button>
        </div>

        <div className="mb-4">
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="search"
              placeholder="Buscar por código ou descrição..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-slate-800"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" text="Carregando..." />
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="p-3 text-left font-medium text-slate-700">Código</th>
                    <th className="p-3 text-left font-medium text-slate-700">Desconto</th>
                    <th className="p-3 text-right font-medium text-slate-700">Compra mín.</th>
                    <th className="p-3 text-left font-medium text-slate-700">Validade</th>
                    <th className="p-3 text-center font-medium text-slate-700">Uso</th>
                    <th className="p-3 text-center font-medium text-slate-700">Ativo</th>
                    <th className="p-3 w-24 text-right font-medium text-slate-700">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">
                        Nenhum cupom encontrado.
                      </td>
                    </tr>
                  ) : (
                    items.map((c) => (
                      <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="p-3 font-mono font-medium">{c.code}</td>
                        <td className="p-3">
                          {c.discount_type === 'percent' ? `${c.discount_value}%` : `R$ ${Number(c.discount_value).toFixed(2)}`}
                        </td>
                        <td className="p-3 text-right">{c.min_purchase > 0 ? `R$ ${Number(c.min_purchase).toFixed(2)}` : '—'}</td>
                        <td className="p-3 text-slate-600">
                          {c.valid_from || c.valid_until
                            ? `${c.valid_from ? new Date(c.valid_from).toLocaleDateString('pt-BR') : '—'} até ${c.valid_until ? new Date(c.valid_until).toLocaleDateString('pt-BR') : '—'}`
                            : 'Sem restrição'}
                        </td>
                        <td className="p-3 text-center">
                          {c.used_count}{c.usage_limit != null ? ` / ${c.usage_limit}` : ''}
                        </td>
                        <td className="p-3 text-center">
                          {c.active ? <span className="text-emerald-600">Sim</span> : <span className="text-slate-400">Não</span>}
                        </td>
                        <td className="p-3 text-right">
                          <button type="button" onClick={() => openEdit(c)} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 mr-1" aria-label="Editar">
                            <Pencil size={16} />
                          </button>
                          <button type="button" onClick={() => setDeleteTarget(c)} className="p-2 rounded-lg border border-slate-200 hover:bg-red-50 text-slate-600" aria-label="Excluir">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {modalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-black/50" onClick={() => !saveLoading && setModalOpen(false)} aria-hidden />
            <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl max-h-[90vh] overflow-auto">
              <h2 className="text-lg font-semibold text-slate-800 mb-4">{editing ? 'Editar cupom' : 'Novo cupom'}</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Código *</label>
                  <input
                    type="text"
                    value={form.code}
                    onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                    placeholder="EXEMPLO10"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
                  <input
                    type="text"
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de desconto</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" checked={form.discount_type === 'value'} onChange={() => setForm((f) => ({ ...f, discount_type: 'value' }))} className="rounded border-slate-300" />
                      <span>Valor (R$)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" checked={form.discount_type === 'percent'} onChange={() => setForm((f) => ({ ...f, discount_type: 'percent' }))} className="rounded border-slate-300" />
                      <span>Porcentagem (%)</span>
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{form.discount_type === 'percent' ? 'Porcentagem (%) *' : 'Valor (R$) *'}</label>
                  <input
                    type="number"
                    step={form.discount_type === 'percent' ? '1' : '0.01'}
                    min="0"
                    max={form.discount_type === 'percent' ? 100 : undefined}
                    value={form.discount_value}
                    onChange={(e) => setForm((f) => ({ ...f, discount_value: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Compra mínima (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.min_purchase}
                    onChange={(e) => setForm((f) => ({ ...f, min_purchase: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Válido de</label>
                    <input type="datetime-local" value={form.valid_from} onChange={(e) => setForm((f) => ({ ...f, valid_from: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Válido até</label>
                    <input type="datetime-local" value={form.valid_until} onChange={(e) => setForm((f) => ({ ...f, valid_until: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Limite de uso (deixe vazio para ilimitado)</label>
                  <input type="number" min="1" value={form.usage_limit} onChange={(e) => setForm((f) => ({ ...f, usage_limit: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800" />
                </div>
                {editing && (
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} className="rounded border-slate-300" />
                    <span className="text-sm text-slate-700">Cupom ativo</span>
                  </label>
                )}
              </div>
              <div className="flex gap-2 justify-end mt-6">
                <Button type="button" variant="secondary" onClick={() => setModalOpen(false)} disabled={saveLoading}>Cancelar</Button>
                <Button onClick={handleSave} loading={saveLoading} disabled={!form.code.trim()}>Salvar</Button>
              </div>
            </div>
          </div>
        )}

        <ConfirmDialog
          open={!!deleteTarget}
          title="Excluir cupom"
          message={deleteTarget ? `Excluir o cupom "${deleteTarget.code}"? Esta ação não pode ser desfeita.` : ''}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleteLoading}
          confirmLabel="Excluir"
          variant="danger"
        />

        {toast && <Toast visible message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    </PageAccessGuard>
  )
}
