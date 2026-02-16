'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, Image as ImageIcon } from 'lucide-react'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { useAdminAccess } from '@/lib/admin-access-context'
import { adminFetchJson } from '@/lib/admin-client'
import type { Album } from '@/lib/gallery-types'
import { AlbumCard } from './_components/AlbumCard'
import { AlbumEmptyState } from './_components/AlbumEmptyState'
import {
  AlbumFilters,
  type AlbumFiltersState,
  type PeriodFilter,
  type SortOption,
} from './_components/AlbumFilters'
import { GaleriaLoading } from '@/components/GaleriaLoading'
import { Toast } from '@/components/Toast'

/** Resposta bruta da API /api/gallery/list */
type GalleryRow = {
  id: string
  type: 'culto' | 'evento'
  title: string
  slug: string
  date: string
  created_at: string
  drive_folder_id?: string
}

/** Arquivo retornado por GET /api/gallery/[id]/files */
type GalleryFile = {
  id: string
  thumbnailLink?: string | null
  webViewLink?: string | null
}

function rowToAlbum(row: GalleryRow): Album {
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    date: row.date,
    slug: row.slug,
    created_at: row.created_at,
    publicPath: `/galeria/${row.type}/${row.slug}/${row.date}`,
    drive_folder_id: row.drive_folder_id,
  }
}

function getPeriodBounds(period: PeriodFilter): { start: Date; end: Date } | null {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  let start: Date
  let end: Date = new Date(today)
  end.setDate(end.getDate() + 1)

  switch (period) {
    case 'all':
      return null
    case 'last7':
      start = new Date(today)
      start.setDate(start.getDate() - 7)
      break
    case 'last30':
      start = new Date(today)
      start.setDate(start.getDate() - 30)
      break
    case 'this_month':
      start = new Date(today.getFullYear(), today.getMonth(), 1)
      end = new Date(today.getFullYear(), today.getMonth() + 1, 1)
      break
    case 'last_month':
      start = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      end = new Date(today.getFullYear(), today.getMonth(), 1)
      break
    default:
      return null
  }
  return { start, end }
}

function albumMatchesPeriod(album: Album, period: PeriodFilter): boolean {
  const bounds = getPeriodBounds(period)
  if (!bounds) return true
  const d = new Date(album.date + 'T12:00:00')
  return d >= bounds.start && d < bounds.end
}

const MAX_CONCURRENT_ENRICH = 3
const ENRICH_CACHE = new Map<string, { coverUrl?: string; photosCount: number }>()
/** Quantos álbuns enriquecer (capas + contagem) antes de exibir a grade. */
const INITIAL_ENRICH_COUNT = 12

export default function AdminGaleriaPage() {
  const { permissions, isAdmin } = useAdminAccess()
  const canDeleteAlbum = isAdmin || !!permissions.galeria?.delete

  const [albums, setAlbums] = useState<Album[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [albumToDelete, setAlbumToDelete] = useState<Album | null>(null)
  const [deletingAlbumId, setDeletingAlbumId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [filters, setFilters] = useState<AlbumFiltersState>({
    search: '',
    type: '',
    period: 'all',
    sort: 'recent',
  })
  const enrichQueueRef = useRef<Set<string>>(new Set())
  const enrichRunningRef = useRef(0)

  useEffect(() => {
    setLoading(true)
    setError(null)
    adminFetchJson<GalleryRow[]>('/api/gallery/list')
      .then((data) => {
        const rows = Array.isArray(data) ? data : []
        const initialAlbums = rows.map(rowToAlbum)
        initialAlbums.sort(
          (a, b) =>
            new Date(b.date).getTime() - new Date(a.date).getTime() ||
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        if (initialAlbums.length === 0) {
          setAlbums([])
          return
        }
        const toEnrich = initialAlbums.slice(0, INITIAL_ENRICH_COUNT)
        const enrichPromises = toEnrich.map((album) =>
          adminFetchJson<GalleryFile[]>(`/api/gallery/${album.id}/files`)
            .then((files) => ({
              albumId: album.id,
              files: Array.isArray(files) ? files : [],
            }))
            .catch(() => ({ albumId: album.id, files: [] as GalleryFile[] }))
        )
        return Promise.all(enrichPromises).then((results) => {
          const filesByAlbum = new Map(
            results.map((r) => [r.albumId, r.files])
          )
          results.forEach((r) => {
            const list = r.files
            const firstId = list[0]?.id
            const coverUrl = firstId
              ? `/api/gallery/image?fileId=${encodeURIComponent(firstId)}&mode=thumb`
              : undefined
            ENRICH_CACHE.set(r.albumId, {
              coverUrl,
              photosCount: list.length,
            })
          })
          setAlbums(
            initialAlbums.map((a) => {
              const files = filesByAlbum.get(a.id) ?? []
              const firstId = files[0]?.id
              const coverUrl = firstId
                ? `/api/gallery/image?fileId=${encodeURIComponent(firstId)}&mode=thumb`
                : undefined
              return {
                ...a,
                coverUrl,
                photosCount: files.length,
              }
            })
          )
        })
      })
      .catch((e) => {
        setError('Não conseguimos carregar os álbuns. Por favor, tente novamente.')
        setAlbums([])
      })
      .finally(() => setLoading(false))
  }, [])

  const enrichAlbum = useCallback((albumId: string) => {
    if (ENRICH_CACHE.has(albumId)) {
      const cached = ENRICH_CACHE.get(albumId)!
      setAlbums((prev) =>
        prev.map((a) =>
          a.id === albumId
            ? {
                ...a,
                coverUrl: cached.coverUrl,
                photosCount: cached.photosCount,
              }
            : a
        )
      )
      return
    }
    if (enrichQueueRef.current.has(albumId)) return
    if (enrichRunningRef.current >= MAX_CONCURRENT_ENRICH) return

    enrichQueueRef.current.add(albumId)
    enrichRunningRef.current += 1

    adminFetchJson<GalleryFile[]>(`/api/gallery/${albumId}/files`)
      .then((files) => {
        const list = Array.isArray(files) ? files : []
        const firstId = list[0]?.id
        const coverUrl = firstId ? `/api/gallery/image?fileId=${encodeURIComponent(firstId)}&mode=thumb` : undefined
        const photosCount = list.length
        ENRICH_CACHE.set(albumId, { coverUrl, photosCount })
        setAlbums((prev) =>
          prev.map((a) =>
            a.id === albumId ? { ...a, coverUrl, photosCount } : a
          )
        )
      })
      .catch(() => {
        ENRICH_CACHE.set(albumId, { photosCount: 0 })
      })
      .finally(() => {
        enrichQueueRef.current.delete(albumId)
        enrichRunningRef.current -= 1
      })
  }, [])

  const filteredAndSorted = useMemo(() => {
    let list = albums.filter((album) => {
      if (filters.type && album.type !== filters.type) return false
      if (filters.search) {
        const q = filters.search.toLowerCase()
        if (!album.title.toLowerCase().includes(q)) return false
      }
      if (!albumMatchesPeriod(album, filters.period)) return false
      return true
    })

    const sort =
      filters.sort === 'photos' && !albums.some((a) => a.photosCount != null)
        ? 'recent'
        : filters.sort
    if (sort === 'recent') {
      list = [...list].sort(
        (a, b) =>
          new Date(b.date).getTime() - new Date(a.date).getTime() ||
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    } else if (sort === 'a-z') {
      list = [...list].sort((a, b) =>
        a.title.localeCompare(b.title, 'pt-BR')
      )
    } else if (sort === 'photos') {
      list = [...list].sort((a, b) => (b.photosCount ?? 0) - (a.photosCount ?? 0))
    }

    return list
  }, [albums, filters])

  const hasAnyPhotosCount = albums.some((a) => a.photosCount != null)
  const hideSortByPhotos = !hasAnyPhotosCount

  const hasActiveFilters =
    filters.search !== '' ||
    filters.type !== '' ||
    filters.period !== 'all' ||
    filters.sort !== 'recent'

  const clearFilters = useCallback(() => {
    setFilters({
      search: '',
      type: '',
      period: 'all',
      sort: 'recent',
    })
  }, [])

  const handleConfirmDeleteAlbum = useCallback(async () => {
    if (!albumToDelete || deletingAlbumId) return
    setDeletingAlbumId(albumToDelete.id)
    try {
      await adminFetchJson(`/api/gallery/${albumToDelete.id}`, { method: 'DELETE' })
      setAlbums((prev) => prev.filter((a) => a.id !== albumToDelete.id))
      setAlbumToDelete(null)
      ENRICH_CACHE.delete(albumToDelete.id)
    } catch {
      setToast({ type: 'err', text: 'Não foi possível excluir o álbum. Ele pode estar vinculado a publicações.' })
    } finally {
      setDeletingAlbumId(null)
    }
  }, [albumToDelete, deletingAlbumId])

  if (loading) {
    return (
      <PageAccessGuard pageKey="galeria">
        <div className="p-6 md:p-8">
          <GaleriaLoading
            title="Carregando álbuns"
            subtitle="Buscando capas e fotos..."
            showGrid
            gridCount={8}
          />
        </div>
      </PageAccessGuard>
    )
  }

  return (
    <PageAccessGuard pageKey="galeria">
      <div className="p-6 md:p-8 animate-fade-in">
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#c62737]/10 flex items-center justify-center shrink-0">
              <ImageIcon className="text-[#c62737]" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Álbuns</h1>
              <p className="text-slate-500">
                Encontre rapidamente um álbum por nome, tipo ou data.
                {!error && filteredAndSorted.length > 0 && (
                  <span className="ml-1">— {filteredAndSorted.length} álbum{filteredAndSorted.length !== 1 ? 's' : ''}</span>
                )}
              </p>
            </div>
          </div>
        </div>

        <AlbumFilters
          state={filters}
          onChange={setFilters}
          hideSortByPhotos={hideSortByPhotos}
        />

        {error && (
          <div className="mt-6 p-4 rounded-xl bg-red-50 border border-red-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-red-700">{error}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 text-sm font-medium text-red-700 border border-red-300 rounded-lg hover:bg-red-100"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {!error && filteredAndSorted.length > 0 && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredAndSorted.map((album) => (
              <AlbumCard
                key={album.id}
                album={album}
                onCopyLink={() => {}}
                onVisible={enrichAlbum}
                canDeleteAlbum={canDeleteAlbum}
                onDeleteAlbum={canDeleteAlbum ? () => setAlbumToDelete(album) : undefined}
              />
            ))}
          </div>
        )}

        {/* Modal excluir álbum */}
        {albumToDelete && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => !deletingAlbumId && setAlbumToDelete(null)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-album-list-title"
          >
            <div
              className="w-full max-w-md rounded-2xl bg-white shadow-xl p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h2 id="delete-album-list-title" className="text-lg font-semibold text-slate-900">
                    Você tem certeza que deseja excluir este álbum?
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    <span className="font-medium text-slate-700">{albumToDelete.title}</span>
                    <br />
                    Todas as fotos do álbum serão removidas. Esta ação não pode ser desfeita.
                  </p>
                </div>
              </div>
              <div className="mt-6 flex flex-row-reverse gap-3">
                <button
                  type="button"
                  onClick={handleConfirmDeleteAlbum}
                  disabled={!!deletingAlbumId}
                  className="px-4 py-2.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {deletingAlbumId === albumToDelete.id && <Loader2 className="w-4 h-4 animate-spin" />}
                  {deletingAlbumId === albumToDelete.id ? 'Excluindo...' : 'Excluir álbum'}
                </button>
                <button
                  type="button"
                  onClick={() => !deletingAlbumId && setAlbumToDelete(null)}
                  disabled={!!deletingAlbumId}
                  className="px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {!error && filteredAndSorted.length === 0 && (
          <div className="mt-6">
            <AlbumEmptyState
              onClearFilters={clearFilters}
              hasActiveFilters={hasActiveFilters}
            />
          </div>
        )}
      </div>

      <Toast
        visible={!!toast}
        message={toast?.text ?? ''}
        type={toast?.type ?? 'err'}
        onClose={() => setToast(null)}
      />
    </PageAccessGuard>
  )
}
