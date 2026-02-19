'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Trophy, Plus, Pencil, Trash2, ArrowLeft, Users, UserMinus } from 'lucide-react'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { TableSkeleton } from '@/components/ui/TableSkeleton'
import { CustomSelect } from '@/components/ui/CustomSelect'
import { adminFetchJson } from '@/lib/admin-client'

type Arena = { 
  id: string; 
  name: string; 
  church_id: string; 
  day_of_week: string; 
  time_of_day: string;
  leaders?: { person_id: string; person: { full_name: string } }[]
}

type LeaderItem = { id: string; label: string }

const DAY_OPTIONS = [
  { value: 'mon', label: 'Segunda' }, { value: 'tue', label: 'Terça' }, { value: 'wed', label: 'Quarta' },
  { value: 'thu', label: 'Quinta' }, { value: 'fri', label: 'Sexta' }, { value: 'sat', label: 'Sábado' }, { value: 'sun', label: 'Domingo' },
]

export default function ArenasPage() {
  const [items, setItems] = useState<Arena[]>([])
  const [churches, setChurches] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Arena | null>(null)
  const [name, setName] = useState('Arena')
  const [churchId, setChurchId] = useState('')
  const [dayOfWeek, setDayOfWeek] = useState('sun')
  const [timeOfDay, setTimeOfDay] = useState('19:00')
  
  const [leaders, setLeaders] = useState<LeaderItem[]>([])
  const [leaderSearch, setLeaderSearch] = useState('')
  const [leaderSearchResults, setLeaderSearchResults] = useState<LeaderItem[]>([])
  const [leaderSearchLoading, setLeaderSearchLoading] = useState(false)

  const [saveLoading, setSaveLoading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Arena | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [data, ch] = await Promise.all([
        adminFetchJson<{ items: Arena[] }>(q ? `/api/admin/consolidacao/arenas?q=${encodeURIComponent(q)}` : '/api/admin/consolidacao/arenas'),
        adminFetchJson<{ items: { id: string; name: string }[] }>('/api/admin/consolidacao/churches'),
      ])
      setItems(data.items ?? [])
      setChurches(ch.items ?? [])
    } catch {
      setItems([])
      setChurches([])
    } finally {
      setLoading(false)
    }
  }, [q])

  useEffect(() => { load() }, [load])

  const openCreate = () => {
    setEditing(null)
    setName('Arena')
    setChurchId(churches[0]?.id ?? '')
    setDayOfWeek('sun')
    setTimeOfDay('19:00')
    setLeaders([])
    setLeaderSearch('')
    setLeaderSearchResults([])
    setModalOpen(true)
  }
  const openEdit = (row: Arena) => {
    setEditing(row)
    setName(row.name)
    setChurchId(row.church_id)
    setDayOfWeek(row.day_of_week)
    setTimeOfDay(String(row.time_of_day).slice(0, 5))
    setLeaders((row.leaders ?? []).map(l => ({ id: l.person_id, label: l.person.full_name })))
    setLeaderSearch('')
    setLeaderSearchResults([])
    setModalOpen(true)
  }

  const searchLeaders = useCallback(async () => {
    const term = leaderSearch.trim()
    if (!term) {
      setLeaderSearchResults([])
      return
    }
    setLeaderSearchLoading(true)
    try {
      const data = await adminFetchJson<{ items: { id: string; label: string }[] }>(`/api/admin/consolidacao/lookups/people?q=${encodeURIComponent(term)}`)
      const list = data.items ?? []
      setLeaderSearchResults(list.filter((p) => !leaders.some((x) => x.id === p.id)))
    } catch {
      setLeaderSearchResults([])
    } finally {
      setLeaderSearchLoading(false)
    }
  }, [leaderSearch, leaders])

  useEffect(() => {
    const t = setTimeout(searchLeaders, 300)
    return () => clearTimeout(t)
  }, [leaderSearch, searchLeaders])

  const addLeader = (p: LeaderItem) => {
    if (leaders.some((x) => x.id === p.id)) return
    setLeaders((prev) => [...prev, p])
    setLeaderSearch('')
    setLeaderSearchResults([])
  }
  const removeLeader = (id: string) => setLeaders((prev) => prev.filter((x) => x.id !== id))

  const handleSave = async () => {
    if (!churchId) return
    setSaveLoading(true)
    try {
      const payload = { 
        name: name.trim() || 'Arena', 
        church_id: churchId, 
        day_of_week: dayOfWeek, 
        time_of_day: timeOfDay,
        leader_person_ids: leaders.map(l => l.id)
      }
      if (editing) {
        await adminFetchJson(`/api/admin/consolidacao/arenas/${editing.id}`, { method: 'PATCH', body: JSON.stringify(payload) })
      } else {
        await adminFetchJson('/api/admin/consolidacao/arenas', { method: 'POST', body: JSON.stringify(payload) })
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
      await adminFetchJson(`/api/admin/consolidacao/arenas/${deleteTarget.id}`, { method: 'DELETE' })
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
              <Trophy className="text-[#c62737]" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Arenas</h1>
              <p className="text-slate-500">Arenas por igreja, dia e horário</p>
            </div>
          </div>
          <Button onClick={openCreate}><Plus size={18} /> Nova arena</Button>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">Buscar</label>
          <input type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nome..." className="w-full max-w-md px-4 py-2 rounded-lg border border-slate-300 focus:border-[#c62737] outline-none" />
        </div>
        {loading ? (
          <TableSkeleton rows={8} columns={4} showHeader />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase">Nome</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase">Líderes</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase">Igreja</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase">Dia / Horário</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-700 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {items.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-800">{row.name}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {row.leaders && row.leaders.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {row.leaders.map(l => (
                            <span key={l.person_id} className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded text-xs">
                              <Users size={12} className="text-slate-400" />
                              {l.person.full_name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Sem líderes</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-600">{churches.find((c) => c.id === row.church_id)?.name ?? row.church_id}</td>
                    <td className="px-6 py-4 text-slate-600">{DAY_OPTIONS.find((d) => d.value === row.day_of_week)?.label ?? row.day_of_week} {String(row.time_of_day).slice(0, 5)}</td>
                    <td className="px-6 py-4 text-right">
                      <button type="button" onClick={() => openEdit(row)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg mr-1"><Pencil size={18} /></button>
                      <button type="button" onClick={() => setDeleteTarget(row)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={18} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {items.length === 0 && <div className="py-12 text-center text-slate-500">Nenhuma arena cadastrada.</div>}
          </div>
        )}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => !saveLoading && setModalOpen(false)}>
            <div className="cadastro-modal bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-lg font-bold text-slate-800 mb-4">{editing ? 'Editar arena' : 'Nova arena'}</h2>
              <div className="space-y-4">
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Nome</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border-2 border-slate-200 px-4 py-2 outline-none focus:border-[#c62737] focus:shadow-[0_0_0_3px_rgba(198,39,55,0.12)]" /></div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Bispos / Pastores (Líderes)</label>
                  <div className="space-y-2">
                    <div className="relative">
                      <input
                        type="text"
                        value={leaderSearch}
                        onChange={(e) => setLeaderSearch(e.target.value)}
                        placeholder="Buscar pessoa..."
                        className="w-full rounded-xl border-2 border-slate-200 px-4 py-2 outline-none focus:border-[#c62737] focus:shadow-[0_0_0_3px_rgba(198,39,55,0.12)]"
                      />
                      {leaderSearchLoading && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">Buscando...</span>
                      )}
                      {leaderSearchResults.length > 0 && (
                        <ul className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-auto py-1">
                          {leaderSearchResults.map((p) => (
                            <li key={p.id}>
                              <button
                                type="button"
                                className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700 text-sm"
                                onMouseDown={(e) => { e.preventDefault(); addLeader(p); }}
                              >
                                {p.label}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    {leaders.length > 0 && (
                      <ul className="flex flex-wrap gap-2 pt-1">
                        {leaders.map((p) => (
                          <li
                            key={p.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#c62737]/10 text-[#c62737] text-sm font-medium"
                          >
                            {p.label}
                            <button
                              type="button"
                              onClick={() => removeLeader(p.id)}
                              className="p-0.5 rounded-full hover:bg-white/50"
                              title="Remover"
                            >
                              <UserMinus size={14} />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                <div><label className="block text-sm font-medium text-slate-700 mb-1">Igreja *</label><CustomSelect value={churchId} onChange={setChurchId} options={churches.map((c) => ({ value: c.id, label: c.name }))} placeholder="Selecione" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Dia</label><CustomSelect value={dayOfWeek} onChange={setDayOfWeek} options={DAY_OPTIONS} placeholder="Selecione o dia" allowEmpty={false} /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Horário</label><input type="time" value={timeOfDay} onChange={(e) => setTimeOfDay(e.target.value)} className="w-full rounded-xl border-2 border-slate-200 px-4 py-2 outline-none focus:border-[#c62737] focus:shadow-[0_0_0_3px_rgba(198,39,55,0.12)]" /></div>
              </div>
              <div className="flex gap-2 justify-end mt-4"><Button variant="secondary" onClick={() => setModalOpen(false)} disabled={saveLoading}>Cancelar</Button><Button onClick={handleSave} loading={saveLoading}>Salvar</Button></div>
            </div>
          </div>
        )}
        <ConfirmDialog open={!!deleteTarget} title="Excluir arena" message={deleteTarget ? `Confirma a exclusão de "${deleteTarget.name}"?` : ''} variant="danger" loading={deleteLoading} onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
      </div>
    </PageAccessGuard>
  )
}
