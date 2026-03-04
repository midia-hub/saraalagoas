'use client'

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
} from 'lucide-react'
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
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────
export function PostCard({ post, thumbnailUrl, metrics }: PostCardProps) {
  const config = STATUS_CONFIG[post.status] ?? STATUS_CONFIG.pending
  const StatusIcon = config.icon
  const gallery = post.galleries
  const title = gallery?.title ?? 'Postagem'
  const date = post.published_at || post.scheduled_at || post.created_at
  const thumb = thumbnailUrl ?? buildThumbnailUrl(post)
  const isStoryOrReel = post.post_type === 'story' || post.post_type === 'reel'

  const postTypeCfg =
    POST_TYPE_CONFIG[(post.post_type ?? 'feed') as keyof typeof POST_TYPE_CONFIG] ??
    POST_TYPE_CONFIG.feed
  const PostTypeIcon = postTypeCfg.icon

  const hasInstagram = post.destinations?.instagram !== false
  const hasFacebook = post.destinations?.facebook === true
  const mediaCount = post.media_specs?.length ?? 0

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md hover:border-slate-300">
      {/* ── Thumbnail ── */}
      <div
        className="relative overflow-hidden bg-slate-100"
        style={{ aspectRatio: isStoryOrReel ? '9/16' : '1/1', maxHeight: isStoryOrReel ? '280px' : undefined }}
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
          {/* Post type tag */}
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold backdrop-blur-sm ${postTypeCfg.bg} ${postTypeCfg.text}`}
          >
            <PostTypeIcon className="h-3 w-3" />
            {postTypeCfg.label}
          </span>

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
