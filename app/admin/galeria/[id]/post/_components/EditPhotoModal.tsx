'use client'

import { useEffect, useRef, useState } from 'react'
import Cropper from 'cropperjs'
import 'cropperjs/dist/cropper.css'
import type { CropMode, PostDraft } from '../_lib/usePostDraft'

type DraftMedia = PostDraft['media'][number]

type EditPhotoModalProps = {
  open: boolean
  media: DraftMedia | null
  onClose: () => void
  onApply: (next: DraftMedia) => void
}

const CROP_OPTIONS: Array<{ value: CropMode; title: string; subtitle: string; aspectRatio: number | undefined }> = [
  { value: 'original', title: 'Original', subtitle: 'Original', aspectRatio: undefined },
  { value: '1:1', title: 'Quadrado', subtitle: '1:1 (recomendado)', aspectRatio: 1 },
  { value: '1.91:1', title: 'Horizontal', subtitle: '1,91:1', aspectRatio: 1.91 },
  { value: '4:5', title: 'Vertical', subtitle: '4:5', aspectRatio: 4 / 5 },
]

export function EditPhotoModal({ open, media, onClose, onApply }: EditPhotoModalProps) {
  const cropperRef = useRef<HTMLImageElement>(null)
  const cropperInstanceRef = useRef<Cropper | null>(null)
  
  const [cropMode, setCropMode] = useState<CropMode>('original')
  const [altText, setAltText] = useState('')
  const [croppedDataUrl, setCroppedDataUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!media) return
    setCropMode(media.cropMode || 'original')
    setAltText(media.altText || '')
  }, [media])

  useEffect(() => {
    if (!open || !media || !cropperRef.current) return

    // Destrói instância anterior se existir
    if (cropperInstanceRef.current) {
      cropperInstanceRef.current.destroy()
      cropperInstanceRef.current = null
    }

    const cropOption = CROP_OPTIONS.find((opt) => opt.value === cropMode)
    
    // Cria nova instância do Cropper
    const cropper = new Cropper(cropperRef.current, {
      aspectRatio: cropOption?.aspectRatio,
      viewMode: 1,
      autoCropArea: 1,
      movable: true,
      zoomable: true,
      rotatable: true,
      scalable: true,
      responsive: true,
      crop() {
        // Atualiza a prévia quando o crop muda
        const canvas = cropper.getCroppedCanvas()
        if (canvas) {
          setCroppedDataUrl(canvas.toDataURL('image/jpeg', 0.9))
        }
      },
    })

    cropperInstanceRef.current = cropper

    return () => {
      if (cropperInstanceRef.current) {
        cropperInstanceRef.current.destroy()
        cropperInstanceRef.current = null
      }
    }
  }, [open, media, cropMode])

  const handleCropModeChange = (mode: CropMode) => {
    setCropMode(mode)
    const cropOption = CROP_OPTIONS.find((opt) => opt.value === mode)
    
    if (cropperInstanceRef.current) {
      cropperInstanceRef.current.setAspectRatio(cropOption?.aspectRatio || NaN)
    }
  }

  const handleRotate = (degrees: number) => {
    if (cropperInstanceRef.current) {
      cropperInstanceRef.current.rotate(degrees)
    }
  }

  const handleZoom = (ratio: number) => {
    if (cropperInstanceRef.current) {
      cropperInstanceRef.current.zoom(ratio)
    }
  }

  const handleReset = () => {
    if (cropperInstanceRef.current) {
      cropperInstanceRef.current.reset()
    }
  }

  const handleApply = () => {
    if (!media) return
    
    // Se o usuário fez crop, usa a imagem cortada
    const finalUrl = croppedDataUrl || media.url
    
    onApply({ 
      ...media, 
      cropMode, 
      altText,
      url: finalUrl,
      croppedUrl: croppedDataUrl || undefined
    })
  }

  if (!open || !media) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3">
      <div
        className="flex max-h-[90vh] w-full max-w-[min(72rem,90vw)] flex-col overflow-hidden rounded-xl border border-slate-300 bg-white shadow-2xl"
        style={{ maxHeight: '90vh' }}
      >
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

        <div className="min-h-0 flex-1 overflow-auto">
          <div className="grid min-h-0 min-w-0 grid-cols-1 lg:grid-cols-[260px_1fr]">
            {/* Coluna: Controles */}
            <section className="shrink-0 border-b border-slate-200 p-4 lg:border-b-0 lg:border-r lg:border-slate-200">
              <p className="text-sm font-semibold text-slate-800">Proporção do corte</p>
              <div className="mt-3 space-y-2">
                {CROP_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleCropModeChange(option.value)}
                    className={`w-full rounded-lg border p-3 text-left transition-colors ${
                      cropMode === option.value 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <p className="font-medium text-slate-900">{option.title}</p>
                    <p className="text-sm text-slate-600">{option.subtitle}</p>
                  </button>
                ))}
              </div>

              <div className="mt-6">
                <p className="text-sm font-semibold text-slate-800">Ferramentas</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleRotate(-90)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium hover:bg-slate-50"
                  >
                    ↺ Girar ←
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRotate(90)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium hover:bg-slate-50"
                  >
                    ↻ Girar →
                  </button>
                  <button
                    type="button"
                    onClick={() => handleZoom(0.1)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium hover:bg-slate-50"
                  >
                    🔍 Zoom +
                  </button>
                  <button
                    type="button"
                    onClick={() => handleZoom(-0.1)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium hover:bg-slate-50"
                  >
                    🔍 Zoom -
                  </button>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="col-span-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium hover:bg-slate-50"
                  >
                    🔄 Resetar
                  </button>
                </div>
              </div>

              <div className="mt-6">
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

            {/* Coluna: Editor de imagem — limitada ao espaço disponível */}
            <section className="flex min-w-0 flex-col bg-slate-100 p-4">
              <p className="text-sm font-semibold text-slate-800">Editor de imagem</p>
              <p className="mt-1 text-xs text-slate-600">
                Arraste para posicionar • Role para zoom • Clique nos botões para ajustes
              </p>
              <div
                className="mt-3 flex-1 overflow-hidden rounded-lg border border-slate-200 bg-white"
                style={{ minHeight: 280, maxHeight: 'min(65vh, 520px)' }}
              >
                <div className="h-full w-full max-w-full overflow-hidden">
                  <img
                    ref={cropperRef}
                    src={media.url}
                    alt={media.filename || 'Mídia'}
                    className="block max-h-full max-w-full object-contain"
                    style={{ maxHeight: 'min(65vh, 500px)' }}
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
                  onClick={handleApply}
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

