'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Album } from '@/lib/gallery-types'
import { Calendar, Image as ImageIcon, Share2, Check, FolderOpen, Trash2, Send, ExternalLink } from 'lucide-react'

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
  const [hovered, setHovered] = useState(false)
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

  const isCulto = album.type === 'culto'
  const typeLabel = isCulto ? 'Culto' : 'Evento'
  const adminAlbumPath = `/admin/galeria/${album.id}`

  return (
    <article
      ref={cardRef}
      className="group relative flex flex-col bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-xl hover:border-slate-300 transition-all duration-300 cursor-pointer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Cover */}
      <Link href={adminAlbumPath} className="block shrink-0">
        <div className="aspect-video relative overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200">
          {album.coverUrl ? (
            <img
              src={album.coverUrl}
              alt=""
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2">
              <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="text-xs text-slate-400 font-medium">Sem capa</span>
            </div>
          )}

          {/* Dark gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

          {/* Type badge — top left */}
          <div className="absolute top-2.5 left-2.5">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide ${
              isCulto
                ? 'bg-violet-600 text-white'
                : 'bg-amber-500 text-white'
            }`}>
              {typeLabel}
            </span>
          </div>

          {/* Photo count — bottom right, always visible */}
          {album.photosCount != null && (
            <div className="absolute bottom-2.5 right-2.5">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/50 text-white text-[11px] font-semibold backdrop-blur-sm">
                <ImageIcon className="w-3 h-3" />
                {album.photosCount} foto{album.photosCount !== 1 ? 's' : ''}
              </span>
            </div>
          )}

          {/* Date — bottom left */}
          <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1">
            <span className="text-white/80 text-[11px] font-medium flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatDatePtBr(album.date)}
            </span>
          </div>
        </div>
      </Link>

      {/* Info + actions */}
      <div className="flex flex-col flex-1 p-3.5 gap-3">
        <Link href={adminAlbumPath} className="block">
          <h2 className="font-semibold text-slate-800 text-sm leading-snug line-clamp-2 group-hover:text-[#c62737] transition-colors duration-200">
            {album.title}
          </h2>
        </Link>

        {/* Action bar — slides up on hover */}
        <div className={`flex items-center gap-1.5 transition-all duration-200 ${
          hovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1 pointer-events-none'
        }`}>
          {/* Postar — primary CTA */}
          <Link
            href={`/admin/galeria/${album.id}/post/select`}
            className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#c62737] text-white text-xs font-semibold hover:bg-[#a81e2d] transition-colors"
            title="Fazer postagem"
            onClick={(e) => e.stopPropagation()}
          >
            <Send className="w-3.5 h-3.5" />
            Postar
          </Link>

          {/* Abrir álbum */}
          <Link
            href={adminAlbumPath}
            className="flex items-center justify-center w-7 h-7 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            title="Abrir álbum"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>

          {/* Copiar link */}
          <button
            type="button"
            onClick={handleCopyLink}
            className={`flex items-center justify-center w-7 h-7 rounded-lg border transition-colors ${
              copied
                ? 'border-emerald-300 bg-emerald-50 text-emerald-600'
                : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700'
            }`}
            title={copied ? 'Copiado!' : 'Copiar link público'}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
          </button>

          {/* Drive */}
          {album.drive_folder_id && (
            <a
              href={`https://drive.google.com/drive/folders/${album.drive_folder_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-7 h-7 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              title="Abrir no Drive"
              onClick={(e) => e.stopPropagation()}
            >
              <FolderOpen className="w-3.5 h-3.5" />
            </a>
          )}

          {/* Excluir */}
          {canDeleteAlbum && onDeleteAlbum && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
                onDeleteAlbum(album)
              }}
              className="flex items-center justify-center w-7 h-7 rounded-lg border border-rose-200 bg-rose-50 text-rose-500 hover:bg-rose-100 hover:text-rose-700 transition-colors"
              title="Excluir álbum"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
