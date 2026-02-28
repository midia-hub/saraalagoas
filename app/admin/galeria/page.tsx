'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, Image as ImageIcon, Upload, RefreshCw, Trash2 } from 'lucide-react'
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
import { AdminPageHeader } from '@/app/admin/AdminPageHeader'
import Link from 'next/link'

/** Resposta bruta da API /api/gallery/list */
type GalleryRow = {
  id: string
  type: 'culto' | 'evento'
  title: string
  slug: string
  date: string
  created_at: string
  drive_folder_id?: string
  hidden_from_public?: boolean
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
    hidden_from_public: row.hidden_from_public ?? false,
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
  const canEditAlbum = isAdmin || !!permissions.galeria?.edit

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

  const handleToggleVisibility = useCallback(async (album: Album) => {
    const newValue = !album.hidden_from_public
    setAlbums((prev) =>
      prev.map((a) => (a.id === album.id ? { ...a, hidden_from_public: newValue } : a))
    )
    try {
      await adminFetchJson(`/api/gallery/${album.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ hidden_from_public: newValue }),
      })
      setToast({
        type: 'ok',
        text: newValue ? 'Álbum ocultado da galeria pública.' : 'Álbum visível na galeria pública.',
      })
    } catch {
      // reverter em caso de erro
      setAlbums((prev) =>
        prev.map((a) => (a.id === album.id ? { ...a, hidden_from_public: album.hidden_from_public } : a))
      )
      setToast({ type: 'err', text: 'Não foi possível alterar a visibilidade.' })
    }
  }, [])

  const totalCultos = albums.filter(a => a.type === 'culto').length
  const totalEventos = albums.filter(a => a.type === 'evento').length
  const totalFotos = albums.reduce((acc, a) => acc + (a.photosCount ?? 0), 0)

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
      <div className="p-6 md:p-8 space-y-0 animate-fade-in">
        <AdminPageHeader
          icon={ImageIcon}
          title="Galeria"
          subtitle="Gerencie álbuns de cultos e eventos"
          actions={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:text-[#c62737] hover:border-[#c62737]/30 hover:bg-red-50 transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                Atualizar
              </button>
              <Link
                href="/admin/upload"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#c62737] text-white text-sm font-semibold hover:bg-[#a81e2d] transition-colors shadow-sm"
              >
                <Upload className="w-4 h-4" />
                Novo Álbum
              </Link>
            </div>
          }
        />

        {/* Stats */}
        {!error && albums.length > 0 && (
          <div className="flex flex-wrap gap-3 mb-6">
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <ImageIcon className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-semibold text-slate-700">{albums.length}</span>
              <span className="text-xs text-slate-500">álbuns</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-50 border border-violet-200">
              <span className="w-2 h-2 rounded-full bg-violet-500 shrink-0" />
              <span className="text-sm font-semibold text-violet-700">{totalCultos}</span>
              <span className="text-xs text-violet-500">cultos</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200">
              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
              <span className="text-sm font-semibold text-amber-700">{totalEventos}</span>
              <span className="text-xs text-amber-500">eventos</span>
            </div>
            {totalFotos > 0 && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-sm font-semibold text-emerald-700">{totalFotos.toLocaleString('pt-BR')}</span>
                <span className="text-xs text-emerald-500">fotos</span>
              </div>
            )}
          </div>
        )}

        <AlbumFilters
          state={filters}
          onChange={setFilters}
          hideSortByPhotos={hideSortByPhotos}
          totalVisible={filteredAndSorted.length}
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
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {filteredAndSorted.map((album) => (
              <AlbumCard
                key={album.id}
                album={album}
                onCopyLink={() => {}}
                onVisible={enrichAlbum}
                canDeleteAlbum={canDeleteAlbum}
                onDeleteAlbum={canDeleteAlbum ? () => setAlbumToDelete(album) : undefined}
                onToggleVisibility={canEditAlbum ? handleToggleVisibility : undefined}
              />
            ))}
          </div>
        )}

        {/* Modal excluir álbum */}
        {albumToDelete && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => !deletingAlbumId && setAlbumToDelete(null)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-album-list-title"
          >
            <div
              className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Red top accent */}
              <div className="h-1.5 w-full bg-gradient-to-r from-rose-500 to-red-600" />
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-rose-100 flex items-center justify-center">
                    <Trash2 className="w-5 h-5 text-rose-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 id="delete-album-list-title" className="text-base font-bold text-slate-900">
                      Excluir álbum?
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      O álbum <span className="font-semibold text-slate-700">&ldquo;{albumToDelete.title}&rdquo;</span> e todas as suas fotos serão removidos permanentemente.
                    </p>
                  </div>
                </div>
                <div className="mt-5 flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => !deletingAlbumId && setAlbumToDelete(null)}
                    disabled={!!deletingAlbumId}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDeleteAlbum}
                    disabled={!!deletingAlbumId}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                  >
                    {deletingAlbumId === albumToDelete.id && <Loader2 className="w-4 h-4 animate-spin" />}
                    {deletingAlbumId === albumToDelete.id ? 'Excluindo...' : 'Sim, excluir'}
                  </button>
                </div>
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
