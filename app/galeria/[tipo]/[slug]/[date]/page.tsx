'use client'

import React, { useEffect, useMemo, useState, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Download, ChevronLeft, ChevronRight, ArrowLeft, X, Loader2 } from 'lucide-react'
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
  const [imageLoading, setImageLoading] = useState(false)

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
      try {
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
      } catch (err) {
        console.error('[Galeria] Erro ao carregar arquivos:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [routeQuery])

  const selectedIndex = selected ? files.findIndex((f) => f.id === selected.id) : -1
  const hasPrev = selectedIndex > 0
  const hasNext = selectedIndex >= 0 && selectedIndex < files.length - 1

  const goPrev = useCallback(() => {
    if (!hasPrev || !selected) return
    setImageLoading(true)
    setSelected(files[selectedIndex - 1])
  }, [files, hasPrev, selected, selectedIndex])

  const goNext = useCallback(() => {
    if (!hasNext || !selected) return
    setImageLoading(true)
    setSelected(files[selectedIndex + 1])
  }, [files, hasNext, selected, selectedIndex])

  useEffect(() => {
    if (selected) {
      setImageLoading(true)
    }
  }, [selected?.id])

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
          <div 
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center backdrop-blur-md transition-all duration-300" 
            onClick={() => setSelected(null)}
          >
            {/* Botão de Fechar Superior Direito */}
            <button
              className="absolute top-6 right-6 z-[60] text-white/50 p-3 hover:text-white hover:bg-white/10 rounded-full transition-all duration-200 group"
              onClick={() => setSelected(null)}
              title="Fechar (Esc)"
            >
              <X size={32} className="group-hover:scale-110 transition-transform" />
            </button>

            <div className="relative w-full h-full flex items-center justify-center p-4 md:p-12" onClick={(e) => e.stopPropagation()}>
              {/* Botão Anterior - Área de toque expandida */}
              <button
                type="button"
                disabled={!hasPrev}
                onClick={(e) => { e.stopPropagation(); goPrev() }}
                className={`absolute left-0 top-0 bottom-0 w-24 md:w-32 z-50 flex items-center justify-center group transition-opacity ${!hasPrev ? 'opacity-0 cursor-default' : 'opacity-100'}`}
                aria-label="Imagem anterior"
              >
                <div className="flex items-center justify-center w-14 h-14 rounded-full bg-black/20 text-white/40 group-hover:bg-white/10 group-hover:text-white group-active:scale-95 transition-all border border-white/5 backdrop-blur-sm shadow-xl">
                  <ChevronLeft size={36} className="group-hover:-translate-x-0.5 transition-transform" />
                </div>
              </button>

              {/* Container da Imagem */}
              <div className="relative max-w-5xl w-full h-full flex items-center justify-center pointer-events-none">
                {imageLoading && (
                  <div className="absolute inset-0 flex items-center justify-center z-10">
                    <Loader2 size={48} className="text-white animate-spin opacity-50" />
                  </div>
                )}
                <img 
                  src={imageUrl(selected.id, 'full')} 
                  alt={selected.name} 
                  className={`max-w-full max-h-[80vh] object-contain rounded shadow-[0_0_50px_rgba(0,0,0,0.5)] pointer-events-auto select-none transition-opacity duration-300 ${imageLoading ? 'opacity-0' : 'opacity-100'}`}
                  onLoad={() => setImageLoading(false)}
                  onContextMenu={(e) => e.preventDefault()}
                />
              </div>

              {/* Botão Próximo - Área de toque expandida */}
              <button
                type="button"
                disabled={!hasNext}
                onClick={(e) => { e.stopPropagation(); goNext() }}
                className={`absolute right-0 top-0 bottom-0 w-24 md:w-32 z-50 flex items-center justify-center group transition-opacity ${!hasNext ? 'opacity-0 cursor-default' : 'opacity-100'}`}
                aria-label="Próxima imagem"
              >
                <div className="flex items-center justify-center w-14 h-14 rounded-full bg-black/20 text-white/40 group-hover:bg-white/10 group-hover:text-white group-active:scale-95 transition-all border border-white/5 backdrop-blur-sm shadow-xl">
                  <ChevronRight size={36} className="group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            </div>

            {/* Rodapé de Informações e Ações */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 pb-10 flex flex-col md:flex-row items-center justify-between gap-4 text-white z-50" onClick={(e) => e.stopPropagation()}>
              <div className="flex flex-col items-center md:items-start">
                <span className={`text-lg transition-all duration-300 ${isXp26 ? 'font-medium tracking-wide text-neon' : 'text-white'}`} style={isXp26 ? { color: NEON } : {}}>
                  {selected.name}
                </span>
                <span className="text-xs text-white/40 mt-1 uppercase tracking-widest">
                  Imagem {selectedIndex + 1} de {files.length}
                </span>
              </div>
              
              <div className="flex items-center gap-4">
                <a
                  href={imageUrl(selected.id, 'full')}
                  download={selected.name}
                  className={`inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold uppercase tracking-widest transition-all duration-300 group ${isXp26
                      ? 'bg-neon hover:shadow-[0_0_25px_rgba(182,255,59,0.4)]'
                      : 'bg-white text-slate-900 hover:bg-sara-red hover:text-white'
                    }`}
                  style={isXp26 ? { backgroundColor: NEON, color: '#0B0F2A' } : {}}
                >
                  <Download size={20} className="group-hover:bounce-slow" aria-hidden />
                  BAIXAR FOTO
                </a>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}


