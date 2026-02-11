'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Album } from '@/lib/gallery-types'

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

export interface AlbumCardProps {
  album: Album
  onCopyLink?: (album: Album) => void
  /** Chamado quando o card entra na viewport (para lazy enrichment de capa/contagem) */
  onVisible?: (albumId: string) => void
  /** Se true, mostra botão para excluir álbum */
  canDeleteAlbum?: boolean
  /** Chamado ao clicar em excluir álbum (abre confirmação no pai) */
  onDeleteAlbum?: (album: Album) => void
}

export function AlbumCard({ album, onCopyLink, onVisible, canDeleteAlbum, onDeleteAlbum }: AlbumCardProps) {
  const [showActions, setShowActions] = useState(false)
  const [copied, setCopied] = useState(false)
  const cardRef = useRef<HTMLElement>(null)
  const sentRef = useRef(false)

  useEffect(() => {
    if (!onVisible || sentRef.current) return
    const el = cardRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return
        if (sentRef.current) return
        sentRef.current = true
        onVisible(album.id)
      },
      { rootMargin: '80px', threshold: 0.1 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [album.id, onVisible])

  const publicUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${album.publicPath}`
      : album.publicPath

  const handleCopyLink = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (typeof navigator?.clipboard?.writeText === 'function') {
        navigator.clipboard.writeText(publicUrl).then(() => {
          setCopied(true)
          onCopyLink?.(album)
          setTimeout(() => setCopied(false), 2000)
        })
      }
    },
    [publicUrl, album, onCopyLink]
  )

  const typeLabel = album.type === 'culto' ? 'Culto' : 'Evento'

  const adminAlbumPath = `/admin/galeria/${album.id}`

  return (
    <article
      ref={cardRef}
      className="group relative bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-[#c62737]/40 hover:shadow-md transition-all"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <Link href={adminAlbumPath} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c62737] focus-visible:ring-offset-2 rounded-xl">
        {/* Capa: usa proxy quando disponível para carregar no site */}
        <div className="aspect-[4/3] bg-slate-100 relative overflow-hidden">
          {album.coverUrl ? (
            <img
              src={album.coverUrl}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400">
              <svg
                className="w-12 h-12"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14"
                />
              </svg>
            </div>
          )}
        </div>

        <div className="p-3">
          <span className="inline-block px-2 py-0.5 text-xs font-medium rounded bg-slate-100 text-slate-600">
            {typeLabel}
          </span>
          <h2 className="mt-1.5 font-semibold text-slate-900 line-clamp-2">
            {album.title}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {formatDatePtBr(album.date)}
            {album.photosCount != null && (
              <span className="ml-1.5">• {album.photosCount} fotos</span>
            )}
          </p>
        </div>
      </Link>

      {/* Ações rápidas */}
      <div
        className={`absolute top-2 right-2 flex flex-col gap-1 transition-opacity ${
          showActions ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <Link
          href={`/admin/galeria/${album.id}/post/select`}
          className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/90 shadow border border-slate-200 hover:bg-white text-slate-700"
          title="Fazer postagem"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="sr-only">Fazer postagem</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h8M8 14h5M6 18h12a2 2 0 002-2V8a2 2 0 00-2-2h-4l-2-2H6a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </Link>
        <Link
          href={adminAlbumPath}
          className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/90 shadow border border-slate-200 hover:bg-white text-slate-700"
          title="Abrir álbum no admin"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="sr-only">Abrir</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </Link>
        <button
          type="button"
          onClick={handleCopyLink}
          className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/90 shadow border border-slate-200 hover:bg-white text-slate-700"
          title={copied ? 'Copiado!' : 'Copiar link'}
        >
          <span className="sr-only">{copied ? 'Copiado' : 'Copiar link'}</span>
          {copied ? (
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
          )}
        </button>
        {album.drive_folder_id && (
          <a
            href={`https://drive.google.com/drive/folders/${album.drive_folder_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/90 shadow border border-slate-200 hover:bg-white text-slate-700"
            title="Abrir no Drive"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="sr-only">Drive</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </a>
        )}
        <Link
          href="/admin/upload"
          className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/90 shadow border border-slate-200 hover:bg-white text-slate-700"
          title="Upload (novo álbum)"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="sr-only">Upload</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
        </Link>
        {canDeleteAlbum && onDeleteAlbum && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              onDeleteAlbum(album)
            }}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/90 shadow border border-red-200 hover:bg-red-50 text-red-600"
            title="Excluir álbum"
          >
            <span className="sr-only">Excluir álbum</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>
    </article>
  )
}
