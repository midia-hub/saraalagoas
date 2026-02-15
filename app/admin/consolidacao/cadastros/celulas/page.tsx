'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { UsersRound, Plus, Pencil, Trash2, UserMinus, ArrowLeft } from 'lucide-react'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { TableSkeleton } from '@/components/ui/TableSkeleton'
import { CustomSelect } from '@/components/ui/CustomSelect'
import { adminFetchJson } from '@/lib/admin-client'

type Cell = { id: string; name: string; church_id?: string | null; arena_id?: string | null; team_id?: string | null; day_of_week: string; time_of_day: string; frequency: string; day_label?: string; frequency_label?: string }
type PersonOption = { id: string; label: string }

const DAY_OPTIONS = [
  { value: 'mon', label: 'Segunda' }, { value: 'tue', label: 'Terça' }, { value: 'wed', label: 'Quarta' },
  { value: 'thu', label: 'Quinta' }, { value: 'fri', label: 'Sexta' }, { value: 'sat', label: 'Sábado' }, { value: 'sun', label: 'Domingo' },
]
const FREQ_OPTIONS = [
  { value: 'weekly', label: 'Semanal' }, { value: 'biweekly', label: 'Quinzenal' }, { value: 'monthly', label: 'Mensal' },
]

export default function CelulasPage() {
  const [items, setItems] = useState<Cell[]>([])
  const [churches, setChurches] = useState<{ id: string; name: string }[]>([])
  const [arenas, setArenas] = useState<{ id: string; name: string; church_id: string }[]>([])
  const [teamsForArena, setTeamsForArena] = useState<{ id: string; name: string; arena_id: string | null }[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Cell | null>(null)
  const [name, setName] = useState('')
  const [churchId, setChurchId] = useState('')
  const [arenaId, setArenaId] = useState('')
  const [teamId, setTeamId] = useState('')
  const [dayOfWeek, setDayOfWeek] = useState('sun')
  const [timeOfDay, setTimeOfDay] = useState('19:00')
  const [frequency, setFrequency] = useState('weekly')
  const [leader, setLeader] = useState<PersonOption | null>(null)
  const [coLeader, setCoLeader] = useState<PersonOption | null>(null)
  const [ltList, setLtList] = useState<PersonOption[]>([])
  const [personSearch, setPersonSearch] = useState('')
  const [personSearchResults, setPersonSearchResults] = useState<PersonOption[]>([])
  const [personSearchLoading, setPersonSearchLoading] = useState(false)
  const [personSearchFor, setPersonSearchFor] = useState<'leader' | 'coleader' | 'lt' | null>(null)
  const [saveLoading, setSaveLoading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Cell | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [data, ch, ar] = await Promise.all([
        adminFetchJson<{ items: Cell[] }>(q ? `/api/admin/consolidacao/cells?q=${encodeURIComponent(q)}` : '/api/admin/consolidacao/cells'),
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

  useEffect(() => {
    if (!modalOpen || !arenaId) {
      setTeamsForArena([])
      return
    }
    adminFetchJson<{ items: { id: string; name: string; arena_id: string | null }[] }>(`/api/admin/consolidacao/lookups/teams?arena_id=${encodeURIComponent(arenaId)}`)
      .then((data) => setTeamsForArena(data.items ?? []))
      .catch(() => setTeamsForArena([]))
  }, [modalOpen, arenaId])

  const onChurchChange = (newChurchId: string) => {
    setChurchId(newChurchId)
    setArenaId('')
    setTeamId('')
  }
  const onArenaChange = (newArenaId: string) => {
    setArenaId(newArenaId)
    setTeamId('')
  }
  const arenasOfChurch = churchId ? arenas.filter((a) => a.church_id === churchId) : []

  const searchPeople = useCallback(async () => {
    const term = personSearch.trim()
    if (!term) {
      setPersonSearchResults([])
      return
    }
    setPersonSearchLoading(true)
    try {
      const data = await adminFetchJson<{ items: { id: string; label: string }[] }>(`/api/admin/consolidacao/lookups/people?q=${encodeURIComponent(term)}`)
      const list = data.items ?? []
      setPersonSearchResults(list)
    } catch {
      setPersonSearchResults([])
    } finally {
      setPersonSearchLoading(false)
    }
  }, [personSearch])
  useEffect(() => {
    const t = setTimeout(searchPeople, 300)
    return () => clearTimeout(t)
  }, [personSearch, searchPeople])

  const openCreate = () => {
    setEditing(null)
    setName('')
    setChurchId('')
    setDayOfWeek('sun')
    setTimeOfDay('19:00')
    setFrequency('weekly')
    setLeader(null)
    setCoLeader(null)
    setLtList([])
    setArenaId('')
    setTeamId('')
    setPersonSearch('')
    setPersonSearchFor(null)
    setModalOpen(true)
  }
  const openEdit = async (row: Cell) => {
    setEditing(row)
    setName(row.name)
    setChurchId(row.church_id ?? '')
    setArenaId(row.arena_id ?? '')
    setTeamId(row.team_id ?? '')
    setDayOfWeek(row.day_of_week)
    setTimeOfDay(String(row.time_of_day ?? '19:00').slice(0, 5))
    setFrequency(row.frequency ?? 'weekly')
    setPersonSearch('')
    setPersonSearchFor(null)
    setModalOpen(true)
    try {
      const res = await adminFetchJson<{
        item: Cell & { leader_person_id?: string; co_leader_person_id?: string }
        leader: { id: string; full_name: string } | null
        co_leader: { id: string; full_name: string } | null
        lt: { id: string; full_name: string }[]
      }>(`/api/admin/consolidacao/cells/${row.id}`)
      setLeader(res.leader ? { id: res.leader.id, label: res.leader.full_name } : null)
      setCoLeader(res.co_leader ? { id: res.co_leader.id, label: res.co_leader.full_name } : null)
      setLtList((res.lt ?? []).map((p) => ({ id: p.id, label: p.full_name })))
    } catch {
      setLeader(null)
      setCoLeader(null)
      setLtList([])
    }
  }
  const applyPersonSelect = (p: PersonOption) => {
    if (personSearchFor === 'leader') {
      setLeader(p)
      setPersonSearchFor(null)
      setPersonSearch('')
    } else if (personSearchFor === 'coleader') {
      setCoLeader(p)
      setPersonSearchFor(null)
      setPersonSearch('')
    } else if (personSearchFor === 'lt') {
      if (!ltList.some((x) => x.id === p.id)) setLtList((prev) => [...prev, p])
      setPersonSearch('')
    }
    setPersonSearchResults([])
  }
  const removeLt = (id: string) => setLtList((prev) => prev.filter((x) => x.id !== id))

  const handleSave = async () => {
    if (!name.trim()) return
    setSaveLoading(true)
    try {
      const payload = {
        name: name.trim(),
        church_id: churchId || null,
        arena_id: arenaId || null,
        team_id: teamId || null,
        day_of_week: dayOfWeek,
        time_of_day: timeOfDay,
        frequency,
        leader_person_id: leader?.id || null,
        co_leader_person_id: coLeader?.id || null,
        lt_person_ids: ltList.map((x) => x.id),
      }
      if (editing) {
        await adminFetchJson(`/api/admin/consolidacao/cells/${editing.id}`, { method: 'PATCH', body: JSON.stringify(payload) })
      } else {
        await adminFetchJson('/api/admin/consolidacao/cells', { method: 'POST', body: JSON.stringify(payload) })
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
      await adminFetchJson(`/api/admin/consolidacao/cells/${deleteTarget.id}`, { method: 'DELETE' })
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
              <UsersRound className="text-[#c62737]" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Células</h1>
              <p className="text-slate-500">Células, dia, horário, frequência e líderes</p>
            </div>
          </div>
          <Button onClick={openCreate}><Plus size={18} /> Nova célula</Button>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">Buscar</label>
          <input type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nome da célula..." className="w-full max-w-md px-4 py-2 rounded-lg border border-slate-300 focus:border-[#c62737] outline-none" />
        </div>
        {loading ? (
          <TableSkeleton rows={8} columns={4} showHeader />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase">Nome</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase">Dia / Frequência</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase">Horário</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-700 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {items.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-800">{row.name}</td>
                    <td className="px-6 py-4 text-slate-600">{(row as Cell & { day_label?: string }).day_label ?? row.day_of_week} / {(row as Cell & { frequency_label?: string }).frequency_label ?? row.frequency}</td>
                    <td className="px-6 py-4 text-slate-600">{String(row.time_of_day).slice(0, 5)}</td>
                    <td className="px-6 py-4 text-right">
                      <button type="button" onClick={() => openEdit(row)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg mr-1"><Pencil size={18} /></button>
                      <button type="button" onClick={() => setDeleteTarget(row)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={18} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {items.length === 0 && <div className="py-12 text-center text-slate-500">Nenhuma célula cadastrada.</div>}
          </div>
        )}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => !saveLoading && setModalOpen(false)}>
            <div className="cadastro-modal bg-white rounded-xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-lg font-bold text-slate-800 mb-4">{editing ? 'Editar célula' : 'Nova célula'}</h2>
              <div className="space-y-4">
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Nome *</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-slate-300 outline-none" /></div>
                <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50 space-y-3">
                  <span className="block text-sm font-medium text-slate-700">Líder, Co-líder e LT</span>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Líder</label>
                    {leader ? (
                      <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white border border-slate-200">
                        <span className="text-slate-800">{leader.label}</span>
                        <button type="button" onClick={() => setLeader(null)} className="p-1 text-slate-500 hover:text-red-600" title="Remover"><UserMinus size={16} /></button>
                      </div>
                    ) : (
                      <>
                        <input type="text" value={personSearchFor === 'leader' ? personSearch : ''} onChange={(e) => { setPersonSearchFor('leader'); setPersonSearch(e.target.value); }} placeholder="Buscar pessoa..." className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm outline-none" />
                        {personSearchFor === 'leader' && personSearchResults.length > 0 && (
                          <ul className="mt-1 dropdown-options">
                            {personSearchResults.map((p) => (
                              <li key={p.id}><button type="button" onClick={() => applyPersonSelect(p)}>{p.label}</button></li>
                            ))}
                          </ul>
                        )}
                      </>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Co-líder</label>
                    {coLeader ? (
                      <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white border border-slate-200">
                        <span className="text-slate-800">{coLeader.label}</span>
                        <button type="button" onClick={() => setCoLeader(null)} className="p-1 text-slate-500 hover:text-red-600" title="Remover"><UserMinus size={16} /></button>
                      </div>
                    ) : (
                      <>
                        <input type="text" value={personSearchFor === 'coleader' ? personSearch : ''} onChange={(e) => { setPersonSearchFor('coleader'); setPersonSearch(e.target.value); }} placeholder="Buscar pessoa..." className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm outline-none" />
                        {personSearchFor === 'coleader' && personSearchResults.length > 0 && (
                          <ul className="mt-1 dropdown-options">
                            {personSearchResults.map((p) => (
                              <li key={p.id}><button type="button" onClick={() => applyPersonSelect(p)}>{p.label}</button></li>
                            ))}
                          </ul>
                        )}
                      </>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">LT (Líder em Treinamento)</label>
                    <input type="text" value={personSearchFor === 'lt' ? personSearch : ''} onChange={(e) => { setPersonSearchFor('lt'); setPersonSearch(e.target.value); }} placeholder="Buscar e adicionar..." className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm outline-none mb-2" />
                    {personSearchFor === 'lt' && personSearchResults.length > 0 && (
                      <ul className="mb-2 dropdown-options">
                        {personSearchResults.map((p) => (
                          <li key={p.id}><button type="button" onClick={() => applyPersonSelect(p)}>{p.label}</button></li>
                        ))}
                      </ul>
                    )}
                    {ltList.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {ltList.map((p) => (
                          <span key={p.id} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-200 text-slate-800 text-sm">
                            {p.label}
                            <button type="button" onClick={() => removeLt(p.id)} className="p-0.5 text-slate-500 hover:text-red-600" aria-label="Remover"><UserMinus size={14} /></button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Igreja</label><CustomSelect value={churchId} onChange={(v) => onChurchChange(v)} options={churches.map((c) => ({ value: c.id, label: c.name }))} placeholder="—" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Arena (da igreja)</label><CustomSelect value={arenaId} onChange={(v) => onArenaChange(v)} options={arenasOfChurch.map((a) => ({ value: a.id, label: a.name }))} placeholder="— Não vinculada" disabled={!churchId} /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Equipe (da arena)</label><CustomSelect value={teamId} onChange={setTeamId} options={teamsForArena.map((t) => ({ value: t.id, label: t.name }))} placeholder="— Nenhuma" disabled={!arenaId} /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Dia da semana</label><CustomSelect value={dayOfWeek} onChange={setDayOfWeek} options={DAY_OPTIONS} placeholder="Selecione o dia" allowEmpty={false} /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Horário</label><input type="time" value={timeOfDay} onChange={(e) => setTimeOfDay(e.target.value)} className="w-full rounded-xl border-2 border-slate-200 px-4 py-2 outline-none transition-all focus:border-[#c62737] focus:shadow-[0_0_0_3px_rgba(198,39,55,0.12)]" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Frequência</label><CustomSelect value={frequency} onChange={setFrequency} options={FREQ_OPTIONS} placeholder="Selecione" allowEmpty={false} /></div>
              </div>
              <div className="flex gap-2 justify-end mt-4"><Button variant="secondary" onClick={() => setModalOpen(false)} disabled={saveLoading}>Cancelar</Button><Button onClick={handleSave} loading={saveLoading}>Salvar</Button></div>
            </div>
          </div>
        )}
        <ConfirmDialog open={!!deleteTarget} title="Excluir célula" message={deleteTarget ? `Confirma a exclusão de "${deleteTarget.name}"?` : ''} variant="danger" loading={deleteLoading} onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
      </div>
    </PageAccessGuard>
  )
}
