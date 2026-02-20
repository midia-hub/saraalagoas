'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Building2, Plus, Pencil, Trash2, UserMinus, ArrowLeft } from 'lucide-react'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { TableSkeleton } from '@/components/ui/TableSkeleton'
import { adminFetchJson } from '@/lib/admin-client'

type Church = { id: string; name: string; created_at?: string }
type PastorItem = { id: string; label: string }

export default function IgrejasPage() {
  const [items, setItems] = useState<Church[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Church | null>(null)
  const [name, setName] = useState('')
  const [pastors, setPastors] = useState<PastorItem[]>([])
  const [pastorSearch, setPastorSearch] = useState('')
  const [pastorSearchResults, setPastorSearchResults] = useState<PastorItem[]>([])
  const [pastorSearchLoading, setPastorSearchLoading] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Church | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const url = q ? `/api/admin/consolidacao/churches?q=${encodeURIComponent(q)}` : '/api/admin/consolidacao/churches'
      const data = await adminFetchJson<{ items: Church[] }>(url)
      setItems(data.items ?? [])
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [q])

  useEffect(() => { load() }, [load])

  const openCreate = () => {
    setEditing(null)
    setName('')
    setPastors([])
    setPastorSearch('')
    setPastorSearchResults([])
    setModalOpen(true)
  }
  const openEdit = async (row: Church) => {
    setEditing(row)
    setName(row.name)
    setPastorSearch('')
    setPastorSearchResults([])
    setModalOpen(true)
    try {
      const res = await adminFetchJson<{ item: Church; pastors: { id: string; full_name: string }[] }>(`/api/admin/consolidacao/churches/${row.id}`)
      setPastors((res.pastors ?? []).map((p) => ({ id: p.id, label: p.full_name })))
    } catch {
      setPastors([])
    }
  }
  const searchPastors = useCallback(async () => {
    const term = pastorSearch.trim()
    if (!term) {
      setPastorSearchResults([])
      return
    }
    setPastorSearchLoading(true)
    try {
      const data = await adminFetchJson<{ items: { id: string; label: string }[] }>(`/api/admin/consolidacao/lookups/people?q=${encodeURIComponent(term)}`)
      const list = data.items ?? []
      setPastorSearchResults(list.filter((p) => !pastors.some((x) => x.id === p.id)))
    } catch {
      setPastorSearchResults([])
    } finally {
      setPastorSearchLoading(false)
    }
  }, [pastorSearch, pastors])
  useEffect(() => {
    const t = setTimeout(searchPastors, 300)
    return () => clearTimeout(t)
  }, [pastorSearch, pastors, searchPastors])
  const addPastor = (p: PastorItem) => {
    if (pastors.some((x) => x.id === p.id)) return
    setPastors((prev) => [...prev, p])
    setPastorSearch('')
    setPastorSearchResults([])
  }
  const removePastor = (id: string) => setPastors((prev) => prev.filter((x) => x.id !== id))

  const handleSave = async () => {
    const trimmed = name.trim()
    if (!trimmed) return
    setSaveLoading(true)
    try {
      const pastorIds = pastors.map((p) => p.id)
      if (editing) {
        await adminFetchJson(`/api/admin/consolidacao/churches/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ name: trimmed, pastor_ids: pastorIds }),
        })
      } else {
        await adminFetchJson('/api/admin/consolidacao/churches', {
          method: 'POST',
          body: JSON.stringify({ name: trimmed, pastor_ids: pastorIds }),
        })
      }
      setModalOpen(false)
      load()
    } finally {
      setSaveLoading(false)
    }
  }
  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      await adminFetchJson(`/api/admin/consolidacao/churches/${deleteTarget.id}`, { method: 'DELETE' })
      setDeleteTarget(null)
      load()
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <PageAccessGuard pageKey="consolidacao">
      <div className="p-6 md:p-8">
        <Link href="/admin/consolidacao/cadastros" className="inline-flex items-center gap-2 text-slate-600 hover:text-[#c62737] mb-4 text-sm font-medium">
          <ArrowLeft size={18} /> Voltar aos cadastros
        </Link>
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#c62737]/10 flex items-center justify-center">
              <Building2 className="text-[#c62737]" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Igrejas</h1>
              <p className="text-slate-500">Cadastro de igrejas e vínculo com pastores</p>
            </div>
          </div>
          <Button onClick={openCreate}>
            <Plus size={18} />
            Nova igreja
          </Button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">Buscar</label>
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Nome da igreja..."
            className="w-full max-w-md px-4 py-2 rounded-lg border border-slate-300 focus:border-[#c62737] focus:ring-2 focus:ring-[#c62737]/20 outline-none"
          />
        </div>

        {loading ? (
          <TableSkeleton rows={8} columns={3} showHeader />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase">Nome</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-700 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {items.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-800">{row.name}</td>
                    <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                      <Link href={`/admin/consolidacao/cadastros/igrejas/${row.id}`} className="px-3 py-1.5 text-xs font-medium text-white bg-[#c62737] hover:bg-[#a81f2c] rounded-lg transition" title="Gerenciar cultos">
                        Cultos
                      </Link>
                      <button type="button" onClick={() => openEdit(row)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg" title="Editar">
                        <Pencil size={18} />
                      </button>
                      <button type="button" onClick={() => setDeleteTarget(row)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Excluir">
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {items.length === 0 && (
              <div className="py-12 text-center text-slate-500">Nenhuma igreja cadastrada.</div>
            )}
          </div>
        )}

        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => !saveLoading && setModalOpen(false)}>
            <div className="cadastro-modal bg-white rounded-xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-lg font-bold text-slate-800 mb-4">{editing ? 'Editar igreja' : 'Nova igreja'}</h2>
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">Nome</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-[#c62737] outline-none"
                  placeholder="Nome da igreja"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">Pastores</label>
                <div className="space-y-2">
                  <div className="relative">
                    <input
                      type="text"
                      value={pastorSearch}
                      onChange={(e) => setPastorSearch(e.target.value)}
                      placeholder="Buscar pessoa para adicionar como pastor..."
                      className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-[#c62737] outline-none"
                    />
                    {pastorSearchLoading && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">Buscando...</span>
                    )}
                    {pastorSearchResults.length > 0 && (
                      <ul className="absolute z-10 mt-1 w-full dropdown-options">
                        {pastorSearchResults.map((p) => (
                          <li key={p.id}>
                            <button type="button" onMouseDown={(e) => { e.preventDefault(); addPastor(p); }}>{p.label}</button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  {pastors.length > 0 && (
                    <ul className="flex flex-wrap gap-2 mt-2">
                      {pastors.map((p) => (
                        <li
                          key={p.id}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#c62737]/10 text-slate-800 text-sm"
                        >
                          {p.label}
                          <button
                            type="button"
                            onClick={() => removePastor(p.id)}
                            className="p-0.5 rounded hover:bg-[#c62737]/20 text-slate-600"
                            title="Remover pastor"
                          >
                            <UserMinus size={14} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={saveLoading}>Cancelar</Button>
                <Button onClick={handleSave} loading={saveLoading}>Salvar</Button>
              </div>
            </div>
          </div>
        )}

        <ConfirmDialog
          open={!!deleteTarget}
          title="Excluir igreja"
          message={deleteTarget ? `Confirma a exclusão de "${deleteTarget.name}"?` : ''}
          variant="danger"
          loading={deleteLoading}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      </div>
    </PageAccessGuard>
  )
}
