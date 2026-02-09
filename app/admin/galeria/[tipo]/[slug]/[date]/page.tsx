'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar, X, ChevronLeft, ChevronRight, ExternalLink, Image as ImageIcon } from 'lucide-react'

interface GalleryFile {
  id: string
  drive_file_id: string
  name: string
  web_view_link?: string
  thumbnail_link?: string
  mime_type?: string
}

interface Gallery {
  id: string
  type: 'culto' | 'evento'
  title: string
  slug: string
  date: string
  description?: string
}

export default function AdminGalleryViewPage() {
  const params = useParams()
  const [gallery, setGallery] = useState<Gallery | null>(null)
  const [files, setFiles] = useState<GalleryFile[]>([])
  const [loading, setLoading] = useState(true)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [loadedIds, setLoadedIds] = useState<Set<string>>(new Set())
  const onImageLoad = (id: string) => setLoadedIds((prev) => new Set(prev).add(id))

  const tipo = params.tipo as string
  const slug = params.slug as string
  const date = params.date as string

  useEffect(() => {
    loadGallery()
  }, [tipo, slug, date])

  async function loadGallery() {
    setLoading(true)
    try {
      const response = await fetch(`/api/gallery/list?type=${tipo}&slug=${slug}`)
      const data = await response.json()
      if (response.ok && data.galleries && data.galleries.length > 0) {
        const targetGallery = data.galleries.find((g: Gallery) => g.date === date)
        if (targetGallery) {
          setGallery(targetGallery)
          const filesResponse = await fetch(`/api/gallery/${targetGallery.id}/files?sync=true`)
          const filesData = await filesResponse.json()
          if (filesResponse.ok) setFiles(filesData.files || [])
        }
      }
    } catch (error) {
      console.error('Failed to load gallery:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })

  const openLightbox = (index: number) => {
    setCurrentImageIndex(index)
    setLightboxOpen(true)
  }
  const closeLightbox = () => setLightboxOpen(false)
  const nextImage = () => setCurrentImageIndex((prev) => (prev + 1) % files.length)
  const prevImage = () => setCurrentImageIndex((prev) => (prev - 1 + files.length) % files.length)

  useEffect(() => {
    if (!lightboxOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox()
      if (e.key === 'ArrowRight') nextImage()
      if (e.key === 'ArrowLeft') prevImage()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [lightboxOpen])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#c62737] mx-auto" />
          <p className="mt-4 text-gray-600">Carregando galeria...</p>
        </div>
      </div>
    )
  }

  if (!gallery) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Galeria não encontrada</h2>
        <Link href="/admin/galeria" className="text-[#c62737] hover:text-[#a01f2d] font-medium">
          Voltar para Galeria
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Breadcrumb e voltar */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-gray-500 min-w-0">
        <Link href="/admin" className="shrink-0 text-gray-500 hover:text-gray-900">
          Admin
        </Link>
        <span className="shrink-0">/</span>
        <Link href="/admin/galeria" className="shrink-0 text-gray-500 hover:text-gray-900">
          Galeria
        </Link>
        <span className="shrink-0">/</span>
        <span className="truncate text-gray-900 font-medium">{gallery.title}</span>
      </nav>

      <Link
        href="/admin/galeria"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
      >
        <ArrowLeft size={20} className="shrink-0" />
        Voltar para Galeria
      </Link>

      {/* Cabeçalho da galeria */}
      <header className="mb-8">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{gallery.title}</h1>
          <span className={`px-3 py-1 text-sm font-medium rounded-full shrink-0 ${gallery.type === 'culto' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
            {gallery.type === 'culto' ? 'Culto' : 'Evento'}
          </span>
        </div>
        <div className="flex items-center gap-2 text-gray-600 text-sm sm:text-base">
          <Calendar size={18} className="shrink-0" />
          <span>{formatDate(gallery.date)}</span>
          <span aria-hidden>·</span>
          <span>{files.length} {files.length === 1 ? 'foto' : 'fotos'}</span>
        </div>
        {gallery.description && (
          <p className="mt-4 text-gray-700 leading-relaxed">{gallery.description}</p>
        )}
      </header>

      {files.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
            <ImageIcon size={32} className="text-gray-400" />
          </div>
          <p className="text-gray-600 font-medium">Nenhuma foto encontrada nesta galeria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {files.map((file, index) => {
            const isPriority = index < 8
            const thumbUrl = `/api/gallery/image/${file.drive_file_id}?w=400`
            const isLoaded = loadedIds.has(file.id)
            return (
              <button
                key={file.id}
                type="button"
                onClick={() => openLightbox(index)}
                className="aspect-square bg-gray-200 rounded-xl overflow-hidden hover:scale-105 transition-transform group relative border-2 border-gray-200"
              >
                <div className={`absolute inset-0 bg-gray-200 animate-pulse transition-opacity duration-300 ${isLoaded ? 'opacity-0' : 'opacity-100'}`} aria-hidden />
                <img
                  src={thumbUrl}
                  alt={file.name}
                  className={`w-full h-full object-cover transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
                  loading={isPriority ? 'eager' : 'lazy'}
                  fetchPriority={isPriority ? 'high' : 'auto'}
                  decoding="async"
                  onLoad={() => onImageLoad(file.id)}
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors pointer-events-none" />
              </button>
            )
          })}
        </div>
      )}

      {lightboxOpen && files.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/97 flex items-center justify-center">
          <button onClick={closeLightbox} className="absolute top-6 right-6 p-3 text-white hover:bg-white/20 rounded-xl transition-all backdrop-blur-sm bg-black/30 z-10" aria-label="Fechar">
            <X size={28} />
          </button>
          {files.length > 1 && (
            <>
              <button onClick={prevImage} className="absolute left-6 p-4 text-white hover:bg-white/20 rounded-xl transition-all backdrop-blur-sm bg-black/30 z-10" aria-label="Anterior">
                <ChevronLeft size={36} />
              </button>
              <button onClick={nextImage} className="absolute right-6 p-4 text-white hover:bg-white/20 rounded-xl transition-all backdrop-blur-sm bg-black/30 z-10" aria-label="Próxima">
                <ChevronRight size={36} />
              </button>
            </>
          )}
          <div className="absolute top-6 left-1/2 -translate-x-1/2 px-5 py-2.5 bg-black/60 backdrop-blur-sm text-white rounded-xl text-sm font-semibold z-10">
            {currentImageIndex + 1} / {files.length}
          </div>
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3 z-10">
            {files[currentImageIndex].web_view_link && (
              <a href={files[currentImageIndex].web_view_link} target="_blank" rel="noopener noreferrer" className="px-5 py-3 bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white rounded-xl flex items-center gap-2 transition-all font-medium">
                <ExternalLink size={18} />
                Ver no Drive
              </a>
            )}
          </div>
          <div className="max-w-7xl max-h-[90vh] px-4 py-16">
            <img
              src={`/api/gallery/image/${files[currentImageIndex].drive_file_id}`}
              alt={files[currentImageIndex].name}
              className="max-w-full max-h-full object-contain"
            />
          </div>
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 px-5 py-2.5 bg-black/60 backdrop-blur-sm text-white rounded-xl text-sm z-10 max-w-lg truncate font-medium">
            {files[currentImageIndex].name}
          </div>
        </div>
      )}
    </div>
  )
}
