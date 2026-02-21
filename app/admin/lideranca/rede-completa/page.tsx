'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { adminFetchJson } from '@/lib/admin-client'
import { DiscipuladoSummary } from '@/components/admin/lideranca/DiscipuladoSummary'
import { DiscipuladoFilters, type FilterParams } from '@/components/admin/lideranca/DiscipuladoFilters'
import { DiscipuladoTable, type AttendanceItem } from '@/components/admin/lideranca/DiscipuladoTable'
import { CustomSelect } from '@/components/ui/CustomSelect'
import { DatePickerInput } from '@/components/ui/DatePickerInput'
import { MergePeopleModal } from '@/components/admin/lideranca/MergePeopleModal'
import { AdminPageHeader } from '@/app/admin/AdminPageHeader'
import { RefreshCw, Network, Info, CheckCircle2, ExternalLink } from 'lucide-react'
import { getTodayBrasilia } from '@/lib/date-utils'
import type { Person } from '@/lib/types/person'
import Link from 'next/link'

type ServiceItem = { id: string; name: string; day_of_week?: number | string | null }

function parseYmd(ymd: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null
  const [year, month, day] = ymd.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return Number.isNaN(date.getTime()) ? null : date
}

function sameYearMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function removeAccents(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function normalizeServiceDay(day: number | string | null | undefined): number | null {
  if (typeof day === 'number' && day >= 0 && day <= 6) return day
  if (typeof day !== 'string') return null

  const value = removeAccents(day.trim().toLowerCase())
  if (!value) return null
  if (/^[0-6]$/.test(value)) return Number(value)

  const map: Record<string, number> = {
    domingo: 0,
    dom: 0,
    segunda: 1,
    'segunda-feira': 1,
    seg: 1,
    terca: 2,
    'terça': 2,
    'terça-feira': 2,
    ter: 2,
    quarta: 3,
    'quarta-feira': 3,
    qua: 3,
    quinta: 4,
    'quinta-feira': 4,
    qui: 4,
    sexta: 5,
    'sexta-feira': 5,
    sex: 5,
    sabado: 6,
    'sábado': 6,
    sab: 6,
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
    sun: 0,
    mon: 1,
    tue: 2,
    wed: 3,
    thu: 4,
    fri: 5,
    sat: 6,
  }

  return map[value] ?? null
}

function weekdayLabel(day: number | null): string {
  if (day === null) return 'não definido'
  return ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][day] ?? 'não definido'
}

export default function RedeCompletaPage() {
  const today = new Date()
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]
  const todayStr = today.toISOString().split('T')[0]

  const [items, setItems] = useState<AttendanceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [services, setServices] = useState<ServiceItem[]>([])
  const [attendanceDate, setAttendanceDate] = useState(todayStr)
  const [savingAttendance, setSavingAttendance] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [mergePeople, setMergePeople] = useState<{ left: Person; right: Person } | null>(null)
  const [mergeLoading, setMergeLoading] = useState(false)
  const [mergeError, setMergeError] = useState('')
  const [mergeSaving, setMergeSaving] = useState(false)
  const [filters, setFilters] = useState<FilterParams>({
    start: firstDayOfMonth,
    end: todayStr,
    service_id: 'all'
  })

  const load = useCallback(async (params = filters) => {
    setLoading(true)
    try {
      const query = new URLSearchParams(params).toString()
      const data = await adminFetchJson(`/api/admin/lideranca/rede-completa?${query}`) as { items: AttendanceItem[]; debug?: any }
      console.log('🔍 DEBUG - Dados da API (Rede Completa):', data)
      setItems(data.items || [])
    } catch (err) {
      console.error('Erro ao carregar rede completa:', err)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    adminFetchJson('/api/admin/lideranca/cultos')
      .then((data) => { if (Array.isArray(data)) setServices(data as ServiceItem[]) })
      .catch(() => setServices([]))
  }, [])

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => items.some((item) => item.disciple_id === id)))
  }, [items])

  const summary = useMemo(() => {
    if (items.length === 0) return { total: 0, avg: 0, active: 0 }
    const total = items.length
    const sumPercent = items.reduce((acc, curr) => acc + curr.percent, 0)
    const active = items.filter(i => i.percent >= 75).length
    return { total, avg: sumPercent / total, active }
  }, [items])

  const toggleSelect = (discipleId: string) => {
    setSelectedIds((prev) => prev.includes(discipleId)
      ? prev.filter((id) => id !== discipleId)
      : [...prev, discipleId]
    )
  }

  const toggleSelectAll = () => {
    if (items.length === 0) return
    const allIds = items.map((item) => item.disciple_id)
    const allSelected = allIds.every((id) => selectedIds.includes(id))
    setSelectedIds(allSelected ? [] : allIds)
  }

  const saveAttendances = async () => {
    setSaveMessage(null)
    if (filters.service_id === 'all') {
      setSaveMessage({ type: 'err', text: 'Selecione um culto específico no filtro para registrar presença.' })
      return
    }
    if (!attendanceDate) {
      setSaveMessage({ type: 'err', text: 'Selecione a data da presença.' })
      return
    }

    const selectedDate = parseYmd(attendanceDate)
    if (!selectedDate) {
      setSaveMessage({ type: 'err', text: 'Data inválida.' })
      return
    }

    const todayValidation = parseYmd(getTodayBrasilia())
    if (!todayValidation) {
      setSaveMessage({ type: 'err', text: 'Não foi possível validar a data atual.' })
      return
    }

    const previousMonth = new Date(todayValidation.getFullYear(), todayValidation.getMonth() - 1, 1)
    const isCurrentMonth = sameYearMonth(selectedDate, todayValidation)
    const isPreviousMonthAllowed = todayValidation.getDate() <= 10 && sameYearMonth(selectedDate, previousMonth)

    if (selectedDate > todayValidation || (!isCurrentMonth && !isPreviousMonthAllowed)) {
      setSaveMessage({ type: 'err', text: 'Data fora da janela permitida. Só é permitido o mês atual ou, até o dia 10, o mês anterior.' })
      return
    }

    const selectedService = services.find((service) => service.id === filters.service_id)
    const selectedServiceDay = normalizeServiceDay(selectedService?.day_of_week)
    if (selectedServiceDay !== null && selectedDate.getDay() !== selectedServiceDay) {
      setSaveMessage({ type: 'err', text: 'A data escolhida não corresponde ao dia da semana do culto selecionado.' })
      return
    }

    if (selectedIds.length === 0) {
      setSaveMessage({ type: 'err', text: 'Selecione ao menos um discípulo para registrar presença.' })
      return
    }

    setSavingAttendance(true)
    try {
      const response = await adminFetchJson<{ saved: number }>(
        '/api/admin/lideranca/rede-completa/presencas',
        {
          method: 'POST',
          body: JSON.stringify({
            service_id: filters.service_id,
            attended_on: attendanceDate,
            disciple_ids: selectedIds,
          }),
        }
      )
      setSaveMessage({ type: 'ok', text: `${response.saved ?? selectedIds.length} presença(s) registrada(s) com sucesso.` })
      setSelectedIds([])
      await load()
    } catch (err) {
      setSaveMessage({ type: 'err', text: err instanceof Error ? err.message : 'Erro ao salvar presenças.' })
    } finally {
      setSavingAttendance(false)
    }
  }

  const openMergeModal = async () => {
    if (selectedIds.length !== 2) return
    setMergeLoading(true)
    setMergeError('')
    try {
      const [aId, bId] = selectedIds
      const [a, b] = await Promise.all([
        adminFetchJson<{ person: Person }>(`/api/admin/people/${aId}`),
        adminFetchJson<{ person: Person }>(`/api/admin/people/${bId}`),
      ])
      const p1 = a.person
      const p2 = b.person
      const left = p1.updated_at >= p2.updated_at ? p1 : p2
      const right = left.id === p1.id ? p2 : p1
      setMergePeople({ left, right })
    } catch (err) {
      setMergeError(err instanceof Error ? err.message : 'Erro ao carregar pessoas para mescla.')
    } finally {
      setMergeLoading(false)
    }
  }

  const handleConfirmMerge = async (choices: Record<string, 'left' | 'right'>) => {
    if (!mergePeople) return
    setMergeSaving(true)
    setMergeError('')
    try {
      await adminFetchJson('/api/admin/people/merge', {
        method: 'POST',
        body: JSON.stringify({
          target_id: mergePeople.left.id,
          source_id: mergePeople.right.id,
          field_choices: choices,
        }),
      })
      setMergePeople(null)
      setSelectedIds([])
      await load()
    } catch (err) {
      setMergeError(err instanceof Error ? err.message : 'Erro ao mesclar cadastros.')
    } finally {
      setMergeSaving(false)
    }
  }

  const selectedService = services.find((service) => service.id === filters.service_id)
  const selectedServiceDay = normalizeServiceDay(selectedService?.day_of_week)
  const todayDate = parseYmd(getTodayBrasilia())
  const previousMonth = useMemo(() => (
    todayDate ? new Date(todayDate.getFullYear(), todayDate.getMonth() - 1, 1) : null
  ), [todayDate])

  const isDateDisabled = (date: Date) => {
    if (!todayDate) return true
    const normalizedDate = startOfDay(date)
    const normalizedToday = startOfDay(todayDate)
    if (normalizedDate > normalizedToday) return true

    const isCurrentMonth = sameYearMonth(normalizedDate, normalizedToday)
    const isPreviousMonthAllowed = !!previousMonth && normalizedToday.getDate() <= 10 && sameYearMonth(normalizedDate, previousMonth)
    if (!isCurrentMonth && !isPreviousMonthAllowed) return true

    if (selectedServiceDay !== null && date.getDay() !== selectedServiceDay) return true
    return false
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      <AdminPageHeader
        icon={Network}
        title="Rede Completa de Discipulado"
        subtitle="Frequência de toda a sua rede de liderança: 12, 144, 1728... todos os níveis"
        backLink={{ href: '/admin/lideranca', label: 'Liderança' }}
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/lideranca/presenca-culto"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:text-[#c62737] hover:border-[#c62737]/30 hover:bg-[#c62737]/5 transition-all"
            >
              <ExternalLink className="w-4 h-4" />
              Registro externo
            </Link>
            <button
              onClick={() => load()}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:text-[#c62737] hover:border-[#c62737]/30 hover:bg-[#c62737]/5 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Atualizando...' : 'Atualizar'}
            </button>
          </div>
        }
      />

      <DiscipuladoSummary
        totalDisciples={summary.total}
        avgAttendance={summary.avg}
        activeDisciples={summary.active}
        loading={loading}
      />

      <DiscipuladoFilters
        onFilter={(p) => { setFilters(p); load(p) }}
        loading={loading}
      />

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm font-semibold text-slate-800">Preenchimento de presença</p>
            <p className="text-xs text-slate-500">Selecione os discípulos na tabela e registre presença para o culto escolhido.</p>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-600 font-medium">
            <span>Selecionados: <span className="text-slate-800">{selectedIds.length}</span></span>
            <button
              type="button"
              onClick={openMergeModal}
              disabled={selectedIds.length !== 2 || mergeLoading}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:border-[#c62737]/40 hover:text-[#c62737] transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {mergeLoading ? 'Carregando...' : 'Mesclar selecionados'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Culto</label>
            <CustomSelect
              value={filters.service_id}
              onChange={(value) => {
                const newParams = { ...filters, service_id: value || 'all' }
                setFilters(newParams)
                load(newParams)
              }}
              placeholder="Selecione no filtro acima"
              allowEmpty={false}
              options={[
                { value: 'all', label: 'Selecione no filtro acima' },
                ...services.map((s) => ({ value: s.id, label: s.name })),
              ]}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Data</label>
            <DatePickerInput
              value={attendanceDate}
              onChange={(value) => setAttendanceDate(value)}
              placeholder="dd/mm/aaaa"
              className="w-full"
              maxDate={today ?? undefined}
              isDateDisabled={isDateDisabled}
            />
            <p className="mt-1 text-[11px] text-slate-500">
              Permitido: mês atual {today && today.getDate() <= 10 ? 'ou mês anterior (até dia 10)' : ''}
              {selectedServiceDay !== null ? ` • dia do culto: ${weekdayLabel(selectedServiceDay)}` : ''}
            </p>
          </div>
          <div className="flex items-end">
            <button
              onClick={saveAttendances}
              disabled={savingAttendance || selectedIds.length === 0}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-[#c62737]/30 bg-[#c62737] text-white text-sm font-medium hover:bg-[#b42332] transition-all disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              {savingAttendance ? 'Salvando...' : 'Salvar presenças'}
            </button>
          </div>
        </div>

        {saveMessage && (
          <div className={`rounded-lg px-3 py-2 text-sm ${saveMessage.type === 'ok' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
            {saveMessage.text}
          </div>
        )}
      </div>

      <DiscipuladoTable
        items={items}
        loading={loading}
        selectedIds={selectedIds}
        onToggleSelect={toggleSelect}
        onToggleSelectAll={toggleSelectAll}
      />

      <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
        <Info className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
        <p className="text-[13px] text-slate-500 leading-relaxed">
          Esta visão inclui <strong className="text-slate-700">TODOS</strong> os discípulos em sua rede de liderança (diretos e indiretos).
          Frequência abaixo de <strong className="text-slate-700">50%</strong> pode indicar necessidade de acompanhamento personalizado.
        </p>
      </div>

      {mergePeople && (
        <MergePeopleModal
          left={mergePeople.left}
          right={mergePeople.right}
          onClose={() => setMergePeople(null)}
          onConfirm={handleConfirmMerge}
          submitting={mergeSaving}
          error={mergeError}
        />
      )}
    </div>
  )
}
