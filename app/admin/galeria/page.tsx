'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
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
import { AlbumGridSkeleton } from './_components/AlbumGridSkeleton'

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

export default function AdminGaleriaPage() {
  const [albums, setAlbums] = useState<Album[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
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
        setAlbums(rows.map(rowToAlbum))
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Erro ao carregar álbuns.')
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

  if (loading) {
    return (
      <PageAccessGuard pageKey="galeria">
        <div className="p-6 md:p-8 min-h-[60vh] flex flex-col items-center justify-center">
          <p className="text-slate-600 text-lg font-medium">Carregando álbuns...</p>
          <div className="mt-6 w-full max-w-4xl">
            <AlbumGridSkeleton count={8} />
          </div>
        </div>
      </PageAccessGuard>
    )
  }

  return (
    <PageAccessGuard pageKey="galeria">
      <div className="p-6 md:p-8 animate-fade-in">
        <header className="mb-4">
          <h1 className="text-2xl font-bold text-slate-900">Álbuns</h1>
          <p className="text-slate-600 mt-1">
            Encontre rapidamente um álbum por nome, tipo ou data.
          </p>
          {!error && (
            <p className="text-slate-500 mt-1 text-sm">
              {filteredAndSorted.length} álbum{filteredAndSorted.length !== 1 ? 's' : ''}
            </p>
          )}
        </header>

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
              />
            ))}
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
    </PageAccessGuard>
  )
}
