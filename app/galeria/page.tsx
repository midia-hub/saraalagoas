'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { GaleriaLoading } from '@/components/GaleriaLoading'

type GalleryItem = {
  id: string
  type: 'culto' | 'evento'
  title: string
  slug: string
  date: string
}

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

function GaleriaContent() {
  const searchParams = useSearchParams()
  const typeFilter = searchParams?.get('type') || ''
  const [items, setItems] = useState<GalleryItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/gallery/list')
      .then((res) => res.json())
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [])

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
            subtitle="Buscando álbuns..."
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
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                !typeFilter
                  ? 'bg-sara-red text-white'
                  : 'bg-white text-sara-gray-dark border border-gray-200 hover:border-sara-red/40'
              }`}
            >
              Todos
            </Link>
            <Link
              href="/galeria?type=culto"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                typeFilter === 'culto'
                  ? 'bg-sara-red text-white'
                  : 'bg-white text-sara-gray-dark border border-gray-200 hover:border-sara-red/40'
              }`}
            >
              Cultos
            </Link>
            <Link
              href="/galeria?type=evento"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                typeFilter === 'evento'
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
            {filtered.map((item) => (
              <Link
                key={item.id}
                href={`/galeria/${item.type}/${item.slug}/${item.date}`}
                className="block bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-sara-red/40 hover:shadow-md transition-all"
              >
                <div className="p-4">
                  <span className="inline-block px-2 py-0.5 text-xs font-medium rounded bg-sara-red/10 text-sara-red mb-2">
                    {item.type === 'culto' ? 'Culto' : 'Evento'}
                  </span>
                  <h2 className="font-semibold text-sara-gray-dark line-clamp-2">
                    {item.title}
                  </h2>
                  <p className="text-sm text-sara-gray-light mt-1">
                    {formatDatePtBr(item.date)}
                  </p>
                </div>
              </Link>
            ))}
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
