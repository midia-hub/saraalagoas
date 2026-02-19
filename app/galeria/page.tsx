'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import { GaleriaLoading } from '@/components/GaleriaLoading'
import { Camera } from 'lucide-react'

type GalleryItem = {
  id: string
  type: 'culto' | 'evento'
  title: string
  slug: string
  date: string
}

type GalleryFile = { id: string }

function formatDatePtBr(iso: string): string {
  try {
    const d = new Date(iso + 'T12:00:00')
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

const THUMB_SIZE = 160

function AlbumThumbnails({ fileIds }: { fileIds: string[] }) {
  if (fileIds.length === 0) {
    return (
      <div className="h-[120px] bg-gray-100 flex items-center justify-center">
        <Camera className="text-gray-300" size={40} />
      </div>
    )
  }
  const list = [...fileIds, ...fileIds]
  const duration = Math.max(fileIds.length * 3, 15)
  return (
    <div className="h-[120px] overflow-hidden bg-gray-100">
      <div
        className="flex gap-1 h-full w-max items-stretch animate-gallery-scroll"
        style={{ animationDuration: `${duration}s` }}
      >
        {list.map((id, i) => (
          <div key={`${id}-${i}`} className="relative flex-shrink-0 w-24 h-full overflow-hidden">
            <Image
              src={`/api/gallery/image?fileId=${encodeURIComponent(id)}&mode=thumb&size=${THUMB_SIZE}`}
              alt=""
              fill
              className="object-cover"
              sizes="96px"
              unoptimized
            />
          </div>
        ))}
      </div>
    </div>
  )
}

function GaleriaContent() {
  const searchParams = useSearchParams()
  const typeFilter = searchParams?.get('type') || ''
  const [items, setItems] = useState<GalleryItem[]>([])
  const [albumFiles, setAlbumFiles] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/gallery/list')
      .then((res) => res.json())
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch(() => setItems([]))
  }, [])

  useEffect(() => {
    if (items.length === 0) {
      setLoading(false)
      return
    }
    const abort = new AbortController()
    const all = items.map((item) =>
      fetch(`/api/gallery/${item.id}/files`, { signal: abort.signal })
        .then((res) => res.json())
        .then((files: GalleryFile[]) => ({ id: item.id, ids: (Array.isArray(files) ? files : []).map((f) => f.id).slice(0, 10) }))
        .catch(() => ({ id: item.id, ids: [] as string[] }))
    )
    Promise.all(all).then((results) => {
      const next: Record<string, string[]> = {}
      results.forEach((r) => { next[r.id] = r.ids })
      setAlbumFiles(next)
      setLoading(false)
    })
    return () => abort.abort()
  }, [items])

  const filtered = useMemo(() => {
    if (!typeFilter) return items
    return items.filter((item) => item.type === typeFilter)
  }, [items, typeFilter])

  const title =
    typeFilter === 'culto'
      ? 'Galeria de Cultos'
      : typeFilter === 'evento'
        ? 'Galeria de Eventos'
        : 'Galeria de Fotos'

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 md:px-6 lg:px-8 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-sara-gray-dark">
            {title}
          </h1>
          <p className="text-sara-gray-light mt-2">
            Acesse os álbuns de fotos dos nossos cultos e eventos.
          </p>
        </div>

        {loading ? (
          <GaleriaLoading
            title="Carregando álbuns"
            subtitle="Buscando álbuns e preparando fotos..."
            showGrid
            gridCount={8}
            className="min-h-[50vh]"
          />
        ) : filtered.length === 0 ? (
          <p className="text-center text-sara-gray-light">
            Nenhum álbum disponível no momento.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2 mb-6 justify-center">
            <Link
              href="/galeria"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${!typeFilter
                  ? 'bg-sara-red text-white'
                  : 'bg-white text-sara-gray-dark border border-gray-200 hover:border-sara-red/40'
                }`}
            >
              Todos
            </Link>
            <Link
              href="/galeria?type=culto"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${typeFilter === 'culto'
                  ? 'bg-sara-red text-white'
                  : 'bg-white text-sara-gray-dark border border-gray-200 hover:border-sara-red/40'
                }`}
            >
              Cultos
            </Link>
            <Link
              href="/galeria?type=evento"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${typeFilter === 'evento'
                  ? 'bg-sara-red text-white'
                  : 'bg-white text-sara-gray-dark border border-gray-200 hover:border-sara-red/40'
                }`}
            >
              Eventos
            </Link>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((item) => {
              const isXp26 = item.slug === 'xp26-alagoas'
              return (
                <Link
                  key={item.id}
                  href={`/galeria/${item.type}/${item.slug}/${item.date}`}
                  className={`block rounded-xl border overflow-hidden transition-all duration-300 ${isXp26
                      ? 'bg-slate-900 border-[#B6FF3B] shadow-[0_0_15px_rgba(182,255,59,0.2)] hover:shadow-[0_0_25px_rgba(182,255,59,0.4)]'
                      : 'bg-white border-gray-200 hover:border-sara-red/40 hover:shadow-md'
                    }`}
                >
                  <AlbumThumbnails fileIds={albumFiles[item.id] ?? []} />
                  <div className="p-4">
                    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded mb-2 ${isXp26 ? 'bg-[#B6FF3B]/10 text-[#B6FF3B]' : 'bg-sara-red/10 text-sara-red'
                      }`}>
                      {item.type === 'culto' ? 'Culto' : 'Evento'}
                    </span>
                    <h2 className={`font-semibold line-clamp-2 ${isXp26 ? 'text-white' : 'text-sara-gray-dark'}`}>
                      {item.title}
                    </h2>
                    <p className={`text-sm mt-1 ${isXp26 ? 'text-gray-400' : 'text-sara-gray-light'}`}>
                      {formatDatePtBr(item.date)}
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
        )}


        <div className="mt-10 text-center">
          <Link
            href="/"
            className="text-sara-red hover:underline font-medium"
          >
            ← Voltar para a página inicial
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function GaleriaPublicaPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50">
          <div className="container mx-auto px-4 md:px-6 lg:px-8 py-12">
            <GaleriaLoading
              title="Carregando álbuns"
              subtitle="Aguarde..."
              showGrid
              gridCount={8}
            />
          </div>
        </div>
      }
    >
      <GaleriaContent />
    </Suspense>
  )
}
