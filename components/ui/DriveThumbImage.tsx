'use client'

/**
 * DriveThumbImage
 *
 * Carrega thumbnails via /api/drive-thumb (proxy autenticado com service account).
 * Usa IntersectionObserver + lazy loading nativo para evitar muitas requisições
 * simultâneas ao proxy.
 */

import { useEffect, useRef, useState } from 'react'

interface DriveThumbImageProps {
  src: string
  alt: string
  className?: string
  /** Classes extras aplicadas ao elemento <img> interno (ex.: animações hover via Tailwind group-hover) */
  imgClassName?: string
  /** Drive file ID — usado para montar src automaticamente se src não fornecido */
  driveFileId?: string
}

export function DriveThumbImage({
  src,
  alt,
  className,
  imgClassName,
  driveFileId,
}: DriveThumbImageProps) {
  const effectiveSrc = src || (driveFileId ? `/api/drive-thumb?id=${driveFileId}&sz=w480` : '')

  const [visible, setVisible] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect() } },
      { rootMargin: '300px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={containerRef} className={className} style={{ position: 'relative' }}>
      {visible && effectiveSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={effectiveSrc}
          alt={alt}
          loading="lazy"
          className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'} ${imgClassName ?? ''}`}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          draggable={false}
        />
      ) : null}

      {/* Skeleton enquanto não carregou */}
      {(!visible || (!loaded && !error)) && (
        <div className="absolute inset-0 bg-slate-200 animate-pulse" />
      )}

      {/* Ícone de erro */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 text-slate-300">
          <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75a4.5 4.5 0 01-4.884 4.484c-1.076-.091-2.264.071-2.95.904l-7.152 8.684a2.548 2.548 0 11-3.586-3.586l8.684-7.152c.833-.686.995-1.874.904-2.95a4.5 4.5 0 016.336-4.486" />
          </svg>
        </div>
      )}
    </div>
  )
}

