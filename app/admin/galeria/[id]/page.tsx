'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { GaleriaLoading } from '@/components/GaleriaLoading'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { useAdminAccess } from '@/lib/admin-access-context'
import { adminFetchJson } from '@/lib/admin-client'

type Gallery = {
  id: string
  type: 'culto' | 'evento'
  title: string
  slug: string
  date: string
}

type GalleryFile = {
  id: string
  name: string
  webViewLink: string | null
  thumbnailLink: string | null
  mimeType?: string
}

function imageUrl(fileId: string, mode: 'thumb' | 'full' = 'full'): string {
  return `/api/gallery/image?fileId=${encodeURIComponent(fileId)}&mode=${mode}`
}

export default function AdminGaleriaAlbumPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id
  const { permissions, isAdmin } = useAdminAccess()
  const canDeletePhotos = isAdmin || !!permissions.galeria?.delete

  const [gallery, setGallery] = useState<Gallery | null>(null)
  const [files, setFiles] = useState<GalleryFile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<GalleryFile | null>(null)
  const [lightboxImageLoading, setLightboxImageLoading] = useState(true)
  const [fileToDelete, setFileToDelete] = useState<GalleryFile | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    if (selected) setLightboxImageLoading(true)
  }, [selected?.id])

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
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Erro ao carregar álbum.')
        setGallery(null)
        setFiles([])
      })
      .finally(() => setLoading(false))
  }, [id])

  const handleConfirmDelete = useCallback(
    async (file: GalleryFile) => {
      if (!id || !canDeletePhotos) return
      setDeletingId(file.id)
      try {
        await adminFetchJson(`/api/gallery/${id}/files/${file.id}`, { method: 'DELETE' })
        setFiles((prev) => prev.filter((f) => f.id !== file.id))
        setSelected(null)
        setFileToDelete(null)
      } catch (e) {
        alert(e instanceof Error ? e.message : 'Erro ao excluir imagem.')
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
        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href={publicPath}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Ver galeria pública
          </a>
          <Link
            href={`/admin/galeria/${gallery.id}/post/select`}
            className="inline-flex items-center rounded-lg bg-[#c62737] px-4 py-2 text-sm font-medium text-white hover:bg-[#a01f2d]"
          >
            Fazer postagem
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {files.map((file) => (
            <div key={file.id} className="group relative">
              <button
                type="button"
                onClick={() => setSelected(file)}
                className="w-full rounded-lg overflow-hidden border border-slate-200 bg-white text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c62737]"
              >
                <img
                  src={imageUrl(file.id, 'thumb')}
                  alt={file.name}
                  className="w-full h-32 object-cover"
                  loading="lazy"
                  decoding="async"
                />
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

        {/* Modal de confirmação de exclusão */}
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

        {selected && (
          <div
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
            onClick={() => setSelected(null)}
            role="presentation"
          >
            <div
              className="max-w-4xl w-full"
              onClick={(e) => e.stopPropagation()}
              role="presentation"
            >
              <div className="relative rounded-lg bg-black/30 min-h-[200px] flex items-center justify-center">
                {lightboxImageLoading && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-lg">
                    <span
                      className="h-12 w-12 rounded-full border-4 border-white/30 border-t-white animate-spin"
                      aria-hidden
                    />
                  </div>
                )}
                <img
                  src={imageUrl(selected.id, 'full')}
                  alt={selected.name}
                  className={`w-full max-h-[80vh] object-contain rounded-lg transition-opacity duration-200 ${lightboxImageLoading ? 'opacity-0' : 'opacity-100'}`}
                  onLoad={() => setLightboxImageLoading(false)}
                  onError={() => setLightboxImageLoading(false)}
                />
              </div>
              <div className="mt-3 flex flex-wrap justify-between items-center gap-2 text-white">
                <span>{selected.name}</span>
                <div className="flex items-center gap-2">
                  {canDeletePhotos && (
                    <button
                      type="button"
                      onClick={() => openDeleteModal(selected)}
                      disabled={deletingId === selected.id}
                      className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
                    >
                      {deletingId === selected.id ? 'Excluindo...' : 'Excluir do álbum'}
                    </button>
                  )}
                  <a
                    href={selected.webViewLink || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    Abrir no Drive
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageAccessGuard>
  )
}
