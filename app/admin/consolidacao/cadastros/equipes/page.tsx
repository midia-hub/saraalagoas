'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { UserCog, Plus, Pencil, Trash2, ArrowLeft, UserMinus } from 'lucide-react'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { TableSkeleton } from '@/components/ui/TableSkeleton'
import { CustomSelect } from '@/components/ui/CustomSelect'
import { adminFetchJson } from '@/lib/admin-client'

type Team = { id: string; name: string; church_id: string; arena_id: string }
type PersonOption = { id: string; label: string }

export default function EquipesPage() {
  const [items, setItems] = useState<Team[]>([])
  const [churches, setChurches] = useState<{ id: string; name: string }[]>([])
  const [arenas, setArenas] = useState<{ id: string; name: string; church_id: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Team | null>(null)
  const [name, setName] = useState('')
  const [churchId, setChurchId] = useState('')
  const [arenaId, setArenaId] = useState('')
  const [leaders, setLeaders] = useState<PersonOption[]>([])
  const [leaderSearch, setLeaderSearch] = useState('')
  const [leaderSearchResults, setLeaderSearchResults] = useState<PersonOption[]>([])
  const [saveLoading, setSaveLoading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Team | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [data, ch, ar] = await Promise.all([
        adminFetchJson<{ items: Team[] }>(q ? `/api/admin/consolidacao/teams?q=${encodeURIComponent(q)}` : '/api/admin/consolidacao/teams'),
        adminFetchJson<{ items: { id: string; name: string }[] }>('/api/admin/consolidacao/churches'),
        adminFetchJson<{ items: { id: string; name: string; church_id: string }[] }>('/api/admin/consolidacao/arenas'),
      ])
      setItems(data.items ?? [])
      setChurches(ch.items ?? [])
      setArenas(ar.items ?? [])
    } catch {
      setItems([])
      setChurches([])
      setArenas([])
    } finally {
      setLoading(false)
    }
  }, [q])

  useEffect(() => { load() }, [load])

  const searchLeader = useCallback(async () => {
    const term = leaderSearch.trim()
    if (!term) {
      setLeaderSearchResults([])
      return
    }
    try {
      const data = await adminFetchJson<{ items: { id: string; label: string }[] }>(`/api/admin/consolidacao/lookups/people?q=${encodeURIComponent(term)}`)
      setLeaderSearchResults(data.items ?? [])
    } catch {
      setLeaderSearchResults([])
    }
  }, [leaderSearch])
  useEffect(() => {
    const t = setTimeout(searchLeader, 300)
    return () => clearTimeout(t)
  }, [leaderSearch, searchLeader])

  const arenasOfChurch = churchId ? arenas.filter((a) => a.church_id === churchId) : []
  const onChurchChange = (newChurchId: string) => {
    setChurchId(newChurchId)
    setArenaId('')
  }

  const addLeader = (p: PersonOption) => {
    if (!leaders.some((x) => x.id === p.id)) setLeaders((prev) => [...prev, p])
    setLeaderSearch('')
    setLeaderSearchResults([])
  }
  const removeLeader = (id: string) => setLeaders((prev) => prev.filter((x) => x.id !== id))

  const openCreate = () => {
    setEditing(null)
    setName('')
    setChurchId(churches[0]?.id ?? '')
    setArenaId('')
    setLeaders([])
    setLeaderSearch('')
    setModalOpen(true)
  }
  const openEdit = async (row: Team) => {
    setEditing(row)
    setName(row.name)
    setChurchId(row.church_id)
    setArenaId(row.arena_id)
    setLeaders([])
    setLeaderSearch('')
    setModalOpen(true)
    try {
      const res = await adminFetchJson<{ item: Team; leaders: { id: string; full_name: string }[] }>(`/api/admin/consolidacao/teams/${row.id}`)
      setLeaders((res.leaders ?? []).map((p) => ({ id: p.id, label: p.full_name })))
    } catch {
      setLeaders([])
    }
  }
  const handleSave = async () => {
    if (!name.trim()) return
    if (!churchId || !arenaId) return
    const payload = { name: name.trim(), church_id: churchId, arena_id: arenaId, leader_person_ids: leaders.map((l) => l.id) }
    setSaveLoading(true)
    try {
      if (editing) {
        await adminFetchJson(`/api/admin/consolidacao/teams/${editing.id}`, { method: 'PATCH', body: JSON.stringify(payload) })
      } else {
        await adminFetchJson('/api/admin/consolidacao/teams', { method: 'POST', body: JSON.stringify(payload) })
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
      await adminFetchJson(`/api/admin/consolidacao/teams/${deleteTarget.id}`, { method: 'DELETE' })
      setDeleteTarget(null)
      load()
    } finally {
      setDeleteLoading(false)
    }
  }

  const getScopeLabel = (row: Team) => {
    const churchName = churches.find((c) => c.id === row.church_id)?.name ?? ''
    const arenaName = arenas.find((a) => a.id === row.arena_id)?.name ?? ''
    return churchName && arenaName ? `${churchName} / ${arenaName}` : row.name
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
              <UserCog className="text-[#c62737]" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Equipes</h1>
              <p className="text-slate-500">Equipes vinculadas à Igreja e à Arena (a arena é da igreja)</p>
            </div>
          </div>
          <Button onClick={openCreate}><Plus size={18} /> Nova equipe</Button>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">Buscar</label>
          <input type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nome da equipe..." className="w-full max-w-md px-4 py-2 rounded-lg border border-slate-300 focus:border-[#c62737] outline-none" />
        </div>
        {loading ? (
          <TableSkeleton rows={8} columns={3} showHeader />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase">Nome</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase">Igreja / Arena</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-700 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {items.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-800">{row.name}</td>
                    <td className="px-6 py-4 text-slate-600">{getScopeLabel(row)}</td>
                    <td className="px-6 py-4 text-right">
                      <button type="button" onClick={() => openEdit(row)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg mr-1"><Pencil size={18} /></button>
                      <button type="button" onClick={() => setDeleteTarget(row)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={18} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {items.length === 0 && <div className="py-12 text-center text-slate-500">Nenhuma equipe cadastrada.</div>}
          </div>
        )}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => !saveLoading && setModalOpen(false)}>
            <div className="cadastro-modal bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-lg font-bold text-slate-800 mb-4">{editing ? 'Editar equipe' : 'Nova equipe'}</h2>
              <div className="space-y-4">
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Nome *</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-slate-300 outline-none" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Igreja *</label><CustomSelect value={churchId} onChange={(v) => onChurchChange(v)} options={churches.map((c) => ({ value: c.id, label: c.name }))} placeholder="Selecione a igreja" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Arena *</label><CustomSelect value={arenaId} onChange={setArenaId} options={arenasOfChurch.map((a) => ({ value: a.id, label: a.name }))} placeholder="Selecione a arena" disabled={!churchId} /></div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Líderes da equipe</label>
                  <input type="text" value={leaderSearch} onChange={(e) => setLeaderSearch(e.target.value)} placeholder="Buscar e adicionar..." className="w-full px-4 py-2 rounded-lg border border-slate-300 outline-none text-sm mb-2" />
                  {leaderSearchResults.length > 0 && (
                    <ul className="mb-2 dropdown-options">
                      {leaderSearchResults.map((p) => (
                        <li key={p.id}><button type="button" onClick={() => addLeader(p)}>{p.label}</button></li>
                      ))}
                    </ul>
                  )}
                  {leaders.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {leaders.map((p) => (
                        <span key={p.id} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-200 text-slate-800 text-sm">
                          {p.label}
                          <button type="button" onClick={() => removeLeader(p.id)} className="p-0.5 text-slate-500 hover:text-red-600" aria-label="Remover"><UserMinus size={14} /></button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2 justify-end mt-4"><Button variant="secondary" onClick={() => setModalOpen(false)} disabled={saveLoading}>Cancelar</Button><Button onClick={handleSave} loading={saveLoading}>Salvar</Button></div>
            </div>
          </div>
        )}
        <ConfirmDialog open={!!deleteTarget} title="Excluir equipe" message={deleteTarget ? `Confirma a exclusão de "${deleteTarget.name}"?` : ''} variant="danger" loading={deleteLoading} onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
      </div>
    </PageAccessGuard>
  )
}
