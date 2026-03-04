'use client'

/**
 * /fotos/[id]
 *
 * Página pública do álbum de reconhecimento facial.
 * Não exige login — compartilhável diretamente com a pessoa.
 * Permite visualizar e baixar as fotos encontradas.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import {
  Download,
  ChevronLeft,
  ChevronRight,
  X,
  ScanFace,
  Loader2,
  Camera,
  ZoomIn,
  LayoutGrid,
  CalendarDays,
  Keyboard,
} from 'lucide-react'

// ─── Tipos ────────────────────────────────────────────────────────────────────

type PublicPhoto = {
  driveFileId: string
  similarity: number
  thumbnailUrl: string
  viewUrl: string
  downloadUrl: string
  fileName: string
  gallery: { id: string; title: string; date: string } | null
}

type PublicPersonData = {
  id: string
  name: string
  reference_url: string | null
}

type AlbumData = {
  person: PublicPersonData
  photos: PublicPhoto[]
  total: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function groupByGallery(photos: PublicPhoto[]): Map<string, PublicPhoto[]> {
  const map = new Map<string, PublicPhoto[]>()
  for (const p of photos) {
    const key = p.gallery?.id ?? '__sem_album'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(p)
  }
  return map
}

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
}

/** Ajusta o tamanho em URLs do proxy (/api/public/drive-thumb) ou do Drive direto */
function driveThumbnail(url: string, size = 'w400') {
  if (!url) return url
  const w = size.replace('w', '') // 'w400' → '400'
  // Proxy: /api/public/drive-thumb/ID?w=400
  if (url.includes('/drive-thumb/')) {
    return url.replace(/([?&])w=\d+/, `$1w=${w}`)
  }
  // Drive legado: drive.google.com/thumbnail?id=...&sz=wXXX
  return url.replace(/sz=w\d+/, `sz=${size}`)
}

// ─── Componente de imagem com skeleton ────────────────────────────────────────

function PhotoThumb({
  photo,
  idx,
  onClick,
  onDownload,
  isDownloading,
}: {
  photo: PublicPhoto
  idx: number
  onClick: () => void
  onDownload: (e: React.MouseEvent) => void
  isDownloading: boolean
}) {
  const [loaded, setLoaded] = useState(false)
  const [errored, setErrored] = useState(false)
  // w400 é suficiente para grid de ~220 px — muito mais rápido que w640
  const src = driveThumbnail(photo.thumbnailUrl, 'w400')

  return (
    <div
      className="group relative aspect-[4/3] rounded-xl overflow-hidden bg-slate-100 cursor-pointer shadow-sm hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      {/* Skeleton */}
      {!loaded && !errored && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-slate-200 to-slate-100 flex items-center justify-center">
          <Camera className="w-6 h-6 text-slate-300" />
        </div>
      )}

      {/* Imagem */}
      <img
        src={src}
        alt={photo.fileName}
        className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-110 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        loading={idx < 6 ? 'eager' : 'lazy'}
        decoding={idx < 6 ? 'sync' : 'async'}
        onLoad={() => setLoaded(true)}
        onError={() => {
          setErrored(true)
          setLoaded(true)
        }}
      />

      {/* Ícone de erro */}
      {errored && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
          <Camera className="w-8 h-8 text-slate-300" />
        </div>
      )}

      {/* Overlay hover */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-2.5">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onDownload}
            disabled={isDownloading}
            title="Baixar"
            className="w-7 h-7 rounded-lg bg-black/40 hover:bg-black/60 flex items-center justify-center text-white transition-colors disabled:opacity-50"
          >
            {isDownloading
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Download className="w-3.5 h-3.5" />}
          </button>
          <div className="w-7 h-7 rounded-lg bg-black/40 flex items-center justify-center text-white">
            <ZoomIn className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Componente de imagem do lightbox com skeleton ────────────────────────────

function LightboxImage({ src, fallbackSrc, alt }: { src: string; fallbackSrc: string; alt: string }) {
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    setLoaded(false)
    setFailed(false)
    // Se a imagem já está em cache o onLoad não dispara — verificamos manualmente
    if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
      setLoaded(true)
    }
  }, [src])

  const activeSrc = failed ? fallbackSrc : src

  return (
    <div className="relative flex items-center justify-center w-full h-full">
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Loader2 className="w-8 h-8 animate-spin text-white/40" />
        </div>
      )}
      <img
        ref={imgRef}
        src={activeSrc}
        alt={alt}
        className={`max-h-full max-w-full object-contain rounded-xl shadow-2xl transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        style={{ maxHeight: 'calc(100vh - 200px)' }}
        loading="eager"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => { if (!failed) setFailed(true); else setLoaded(true) }}
      />
    </div>
  )
}

// ─── Skeleton do conteúdo enquanto carrega ────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header skeleton */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-8 py-6 flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-slate-200 animate-pulse flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-slate-200 rounded animate-pulse w-16" />
            <div className="h-7 bg-slate-200 rounded animate-pulse w-48" />
            <div className="flex gap-2 mt-1">
              <div className="h-6 bg-slate-200 rounded-full animate-pulse w-28" />
              <div className="h-6 bg-slate-200 rounded-full animate-pulse w-20" />
            </div>
          </div>
        </div>
      </div>
      {/* Cards skeleton */}
      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8 space-y-6">
        {[0, 1].map(i => (
          <div key={i} className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-slate-200 animate-pulse" />
              <div className="space-y-1.5">
                <div className="h-4 w-40 bg-slate-200 rounded animate-pulse" />
                <div className="h-3 w-24 bg-slate-200 rounded animate-pulse" />
              </div>
            </div>
            <div className="p-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {Array.from({ length: 4 + i * 2 }).map((_, j) => (
                <div key={j} className="aspect-[4/3] rounded-xl bg-slate-200 animate-pulse" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function FotosPublicaPage() {
  const params = useParams()
  const personId = params?.id as string

  const [data, setData]       = useState<AlbumData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  // Lightbox
  const [lightbox, setLightbox] = useState<{ photos: PublicPhoto[]; index: number } | null>(null)
  const [downloading, setDownloading] = useState<string | null>(null)
  const [downloadingAll, setDownloadingAll] = useState<string | null>(null)
  const thumbStripRef = useRef<HTMLDivElement>(null)
  const touchStartX = useRef<number | null>(null)

  // ── Carrega dados ──────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    if (!personId) return
    try {
      setLoading(true)
      const res = await fetch(`/api/public/rekognition/${personId}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Não encontrado.')
      }
      setData(await res.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar.')
    } finally {
      setLoading(false)
    }
  }, [personId])

  useEffect(() => { load() }, [load])

  // ── Download ───────────────────────────────────────────────────────────────

  async function handleDownload(photo: PublicPhoto) {
    setDownloading(photo.driveFileId)
    try {
      const res = await fetch(photo.downloadUrl)
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = photo.fileName
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      window.open(photo.downloadUrl, '_blank')
    } finally {
      setDownloading(null)
    }
  }

  async function handleDownloadAll(galleryId: string, photos: PublicPhoto[]) {
    setDownloadingAll(galleryId)
    for (const photo of photos) {
      try {
        const res = await fetch(photo.downloadUrl)
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = photo.fileName
        a.click()
        URL.revokeObjectURL(url)
        await new Promise(r => setTimeout(r, 400))
      } catch {
        window.open(photo.downloadUrl, '_blank')
      }
    }
    setDownloadingAll(null)
  }

  // ── Lightbox ───────────────────────────────────────────────────────────────

  const closeLightbox = () => setLightbox(null)

  function lightboxPrev() {
    if (!lightbox) return
    const newIndex = (lightbox.index - 1 + lightbox.photos.length) % lightbox.photos.length
    setLightbox({ ...lightbox, index: newIndex })
    scrollThumbIntoView(newIndex)
  }

  function lightboxNext() {
    if (!lightbox) return
    const newIndex = (lightbox.index + 1) % lightbox.photos.length
    setLightbox({ ...lightbox, index: newIndex })
    scrollThumbIntoView(newIndex)
  }

  // Pré-carrega as fotos vizinhas no lightbox
  useEffect(() => {
    if (!lightbox) return
    const { photos, index } = lightbox
    const toPreload = [
      photos[(index + 1) % photos.length],
      photos[(index - 1 + photos.length) % photos.length],
    ]
    toPreload.forEach(p => {
      const img = new window.Image()
      img.src = driveThumbnail(p.thumbnailUrl, 'w1600')
    })
  }, [lightbox?.index])

  function scrollThumbIntoView(index: number) {
    setTimeout(() => {
      const strip = thumbStripRef.current
      if (!strip) return
      const thumb = strip.children[index] as HTMLElement
      if (thumb) thumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }, 50)
  }

  useEffect(() => {
    if (!lightbox) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape')     closeLightbox()
      if (e.key === 'ArrowLeft')  lightboxPrev()
      if (e.key === 'ArrowRight') lightboxNext()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [lightbox])

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) return <PageSkeleton />

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center">
          <ScanFace className="w-10 h-10 text-slate-300" />
        </div>
        <h1 className="text-xl font-semibold text-slate-800">Álbum não encontrado</h1>
        <p className="text-slate-500 text-sm max-w-xs">{error ?? 'O link pode estar desatualizado ou inválido.'}</p>
      </div>
    )
  }

  const { person, photos } = data
  const grouped = groupByGallery(photos)

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Header ── */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-center gap-5">

            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-100 ring-4 ring-[#c62737]/20 shadow-md">
                {person.reference_url ? (
                  <img src={person.reference_url} alt={person.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ScanFace className="w-10 h-10 text-slate-300" />
                  </div>
                )}
              </div>
              <span className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-lg bg-[#c62737] flex items-center justify-center shadow">
                <Camera className="w-3 h-3 text-white" />
              </span>
            </div>

            {/* Info */}
            <div className="text-center sm:text-left">
              <p className="text-[#c62737] text-xs font-semibold uppercase tracking-widest mb-0.5">Suas fotos</p>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">{person.name}</h1>
              <div className="flex items-center justify-center sm:justify-start flex-wrap gap-2 mt-2">
                <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-600 text-xs font-medium rounded-full px-3 py-1">
                  <LayoutGrid className="w-3.5 h-3.5 text-[#c62737]" />
                  {data.total} foto{data.total !== 1 ? 's' : ''} encontrada{data.total !== 1 ? 's' : ''}
                </span>
                <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-600 text-xs font-medium rounded-full px-3 py-1">
                  <CalendarDays className="w-3.5 h-3.5 text-[#c62737]" />
                  {grouped.size} {grouped.size !== 1 ? 'álbuns' : 'álbum'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Conteúdo ── */}
      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8 space-y-6">

        {photos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center rounded-2xl border border-slate-200 bg-white">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
              <LayoutGrid className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-slate-700 font-semibold text-lg">Nenhuma foto encontrada ainda</p>
            <p className="text-sm text-slate-400">As fotos são identificadas automaticamente. Volte em breve!</p>
          </div>
        ) : (
          Array.from(grouped).map(([galleryKey, groupPhotos]) => {
            const gallery = groupPhotos[0].gallery
            return (
              <div key={galleryKey} className="rounded-2xl border border-slate-200 bg-white shadow-sm">

                {/* Header do álbum */}
                <div className="px-5 py-4 flex items-center justify-between border-b border-slate-100 rounded-t-2xl bg-slate-50">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-xl bg-[#c62737]/10 flex items-center justify-center flex-shrink-0">
                      <Camera className="w-4 h-4 text-[#c62737]" />
                    </span>
                    <div>
                      <h2 className="font-semibold text-slate-800 text-sm sm:text-base leading-tight">
                        {gallery ? gallery.title : 'Fotos sem álbum'}
                      </h2>
                      {gallery && (
                        <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                          <CalendarDays className="w-3 h-3" />
                          {formatDate(gallery.date)}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 hidden sm:block">
                      {groupPhotos.length} foto{groupPhotos.length !== 1 ? 's' : ''}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDownloadAll(galleryKey, groupPhotos)}
                      disabled={downloadingAll === galleryKey}
                      title="Baixar todas"
                      className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 hover:bg-[#c62737] hover:text-white text-slate-600 px-3 py-1.5 text-xs font-medium transition-all disabled:opacity-50"
                    >
                      {downloadingAll === galleryKey
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Download className="w-3.5 h-3.5" />}
                      <span className="hidden sm:inline">Baixar todas</span>
                    </button>
                  </div>
                </div>

                {/* Grade de fotos */}
                <div className="p-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {groupPhotos.map((photo, idx) => (
                    <PhotoThumb
                      key={photo.driveFileId}
                      photo={photo}
                      idx={idx}
                      onClick={() => setLightbox({ photos: groupPhotos, index: idx })}
                      onDownload={(e) => { e.stopPropagation(); handleDownload(photo) }}
                      isDownloading={downloading === photo.driveFileId}
                    />
                  ))}
                </div>
              </div>
            )
          })
        )}

        {/* Rodapé */}
        <div className="flex items-center justify-center gap-3 pt-2 pb-4">
          <div className="h-px flex-1 bg-slate-200 max-w-[80px]" />
          <p className="text-xs text-slate-400">Sara Sede Alagoas · Fotos identificadas automaticamente</p>
          <div className="h-px flex-1 bg-slate-200 max-w-[80px]" />
        </div>

      </div>

      {/* ── Lightbox ── */}
      {lightbox && (() => {
        const current = lightbox.photos[lightbox.index]
        // Usa thumbnail com alta resolução — muito mais rápido que export=view
        const viewSrc = driveThumbnail(current.thumbnailUrl, 'w1600')
        const fallbackSrc = driveThumbnail(current.thumbnailUrl, 'w800')
        return (
          <div
            className="fixed inset-0 z-50 bg-black/95 flex flex-col"
            onClick={closeLightbox}
            onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX }}
            onTouchEnd={(e) => {
              if (touchStartX.current === null) return
              const diff = e.changedTouches[0].clientX - touchStartX.current
              if (diff > 50) lightboxPrev()
              else if (diff < -50) lightboxNext()
              touchStartX.current = null
            }}
          >
            {/* Topo */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-2">
                <Camera className="w-3.5 h-3.5 text-[#c62737]" />
                <span className="text-white/80 text-xs font-medium truncate max-w-[180px] sm:max-w-xs">{current.fileName}</span>
              </div>
              <div className="flex items-center gap-2">
                {lightbox.photos.length > 1 && (
                  <span className="text-white/40 text-xs tabular-nums">{lightbox.index + 1} / {lightbox.photos.length}</span>
                )}
                <button
                  onClick={closeLightbox}
                  className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Foto central */}
            <div className="flex-1 flex items-center justify-center relative min-h-0 px-14" onClick={e => e.stopPropagation()}>
              {lightbox.photos.length > 1 && (
                <button
                  className="absolute left-2 sm:left-4 z-10 w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors"
                  onClick={lightboxPrev}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}

              <LightboxImage
                src={viewSrc}
                fallbackSrc={fallbackSrc}
                alt={current.fileName}
              />

              {lightbox.photos.length > 1 && (
                <button
                  className="absolute right-2 sm:right-4 z-10 w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors"
                  onClick={lightboxNext}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Strip de miniaturas */}
            {lightbox.photos.length > 1 && (
              <div className="flex-shrink-0 px-4 py-3 border-t border-white/10" onClick={e => e.stopPropagation()}>
                <div
                  ref={thumbStripRef}
                  className="flex gap-1.5 overflow-x-auto pb-0.5"
                  style={{ scrollbarWidth: 'none' } as React.CSSProperties}
                >
                  {lightbox.photos.map((p, i) => (
                    <button
                      key={p.driveFileId}
                      onClick={() => { setLightbox({ ...lightbox, index: i }); scrollThumbIntoView(i) }}
                      className={`flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-white/10 transition-all ${
                        i === lightbox.index
                          ? 'ring-2 ring-[#c62737] opacity-100 scale-105'
                          : 'opacity-40 hover:opacity-70'
                      }`}
                    >
                      <img
                        src={driveThumbnail(p.thumbnailUrl, 'w200')}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Rodapé do lightbox */}
            <div className="flex-shrink-0 px-4 py-2.5 flex items-center justify-between border-t border-white/10" onClick={e => e.stopPropagation()}>
              <p className="text-white/25 text-xs hidden sm:flex items-center gap-1.5">
                <Keyboard className="w-3 h-3" />
                ← → para navegar · ESC para fechar
              </p>
              <button
                type="button"
                onClick={() => handleDownload(current)}
                disabled={downloading === current.driveFileId}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#c62737] hover:bg-[#a81f2d] text-white px-4 py-2 text-xs font-semibold transition-colors disabled:opacity-50 ml-auto"
              >
                {downloading === current.driveFileId
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Download className="w-3.5 h-3.5" />}
                Baixar foto
              </button>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
