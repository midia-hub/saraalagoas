'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  List,
  ListChecks,
  Loader2,
  Plus,
  Send,
  Trash2,
  X,
} from 'lucide-react'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { AdminPageHeader } from '@/app/admin/AdminPageHeader'
import { adminFetchJson } from '@/lib/admin-client'
import { CustomSelect } from '@/components/ui/CustomSelect'
import { DatePickerInput } from '@/components/ui/DatePickerInput'
import { Toast } from '@/components/Toast'

// ─── Types ────────────────────────────────────────────────────────────────────
type Church = { id: string; name: string }
type WorshipService = { id: string; name: string; day_of_week?: number | null; time_of_day?: string | null }
type Arena = { id: string; name: string; day_of_week?: string | null; time_of_day?: string | null }

type DaySchedule = { id: string; date: string; startTime: string; endTime: string }

type RegisteredEvent = {
  id: string
  churchId: string
  churchName: string
  name: string
  description: string
  multiDay: boolean
  schedules: DaySchedule[]
  sendToMedia: boolean
}

type AgendaItem = {
  id: string
  churchId: string
  churchName: string
  linkType: 'culto' | 'arena' | 'evento'
  linkId: string
  linkLabel: string
  sendToMedia: boolean
  notes: string
}

type AgendaCalendarEntry = {
  id: string
  date: string
  startTime: string
  endTime: string
  title: string
  churchName: string
  source: 'evento' | 'agenda'
  linkType: 'culto' | 'arena' | 'evento'
  sendToMedia: boolean
  notes: string
}

// ─── Constants ────────────────────────────────────────────────────────────────
const EMPTY_DAY: DaySchedule = { id: 'day-1', date: '', startTime: '', endTime: '' }
const WEEKDAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

const LINK_TYPE_COLORS: Record<string, string> = {
  culto: 'bg-sky-100 text-sky-700 border-sky-200',
  arena: 'bg-violet-100 text-violet-700 border-violet-200',
  evento: 'bg-rose-100 text-rose-700 border-rose-200',
}
const LINK_TYPE_ENTRY_COLORS: Record<string, string> = {
  culto: 'border-l-sky-400 bg-sky-50/40',
  arena: 'border-l-violet-400 bg-violet-50/40',
  evento: 'border-l-rose-400 bg-rose-50/40',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function toIsoDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseIsoDate(value: string) {
  if (!value) return null
  const [y, m, d] = value.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

function addDays(date: Date, amount: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + amount)
  return next
}

function startOfWeek(date: Date) {
  const day = date.getDay()
  const offset = day === 0 ? -6 : 1 - day
  return addDays(date, offset)
}

function formatPeriodLabel(referenceDate: Date, mode: 'semanal' | 'mensal' | 'anual') {
  if (mode === 'semanal') {
    const start = startOfWeek(referenceDate)
    const end = addDays(start, 6)
    return `${String(start.getDate()).padStart(2, '0')}/${String(start.getMonth() + 1).padStart(2, '0')} — ${String(end.getDate()).padStart(2, '0')}/${String(end.getMonth() + 1).padStart(2, '0')}`
  }
  if (mode === 'mensal') return `${MONTH_LABELS[referenceDate.getMonth()]} ${referenceDate.getFullYear()}`
  return `${referenceDate.getFullYear()}`
}

function formatDisplayDate(iso: string) {
  const d = parseIsoDate(iso)
  if (!d) return iso
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

// ─── Small reusable pieces ────────────────────────────────────────────────────
function StepBadge({ n, label, sub }: { n: number; label: string; sub?: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#c62737] text-xs font-bold text-white">
        {n}
      </span>
      <div>
        <p className="text-base font-semibold text-slate-800 leading-tight">{label}</p>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function LinkTypeBadge({ type }: { type: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${LINK_TYPE_COLORS[type] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}>
      {type}
    </span>
  )
}

function MediaBadge({ active }: { active: boolean }) {
  return active ? (
    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
      <Send className="h-3 w-3" /> Mídia
    </span>
  ) : null
}

function ToggleGroup<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
}) {
  return (
    <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-0.5 gap-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
            value === opt.value
              ? 'bg-white text-[#c62737] shadow-sm border border-slate-200'
              : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function AgendaSocialPage() {
  const [churches, setChurches] = useState<Church[]>([])
  const [worshipServices, setWorshipServices] = useState<WorshipService[]>([])
  const [arenas, setArenas] = useState<Arena[]>([])
  const [registeredEvents, setRegisteredEvents] = useState<RegisteredEvent[]>([])
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([])

  const [loadingChurches, setLoadingChurches] = useState(true)
  const [loadingLinks, setLoadingLinks] = useState(false)
  const [loadingAgendaData, setLoadingAgendaData] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [churchId, setChurchId] = useState('')

  // Event form
  const [eventName, setEventName] = useState('')
  const [eventDescription, setEventDescription] = useState('')
  const [isMultiDay, setIsMultiDay] = useState(false)
  const [eventDays, setEventDays] = useState<DaySchedule[]>([{ ...EMPTY_DAY }])
  const [eventSendToMedia, setEventSendToMedia] = useState(true)
  const [savingEvent, setSavingEvent] = useState(false)

  // Agenda item form
  const [agendaLinkType, setAgendaLinkType] = useState<'culto' | 'arena' | 'evento'>('culto')
  const [agendaLinkId, setAgendaLinkId] = useState('')
  const [agendaNotes, setAgendaNotes] = useState('')
  const [agendaSendToMedia, setAgendaSendToMedia] = useState(true)
  const [savingItem, setSavingItem] = useState(false)

  // Modals
  const [modalEventoOpen, setModalEventoOpen] = useState(false)
  const [modalItemOpen, setModalItemOpen] = useState(false)

  // Collapse
  const [eventsCollapsed, setEventsCollapsed] = useState(false)
  const [itemsCollapsed, setItemsCollapsed] = useState(false)

  // Calendar
  const [agendaViewMode, setAgendaViewMode] = useState<'lista' | 'calendario'>('lista')
  const [calendarRange, setCalendarRange] = useState<'semanal' | 'mensal' | 'anual'>('mensal')
  const [calendarReferenceDate, setCalendarReferenceDate] = useState(() => toIsoDate(new Date()))

  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'ok' | 'err' }>({
    visible: false, message: '', type: 'ok',
  })

  function showToast(message: string, type: 'ok' | 'err') {
    setToast({ visible: true, message, type })
  }

  // ── Load churches ──────────────────────────────────────────────────────────
  useEffect(() => {
    let active = true
    async function loadChurches() {
      setLoadingChurches(true)
      try {
        const res = await adminFetchJson<{ items?: Church[]; churches?: Church[] }>('/api/admin/consolidacao/churches')
        if (!active) return
        setChurches(res.items ?? res.churches ?? [])
      } catch {
        if (!active) return
        showToast('Não foi possível carregar igrejas.', 'err')
      } finally {
        if (active) setLoadingChurches(false)
      }
    }
    loadChurches()
    return () => { active = false }
  }, [])

  // ── Load links by church ───────────────────────────────────────────────────
  useEffect(() => {
    let active = true
    async function loadLinksByChurch() {
      if (!churchId) {
        setWorshipServices([])
        setArenas([])
        setAgendaLinkId('')
        return
      }
      setLoadingLinks(true)
      try {
        const [servicesRes, arenasRes] = await Promise.all([
          adminFetchJson<{ items?: WorshipService[] }>(`/api/admin/consolidacao/worship-services?church_id=${churchId}`),
          adminFetchJson<{ items?: Arena[] }>(`/api/admin/consolidacao/arenas?church_id=${churchId}`),
        ])
        if (!active) return
        setWorshipServices(servicesRes.items ?? [])
        setArenas(arenasRes.items ?? [])
      } catch {
        if (!active) return
        setWorshipServices([])
        setArenas([])
        showToast('Não foi possível carregar cultos/arenas da igreja.', 'err')
      } finally {
        if (active) setLoadingLinks(false)
      }
    }
    loadLinksByChurch()
    return () => { active = false }
  }, [churchId])

  // ── Derived data ───────────────────────────────────────────────────────────
  const churchOptions = churches.map((c) => ({ value: c.id, label: c.name }))
  const selectedChurchName = churches.find((c) => c.id === churchId)?.name ?? ''

  const eventOptions = registeredEvents
    .filter((event) => event.churchId === churchId)
    .map((event) => ({ value: event.id, label: event.name }))

  const agendaLinkOptions = useMemo(() => {
    if (agendaLinkType === 'culto') return worshipServices.map((s) => ({ value: s.id, label: s.name }))
    if (agendaLinkType === 'arena') return arenas.map((a) => ({ value: a.id, label: a.name }))
    return eventOptions
  }, [agendaLinkType, worshipServices, arenas, eventOptions])

  const eventsById = useMemo(() => {
    const map = new Map<string, RegisteredEvent>()
    registeredEvents.forEach((event) => map.set(event.id, event))
    return map
  }, [registeredEvents])

  const worshipServicesById = useMemo(() => {
    const map = new Map<string, WorshipService>()
    worshipServices.forEach((s) => map.set(s.id, s))
    return map
  }, [worshipServices])

  const arenasById = useMemo(() => {
    const map = new Map<string, Arena>()
    arenas.forEach((a) => map.set(a.id, a))
    return map
  }, [arenas])

  const calendarEntries = useMemo<AgendaCalendarEntry[]>(() => {
    const eventEntries: AgendaCalendarEntry[] = registeredEvents.flatMap((event) =>
      event.schedules
        .filter((day) => !!day.date)
        .map((day) => ({
          id: `event-${event.id}-${day.id}`,
          date: day.date,
          startTime: day.startTime || '',
          endTime: day.endTime || '',
          title: event.name,
          churchName: event.churchName,
          source: 'evento',
          linkType: 'evento',
          sendToMedia: event.sendToMedia,
          notes: event.description || '',
        }))
    )

    const agendaLinkedToEvents: AgendaCalendarEntry[] = agendaItems.flatMap((item) => {
      if (item.linkType !== 'evento') return []
      const linkedEvent = eventsById.get(item.linkId)
      if (!linkedEvent) return []

      return linkedEvent.schedules
        .filter((day) => !!day.date)
        .map((day) => ({
          id: `agenda-${item.id}-${day.id}`,
          date: day.date,
          startTime: day.startTime || '',
          endTime: day.endTime || '',
          title: item.linkLabel,
          churchName: item.churchName,
          source: 'agenda',
          linkType: item.linkType,
          sendToMedia: item.sendToMedia,
          notes: item.notes,
        }))
    })

    // ── Recurring entries: todos os cultos e arenas da igreja ─────────────
    // Gera ocorrências semanais numa janela de 1 ano para trás e 1 ano para frente
    // diretamente de worshipServices e arenas — independe de itens cadastrados
    const today = new Date()
    const rangeStart = new Date(today.getFullYear() - 1, 0, 1)
    const rangeEnd   = new Date(today.getFullYear() + 1, 11, 31)

    function expandRecurring(
      id: string,
      title: string,
      dayOfWeek: number,
      startTime: string,
      linkType: 'culto' | 'arena',
    ): AgendaCalendarEntry[] {
      const entries: AgendaCalendarEntry[] = []
      const cur = new Date(rangeStart)
      while (cur <= rangeEnd) {
        if (cur.getDay() === dayOfWeek) {
          const iso = toIsoDate(cur)
          entries.push({
            id: `recurring-${linkType}-${id}-${iso}`,
            date: iso,
            startTime,
            endTime: '',
            title,
            churchName: selectedChurchName,
            source: 'agenda',
            linkType,
            sendToMedia: false,
            notes: '',
          })
        }
        cur.setDate(cur.getDate() + 1)
      }
      return entries
    }

    const cultoEntries: AgendaCalendarEntry[] = worshipServices.flatMap((s) => {
      if (s.day_of_week == null) return []
      return expandRecurring(s.id, s.name, s.day_of_week, s.time_of_day ?? '', 'culto')
    })

    const arenaEntries: AgendaCalendarEntry[] = arenas.flatMap((a) => {
      if (a.day_of_week == null) return []
      const dow = parseInt(a.day_of_week, 10)
      if (isNaN(dow)) return []
      return expandRecurring(a.id, a.name, dow, a.time_of_day ?? '', 'arena')
    })

    const recurringEntries = [...cultoEntries, ...arenaEntries]

    return [...eventEntries, ...agendaLinkedToEvents, ...recurringEntries].sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date)
      if (dateCompare !== 0) return dateCompare
      return a.startTime.localeCompare(b.startTime)
    })
  }, [registeredEvents, agendaItems, eventsById, worshipServices, arenas, selectedChurchName])

  const undatedAgendaItems = useMemo(() => {
    return agendaItems.filter((item) => {
      if (item.linkType === 'evento') return !eventsById.get(item.linkId)?.schedules?.length
      if (item.linkType === 'culto') {
        const s = worshipServicesById.get(item.linkId)
        return s?.day_of_week == null
      }
      if (item.linkType === 'arena') {
        const a = arenasById.get(item.linkId)
        return a?.day_of_week == null
      }
      return true
    })
  }, [agendaItems, eventsById, worshipServicesById, arenasById])

  const referenceDateObj = useMemo(() => parseIsoDate(calendarReferenceDate) ?? new Date(), [calendarReferenceDate])
  const todayIso = useMemo(() => toIsoDate(new Date()), [])

  const filteredCalendarEntries = useMemo(() => {
    return calendarEntries.filter((entry) => {
      const entryDate = parseIsoDate(entry.date)
      if (!entryDate) return false
      if (calendarRange === 'semanal') {
        const start = startOfWeek(referenceDateObj)
        const end = addDays(start, 6)
        const t = entryDate.getTime()
        return t >= start.getTime() && t <= end.getTime()
      }
      if (calendarRange === 'mensal') {
        return entryDate.getFullYear() === referenceDateObj.getFullYear() &&
          entryDate.getMonth() === referenceDateObj.getMonth()
      }
      return entryDate.getFullYear() === referenceDateObj.getFullYear()
    })
  }, [calendarEntries, calendarRange, referenceDateObj])

  const entriesByDate = useMemo(() => {
    const map = new Map<string, AgendaCalendarEntry[]>()
    filteredCalendarEntries.forEach((entry) => {
      const current = map.get(entry.date) ?? []
      current.push(entry)
      map.set(entry.date, current)
    })
    return map
  }, [filteredCalendarEntries])

  const weeklyDates = useMemo(() => {
    const start = startOfWeek(referenceDateObj)
    return Array.from({ length: 7 }, (_, idx) => addDays(start, idx))
  }, [referenceDateObj])

  const monthlyGridDates = useMemo(() => {
    const firstDay = new Date(referenceDateObj.getFullYear(), referenceDateObj.getMonth(), 1)
    const firstWeekStart = startOfWeek(firstDay)
    return Array.from({ length: 42 }, (_, idx) => addDays(firstWeekStart, idx))
  }, [referenceDateObj])

  const yearlyStats = useMemo(() => {
    return MONTH_LABELS.map((label, monthIndex) => {
      const total = filteredCalendarEntries.filter((entry) => {
        const date = parseIsoDate(entry.date)
        return date && date.getMonth() === monthIndex
      }).length
      return { label, total }
    })
  }, [filteredCalendarEntries])

  // Finds the nearest future evento-type entry when there is nothing in the current period
  const nearestEventOutsidePeriod = useMemo(() => {
    const hasEventInPeriod = filteredCalendarEntries.some((e) => e.source === 'evento')
    if (hasEventInPeriod) return null
    const todayIso2 = toIsoDate(new Date())
    const future = calendarEntries
      .filter((e) => e.source === 'evento' && e.date >= todayIso2)
      .sort((a, b) => a.date.localeCompare(b.date))
    return future[0]?.date ?? null
  }, [calendarEntries, filteredCalendarEntries])

  // ── Calendar navigation ────────────────────────────────────────────────────
  function shiftCalendarPeriod(direction: 'prev' | 'next') {
    const factor = direction === 'next' ? 1 : -1
    const base = parseIsoDate(calendarReferenceDate) ?? new Date()
    const next = new Date(base)
    if (calendarRange === 'semanal') next.setDate(next.getDate() + 7 * factor)
    if (calendarRange === 'mensal') next.setMonth(next.getMonth() + factor)
    if (calendarRange === 'anual') next.setFullYear(next.getFullYear() + factor)
    setCalendarReferenceDate(toIsoDate(next))
  }

  // ── Load agenda data ───────────────────────────────────────────────────────
  useEffect(() => {
    let active = true
    async function loadAgendaData() {
      if (!churchId) {
        setRegisteredEvents([])
        setAgendaItems([])
        return
      }
      setLoadingAgendaData(true)
      try {
        const [eventsRes, itemsRes] = await Promise.all([
          adminFetchJson<{ items?: RegisteredEvent[] }>(`/api/admin/midia/agenda/events?church_id=${churchId}`),
          adminFetchJson<{ items?: AgendaItem[] }>(`/api/admin/midia/agenda/items?church_id=${churchId}`),
        ])
        if (!active) return
        setRegisteredEvents(eventsRes.items ?? [])
        setAgendaItems(itemsRes.items ?? [])
      } catch {
        if (!active) return
        showToast('Não foi possível carregar eventos/agenda desta igreja.', 'err')
      } finally {
        if (active) setLoadingAgendaData(false)
      }
    }
    loadAgendaData()
    return () => { active = false }
  }, [churchId])

  // ── Event form helpers ─────────────────────────────────────────────────────
  function resetEventForm() {
    setEventName('')
    setEventDescription('')
    setIsMultiDay(false)
    setEventDays([{ ...EMPTY_DAY, id: `day-${Date.now()}` }])
    setEventSendToMedia(true)
  }

  function addDay() {
    setEventDays((prev) => [...prev, { id: `day-${Date.now()}-${prev.length + 1}`, date: '', startTime: '', endTime: '' }])
  }

  function removeDay(id: string) {
    setEventDays((prev) => (prev.length > 1 ? prev.filter((day) => day.id !== id) : prev))
  }

  function updateDay(id: string, patch: Partial<DaySchedule>) {
    setEventDays((prev) => prev.map((day) => (day.id === id ? { ...day, ...patch } : day)))
  }

  function validateEventForm() {
    if (!churchId) return 'Selecione a igreja para cadastrar o evento.'
    if (!eventName.trim()) return 'Informe o nome do evento.'
    for (const day of eventDays) {
      if (!day.date) return 'Informe a data de todos os dias do evento.'
      if (!day.startTime) return 'Informe o horário inicial de todos os dias do evento.'
    }
    return null
  }

  // ── Actions ────────────────────────────────────────────────────────────────
  async function handleCreateEvent() {
    const err = validateEventForm()
    if (err) { showToast(err, 'err'); return }
    const normalizedDays = isMultiDay ? eventDays : [eventDays[0]]

    setSavingEvent(true)
    try {
      const res = await adminFetchJson<{ item: RegisteredEvent }>('/api/admin/midia/agenda/events', {
        method: 'POST',
        body: JSON.stringify({
          churchId,
          name: eventName.trim(),
          description: eventDescription.trim(),
          multiDay: isMultiDay,
          schedules: normalizedDays.map((day) => ({ date: day.date, startTime: day.startTime, endTime: day.endTime })),
          sendToMedia: eventSendToMedia,
        }),
      })
      if (res?.item) setRegisteredEvents((prev) => [res.item, ...prev])
      resetEventForm()
      setModalEventoOpen(false)
      showToast('Evento cadastrado com sucesso.', 'ok')
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Erro ao cadastrar evento.', 'err')
    } finally {
      setSavingEvent(false)
    }
  }

  async function handleDeleteEvent(id: string) {
    if (!confirm('Deseja excluir este evento?')) return
    setDeletingId(id)
    try {
      await adminFetchJson(`/api/admin/midia/agenda/events?id=${id}`, { method: 'DELETE' })
      setRegisteredEvents((prev) => prev.filter((e) => e.id !== id))
      showToast('Evento excluído.', 'ok')
    } catch {
      showToast('Não foi possível excluir o evento.', 'err')
    } finally {
      setDeletingId(null)
    }
  }

  async function handleCreateAgendaItem() {
    if (!churchId) { showToast('Selecione a igreja para criar a agenda.', 'err'); return }
    if (!agendaLinkId) { showToast('Selecione o vínculo da agenda.', 'err'); return }

    setSavingItem(true)
    try {
      const res = await adminFetchJson<{ item: AgendaItem }>('/api/admin/midia/agenda/items', {
        method: 'POST',
        body: JSON.stringify({ churchId, linkType: agendaLinkType, linkId: agendaLinkId, notes: agendaNotes.trim(), sendToMedia: agendaSendToMedia }),
      })
      if (res?.item) setAgendaItems((prev) => [res.item, ...prev])
      setAgendaLinkId('')
      setAgendaNotes('')
      setAgendaSendToMedia(true)
      setModalItemOpen(false)
      showToast('Item de agenda adicionado com sucesso.', 'ok')
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Erro ao criar item da agenda.', 'err')
    } finally {
      setSavingItem(false)
    }
  }

  async function handleDeleteAgendaItem(id: string) {
    if (!confirm('Deseja remover este item da agenda?')) return
    setDeletingId(id)
    try {
      await adminFetchJson(`/api/admin/midia/agenda/items?id=${id}`, { method: 'DELETE' })
      setAgendaItems((prev) => prev.filter((i) => i.id !== id))
      showToast('Item removido.', 'ok')
    } catch {
      showToast('Não foi possível remover o item.', 'err')
    } finally {
      setDeletingId(null)
    }
  }

  const isLoading = loadingLinks || loadingAgendaData
  const churchSelected = !!churchId

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <PageAccessGuard pageKey="instagram">
      <div className="p-4 md:p-8 space-y-6">

        {/* ── Header ── */}
        <AdminPageHeader
          icon={CalendarDays}
          title="Agenda de Mídia e Social"
          subtitle="Planeje a agenda por igreja, vinculando cultos, arenas e eventos com sinalização de demandas para a equipe de Mídia."
          actions={
            <Link
              href="/admin/midia/demandas"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-300 transition-colors"
            >
              <ListChecks className="h-4 w-4 text-slate-500" />
              Demandas de Mídia
            </Link>
          }
        />

        {/* ─────────────────────────────────────────────
            STEP 1 – Contexto da Agenda
        ───────────────────────────────────────────── */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6 space-y-5">
          <StepBadge
            n={1}
            label="Contexto da Agenda"
            sub="Selecione a igreja. A agenda é sempre vinculada a uma igreja."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Igreja</label>
              <CustomSelect
                value={churchId}
                onChange={(v) => {
                  setChurchId(v)
                  setAgendaLinkId('')
                }}
                options={churchOptions}
                placeholder={loadingChurches ? 'Carregando igrejas…' : 'Selecione uma igreja'}
                disabled={loadingChurches}
                allowEmpty={false}
              />
            </div>

            <div className={`rounded-xl border p-4 transition-colors ${churchSelected ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50'}`}>
              {churchSelected ? (
                <>
                  <p className="text-xs font-medium text-slate-500 mb-2 uppercase tracking-wider">Referências — {selectedChurchName}</p>
                  <div className="flex flex-wrap gap-2">
                    <span className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm font-medium ${LINK_TYPE_COLORS.culto}`}>
                      Cultos <strong>{worshipServices.length}</strong>
                    </span>
                    <span className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm font-medium ${LINK_TYPE_COLORS.arena}`}>
                      Arenas <strong>{arenas.length}</strong>
                    </span>
                    <span className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm font-medium ${LINK_TYPE_COLORS.evento}`}>
                      Eventos <strong>{registeredEvents.length}</strong>
                    </span>
                  </div>
                  {isLoading && (
                    <p className="flex items-center gap-1.5 text-xs text-slate-400 mt-2">
                      <Loader2 className="h-3 w-3 animate-spin" /> Atualizando…
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-slate-400 italic">As referências aparecerão após selecionar uma igreja.</p>
              )}
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────────
            STEP 2 – Cadastros da Agenda
        ───────────────────────────────────────────── */}
        <section className={`rounded-2xl border bg-white p-5 md:p-6 space-y-5 transition-opacity ${churchSelected ? 'border-slate-200 opacity-100' : 'border-slate-100 opacity-50 pointer-events-none select-none'}`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <StepBadge
              n={2}
              label="Cadastros da Agenda"
              sub="Gerencie eventos e itens de agenda vinculados a esta igreja."
            />
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                disabled={!churchSelected}
                onClick={() => setModalEventoOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-[#c62737] px-4 py-2 text-sm font-semibold text-[#c62737] hover:bg-[#c62737]/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Plus className="h-4 w-4" />
                Novo evento
              </button>
              <button
                type="button"
                disabled={!churchSelected}
                onClick={() => setModalItemOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-[#c62737] px-4 py-2 text-sm font-semibold text-white hover:bg-[#9e1f2e] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Plus className="h-4 w-4" />
                Novo item
              </button>
            </div>
          </div>

          {/* Eventos */}
          {registeredEvents.length > 0 && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setEventsCollapsed((v) => !v)}
                className="flex w-full items-center justify-between gap-2 text-left"
              >
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Eventos ({registeredEvents.length})
                </p>
                <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${eventsCollapsed ? '-rotate-90' : ''}`} />
              </button>
              {!eventsCollapsed && registeredEvents.map((event) => (
                <div key={event.id}
                  className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 hover:border-slate-300 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800 truncate">{event.name}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <LinkTypeBadge type="evento" />
                      <span className="text-xs text-slate-500">{event.churchName}</span>
                      <span className="text-slate-300">·</span>
                      <span className="text-xs text-slate-500">
                        {event.schedules.length} {event.schedules.length === 1 ? 'dia' : 'dias'}
                        {event.schedules[0]?.date ? ` · ${formatDisplayDate(event.schedules[0].date)}` : ''}
                      </span>
                      {event.sendToMedia && <MediaBadge active />}
                    </div>
                  </div>
                  <button type="button" onClick={() => handleDeleteEvent(event.id)} disabled={deletingId === event.id}
                    className="shrink-0 inline-flex items-center justify-center h-8 w-8 rounded-lg border border-slate-200 text-slate-400 hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-40 transition-colors">
                    {deletingId === event.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Itens de agenda */}
          {agendaItems.length > 0 && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setItemsCollapsed((v) => !v)}
                className="flex w-full items-center justify-between gap-2 text-left"
              >
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Itens na agenda ({agendaItems.length})
                </p>
                <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${itemsCollapsed ? '-rotate-90' : ''}`} />
              </button>
              {!itemsCollapsed && agendaItems.map((item) => (
                <div key={item.id}
                  className={`flex items-start justify-between gap-3 rounded-xl border bg-white px-4 py-3 border-l-4 hover:shadow-sm transition-all ${LINK_TYPE_ENTRY_COLORS[item.linkType] ?? 'border-l-slate-300 border-slate-200'}`}>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800 truncate">{item.linkLabel}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <LinkTypeBadge type={item.linkType} />
                      <span className="text-xs text-slate-500">{item.churchName}</span>
                      {item.sendToMedia && <MediaBadge active />}
                    </div>
                    {item.notes && <p className="text-xs text-slate-500 mt-1.5 italic">{item.notes}</p>}
                  </div>
                  <button type="button" onClick={() => handleDeleteAgendaItem(item.id)} disabled={deletingId === item.id}
                    className="shrink-0 inline-flex items-center justify-center h-8 w-8 rounded-lg border border-slate-200 text-slate-400 hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-40 transition-colors">
                    {deletingId === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </button>
                </div>
              ))}
            </div>
          )}

          {churchSelected && registeredEvents.length === 0 && agendaItems.length === 0 && (
            <p className="text-sm text-slate-400 italic">
              Nenhum evento ou item cadastrado para esta igreja ainda.
            </p>
          )}
        </section>

        {/* ── Modal: Cadastro de Evento ─────────────────────────────────────── */}
        {modalEventoOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 backdrop-blur-sm p-4 pt-10">
            <div className="relative w-full max-w-2xl mb-10 rounded-2xl border border-slate-200 bg-white shadow-2xl">
              {/* Header */}
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4">
                <div>
                  <p className="text-base font-semibold text-slate-800">Cadastro de Evento</p>
                  <p className="text-xs text-slate-500 mt-0.5">Igreja: <strong>{selectedChurchName}</strong></p>
                </div>
                <button
                  type="button"
                  onClick={() => { setModalEventoOpen(false); resetEventForm() }}
                  className="inline-flex items-center justify-center h-8 w-8 shrink-0 rounded-lg border border-slate-200 text-slate-400 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Nome do evento</label>
                    <input
                      value={eventName}
                      onChange={(e) => setEventName(e.target.value)}
                      placeholder="Ex: Conferência de Voluntários"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 focus:border-[#c62737] focus:ring-2 focus:ring-[#c62737]/20 outline-none transition-all placeholder:text-slate-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Duração</label>
                    <CustomSelect
                      value={isMultiDay ? 'multi' : 'single'}
                      onChange={(v) => {
                        setIsMultiDay(v === 'multi')
                        setEventDays((prev) =>
                          v === 'single' ? [prev[0] ?? { ...EMPTY_DAY, id: `day-${Date.now()}` }] : prev
                        )
                      }}
                      options={[
                        { value: 'single', label: 'Um dia' },
                        { value: 'multi', label: 'Mais de um dia' },
                      ]}
                      allowEmpty={false}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Descrição (opcional)</label>
                  <textarea
                    value={eventDescription}
                    onChange={(e) => setEventDescription(e.target.value)}
                    rows={2}
                    placeholder="Contexto do evento e necessidades principais"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 focus:border-[#c62737] focus:ring-2 focus:ring-[#c62737]/20 outline-none transition-all placeholder:text-slate-400"
                  />
                </div>

                <div className="space-y-3">
                  {eventDays.map((day, index) => (
                    <div key={day.id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Dia {index + 1}</p>
                        {eventDays.length > 1 && (
                          <button type="button" onClick={() => removeDay(day.id)}
                            className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-700 transition-colors">
                            <Trash2 className="h-3 w-3" /> Remover
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">Data</label>
                          <DatePickerInput value={day.date} onChange={(v) => updateDay(day.id, { date: v })} />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">Início</label>
                          <input type="time" value={day.startTime}
                            onChange={(e) => updateDay(day.id, { startTime: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 focus:border-[#c62737] focus:ring-2 focus:ring-[#c62737]/20 outline-none transition-all" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">Fim (opcional)</label>
                          <input type="time" value={day.endTime}
                            onChange={(e) => updateDay(day.id, { endTime: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 focus:border-[#c62737] focus:ring-2 focus:ring-[#c62737]/20 outline-none transition-all" />
                        </div>
                      </div>
                    </div>
                  ))}
                  {isMultiDay && (
                    <button type="button" onClick={addDay}
                      className="inline-flex items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:border-slate-400 hover:text-slate-800 transition-colors">
                      <Plus className="h-4 w-4" /> Adicionar dia
                    </button>
                  )}
                </div>

                <label className="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer select-none">
                  <input type="checkbox" checked={eventSendToMedia}
                    onChange={(e) => setEventSendToMedia(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-[#c62737] focus:ring-[#c62737]/30" />
                  Gerar demanda automática para a equipe de Mídia
                </label>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
                <button
                  type="button"
                  onClick={() => { setModalEventoOpen(false); resetEventForm() }}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button type="button" onClick={handleCreateEvent} disabled={savingEvent}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#c62737] px-5 py-2 text-sm font-semibold text-white hover:bg-[#9e1f2e] disabled:opacity-60 disabled:cursor-not-allowed transition-colors">
                  {savingEvent ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Cadastrar evento
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Modal: Criar Item na Agenda ───────────────────────────────────── */}
        {modalItemOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 backdrop-blur-sm p-4 pt-10">
            <div className="relative w-full max-w-xl mb-10 rounded-2xl border border-slate-200 bg-white shadow-2xl">
              {/* Header */}
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4">
                <div>
                  <p className="text-base font-semibold text-slate-800">Criar Item na Agenda</p>
                  <p className="text-xs text-slate-500 mt-0.5">Igreja: <strong>{selectedChurchName}</strong></p>
                </div>
                <button
                  type="button"
                  onClick={() => setModalItemOpen(false)}
                  className="inline-flex items-center justify-center h-8 w-8 shrink-0 rounded-lg border border-slate-200 text-slate-400 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Tipo de vínculo</label>
                    <CustomSelect
                      value={agendaLinkType}
                      onChange={(v) => {
                        setAgendaLinkType(v as 'culto' | 'arena' | 'evento')
                        setAgendaLinkId('')
                      }}
                      options={[
                        { value: 'culto', label: 'Culto' },
                        { value: 'arena', label: 'Arena' },
                        { value: 'evento', label: 'Evento cadastrado' },
                      ]}
                      allowEmpty={false}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-slate-700 mb-1">Selecione o vínculo</label>
                    <CustomSelect
                      value={agendaLinkId}
                      onChange={setAgendaLinkId}
                      options={agendaLinkOptions}
                      placeholder={loadingLinks ? 'Carregando…' : 'Selecione o vínculo'}
                      disabled={loadingLinks}
                      allowEmpty={false}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Observações (opcional)</label>
                  <textarea value={agendaNotes} onChange={(e) => setAgendaNotes(e.target.value)} rows={3}
                    placeholder="Ex: Precisamos de peça para feed e stories com prazo até quarta"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 focus:border-[#c62737] focus:ring-2 focus:ring-[#c62737]/20 outline-none transition-all placeholder:text-slate-400" />
                </div>

                <label className="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer select-none">
                  <input type="checkbox" checked={agendaSendToMedia}
                    onChange={(e) => setAgendaSendToMedia(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-[#c62737] focus:ring-[#c62737]/30" />
                  Direcionar demanda para a equipe de Mídia
                </label>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
                <button
                  type="button"
                  onClick={() => setModalItemOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button type="button" onClick={handleCreateAgendaItem} disabled={savingItem}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#c62737] px-5 py-2 text-sm font-semibold text-white hover:bg-[#9e1f2e] disabled:opacity-60 disabled:cursor-not-allowed transition-colors">
                  {savingItem ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Adicionar na agenda
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────
            STEP 4 – Visão da Agenda
        ───────────────────────────────────────────── */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6 space-y-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <StepBadge
              n={3}
              label="Visão da Agenda"
              sub="Acompanhe os itens em lista ou calendário."
            />
            <div className="flex flex-wrap items-center gap-2">
              <ToggleGroup
                value={agendaViewMode}
                onChange={setAgendaViewMode}
                options={[
                  { value: 'lista', label: '☰ Lista' },
                  { value: 'calendario', label: '▦ Calendário' },
                ]}
              />
              <ToggleGroup
                value={calendarRange}
                onChange={setCalendarRange}
                options={[
                  { value: 'semanal', label: 'Semana' },
                  { value: 'mensal', label: 'Mês' },
                  { value: 'anual', label: 'Ano' },
                ]}
              />
            </div>
          </div>

          {/* Navigation bar */}
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => shiftCalendarPeriod('prev')}
                className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-800 transition-colors">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => shiftCalendarPeriod('next')}
                className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-800 transition-colors">
                <ChevronRight className="h-4 w-4" />
              </button>
              <span className="text-sm font-semibold text-slate-800 min-w-[120px]">
                {formatPeriodLabel(referenceDateObj, calendarRange)}
              </span>
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-medium text-slate-600">
                {filteredCalendarEntries.length} {filteredCalendarEntries.length === 1 ? 'item' : 'itens'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <DatePickerInput value={calendarReferenceDate} onChange={setCalendarReferenceDate} />
              <button type="button" onClick={() => setCalendarReferenceDate(todayIso)}
                className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-slate-300 transition-colors">
                Hoje
              </button>
            </div>
          </div>

          {/* ── List view ── */}
          {agendaViewMode === 'lista' && (
            <div className="space-y-3">
              {filteredCalendarEntries.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 py-10 text-center gap-2">
                  <List className="h-8 w-8 text-slate-300" />
                  <p className="text-sm font-medium text-slate-500">Nenhum item com data neste período</p>
                  {nearestEventOutsidePeriod ? (
                    <button
                      type="button"
                      onClick={() => {
                        setCalendarReferenceDate(nearestEventOutsidePeriod)
                        setCalendarRange('mensal')
                      }}
                      className="mt-1 inline-flex items-center gap-1.5 rounded-xl border border-[#c62737]/30 bg-[#c62737]/5 px-3 py-1.5 text-xs font-medium text-[#c62737] hover:bg-[#c62737]/10 transition-colors"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                      Ir para o próximo evento · {formatDisplayDate(nearestEventOutsidePeriod)}
                    </button>
                  ) : (
                    <p className="text-xs text-slate-400">Adicione eventos ou itens na agenda acima</p>
                  )}
                </div>
              ) : (
                filteredCalendarEntries.map((entry) => (
                  <div key={entry.id}
                    className={`rounded-xl border bg-white px-4 py-3 border-l-4 hover:shadow-sm transition-all ${LINK_TYPE_ENTRY_COLORS[entry.linkType] ?? 'border-l-slate-300 border-slate-200'}`}>
                    <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-slate-800">{entry.title}</p>
                        <LinkTypeBadge type={entry.linkType} />
                        {entry.sendToMedia && <MediaBadge active />}
                      </div>
                      <p className="text-xs text-slate-500 shrink-0">
                        {formatDisplayDate(entry.date)}
                        {entry.startTime ? ` · ${entry.startTime}` : ''}
                        {entry.endTime ? ` às ${entry.endTime}` : ''}
                      </p>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{entry.churchName}</p>
                    {entry.notes && <p className="text-xs text-slate-400 mt-1 italic">{entry.notes}</p>}
                  </div>
                ))
              )}

              {undatedAgendaItems.length > 0 && (
                <div className="space-y-2 mt-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Sem data definida ({undatedAgendaItems.length})
                  </p>
                  {undatedAgendaItems.map((item) => (
                    <div key={`undated-${item.id}`}
                      className={`flex items-center gap-3 rounded-xl border bg-white px-4 py-2.5 border-l-4 ${LINK_TYPE_ENTRY_COLORS[item.linkType] ?? 'border-l-slate-300 border-slate-200'}`}>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-700 truncate">{item.linkLabel}</p>
                        <p className="text-xs text-slate-400">{item.churchName}</p>
                      </div>
                      <LinkTypeBadge type={item.linkType} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Calendar view ── */}
          {agendaViewMode === 'calendario' && (
            <div className="space-y-3">
              {calendarRange === 'semanal' && (
                <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
                  {weeklyDates.map((date, index) => {
                    const key = toIsoDate(date)
                    const items = entriesByDate.get(key) ?? []
                    const isToday = key === todayIso
                    return (
                      <div key={key}
                        className={`rounded-xl border p-3 min-h-[130px] transition-colors ${isToday ? 'border-[#c62737] bg-[#c62737]/5' : 'border-slate-200 bg-white'}`}>
                        <div className="flex items-center gap-1.5 mb-2">
                          <span className="text-xs font-semibold text-slate-400">{WEEKDAY_LABELS[index]}</span>
                          <span className={`text-xs font-bold ${isToday ? 'text-[#c62737]' : 'text-slate-700'}`}>
                            {String(date.getDate()).padStart(2, '0')}
                          </span>
                          {isToday && <span className="ml-auto inline-flex h-1.5 w-1.5 rounded-full bg-[#c62737]" />}
                        </div>
                        <div className="space-y-1">
                          {items.slice(0, 3).map((entry) => (
                            <p key={entry.id}
                              className={`rounded-md px-1.5 py-0.5 text-xs font-medium truncate ${entry.linkType === 'culto' ? 'bg-sky-100 text-sky-700' : entry.linkType === 'arena' ? 'bg-violet-100 text-violet-700' : 'bg-rose-100 text-rose-700'}`}>
                              {entry.startTime && <span className="opacity-60 mr-1">{entry.startTime}</span>}
                              {entry.title}
                            </p>
                          ))}
                          {items.length > 3 && <p className="text-xs text-slate-400 pl-1">+{items.length - 3} mais</p>}
                          {items.length === 0 && <p className="text-xs text-slate-300 pl-1">—</p>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {calendarRange === 'mensal' && (
                <div className="space-y-1">
                  <div className="grid grid-cols-7 gap-1">
                    {WEEKDAY_LABELS.map((label) => (
                      <p key={label} className="py-1 text-center text-xs font-semibold text-slate-400">{label}</p>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {monthlyGridDates.map((date) => {
                      const key = toIsoDate(date)
                      const items = entriesByDate.get(key) ?? []
                      const isCurrentMonth = date.getMonth() === referenceDateObj.getMonth()
                      const isToday = key === todayIso
                      return (
                        <div key={key}
                          className={`rounded-xl border p-1.5 min-h-[80px] transition-colors ${isToday ? 'border-[#c62737] bg-[#c62737]/5' : isCurrentMonth ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50'}`}>
                          <p className={`text-xs leading-none mb-1 ${isToday ? 'font-bold text-[#c62737]' : isCurrentMonth ? 'font-semibold text-slate-700' : 'text-slate-300'}`}>
                            {date.getDate()}
                          </p>
                          <div className="space-y-0.5">
                            {items.slice(0, 2).map((entry) => (
                              <p key={entry.id}
                                className={`rounded px-1 py-0.5 text-[10px] leading-tight truncate ${entry.linkType === 'culto' ? 'bg-sky-100 text-sky-700' : entry.linkType === 'arena' ? 'bg-violet-100 text-violet-700' : 'bg-rose-100 text-rose-700'}`}>
                                {entry.title}
                              </p>
                            ))}
                            {items.length > 2 && <p className="text-[10px] text-slate-400 pl-0.5">+{items.length - 2}</p>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {calendarRange === 'anual' && (
                <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">
                  {yearlyStats.map((month) => {
                    const isCurrentMonth =
                      referenceDateObj.getFullYear() === new Date().getFullYear() &&
                      MONTH_LABELS[new Date().getMonth()] === month.label
                    return (
                      <div key={month.label}
                        onClick={() => {
                          const monthIndex = MONTH_LABELS.indexOf(month.label)
                          setCalendarReferenceDate(toIsoDate(new Date(referenceDateObj.getFullYear(), monthIndex, 1)))
                          setCalendarRange('mensal')
                        }}
                        className={`cursor-pointer rounded-xl border p-4 transition-all hover:shadow-sm hover:border-slate-300 ${isCurrentMonth ? 'border-[#c62737] bg-[#c62737]/5' : 'border-slate-200 bg-white'}`}>
                        <p className={`text-sm font-semibold ${isCurrentMonth ? 'text-[#c62737]' : 'text-slate-800'}`}>{month.label}</p>
                        <p className="text-xl font-bold text-slate-800 mt-0.5">{month.total}</p>
                        <p className="text-xs text-slate-400">{month.total === 1 ? 'item' : 'itens'}</p>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((t) => ({ ...t, visible: false }))}
      />
    </PageAccessGuard>
  )
}
