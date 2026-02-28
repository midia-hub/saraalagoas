'use client'

import { useEffect, useMemo, useState, type ElementType } from 'react'
import Link from 'next/link'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { AdminPageHeader } from '@/app/admin/AdminPageHeader'
import { adminFetchJson } from '@/lib/admin-client'
import {
  AlertCircle,
  BarChart2,
  Bookmark,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  Eye,
  Heart,
  Image as ImageIcon,
  Instagram,
  Loader2,
  MessageCircle,
  Search,
  SendHorizonal,
  Share2,
  TrendingUp,
  Users,
  Video,
  XCircle,
} from 'lucide-react'
import { Toast } from '@/components/Toast'
import { CustomSelect } from '@/components/ui/CustomSelect'
import { PostCard } from './_components/PostCard'
import { PostFilters } from './_components/PostFilters'
import type { DateRangeKey, LegacyPostItem, MetaIntegrationOption, ScheduledItem } from './_components/types'
import type { PostFiltersState } from './_components/PostFilters'

type IgInsights = {
  impressions?: number
  reach?: number
  saved?: number
  video_views?: number
  shares?: number
  total_interactions?: number
  profile_visits?: number
  follows?: number
}

type FbInsights = {
  impressions?: number
  impressions_unique?: number
  engaged_users?: number
  reactions?: number
  shares?: number
  clicks?: number
}

type IgPost = {
  id: string
  caption?: string
  media_type?: string
  media_url?: string
  thumbnail_url?: string
  timestamp: string
  permalink?: string
  like_count?: number
  comments_count?: number
  insights?: IgInsights
}

type FbPost = {
  id: string
  message?: string
  created_time: string
  full_picture?: string
  permalink_url?: string
  like_count?: number
  comments_count?: number
  shares_count?: number
  insights?: FbInsights
}

type IgTotals = {
  likes: number
  comments: number
  impressions: number
  reach: number
  saved: number
  shares: number
  video_views: number
  total_interactions: number
  profile_visits: number
  follows: number
}

type FbTotals = {
  likes: number
  comments: number
  shares: number
  impressions: number
  impressions_unique: number
  engaged_users: number
  clicks: number
}

type AccountInsightsData = {
  account: {
    id: string
    name: string
    instagram_username: string | null
    page_name: string | null
    has_instagram: boolean
    has_facebook: boolean
  }
  instagram: { posts: IgPost[]; totals: IgTotals; count: number }
  facebook: { posts: FbPost[]; totals: FbTotals; count: number }
  daysAgo: number
  errors?: string[]
}

const LEGACY_STATUS_CONFIG: Record<string, { label: string; icon: typeof Clock; className: string }> = {
  queued: { label: 'Na fila', icon: Clock, className: 'bg-amber-100 text-amber-800 border-amber-200' },
  running: { label: 'Publicando', icon: Clock, className: 'bg-blue-100 text-blue-800 border-blue-200' },
  publishing: { label: 'Publicando', icon: Clock, className: 'bg-blue-100 text-blue-800 border-blue-200' },
  published: { label: 'Publicada', icon: CheckCircle2, className: 'bg-green-100 text-green-800 border-green-200' },
  failed: { label: 'Falha', icon: XCircle, className: 'bg-red-100 text-red-800 border-red-200' },
  pending: { label: 'Programada', icon: CalendarClock, className: 'bg-slate-100 text-slate-800 border-slate-200' },
}

const COLOR_MAP = {
  red: 'bg-red-50 text-red-700',
  blue: 'bg-blue-50 text-blue-700',
  green: 'bg-green-50 text-green-700',
  purple: 'bg-purple-50 text-purple-700',
  indigo: 'bg-indigo-50 text-indigo-700',
  amber: 'bg-amber-50 text-amber-700',
  pink: 'bg-pink-50 text-pink-700',
  teal: 'bg-teal-50 text-teal-700',
} as const

function MetricBadge({
  icon: Icon,
  value,
  color,
  label,
}: {
  icon: ElementType
  value: number
  color: keyof typeof COLOR_MAP
  label?: string
}) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${COLOR_MAP[color]}`}>
      <Icon className="h-3 w-3" />
      {value.toLocaleString('pt-BR')}
      {label && <span className="opacity-70">{label}</span>}
    </span>
  )
}

function filterByDateRange(items: ScheduledItem[], range: DateRangeKey): ScheduledItem[] {
  if (range === 'all') return items
  const now = new Date()
  let start: Date
  if (range === '7d') {
    start = new Date(now)
    start.setDate(start.getDate() - 7)
  } else if (range === '30d') {
    start = new Date(now)
    start.setDate(start.getDate() - 30)
  } else if (range === 'month') {
    start = new Date(now.getFullYear(), now.getMonth(), 1)
  } else if (range === 'last_month') {
    start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)
    return items.filter((p) => {
      const at = new Date(p.scheduled_at)
      return at >= start && at <= end
    })
  } else {
    return items
  }
  return items.filter((p) => new Date(p.scheduled_at) >= start)
}

export default function AdminInstagramPostsPage() {
  const [legacyItems, setLegacyItems] = useState<LegacyPostItem[]>([])
  const [scheduledItems, setScheduledItems] = useState<ScheduledItem[]>([])
  const [integrations, setIntegrations] = useState<MetaIntegrationOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [runningQueue, setRunningQueue] = useState(false)
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [accountDaysAgo, setAccountDaysAgo] = useState('30')
  const [accountInsightsData, setAccountInsightsData] = useState<AccountInsightsData | null>(null)
  const [loadingAccountInsights, setLoadingAccountInsights] = useState(false)
  const [showLegacy, setShowLegacy] = useState(false)
  const [filters, setFilters] = useState<PostFiltersState>({
    status: 'all',
    dateRange: 'all',
    accountId: '',
  })
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'ok' | 'err' }>({
    visible: false,
    message: '',
    type: 'ok',
  })

  function showToast(message: string, type: 'ok' | 'err') {
    setToast({ visible: true, message, type })
  }

  function loadPosts() {
    setLoading(true)
    adminFetchJson<LegacyPostItem[]>('/api/admin/instagram/posts')
      .then((data) => setLegacyItems(Array.isArray(data) ? data : []))
      .catch(() => setError('Não foi possível carregar as publicações. Tente novamente.'))
      .finally(() => setLoading(false))
  }

  function loadScheduled() {
    adminFetchJson<ScheduledItem[]>('/api/social/scheduled')
      .then((data) => setScheduledItems(Array.isArray(data) ? data : []))
      .catch(() => {})
  }

  function loadIntegrations() {
    adminFetchJson<
      | Array<{ id: string; page_name?: string; instagram_username?: string }>
      | { integrations?: Array<{ id: string; page_name?: string; instagram_username?: string }> }
    >('/api/meta/integrations')
      .then((response) => {
        const rows = Array.isArray(response) ? response : response?.integrations ?? []
        setIntegrations(
          rows
            .filter((r) => Boolean(r?.id && r.id.trim()))
            .map((r) => ({
              value: r.id,
              label: r.instagram_username || r.page_name || r.id.slice(0, 8),
            }))
        )
      })
      .catch(() => {
        setIntegrations([])
      })
  }

  useEffect(() => {
    loadPosts()
    loadScheduled()
    loadIntegrations()
  }, [])

  async function handleRunQueue() {
    setRunningQueue(true)
    setError(null)
    try {
      await adminFetchJson('/api/admin/instagram/jobs/run-due', { method: 'POST' })
      await adminFetchJson('/api/social/run-scheduled', { method: 'POST' })
      loadPosts()
      loadScheduled()
      showToast('Fila processada. As postagens foram publicadas.', 'ok')
    } catch {
      setError('Não foi possível processar a fila. Tente novamente.')
      showToast('Erro ao processar a fila.', 'err')
    } finally {
      setRunningQueue(false)
    }
  }

  async function loadAccountInsights() {
    if (!selectedAccountId) {
      showToast('Selecione uma conta antes de buscar.', 'err')
      return
    }
    setLoadingAccountInsights(true)
    setAccountInsightsData(null)
    try {
      const res = await adminFetchJson<AccountInsightsData>(
        `/api/meta/account-posts?integrationId=${encodeURIComponent(selectedAccountId)}&daysAgo=${accountDaysAgo}`
      )
      setAccountInsightsData(res)
      if (res.errors?.length) {
        showToast(`Carregado com avisos: ${res.errors.join('; ')}`, 'err')
      } else {
        showToast(`${res.instagram.count} postagem(ns) do Instagram carregada(s).`, 'ok')
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao buscar insights.'
      showToast(msg, 'err')
    } finally {
      setLoadingAccountInsights(false)
    }
  }

  const filteredScheduled = useMemo(() => {
    let list = scheduledItems
    const normalizeIntegrationId = (raw: string) => {
      let value = raw.trim()
      while (value.startsWith('meta_ig:') || value.startsWith('meta_fb:')) {
        value = value.slice(value.indexOf(':') + 1).trim()
      }
      return value
    }
    if (filters.status !== 'all') {
      list = list.filter((p) => p.status === filters.status)
    }
    if (filters.accountId) {
      list = list.filter((p) => {
        const ids = Array.isArray(p.instance_ids) ? p.instance_ids : []
        return ids.some((id) => normalizeIntegrationId(id).includes(filters.accountId))
      })
    }
    return filterByDateRange(list, filters.dateRange as DateRangeKey)
  }, [scheduledItems, filters])

  const scheduledPending = scheduledItems.filter(
    (s) => s.status === 'pending' && new Date(s.scheduled_at).getTime() <= Date.now()
  ).length
  const legacyPending = legacyItems.filter((i) => i.status === 'queued' || i.status === 'running').length
  const hasPending = legacyPending > 0 || scheduledPending > 0

  return (
    <PageAccessGuard pageKey="instagram">
      <div className="space-y-6 p-4 md:p-8">
        <AdminPageHeader
          icon={Instagram}
          title="Painel de publicações"
          subtitle="Gerencie e analise suas postagens no Instagram e Facebook."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              {hasPending && (
                <button
                  type="button"
                  onClick={handleRunQueue}
                  disabled={runningQueue}
                  className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 transition-colors hover:bg-amber-100 disabled:opacity-50"
                >
                  {runningQueue ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizonal className="h-4 w-4" />}
                  {runningQueue ? 'Processando…' : 'Publicar agendadas agora'}
                </button>
              )}
              <Link
                href="/admin/midia/nova-postagem"
                className="inline-flex items-center gap-2 rounded-xl bg-[#c62737] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#9e1f2e]"
              >
                + Nova postagem
              </Link>
            </div>
          }
        />

        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {hasPending && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-medium text-amber-800">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {scheduledPending > 0 && `${scheduledPending} postagem(ns) agendada(s) aguardando publicação`}
              {legacyPending > 0 && scheduledPending > 0 && ' · '}
              {legacyPending > 0 && `${legacyPending} na fila legada`}
            </div>
            <button
              type="button"
              onClick={handleRunQueue}
              disabled={runningQueue}
              className="shrink-0 rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-amber-700 disabled:opacity-50"
            >
              {runningQueue ? 'Publicando…' : 'Publicar agora'}
            </button>
          </div>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-4 rounded-t-2xl border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#c62737]/10">
                <BarChart2 className="h-5 w-5 text-[#c62737]" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">Insights por conta</h2>
                <p className="text-xs text-slate-500">Métricas detalhadas de curtidas, alcance, impressões e mais</p>
              </div>
            </div>
          </div>

          <div className="space-y-5 px-6 py-5">
            <div className="flex flex-wrap items-end gap-4">
              <div className="min-w-[220px] flex-1">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Conta</label>
                <CustomSelect
                  value={selectedAccountId}
                  onChange={(v) => {
                    setSelectedAccountId(v)
                    setAccountInsightsData(null)
                  }}
                  options={integrations.map((i) => ({ value: i.value, label: i.label }))}
                  placeholder={integrations.length === 0 ? 'Sem contas conectadas' : 'Selecione uma conta…'}
                  allowEmpty={false}
                  disabled={integrations.length === 0}
                />
              </div>
              <div className="w-44">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Período</label>
                <CustomSelect
                  value={accountDaysAgo}
                  onChange={setAccountDaysAgo}
                  options={[
                    { value: '7', label: 'Últimos 7 dias' },
                    { value: '15', label: 'Últimos 15 dias' },
                    { value: '30', label: 'Últimos 30 dias' },
                    { value: '60', label: 'Últimos 60 dias' },
                    { value: '90', label: 'Últimos 90 dias' },
                  ]}
                  allowEmpty={false}
                />
              </div>
              <button
                type="button"
                onClick={loadAccountInsights}
                disabled={loadingAccountInsights || !selectedAccountId}
                className="inline-flex h-[44px] items-center gap-2 rounded-xl bg-[#c62737] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#9e1f2e] disabled:opacity-40"
              >
                {loadingAccountInsights ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                {loadingAccountInsights ? 'Buscando…' : 'Buscar insights'}
              </button>
            </div>

            {(accountInsightsData?.errors?.length ?? 0) > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                {(accountInsightsData?.errors ?? []).map((err, i) => (
                  <p key={i}>{err}</p>
                ))}
              </div>
            )}

            {accountInsightsData && (
              <div className="rounded-2xl border border-slate-200 bg-white">
                <div className="rounded-t-2xl border-b border-slate-100 bg-slate-50 px-5 py-4">
                  <h3 className="text-sm font-semibold text-slate-900">Resumo — {accountInsightsData.account.name}</h3>
                  <p className="mt-0.5 text-xs text-slate-500">Últimos {accountInsightsData.daysAgo} dias · {accountInsightsData.instagram.count} Instagram</p>
                </div>

                {accountInsightsData.instagram.count > 0 && (
                  <div className="border-b border-slate-100 px-6 py-5">
                    <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <Instagram className="h-4 w-4" /> Instagram — totais do período
                    </p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                      {([
                        { icon: Heart, label: 'Curtidas', value: accountInsightsData.instagram.totals.likes, bg: 'bg-red-50', text: 'text-red-600' },
                        { icon: MessageCircle, label: 'Comentários', value: accountInsightsData.instagram.totals.comments, bg: 'bg-blue-50', text: 'text-blue-600' },
                        { icon: Share2, label: 'Compart.', value: accountInsightsData.instagram.totals.shares, bg: 'bg-green-50', text: 'text-green-600' },
                        { icon: Eye, label: 'Impressões', value: accountInsightsData.instagram.totals.impressions, bg: 'bg-purple-50', text: 'text-purple-600' },
                        { icon: TrendingUp, label: 'Alcance', value: accountInsightsData.instagram.totals.reach, bg: 'bg-indigo-50', text: 'text-indigo-600' },
                        { icon: Bookmark, label: 'Salvos', value: accountInsightsData.instagram.totals.saved, bg: 'bg-amber-50', text: 'text-amber-600' },
                        { icon: Video, label: 'Views vídeo', value: accountInsightsData.instagram.totals.video_views, bg: 'bg-pink-50', text: 'text-pink-600' },
                        { icon: Users, label: 'Visitas perfil', value: accountInsightsData.instagram.totals.profile_visits, bg: 'bg-teal-50', text: 'text-teal-600' },
                        { icon: Users, label: 'Novos seg.', value: accountInsightsData.instagram.totals.follows, bg: 'bg-slate-100', text: 'text-slate-600' },
                        { icon: BarChart2, label: 'Interações', value: accountInsightsData.instagram.totals.total_interactions, bg: 'bg-rose-50', text: 'text-[#c62737]' },
                      ] as { icon: ElementType; label: string; value: number; bg: string; text: string }[])
                        .filter((metric) => metric.value > 0)
                        .map(({ icon: Icon, label, value, bg, text }) => (
                        <div key={label} className={`flex flex-col items-center rounded-2xl ${bg} p-3 text-center`}>
                          <Icon className={`mb-1.5 h-5 w-5 ${text}`} />
                          <p className="text-base font-bold text-slate-900">{value.toLocaleString('pt-BR')}</p>
                          <p className="text-[11px] text-slate-500">{label}</p>
                        </div>
                        ))}
                    </div>
                  </div>
                )}

              </div>
            )}

            {accountInsightsData && (
              <div className="rounded-2xl border border-slate-200 bg-white">
                <div className="border-b border-slate-100 px-6 py-4">
                  <p className="flex items-center gap-1.5 text-sm font-medium text-[#c62737]">
                    <Instagram className="h-4 w-4" /> Instagram ({accountInsightsData.instagram.count})
                  </p>
                </div>

                <div className="px-6 py-5">
                  {accountInsightsData.instagram.count === 0 ? (
                    <p className="text-sm text-slate-500">Nenhuma postagem do Instagram no período.</p>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {accountInsightsData.instagram.posts.map((post) => (
                        <article key={post.id} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                          {(post.media_url || post.thumbnail_url) && (
                            <div className="aspect-video bg-slate-100">
                              <img src={post.media_url || post.thumbnail_url} alt="" className="h-full w-full object-cover" />
                            </div>
                          )}
                          <div className="p-4">
                            <p className="line-clamp-3 text-sm text-slate-700">{post.caption || '—'}</p>
                            <p className="mt-1 text-xs text-slate-500">{new Date(post.timestamp).toLocaleString('pt-BR')}</p>
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {(post.like_count ?? 0) > 0 && <MetricBadge icon={Heart} value={post.like_count ?? 0} color="red" />}
                              {(post.comments_count ?? 0) > 0 && <MetricBadge icon={MessageCircle} value={post.comments_count ?? 0} color="blue" />}
                              {(post.insights?.shares ?? 0) > 0 && <MetricBadge icon={Share2} value={post.insights?.shares ?? 0} color="green" />}
                              {(post.insights?.reach ?? 0) > 0 && <MetricBadge icon={TrendingUp} value={post.insights?.reach ?? 0} color="indigo" label="alcance" />}
                              {(post.insights?.impressions ?? 0) > 0 && <MetricBadge icon={Eye} value={post.insights?.impressions ?? 0} color="purple" label="imp." />}
                              {(post.insights?.saved ?? 0) > 0 && <MetricBadge icon={Bookmark} value={post.insights?.saved ?? 0} color="amber" />}
                              {(post.insights?.video_views ?? 0) > 0 && <MetricBadge icon={Video} value={post.insights?.video_views ?? 0} color="pink" label="views" />}
                              {(post.insights?.profile_visits ?? 0) > 0 && <MetricBadge icon={Users} value={post.insights?.profile_visits ?? 0} color="teal" label="visitas" />}
                            </div>
                            {post.permalink && (
                              <a href={post.permalink} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs text-[#c62737] hover:underline">
                                Ver no Instagram <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {scheduledItems.length > 0 && (
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-4 rounded-t-2xl border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50">
                  <CalendarClock className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Postagens programadas</h2>
                  <p className="text-xs text-slate-500">{scheduledItems.length} postagem(ns) no total</p>
                </div>
              </div>
            </div>
            <div className="px-6 py-5">
              <div className="mb-4">
                <PostFilters
                  filters={filters}
                  onFiltersChange={(next) => setFilters((f) => ({ ...f, ...next }))}
                  integrations={integrations}
                  forScheduled
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredScheduled.map((s) => <PostCard key={s.id} post={s} />)}
              </div>
              {filteredScheduled.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center">
                  <p className="text-sm text-slate-400">Nenhuma postagem com os filtros selecionados.</p>
                </div>
              )}
            </div>
          </section>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <button
            type="button"
            onClick={() => setShowLegacy((v) => !v)}
            className="flex w-full items-center justify-between gap-4 rounded-2xl px-6 py-4 text-left transition-colors hover:bg-slate-50"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100">
                <SendHorizonal className="h-5 w-5 text-slate-500" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">Publicações da fila legada</h2>
                <p className="text-xs text-slate-500">
                  {loading ? 'Carregando…' : `${legacyItems.length} publicação(ões)`}
                  {legacyPending > 0 && (
                    <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                      {legacyPending} pendente(s)
                    </span>
                  )}
                </p>
              </div>
            </div>
            {showLegacy ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
          </button>

          {showLegacy && (
            <div className="border-t border-slate-100 px-6 pb-6 pt-4">
              {loading ? (
                <div className="flex items-center justify-center py-8 text-slate-400">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : legacyItems.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center">
                  <p className="text-sm text-slate-400">Nenhuma publicação na fila legada.</p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {legacyItems.map((item) => {
                    const gallery = item.instagram_post_drafts?.galleries ?? item.instagram_post_drafts?.gallery
                    const config = LEGACY_STATUS_CONFIG[item.status] ?? LEGACY_STATUS_CONFIG.queued
                    const Icon = config.icon
                    const assets = item.instagram_post_drafts?.instagram_post_assets
                    const sorted = assets ? [...assets].sort((a, b) => a.sort_order - b.sort_order) : []
                    const first = sorted[0]
                    const thumbUrl = first?.final_url || first?.source_url
                    const url = thumbUrl?.startsWith('drive:') ? null : thumbUrl ?? null
                    const date = item.published_at || item.run_at || item.created_at
                    const mediaId = item.result_payload?.mediaId
                    const permalink = mediaId && !mediaId.startsWith('media_') ? `https://www.instagram.com/p/${mediaId}/` : null

                    return (
                      <article key={item.id} className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
                        <div className="relative aspect-square bg-slate-100">
                          {url ? (
                            <img src={url} alt="" className="h-full w-full object-cover" sizes="(max-width: 640px) 100vw, 33vw" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-slate-300">
                              <ImageIcon className="h-10 w-10" />
                            </div>
                          )}
                          <span className={`absolute right-2 top-2 flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium ${config.className}`}>
                            <Icon className="h-3.5 w-3.5" />{config.label}
                          </span>
                        </div>
                        <div className="flex flex-1 flex-col p-4">
                          <h3 className="line-clamp-1 font-semibold text-slate-900">{gallery ? gallery.title : 'Sem galeria'}</h3>
                          <p className="mt-0.5 text-xs text-slate-500">{gallery ? `${gallery.type} · ${gallery.date}` : ''}</p>
                          <p className="mt-1 text-sm text-slate-600">{item.instagram_instances?.name || 'Sem conta'}</p>
                          <p className="mt-0.5 text-xs text-slate-400">{date ? new Date(date).toLocaleString('pt-BR') : '-'}</p>
                          {item.status === 'failed' && (
                            <p className="mt-2 rounded-lg border border-red-100 bg-red-50 px-2 py-1.5 text-xs text-red-700">Falha na publicação.</p>
                          )}
                          {permalink && (
                            <a href={permalink} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[#c62737] hover:underline">
                              Ver no Instagram <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </article>
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
