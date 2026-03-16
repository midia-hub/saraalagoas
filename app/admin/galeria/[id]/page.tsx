'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { GaleriaLoading } from '@/components/GaleriaLoading'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { useAdminAccess } from '@/lib/admin-access-context'
import { adminFetchJson, getAccessTokenOrThrow } from '@/lib/admin-client'
import { Toast } from '@/components/Toast'

type Gallery = {
  id: string
  type: 'culto' | 'evento'
  title: string
  slug: string
  date: string
  hidden_from_public: boolean
}

type GalleryFile = {
  id: string
  name: string
  webViewLink: string | null
  thumbnailLink: string | null
  mimeType?: string
  uploaded_by_name?: string | null
}

function imageUrl(fileId: string, mode: 'thumb' | 'full' = 'full'): string {
  return `/api/gallery/image?fileId=${encodeURIComponent(fileId)}&mode=${mode}`
}

export default function AdminGaleriaAlbumPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params?.id
  const { permissions, isAdmin } = useAdminAccess()
  const canDeletePhotos = isAdmin || !!permissions.galeria?.delete

  const [gallery, setGallery] = useState<Gallery | null>(null)
  const [files, setFiles] = useState<GalleryFile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [lightboxImageLoading, setLightboxImageLoading] = useState(true)
  const [fileToDelete, setFileToDelete] = useState<GalleryFile | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showDeleteAlbumModal, setShowDeleteAlbumModal] = useState(false)
  const [deletingAlbum, setDeletingAlbum] = useState(false)
  const [togglingVisibility, setTogglingVisibility] = useState(false)
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  // Upload de fotos adicionais
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadFiles, setUploadFiles] = useState<File[]>([])
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number; errors: string[] } | null>(null)
  const [uploading, setUploading] = useState(false)

  // Mesclar álbuns
  const [showMergeModal, setShowMergeModal] = useState(false)
  const [mergeAlbums, setMergeAlbums] = useState<Array<{ id: string; title: string; type: string; date: string }>>([])
  const [mergeSourceId, setMergeSourceId] = useState('')
  const [mergeDeleteSource, setMergeDeleteSource] = useState(false)
  const [merging, setMerging] = useState(false)
  const [loadingMergeAlbums, setLoadingMergeAlbums] = useState(false)

  const selected = lightboxIndex !== null ? (files[lightboxIndex] ?? null) : null

  const openLightbox = useCallback((index: number) => {
    setLightboxIndex(index)
    setLightboxImageLoading(true)
  }, [])

  const closeLightbox = useCallback(() => setLightboxIndex(null), [])

  const lightboxPrev = useCallback(() => {
    setLightboxIndex((i) => {
      if (i === null || files.length === 0) return i
      const next = (i - 1 + files.length) % files.length
      setLightboxImageLoading(true)
      return next
    })
  }, [files.length])

  const lightboxNext = useCallback(() => {
    setLightboxIndex((i) => {
      if (i === null || files.length === 0) return i
      const next = (i + 1) % files.length
      setLightboxImageLoading(true)
      return next
    })
  }, [files.length])

  useEffect(() => {
    if (lightboxIndex === null) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox()
      else if (e.key === 'ArrowLeft') lightboxPrev()
      else if (e.key === 'ArrowRight') lightboxNext()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [lightboxIndex, closeLightbox, lightboxPrev, lightboxNext])

  const reloadFiles = useCallback(async () => {
    if (!id) return
    const list = await adminFetchJson<GalleryFile[]>(`/api/gallery/${id}/files`)
    setFiles(Array.isArray(list) ? list : [])
  }, [id])

  useEffect(() => {
    if (!id) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    Promise.all([
      adminFetchJson<Gallery>(`/api/gallery/${id}`),
      adminFetchJson<GalleryFile[]>(`/api/gallery/${id}/files`),
    ])
      .then(([gal, list]) => {
        setGallery(gal)
        setFiles(Array.isArray(list) ? list : [])
      })
      .catch(() => {
        setError('Não foi possível carregar o álbum. Tente novamente.')
        setGallery(null)
        setFiles([])
      })
      .finally(() => setLoading(false))
  }, [id])

  const handleToggleVisibility = useCallback(async () => {
    if (!gallery || togglingVisibility) return
    const newValue = !gallery.hidden_from_public
    setTogglingVisibility(true)
    try {
      await adminFetchJson(`/api/gallery/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ hidden_from_public: newValue }),
      })
      setGallery((prev) => prev ? { ...prev, hidden_from_public: newValue } : prev)
      setToast({
        type: 'ok',
        text: newValue
          ? 'Álbum ocultado da galeria pública.'
          : 'Álbum visível na galeria pública.',
      })
    } catch {
      setToast({ type: 'err', text: 'Não foi possível alterar a visibilidade.' })
    } finally {
      setTogglingVisibility(false)
    }
  }, [gallery, id, togglingVisibility])

  const handleConfirmDelete = useCallback(
    async (file: GalleryFile) => {
      if (!id || !canDeletePhotos) return
      setDeletingId(file.id)
      try {
        await adminFetchJson(`/api/gallery/${id}/files/${file.id}`, { method: 'DELETE' })
        setFiles((prev) => prev.filter((f) => f.id !== file.id))
        closeLightbox()
        setFileToDelete(null)
      } catch {
        setToast({ type: 'err', text: 'Não foi possível excluir a imagem.' })
      } finally {
        setDeletingId(null)
      }
    },
    [id, canDeletePhotos]
  )

  const openDeleteModal = useCallback((file: GalleryFile) => {
    setFileToDelete(file)
  }, [])

  const closeDeleteModal = useCallback(() => {
    if (!deletingId) setFileToDelete(null)
  }, [deletingId])

  const handleConfirmDeleteAlbum = useCallback(async () => {
    if (!id || !canDeletePhotos || deletingAlbum) return
    setDeletingAlbum(true)
    try {
      await adminFetchJson(`/api/gallery/${id}`, { method: 'DELETE' })
      setShowDeleteAlbumModal(false)
      router.push('/admin/galeria')
    } catch {
      setToast({ type: 'err', text: 'Não foi possível excluir o álbum. Ele pode estar vinculado a publicações.' })
    } finally {
      setDeletingAlbum(false)
    }
  }, [id, canDeletePhotos, deletingAlbum, router])

  const handleUploadMore = useCallback(async () => {
    if (!id || !uploadFiles.length || uploading) return
    setUploading(true)
    setUploadProgress({ done: 0, total: uploadFiles.length, errors: [] })
    const errors: string[] = []
    try {
      const token = await getAccessTokenOrThrow()
      for (let i = 0; i < uploadFiles.length; i++) {
        const file = uploadFiles[i]
        try {
          const fd = new FormData()
          fd.append('file', file)
          const res = await fetch(`/api/gallery/${id}/upload`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: fd,
          })
          const json = await res.json()
          if (!res.ok) errors.push(`${file.name}: ${json.error ?? 'Erro'}`)
        } catch {
          errors.push(`${file.name}: Falha no envio`)
        }
        setUploadProgress({ done: i + 1, total: uploadFiles.length, errors })
      }
    } catch {
      errors.push('Não foi possível obter o token de acesso.')
      setUploadProgress((prev) => prev ? { ...prev, errors } : null)
    }
    setUploading(false)
    const uploaded = uploadFiles.length - errors.length
    if (uploaded > 0) {
      setToast({ type: 'ok', text: `${uploaded} foto(s) adicionada(s) com sucesso.` })
      await reloadFiles()
    }
    if (errors.length > 0) {
      setToast({ type: 'err', text: `${errors.length} arquivo(s) falharam.` })
    }
    if (errors.length === 0) {
      setShowUploadModal(false)
      setUploadFiles([])
      setUploadProgress(null)
    }
  }, [id, uploadFiles, uploading, reloadFiles])

  const handleOpenMergeModal = useCallback(async () => {
    setShowMergeModal(true)
    setMergeSourceId('')
    setMergeDeleteSource(false)
    setLoadingMergeAlbums(true)
    try {
      const list = await adminFetchJson<Array<{ id: string; title: string; type: string; date: string }>>('/api/gallery/list?limit=200')
      setMergeAlbums((list ?? []).filter((a) => a.id !== id))
    } catch {
      setMergeAlbums([])
    } finally {
      setLoadingMergeAlbums(false)
    }
  }, [id])

  const handleMerge = useCallback(async () => {
    if (!id || !mergeSourceId || merging) return
    setMerging(true)
    try {
      const res = await adminFetchJson<{ ok: boolean; moved: number }>(`/api/gallery/${id}/merge`, {
        method: 'POST',
        body: JSON.stringify({ sourceId: mergeSourceId, deleteSource: mergeDeleteSource }),
      })
      setToast({ type: 'ok', text: `${res.moved} foto(s) mescladas com sucesso.` })
      setShowMergeModal(false)
      await reloadFiles()
      if (mergeDeleteSource) router.refresh()
    } catch (err) {
      setToast({ type: 'err', text: err instanceof Error ? err.message : 'Erro ao mesclar álbuns.' })
    } finally {
      setMerging(false)
    }
  }, [id, mergeSourceId, mergeDeleteSource, merging, reloadFiles, router])

  if (loading) {
    return (
      <PageAccessGuard pageKey="galeria">
        <div className="p-6 md:p-8">
          <GaleriaLoading title="Carregando álbum" subtitle="Buscando fotos..." />
        </div>
      </PageAccessGuard>
    )
  }

  if (error || !gallery) {
    return (
      <PageAccessGuard pageKey="galeria">
        <div className="p-6 md:p-8">
          <p className="text-red-600">{error || 'Álbum não encontrado.'}</p>
          <Link href="/admin/galeria" className="mt-3 inline-block text-[#c62737] hover:underline">
            ← Voltar aos álbuns
          </Link>
        </div>
      </PageAccessGuard>
    )
  }

  const publicPath = `/galeria/${gallery.type}/${gallery.slug}/${gallery.date}`

  return (
    <PageAccessGuard pageKey="galeria">
      <div className="p-6 md:p-8 max-w-6xl">
        <div className="mb-4">
          <Link
            href="/admin/galeria"
            className="text-sm text-slate-600 hover:text-slate-900"
          >
            ← Álbuns
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">{gallery.title}</h1>
        <p className="text-slate-600 mt-1">
          {gallery.type === 'culto' ? 'Culto' : 'Evento'} • {gallery.date}
        </p>
        {gallery.hidden_from_public && (
          <div className="mt-2 flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-4 py-2.5 text-sm text-amber-800">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
            <span>
              Este álbum está <strong>oculto da galeria pública</strong>. Ele só pode ser acessado pelo link direto:
              {' '}
              <a
                href={publicPath}
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-medium break-all"
              >
                {publicPath}
              </a>
            </span>
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href={publicPath}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Ver galeria pública
          </a>
          <button
            type="button"
            onClick={handleToggleVisibility}
            disabled={togglingVisibility}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
              gallery.hidden_from_public
                ? 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
            title={gallery.hidden_from_public ? 'Tornar visível na galeria pública' : 'Ocultar da galeria pública'}
          >
            {togglingVisibility ? (
              <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
            ) : gallery.hidden_from_public ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            )}
            {gallery.hidden_from_public ? 'Oculto (reexibir)' : 'Ocultar da galeria'}
          </button>
          <button
            type="button"
            onClick={() => { setShowUploadModal(true); setUploadFiles([]); setUploadProgress(null) }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Adicionar fotos
          </button>
          <button
            type="button"
            onClick={handleOpenMergeModal}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
            Mesclar álbuns
          </button>
          <Link
            href={`/admin/galeria/${gallery.id}/post/select`}
            className="inline-flex items-center rounded-lg bg-[#c62737] px-4 py-2 text-sm font-medium text-white hover:bg-[#a01f2d]"
          >
            Fazer postagem
          </Link>
          {canDeletePhotos && (
            <button
              type="button"
              onClick={() => setShowDeleteAlbumModal(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
              title="Excluir álbum"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Excluir álbum
            </button>
          )}
        </div>

        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {files.map((file, idx) => (
            <div key={file.id} className="group relative">
              <button
                type="button"
                onClick={() => openLightbox(idx)}
                className="w-full rounded-xl overflow-hidden border border-slate-200 bg-white text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c62737] transition-transform hover:scale-[1.02] hover:shadow-md"
              >
                <div className="relative">
                  <img
                    src={imageUrl(file.id, 'thumb')}
                    alt={file.name}
                    className="w-full h-32 object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <svg className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 8v6M8 11h6" />
                    </svg>
                  </div>
                  {file.uploaded_by_name && (
                    <p className="absolute bottom-0 left-0 right-0 px-2 py-1 bg-gradient-to-t from-black/70 to-transparent text-white text-xs truncate text-left">
                      {file.uploaded_by_name}
                    </p>
                  )}
                </div>
              </button>
              {canDeletePhotos && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    openDeleteModal(file)
                  }}
                  disabled={deletingId === file.id}
                  className="absolute top-1.5 right-1.5 flex items-center justify-center w-8 h-8 rounded-lg bg-red-600 text-white shadow hover:bg-red-700 disabled:opacity-50"
                  title="Excluir imagem do álbum"
                >
                  {deletingId === file.id ? (
                    <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
        {files.length === 0 && (
          <p className="text-slate-500">Nenhuma foto neste álbum ainda.</p>
        )}

        {/* Modal de confirmação de exclusão do álbum */}
        {showDeleteAlbumModal && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => !deletingAlbum && setShowDeleteAlbumModal(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-album-modal-title"
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
                  <h2 id="delete-album-modal-title" className="text-lg font-semibold text-slate-900">
                    Excluir álbum inteiro?
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    <span className="font-medium text-slate-700">{gallery.title}</span>
                    <br />
                    Todas as {files.length} foto(s) serão removidas do álbum. Esta ação não pode ser desfeita.
                  </p>
                </div>
              </div>
              <div className="mt-6 flex flex-row-reverse gap-3">
                <button
                  type="button"
                  onClick={handleConfirmDeleteAlbum}
                  disabled={deletingAlbum}
                  className="px-4 py-2.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deletingAlbum ? 'Excluindo...' : 'Excluir álbum'}
                </button>
                <button
                  type="button"
                  onClick={() => !deletingAlbum && setShowDeleteAlbumModal(false)}
                  disabled={deletingAlbum}
                  className="px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de confirmação de exclusão de imagem */}
        {fileToDelete && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={closeDeleteModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-modal-title"
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
                  <h2 id="delete-modal-title" className="text-lg font-semibold text-slate-900">
                    Excluir imagem do álbum?
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    <span className="font-medium text-slate-700 truncate block">{fileToDelete.name}</span>
                    Será removida do álbum e do Drive. Esta ação não pode ser desfeita.
                  </p>
                </div>
              </div>
              <div className="mt-6 flex flex-row-reverse gap-3">
                <button
                  type="button"
                  onClick={() => fileToDelete && handleConfirmDelete(fileToDelete)}
                  disabled={!!deletingId}
                  className="px-4 py-2.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deletingId === fileToDelete?.id ? 'Excluindo...' : 'Excluir'}
                </button>
                <button
                  type="button"
                  onClick={closeDeleteModal}
                  disabled={!!deletingId}
                  className="px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {selected && lightboxIndex !== null && (
          <div
            className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label="Visualizar foto"
          >
            {/* Barra superior */}
            <div className="flex shrink-0 items-center justify-between px-4 py-3 bg-black/50">
              <div className="flex items-center gap-3 min-w-0">
                <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/80 tabular-nums">
                  {lightboxIndex + 1} / {files.length}
                </span>
                <p className="truncate text-sm font-medium text-white/90 hidden sm:block max-w-xs">
                  {selected.name}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {selected.webViewLink && (
                  <a
                    href={selected.webViewLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20 transition-colors"
                    title="Abrir no Google Drive"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    <span className="hidden sm:inline">Drive</span>
                  </a>
                )}
                {canDeletePhotos && (
                  <button
                    type="button"
                    onClick={() => openDeleteModal(selected)}
                    disabled={!!deletingId}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/50 bg-red-600/80 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                    title="Excluir imagem"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span className="hidden sm:inline">Excluir</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={closeLightbox}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white hover:bg-white/25 transition-colors"
                  aria-label="Fechar"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Área da imagem */}
            <div
              className="relative flex flex-1 items-center justify-center overflow-hidden"
              onClick={closeLightbox}
            >
              {/* Botão anterior */}
              {files.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); lightboxPrev() }}
                  className="absolute left-3 z-10 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-black/50 border border-white/20 text-white hover:bg-black/80 transition-colors shadow-xl"
                  aria-label="Foto anterior"
                >
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}

              {/* Imagem */}
              <div
                className="relative flex max-h-full max-w-full items-center justify-center p-4 sm:p-8"
                onClick={(e) => e.stopPropagation()}
              >
                {lightboxImageLoading && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-3">
                      <span className="h-10 w-10 rounded-full border-4 border-white/20 border-t-white animate-spin" aria-hidden />
                      <span className="text-xs text-white/50">Carregando…</span>
                    </div>
                  </div>
                )}
                <img
                  key={selected.id}
                  src={imageUrl(selected.id, 'full')}
                  alt={selected.name}
                  className={`max-h-[calc(100dvh-11rem)] max-w-full object-contain rounded-xl shadow-2xl transition-opacity duration-300 ${
                    lightboxImageLoading ? 'opacity-0' : 'opacity-100'
                  }`}
                  onLoad={() => setLightboxImageLoading(false)}
                  onError={() => setLightboxImageLoading(false)}
                />
              </div>

              {/* Botão próximo */}
              {files.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); lightboxNext() }}
                  className="absolute right-3 z-10 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-black/50 border border-white/20 text-white hover:bg-black/80 transition-colors shadow-xl"
                  aria-label="Próxima foto"
                >
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}
            </div>

            {/* Barra inferior — info + miniaturas */}
            <div className="shrink-0 bg-black/60 border-t border-white/10">
              {/* Info */}
              <div className="flex items-center justify-between gap-4 px-4 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white/90">{selected.name}</p>
                  {selected.uploaded_by_name && (
                    <p className="mt-0.5 truncate text-xs text-white/50">Enviado por {selected.uploaded_by_name}</p>
                  )}
                </div>
                {files.length > 1 && (
                  <p className="shrink-0 text-xs text-white/40">Use ← → para navegar</p>
                )}
              </div>

              {/* Miniaturas de navegação (visível apenas com múltiplas fotos) */}
              {files.length > 1 && (
                <div className="flex gap-1.5 overflow-x-auto px-4 pb-3 scrollbar-none">
                  {files.map((f, i) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => {
                        if (i !== lightboxIndex) {
                          setLightboxImageLoading(true)
                          setLightboxIndex(i)
                        }
                      }}
                      className={`shrink-0 h-12 w-12 rounded-lg overflow-hidden border-2 transition-all ${
                        i === lightboxIndex
                          ? 'border-[#c62737] ring-1 ring-[#c62737] opacity-100 scale-105'
                          : 'border-transparent opacity-50 hover:opacity-80 hover:border-white/40'
                      }`}
                      aria-label={`Ir para foto ${i + 1}`}
                      aria-current={i === lightboxIndex ? 'true' : undefined}
                    >
                      <img
                        src={imageUrl(f.id, 'thumb')}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal: Adicionar fotos */}
      {showUploadModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => !uploading && setShowUploadModal(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white shadow-xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Adicionar fotos ao álbum</h2>
            <div className="mb-4">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                disabled={uploading}
                onChange={(e) => setUploadFiles(Array.from(e.target.files ?? []))}
                className="block w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-[#c62737]/10 file:text-[#c62737] hover:file:bg-[#c62737]/20 disabled:opacity-50"
              />
              <p className="mt-1.5 text-xs text-slate-400">JPEG, PNG, WebP ou GIF · máx. {process.env.NEXT_PUBLIC_MAX_UPLOAD_MB ?? 4} MB por arquivo</p>
            </div>
            {uploadProgress && (
              <div className="mb-4">
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>Enviando {uploadProgress.done} de {uploadProgress.total}…</span>
                  <span>{Math.round((uploadProgress.done / uploadProgress.total) * 100)}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                  <div
                    style={{ width: `${Math.round((uploadProgress.done / uploadProgress.total) * 100)}%` }}
                    className="h-full rounded-full bg-[#c62737] transition-all"
                  />
                </div>
                {uploadProgress.errors.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {uploadProgress.errors.map((e, i) => (
                      <li key={i} className="text-xs text-red-600 truncate">{e}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            <div className="flex flex-row-reverse gap-3">
              <button
                type="button"
                onClick={handleUploadMore}
                disabled={!uploadFiles.length || uploading}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#c62737] text-white text-sm font-medium hover:bg-[#a01f2d] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading && <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />}
                {uploading ? 'Enviando…' : `Enviar ${uploadFiles.length ? `(${uploadFiles.length})` : ''}`}
              </button>
              <button
                type="button"
                onClick={() => !uploading && setShowUploadModal(false)}
                disabled={uploading}
                className="px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Mesclar álbuns */}
      {showMergeModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => !merging && setShowMergeModal(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white shadow-xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-slate-900 mb-1">Mesclar álbuns</h2>
            <p className="text-sm text-slate-500 mb-4">
              Todas as fotos do álbum de origem serão movidas para{' '}
              <span className="font-medium text-slate-700">{gallery.title}</span>.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Álbum de origem</label>
              {loadingMergeAlbums ? (
                <div className="flex items-center gap-2 text-sm text-slate-400 py-2">
                  <span className="h-4 w-4 rounded-full border-2 border-slate-300 border-t-[#c62737] animate-spin" />
                  Carregando álbuns…
                </div>
              ) : (
                <select
                  value={mergeSourceId}
                  onChange={(e) => setMergeSourceId(e.target.value)}
                  disabled={merging}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-[#c62737] focus:ring-2 focus:ring-[#c62737]/20 disabled:opacity-50"
                >
                  <option value="">Selecione um álbum…</option>
                  {mergeAlbums.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.title} ({a.type === 'culto' ? 'Culto' : 'Evento'} · {a.date})
                    </option>
                  ))}
                </select>
              )}
            </div>
            <label className="flex items-center gap-2.5 mb-5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={mergeDeleteSource}
                onChange={(e) => setMergeDeleteSource(e.target.checked)}
                disabled={merging}
                className="w-4 h-4 rounded border-slate-300 text-[#c62737] focus:ring-[#c62737]/30"
              />
              <span className="text-sm text-slate-700">Excluir álbum de origem após mesclar</span>
            </label>
            <div className="flex flex-row-reverse gap-3">
              <button
                type="button"
                onClick={handleMerge}
                disabled={!mergeSourceId || merging}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#c62737] text-white text-sm font-medium hover:bg-[#a01f2d] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {merging && <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />}
                {merging ? 'Mesclando…' : 'Mesclar'}
              </button>
              <button
                type="button"
                onClick={() => !merging && setShowMergeModal(false)}
                disabled={merging}
                className="px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast
        visible={!!toast}
        message={toast?.text ?? ''}
        type={toast?.type ?? 'err'}
        onClose={() => setToast(null)}
      />
    </PageAccessGuard>
  )
}
