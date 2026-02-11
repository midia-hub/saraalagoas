'use client'

import { useEffect, useRef, useState } from 'react'
import Cropper from 'cropperjs'
import 'cropperjs/dist/cropper.css'
import type { CropMode, PostDraft } from '../_lib/usePostDraft'

type DraftMedia = PostDraft['media'][number]

type EditPhotoModalProps = {
  open: boolean
  media: DraftMedia | null
  allMedia: DraftMedia[]
  onClose: () => void
  /** Ao passar switchToMediaId, salva a foto atual e troca para outra sem fechar o modal */
  onApply: (next: DraftMedia, options?: { switchToMediaId?: string }) => void
  onSwitchMedia: (mediaId: string) => void
}

const CROP_OPTIONS: Array<{ value: CropMode; title: string; subtitle: string; aspectRatio: number | undefined }> = [
  { value: 'original', title: 'Original', subtitle: 'Original', aspectRatio: undefined },
  { value: '1:1', title: 'Quadrado', subtitle: '1:1 (recomendado)', aspectRatio: 1 },
  { value: '1.91:1', title: 'Horizontal', subtitle: '1,91:1', aspectRatio: 1.91 },
  { value: '4:5', title: 'Vertical', subtitle: '4:5', aspectRatio: 4 / 5 },
]

export function EditPhotoModal({ open, media, allMedia, onClose, onApply, onSwitchMedia }: EditPhotoModalProps) {
  const cropperRef = useRef<HTMLImageElement>(null)
  const cropperInstanceRef = useRef<Cropper | null>(null)
  const galleryRef = useRef<HTMLDivElement>(null)
  
  const [cropMode, setCropMode] = useState<CropMode>('original')
  const [altText, setAltText] = useState('')
  const [croppedDataUrl, setCroppedDataUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!media) return
    setCropMode(media.cropMode || 'original')
    setAltText(media.altText || '')
    setCroppedDataUrl(null)

    // Scroll automático para o thumbnail ativo na galeria
    if (galleryRef.current && allMedia.length > 1) {
      const currentIndex = allMedia.findIndex((m) => m.id === media.id)
      if (currentIndex >= 0) {
        const thumbnailWidth = 80 + 8 // width + gap
        const scrollPosition = currentIndex * thumbnailWidth - (galleryRef.current.offsetWidth / 2) + (thumbnailWidth / 2)
        galleryRef.current.scrollTo({
          left: Math.max(0, scrollPosition),
          behavior: 'smooth'
        })
      }
    }
  }, [media, allMedia])

  // Navegação por teclado (setas esquerda/direita)
  useEffect(() => {
    if (!open || !media || allMedia.length <= 1) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const currentIndex = allMedia.findIndex((m) => m.id === media.id)
        if (currentIndex === -1) return

        let nextIndex: number
        if (e.key === 'ArrowLeft') {
          nextIndex = currentIndex > 0 ? currentIndex - 1 : allMedia.length - 1
        } else {
          nextIndex = currentIndex < allMedia.length - 1 ? currentIndex + 1 : 0
        }

        const nextMedia = allMedia[nextIndex]
        if (nextMedia) {
          const finalUrl = croppedDataUrl || media.url
          onApply(
            {
              ...media,
              cropMode,
              altText,
              url: finalUrl,
              croppedUrl: croppedDataUrl || undefined
            },
            { switchToMediaId: nextMedia.id }
          )
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, media, allMedia, cropMode, altText, croppedDataUrl, onApply])

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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-3">
      <div
        className="flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden rounded-none border-0 bg-white shadow-2xl sm:h-auto sm:max-h-[90vh] sm:rounded-xl sm:border sm:border-slate-300"
        style={{
          maxWidth: 'min(72rem, 100vw)',
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          paddingLeft: 'env(safe-area-inset-left)',
          paddingRight: 'env(safe-area-inset-right)'
        }}
      >
        {/* Header compacto no mobile */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-3 py-2 sm:px-4 sm:py-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-slate-900 sm:text-xl">Editar foto</h3>
            {allMedia.length > 1 && media && (
              <p className="mt-0.5 truncate text-xs text-slate-600 sm:mt-1">
                Foto {allMedia.findIndex((m) => m.id === media.id) + 1} de {allMedia.length}
                <span className="hidden sm:inline"> • Use ← → para navegar</span>
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-2 flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full border border-slate-300 text-slate-700 hover:bg-slate-100 active:bg-slate-200 sm:rounded sm:px-2 sm:py-1"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
          <div className="grid min-h-0 min-w-0 grid-cols-1 lg:grid-cols-[260px_1fr]">
            {/* Coluna: Controles — no mobile em bloco compacto */}
            <section className="shrink-0 border-b border-slate-200 p-3 lg:border-b-0 lg:border-r lg:border-slate-200 lg:p-4">
              <p className="text-xs font-semibold text-slate-800 sm:text-sm">Proporção do corte</p>
              {/* Mobile: linha horizontal de pills; Desktop: lista vertical */}
              <div className="mt-2 flex gap-2 overflow-x-auto pb-2 scrollbar-thin lg:mt-3 lg:flex-col lg:space-y-2 lg:overflow-visible lg:pb-0">
                {CROP_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleCropModeChange(option.value)}
                    className={`shrink-0 rounded-lg border p-2.5 text-left transition-colors lg:w-full lg:p-3 ${
                      cropMode === option.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 hover:bg-slate-50 active:bg-slate-100'
                    }`}
                  >
                    <p className="text-sm font-medium text-slate-900 lg:text-base">{option.title}</p>
                    <p className="hidden text-slate-600 sm:block lg:block lg:text-sm">{option.subtitle}</p>
                  </button>
                ))}
              </div>

              <div className="mt-4 lg:mt-6">
                <p className="text-xs font-semibold text-slate-800 sm:text-sm">Ferramentas</p>
                <div className="mt-2 grid grid-cols-4 gap-2 lg:mt-3 lg:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => handleRotate(-90)}
                    className="flex min-h-[44px] items-center justify-center rounded-lg border border-slate-300 text-xs font-medium hover:bg-slate-50 active:bg-slate-100 sm:py-2 lg:justify-start lg:px-3"
                  >
                    ↺
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRotate(90)}
                    className="flex min-h-[44px] items-center justify-center rounded-lg border border-slate-300 text-xs font-medium hover:bg-slate-50 active:bg-slate-100 sm:py-2 lg:justify-start lg:px-3"
                  >
                    ↻
                  </button>
                  <button
                    type="button"
                    onClick={() => handleZoom(0.1)}
                    className="flex min-h-[44px] items-center justify-center rounded-lg border border-slate-300 text-xs font-medium hover:bg-slate-50 active:bg-slate-100 sm:py-2 lg:justify-start lg:px-3"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => handleZoom(-0.1)}
                    className="flex min-h-[44px] items-center justify-center rounded-lg border border-slate-300 text-xs font-medium hover:bg-slate-50 active:bg-slate-100 sm:py-2 lg:justify-start lg:px-3"
                  >
                    −
                  </button>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="col-span-4 flex min-h-[44px] items-center justify-center rounded-lg border border-slate-300 text-xs font-medium hover:bg-slate-50 active:bg-slate-100 lg:col-span-2"
                  >
                    🔄 Resetar
                  </button>
                </div>
              </div>

              <div className="mt-4 lg:mt-6">
                <label className="mb-1 block text-xs font-medium text-slate-700">Texto alternativo</label>
                <textarea
                  value={altText}
                  onChange={(e) => setAltText(e.target.value)}
                  rows={2}
                  className="min-h-[80px] w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm lg:min-h-0 lg:rows-3 lg:px-2 lg:py-1.5 lg:text-xs"
                  placeholder="Descreva a imagem para acessibilidade"
                />
              </div>
            </section>

            {/* Coluna: Editor de imagem */}
            <section className="flex min-w-0 flex-col bg-slate-100 p-3 sm:p-4">
              <p className="text-xs font-semibold text-slate-800 sm:text-sm">Editor de imagem</p>
              <p className="mt-0.5 hidden text-slate-600 sm:block sm:text-xs">
                Arraste para posicionar • Role para zoom • Clique nos botões para ajustes
              </p>
              <div
                className="mt-2 flex-1 overflow-hidden rounded-lg border border-slate-200 bg-white sm:mt-3"
                style={{ minHeight: 'min(40vh, 280px)', maxHeight: 'min(65vh, 520px)' }}
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
              {/* Galeria de todas as fotos */}
              {allMedia.length > 1 && (
                <div className="mt-3 shrink-0 sm:mt-4">
                  <div className="mb-1.5 flex items-center justify-between sm:mb-2">
                    <p className="text-xs font-medium text-slate-700">
                      Fotos ({allMedia.length})
                    </p>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          if (!media) return
                          const currentIndex = allMedia.findIndex((m) => m.id === media.id)
                          const prevIndex = currentIndex > 0 ? currentIndex - 1 : allMedia.length - 1
                          const prevMedia = allMedia[prevIndex]
                          if (prevMedia) {
                            const finalUrl = croppedDataUrl || media.url
                            onApply(
                              {
                                ...media,
                                cropMode,
                                altText,
                                url: finalUrl,
                                croppedUrl: croppedDataUrl || undefined
                              },
                              { switchToMediaId: prevMedia.id }
                            )
                          }
                        }}
                        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-slate-300 text-lg hover:bg-slate-50 active:bg-slate-100 sm:rounded-md sm:px-2 sm:py-1 sm:text-base"
                        title="Foto anterior (←)"
                        aria-label="Foto anterior"
                      >
                        ←
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!media) return
                          const currentIndex = allMedia.findIndex((m) => m.id === media.id)
                          const nextIndex = currentIndex < allMedia.length - 1 ? currentIndex + 1 : 0
                          const nextMedia = allMedia[nextIndex]
                          if (nextMedia) {
                            const finalUrl = croppedDataUrl || media.url
                            onApply(
                              {
                                ...media,
                                cropMode,
                                altText,
                                url: finalUrl,
                                croppedUrl: croppedDataUrl || undefined
                              },
                              { switchToMediaId: nextMedia.id }
                            )
                          }
                        }}
                        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-slate-300 text-lg hover:bg-slate-50 active:bg-slate-100 sm:rounded-md sm:px-2 sm:py-1 sm:text-base"
                        title="Próxima foto (→)"
                        aria-label="Próxima foto"
                      >
                        →
                      </button>
                    </div>
                  </div>
                  <div
                    ref={galleryRef}
                    className="flex gap-2 overflow-x-auto pb-2 -webkit-overflow-scrolling-touch"
                    style={{
                      scrollbarWidth: 'thin',
                      scrollbarColor: '#cbd5e1 #f1f5f9'
                    }}
                  >
                    {allMedia.map((item) => {
                      const isActive = media?.id === item.id
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            if (!isActive && media) {
                              const finalUrl = croppedDataUrl || media.url
                              onApply(
                                {
                                  ...media,
                                  cropMode,
                                  altText,
                                  url: finalUrl,
                                  croppedUrl: croppedDataUrl || undefined
                                },
                                { switchToMediaId: item.id }
                              )
                            }
                          }}
                          className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-all touch-manipulation sm:h-20 sm:w-20 ${
                            isActive
                              ? 'border-blue-500 ring-2 ring-blue-300 shadow-lg'
                              : 'border-slate-300 hover:border-blue-400 hover:shadow-md active:border-blue-400'
                          }`}
                          title={`${item.filename || 'Foto'} - Clique para editar`}
                        >
                          <img
                            src={item.croppedUrl || item.url}
                            alt={item.filename || 'Foto'}
                            className="h-full w-full object-cover"
                          />
                          {isActive && (
                            <div className="absolute inset-0 flex items-center justify-center bg-blue-500/20">
                              <div className="rounded-full bg-blue-500 p-1">
                                <svg
                                  className="h-4 w-4 text-white"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              </div>
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="mt-3 flex shrink-0 flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-[48px] w-full rounded-xl border border-slate-300 px-4 py-3 text-base font-medium hover:bg-slate-50 active:bg-slate-100 sm:min-h-0 sm:w-auto sm:rounded-lg sm:py-2 sm:text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleApply}
                  className="min-h-[48px] w-full rounded-xl bg-[#c62737] px-4 py-3 text-base font-medium text-white hover:bg-[#a01f2d] active:bg-[#8a1a26] sm:min-h-0 sm:w-auto sm:rounded-lg sm:py-2 sm:text-sm"
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

