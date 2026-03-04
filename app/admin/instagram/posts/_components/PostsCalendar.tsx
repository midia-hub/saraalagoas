'use client'

import { useState, useMemo } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  LayoutGrid,
  Image as ImageIcon,
  ExternalLink,
  Instagram,
  Facebook,
  Film,
  Layers,
  Loader2,
  Pencil,
  UsersRound,
  ChevronDown,
} from 'lucide-react'
import Link from 'next/link'
import { adminFetchJson } from '@/lib/admin-client'
import type { ScheduledItem, LegacyPostItem } from './types'

type ViewMode = 'month' | 'week'

// ─────────────────────────────────────────────
// Tipo unificado
// ─────────────────────────────────────────────
type UnifiedPost = {
  id: string
  title: string
  caption?: string | null
  dateIso: string           // ISO string (para ordenação/agrupamento)
  dateKey: string           // YYYY-MM-DD
  status: string
  thumbnail?: string | null
  permalink?: string | null
  source: 'scheduled' | 'legacy'
  accountName?: string | null
  albumId?: string | null
  post_type?: string | null
  destinations?: { instagram?: boolean; facebook?: boolean }
  instance_ids?: string[]
  scheduledId?: string | null   // ID real em scheduled_social_posts (para PATCH)
  instagramMediaId?: string | null
}

const STATUS_CFG: Record<
  string,
  { label: string; dotColor: string; cardBg: string; cardBorder: string; cardText: string; badgeBg: string; badgeText: string }
> = {
  pending:    { label: 'Programada',  dotColor: 'bg-amber-400',  cardBg: 'bg-amber-50',  cardBorder: 'border-amber-200',  cardText: 'text-amber-900',  badgeBg: 'bg-amber-100', badgeText: 'text-amber-700' },
  publishing: { label: 'Publicando',  dotColor: 'bg-blue-400',   cardBg: 'bg-blue-50',   cardBorder: 'border-blue-200',   cardText: 'text-blue-900',   badgeBg: 'bg-blue-100',  badgeText: 'text-blue-700' },
  published:  { label: 'Publicada',   dotColor: 'bg-green-500',  cardBg: 'bg-green-50',  cardBorder: 'border-green-200',  cardText: 'text-green-900',  badgeBg: 'bg-green-100', badgeText: 'text-green-700' },
  failed:     { label: 'Falha',       dotColor: 'bg-red-500',    cardBg: 'bg-red-50',    cardBorder: 'border-red-200',    cardText: 'text-red-900',    badgeBg: 'bg-red-100',   badgeText: 'text-red-700'  },
  queued:     { label: 'Na fila',     dotColor: 'bg-amber-400',  cardBg: 'bg-amber-50',  cardBorder: 'border-amber-200',  cardText: 'text-amber-900',  badgeBg: 'bg-amber-100', badgeText: 'text-amber-700' },
  running:    { label: 'Publicando',  dotColor: 'bg-blue-400',   cardBg: 'bg-blue-50',   cardBorder: 'border-blue-200',   cardText: 'text-blue-900',   badgeBg: 'bg-blue-100',  badgeText: 'text-blue-700' },
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function toDateKey(iso: string) {
  return iso.slice(0, 10)
}

function buildThumbScheduled(post: ScheduledItem): string | null {
  const firstId = post.media_specs?.[0]?.id
  if (firstId) return `/api/gallery/image?fileId=${encodeURIComponent(firstId)}&mode=thumb&size=320`
  const firstUrl = post.media_specs?.[0]?.url
  if (typeof firstUrl === 'string' && /^https?:\/\//i.test(firstUrl)) return firstUrl
  return null
}

function buildThumbLegacy(item: LegacyPostItem): string | null {
  const assets = item.instagram_post_drafts?.instagram_post_assets
  if (!assets?.length) return null
  const sorted = [...assets].sort((a, b) => a.sort_order - b.sort_order)
  const first = sorted[0]
  const url = first?.final_url || first?.source_url
  if (!url || url.startsWith('drive:')) return null
  return url
}

function buildPermalinkLegacy(item: LegacyPostItem): string | null {
  const mediaId = item.result_payload?.mediaId
  if (mediaId && !mediaId.startsWith('media_')) return `https://www.instagram.com/p/${mediaId}/`
  return null
}

function mergeAll(scheduled: ScheduledItem[], legacy: LegacyPostItem[]): UnifiedPost[] {
  const sch: UnifiedPost[] = scheduled.map((s) => {
    const dateIso = s.published_at || s.scheduled_at || s.created_at
    return {
      id: `sch-${s.id}`,
      title: s.galleries?.title ?? 'Postagem',
      caption: s.caption,
      dateIso,
      dateKey: toDateKey(dateIso),
      status: s.status,
      thumbnail: buildThumbScheduled(s),
      permalink: null,
      source: 'scheduled',
      albumId: s.album_id,
      post_type: s.post_type,
      destinations: s.destinations,
      instance_ids: s.instance_ids,
      scheduledId: s.id,
      instagramMediaId: s.result_payload?.instagramMediaId ?? null,
    }
  })

  const leg: UnifiedPost[] = legacy.map((l) => {
    const dateIso = l.published_at || l.run_at || l.created_at
    const gallery = l.instagram_post_drafts?.galleries ?? l.instagram_post_drafts?.gallery
    return {
      id: `leg-${l.id}`,
      title: gallery?.title ?? 'Postagem (legada)',
      caption: l.instagram_post_drafts?.caption,
      dateIso,
      dateKey: toDateKey(dateIso),
      status: l.status,
      thumbnail: buildThumbLegacy(l),
      permalink: buildPermalinkLegacy(l),
      source: 'legacy',
      accountName: l.instagram_instances?.name,
      albumId: null,
      post_type: 'feed',
      destinations: { instagram: true },
    }
  })

  return [...sch, ...leg].sort(
    (a, b) => new Date(a.dateIso).getTime() - new Date(b.dateIso).getTime()
  )
}

// ─────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────
export type PostsCalendarProps = {
  scheduledItems: ScheduledItem[]
  legacyItems: LegacyPostItem[]
  loading?: boolean
}

// ─────────────────────────────────────────────
// Calendar helpers
// ─────────────────────────────────────────────
function getWeekStart(d: Date): Date {
  const x = new Date(d)
  const day = x.getDay()
  const diff = x.getDate() - day + (day === 0 ? -6 : 1)
  x.setDate(diff)
  x.setHours(0, 0, 0, 0)
  return x
}

function getMonthDays(year: number, month: number): Date[] {
  // Returns all dates for a month grid (starts on Monday)
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startPad = ((firstDay.getDay() + 6) % 7) // Mon=0
  const endPad = (7 - ((lastDay.getDay() + 7) % 7 + 1)) % 7

  const days: Date[] = []
  for (let i = startPad; i > 0; i--) {
    const d = new Date(firstDay)
    d.setDate(d.getDate() - i)
    days.push(d)
  }
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d))
  }
  for (let i = 1; i <= endPad; i++) {
    const d = new Date(lastDay)
    d.setDate(d.getDate() + i)
    days.push(d)
  }
  return days
}

const WEEKDAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

// ─────────────────────────────────────────────
// Mini card for calendar cell
// ─────────────────────────────────────────────
function MiniCard({ post }: { post: UnifiedPost }) {
  const cfg = STATUS_CFG[post.status] ?? STATUS_CFG.pending
  const time = new Date(post.dateIso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return (
    <div className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium leading-tight ${cfg.cardBg} ${cfg.cardBorder} border`}>
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${cfg.dotColor}`} />
      <span className="truncate text-slate-700">{time} {post.title}</span>
    </div>
  )
}

// ─────────────────────────────────────────────
// Detail panel — single post card
// ─────────────────────────────────────────────
const POST_TYPE_CFG = {
  feed: { label: 'Publicação', icon: LayoutGrid, bg: 'bg-slate-700', text: 'text-white' },
  reel: { label: 'Reel', icon: Film, bg: 'bg-purple-600', text: 'text-white' },
  story: { label: 'Story', icon: Layers, bg: 'bg-pink-600', text: 'text-white' },
} as const

function DetailCard({ post, integrations }: { post: UnifiedPost, integrations: Array<{ value: string; label: string }> }) {
  const cfg = STATUS_CFG[post.status] ?? STATUS_CFG.pending
  const time = new Date(post.dateIso).toLocaleString('pt-BR')

  const hasInstagram = post.destinations?.instagram !== false
  const hasFacebook = post.destinations?.facebook === true

  const [currentType, setCurrentType] = useState<string>(post.post_type ?? 'feed')
  const needsCorrection = post.post_type == null && post.source === 'scheduled'
  const [editingType, setEditingType] = useState(false)
  const [savingType, setSavingType] = useState(false)
  const [loadingPermalink, setLoadingPermalink] = useState(false)

  const typeCfg = POST_TYPE_CFG[currentType as keyof typeof POST_TYPE_CFG] ?? POST_TYPE_CFG.feed
  const TypeIcon = typeCfg.icon

  const accountLabels = useMemo(() => {
    if (!post.instance_ids) return post.accountName ? [post.accountName] : []
    const ids = Array.isArray(post.instance_ids) ? post.instance_ids : []
    return ids.map(id => {
      let cleanId = id
      if (id.includes(':')) cleanId = id.split(':').pop() || id
      const found = integrations.find(i => i.value === cleanId || i.value === id)
      return found ? found.label : (id.length > 8 ? id.slice(0, 8) : id)
    })
  }, [post.instance_ids, post.accountName, integrations])

  async function handleCorrectType(newType: string) {
    if (!post.scheduledId) return
    setSavingType(true)
    try {
      await adminFetchJson(`/api/social/scheduled/${post.scheduledId}`, {
        method: 'PATCH',
        body: JSON.stringify({ post_type: newType }),
      })
      setCurrentType(newType)
    } catch { /* silently fail */ }
    finally {
      setSavingType(false)
      setEditingType(false)
    }
  }

  async function handleViewPost() {
    if (!post.scheduledId) return
    setLoadingPermalink(true)
    try {
      const res = await adminFetchJson<{ permalink?: string | null }>(`/api/admin/instagram/media-permalink?id=${encodeURIComponent(post.scheduledId)}`)
      window.open(res?.permalink || 'https://www.instagram.com/', '_blank', 'noopener,noreferrer')
    } catch {
      window.open('https://www.instagram.com/', '_blank', 'noopener,noreferrer')
    } finally {
      setLoadingPermalink(false)
    }
  }

  return (
    <article className={`flex gap-3 rounded-xl border p-3 ${cfg.cardBorder} bg-white shadow-sm`}>
      {post.thumbnail ? (
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-slate-200">
          <img
            src={post.thumbnail}
            alt=""
            className="h-full w-full object-cover"
          />
        </div>
      ) : (
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-100">
          <ImageIcon className="h-6 w-6 text-slate-300" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <h4 className="font-semibold text-slate-900 text-sm truncate">{post.title}</h4>

          {/* Post type + botão de correção quando tipo era desconhecido */}
          <div className="relative flex items-center gap-1">
            <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${typeCfg.bg} ${typeCfg.text}`}>
              <TypeIcon className="h-2.5 w-2.5" />
              {typeCfg.label}
            </span>
            {needsCorrection && (
              <button
                type="button"
                onClick={() => setEditingType((v) => !v)}
                title="Tipo não registrado — clique para corrigir"
                className="flex items-center gap-0.5 rounded bg-amber-400 px-1 py-0.5 text-[9px] font-semibold text-white hover:bg-amber-500 transition-colors"
              >
                {savingType ? <Loader2 className="h-2 w-2 animate-spin" /> : <ChevronDown className="h-2 w-2" />}
                corrigir
              </button>
            )}
            {editingType && (
              <div className="absolute top-full left-0 mt-1 z-30 rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden min-w-[130px]">
                <div className="border-b border-slate-100 px-3 py-1.5">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Qual foi o tipo?</p>
                </div>
                {(['feed', 'reel', 'story'] as const).map((t) => {
                  const c = POST_TYPE_CFG[t]
                  const Icon = c.icon
                  return (
                    <button key={t} type="button" onClick={() => handleCorrectType(t)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <Icon className="h-3 w-3" /> {c.label}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${cfg.badgeBg} ${cfg.badgeText}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${cfg.dotColor}`} />
            {cfg.label}
          </span>
          
          <div className="flex items-center gap-1">
            {hasInstagram && <Instagram className="h-3 w-3 text-pink-600" />}
            {hasFacebook && <Facebook className="h-3 w-3 text-blue-600" />}
          </div>

          {post.source === 'legacy' && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">legada</span>
          )}
        </div>
        <p className="mt-0.5 text-[11px] text-slate-500">{time}</p>
        
        {accountLabels.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {accountLabels.map((lbl, idx) => (
              <span key={idx} className="inline-flex items-center gap-1 rounded bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-500 border border-slate-100">
                <UsersRound className="h-2.5 w-2.5" />
                {lbl}
              </span>
            ))}
          </div>
        )}

        {post.caption && (
          <p className="mt-1 line-clamp-2 text-xs text-slate-600 leading-relaxed">{post.caption}</p>
        )}
        <div className="mt-2 flex flex-wrap gap-2">
          {/* Ver postagem: permalink fixo (legacy) ou buscar via API (scheduled com media_id) */}
          {post.permalink && (
            <a
              href={post.permalink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-[#c62737] hover:bg-red-50"
            >
              Ver postagem <ExternalLink className="h-3 w-3" />
            </a>
          )}
          {!post.permalink && post.instagramMediaId && post.source === 'scheduled' && (
            <button
              type="button"
              onClick={handleViewPost}
              disabled={loadingPermalink}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-[#c62737] hover:bg-red-50 disabled:opacity-60"
            >
              {loadingPermalink ? <Loader2 className="h-3 w-3 animate-spin" /> : <ExternalLink className="h-3 w-3" />}
              Ver postagem
            </button>
          )}
          {post.albumId && post.source === 'scheduled' && (
            <Link
              href={`/admin/galeria/${post.albumId}/post/create`}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
            >
              <Pencil className="h-3 w-3" /> Refazer
            </Link>
          )}
        </div>
      </div>
    </article>
  )
}

// ─────────────────────────────────────────────
// Month view grid
// ─────────────────────────────────────────────
function MonthGrid({
  year,
  month,
  postsByDay,
  selectedKey,
  onSelectKey,
}: {
  year: number
  month: number
  postsByDay: Map<string, UnifiedPost[]>
  selectedKey: string | null
  onSelectKey: (key: string) => void
}) {
  const today = toDateKey(new Date().toISOString())
  const days = useMemo(() => getMonthDays(year, month), [year, month])
  const currentMonthStr = `${year}-${String(month + 1).padStart(2, '0')}`

  return (
    <div>
      {/* Weekday headers */}
      <div className="mb-1 grid grid-cols-7">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="py-1.5 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            {label}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-px rounded-xl border border-slate-200 overflow-hidden bg-slate-200">
        {days.map((day) => {
          const key = toDateKey(day.toISOString())
          const isCurrentMonth = key.startsWith(currentMonthStr)
          const posts = postsByDay.get(key) ?? []
          const isToday = key === today
          const isSelected = key === selectedKey
          const maxVisible = 3

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectKey(key)}
              className={`group flex min-h-[80px] flex-col gap-0.5 p-1.5 text-left transition-colors
                ${isCurrentMonth ? 'bg-white' : 'bg-slate-50'}
                ${isSelected ? 'ring-2 ring-inset ring-[#c62737]' : 'hover:bg-slate-50'}
              `}
            >
              {/* Day number */}
              <div className="flex items-center justify-between">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold
                    ${isToday ? 'bg-[#c62737] text-white' : isCurrentMonth ? 'text-slate-700' : 'text-slate-300'}
                  `}
                >
                  {day.getDate()}
                </span>
                {posts.length > 0 && (
                  <span className="text-[10px] font-medium text-slate-400">{posts.length}</span>
                )}
              </div>

              {/* Mini cards */}
              <div className="flex flex-col gap-0.5">
                {posts.slice(0, maxVisible).map((p) => (
                  <MiniCard key={p.id} post={p} />
                ))}
                {posts.length > maxVisible && (
                  <span className="rounded px-1 text-[10px] font-medium text-slate-400">
                    +{posts.length - maxVisible} mais
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Week view grid
// ─────────────────────────────────────────────
function WeekGrid({
  weekStart,
  postsByDay,
  selectedKey,
  onSelectKey,
}: {
  weekStart: Date
  postsByDay: Map<string, UnifiedPost[]>
  selectedKey: string | null
  onSelectKey: (key: string) => void
}) {
  const today = toDateKey(new Date().toISOString())
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return d
  })

  return (
    <div className="grid grid-cols-7 gap-px rounded-xl border border-slate-200 overflow-hidden bg-slate-200">
      {days.map((day) => {
        const key = toDateKey(day.toISOString())
        const posts = postsByDay.get(key) ?? []
        const isToday = key === today
        const isSelected = key === selectedKey

        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelectKey(key)}
            className={`flex min-h-[120px] flex-col gap-1 bg-white p-2 text-left transition-colors hover:bg-slate-50
              ${isSelected ? 'ring-2 ring-inset ring-[#c62737]' : ''}
            `}
          >
            {/* Day label */}
            <div className="flex flex-col items-center pb-1 border-b border-slate-100 w-full">
              <span className="text-[10px] uppercase font-semibold text-slate-400">
                {day.toLocaleDateString('pt-BR', { weekday: 'short' })}
              </span>
              <span className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold
                ${isToday ? 'bg-[#c62737] text-white' : 'text-slate-700'}`}>
                {day.getDate()}
              </span>
            </div>
            {/* Cards */}
            <div className="flex flex-col gap-1">
              {posts.map((p) => (
                <MiniCard key={p.id} post={p} />
              ))}
            </div>
          </button>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────
// Legend
// ─────────────────────────────────────────────
function Legend() {
  const entries: Array<{ status: string }> = [
    { status: 'pending' },
    { status: 'published' },
    { status: 'failed' },
    { status: 'publishing' },
  ]
  return (
    <div className="flex flex-wrap items-center gap-3">
      {entries.map(({ status }) => {
        const cfg = STATUS_CFG[status]
        return (
          <span key={status} className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className={`h-2.5 w-2.5 rounded-full ${cfg.dotColor}`} />
            {cfg.label}
          </span>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────
export function PostsCalendar({
  scheduledItems,
  legacyItems,
  integrations = [],
  loading = false,
}: PostsCalendarProps) {
  const now = new Date()
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [selectedKey, setSelectedKey] = useState<string | null>(null)

  const allPosts = useMemo(
    () => mergeAll(scheduledItems, legacyItems),
    [scheduledItems, legacyItems]
  )

  const postsByDay = useMemo(() => {
    const map = new Map<string, UnifiedPost[]>()
    for (const post of allPosts) {
      const key = post.dateKey
      const arr = map.get(key) ?? []
      arr.push(post)
      map.set(key, arr)
    }
    return map
  }, [allPosts])

  const weekStart = useMemo(() => {
    const base = selectedKey ? new Date(selectedKey + 'T00:00:00') : now
    return getWeekStart(base)
  }, [selectedKey])

  const selectedPosts = useMemo(
    () => (selectedKey ? (postsByDay.get(selectedKey) ?? []) : []),
    [selectedKey, postsByDay]
  )

  function prevPeriod() {
    if (viewMode === 'month') {
      if (month === 0) { setMonth(11); setYear((y) => y - 1) }
      else setMonth((m) => m - 1)
    } else {
      const prev = new Date(weekStart)
      prev.setDate(prev.getDate() - 7)
      setYear(prev.getFullYear())
      setMonth(prev.getMonth())
      setSelectedKey(toDateKey(prev.toISOString()))
    }
  }

  function nextPeriod() {
    if (viewMode === 'month') {
      if (month === 11) { setMonth(0); setYear((y) => y + 1) }
      else setMonth((m) => m + 1)
    } else {
      const next = new Date(weekStart)
      next.setDate(next.getDate() + 7)
      setYear(next.getFullYear())
      setMonth(next.getMonth())
      setSelectedKey(toDateKey(next.toISOString()))
    }
  }

  function goToday() {
    const t = new Date()
    setYear(t.getFullYear())
    setMonth(t.getMonth())
    setSelectedKey(toDateKey(t.toISOString()))
  }

  // Stats for header
  const totalPosts = allPosts.length
  const pendingCount = allPosts.filter((p) => p.status === 'pending').length
  const publishedCount = allPosts.filter((p) => p.status === 'published').length
  const failedCount = allPosts.filter((p) => p.status === 'failed').length

  const periodLabel = viewMode === 'month'
    ? `${MONTH_NAMES[month]} ${year}`
    : (() => {
        const end = new Date(weekStart)
        end.setDate(end.getDate() + 6)
        return `${weekStart.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })}`
      })()

  return (
    <div className="flex flex-col gap-0 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#c62737]/10">
            <CalendarDays className="h-5 w-5 text-[#c62737]" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">Calendário de postagens</h2>
            <p className="text-xs text-slate-500">{totalPosts} no total · {pendingCount} programadas · {publishedCount} publicadas{failedCount > 0 ? ` · ${failedCount} com falha` : ''}</p>
          </div>
        </div>

        {/* View toggle */}
        <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
          <button type="button" onClick={() => setViewMode('month')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${viewMode === 'month' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
            <CalendarDays className="h-4 w-4" /> Mês
          </button>
          <button type="button" onClick={() => setViewMode('week')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${viewMode === 'week' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
            <LayoutGrid className="h-4 w-4" /> Semana
          </button>
        </div>
      </div>

      {/* ── Navigation bar ── */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-2.5">
        <div className="flex items-center gap-2">
          <button type="button" onClick={prevPeriod}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button type="button" onClick={nextPeriod}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors">
            <ChevronRight className="h-4 w-4" />
          </button>
          <span className="ml-1 text-sm font-semibold text-slate-800">{periodLabel}</span>
        </div>
        <div className="flex items-center gap-3">
          <Legend />
          <button type="button" onClick={goToday}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            Hoje
          </button>
        </div>
      </div>

      {/* ── Calendar grid ── */}
      <div className="p-4">
        {loading ? (
          <div className="flex min-h-[400px] items-center justify-center text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : viewMode === 'month' ? (
          <MonthGrid
            year={year}
            month={month}
            postsByDay={postsByDay}
            selectedKey={selectedKey}
            onSelectKey={(key) => setSelectedKey(selectedKey === key ? null : key)}
          />
        ) : (
          <WeekGrid
            weekStart={weekStart}
            postsByDay={postsByDay}
            selectedKey={selectedKey}
            onSelectKey={(key) => setSelectedKey(selectedKey === key ? null : key)}
          />
        )}
      </div>

      {/* ── Detail panel ── */}
      {selectedKey && (
        <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">
              {new Date(selectedKey + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              <span className="ml-2 text-xs font-normal text-slate-500">— {selectedPosts.length} postagem(ns)</span>
            </h3>
            <button type="button" onClick={() => setSelectedKey(null)}
              className="text-xs text-slate-400 hover:text-slate-600">Fechar</button>
          </div>
          {selectedPosts.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-400">Nenhuma postagem neste dia.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {selectedPosts.map((post) => (
                <DetailCard key={post.id} post={post} integrations={integrations} />
              ))}
            </div>
          )}
        </div>      )}
    </div>
  )
}