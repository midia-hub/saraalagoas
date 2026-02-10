'use client'

import { useState } from 'react'
import type { CropMode, PostDraft } from '../_lib/usePostDraft'

type DraftMedia = PostDraft['media'][number]

export type SocialInstance = {
  id: string
  name: string
  provider: string
  status: string
}

type PostPreviewProps = {
  /** Instâncias selecionadas pelo usuário (define qual prévia mostrar) */
  selectedInstances: SocialInstance[]
  /** Nome da página/conta para exibir no card */
  pageName: string
  text: string
  media: DraftMedia[]
}

function getAspectRatio(mode: CropMode | undefined): string {
  if (mode === '1:1') return '1 / 1'
  if (mode === '1.91:1') return '1.91 / 1'
  if (mode === '4:5') return '4 / 5'
  return '16 / 9'
}

/** Prévia no estilo feed do Instagram: uma imagem por vez (carrossel). */
function InstagramFeedPreview({
  pageName,
  text,
  media,
}: {
  pageName: string
  text: string
  media: DraftMedia[]
}) {
  const [index, setIndex] = useState(0)
  const current = media[index]
  const hasMultiple = media.length > 1

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-full bg-slate-300" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-900">{pageName}</p>
          <p className="text-xs text-slate-500">Instagram</p>
        </div>
      </div>
      {/* Área da imagem: uma por vez, como no app */}
      {current ? (
        <div
          className="mx-auto mt-3 overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
          style={{ aspectRatio: getAspectRatio(current.cropMode), maxWidth: '100%' }}
        >
          <img
            src={current.thumbnailUrl || current.url}
            alt={current.altText || current.filename || 'Mídia'}
            className="h-full w-full object-cover"
          />
        </div>
      ) : (
        <div className="mt-3 flex aspect-square items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-slate-400">
          Sem mídia
        </div>
      )}
      {/* Indicadores de carrossel (bolinhas) */}
      {hasMultiple && (
        <div className="mt-2 flex justify-center gap-1">
          {media.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              className={`h-1.5 w-1.5 rounded-full transition ${
                i === index ? 'bg-slate-700' : 'bg-slate-300 hover:bg-slate-400'
              }`}
              aria-label={`Ver imagem ${i + 1}`}
            />
          ))}
        </div>
      )}
      <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm text-slate-700">
        {text || 'Sua legenda aparecerá aqui.'}
      </p>
      {hasMultiple && (
        <p className="mt-1 text-xs text-slate-500">
          {index + 1} de {media.length} fotos
        </p>
      )}
    </div>
  )
}

/** Prévia genérica em grid (ex.: Facebook). */
function GridFeedPreview({
  pageName,
  text,
  media,
}: {
  pageName: string
  text: string
  media: DraftMedia[]
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-full bg-slate-300" />
        <div>
          <p className="text-sm font-medium text-slate-900">{pageName}</p>
          <p className="text-xs text-slate-500">Agora mesmo</p>
        </div>
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">
        {text || 'Seu texto aparecerá aqui na prévia.'}
      </p>
      {media.length > 0 && (
        <div className={`mt-3 grid gap-2 ${media.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {media.slice(0, 4).map((item) => (
            <div
              key={item.id}
              className="overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
              style={{ aspectRatio: getAspectRatio(item.cropMode) }}
            >
              <img
                src={item.thumbnailUrl || item.url}
                alt={item.altText || item.filename || 'Mídia'}
                className="h-full w-full object-cover"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function PostPreview({
  selectedInstances,
  pageName,
  text,
  media,
}: PostPreviewProps) {
  const hasInstagram = selectedInstances.some((i) => i.provider === 'instagram')
  const hasFacebook = selectedInstances.some((i) => i.provider === 'facebook')
  const onlyInstagram = hasInstagram && !hasFacebook
  const onlyFacebook = hasFacebook && !hasInstagram

  if (selectedInstances.length === 0) {
    return (
      <aside className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-800">Prévia</p>
        <p className="mt-3 text-sm text-slate-500">Selecione ao menos uma conta em &quot;Postar em&quot; para ver a prévia.</p>
      </aside>
    )
  }

  return (
    <aside className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-semibold text-slate-800">Prévia</p>
      <p className="mt-1 text-xs text-slate-600">
        {onlyInstagram && 'Feed do Instagram (uma foto por vez)'}
        {onlyFacebook && 'Feed'}
        {hasInstagram && hasFacebook && 'Instagram + Facebook'}
      </p>

      <div className="mt-3 space-y-3">
        {onlyInstagram && (
          <InstagramFeedPreview pageName={pageName} text={text} media={media} />
        )}
        {onlyFacebook && (
          <GridFeedPreview pageName={pageName} text={text} media={media} />
        )}
        {hasInstagram && hasFacebook && (
          <>
            <div>
              <p className="mb-1 text-xs font-medium text-slate-500">Instagram</p>
              <InstagramFeedPreview pageName={pageName} text={text} media={media} />
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-slate-500">Facebook</p>
              <GridFeedPreview pageName={pageName} text={text} media={media} />
            </div>
          </>
        )}
      </div>
    </aside>
  )
}
