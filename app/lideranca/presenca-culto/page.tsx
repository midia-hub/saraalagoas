'use client'

import { useEffect, useMemo, useState } from 'react'
import { adminFetchJson } from '@/lib/admin-client'
import { DatePickerInput } from '@/components/ui/DatePickerInput'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import { CheckCircle2, Church, ClipboardCheck, Loader2, Plus, Trash2, UserCheck, UserPlus, Users } from 'lucide-react'

type ServiceItem = { id: string; name: string; day_of_week: number; time_of_day: string }
type TeamItem = { id: string; name: string }
type LeaderItem = { team_id: string; person_id: string; full_name: string }
type DiscipleItem = { id: string; full_name: string; mobile_phone: string | null }
type ChurchItem = { id: string; name: string }

export default function PresencaCultoExternaPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [churches, setChurches] = useState<ChurchItem[]>([])
  const [churchId, setChurchId] = useState('')
  const [services, setServices] = useState<ServiceItem[]>([])
  const [teams, setTeams] = useState<TeamItem[]>([])
  const [leadersByTeam, setLeadersByTeam] = useState<LeaderItem[]>([])

  const [serviceId, setServiceId] = useState('')
  const [attendedOn, setAttendedOn] = useState(new Date().toISOString().slice(0, 10))
  const [teamId, setTeamId] = useState('')
  const [leaderPersonId, setLeaderPersonId] = useState('')

  const [disciples, setDisciples] = useState<DiscipleItem[]>([])
  const [selectedDiscipleIds, setSelectedDiscipleIds] = useState<string[]>([])

  const [visitorInput, setVisitorInput] = useState('')
  const [visitors, setVisitors] = useState<string[]>([])
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const leaders = useMemo(
    () => leadersByTeam.filter((row) => row.team_id === teamId),
    [leadersByTeam, teamId]
  )

  async function loadContext(nextChurchId?: string) {
    setLoading(true)
    const qs = nextChurchId ? `?church_id=${encodeURIComponent(nextChurchId)}` : ''
    adminFetchJson(`/api/admin/lideranca/presenca-externa/context${qs}`)
      .then((data: any) => {
        const churchList = Array.isArray(data?.churches) ? data.churches : []
        setChurches(churchList)
        setChurchId(data?.selectedChurchId ?? churchList[0]?.id ?? '')
        setServices(Array.isArray(data?.services) ? data.services : [])
        setTeams(Array.isArray(data?.teams) ? data.teams : [])
        setLeadersByTeam(Array.isArray(data?.leadersByTeam) ? data.leadersByTeam : [])
      })
      .catch(() => {
        setChurches([])
        setChurchId('')
        setServices([])
        setTeams([])
        setLeadersByTeam([])
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadContext()
  }, [])

  useEffect(() => {
    setServiceId('')
    setTeamId('')
    setLeaderPersonId('')
    setDisciples([])
    setSelectedDiscipleIds([])
  }, [churchId])

  useEffect(() => {
    setLeaderPersonId('')
    setDisciples([])
    setSelectedDiscipleIds([])
  }, [teamId])

  useEffect(() => {
    if (!teamId || !leaderPersonId) {
      setDisciples([])
      setSelectedDiscipleIds([])
      return
    }

    const params = new URLSearchParams({
      team_id: teamId,
      leader_person_id: leaderPersonId,
      church_id: churchId,
    })
    adminFetchJson(`/api/admin/lideranca/presenca-externa/discipulos?${params.toString()}`)
      .then((data: any) => {
        const list = Array.isArray(data?.disciples) ? data.disciples : []
        setDisciples(list)
        setSelectedDiscipleIds(list.map((d: DiscipleItem) => d.id))
      })
      .catch(() => {
        setDisciples([])
        setSelectedDiscipleIds([])
      })
  }, [teamId, leaderPersonId])

  function toggleDisciple(id: string) {
    setSelectedDiscipleIds((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]))
  }

  function addVisitor() {
    const value = visitorInput.trim()
    if (!value) return
    setVisitors((prev) => [...prev, value])
    setVisitorInput('')
  }

  function removeVisitor(index: number) {
    setVisitors((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSave() {
    setMessage(null)

    if (!serviceId) {
      setMessage({ type: 'err', text: 'Selecione o culto.' })
      return
    }
    if (!attendedOn) {
      setMessage({ type: 'err', text: 'Selecione a data.' })
      return
    }
    if (!teamId) {
      setMessage({ type: 'err', text: 'Selecione a equipe.' })
      return
    }
    if (!leaderPersonId) {
      setMessage({ type: 'err', text: 'Selecione o líder.' })
      return
    }
    if (selectedDiscipleIds.length === 0 && visitors.length === 0) {
      setMessage({ type: 'err', text: 'Marque discípulos ou adicione visitantes.' })
      return
    }

    setSaving(true)
    try {
      const result = await adminFetchJson('/api/admin/lideranca/presenca-externa/registrar', {
        method: 'POST',
        body: JSON.stringify({
          service_id: serviceId,
          attended_on: attendedOn,
            church_id: churchId,
          team_id: teamId,
          leader_person_id: leaderPersonId,
          disciple_ids: selectedDiscipleIds,
          visitors,
        }),
      }) as { disciplesSaved?: number; visitorsSaved?: number }

      setMessage({
        type: 'ok',
        text: `Presença registrada com sucesso. Discípulos: ${result?.disciplesSaved ?? 0} | Visitantes: ${result?.visitorsSaved ?? 0}`,
      })
      setVisitors([])
    } catch (error: any) {
      setMessage({ type: 'err', text: error?.message ?? 'Erro ao registrar presença.' })
    } finally {
      setSaving(false)
    }
  }

  // ── helpers de UI ──────────────────────────────────────────────────────
  const initials = (name: string) =>
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('')

  const totalPresentes = selectedDiscipleIds.length + visitors.length

  const churchOptions = churches.map((c) => ({ value: c.id, label: c.name }))
  const serviceOptions = services.map((s) => ({ value: s.id, label: `${s.name} — ${String(s.time_of_day).slice(0, 5)}` }))
  const teamOptions = teams.map((t) => ({ value: t.id, label: t.name }))
  const leaderOptions = leaders.map((l) => ({ value: l.person_id, label: l.full_name }))

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex flex-col items-center justify-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-[#c62737]/10 flex items-center justify-center">
          <Church className="w-7 h-7 text-[#c62737]" />
        </div>
        <div className="inline-flex items-center gap-2 text-slate-500 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Carregando dados...
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">

      {/* ── Header ────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-[#c62737] to-[#a01f2d] text-white px-4 sm:px-6 pt-10 sm:pt-14 pb-16 sm:pb-20">
        <div className="mx-auto max-w-2xl">
          <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl bg-white/15 flex items-center justify-center mb-4">
            <ClipboardCheck className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold leading-tight">Registro de Presença</h1>
          <p className="text-white/70 text-sm sm:text-base mt-1">Marcação rápida para líderes de equipe.</p>
        </div>
      </div>

      {/* ── Conteúdo (sobrepõe o header com -mt) ─────────────── */}
      <div className="mx-auto max-w-2xl px-4 sm:px-6 -mt-8 pb-28 space-y-4">

        {/* ── Card 1: Contexto ─────────────────────────────────── */}
        <div className="rounded-2xl bg-white shadow-md border border-slate-100">
          <div className="flex items-center gap-2 px-4 sm:px-6 py-3 border-b border-slate-100 bg-slate-50">
            <span className="w-5 h-5 rounded-full bg-[#c62737] text-white text-[10px] font-bold flex items-center justify-center">1</span>
            <h2 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Identificação</h2>
          </div>
          <div className="p-4 sm:p-6 space-y-3">

            {/* Igreja */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Igreja</label>
              <SearchableSelect
                value={churchId}
                onChange={(next) => { setChurchId(next); loadContext(next) }}
                options={churchOptions}
                placeholder="Selecione a igreja..."
              />
            </div>

            {/* Culto + Data — 1 col mobile, 2 cols sm+ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Culto</label>
                <SearchableSelect
                  value={serviceId}
                  onChange={setServiceId}
                  options={serviceOptions}
                  placeholder="Selecionar..."
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Data</label>
                <DatePickerInput
                  value={attendedOn}
                  onChange={setAttendedOn}
                  className="w-full"
                />
              </div>
            </div>

            {/* Equipe + Líder — 1 col mobile, 2 cols sm+ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Equipe</label>
                <SearchableSelect
                  value={teamId}
                  onChange={setTeamId}
                  options={teamOptions}
                  placeholder="Selecionar..."
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Líder</label>
                <SearchableSelect
                  value={leaderPersonId}
                  onChange={setLeaderPersonId}
                  options={leaderOptions}
                  placeholder={teamId ? 'Selecionar...' : 'Escolha a equipe'}
                  disabled={!teamId}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Card 2: Discípulos ───────────────────────────────── */}
        <div className="rounded-2xl bg-white shadow-md border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-slate-100 bg-slate-50">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#c62737] text-white text-[10px] font-bold flex items-center justify-center">2</span>
              <h2 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Discípulos</h2>
            </div>
            {disciples.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                <UserCheck className="w-3 h-3" />
                {selectedDiscipleIds.length}/{disciples.length}
              </span>
            )}
          </div>

          <div className="p-4 sm:p-6">
            {disciples.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-6 text-slate-400">
                <Users className="w-8 h-8 opacity-30" />
                <p className="text-sm">Selecione equipe e líder para ver os discípulos.</p>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-3">
                  <button
                    onClick={() => setSelectedDiscipleIds(disciples.map((d) => d.id))}
                    className="text-xs font-semibold text-[#c62737] hover:underline"
                  >
                    Marcar todos
                  </button>
                  <button
                    onClick={() => setSelectedDiscipleIds([])}
                    className="text-xs font-semibold text-slate-400 hover:underline"
                  >
                    Desmarcar todos
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-96 overflow-y-auto pr-0.5">
                  {disciples.map((d) => {
                    const checked = selectedDiscipleIds.includes(d.id)
                    return (
                      <label
                        key={d.id}
                        className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 cursor-pointer transition-all select-none ${
                          checked
                            ? 'border-emerald-300 bg-emerald-50 shadow-sm'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          checked ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {checked ? <CheckCircle2 className="w-4 h-4" /> : initials(d.full_name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{d.full_name}</p>
                          {d.mobile_phone && (
                            <p className="text-xs text-slate-400 truncate">{d.mobile_phone}</p>
                          )}
                        </div>
                        <input type="checkbox" checked={checked} onChange={() => toggleDisciple(d.id)} className="sr-only" />
                      </label>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Card 3: Visitantes ───────────────────────────────── */}
        <div className="rounded-2xl bg-white shadow-md border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-slate-100 bg-slate-50">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#c62737] text-white text-[10px] font-bold flex items-center justify-center">3</span>
              <h2 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Visitantes</h2>
            </div>
            {visitors.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                <UserPlus className="w-3 h-3" />
                {visitors.length}
              </span>
            )}
          </div>

          <div className="p-4 sm:p-6 space-y-3">
            <div className="flex gap-2">
              <input
                value={visitorInput}
                onChange={(e) => setVisitorInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addVisitor() } }}
                placeholder="Nome do visitante"
                className="flex-1 rounded-xl border-2 border-slate-200 bg-white px-3.5 py-3 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#c62737]/40 focus:ring-2 focus:ring-[#c62737]/10 hover:border-slate-300 transition-colors"
              />
              <button
                onClick={addVisitor}
                className="inline-flex items-center gap-1 rounded-xl bg-slate-800 px-3 py-2.5 text-sm font-semibold text-white hover:bg-black transition-colors shrink-0"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {visitors.length > 0 && (
              <div className="space-y-1.5">
                {visitors.map((v, idx) => (
                  <div
                    key={`${v}-${idx}`}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"
                  >
                    <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                      {initials(v) || '?'}
                    </div>
                    <span className="flex-1 text-sm text-slate-700 truncate">{v}</span>
                    <button onClick={() => removeVisitor(idx)} className="text-slate-300 hover:text-rose-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {visitors.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-2">Nenhum visitante adicionado.</p>
            )}
          </div>
        </div>

        {/* ── Mensagem ─────────────────────────────────────────── */}
        {message && (
          <div className={`rounded-xl border px-4 py-3 text-sm flex items-start gap-2 ${
            message.type === 'ok'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-rose-200 bg-rose-50 text-rose-700'
          }`}>
            {message.type === 'ok'
              ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
              : <span className="shrink-0 mt-0.5">⚠️</span>}
            {message.text}
          </div>
        )}
      </div>

      {/* ── Botão flutuante de salvar ────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-slate-200 px-4 sm:px-6 py-3 sm:py-4 z-10">
        <div className="mx-auto max-w-2xl">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-[#c62737] px-4 py-3.5 text-sm font-bold text-white hover:bg-[#a01f2d] active:scale-[0.98] disabled:opacity-50 transition-all shadow-lg shadow-[#c62737]/20"
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Registrar presença
                {totalPresentes > 0 && (
                  <span className="ml-1 rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold">
                    {totalPresentes} pessoas
                  </span>
                )}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
