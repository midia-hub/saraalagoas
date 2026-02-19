'use client'

import React, { useEffect, useMemo, useState, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Download, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react'
import { GaleriaLoading } from '@/components/GaleriaLoading'
import { Xp26Background } from '@/components/Xp26Background'
import { Orbitron } from 'next/font/google'

const orbitron = Orbitron({ weight: ['600', '700'], subsets: ['latin'], display: 'swap' })

const NEON = '#B6FF3B'
const TEXT_WHITE = '#FFFFFF'
const TEXT_GRAY = '#DADADA'

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
  const params = useParams<{ tipo: string; slug: string; date: string }>()
  const [gallery, setGallery] = useState<Gallery | null>(null)
  const [files, setFiles] = useState<DriveFile[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<DriveFile | null>(null)

  const isXp26 = params?.slug === 'xp26-alagoas'

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

  const selectedIndex = selected ? files.findIndex((f) => f.id === selected.id) : -1
  const hasPrev = selectedIndex > 0
  const hasNext = selectedIndex >= 0 && selectedIndex < files.length - 1

  const goPrev = useCallback(() => {
    if (!hasPrev || !selected) return
    setSelected(files[selectedIndex - 1])
  }, [files, hasPrev, selected, selectedIndex])

  const goNext = useCallback(() => {
    if (!hasNext || !selected) return
    setSelected(files[selectedIndex + 1])
  }, [files, hasNext, selected, selectedIndex])

  useEffect(() => {
    if (!selected) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        goPrev()
      } else if (e.key === 'ArrowRight') {
        goNext()
      } else if (e.key === 'Escape') {
        setSelected(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected, goPrev, goNext])

  if (loading) {
    return (
      <div className={`min-h-[50vh] p-6 md:p-8 ${isXp26 ? 'relative' : ''}`}>
        {isXp26 && <Xp26Background />}
        <div className="relative z-10">
          <GaleriaLoading
            title="Carregando galeria"
            subtitle="Buscando fotos..."
            variant={isXp26 ? 'dark' : 'default'}
          />
        </div>
      </div>
    )
  }

  if (!gallery) {
    return (
      <div className={`p-6 ${isXp26 ? 'text-white' : ''}`}>
        {isXp26 && <Xp26Background />}
        <div className="relative z-10">Não conseguimos localizar a galeria.</div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${isXp26 ? 'relative' : 'bg-gray-50'}`}>
      {isXp26 && <Xp26Background />}

      <div className="relative z-10 max-w-6xl mx-auto p-6 md:p-8">
        <Link
          href="/galeria"
          className={`inline-flex items-center gap-2 font-medium mb-4 transition-colors ${isXp26
              ? 'text-neon hover:opacity-80'
              : 'text-slate-600 hover:text-sara-red'
            }`}
          style={isXp26 ? { color: NEON } : {}}
        >
          <ArrowLeft size={20} aria-hidden />
          Voltar para a galeria
        </Link>

        <h1 className={`text-2xl font-bold ${isXp26 ? orbitron.className : 'text-slate-900'}`} style={isXp26 ? { color: NEON, textShadow: `0 0 10px ${NEON}40` } : {}}>
          {gallery.title}
        </h1>
        <p className={`mt-1 ${isXp26 ? '' : 'text-slate-600'}`} style={isXp26 ? { color: TEXT_GRAY } : {}}>
          {gallery.type === 'culto' ? 'Culto' : 'Evento'} • {gallery.date}
        </p>

        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {files.map((file) => (
            <div
              key={file.id}
              className={`rounded-lg overflow-hidden border transition-all duration-300 group ${isXp26
                  ? 'border-white/10 bg-white/5 hover:border-neon hover:shadow-[0_0_15px_rgba(182,255,59,0.3)]'
                  : 'border-slate-200 bg-white shadow-sm hover:border-sara-red/40'
                }`}
              style={isXp26 ? {} : {}}
            >
              <button
                type="button"
                onClick={() => setSelected(file)}
                className="w-full block"
                title={file.name}
              >
                <img
                  src={imageUrl(file.id, 'thumb')}
                  alt={file.name}
                  className="w-full h-32 object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                  decoding="async"
                />
              </button>
            </div>
          ))}
        </div>

        {selected ? (
          <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setSelected(null)}>
            <div className="relative max-w-4xl w-full flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              {hasPrev ? (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); goPrev() }}
                  className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 md:-translate-x-14 z-10 flex items-center justify-center w-12 h-12 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors border border-white/10"
                  aria-label="Imagem anterior"
                >
                  <ChevronLeft size={28} />
                </button>
              ) : null}
              <img src={imageUrl(selected.id, 'full')} alt={selected.name} className="w-full max-h-[85vh] object-contain rounded-lg shadow-2xl" />
              {hasNext ? (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); goNext() }}
                  className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 md:translate-x-14 z-10 flex items-center justify-center w-12 h-12 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors border border-white/10"
                  aria-label="Próxima imagem"
                >
                  <ChevronRight size={28} />
                </button>
              ) : null}
            </div>
            <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center justify-between gap-3 text-white px-4">
              <span className={`truncate ${isXp26 ? 'font-medium' : ''}`}>{selected.name}</span>
              <div className="flex items-center gap-3">
                <a
                  href={imageUrl(selected.id, 'full')}
                  download={selected.name}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-bold uppercase tracking-wider transition-all duration-300 ${isXp26
                      ? 'bg-neon text-dark hover:shadow-[0_0_20px_rgba(182,255,59,0.5)]'
                      : 'bg-white/20 hover:bg-white/30'
                    }`}
                  style={isXp26 ? { backgroundColor: NEON, color: '#0B0F2A' } : {}}
                >
                  <Download size={18} aria-hidden />
                  Download
                </a>
                <a
                  href={selected.webViewLink || selected.viewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm opacity-70 hover:opacity-100 transition-opacity flex items-center gap-1"
                >
                  Google Drive
                </a>
              </div>
            </div>
            <button
              className="absolute top-4 right-4 text-white p-2 hover:bg-white/10 rounded-full transition-colors"
              onClick={() => setSelected(null)}
            >
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}


