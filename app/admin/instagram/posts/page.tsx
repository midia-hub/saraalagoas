'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { adminFetchJson } from '@/lib/admin-client'
import {
  CheckCircle2,
  Clock,
  XCircle,
  ExternalLink,
  Image as ImageIcon,
  Filter,
} from 'lucide-react'

type Asset = { sort_order: number; final_url: string | null; source_url: string }
type PostItem = {
  id: string
  status: 'queued' | 'running' | 'published' | 'failed'
  run_at: string | null
  published_at: string | null
  error_message: string | null
  result_payload: { mediaId?: string } | null
  created_at: string
  instagram_instances?: { id: string; name: string } | null
  instagram_post_drafts?: {
    id: string
    caption: string
    status: string
    galleries?: { id: string; title: string; type: string; date: string } | null
    gallery?: { id: string; title: string; type: string; date: string } | null
    instagram_post_assets?: Asset[] | null
  } | null
}

type TabKey = 'all' | 'pending' | 'published' | 'failed'

const STATUS_CONFIG: Record<
  string,
  { label: string; icon: typeof Clock; className: string }
> = {
  queued: {
    label: 'Na fila',
    icon: Clock,
    className: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  running: {
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

function getFirstAssetUrl(draft: PostItem['instagram_post_drafts']): string | null {
  const assets = draft?.instagram_post_assets
  if (!assets?.length) return null
  const sorted = [...assets].sort((a, b) => a.sort_order - b.sort_order)
  const first = sorted[0]
  const url = first?.final_url || first?.source_url || null
  // source_url pode ser "drive:fileId" (não é URL de imagem)
  if (url?.startsWith('drive:')) return null
  return url || null
}

function buildInstagramPermalink(mediaId: string | undefined): string | null {
  if (!mediaId) return null
  // Quando a API real do Instagram retornar media_id, o link é: https://www.instagram.com/p/{media_id}/
  // Por enquanto o stub retorna IDs fictícios; mantemos o formato para quando integrar.
  if (mediaId.startsWith('media_')) return null
  return `https://www.instagram.com/p/${mediaId}/`
}

export default function AdminInstagramPostsPage() {
  const [items, setItems] = useState<PostItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<TabKey>('all')
  const [runningQueue, setRunningQueue] = useState(false)

  function loadPosts() {
    setLoading(true)
    adminFetchJson<PostItem[]>('/api/admin/instagram/posts')
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch((e) => setError(e instanceof Error ? e.message : 'Erro ao carregar publicações.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadPosts()
  }, [])

  async function handleRunQueue() {
    setRunningQueue(true)
    setError(null)
    try {
      await adminFetchJson<{ processed?: number; results?: unknown[] }>('/api/admin/instagram/jobs/run-due', {
        method: 'POST',
      })
      loadPosts()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível processar a fila.')
    } finally {
      setRunningQueue(false)
    }
  }

  const filtered = useMemo(() => {
    if (tab === 'all') return items
    if (tab === 'pending') return items.filter((i) => i.status === 'queued' || i.status === 'running')
    if (tab === 'published') return items.filter((i) => i.status === 'published')
    if (tab === 'failed') return items.filter((i) => i.status === 'failed')
    return items
  }, [items, tab])

  const counts = useMemo(
    () => ({
      all: items.length,
      pending: items.filter((i) => i.status === 'queued' || i.status === 'running').length,
      published: items.filter((i) => i.status === 'published').length,
      failed: items.filter((i) => i.status === 'failed').length,
    }),
    [items]
  )

  const hasPending = counts.pending > 0

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'all', label: 'Todas' },
    { key: 'pending', label: 'Na fila' },
    { key: 'published', label: 'Publicadas' },
    { key: 'failed', label: 'Falhas' },
  ]

  return (
    <PageAccessGuard pageKey="instagram">
      <div className="p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Painel de publicações</h1>
            <p className="mt-1 text-slate-600">
              Valide as publicações enviadas e acompanhe as que já foram feitas nas plataformas.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {hasPending && (
              <button
                type="button"
                onClick={handleRunQueue}
                disabled={runningQueue}
                className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50"
              >
                {runningQueue ? 'Processando…' : 'Processar fila agora'}
              </button>
            )}
            <Link
              href="/admin/galeria"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Nova postagem
            </Link>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="mt-6 flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-slate-50/80 p-1">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                tab === key
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {label}
              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs tabular-nums">
                {key === 'all' ? counts.all : key === 'pending' ? counts.pending : key === 'published' ? counts.published : counts.failed}
              </span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
            Carregando publicações...
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-8 text-center">
            <Filter className="mx-auto h-12 w-12 text-slate-300" />
            <p className="mt-2 text-slate-600">
              {tab === 'all'
                ? 'Nenhuma publicação ainda.'
                : tab === 'pending'
                  ? 'Nenhuma publicação na fila.'
                  : tab === 'published'
                    ? 'Nenhuma publicação concluída.'
                    : 'Nenhuma falha registrada.'}
            </p>
            <Link
              href="/admin/galeria"
              className="mt-3 inline-block text-sm font-medium text-[#c62737] hover:underline"
            >
              Criar primeira postagem
            </Link>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((item) => {
              const gallery = item.instagram_post_drafts?.galleries ?? item.instagram_post_drafts?.gallery
              const config = STATUS_CONFIG[item.status] || STATUS_CONFIG.queued
              const Icon = config.icon
              const thumbUrl = getFirstAssetUrl(item.instagram_post_drafts)
              const date = item.published_at || item.run_at || item.created_at
              const permalink = buildInstagramPermalink(item.result_payload?.mediaId)

              return (
                <article
                  key={item.id}
                  className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="relative aspect-square bg-slate-100">
                    {thumbUrl ? (
                      <img
                        src={thumbUrl}
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
                      {gallery ? `${gallery.title}` : 'Sem galeria'}
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
                    {item.status === 'failed' && item.error_message && (
                      <p className="mt-2 rounded border border-red-100 bg-red-50 px-2 py-1.5 text-xs text-red-700">
                        {item.error_message}
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
                      {item.status === 'failed' && (
                        <span className="text-xs text-slate-500">
                          Revise o post e tente publicar novamente pela galeria.
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </PageAccessGuard>
  )
}
