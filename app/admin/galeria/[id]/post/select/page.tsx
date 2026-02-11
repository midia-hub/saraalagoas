'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { GaleriaLoading } from '@/components/GaleriaLoading'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { adminFetchJson } from '@/lib/admin-client'
import { PhotoPickerGrid } from '../_components/PhotoPickerGrid'
import { PhotoPickerToolbar } from '../_components/PhotoPickerToolbar'
import { usePostDraft } from '../_lib/usePostDraft'

type AlbumFile = {
  id: string
  name: string
}

type Gallery = {
  id: string
  title: string
}

function fullUrl(fileId: string): string {
  return `/api/gallery/image?fileId=${encodeURIComponent(fileId)}&mode=full`
}

function thumbUrl(fileId: string): string {
  return `/api/gallery/image?fileId=${encodeURIComponent(fileId)}&mode=thumb`
}

export default function AlbumPostSelectPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const albumId = params?.id || ''
  const { ready, draft, patchDraft } = usePostDraft(albumId)

  const [album, setAlbum] = useState<Gallery | null>(null)
  const [files, setFiles] = useState<AlbumFile[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!albumId) {
      setLoading(false)
      return
    }
    Promise.all([
      adminFetchJson<Gallery>(`/api/gallery/${albumId}`),
      adminFetchJson<AlbumFile[]>(`/api/gallery/${albumId}/files`),
    ])
      .then(([albumData, fileData]) => {
        setAlbum(albumData)
        setFiles(Array.isArray(fileData) ? fileData : [])
      })
      .catch((e) => {
        setError('Não foi possível carregar as fotos. Tente novamente.')
        setFiles([])
      })
      .finally(() => setLoading(false))
  }, [albumId])

  useEffect(() => {
    if (!ready || loading) return
    const available = new Set(files.map((file) => file.id))
    const persisted = (draft.media || []).map((m) => m.id).filter((id) => available.has(id))
    if (persisted.length > 0) {
      setSelectedIds(persisted)
    }
  }, [ready, loading, draft.media, files])

  const selectedCount = selectedIds.length
  const selectedFiles = useMemo(() => {
    const set = new Set(selectedIds)
    return files.filter((file) => set.has(file.id))
  }, [files, selectedIds])

  function toggle(fileId: string) {
    setSelectedIds((prev) => {
      if (prev.includes(fileId)) return prev.filter((id) => id !== fileId)
      return [...prev, fileId]
    })
  }

  function handleSelectAll() {
    setSelectedIds(files.map((file) => file.id))
  }

  function handleClear() {
    setSelectedIds([])
  }

  function handleConfirm() {
    const media = selectedFiles.map((file) => ({
      id: file.id,
      url: fullUrl(file.id),
      thumbnailUrl: thumbUrl(file.id),
      filename: file.name,
      cropMode: 'original' as const,
      altText: '',
    }))
    patchDraft({ media })
    router.push(`/admin/galeria/${albumId}/post/create`)
  }

  return (
    <PageAccessGuard pageKey="galeria">
      <div className="p-6 md:p-8">
        <div className="mb-4">
          <Link href={`/admin/galeria/${albumId}`} className="text-sm text-slate-600 hover:text-slate-900">
            ← Voltar ao álbum
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Selecionar fotos</h1>
        <p className="mt-1 text-slate-600">{album?.title || 'Álbum'} — escolha as mídias para o post.</p>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>
        )}

        <div className="mt-6">
          <PhotoPickerToolbar
            selectedCount={selectedCount}
            totalCount={files.length}
            onSelectAll={handleSelectAll}
            onClear={handleClear}
            onConfirm={handleConfirm}
            confirmDisabled={selectedCount === 0}
          />
        </div>

        {loading ? (
          <GaleriaLoading
            title="Carregando fotos"
            subtitle="Buscando imagens do álbum..."
          />
        ) : (
          <div className="mt-4">
            <PhotoPickerGrid files={files} selectedIds={selectedIds} onToggle={toggle} />
          </div>
        )}
      </div>
    </PageAccessGuard>
  )
}

