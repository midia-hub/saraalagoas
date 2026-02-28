'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Search, Plus, X, ChevronRight, Users, CheckCircle2 } from 'lucide-react'
import { adminFetchJson } from '@/lib/admin-client'
import { CustomSelect } from '@/components/ui/CustomSelect'
import { DatePickerInput } from '@/components/ui/DatePickerInput'
import PeoplePickerModal, { type PersonOption } from '../PeoplePickerModal'

// ── Types ──────────────────────────────────────────────────────────────────────
interface EscalaLink {
  id:       string
  token:    string
  ministry: string
  month:    number
  year:     number
  label:    string | null
  status:   'active' | 'closed'
  church:   { id: string; name: string } | null
}

interface FuncaoRow {
  funcao:      string
  person_id:   string | null
  person_name: string | null
}

interface EscalaPanelProps {
  stepId:      string
  demandId:    string
  metadata:    Record<string, unknown>
  stageStatus: string
  onPatchMeta: (meta: Record<string, unknown>) => Promise<void>
  onComplete?: () => Promise<void>
  saving:      boolean
}

// ── Constants ─────────────────────────────────────────────────────────────────
const MONTHS_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

const TIPO_OPTS = [
  { value: 'culto',  label: '⛪ Culto' },
  { value: 'arena',  label: '🎯 Arena' },
  { value: 'evento', label: '🎉 Evento Especial' },
]

type Phase = 'search' | 'form' | 'done'

// ── Component ─────────────────────────────────────────────────────────────────
export default function EscalaPanel({
  metadata,
  stageStatus,
  onPatchMeta,
  onComplete,
  saving,
}: EscalaPanelProps) {
  const savedEscalaId = metadata.escala_id as string | undefined
  const savedSlotId   = metadata.slot_id   as string | undefined

  const [phase, setPhase] = useState<Phase>(() => {
    if (savedEscalaId && savedSlotId) return 'done'
    if (savedEscalaId)                return 'form'
    return 'search'
  })

  // ── Auto-concluir se já estiver done mas status do step ainda não for ───────
  useEffect(() => {
    if (savedEscalaId && savedSlotId && stageStatus !== 'concluida') {
      onComplete?.()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Dados remotos ───────────────────────────────────────────────────────────
  const [escalas,        setEscalas]        = useState<EscalaLink[]>([])
  const [loadingEscalas, setLoadingEscalas] = useState(true)
  const [people,         setPeople]         = useState<PersonOption[]>([])

  // ── Seleção de escala ───────────────────────────────────────────────────────
  const [selected,   setSelected]   = useState<EscalaLink | null>(null)
  const [filterText, setFilterText] = useState('')

  // ── Formulário do evento ────────────────────────────────────────────────────
  const [eventLabel, setEventLabel] = useState('')
  const [eventDate,  setEventDate]  = useState('')
  const [eventTime,  setEventTime]  = useState('19:00')
  const [eventType,  setEventType]  = useState('evento')

  // ── Funções / atribuições ───────────────────────────────────────────────────
  const [funcoes,     setFuncoes]     = useState<FuncaoRow[]>([])
  const [funcaoInput, setFuncaoInput] = useState('')
  const [pickerIdx,   setPickerIdx]   = useState<number | null>(null)

  // ── Salvar ─────────────────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false)
  const [error,      setError]      = useState('')

  // ── Carregar escalas na montagem ─────────────────────────────────────────────
  useEffect(() => {
    adminFetchJson<{ items: EscalaLink[] }>('/api/admin/escalas')
      .then((d) => setEscalas(d.items ?? []))
      .catch(() => {})
      .finally(() => setLoadingEscalas(false))

    if (savedEscalaId) {
      adminFetchJson<{ link: EscalaLink }>(`/api/admin/escalas/${savedEscalaId}`)
        .then((d) => { if (d.link) setSelected(d.link) })
        .catch(() => {})
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Carregar pessoas do ministério quando selecionar a escala ───────────────
  useEffect(() => {
    if (!selected?.id) {
      // Se não tem escala selecionada, carrega geral ou limpa
      adminFetchJson<{ people?: PersonOption[]; data?: PersonOption[] }>('/api/admin/consolidacao/people?limit=200')
        .then((d) => setPeople(d.people ?? d.data ?? []))
        .catch(() => {})
      return
    }

    // Carrega voluntários específicos da escala (que já filtra por ministério/igreja)
    adminFetchJson<{ volunteers: any[] }>(`/api/admin/escalas/${selected.id}/voluntarios`)
      .then((d) => {
        const mapped = (d.volunteers ?? []).map((v: any) => ({
          id: v.id,
          full_name: v.full_name,
        }))
        setPeople(mapped)
      })
      .catch(() => {
        // Fallback para geral em caso de erro
        adminFetchJson<{ people?: PersonOption[]; data?: PersonOption[] }>('/api/admin/consolidacao/people?limit=100')
          .then((d) => setPeople(d.people ?? d.data ?? []))
          .catch(() => {})
      })
  }, [selected?.id])

  // ── Helpers ────────────────────────────────────────────────────────────────
  const filteredEscalas = filterText
    ? escalas.filter((e) =>
        e.ministry.toLowerCase().includes(filterText.toLowerCase()) ||
        String(e.year).includes(filterText) ||
        MONTHS_SHORT[e.month - 1]?.toLowerCase().includes(filterText.toLowerCase()),
      )
    : escalas

  const selectEscala = async (e: EscalaLink) => {
    setSelected(e)
    setPhase('form')
    await onPatchMeta({ ...metadata, escala_id: e.id, ministry: e.ministry })
  }

  const addFuncao = () => {
    const val = funcaoInput.trim()
    if (!val) return
    if (funcoes.some((f) => f.funcao.toLowerCase() === val.toLowerCase())) return
    setFuncoes((prev) => [...prev, { funcao: val, person_id: null, person_name: null }])
    setFuncaoInput('')
  }

  const removeFuncao = (idx: number) => setFuncoes((prev) => prev.filter((_, i) => i !== idx))

  const assignPerson = (idx: number, ids: string[]) => {
    const person = ids.length > 0 ? people.find((p) => p.id === ids[0]) : null
    setFuncoes((prev) =>
      prev.map((f, i) =>
        i === idx
          ? { ...f, person_id: person?.id ?? null, person_name: person?.full_name ?? null }
          : f,
      ),
    )
    setPickerIdx(null)
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  const submit = async () => {
    if (!selected)           { setError('Selecione uma escala.'); return }
    if (!eventLabel.trim())  { setError('Informe o nome do evento.'); return }
    if (!eventDate)          { setError('Selecione a data do evento.'); return }
    if (funcoes.length === 0){ setError('Adicione ao menos uma função.'); return }

    setSubmitting(true)
    setError('')

    try {
      // 1 — Cria o slot na escala
      const slotData = await adminFetchJson<{ slot: { id: string } }>(
        `/api/admin/escalas/${selected.id}/slots`,
        {
          method: 'POST',
          body: JSON.stringify({
            label:       eventLabel.trim(),
            date:        eventDate,
            time_of_day: eventTime || '19:00',
            type:        eventType,
            funcoes:     funcoes.map((f) => f.funcao),
          }),
        },
      )
      const slotId = slotData.slot?.id

      // 2 — Busca publicada existente (pode não existir ainda)
      const pubData = await adminFetchJson<{
        publicada: { status: string; dados: unknown[] } | null
      }>(`/api/admin/escalas/${selected.id}/publicada`)

      const existingDados  = Array.isArray(pubData.publicada?.dados) ? pubData.publicada!.dados : []
      const existingStatus = pubData.publicada?.status ?? 'rascunho'

      // 3 — Monta o novo SlotResult no mesmo formato de escalas_publicadas.dados
      const newSlotResult = {
        slot_id:     slotId,
        type:        eventType,
        label:       eventLabel.trim(),
        date:        eventDate,
        time_of_day: eventTime || '19:00',
        sort_order:  9999,
        assignments: funcoes
          .filter((f) => f.person_id)
          .map((f) => ({ funcao: f.funcao, person_id: f.person_id, person_name: f.person_name })),
        faltando: funcoes.filter((f) => !f.person_id).map((f) => f.funcao),
      }

      // 4 — Upsert da publicada com o novo slot incluído
      await adminFetchJson(`/api/admin/escalas/${selected.id}/publicada`, {
        method: 'POST',
        body: JSON.stringify({
          status:  existingStatus,
          dados:   [...existingDados, newSlotResult],
          alertas: [],
        }),
      })

      // 5 — Persiste referências no metadata da etapa da demanda
      await onPatchMeta({
        ...metadata,
        escala_id:   selected.id,
        slot_id:     slotId,
        ministry:    selected.ministry,
        event_label: eventLabel.trim(),
        event_date:  eventDate,
        event_time:  eventTime || '19:00',
        event_type:  eventType,
      })
      // 6 — Conclui o estágio automaticamente
      await onComplete?.()
      setPhase('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Fase: done ─────────────────────────────────────────────────────────────
  if (phase === 'done' && savedEscalaId) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-4 rounded-xl border border-emerald-200 bg-emerald-50">
          <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald-800">Evento incluído na escala</p>
            {selected && (
              <p className="text-xs text-emerald-600">
                {selected.ministry} — {MONTHS_SHORT[selected.month - 1]} {selected.year}
              </p>
            )}
          </div>
        </div>

        <Link
          href={`/admin/escalas/${savedEscalaId}`}
          target="_blank"
          className="block w-full text-center py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm font-medium text-[#c62737] transition-colors"
        >
          Abrir escala →
        </Link>

        <button
          type="button"
          onClick={() => {
            onPatchMeta({ ...metadata, escala_id: undefined, slot_id: undefined })
            setSelected(null)
            setFuncoes([])
            setEventLabel('')
            setEventDate('')
            setPhase('search')
          }}
          disabled={saving}
          className="block w-full text-center py-2 text-xs text-slate-400 hover:text-red-500 transition-colors"
        >
          Desvincular
        </button>
      </div>
    )
  }

  // ── Fase: search ───────────────────────────────────────────────────────────
  if (phase === 'search') {
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-500">
          Selecione a escala do ministério para registrar este evento.
        </p>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Filtrar por ministério, mês ou ano..."
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 hover:border-slate-300 focus:border-[#c62737] focus:ring-1 focus:ring-[#c62737] outline-none transition-colors"
          />
        </div>

        {loadingEscalas ? (
          <p className="text-sm text-slate-400 text-center py-6">Carregando escalas...</p>
        ) : filteredEscalas.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">Nenhuma escala encontrada.</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {filteredEscalas.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => selectEscala(e)}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-[#c62737] hover:bg-red-50 text-left transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 text-xs font-bold shrink-0">
                  {MONTHS_SHORT[e.month - 1]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800">{e.ministry}</p>
                  <p className="text-xs text-slate-400">
                    {MONTHS_SHORT[e.month - 1]} {e.year}{e.label ? ` — ${e.label}` : ''}
                  </p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${e.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                  {e.status === 'active' ? 'Ativa' : 'Fechada'}
                </span>
                <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── Fase: form ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Escala selecionada */}
      {selected && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200">
          <span className="text-sm font-medium text-slate-700">📅 {selected.ministry}</span>
          <span className="text-xs text-slate-400">{MONTHS_SHORT[selected.month - 1]} {selected.year}</span>
          <button
            type="button"
            onClick={() => setPhase('search')}
            className="ml-auto text-xs text-slate-400 hover:text-[#c62737] transition-colors"
          >
            Trocar
          </button>
        </div>
      )}

      {/* Detalhes do evento */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Evento</h4>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Nome do evento</label>
          <input
            value={eventLabel}
            onChange={(e) => setEventLabel(e.target.value)}
            placeholder="Ex: Culto de Evangelismo, Arena Jovem..."
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 hover:border-slate-300 focus:border-[#c62737] focus:ring-1 focus:ring-[#c62737] outline-none transition-colors"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Data</label>
            <DatePickerInput value={eventDate} onChange={setEventDate} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Horário</label>
            <input
              type="time"
              value={eventTime}
              onChange={(e) => setEventTime(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 hover:border-slate-300 focus:border-[#c62737] focus:ring-1 focus:ring-[#c62737] outline-none transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Tipo</label>
          <CustomSelect
            value={eventType}
            onChange={setEventType}
            options={TIPO_OPTS}
            allowEmpty={false}
          />
        </div>
      </div>

      {/* Funções e pessoas */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Funções e pessoas</h4>

        <div className="flex gap-2">
          <input
            value={funcaoInput}
            onChange={(e) => setFuncaoInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addFuncao() } }}
            placeholder="Ex: Câmera, Transmissão, Slides..."
            className="flex-1 px-3 py-2 text-sm rounded-xl border border-slate-200 hover:border-slate-300 focus:border-[#c62737] focus:ring-1 focus:ring-[#c62737] outline-none transition-colors"
          />
          <button
            type="button"
            onClick={addFuncao}
            disabled={!funcaoInput.trim()}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors disabled:opacity-40"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {funcoes.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-3">
            Adicione as funções necessárias para este evento
          </p>
        ) : (
          <div className="space-y-2">
            {funcoes.map((f, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-slate-200"
              >
                <span className="text-sm font-medium text-slate-700 flex-1 truncate">{f.funcao}</span>

                {f.person_id ? (
                  <button
                    type="button"
                    onClick={() => setPickerIdx(idx)}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 hover:bg-emerald-100 transition-colors shrink-0"
                  >
                    <span className="w-5 h-5 rounded-full bg-emerald-200 flex items-center justify-center text-[10px] font-bold">
                      {(f.person_name ?? '').slice(0, 2).toUpperCase()}
                    </span>
                    <span className="max-w-[80px] truncate">{(f.person_name ?? '').split(' ')[0]}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setPickerIdx(idx)}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-dashed border-slate-300 text-xs text-slate-500 hover:border-[#c62737] hover:text-[#c62737] transition-colors shrink-0"
                  >
                    <Users className="w-3.5 h-3.5" />
                    Atribuir
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => removeFuncao(idx)}
                  className="p-1 text-slate-300 hover:text-red-500 transition-colors shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={submitting || saving || !eventLabel.trim() || !eventDate || funcoes.length === 0}
        className="w-full py-2.5 rounded-xl bg-[#c62737] hover:bg-red-700 text-white text-sm font-semibold transition-colors disabled:opacity-60"
      >
        {submitting ? 'Salvando...' : '✓ Incluir na escala'}
      </button>

      {/* Modal de seleção de pessoa por função */}
      {pickerIdx !== null && (
        <PeoplePickerModal
          people={people}
          selectedIds={funcoes[pickerIdx]?.person_id ? [funcoes[pickerIdx].person_id!] : []}
          onConfirm={(ids) => assignPerson(pickerIdx, ids)}
          onClose={() => setPickerIdx(null)}
          singleSelect
          title={`Atribuir — ${funcoes[pickerIdx]?.funcao}`}
        />
      )}
    </div>
  )
}
