'use client'

import { useEffect, useMemo, useState } from 'react'
import type { CropMode, PostDraft } from '../_lib/usePostDraft'

type DraftMedia = PostDraft['media'][number]

type EditPhotoModalProps = {
  open: boolean
  media: DraftMedia | null
  onClose: () => void
  onApply: (next: DraftMedia) => void
}

const CROP_OPTIONS: Array<{ value: CropMode; title: string; subtitle: string }> = [
  { value: 'original', title: 'Original', subtitle: 'Original' },
  { value: '1:1', title: 'Quadrado', subtitle: '1:1 (recomendado)' },
  { value: '1.91:1', title: 'Horizontal', subtitle: '1,91:1' },
  { value: '4:5', title: 'Vertical', subtitle: '4:5' },
]

function aspectRatio(mode: CropMode | undefined): string {
  if (mode === '1:1') return '1 / 1'
  if (mode === '1.91:1') return '1.91 / 1'
  if (mode === '4:5') return '4 / 5'
  return '16 / 9'
}

export function EditPhotoModal({ open, media, onClose, onApply }: EditPhotoModalProps) {
  const [cropMode, setCropMode] = useState<CropMode>('original')
  const [altText, setAltText] = useState('')

  useEffect(() => {
    if (!media) return
    setCropMode(media.cropMode || 'original')
    setAltText(media.altText || '')
  }, [media])

  const ratio = useMemo(() => aspectRatio(cropMode), [cropMode])

  if (!open || !media) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-xl border border-slate-300 bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3">
          <h3 className="text-xl font-semibold text-slate-900">Editar foto</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-300 px-2 py-1 text-slate-700 hover:bg-slate-100"
          >
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="grid min-h-0 grid-cols-1 md:grid-cols-[280px_1fr]">
            {/* Coluna: Cortar + Texto alternativo */}
            <section className="border-b border-slate-200 p-4 md:border-b-0 md:border-r md:border-slate-200">
              <p className="text-sm font-semibold text-slate-800">Cortar</p>
              <div className="mt-3 space-y-2">
                {CROP_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setCropMode(option.value)}
                    className={`w-full rounded-lg border p-3 text-left ${
                      cropMode === option.value ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <p className="font-medium text-slate-900">{option.title}</p>
                    <p className="text-sm text-slate-600">{option.subtitle}</p>
                  </button>
                ))}
              </div>
              <div className="mt-4">
                <label className="mb-1 block text-xs font-medium text-slate-700">Texto alternativo</label>
                <textarea
                  value={altText}
                  onChange={(e) => setAltText(e.target.value)}
                  rows={3}
                  className="w-full resize-y rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                  placeholder="Descreva a imagem para acessibilidade"
                />
              </div>
            </section>

            {/* Coluna: Prévia */}
            <section className="flex flex-col bg-slate-100 p-4">
              <p className="text-sm font-semibold text-slate-800">Prévia</p>
              <div className="mt-3 min-h-[200px] flex-1 overflow-y-auto rounded-lg border border-slate-200 bg-white p-4">
                <div
                  className="mx-auto max-w-md overflow-hidden rounded-lg border border-slate-300 bg-slate-200"
                  style={{ aspectRatio: ratio }}
                >
                  <img
                    src={media.url}
                    alt={media.filename || 'Mídia'}
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
              <div className="mt-3 flex shrink-0 justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => onApply({ ...media, cropMode, altText })}
                  className="rounded-lg bg-[#c62737] px-4 py-2 text-sm text-white hover:bg-[#a01f2d]"
                >
                  Aplicar
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}

