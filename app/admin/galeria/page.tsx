'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Calendar, Image as ImageIcon, Filter, Upload } from 'lucide-react'

/** Miniaturas do álbum: uma foto fixa ou várias passando em carrossel (usa ?w=300 para carregar mais rápido) */
function AlbumCardThumbnails({ fileIds }: { fileIds: string[] }) {
  const [index, setIndex] = useState(0)
  const [loaded, setLoaded] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (fileIds.length <= 1) return
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % fileIds.length)
    }, 3000)
    return () => clearInterval(t)
  }, [fileIds.length])

  return (
    <div className="absolute inset-0 bg-gray-200">
      {fileIds.map((id, i) => (
        <div
          key={id}
          className="absolute inset-0 transition-opacity duration-500"
          style={{ opacity: i === index ? 1 : 0, zIndex: i === index ? 1 : 0 }}
        >
          {!loaded.has(id) && <div className="absolute inset-0 bg-gray-200 animate-pulse" aria-hidden />}
          <img
            src={`/api/gallery/image/${id}?w=300`}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
            onLoad={() => setLoaded((prev) => new Set(prev).add(id))}
          />
        </div>
      ))}
    </div>
  )
}

interface Gallery {
  id: string
  type: 'culto' | 'evento'
  title: string
  slug: string
  date: string
  description?: string
  created_at: string
  gallery_files: Array<{ count: number }>
  thumbnail_file_ids: string[]
}

export default function AdminGaleriaPage() {
  const [galleries, setGalleries] = useState<Gallery[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<'all' | 'culto' | 'evento'>('all')

  useEffect(() => {
    loadGalleries()
  }, [filterType])

  async function loadGalleries() {
    setLoading(true)
    try {
      const response = await fetch(`/api/gallery/list?type=${filterType === 'all' ? '' : filterType}&limit=50`)
      const data = await response.json()
      if (response.ok) setGalleries(data.galleries || [])
    } catch (error) {
      console.error('Failed to load galleries:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-[#c62737] to-[#a01f2d] rounded-xl flex items-center justify-center shadow-lg">
            <ImageIcon className="text-white" size={26} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Galeria de Fotos</h1>
            <p className="text-gray-600 mt-1">Fotos de cultos e eventos</p>
          </div>
        </div>
        <Link
          href="/admin/upload"
          className="flex items-center justify-center gap-2 px-6 py-3.5 bg-[#c62737] text-white font-semibold rounded-xl hover:bg-[#a01f2d] transition-all shadow-md hover:shadow-lg"
        >
          <Upload size={20} />
          <span>Fazer Upload</span>
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={20} className="text-gray-600" />
          <span className="text-sm font-semibold text-gray-700">Filtrar por tipo:</span>
        </div>
        <div className="flex flex-wrap gap-3">
          {(['all', 'culto', 'evento'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-5 py-2.5 rounded-xl font-semibold transition-all ${
                filterType === t 
                  ? 'bg-[#c62737] text-white shadow-md' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {t === 'all' ? 'Todos' : t === 'culto' ? 'Cultos' : 'Eventos'}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="text-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#c62737] mx-auto" />
          <p className="mt-4 text-gray-600 font-medium">Carregando galerias...</p>
        </div>
      )}

      {!loading && galleries.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="w-20 h-20 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-6">
            <ImageIcon className="text-gray-400" size={40} />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-3">Nenhuma galeria encontrada</h3>
          <p className="text-gray-600 mb-8 text-lg">
            {filterType === 'all'
              ? 'Ainda não há galerias cadastradas.'
              : `Não há galerias de ${filterType === 'culto' ? 'cultos' : 'eventos'}.`}
          </p>
          <Link
            href="/admin/upload"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#c62737] text-white font-semibold rounded-xl hover:bg-[#a01f2d] transition-all shadow-md hover:shadow-lg"
          >
            <Upload size={20} />
            Criar Primeira Galeria
          </Link>
        </div>
      )}

      {!loading && galleries.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {galleries.map((gallery) => {
            const fileCount = gallery.gallery_files?.[0]?.count || 0
            const thumbIds = gallery.thumbnail_file_ids || []
            const hasThumbnails = thumbIds.length > 0
            const galleryPath = `/admin/galeria/${gallery.type}/${gallery.slug}/${gallery.date}`
            return (
              <Link
                key={gallery.id}
                href={galleryPath}
                className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all overflow-hidden group border border-gray-100"
              >
                <div className="aspect-video bg-gray-100 relative overflow-hidden">
                  {hasThumbnails ? (
                    <AlbumCardThumbnails fileIds={thumbIds} />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-[#c62737] to-[#a01f2d] flex items-center justify-center">
                      <ImageIcon className="text-white/40" size={64} />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="p-5">
                  <div className="flex items-start gap-3 mb-3">
                    <h3 className="flex-1 text-lg font-bold text-gray-900 group-hover:text-[#c62737] transition-colors line-clamp-2">
                      {gallery.title}
                    </h3>
                    <span className={`shrink-0 px-2.5 py-1 text-xs font-semibold rounded-full ${gallery.type === 'culto' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                      {gallery.type === 'culto' ? 'Culto' : 'Evento'}
                    </span>
                  </div>
                  {gallery.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">{gallery.description}</p>
                  )}
                  <div className="flex items-center justify-between text-sm text-gray-500 pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={16} className="text-gray-400" />
                      <span className="font-medium">{formatDate(gallery.date)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <ImageIcon size={16} className="text-gray-400" />
                      <span className="font-semibold text-[#c62737]">{fileCount}</span>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
