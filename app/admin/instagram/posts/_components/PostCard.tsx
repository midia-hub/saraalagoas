'use client'

import Link from 'next/link'
import {
  CheckCircle2,
  Clock,
  XCircle,
  CalendarClock,
  Image as ImageIcon,
  ExternalLink,
  Pencil,
  Heart,
  MessageCircle,
  Eye,
} from 'lucide-react'
import type { ScheduledItem } from './types'

const STATUS_CONFIG: Record<
  string,
  { label: string; icon: typeof Clock; className: string }
> = {
  pending: {
    label: 'Programada',
    icon: CalendarClock,
    className: 'bg-slate-100 text-slate-800 border-slate-200',
  },
  publishing: {
    label: 'Publicando',
    icon: Clock,
    className: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  published: {
    label: 'Publicada',
    icon: CheckCircle2,
    className: 'bg-green-100 text-green-800 border-green-200',
  },
  failed: {
    label: 'Falha',
    icon: XCircle,
    className: 'bg-red-100 text-red-800 border-red-200',
  },
}

type PostCardProps = {
  post: ScheduledItem
  /** URL da miniatura (ex: /api/gallery/image?fileId=...&mode=thumb). Se não houver, mostra ícone. */
  thumbnailUrl?: string | null
  /** Métricas opcionais (quando tivermos API Meta Insights) */
  metrics?: { likes?: number; comments?: number; impressions?: number; reach?: number }
}

function buildThumbnailUrl(post: ScheduledItem): string | null {
  const firstId = post.media_specs?.[0]?.id
  if (!firstId) return null
  return `/api/gallery/image?fileId=${encodeURIComponent(firstId)}&mode=thumb&size=320`
}

export function PostCard({ post, thumbnailUrl, metrics }: PostCardProps) {
  const config = STATUS_CONFIG[post.status] ?? STATUS_CONFIG.pending
  const Icon = config.icon
  const gallery = post.galleries
  const title = gallery?.title ?? 'Postagem'
  const date = post.published_at || post.scheduled_at || post.created_at
  const thumb = thumbnailUrl ?? buildThumbnailUrl(post)

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="relative aspect-square bg-slate-100">
        {thumb ? (
          <img
            src={thumb}
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
          className={`absolute right-2 top-2 inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium ${config.className}`}
        >
          <Icon className="h-3.5 w-3.5" />
          {config.label}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-semibold text-slate-900 line-clamp-1">{title}</h3>
        <p className="mt-0.5 text-xs text-slate-500">
          {new Date(date).toLocaleString('pt-BR')}
        </p>
        {post.caption && (
          <p className="mt-1 line-clamp-2 text-sm text-slate-600">{post.caption}</p>
        )}

        {/* Métricas (placeholder ou reais) */}
        <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-600">
          {(metrics?.likes != null || metrics?.comments != null || metrics?.impressions != null) ? (
            <>
              {metrics.likes != null && (
                <span className="flex items-center gap-1">
                  <Heart className="h-3.5 w-3.5" />
                  {metrics.likes}
                </span>
              )}
              {metrics.comments != null && (
                <span className="flex items-center gap-1">
                  <MessageCircle className="h-3.5 w-3.5" />
                  {metrics.comments}
                </span>
              )}
              {metrics.impressions != null && (
                <span className="flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5" />
                  {metrics.impressions}
                </span>
              )}
            </>
          ) : post.status === 'published' && (
            <span className="text-slate-400">Métricas em breve</span>
          )}
        </div>

        {post.status === 'failed' && post.error_message && (
          <p className="mt-2 rounded border border-red-100 bg-red-50 px-2 py-1.5 text-xs text-red-700">
            {post.error_message}
          </p>
        )}

        <div className="mt-auto flex flex-wrap gap-2 pt-3">
          {post.status === 'pending' && (
            <Link
              href={`/admin/galeria/${post.album_id}/post/create`}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              <Pencil className="h-3.5 w-3.5" />
              Editar / reprogramar
            </Link>
          )}
        </div>
      </div>
    </article>
  )
}
