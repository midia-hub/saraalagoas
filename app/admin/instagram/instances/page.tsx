'use client'

import { useEffect, useState } from 'react'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { adminFetchJson } from '@/lib/admin-client'

type InstagramInstance = {
  id: string
  name: string
  provider: 'instagram' | 'facebook'
  access_token: string
  ig_user_id: string
  token_expires_at: string | null
  status: 'connected' | 'disconnected'
  created_at: string
  updated_at: string
  read_only?: boolean
  source?: string
}

type FormState = {
  name: string
  provider: 'instagram'
  access_token: string
  ig_user_id: string
  token_expires_at: string
  status: 'connected' | 'disconnected'
}

const emptyForm: FormState = {
  name: '',
  provider: 'instagram',
  access_token: '',
  ig_user_id: '',
  token_expires_at: '',
  status: 'disconnected',
}

export default function AdminInstagramInstancesPage() {
  const [items, setItems] = useState<InstagramInstance[]>([])
  const [form, setForm] = useState<FormState>(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  async function loadInstances() {
    setLoading(true)
    try {
      const data = await adminFetchJson<InstagramInstance[]>('/api/admin/instagram/instances')
      setItems(Array.isArray(data) ? data : [])
    } catch (e) {
      setError('Não foi possível carregar as instâncias. Tente novamente.')
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadInstances()
  }, [])

  function resetForm() {
    setForm(emptyForm)
    setEditingId(null)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const payload = {
        ...form,
        token_expires_at: form.token_expires_at || null,
      }
      if (editingId) {
        await adminFetchJson(`/api/admin/instagram/instances/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        })
      } else {
        await adminFetchJson('/api/admin/instagram/instances', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
      }
      resetForm()
      await loadInstances()
    } catch (e) {
      setError('Não foi possível salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Deseja remover esta instância?')) return
    setError(null)
    try {
      await adminFetchJson(`/api/admin/instagram/instances/${id}`, { method: 'DELETE' })
      if (editingId === id) resetForm()
      await loadInstances()
    } catch (e) {
      setError('Não foi possível remover. Tente novamente.')
    }
  }

  function startEdit(item: InstagramInstance) {
    if (item.read_only) {
      setError('Esta instância é gerenciada pela conexão Meta. Edite em Instâncias (Meta).')
      return
    }
    setEditingId(item.id)
    setForm({
      name: item.name,
      provider: 'instagram',
      access_token: item.access_token,
      ig_user_id: item.ig_user_id,
      token_expires_at: item.token_expires_at ? item.token_expires_at.slice(0, 16) : '',
      status: item.status,
    })
  }

  return (
    <PageAccessGuard pageKey="instagram">
      <div className="p-6 md:p-8">
        <h1 className="text-2xl font-bold text-slate-900">Instagram - Instâncias</h1>
        <p className="text-slate-600 mt-1">Cadastre contas que poderão publicar postagens.</p>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 rounded-xl border border-slate-200 bg-white p-5 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">
            {editingId ? 'Editar instância' : 'Nova instância'}
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-700">Nome</label>
              <input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Provider</label>
              <input
                value="instagram"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 bg-slate-100"
                readOnly
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">IG User ID</label>
              <input
                value={form.ig_user_id}
                onChange={(e) => setForm((prev) => ({ ...prev, ig_user_id: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Expira em (opcional)</label>
              <input
                type="datetime-local"
                value={form.token_expires_at}
                onChange={(e) => setForm((prev) => ({ ...prev, token_expires_at: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-slate-700">Access Token</label>
              <textarea
                value={form.access_token}
                onChange={(e) => setForm((prev) => ({ ...prev, access_token: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                rows={3}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as FormState['status'] }))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              >
                <option value="disconnected">disconnected</option>
                <option value="connected">connected</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-[#c62737] px-4 py-2 text-white disabled:opacity-60"
            >
              {saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Criar instância'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-slate-300 px-4 py-2"
              >
                Cancelar edição
              </button>
            )}
          </div>
        </form>

        <div className="mt-6 rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 p-4">
            <h2 className="font-semibold text-slate-900">Instâncias cadastradas</h2>
          </div>
          {loading ? (
            <p className="p-4 text-slate-600">Carregando...</p>
          ) : items.length === 0 ? (
            <p className="p-4 text-slate-600">Nenhuma instância cadastrada.</p>
          ) : (
            <div className="divide-y divide-slate-200">
              {items.map((item) => (
                <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-medium text-slate-900">{item.name}</p>
                    <p className="text-sm text-slate-600">
                      provider: {item.provider} | ig_user_id: {item.ig_user_id}
                    </p>
                    <p className="text-xs text-slate-500">
                      status: {item.status} | atualizado em: {new Date(item.updated_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  {item.read_only ? (
                    <p className="text-xs text-slate-500">
                      Gerenciada via OAuth Meta (Instâncias Meta)
                    </p>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(item)}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                      >
                        Editar nome/dados
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-700"
                      >
                        Excluir
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageAccessGuard>
  )
}
