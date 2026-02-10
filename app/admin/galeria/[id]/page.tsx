'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
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
  const [gallery, setGallery] = useState<Gallery | null>(null)
  const [files, setFiles] = useState<GalleryFile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<GalleryFile | null>(null)

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

  if (loading) {
    return (
      <PageAccessGuard pageKey="galeria">
        <div className="p-6 md:p-8">
          <p className="text-slate-600">Carregando álbum...</p>
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
            <button
              key={file.id}
              type="button"
              onClick={() => setSelected(file)}
              className="rounded-lg overflow-hidden border border-slate-200 bg-white text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c62737]"
            >
              <img
                src={imageUrl(file.id, 'thumb')}
                alt={file.name}
                className="w-full h-32 object-cover"
                loading="lazy"
                decoding="async"
              />
            </button>
          ))}
        </div>
        {files.length === 0 && (
          <p className="text-slate-500">Nenhuma foto neste álbum ainda.</p>
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
              <img
                src={imageUrl(selected.id, 'full')}
                alt={selected.name}
                className="w-full max-h-[80vh] object-contain rounded-lg"
              />
              <div className="mt-3 flex justify-between items-center text-white">
                <span>{selected.name}</span>
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
        )}
      </div>
    </PageAccessGuard>
  )
}
