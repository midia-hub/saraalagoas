import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  CheckCircle2,
  Clock,
  XCircle,
  CalendarClock,
  Image as ImageIcon,
  Pencil,
  Heart,
  MessageCircle,
  Eye,
  Instagram,
  Facebook,
  Film,
  LayoutGrid,
  Layers,
  AlertCircle,
  UsersRound,
  ExternalLink,
  Loader2,
  ChevronDown,
} from 'lucide-react'
import { adminFetchJson } from '@/lib/admin-client'
import type { ScheduledItem } from './types'

// ─────────────────────────────────────────────
// Status config
// ─────────────────────────────────────────────
const STATUS_CONFIG: Record<
  string,
  { label: string; icon: typeof Clock; dot: string; bg: string; text: string; border: string }
> = {
  pending: {
    label: 'Programada',
    icon: CalendarClock,
    dot: 'bg-amber-400',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
  },
  publishing: {
    label: 'Publicando',
    icon: Clock,
    dot: 'bg-blue-400',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
  },
  published: {
    label: 'Publicada',
    icon: CheckCircle2,
    dot: 'bg-green-500',
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-200',
  },
  failed: {
    label: 'Falha',
    icon: XCircle,
    dot: 'bg-red-500',
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
  },
}

// ─────────────────────────────────────────────
// Post type config
// ─────────────────────────────────────────────
const POST_TYPE_CONFIG = {
  feed: {
    label: 'Publicação',
    icon: LayoutGrid,
    bg: 'bg-slate-700/80',
    text: 'text-white',
  },
  reel: {
    label: 'Reel',
    icon: Film,
    bg: 'bg-purple-600/90',
    text: 'text-white',
  },
  story: {
    label: 'Story',
    icon: Layers,
    bg: 'bg-pink-600/90',
    text: 'text-white',
  },
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function buildThumbnailUrl(post: ScheduledItem): string | null {
  const firstId = post.media_specs?.[0]?.id
  if (firstId) return `/api/gallery/image?fileId=${encodeURIComponent(firstId)}&mode=thumb&size=320`
  const firstUrl = post.media_specs?.[0]?.url
  if (typeof firstUrl === 'string' && /^https?:\/\//i.test(firstUrl)) return firstUrl
  return null
}

// ─────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────
type PostCardProps = {
  post: ScheduledItem
  thumbnailUrl?: string | null
  metrics?: { likes?: number; comments?: number; impressions?: number; reach?: number }
  integrations?: Array<{ value: string; label: string }>
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────
export function PostCard({ post, thumbnailUrl, metrics, integrations }: PostCardProps) {
  const config = STATUS_CONFIG[post.status] ?? STATUS_CONFIG.pending
  const StatusIcon = config.icon
  const gallery = post.galleries
  const title = gallery?.title ?? 'Postagem'
  const date = post.published_at || post.scheduled_at || post.created_at
  const thumb = thumbnailUrl ?? buildThumbnailUrl(post)
  const isStoryOrReel = post.post_type === 'story' || post.post_type === 'reel'

  // post_type display
  const [currentType, setCurrentType] = useState<string>(post.post_type ?? 'feed')
  const needsCorrection = post.post_type == null
  const [editingType, setEditingType] = useState(false)
  const [savingType, setSavingType] = useState(false)

  // view post
  const [loadingPermalink, setLoadingPermalink] = useState(false)

  const postTypeCfg =
    POST_TYPE_CONFIG[currentType as keyof typeof POST_TYPE_CONFIG] ?? POST_TYPE_CONFIG.feed
  const PostTypeIcon = postTypeCfg.icon

  const hasInstagram = post.destinations?.instagram !== false
  const hasFacebook = post.destinations?.facebook === true
  const mediaCount = post.media_specs?.length ?? 0

  // Encontrar nomes das contas baseado nos instance_ids
  const accountLabels = useMemo(() => {
    if (!post.instance_ids || !integrations) return []
    const ids = Array.isArray(post.instance_ids) ? post.instance_ids : []
    
    return ids.map(id => {
      // Limpar prefixos meta_ig: ou meta_fb: se existirem para bater com as integrações
      let cleanId = id
      if (id.includes(':')) cleanId = id.split(':').pop() || id
      
      const found = integrations.find(i => i.value === cleanId || i.value === id)
      return found ? found.label : (id.length > 8 ? id.slice(0, 8) : id)
    })
  }, [post.instance_ids, integrations])

  async function handleCorrectType(newType: string) {
    setSavingType(true)
    try {
      await adminFetchJson(`/api/social/scheduled/${post.id}`, {
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
    setLoadingPermalink(true)
    try {
      const res = await adminFetchJson<{ permalink?: string | null }>(`/api/admin/instagram/media-permalink?id=${encodeURIComponent(post.id)}`)
      if (res?.permalink) {
        window.open(res.permalink, '_blank', 'noopener,noreferrer')
      } else {
        window.open('https://www.instagram.com/', '_blank', 'noopener,noreferrer')
      }
    } catch {
      window.open('https://www.instagram.com/', '_blank', 'noopener,noreferrer')
    } finally {
      setLoadingPermalink(false)
    }
  }

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md hover:border-slate-300">
      {/* ── Thumbnail ── */}
      <div
        className="relative overflow-hidden bg-slate-100"
        style={{ aspectRatio: currentType === 'story' || currentType === 'reel' ? '9/16' : '1/1', maxHeight: currentType === 'story' || currentType === 'reel' ? '280px' : undefined }}
      >
        {thumb ? (
          <img
            src={thumb}
            alt=""
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full w-full min-h-[180px] items-center justify-center text-slate-300">
            <ImageIcon className="h-14 w-14" />
          </div>
        )}

        {/* Status badge — top left */}
        <div className="absolute left-2 top-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold shadow-sm ${config.bg} ${config.text} ${config.border}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
            {config.label}
          </span>
        </div>

        {/* Media count — top right */}
        {mediaCount > 1 && (
          <div className="absolute right-2 top-2">
            <span className="rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm">
              {mediaCount} fotos
            </span>
          </div>
        )}

        {/* Bottom overlay: post type + platforms */}
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-black/60 to-transparent p-2.5">
          {/* Post type tag + botão de correção (somente quando tipo era desconhecido) */}
          <div className="relative flex items-center gap-1">
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold backdrop-blur-sm ${postTypeCfg.bg} ${postTypeCfg.text}`}>
              <PostTypeIcon className="h-3 w-3" />
              {postTypeCfg.label}
            </span>
            {needsCorrection && (
              <button
                type="button"
                onClick={() => setEditingType((v) => !v)}
                title="Tipo não registrado — clique para corrigir"
                className="flex items-center gap-0.5 rounded-full bg-amber-400/90 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm hover:bg-amber-500 transition-colors"
              >
                {savingType ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <ChevronDown className="h-2.5 w-2.5" />}
                corrigir
              </button>
            )}
            {editingType && (
              <div className="absolute bottom-full left-0 mb-1 z-30 rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden min-w-[130px]">
                <div className="border-b border-slate-100 px-3 py-1.5">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Qual foi o tipo?</p>
                </div>
                {(['feed', 'reel', 'story'] as const).map((t) => {
                  const cfg = POST_TYPE_CONFIG[t]
                  const Icon = cfg.icon
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => handleCorrectType(t)}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-xs font-medium transition-colors hover:bg-slate-50 ${currentType === t && !needsCorrection ? 'bg-slate-100 text-slate-900' : 'text-slate-700'}`}
                    >
                      <Icon className="h-3 w-3" />
                      {cfg.label}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Platform icons */}
          <div className="flex items-center gap-1">
            {hasInstagram && (
              <span
                title="Instagram"
                className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 shadow"
              >
                <Instagram className="h-3.5 w-3.5 text-white" />
              </span>
            )}
            {hasFacebook && (
              <span
                title="Facebook"
                className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1877F2] shadow"
              >
                <Facebook className="h-3.5 w-3.5 text-white" />
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 flex-col gap-0 p-4">
        {/* Title */}
        <h3 className="line-clamp-1 font-semibold text-slate-900">{title}</h3>

        {/* Date */}
        <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
          <StatusIcon className="h-3 w-3 shrink-0" />
          {new Date(date).toLocaleString('pt-BR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>

        {/* Accounts/Integration Labels */}
        {accountLabels.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {accountLabels.map((lbl, idx) => (
              <span key={idx} className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                <UsersRound className="h-2.5 w-2.5" />
                {lbl}
              </span>
            ))}
          </div>
        )}

        {/* Caption */}
        {post.caption && (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-600">{post.caption}</p>
        )}

        {/* Metrics */}
        {(metrics?.likes != null || metrics?.comments != null || metrics?.impressions != null) && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {metrics.likes != null && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
                <Heart className="h-3 w-3" />
                {metrics.likes.toLocaleString('pt-BR')}
              </span>
            )}
            {metrics.comments != null && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">
                <MessageCircle className="h-3 w-3" />
                {metrics.comments.toLocaleString('pt-BR')}
              </span>
            )}
            {metrics.impressions != null && (
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-600">
                <Eye className="h-3 w-3" />
                {metrics.impressions.toLocaleString('pt-BR')}
              </span>
            )}
          </div>
        )}

        {/* Error */}
        {post.status === 'failed' && post.error_message && (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
            <p className="text-xs text-red-700 leading-relaxed">{post.error_message}</p>
          </div>
        )}

        {/* Actions */}
        <div className="mt-auto flex flex-wrap gap-2 pt-3">
          {/* Ver postagem — só para publicadas com IG */}}
          {post.status === 'published' && hasInstagram && post.result_payload?.instagramMediaId && (
            <button
              type="button"
              onClick={handleViewPost}
              disabled={loadingPermalink}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 px-3 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {loadingPermalink
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Abrindo...</>
                : <><ExternalLink className="h-3.5 w-3.5" /> Ver no Instagram</>
              }
            </button>
          )}

          {post.status === 'pending' ? (
            <Link
              href={
                post.album_id
                  ? `/admin/galeria/${post.album_id}/post/create`
                  : `/admin/midia/nova-postagem?replay=${post.id}`
              }
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#c62737] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#9e1f2e]"
            >
              <Pencil className="h-3.5 w-3.5" />
              Editar / reprogramar
            </Link>
          ) : (
            <Link
              href={
                post.album_id
                  ? `/admin/galeria/${post.album_id}/post/create?replay=${post.id}`
                  : `/admin/midia/nova-postagem?replay=${post.id}`
              }
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              <Pencil className="h-3.5 w-3.5" />
              Refazer postagem
            </Link>
          )}
        </div>
      </div>
    </article>
  )
}
