'use client'

/**
 * components/ui/ImageCropModal.tsx
 *
 * Modal genérico de recorte + zoom de imagem.
 * Recebe um `fileSrc` (data URL ou URL de imagem) e devolve um `Blob` JPEG recortado.
 *
 * Presets disponíveis:
 *   • 1:1   (512×512)  — quadrado, ideal para fotos de rosto
 *   • 3:4   (768×1024) — retrato
 *   • 4:3   (1024×768) — paisagem
 *   • Livre (original) — sem recorte, apenas redimensiona para ≤ 1024px
 *
 * Uso:
 *   <ImageCropModal
 *     open={cropOpen}
 *     fileSrc={cropSrc}
 *     onClose={() => setCropOpen(false)}
 *     onApply={async (blob) => {
 *       const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' })
 *       await upload(file)
 *     }}
 *   />
 */

import { useEffect, useRef, useState } from 'react'
import { Crop, Loader2, X, ZoomIn, ZoomOut } from 'lucide-react'

// ─── Tipos ───────────────────────────────────────────────────────────────────

type AspectPreset = {
  label: string
  /** null = livre (sem crop, apenas redimensiona) */
  ratio: number | null
  outW: number
  outH: number
  desc: string
}

// ─── Constantes ──────────────────────────────────────────────────────────────

const ASPECT_PRESETS: AspectPreset[] = [
  { label: '1:1',   ratio: 1,       outW: 512,  outH: 512,  desc: 'Quadrado · rosto'  },
  { label: '3:4',   ratio: 3 / 4,   outW: 768,  outH: 1024, desc: 'Retrato'           },
  { label: '4:3',   ratio: 4 / 3,   outW: 1024, outH: 768,  desc: 'Paisagem'          },
  { label: 'Livre', ratio: null,     outW: 1024, outH: 1024, desc: 'Sem recorte'       },
]

const CROP_CONTAINER = 320
const CROP_BOX_MAX   = 280

// ─── Componente ──────────────────────────────────────────────────────────────

export interface ImageCropModalProps {
  open: boolean
  /** data URL ou URL pública da imagem a recortar */
  fileSrc: string | null
  onClose: () => void
  /** Chamado com o Blob JPEG do recorte final */
  onApply: (blob: Blob) => void | Promise<void>
  /** Título opcional exibido no header do modal */
  title?: string
}

export function ImageCropModal({
  open,
  fileSrc,
  onClose,
  onApply,
  title = 'Recortar imagem',
}: ImageCropModalProps) {
  const [preset, setPreset] = useState<AspectPreset>(ASPECT_PRESETS[0])
  const [zoom, setZoom]     = useState(1)
  const [pan, setPan]       = useState({ x: 0, y: 0 })
  const [imgNatural, setImgNatural] = useState<{ w: number; h: number } | null>(null)
  const [applying, setApplying]     = useState(false)

  const imgRef         = useRef<HTMLImageElement>(null)
  const isDragging     = useRef(false)
  const dragStartRef   = useRef({ x: 0, y: 0, px: 0, py: 0 })
  const touchStartRef  = useRef({ x: 0, y: 0, px: 0, py: 0 })
  const cropBoxRef     = useRef({ left: 0, top: 0, w: 0, h: 0 })
  const imgDimsRef     = useRef({ w: 0, h: 0 })

  // ── Derived layout ──────────────────────────────────────────────────────

  const effectiveRatio = preset.ratio ?? (imgNatural ? imgNatural.w / imgNatural.h : 1)

  const cropW    = effectiveRatio >= 1 ? CROP_BOX_MAX : CROP_BOX_MAX * effectiveRatio
  const cropH    = effectiveRatio >= 1 ? CROP_BOX_MAX / effectiveRatio : CROP_BOX_MAX
  const cropLeft = (CROP_CONTAINER - cropW) / 2
  const cropTop  = (CROP_CONTAINER - cropH) / 2

  const baseScale   = imgNatural ? Math.max(cropW / imgNatural.w, cropH / imgNatural.h) : 1
  const imgDisplayW = imgNatural ? imgNatural.w * baseScale * zoom : 0
  const imgDisplayH = imgNatural ? imgNatural.h * baseScale * zoom : 0

  // Mantém refs sempre atualizadas (usadas nos handlers de window)
  cropBoxRef.current = { left: cropLeft, top: cropTop, w: cropW, h: cropH }
  imgDimsRef.current = { w: imgDisplayW, h: imgDisplayH }

  // ── Reset ao abrir ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!open) return
    setZoom(1)
    setImgNatural(null)
    setApplying(false)
    setPreset(ASPECT_PRESETS[0])
    // Limpa o atributo de marcação para permitir disparo do fallback na próxima abertura
    if (imgRef.current) imgRef.current.removeAttribute('data-loaded')
  }, [open, fileSrc])

  // ── Fallback: imagem já estava em cache quando o handler foi registrado ──
  // Isso evita o spinner eterno quando o onLoad não dispara por race condition.
  useEffect(() => {
    if (!open || !fileSrc) return
    // Aguarda um frame para garantir que o <img> já foi montado no DOM
    const raf = requestAnimationFrame(() => {
      const img = imgRef.current
      if (img && img.complete && img.naturalWidth > 0 && !img.getAttribute('data-loaded')) {
        img.setAttribute('data-loaded', '1')
        const nat = { w: img.naturalWidth, h: img.naturalHeight }
        setImgNatural(nat)
        const currentPreset = ASPECT_PRESETS[0]
        const ratio = currentPreset.ratio ?? (nat.w / nat.h)
        const cW = ratio >= 1 ? CROP_BOX_MAX : CROP_BOX_MAX * ratio
        const cH = ratio >= 1 ? CROP_BOX_MAX / ratio : CROP_BOX_MAX
        const cL = (CROP_CONTAINER - cW) / 2
        const cT = (CROP_CONTAINER - cH) / 2
        const bs = Math.max(cW / nat.w, cH / nat.h)
        setZoom(1)
        setPan({
          x: cL + cW / 2 - nat.w * bs / 2,
          y: cT + cH / 2 - nat.h * bs / 2,
        })
      }
    })
    return () => cancelAnimationFrame(raf)
  }, [open, fileSrc])

  // ── Re-centralizar ao trocar preset ─────────────────────────────────────

  useEffect(() => {
    if (!imgNatural) return
    const ratio = preset.ratio ?? (imgNatural.w / imgNatural.h)
    const cW    = ratio >= 1 ? CROP_BOX_MAX : CROP_BOX_MAX * ratio
    const cH    = ratio >= 1 ? CROP_BOX_MAX / ratio : CROP_BOX_MAX
    const cL    = (CROP_CONTAINER - cW) / 2
    const cT    = (CROP_CONTAINER - cH) / 2
    const bs    = Math.max(cW / imgNatural.w, cH / imgNatural.h)
    setPan({
      x: cL + cW / 2 - imgNatural.w * bs * zoom / 2,
      y: cT + cH / 2 - imgNatural.h * bs * zoom / 2,
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset])

  // ── Handlers de arrastar no window ──────────────────────────────────────

  useEffect(() => {
    if (!open) return
    function onMove(e: MouseEvent) {
      if (!isDragging.current) return
      const { left: cl, top: ct, w: cw, h: ch } = cropBoxRef.current
      const { w: imgW, h: imgH }                = imgDimsRef.current
      let nx = dragStartRef.current.px + (e.clientX - dragStartRef.current.x)
      let ny = dragStartRef.current.py + (e.clientY - dragStartRef.current.y)
      nx = Math.min(nx, cl);  nx = Math.max(nx, cl + cw - imgW)
      ny = Math.min(ny, ct);  ny = Math.max(ny, ct + ch - imgH)
      setPan({ x: nx, y: ny })
    }
    function onUp() { isDragging.current = false }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [open])

  // ── onImgLoad ────────────────────────────────────────────────────────────

  function onImgLoad() {
    const img = imgRef.current
    if (!img) return
    img.setAttribute('data-loaded', '1')
    const nat = { w: img.naturalWidth, h: img.naturalHeight }
    setImgNatural(nat)
    const ratio = preset.ratio ?? (nat.w / nat.h)
    const cW    = ratio >= 1 ? CROP_BOX_MAX : CROP_BOX_MAX * ratio
    const cH    = ratio >= 1 ? CROP_BOX_MAX / ratio : CROP_BOX_MAX
    const cL    = (CROP_CONTAINER - cW) / 2
    const cT    = (CROP_CONTAINER - cH) / 2
    const bs    = Math.max(cW / nat.w, cH / nat.h)
    setZoom(1)
    setPan({
      x: cL + cW / 2 - nat.w * bs / 2,
      y: cT + cH / 2 - nat.h * bs / 2,
    })
  }

  // ── Arrastar ─────────────────────────────────────────────────────────────

  function onMouseDown(e: React.MouseEvent) {
    e.preventDefault()
    isDragging.current = true
    dragStartRef.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y }
  }

  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0]
    touchStartRef.current = { x: t.clientX, y: t.clientY, px: pan.x, py: pan.y }
  }

  function onTouchMove(e: React.TouchEvent) {
    e.preventDefault()
    const t = e.touches[0]
    const { left: cl, top: ct, w: cw, h: ch } = cropBoxRef.current
    const { w: imgW, h: imgH }                = imgDimsRef.current
    let nx = touchStartRef.current.px + (t.clientX - touchStartRef.current.x)
    let ny = touchStartRef.current.py + (t.clientY - touchStartRef.current.y)
    nx = Math.min(nx, cl);  nx = Math.max(nx, cl + cw - imgW)
    ny = Math.min(ny, ct);  ny = Math.max(ny, ct + ch - imgH)
    setPan({ x: nx, y: ny })
  }

  // ── Zoom ─────────────────────────────────────────────────────────────────

  function handleZoomChange(newZoom: number) {
    if (!imgNatural) return
    const bs   = Math.max(cropW / imgNatural.w, cropH / imgNatural.h)
    const oldW = imgNatural.w * bs * zoom
    const oldH = imgNatural.h * bs * zoom
    const newW = imgNatural.w * bs * newZoom
    const newH = imgNatural.h * bs * newZoom
    const cx   = cropLeft + cropW / 2
    const cy   = cropTop  + cropH / 2
    let nx = cx - (cx - pan.x) / oldW * newW
    let ny = cy - (cy - pan.y) / oldH * newH
    nx = Math.min(nx, cropLeft);           nx = Math.max(nx, cropLeft + cropW - newW)
    ny = Math.min(ny, cropTop);            ny = Math.max(ny, cropTop  + cropH - newH)
    setPan({ x: nx, y: ny })
    setZoom(newZoom)
  }

  // ── Aplicar (renderizar canvas) ──────────────────────────────────────────

  async function handleApply() {
    if (!imgNatural || !fileSrc) return
    setApplying(true)
    try {
      const fullImg = new window.Image()
      fullImg.crossOrigin = 'anonymous'
      
      // Promessa com timeout para evitar travamento infinito
      await Promise.race([
        new Promise<void>((res, rej) => {
          fullImg.onload = () => res()
          fullImg.onerror = (e) => {
            console.error("Erro ao carregar imagem no canvas:", e)
            rej(new Error("Erro de carregamento (CORS ou rede)"))
          }
          fullImg.src = fileSrc
        }),
        new Promise((_, rej) => setTimeout(() => {
          rej(new Error("Timeout ao carregar imagem original (está lenta?)"))
        }, 15000))
      ])

      const natW = fullImg.naturalWidth  || imgNatural.w
      const natH = fullImg.naturalHeight || imgNatural.h

      let outW: number, outH: number, srcX: number, srcY: number, srcW: number, srcH: number

      if (preset.ratio === null) {
        // Modo livre: sem crop, apenas redimensiona para ≤ 1024px
        const maxDim = 1024
        const scale  = Math.min(1, maxDim / Math.max(natW, natH))
        outW = Math.round(natW * scale)
        outH = Math.round(natH * scale)
        srcX = 0; srcY = 0; srcW = natW; srcH = natH
      } else {
        // Cálculo do recorte baseado no zoom e pan atuais
        const cW = cropBoxRef.current.w
        const cH = cropBoxRef.current.h
        const cL = cropBoxRef.current.left
        const cT = cropBoxRef.current.top

        const effectiveBaseScale = Math.max(cW / natW, cH / natH)
        const currentScale = effectiveBaseScale * zoom

        srcX = (cL - pan.x) / currentScale
        srcY = (cT - pan.y) / currentScale
        srcW = cW / currentScale
        srcH = cH / currentScale

        outW = preset.outW
        outH = preset.outH
      }

      const canvas = document.createElement('canvas')
      canvas.width  = outW
      canvas.height = outH
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error("Não foi possível obter o contexto do canvas")
      
      ctx.drawImage(fullImg, srcX, srcY, srcW, srcH, 0, 0, outW, outH)

      // Converte canvas diretamente para Blob para evitar strings base64 gigantes (mais performático)
      const blob = await new Promise<Blob | null>((resolve) => {
        const timeout = setTimeout(() => resolve(null), 5000)
        try {
          canvas.toBlob((b) => {
            clearTimeout(timeout)
            resolve(b)
          }, 'image/jpeg', 0.90)
        } catch (e) {
          clearTimeout(timeout)
          console.error('Erro na chamada canvas.toBlob:', e)
          resolve(null)
        }
      })

      if (!blob) throw new Error("Falha ao gerar o blob da imagem. Tente uma imagem menor ou outro navegador.");

      await onApply(blob)
      onClose()
    } catch (err) {
      console.error("Erro no processamento do recorte:", err)
      alert("Houve um erro ao processar o recorte da imagem. Por favor, tente novamente.")
    } finally {
      setApplying(false)
    }
  }

  // ──────────────────────────────────────────────────────────────────────────

  if (!open || !fileSrc) return null

  const thirdW = cropW / 3
  const thirdH = cropH / 3

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-[400px] rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <Crop className="h-4 w-4 text-[#c62737]" />
            <p className="text-sm font-semibold text-slate-900">{title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Presets */}
        <div className="flex gap-2 px-4 pt-3 pb-1 overflow-x-auto">
          {ASPECT_PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => setPreset(p)}
              className={`flex-shrink-0 flex flex-col items-center rounded-xl border px-3 py-2 text-xs transition-all ${
                preset.label === p.label
                  ? 'border-[#c62737] bg-[#c62737]/5 text-[#c62737]'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              <span className="font-semibold">{p.label}</span>
              <span className="mt-0.5 text-[10px] text-slate-400">{p.desc}</span>
            </button>
          ))}
        </div>

        {/* Viewport de recorte */}
        <div
          className="relative mx-auto mt-3 cursor-grab active:cursor-grabbing select-none bg-slate-900 overflow-hidden"
          style={{ width: CROP_CONTAINER, height: CROP_CONTAINER }}
          onMouseDown={onMouseDown}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
        >
          {fileSrc && (
            <img
              ref={imgRef}
              src={fileSrc}
              alt="crop"
              onLoad={onImgLoad}
              draggable={false}
              crossOrigin="anonymous"
              style={{
                position: 'absolute',
                left: pan.x,
                top: pan.y,
                width: imgDisplayW || 'auto',
                height: imgDisplayH || 'auto',
                userSelect: 'none',
                pointerEvents: 'none',
              }}
            />
          )}

          {/* Sombras laterais */}
          <div className="absolute bg-black/55 pointer-events-none" style={{ top: 0, left: 0, right: 0, height: cropTop }} />
          <div className="absolute bg-black/55 pointer-events-none" style={{ top: cropTop + cropH, left: 0, right: 0, bottom: 0 }} />
          <div className="absolute bg-black/55 pointer-events-none" style={{ top: cropTop, left: 0, width: cropLeft, height: cropH }} />
          <div className="absolute bg-black/55 pointer-events-none" style={{ top: cropTop, left: cropLeft + cropW, right: 0, height: cropH }} />

          {/* Borda + grade de terços + cantos */}
          <div
            className="absolute border border-white/70 pointer-events-none"
            style={{ left: cropLeft, top: cropTop, width: cropW, height: cropH }}
          >
            <div className="absolute bg-white/25 pointer-events-none" style={{ left: thirdW,     top: 0, width: 1, bottom: 0 }} />
            <div className="absolute bg-white/25 pointer-events-none" style={{ left: thirdW * 2, top: 0, width: 1, bottom: 0 }} />
            <div className="absolute bg-white/25 pointer-events-none" style={{ top: thirdH,     left: 0, height: 1, right: 0 }} />
            <div className="absolute bg-white/25 pointer-events-none" style={{ top: thirdH * 2, left: 0, height: 1, right: 0 }} />
            <div className="absolute top-0 left-0   w-4 h-4 border-t-2 border-l-2 border-white pointer-events-none" />
            <div className="absolute top-0 right-0  w-4 h-4 border-t-2 border-r-2 border-white pointer-events-none" />
            <div className="absolute bottom-0 left-0  w-4 h-4 border-b-2 border-l-2 border-white pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white pointer-events-none" />
          </div>

          {!imgNatural && fileSrc && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <Loader2 className="h-8 w-8 text-white animate-spin" />
            </div>
          )}
        </div>

        {/* Zoom */}
        <div className="flex items-center gap-3 px-5 pt-3 pb-1">
          <ZoomOut className="h-4 w-4 text-slate-400 flex-shrink-0" />
          <input
            type="range"
            min={1}
            max={5}
            step={0.02}
            value={zoom}
            onChange={(e) => handleZoomChange(Number(e.target.value))}
            className="flex-1 accent-[#c62737]"
          />
          <ZoomIn className="h-4 w-4 text-slate-400 flex-shrink-0" />
        </div>
        <p className="text-center text-[11px] text-slate-400 pb-2">
          {Math.round(zoom * 100)}% · saída {preset.ratio === null ? `até ${preset.outW}px` : `${preset.outW}×${preset.outH}px`}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={applying || !imgNatural}
            className="flex items-center gap-2 rounded-xl bg-[#c62737] px-5 py-2 text-sm font-semibold text-white hover:bg-[#a81f2d] disabled:opacity-50 transition-colors"
          >
            {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crop className="h-4 w-4" />}
            {applying ? 'Processando…' : 'Aplicar recorte'}
          </button>
        </div>

      </div>
    </div>
  )
}
