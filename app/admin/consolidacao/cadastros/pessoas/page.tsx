'use client'

import { useState, useEffect, useCallback } from 'react'
import { UserCircle, Plus, Pencil, Trash2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { TableSkeleton } from '@/components/ui/TableSkeleton'
import { adminFetchJson } from '@/lib/admin-client'

type Person = { id: string; full_name: string; email?: string | null; mobile_phone?: string | null }

export default function CadastrosPessoasPage() {
  const [items, setItems] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Person | null>(null)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [mobilePhone, setMobilePhone] = useState('')
  const [saveLoading, setSaveLoading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Person | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const url = q ? `/api/admin/consolidacao/people?q=${encodeURIComponent(q)}` : '/api/admin/consolidacao/people'
      const data = await adminFetchJson<{ items: Person[] }>(url)
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
    setFullName('')
    setEmail('')
    setMobilePhone('')
    setModalOpen(true)
  }
  const openEdit = (row: Person) => {
    setEditing(row)
    setFullName(row.full_name)
    setEmail(row.email ?? '')
    setMobilePhone(row.mobile_phone ?? '')
    setModalOpen(true)
  }
  const handleSave = async () => {
    const trimmed = fullName.trim()
    if (!trimmed) return
    setSaveLoading(true)
    try {
      if (editing) {
        await adminFetchJson(`/api/admin/consolidacao/people/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ full_name: trimmed, email: email.trim() || null, mobile_phone: mobilePhone.trim() || null }),
        })
      } else {
        await adminFetchJson('/api/admin/consolidacao/people', {
          method: 'POST',
          body: JSON.stringify({ full_name: trimmed, email: email.trim() || null, mobile_phone: mobilePhone.trim() || null }),
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
      await adminFetchJson(`/api/admin/consolidacao/people/${deleteTarget.id}`, { method: 'DELETE' })
      setDeleteTarget(null)
      load()
    } catch {
      // pode falhar se tiver vínculos
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
              <UserCircle className="text-[#c62737]" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Pessoas</h1>
              <p className="text-slate-500">Líderes, pastores e consolidadores (cadastro rápido)</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/pessoas">
              <Button variant="secondary">Cadastro completo (Pessoas)</Button>
            </Link>
            <Button onClick={openCreate}>
              <Plus size={18} />
              Nova pessoa
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">Buscar</label>
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Nome..."
            className="w-full max-w-md px-4 py-2 rounded-lg border border-slate-300 focus:border-[#c62737] focus:ring-2 focus:ring-[#c62737]/20 outline-none"
          />
        </div>

        {loading ? (
          <TableSkeleton rows={8} columns={4} showHeader />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase">Nome</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase">E-mail</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase">Telefone</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-700 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {items.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-800">{row.full_name}</td>
                    <td className="px-6 py-4 text-slate-600">{row.email ?? '—'}</td>
                    <td className="px-6 py-4 text-slate-600">{row.mobile_phone ?? '—'}</td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/admin/pessoas/${row.id}`} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg mr-1 inline-block" title="Cadastro completo">Ver</Link>
                      <button type="button" onClick={() => openEdit(row)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg mr-1" title="Editar">
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
            {items.length === 0 && <div className="py-12 text-center text-slate-500">Nenhuma pessoa encontrada.</div>}
          </div>
        )}

        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => !saveLoading && setModalOpen(false)}>
            <div className="cadastro-modal bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-lg font-bold text-slate-800 mb-4">{editing ? 'Editar pessoa' : 'Nova pessoa'}</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nome *</label>
                  <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-[#c62737] outline-none" placeholder="Nome completo" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-[#c62737] outline-none" placeholder="email@exemplo.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Telefone</label>
                  <input type="tel" value={mobilePhone} onChange={(e) => setMobilePhone(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-[#c62737] outline-none" placeholder="(00) 00000-0000" />
                </div>
              </div>
              <div className="flex gap-2 justify-end mt-4">
                <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={saveLoading}>Cancelar</Button>
                <Button onClick={handleSave} loading={saveLoading}>Salvar</Button>
              </div>
            </div>
          </div>
        )}

        <ConfirmDialog open={!!deleteTarget} title="Excluir pessoa" message={deleteTarget ? `Confirma a exclusão de "${deleteTarget.full_name}"? Pessoas vinculadas a células/arenas/igrejas não podem ser excluídas.` : ''} variant="danger" loading={deleteLoading} onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
      </div>
    </PageAccessGuard>
  )
}
