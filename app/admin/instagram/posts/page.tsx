'use client'

import { useEffect, useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { AdminPageHeader } from '@/app/admin/AdminPageHeader'
import { adminFetchJson } from '@/lib/admin-client'
import {
  CheckCircle2,
  Clock,
  XCircle,
  ExternalLink,
  Image as ImageIcon,
  Filter,
  CalendarClock,
  Loader2,
  List,
  CalendarDays,
  GitBranch,
  Instagram,
  Facebook,
  RefreshCw,
} from 'lucide-react'
import { Toast } from '@/components/Toast'
import { PostCard } from './_components/PostCard'
import type { ScheduledItem, LegacyPostItem, MetaIntegrationOption } from './_components/types'
import type { DateRangeKey } from './_components/types'
import type { PostFiltersState } from './_components/PostFilters'

const PostFilters = dynamic(() => import('./_components/PostFilters').then((m) => ({ default: m.PostFilters })), { ssr: false })
const PostsCalendar = dynamic(() => import('./_components/PostsCalendar').then((m) => ({ default: m.PostsCalendar })), { ssr: false })
const WorkflowStepsFlow = dynamic(() => import('./_components/WorkflowStepsFlow').then((m) => ({ default: m.WorkflowStepsFlow })), { ssr: false })

const LEGACY_STATUS_CONFIG: Record<
  string,
  { label: string; icon: typeof Clock; className: string }
> = {
  queued: { label: 'Na fila', icon: Clock, className: 'bg-amber-100 text-amber-800 border-amber-200' },
  running: { label: 'Publicando', icon: Clock, className: 'bg-blue-100 text-blue-800 border-blue-200' },
  publishing: { label: 'Publicando', icon: Clock, className: 'bg-blue-100 text-blue-800 border-blue-200' },
  published: { label: 'Publicada', icon: CheckCircle2, className: 'bg-green-100 text-green-800 border-green-200' },
  failed: { label: 'Falha', icon: XCircle, className: 'bg-red-100 text-red-800 border-red-200' },
  pending: { label: 'Programada', icon: CalendarClock, className: 'bg-slate-100 text-slate-800 border-slate-200' },
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
  const [mainTab, setMainTab] = useState<'list' | 'calendar' | 'workflow'>('list')
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
  type RecentMetaItem = {
    id: string
    caption?: string
    message?: string
    media_url?: string
    thumbnail_url?: string
    full_picture?: string
    timestamp?: string
    created_time?: string
    permalink?: string
    permalink_url?: string
    account_name?: string
    like_count?: number
    comments_count?: number
  }
  const [recentFromMeta, setRecentFromMeta] = useState<{
    instagram: RecentMetaItem[]
    facebook: RecentMetaItem[]
    errors?: string[]
  } | null>(null)
  const [loadingRecentMeta, setLoadingRecentMeta] = useState(false)

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
    adminFetchJson<Array<{ id: string; page_name?: string; instagram_username?: string }>>('/api/meta/integrations')
      .then((rows) => {
        setIntegrations(
          (rows || []).map((r) => ({
            value: r.id,
            label: r.instagram_username || r.page_name || r.id.slice(0, 8),
          }))
        )
      })
      .catch(() => {})
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

  async function loadRecentPostsFromMeta() {
    setLoadingRecentMeta(true)
    setRecentFromMeta(null)
    try {
      const res = await adminFetchJson<{
        instagram: RecentMetaItem[]
        facebook: RecentMetaItem[]
        errors?: string[]
      }>('/api/meta/recent-posts')
      setRecentFromMeta({
        instagram: res?.instagram ?? [],
        facebook: res?.facebook ?? [],
        errors: res?.errors,
      })
      if (res?.errors?.length) {
        showToast(`Carregado com avisos: ${res.errors.length} conta(s) com erro.`, 'err')
      } else {
        const total = (res?.instagram?.length ?? 0) + (res?.facebook?.length ?? 0)
        showToast(`${total} postagem(ns) dos últimos 30 dias carregada(s).`, 'ok')
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao buscar postagens nas redes.'
      showToast(msg, 'err')
    } finally {
      setLoadingRecentMeta(false)
    }
  }

  async function handleReschedule(postId: string, newScheduledAt: string) {
    try {
      await adminFetchJson<{ ok?: boolean; message?: string }>(`/api/social/scheduled/${postId}`, {
        method: 'PATCH',
        body: JSON.stringify({ scheduled_at: newScheduledAt }),
      })
      loadScheduled()
      showToast('Postagem reprogramada com sucesso.', 'ok')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao reprogramar.'
      showToast(msg, 'err')
    }
  }

  const filteredScheduled = useMemo(() => {
    let list = scheduledItems
    if (filters.status !== 'all') {
      list = list.filter((p) => p.status === filters.status)
    }
    if (filters.accountId) {
      list = list.filter((p) => {
        const ids = Array.isArray(p.instance_ids) ? p.instance_ids : []
        return ids.some((id) => id.includes(filters.accountId))
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
      <div className="p-6 md:p-8">
        <AdminPageHeader
          icon={Instagram}
          title="Painel de publicações"
          subtitle="Acompanhe postagens conectadas ao Instagram e Facebook, métricas e programação."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              {hasPending && (
                <button
                  type="button"
                  onClick={handleRunQueue}
                  disabled={runningQueue}
                  className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50"
                >
                  {runningQueue ? (
                    <>
                      <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                      Processando…
                    </>
                  ) : (
                    'Processar fila agora'
                  )}
                </button>
              )}
              <Link
                href="/admin/galeria"
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Nova postagem
              </Link>
            </div>
          }
        />

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">
            {error}
          </div>
        )}

        {/* Aba principal: Lista | Calendário */}
        <div className="mt-6 flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-slate-50/80 p-1">
          <button
            type="button"
            onClick={() => setMainTab('list')}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              mainTab === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <List className="h-4 w-4" />
            Lista
          </button>
          <button
            type="button"
            onClick={() => setMainTab('calendar')}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              mainTab === 'calendar' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarDays className="h-4 w-4" />
            Calendário
          </button>
          <button
            type="button"
            onClick={() => setMainTab('workflow')}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              mainTab === 'workflow' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <GitBranch className="h-4 w-4" />
            Fluxo de aprovação
          </button>
        </div>

        {mainTab === 'calendar' && (
          <div className="mt-6">
            <PostsCalendar
              posts={scheduledItems}
              onReschedule={handleReschedule}
            />
          </div>
        )}

        {mainTab === 'workflow' && (
          <div className="mt-6 space-y-6">
            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-lg font-semibold text-slate-900">Etapas do fluxo de aprovação</h2>
              <p className="mb-4 text-sm text-slate-600">
                Cada postagem passa por: demanda → artes → copywriting → aprovação interna → aprovação externa → programação → publicação.
                E-mails automáticos notificam os responsáveis ao final de cada etapa.
              </p>
              <WorkflowStepsFlow className="w-full" />
            </section>
          </div>
        )}

        {mainTab === 'list' && (
          <>
            {/* Filtros para postagens programadas */}
            {scheduledItems.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <PostFilters
                  filters={filters}
                  onFiltersChange={(next) => setFilters((f) => ({ ...f, ...next }))}
                  integrations={integrations}
                  forScheduled
                />
              </div>
            )}

            {/* Bloco: Postagens programadas (cards) */}
            {scheduledItems.length > 0 && (
              <section className="mt-6">
                <h2 className="mb-3 text-lg font-semibold text-slate-900">Postagens programadas</h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredScheduled.map((s) => (
                    <PostCard key={s.id} post={s} />
                  ))}
                </div>
                {filteredScheduled.length === 0 && (
                  <p className="rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-500">
                    Nenhuma postagem encontrada com os filtros selecionados.
                  </p>
                )}
              </section>
            )}

            {/* Bloco: Postagens nas redes (API Meta – últimos 30 dias) */}
            <section className="mt-8">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-slate-900">
                  Postagens nas redes (últimos 30 dias)
                </h2>
                <button
                  type="button"
                  onClick={loadRecentPostsFromMeta}
                  disabled={loadingRecentMeta}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  {loadingRecentMeta ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  {loadingRecentMeta ? 'Buscando…' : 'Buscar postagens nas redes'}
                </button>
              </div>
              {(recentFromMeta?.errors?.length ?? 0) > 0 && (
                <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  {(recentFromMeta?.errors ?? []).map((err, i) => (
                    <p key={i}>{err}</p>
                  ))}
                </div>
              )}
              {(recentFromMeta?.instagram?.length ?? 0) > 0 && (
                <div className="mb-4">
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Instagram className="h-4 w-4" /> Instagram
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {(recentFromMeta?.instagram ?? []).map((item) => (
                      <article
                        key={item.id}
                        className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                      >
                        <div className="aspect-square bg-slate-100">
                          {(item.thumbnail_url || item.media_url) ? (
                            <img
                              src={item.thumbnail_url || item.media_url}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-slate-400">
                              <ImageIcon className="h-12 w-12" />
                            </div>
                          )}
                        </div>
                        <div className="flex flex-1 flex-col p-4">
                          <p className="text-xs text-slate-500">{item.account_name}</p>
                          <p className="mt-1 line-clamp-2 text-sm text-slate-700">
                            {item.caption || '—'}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {item.timestamp
                              ? new Date(item.timestamp).toLocaleString('pt-BR')
                              : ''}
                          </p>
                          {(item.like_count != null || item.comments_count != null) && (
                            <p className="mt-1 text-xs text-slate-600">
                              {item.like_count != null && `${item.like_count} curtidas`}
                              {item.like_count != null && item.comments_count != null && ' · '}
                              {item.comments_count != null && `${item.comments_count} comentários`}
                            </p>
                          )}
                          {item.permalink && (
                            <a
                              href={item.permalink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-2 inline-flex items-center gap-1 text-sm text-[#c62737] hover:underline"
                            >
                              Ver no Instagram <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              )}
              {(recentFromMeta?.facebook?.length ?? 0) > 0 && (
                <div>
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Facebook className="h-4 w-4" /> Facebook
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {(recentFromMeta?.facebook ?? []).map((item) => (
                      <article
                        key={item.id}
                        className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                      >
                        <div className="aspect-square bg-slate-100">
                          {item.full_picture ? (
                            <img
                              src={item.full_picture}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-slate-400">
                              <ImageIcon className="h-12 w-12" />
                            </div>
                          )}
                        </div>
                        <div className="flex flex-1 flex-col p-4">
                          <p className="text-xs text-slate-500">{item.account_name}</p>
                          <p className="mt-1 line-clamp-2 text-sm text-slate-700">
                            {item.message || '—'}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {(item.created_time || item.timestamp)
                              ? new Date(item.created_time || item.timestamp || '').toLocaleString(
                                  'pt-BR'
                                )
                              : ''}
                          </p>
                          {item.permalink_url && (
                            <a
                              href={item.permalink_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-2 inline-flex items-center gap-1 text-sm text-[#c62737] hover:underline"
                            >
                              Ver no Facebook <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              )}
              {recentFromMeta && !recentFromMeta.instagram?.length && !recentFromMeta.facebook?.length && !loadingRecentMeta && (
                <p className="rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-500">
                  Nenhuma postagem encontrada nos últimos 30 dias. Conecte contas em Configurações do Instagram/Facebook.
                </p>
              )}
            </section>

            {/* Bloco: Publicações da fila legada */}
            <section className="mt-8">
              <h2 className="mb-3 text-lg font-semibold text-slate-900">Publicações da fila</h2>
              {loading ? (
                <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
                  Carregando publicações...
                </div>
              ) : legacyItems.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
                  <Filter className="mx-auto h-12 w-12 text-slate-300" />
                  <p className="mt-2 text-slate-600">Nenhuma publicação na fila legada.</p>
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
                    const permalink = mediaId && !mediaId.startsWith('media_')
                      ? `https://www.instagram.com/p/${mediaId}/`
                      : null

                    return (
                      <article
                        key={item.id}
                        className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
                      >
                        <div className="relative aspect-square bg-slate-100">
                          {url ? (
                            <img
                              src={url}
                              alt=""
                              className="h-full w-full object-cover"
                              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-slate-400">
                              <ImageIcon className="h-12 w-12" />
                            </div>
                          )}
                          <span
                            className={`absolute right-2 top-2 flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium ${config.className}`}
                          >
                            <Icon className="h-3.5 w-3.5" />
                            {config.label}
                          </span>
                        </div>
                        <div className="flex flex-1 flex-col p-4">
                          <h3 className="font-semibold text-slate-900 line-clamp-1">
                            {gallery ? gallery.title : 'Sem galeria'}
                          </h3>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {gallery ? `${gallery.type} · ${gallery.date}` : ''}
                          </p>
                          <p className="mt-1 text-sm text-slate-600">
                            {item.instagram_instances?.name || 'Sem conta'}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {date ? new Date(date).toLocaleString('pt-BR') : '-'}
                          </p>
                          {item.status === 'failed' && (
                            <p className="mt-2 rounded border border-red-100 bg-red-50 px-2 py-1.5 text-xs text-red-700">
                              Falha na publicação. Tente novamente.
                            </p>
                          )}
                          <div className="mt-auto flex flex-wrap gap-2 pt-3">
                            {permalink && (
                              <a
                                href={permalink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                              >
                                Ver no Instagram
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}
            </section>
          </>
        )}
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
