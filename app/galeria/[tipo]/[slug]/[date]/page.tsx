'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { GaleriaLoading } from '@/components/GaleriaLoading'

type Gallery = {
  id: string
  type: 'culto' | 'evento'
  title: string
  slug: string
  date: string
}

type DriveFile = {
  id: string
  name: string
  webViewLink: string | null
  thumbnailLink: string | null
  viewUrl: string
}

function imageUrl(fileId: string, mode: 'thumb' | 'full' = 'full'): string {
  return `/api/gallery/image?fileId=${encodeURIComponent(fileId)}&mode=${mode}`
}

export default function GalleryDetailPage() {
  const router = useRouter()
  const params = useParams<{ tipo: string; slug: string; date: string }>()
  const [gallery, setGallery] = useState<Gallery | null>(null)
  const [files, setFiles] = useState<DriveFile[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<DriveFile | null>(null)
  const [selectedForInstagram, setSelectedForInstagram] = useState<string[]>([])
  const [selectionError, setSelectionError] = useState<string | null>(null)

  const routeQuery = useMemo(() => {
    if (!params?.tipo || !params?.slug || !params?.date) return ''
    const search = new URLSearchParams({
      type: params.tipo,
      slug: params.slug,
      date: params.date,
    })
    return search.toString()
  }, [params])

  useEffect(() => {
    async function load() {
      if (!routeQuery) {
        setLoading(false)
        return
      }
      const listRes = await fetch(`/api/gallery/list?${routeQuery}`)
      const list = await listRes.json().catch(() => [])
      const first = Array.isArray(list) ? list[0] : null
      if (!first?.id) {
        setLoading(false)
        return
      }
      setGallery(first)

      const filesRes = await fetch(`/api/gallery/${first.id}/files`)
      const filesJson = await filesRes.json().catch(() => [])
      setFiles(Array.isArray(filesJson) ? filesJson : [])
      setLoading(false)
    }
    load()
  }, [routeQuery])

  function toggleInstagramSelection(fileId: string) {
    setSelectedForInstagram((prev) => {
      if (prev.includes(fileId)) {
        setSelectionError(null)
        return prev.filter((id) => id !== fileId)
      }
      if (prev.length >= 10) {
        setSelectionError('Você pode selecionar no máximo 10 imagens para o Instagram.')
        return prev
      }
      setSelectionError(null)
      return [...prev, fileId]
    })
  }

  function handleCreateInstagramPost() {
    if (!gallery?.id) return
    if (selectedForInstagram.length < 1) {
      setSelectionError('Selecione pelo menos 1 imagem para continuar.')
      return
    }
    const query = new URLSearchParams({
      galleryId: gallery.id,
      selected: selectedForInstagram.join(','),
    })
    router.push(`/admin/instagram/post/publish?${query.toString()}`)
  }

  if (loading) {
    return (
      <div className="min-h-[50vh] p-6 md:p-8">
        <GaleriaLoading title="Carregando galeria" subtitle="Buscando fotos..." />
      </div>
    )
  }
  if (!gallery) return <div className="p-6">Galeria não encontrada.</div>

  return (
    <div className="max-w-6xl mx-auto p-6 md:p-8">
      <h1 className="text-2xl font-bold text-slate-900">{gallery.title}</h1>
      <p className="text-slate-600 mt-1">{gallery.type} • {gallery.date}</p>
      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-slate-800">Postagem no Instagram</p>
            <p className="text-sm text-slate-600">
              Selecionadas: <strong>{selectedForInstagram.length}</strong> / 10
            </p>
          </div>
          <button
            type="button"
            onClick={handleCreateInstagramPost}
            disabled={selectedForInstagram.length === 0}
            className="rounded-lg bg-[#c62737] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            Criar post no Admin
          </button>
        </div>
        {selectionError && (
          <p className="mt-2 text-sm text-red-700">{selectionError}</p>
        )}
      </div>

      <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {files.map((file) => {
          const isSelected = selectedForInstagram.includes(file.id)
          return (
            <div key={file.id} className={`rounded-lg overflow-hidden border bg-white ${isSelected ? 'border-[#c62737]' : 'border-slate-200'}`}>
              <button
                type="button"
                onClick={() => setSelected(file)}
                className="w-full"
                title={file.name}
              >
                <img src={imageUrl(file.id, 'thumb')} alt={file.name} className="w-full h-32 object-cover" loading="lazy" decoding="async" />
              </button>
              <div className="p-2">
                <button
                  type="button"
                  onClick={() => toggleInstagramSelection(file.id)}
                  className={`w-full rounded-md px-2 py-1 text-xs font-medium ${
                    isSelected
                      ? 'bg-[#c62737] text-white'
                      : 'border border-slate-300 text-slate-700'
                  }`}
                >
                  {isSelected ? 'Selecionada para Instagram' : 'Selecionar para Instagram'}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
            <img src={imageUrl(selected.id, 'full')} alt={selected.name} className="w-full max-h-[80vh] object-contain rounded-lg" />
            <div className="mt-3 flex justify-between text-white">
              <span>{selected.name}</span>
              <a href={selected.webViewLink || selected.viewUrl} target="_blank" rel="noopener noreferrer" className="underline">
                Abrir no Drive
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

