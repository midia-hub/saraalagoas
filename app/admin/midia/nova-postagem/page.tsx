'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Instagram,
  Facebook,
  Upload,
  X,
  Image as ImageIcon,
  CalendarClock,
  Clock,
  Loader2,
  Send,
  CalendarDays,
  CheckCircle2,
  AlertCircle,
  PenLine,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  Search,
  LayoutGrid,
  Layers,
  Crop,
  ZoomIn,
  ZoomOut,
  Sparkles,
  Wand2,
  RefreshCw,
  Eye,
  Film,
  PlayCircle,
  Newspaper,
} from 'lucide-react'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { AdminPageHeader } from '@/app/admin/AdminPageHeader'
import { adminFetchJson } from '@/lib/admin-client'
import { CustomSelect } from '@/components/ui/CustomSelect'
import { DatePickerInput } from '@/components/ui/DatePickerInput'
import { Toast } from '@/components/Toast'

// ─────────────────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────────────────

type SocialInstance = {
  id: string
  name: string
  provider: string
  status: string
  has_instagram?: boolean
  has_facebook?: boolean
}

/** Tipo de postagem */
type PostType = 'feed' | 'reel' | 'story'

/** Item de mídia na composição do post */
type MediaItem =
  | { id: string; type: 'upload'; dataUrl: string }
  | { id: string; type: 'gallery'; fileId: string; thumbUrl: string; name: string }
  | { id: string; type: 'url'; url: string }

type PublishMode = 'now' | 'scheduled'
type MediaTab = 'upload' | 'gallery'
type GalleryStep = 'albums' | 'photos'

type GalleryAlbum = {
  id: string
  title: string
  type: string
  date: string
  coverUrl?: string
}

type GalleryFile = { id: string; name: string }

type ToastState = { visible: boolean; message: string; type: 'ok' | 'err' }

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function thumbUrl(fileId: string) {
  return `/api/gallery/image?fileId=${encodeURIComponent(fileId)}&mode=thumb`
}

function isVideoDataUrl(url: string): boolean {
  return typeof url === 'string' && url.startsWith('data:video/')
}

function mediaThumb(item: MediaItem): string {
  if (item.type === 'upload') return item.dataUrl
  if (item.type === 'gallery') return item.thumbUrl
  return item.url
}

function isVideoItem(item: MediaItem): boolean {
  if (item.type === 'upload') return isVideoDataUrl(item.dataUrl)
  return false
}

function formatOffsetTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return `${min}:${sec.toString().padStart(2, '0')}`
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = reject
    r.readAsDataURL(file)
  })
}

function buildScheduledAt(date: string, time: string): string | null {
  if (!date || !time) return null
  const [y, m, d] = date.split('-').map(Number)
  const [h, min] = time.split(':').map(Number)
  if (!y || !m || !d) return null
  const dt = new Date(y, m - 1, d, h ?? 12, min ?? 0, 0)
  return isNaN(dt.getTime()) ? null : dt.toISOString()
}

// ─────────────────────────────────────────────────────────────────────────────
// Modal gerador de legenda com IA
// ─────────────────────────────────────────────────────────────────────────────

const AI_TONES = [
  { value: 'inspirador',    label: 'Inspirador',    emoji: '✨' },
  { value: 'evangélístico', label: 'Evangélístico',  emoji: '🙏' },
  { value: 'informativo',   label: 'Informativo',   emoji: '📌' },
  { value: 'comemorativo',  label: 'Comemorativo',  emoji: '🎉' },
  { value: 'reflexivo',     label: 'Reflexivo',     emoji: '📖' },
] as const

type AiTone = (typeof AI_TONES)[number]['value']

function AiCaptionModal({
  open,
  onClose,
  onApply,
  galleryAlbum,
  singleUploadImage,
}: {
  open: boolean
  onClose: () => void
  onApply: (caption: string) => void
  galleryAlbum?: GalleryAlbum | null
  singleUploadImage?: string | null
}) {
  const [context, setContext] = useState('')
  const [tone, setTone] = useState<AiTone>('inspirador')
  const [platform, setPlatform] = useState<'instagram' | 'facebook' | 'ambos'>('instagram')
  const [hashtags, setHashtags] = useState(true)
  const [useVision, setUseVision] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState('')
  const [error, setError] = useState('')
  const [provider, setProvider] = useState<'gemini' | 'openai' | null>(null)

  // Limpar ao fechar
  useEffect(() => {
    if (!open) {
      setResult('')
      setError('')
      setLoading(false)
      setUseVision(false)
      setProvider(null)
    }
  }, [open])

  // Auto-preencher contexto com dados do álbum
  useEffect(() => {
    if (!open || !galleryAlbum) return
    const typeLabel = galleryAlbum.type === 'culto' ? 'Culto' : 'Evento'
    setContext(`${typeLabel}: ${galleryAlbum.title}`)
  }, [open, galleryAlbum])

  async function generate() {
    if (!useVision && !context.trim()) { setError('Descreva o contexto do post.'); return }
    setError('')
    setResult('')
    setLoading(true)
    try {
      const data = await adminFetchJson<{ caption?: string; error?: string; provider?: 'gemini' | 'openai' }>(
        '/api/midia/gerar-legenda',
        {
          method: 'POST',
          body: JSON.stringify({
            context: useVision ? (context.trim() || undefined) : context,
            tone,
            platform,
            hashtags,
            maxChars: 500,
            isAlbumPost: !!galleryAlbum,
            albumDate: galleryAlbum?.date ?? undefined,
            ...(useVision && singleUploadImage ? { imageDataUrl: singleUploadImage } : {}),
          }),
        }
      )
      if (data.error) throw new Error(data.error)
      setResult(data.caption || '')
      if (data.provider) setProvider(data.provider)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao conectar com a IA.')
    } finally {
      setLoading(false)
    }
  }

  function handleApply() {
    if (!result) return
    onApply(result)
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex w-full max-w-lg flex-col rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl" style={{ maxHeight: '92dvh' }}>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 shadow">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Gerar legenda com IA</p>
              <p className="text-[11px] text-slate-400">
                {provider === 'gemini'
                  ? 'Powered by Gemini 2.0 Flash'
                  : provider === 'openai'
                  ? 'Powered by GPT-4o mini'
                  : 'Gemini 2.0 Flash · GPT-4o mini'}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* Banner álbum da galeria */}
          {galleryAlbum && (
            <div className="flex items-center gap-2.5 rounded-xl border border-blue-100 bg-blue-50 px-3.5 py-2.5">
              <FolderOpen className="h-4 w-4 text-blue-500 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-blue-800 truncate">{galleryAlbum.title}</p>
                <p className="text-[11px] text-blue-500">Contexto preenchido automaticamente com os dados do álbum</p>
              </div>
            </div>
          )}

          {/* Toggle visão por imagem */}
          {singleUploadImage && (
            <div
              className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 cursor-pointer transition-all ${
                useVision
                  ? 'border-violet-300 bg-violet-50'
                  : 'border-slate-200 bg-slate-50 hover:border-slate-300'
              }`}
              onClick={() => setUseVision((v) => !v)}
            >
              <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${
                useVision ? 'bg-violet-500' : 'bg-slate-200'
              }`}>
                <Eye className={`h-4 w-4 ${useVision ? 'text-white' : 'text-slate-500'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-semibold ${useVision ? 'text-violet-800' : 'text-slate-700'}`}>
                  Analisar a imagem com IA
                </p>
                <p className={`text-[11px] ${useVision ? 'text-violet-500' : 'text-slate-400'}`}>
                  A IA verá a foto e gerará a legenda com base no conteúdo visual
                </p>
              </div>
              <div className={`relative h-5 w-9 flex-shrink-0 rounded-full transition-colors ${
                useVision ? 'bg-violet-500' : 'bg-slate-200'
              }`}>
                <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                  useVision ? 'left-4' : 'left-0.5'
                }`} />
              </div>
            </div>
          )}

          {/* Contexto */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              Sobre o quê é este post?
              {!useVision && <span className="text-red-500"> *</span>}
              {useVision && <span className="ml-1 text-[11px] font-normal text-slate-400">(opcional — complementa a análise visual)</span>}
            </label>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Ex: Culto de domingo com tema \u2018A fé que move montes\u2019, data 02/03, convidamos toda a igreja…"
              rows={3}
              maxLength={500}
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50/40 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 hover:border-slate-300 transition"
            />
            <p className="mt-1 text-right text-[11px] text-slate-400">{context.length}/500</p>
          </div>

          {/* Tom */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Tom da legenda</label>
            <div className="flex flex-wrap gap-2">
              {AI_TONES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTone(t.value as AiTone)}
                  className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all ${
                    tone === t.value
                      ? 'border-violet-500 bg-violet-50 text-violet-700'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <span>{t.emoji}</span> {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Plataforma + Hashtags */}
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[140px]">
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">Plataforma</label>
              <div className="flex rounded-xl border border-slate-200 overflow-hidden">
                {(['instagram', 'facebook', 'ambos'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPlatform(p)}
                    className={`flex-1 py-1.5 text-xs font-medium transition-colors capitalize ${
                      platform === p
                        ? 'bg-violet-500 text-white'
                        : 'bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {p === 'ambos' ? 'Ambos' : p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-end pb-0.5">
              <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700 select-none">
                <div
                  onClick={() => setHashtags((v) => !v)}
                  className={`relative h-5 w-9 rounded-full transition-colors ${
                    hashtags ? 'bg-violet-500' : 'bg-slate-200'
                  }`}
                >
                  <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                    hashtags ? 'left-4' : 'left-0.5'
                  }`} />
                </div>
                Incluir hashtags
              </label>
            </div>
          </div>

          {/* Resultado */}
          {(result || loading || error) && (
            <div className={`rounded-xl border p-3.5 text-sm ${
              error
                ? 'border-red-200 bg-red-50 text-red-700'
                : 'border-violet-100 bg-violet-50/60 text-slate-800'
            }`}>
              {loading ? (
                <div className="flex items-center gap-2 text-violet-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Gerando legenda…</span>
                </div>
              ) : error ? (
                <p className="text-xs">{error}</p>
              ) : (
                <>
                  <p className="whitespace-pre-wrap leading-relaxed">{result}</p>
                  <p className="mt-2 text-right text-[11px] text-slate-400">{result.length} caracteres</p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4">
          <button
            type="button"
            onClick={generate}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-medium text-violet-700 hover:bg-violet-100 disabled:opacity-50 transition-colors"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : result ? <RefreshCw className="h-4 w-4" /> : <Wand2 className="h-4 w-4" />}
            {loading ? 'Gerando…' : result ? 'Gerar novamente' : 'Gerar legenda'}
          </button>
          <div className="flex gap-2">
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
              disabled={!result}
              className="flex items-center gap-2 rounded-xl bg-[#c62737] px-5 py-2 text-sm font-semibold text-white hover:bg-[#a81f2d] disabled:opacity-40 transition-colors"
            >
              <CheckCircle2 className="h-4 w-4" />
              Usar legenda
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Presets de proporção (Instagram e Facebook)
// ─────────────────────────────────────────────────────────────────────────────

type AspectPreset = {
  label: string
  ratio: number
  outW: number
  outH: number
  desc: string
}

const ASPECT_PRESETS: AspectPreset[] = [
  { label: '1:1',    ratio: 1,          outW: 1080, outH: 1080, desc: 'Quadrado – IG & FB'  },
  { label: '4:5',    ratio: 4 / 5,      outW: 1080, outH: 1350, desc: 'Retrato – Instagram' },
  { label: '1.91:1', ratio: 1200 / 628, outW: 1200, outH: 628,  desc: 'Paisagem – Facebook' },
  { label: '16:9',   ratio: 16 / 9,     outW: 1280, outH: 720,  desc: 'Widescreen'          },
  { label: '9:16',   ratio: 9 / 16,     outW: 1080, outH: 1920, desc: 'Stories / Reels'     },
]

const CROP_CONTAINER = 340
const CROP_BOX_MAX   = 300

// ─────────────────────────────────────────────────────────────────────────────
// Modal editor de imagem (crop + proporção)
// ─────────────────────────────────────────────────────────────────────────────

function ImageCropperModal({
  item,
  open,
  onClose,
  onApply,
}: {
  item: MediaItem | null
  open: boolean
  onClose: () => void
  onApply: (id: string, newDataUrl: string) => void
}) {
  const [preset, setPreset] = useState<AspectPreset>(ASPECT_PRESETS[0])
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [imgSrc, setImgSrc] = useState<string | null>(null)
  const [imgNatural, setImgNatural] = useState<{ w: number; h: number } | null>(null)
  const [applying, setApplying] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  const isDragging = useRef(false)
  const dragStartRef = useRef({ x: 0, y: 0, px: 0, py: 0 })
  const touchStartRef = useRef({ x: 0, y: 0, px: 0, py: 0 })
  const cropBoxRef = useRef({ left: 0, top: 0, w: 0, h: 0 })
  const imgDimsRef = useRef({ w: 0, h: 0 })

  // Derived layout
  const cropW    = preset.ratio >= 1 ? CROP_BOX_MAX : CROP_BOX_MAX * preset.ratio
  const cropH    = preset.ratio >= 1 ? CROP_BOX_MAX / preset.ratio : CROP_BOX_MAX
  const cropLeft = (CROP_CONTAINER - cropW) / 2
  const cropTop  = (CROP_CONTAINER - cropH) / 2
  const baseScale   = imgNatural ? Math.max(cropW / imgNatural.w, cropH / imgNatural.h) : 1
  const imgDisplayW = imgNatural ? imgNatural.w * baseScale * zoom : 0
  const imgDisplayH = imgNatural ? imgNatural.h * baseScale * zoom : 0

  // Manter refs sempre atualizadas (usadas nos handlers de window)
  cropBoxRef.current = { left: cropLeft, top: cropTop, w: cropW, h: cropH }
  imgDimsRef.current = { w: imgDisplayW, h: imgDisplayH }

  // Carregar imagem ao abrir
  useEffect(() => {
    if (!open || !item) return
    setZoom(1)
    setImgNatural(null)
    setApplying(false)
    setPreset(ASPECT_PRESETS[0])
    if (item.type === 'upload') {
      setImgSrc(item.dataUrl)
    } else if (item.type === 'gallery') {
      setImgSrc(`/api/gallery/image?fileId=${encodeURIComponent(item.fileId)}&mode=full`)
    } else {
      setImgSrc(item.url)
    }
  }, [open, item])

  // Re-centralizar ao trocar preset
  useEffect(() => {
    if (!imgNatural) return
    const bs = Math.max(cropW / imgNatural.w, cropH / imgNatural.h)
    setPan({
      x: cropLeft + cropW / 2 - imgNatural.w * bs * zoom / 2,
      y: cropTop  + cropH / 2 - imgNatural.h * bs * zoom / 2,
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset])

  // Registrar handlers de arrastar no window
  useEffect(() => {
    if (!open) return
    function onMove(e: MouseEvent) {
      if (!isDragging.current) return
      const { left: cl, top: ct, w: cw, h: ch } = cropBoxRef.current
      const { w: imgW, h: imgH } = imgDimsRef.current
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

  function onImgLoad() {
    const img = imgRef.current
    if (!img) return
    const nat = { w: img.naturalWidth, h: img.naturalHeight }
    setImgNatural(nat)
    const bs = Math.max(cropW / nat.w, cropH / nat.h)
    setZoom(1)
    setPan({
      x: cropLeft + cropW / 2 - nat.w * bs / 2,
      y: cropTop  + cropH / 2 - nat.h * bs / 2,
    })
  }

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
    const { w: imgW, h: imgH } = imgDimsRef.current
    let nx = touchStartRef.current.px + (t.clientX - touchStartRef.current.x)
    let ny = touchStartRef.current.py + (t.clientY - touchStartRef.current.y)
    nx = Math.min(nx, cl);  nx = Math.max(nx, cl + cw - imgW)
    ny = Math.min(ny, ct);  ny = Math.max(ny, ct + ch - imgH)
    setPan({ x: nx, y: ny })
  }

  function handleZoomChange(newZoom: number) {
    if (!imgNatural) return
    const bs  = Math.max(cropW / imgNatural.w, cropH / imgNatural.h)
    const oldW = imgNatural.w * bs * zoom
    const oldH = imgNatural.h * bs * zoom
    const newW = imgNatural.w * bs * newZoom
    const newH = imgNatural.h * bs * newZoom
    const cx = cropLeft + cropW / 2
    const cy = cropTop  + cropH / 2
    let nx = cx - (cx - pan.x) / oldW * newW
    let ny = cy - (cy - pan.y) / oldH * newH
    nx = Math.min(nx, cropLeft);           nx = Math.max(nx, cropLeft + cropW - newW)
    ny = Math.min(ny, cropTop);            ny = Math.max(ny, cropTop  + cropH - newH)
    setPan({ x: nx, y: ny })
    setZoom(newZoom)
  }

  async function handleApply() {
    if (!imgNatural || !imgSrc || !item) return
    setApplying(true)
    try {
      // 1. Carregar a imagem completa (mesma URL usada no cropper)
      const fullImg = new window.Image()
      fullImg.crossOrigin = 'anonymous'
      await new Promise<void>((res, rej) => {
        fullImg.onload = () => res()
        fullImg.onerror = rej
        fullImg.src = imgSrc!
      })

      // 2. Recalcular o scale a partir das dimensões REAIS do fullImg
      //    (evita drift caso o cache retorne uma versão redimensionada)
      const natW = fullImg.naturalWidth  || imgNatural.w
      const natH = fullImg.naturalHeight || imgNatural.h
      const realBaseScale = Math.max(cropW / natW, cropH / natH)
      const realScale = realBaseScale * zoom

      // 3. Converter coordenadas de viewport → pixels fonte, com clamp de segurança
      const srcX = Math.max(0, (cropLeft - pan.x) / realScale)
      const srcY = Math.max(0, (cropTop  - pan.y) / realScale)
      const srcW = Math.min(cropW / realScale, natW - srcX)
      const srcH = Math.min(cropH / realScale, natH - srcY)

      // 4. Desenhar na resolução exata do preset
      const canvas = document.createElement('canvas')
      canvas.width  = preset.outW
      canvas.height = preset.outH
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.drawImage(fullImg, srcX, srcY, srcW, srcH, 0, 0, preset.outW, preset.outH)

      // 5. Compressão adaptativa: manter cada imagem ≤ 700 KB em base64
      //    (10 imagens × 700 KB ≈ 7 MB raw, ~700 KB após encoding ≈ ≤ 4 MB)
      const MAX_B64 = 700_000
      let dataUrl = canvas.toDataURL('image/jpeg', 0.92)
      if (dataUrl.length > MAX_B64) dataUrl = canvas.toDataURL('image/jpeg', 0.82)
      if (dataUrl.length > MAX_B64) dataUrl = canvas.toDataURL('image/jpeg', 0.72)
      if (dataUrl.length > MAX_B64) dataUrl = canvas.toDataURL('image/jpeg', 0.60)

      onApply(item.id, dataUrl)
      onClose()
    } catch { /* silencioso */ } finally { setApplying(false) }
  }

  if (!open || !item) return null

  const thirdW = cropW / 3
  const thirdH = cropH / 3

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-[420px] rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <Crop className="h-4 w-4 text-[#c62737]" />
            <p className="text-sm font-semibold text-slate-900">Editar proporção</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
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
          {imgSrc && (
            <img
              ref={imgRef}
              src={imgSrc}
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

          {!imgNatural && imgSrc && (
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
          {Math.round(zoom * 100)}% · saída {preset.outW}&times;{preset.outH}px
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
            {applying ? 'Processando…' : 'Aplicar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Modal seletor de galeria
// ─────────────────────────────────────────────────────────────────────────────

function GalleryPickerModal({
  open,
  onClose,
  onConfirm,
  alreadyCount,
}: {
  open: boolean
  onClose: () => void
  onConfirm: (files: GalleryFile[], album: GalleryAlbum) => void
  alreadyCount: number
}) {
  const [step, setStep] = useState<GalleryStep>('albums')
  const [albums, setAlbums] = useState<GalleryAlbum[]>([])
  const [loadingAlbums, setLoadingAlbums] = useState(false)
  const [selectedAlbum, setSelectedAlbum] = useState<GalleryAlbum | null>(null)
  const [files, setFiles] = useState<GalleryFile[]>([])
  const [loadingFiles, setLoadingFiles] = useState(false)
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([])
  const [albumSearch, setAlbumSearch] = useState('')

  const max = 10 - alreadyCount

  useEffect(() => {
    if (!open) return
    setStep('albums')
    setSelectedAlbum(null)
    setFiles([])
    setSelectedFileIds([])
    setAlbumSearch('')
    if (albums.length > 0) return
    setLoadingAlbums(true)
    adminFetchJson<Array<{ id: string; title: string; type: string; date: string }>>('/api/gallery/list')
      .then(async (rows) => {
        const list: GalleryAlbum[] = Array.isArray(rows) ? rows : []
        setAlbums(list)
        // Enriquecer capas em lotes de 3 (igual ao admin/galeria/page.tsx)
        for (let i = 0; i < list.length; i += 3) {
          const batch = list.slice(i, i + 3)
          await Promise.all(
            batch.map(async (album) => {
              try {
                const files = await adminFetchJson<{ id: string }[]>(`/api/gallery/${album.id}/files`)
                const firstId = Array.isArray(files) ? files[0]?.id : undefined
                if (firstId) {
                  const coverUrl = `/api/gallery/image?fileId=${encodeURIComponent(firstId)}&mode=thumb`
                  setAlbums((prev) => prev.map((a) => (a.id === album.id ? { ...a, coverUrl } : a)))
                }
              } catch {
                // silenciosamente ignora
              }
            })
          )
        }
      })
      .catch(() => setAlbums([]))
      .finally(() => setLoadingAlbums(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  async function openAlbum(album: GalleryAlbum) {
    setSelectedAlbum(album)
    setStep('photos')
    setFiles([])
    setSelectedFileIds([])
    setLoadingFiles(true)
    try {
      const data = await adminFetchJson<GalleryFile[]>(`/api/gallery/${album.id}/files`)
      setFiles(Array.isArray(data) ? data : [])
    } finally {
      setLoadingFiles(false)
    }
  }

  function toggleFile(fileId: string) {
    setSelectedFileIds((prev) => {
      if (prev.includes(fileId)) return prev.filter((id) => id !== fileId)
      if (prev.length >= max) return prev
      return [...prev, fileId]
    })
  }

  function handleConfirm() {
    const selected = files.filter((f) => selectedFileIds.includes(f.id))
    onConfirm(selected, selectedAlbum!)
    onClose()
  }

  const filteredAlbums = albums.filter((a) =>
    a.title.toLowerCase().includes(albumSearch.toLowerCase())
  )

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div
        className="relative z-10 flex w-full max-w-2xl flex-col rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl overflow-hidden"
        style={{ maxHeight: '90dvh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            {step === 'photos' && (
              <button
                type="button"
                onClick={() => { setStep('albums'); setSelectedAlbum(null) }}
                className="mr-1 flex h-7 w-7 items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            <FolderOpen className="h-4 w-4 text-[#c62737]" />
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {step === 'albums' ? 'Selecionar álbum' : selectedAlbum?.title}
              </p>
              {step === 'photos' && (
                <p className="text-xs text-slate-400">
                  {selectedFileIds.length}/{max}{' '}
                  {selectedFileIds.length === 1 ? 'foto selecionada' : 'fotos selecionadas'}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {step === 'albums' && (
            <div className="p-4">
              {/* Busca */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar álbum…"
                  value={albumSearch}
                  onChange={(e) => setAlbumSearch(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#c62737] focus:ring-2 focus:ring-[#c62737]/20 hover:border-slate-300 transition"
                />
              </div>

              {loadingAlbums ? (
                <div className="flex items-center justify-center py-16 gap-2 text-slate-400">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-sm">Carregando álbuns…</span>
                </div>
              ) : filteredAlbums.length === 0 ? (
                <div className="py-16 text-center text-sm text-slate-400">
                  {albumSearch ? 'Nenhum álbum encontrado.' : 'Nenhum álbum disponível.'}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {filteredAlbums.map((album) => (
                    <button
                      key={album.id}
                      type="button"
                      onClick={() => openAlbum(album)}
                      className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white text-left transition-all hover:border-[#c62737]/40 hover:shadow-md"
                    >
                      {/* Cover */}
                      <div className="relative aspect-square bg-slate-100 overflow-hidden">
                        {album.coverUrl ? (
                          <img
                            src={album.coverUrl}
                            alt={album.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <ImageIcon className="h-8 w-8 text-slate-300 group-hover:text-slate-400 transition-colors" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="absolute right-2 top-2">
                          <span
                            className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                              album.type === 'culto'
                                ? 'bg-[#c62737] text-white'
                                : 'bg-slate-800/80 text-white'
                            }`}
                          >
                            {album.type === 'culto' ? 'Culto' : 'Evento'}
                          </span>
                        </div>
                      </div>
                      <div className="px-2 py-2">
                        <p className="truncate text-xs font-semibold text-slate-800 group-hover:text-[#c62737] transition-colors">
                          {album.title}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {new Date(album.date + 'T12:00:00').toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 'photos' && (
            <div className="p-4">
              {loadingFiles ? (
                <div className="flex items-center justify-center py-16 gap-2 text-slate-400">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-sm">Carregando fotos…</span>
                </div>
              ) : files.length === 0 ? (
                <div className="py-16 text-center text-sm text-slate-400">
                  Nenhuma foto neste álbum.
                </div>
              ) : (
                <>
                  {max <= 0 && (
                    <p className="mb-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
                      Você já selecionou 10 imagens (limite máximo).
                    </p>
                  )}
                  <div className="mb-3 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setSelectedFileIds(files.slice(0, max).map((f) => f.id))}
                      className="text-xs font-medium text-[#c62737] hover:underline"
                    >
                      Selecionar todas ({Math.min(files.length, max)})
                    </button>
                    {selectedFileIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedFileIds([])}
                        className="text-xs text-slate-400 hover:text-slate-600"
                      >
                        Limpar seleção
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {files.map((file) => {
                      const sel = selectedFileIds.includes(file.id)
                      const disabled = !sel && selectedFileIds.length >= max
                      return (
                        <button
                          key={file.id}
                          type="button"
                          disabled={disabled}
                          onClick={() => toggleFile(file.id)}
                          className={`group relative aspect-square overflow-hidden rounded-xl border-2 transition-all focus:outline-none ${
                            sel
                              ? 'border-[#c62737] ring-2 ring-[#c62737]/25'
                              : disabled
                              ? 'border-slate-200 opacity-40 cursor-not-allowed'
                              : 'border-slate-200 hover:border-[#c62737]/50'
                          }`}
                        >
                          <img
                            src={thumbUrl(file.id)}
                            alt={file.name}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                          {sel && (
                            <div className="absolute inset-0 bg-[#c62737]/15 flex items-center justify-center">
                              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#c62737] shadow-lg">
                                <svg
                                  width="12"
                                  height="12"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="white"
                                  strokeWidth="3"
                                >
                                  <path d="M5 12l5 5L20 7" />
                                </svg>
                              </div>
                            </div>
                          )}
                          {sel && (
                            <span className="absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded-md bg-[#c62737] text-[10px] font-bold text-white shadow">
                              {selectedFileIds.indexOf(file.id) + 1}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'photos' && (
          <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-3">
            <p className="text-xs text-slate-400">
              {selectedFileIds.length === 0
                ? 'Nenhuma foto selecionada'
                : `${selectedFileIds.length} foto(s) selecionada(s)`}
            </p>
            <button
              type="button"
              disabled={selectedFileIds.length === 0}
              onClick={handleConfirm}
              className="flex items-center gap-2 rounded-xl bg-[#c62737] px-5 py-2 text-sm font-semibold text-white hover:bg-[#9e1f2e] transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              Adicionar {selectedFileIds.length > 0 ? `(${selectedFileIds.length})` : ''}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Preview Instagram
// ─────────────────────────────────────────────────────────────────────────────

function InstagramPreview({
  pageName,
  text,
  media,
}: {
  pageName: string
  text: string
  media: MediaItem[]
}) {
  const [idx, setIdx] = useState(0)
  const current = media[idx] ?? null
  useEffect(() => setIdx(0), [media.length])

  return (
    <div className="mx-auto w-full max-w-[320px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#f09433] via-[#e6683c] to-[#c62737] flex items-center justify-center flex-shrink-0">
          <Instagram className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">
            {pageName || 'Seu perfil'}
          </p>
          <p className="text-xs text-slate-400">Agora</p>
        </div>
        <span className="text-slate-400 text-base">···</span>
      </div>

      {/* Imagem */}
      <div className="relative aspect-square bg-slate-100">
        {current ? (
          <img
            src={mediaThumb(current)}
            alt="preview"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2">
            <ImageIcon className="h-10 w-10 text-slate-300" />
            <p className="text-xs text-slate-400">Sem imagem</p>
          </div>
        )}
        {media.length > 1 && (
          <>
            {idx > 0 && (
              <button
                type="button"
                onClick={() => setIdx((i) => i - 1)}
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70 transition-colors"
              >
                <ChevronLeft className="h-3 w-3" />
              </button>
            )}
            {idx < media.length - 1 && (
              <button
                type="button"
                onClick={() => setIdx((i) => i + 1)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70 transition-colors"
              >
                <ChevronRight className="h-3 w-3" />
              </button>
            )}
            <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
              {media.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIdx(i)}
                  className={`rounded-full transition-all ${
                    i === idx ? 'w-4 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/60'
                  }`}
                />
              ))}
            </div>
          </>
        )}
        {media.length > 1 && (
          <span className="absolute right-2 top-2 rounded-lg bg-black/60 px-2 py-0.5 text-xs font-semibold text-white backdrop-blur-sm">
            {idx + 1}/{media.length}
          </span>
        )}
      </div>

      {/* Ações */}
      <div className="px-3 py-2 flex items-center gap-3">
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5 fill-none stroke-slate-800 stroke-[1.8]"
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5 fill-none stroke-slate-800 stroke-[1.8]"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5 fill-none stroke-slate-800 stroke-[1.8]"
        >
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
        <div className="ml-auto">
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5 fill-none stroke-slate-800 stroke-[1.8]"
          >
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
        </div>
      </div>

      {/* Legenda */}
      <div className="px-3 pb-3">
        {text ? (
          <p className="text-xs text-slate-800 leading-relaxed line-clamp-4">
            <span className="font-semibold">{pageName || 'Seu perfil'}</span>{' '}
            {text}
          </p>
        ) : (
          <p className="text-xs text-slate-400 italic">Legenda aparecerá aqui…</p>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Preview Facebook
// ─────────────────────────────────────────────────────────────────────────────

function FacebookPreview({
  pageName,
  text,
  media,
}: {
  pageName: string
  text: string
  media: MediaItem[]
}) {
  const first = media[0]
  const extra = media.length - 1

  return (
    <div className="mx-auto w-full max-w-[320px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <div className="h-8 w-8 rounded-full bg-[#1877f2] flex items-center justify-center flex-shrink-0">
          <Facebook className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">
            {pageName || 'Sua página'}
          </p>
          <p className="text-xs text-slate-400 flex items-center gap-1">
            Agora · <span>🌐</span>
          </p>
        </div>
      </div>
      {text && (
        <p className="px-3 pb-2 text-sm text-slate-800 line-clamp-5">{text}</p>
      )}
      <div className="relative bg-slate-100 aspect-video">
        {first ? (
          <>
            <img
              src={mediaThumb(first)}
              alt="preview"
              className="h-full w-full object-cover"
            />
            {extra > 0 && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <span className="text-2xl font-bold text-white drop-shadow-md">
                  +{extra}
                </span>
              </div>
            )}
          </>
        ) : (
          <div className="flex h-full items-center justify-center">
            <ImageIcon className="h-10 w-10 text-slate-300" />
          </div>
        )}
      </div>
      <div className="flex gap-3 border-t border-slate-100 px-3 py-2">
        <span className="text-xs text-slate-500">👍 Curtir</span>
        <span className="text-xs text-slate-500">💬 Comentar</span>
        <span className="text-xs text-slate-500">↗ Compartilhar</span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Preview Tabs
// ─────────────────────────────────────────────────────────────────────────────

function PreviewTabs({
  showInstagram,
  showFacebook,
  pageName,
  text,
  media,
}: {
  showInstagram: boolean
  showFacebook: boolean
  pageName: string
  text: string
  media: MediaItem[]
}) {
  const [tab, setTab] = useState<'instagram' | 'facebook'>(
    showInstagram ? 'instagram' : 'facebook'
  )
  useEffect(() => {
    if (tab === 'instagram' && !showInstagram) setTab('facebook')
    if (tab === 'facebook' && !showFacebook) setTab('instagram')
  }, [showInstagram, showFacebook, tab])

  return (
    <div>
      {showInstagram && showFacebook && (
        <div className="mb-3 flex overflow-hidden rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setTab('instagram')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${
              tab === 'instagram'
                ? 'bg-[#c62737] text-white'
                : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Instagram className="h-3.5 w-3.5" /> Instagram
          </button>
          <button
            type="button"
            onClick={() => setTab('facebook')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${
              tab === 'facebook'
                ? 'bg-[#1877f2] text-white'
                : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Facebook className="h-3.5 w-3.5" /> Facebook
          </button>
        </div>
      )}
      {tab === 'instagram' ? (
        <InstagramPreview pageName={pageName} text={text} media={media} />
      ) : (
        <FacebookPreview pageName={pageName} text={text} media={media} />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Conteúdo principal
// ─────────────────────────────────────────────────────────────────────────────

const QUICK_EMOJIS = ['😊', '🙏', '🔥', '❤️', '✨', '👏', '🎉', '📖', '⚡']

function NovaPostagemContent() {
  const searchParams = useSearchParams()
  const replayId = searchParams?.get('replay') || ''
  const [instances, setInstances] = useState<SocialInstance[]>([])
  const [loadingInstances, setLoadingInstances] = useState(true)
  const [loadingReplay, setLoadingReplay] = useState(false)

  // Formulário
  const [selectedInstanceId, setSelectedInstanceId] = useState('')
  const [destinations, setDestinations] = useState({
    instagram: true,
    facebook: false,
  })
  const [postType, setPostType] = useState<PostType>('feed')
  const [reelThumbOffsetMs, setReelThumbOffsetMs] = useState(0)
  const [reelVideoDurationMs, setReelVideoDurationMs] = useState(0)
  const reelVideoRef = useRef<HTMLVideoElement>(null)
  const [text, setText] = useState('')
  const [media, setMedia] = useState<MediaItem[]>([])
  const [mediaTab, setMediaTab] = useState<MediaTab>('upload')
  const [publishMode, setPublishMode] = useState<PublishMode>('now')
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('12:00')

  // Modal galeria
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [lastGalleryAlbum, setLastGalleryAlbum] = useState<GalleryAlbum | null>(null)

  // Modal editor de imagem
  const [cropItem, setCropItem] = useState<MediaItem | null>(null)

  // Modal IA
  const [aiModalOpen, setAiModalOpen] = useState(false)

  // Estado da publicação
  const [publishing, setPublishing] = useState(false)
  const [notice, setNotice] = useState<{ text: string; ok: boolean } | null>(null)
  const [toast, setToast] = useState<ToastState>({
    visible: false,
    message: '',
    type: 'ok',
  })

  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const showToast = useCallback((message: string, type: 'ok' | 'err') => {
    setToast({ visible: true, message, type })
  }, [])

  const normalizeIntegrationId = useCallback((raw: string) => {
    let value = raw.trim()
    while (value.startsWith('meta_ig:') || value.startsWith('meta_fb:')) {
      value = value.slice(value.indexOf(':') + 1).trim()
    }
    return value
  }, [])

  useEffect(() => {
    adminFetchJson<SocialInstance[]>(
      '/api/admin/instagram/instances?forPosting=1&metaOnly=1'
    )
      .then((data) => setInstances(Array.isArray(data) ? data : []))
      .catch(() => setInstances([]))
      .finally(() => setLoadingInstances(false))
  }, [])

  useEffect(() => {
    if (!replayId) return
    setLoadingReplay(true)
    adminFetchJson<{
      id: string
      instance_ids?: string[]
      destinations?: { instagram?: boolean; facebook?: boolean }
      caption?: string
      media_specs?: Array<{ id?: string; url?: string }>
    }>(`/api/social/scheduled/${replayId}`)
      .then((post) => {
        const ids = Array.isArray(post.instance_ids) ? post.instance_ids : []
        const integrationId = ids.length > 0 ? normalizeIntegrationId(String(ids[0])) : ''
        if (integrationId) {
          setSelectedInstanceId(integrationId)
        }
        setDestinations({
          instagram: Boolean(post.destinations?.instagram ?? true),
          facebook: Boolean(post.destinations?.facebook ?? false),
        })
        setText(typeof post.caption === 'string' ? post.caption : '')

        const specs = Array.isArray(post.media_specs) ? post.media_specs : []
        const replayMedia: MediaItem[] = specs
          .map((spec, index) => {
            if (typeof spec?.id === 'string' && spec.id.trim()) {
              const fileId = spec.id.trim()
              return {
                id: `replay-gal-${fileId}-${index}`,
                type: 'gallery' as const,
                fileId,
                thumbUrl: thumbUrl(fileId),
                name: `Imagem ${index + 1}`,
              }
            }
            if (typeof spec?.url === 'string' && /^https?:\/\//i.test(spec.url.trim())) {
              return {
                id: `replay-url-${index}`,
                type: 'url' as const,
                url: spec.url.trim(),
              }
            }
            return null
          })
          .filter((item): item is MediaItem => item != null)
        setMedia(replayMedia.slice(0, 10))
        if (replayMedia.some((m) => m.type === 'gallery')) {
          setMediaTab('gallery')
        }
      })
      .catch((e) => {
        const msg = e instanceof Error ? e.message : 'NÃ£o foi possÃ­vel carregar a postagem para refazer.'
        showToast(msg, 'err')
      })
      .finally(() => setLoadingReplay(false))
  }, [replayId, normalizeIntegrationId, showToast])

  useEffect(() => {
    const normalizedSelectedId = normalizeIntegrationId(selectedInstanceId)
    const inst = instances.find(
      (i) =>
        i.id === selectedInstanceId ||
        normalizeIntegrationId(i.id) === normalizedSelectedId
    )
    if (!inst) return
    const hasIG = inst.has_instagram !== false
    const hasFB = inst.has_facebook !== false
    setDestinations((prev) => {
      const next = { ...prev }
      if (!hasIG) next.instagram = false
      if (!hasFB) next.facebook = false
      if (!next.instagram && !next.facebook) {
        if (hasIG) next.instagram = true
        else if (hasFB) next.facebook = true
      }
      return next
    })
  }, [selectedInstanceId, instances, normalizeIntegrationId])

  // Reset capa do Reel quando a mídia ou tipo muda
  useEffect(() => {
    setReelThumbOffsetMs(0)
    setReelVideoDurationMs(0)
  }, [media.length, postType])

  const normalizedSelectedId = normalizeIntegrationId(selectedInstanceId)
  const selectedInstance =
    instances.find(
      (i) =>
        i.id === selectedInstanceId ||
        normalizeIntegrationId(i.id) === normalizedSelectedId
    ) ?? null
  const pageName = selectedInstance?.name ?? ''

  // ── Adicionar upload local ─────────────────────────────────────────────────
  async function handleFilesSelected(files: FileList | null) {
    if (!files || files.length === 0) return
    const maxItems = postType === 'reel' || postType === 'story' ? 1 : 10
    const remaining = maxItems - media.length
    if (remaining <= 0) {
      showToast(`Máximo de ${maxItems} mídia${maxItems > 1 ? 's' : ''} permitida${maxItems > 1 ? 's' : ''}.`, 'err')
      return
    }
    const toAdd = Array.from(files).slice(0, remaining)
    const newItems: MediaItem[] = []
    for (const file of toAdd) {
      const isVideo = file.type.startsWith('video/')
      const isImage = file.type.startsWith('image/')
      if (!isVideo && !isImage) continue
      // Reel só aceita vídeo
      if (postType === 'reel' && !isVideo) {
        showToast('Reels exigem um arquivo de vídeo.', 'err')
        continue
      }
      const dataUrl = await fileToBase64(file)
      newItems.push({
        id: `up-${Date.now()}-${Math.random()}`,
        type: 'upload',
        dataUrl,
      })
    }
    setMedia((prev) => [...prev, ...newItems])
  }

  // ── Adicionar fotos da galeria ─────────────────────────────────────────────
  function handleGalleryConfirm(files: GalleryFile[], album: GalleryAlbum) {
    setLastGalleryAlbum(album)
    const existing = new Set(
      media
        .filter((m): m is MediaItem & { type: 'gallery' } => m.type === 'gallery')
        .map((m) => m.fileId)
    )
    const newItems: MediaItem[] = files
      .filter((f) => !existing.has(f.id))
      .map(
        (f): MediaItem => ({
          id: `gal-${f.id}`,
          type: 'gallery',
          fileId: f.id,
          thumbUrl: thumbUrl(f.id),
          name: f.name,
        })
      )
    setMedia((prev) => [...prev, ...newItems].slice(0, 10))
  }

  function removeMedia(id: string) {
    setMedia((prev) => prev.filter((m) => m.id !== id))
  }

  function moveMedia(id: string, dir: 'left' | 'right') {
    setMedia((prev) => {
      const idx = prev.findIndex((m) => m.id === id)
      if (idx < 0) return prev
      const next = [...prev]
      const target = dir === 'left' ? idx - 1 : idx + 1
      if (target < 0 || target >= next.length) return prev
      ;[next[idx], next[target]] = [next[target], next[idx]]
      return next
    })
  }

  function handleCropApply(id: string, newDataUrl: string) {
    setMedia((prev) =>
      prev.map((m): MediaItem => (m.id !== id ? m : { id: m.id, type: 'upload', dataUrl: newDataUrl }))
    )
  }

  function insertEmoji(emoji: string) {
    const el = textareaRef.current
    if (!el) {
      setText((t) => t + emoji)
      return
    }
    const s = el.selectionStart
    const e = el.selectionEnd
    const newVal = text.slice(0, s) + emoji + text.slice(e)
    setText(newVal)
    requestAnimationFrame(() => {
      el.selectionStart = el.selectionEnd = s + emoji.length
      el.focus()
    })
  }

  // ── Publicar ──────────────────────────────────────────────────────────────
  async function handlePublish() {
    setNotice(null)
    if (!selectedInstanceId) {
      showToast('Selecione um perfil.', 'err')
      return
    }
    if (!destinations.instagram && !destinations.facebook) {
      showToast('Selecione ao menos um canal.', 'err')
      return
    }
    if (media.length === 0) {
      showToast('Adicione pelo menos uma mídia.', 'err')
      return
    }
    if (destinations.instagram && postType === 'feed' && media.length > 10) {
      showToast('Máximo 10 imagens para post de feed no Instagram.', 'err')
      return
    }
    if ((postType === 'reel' || postType === 'story') && media.length > 1) {
      showToast(`${postType === 'reel' ? 'Reels' : 'Stories'} aceitam apenas 1 mídia.`, 'err')
      return
    }
    if (postType === 'reel') {
      const hasVideo = media.some((m) => m.type === 'upload' && isVideoDataUrl(m.dataUrl))
      if (!hasVideo) {
        showToast('Reels exigem um arquivo de vídeo.', 'err')
        return
      }
    }

    let scheduledAt: string | null = null
    if (publishMode === 'scheduled') {
      scheduledAt = buildScheduledAt(scheduledDate, scheduledTime)
      if (!scheduledAt) {
        showToast('Informe data e hora de agendamento.', 'err')
        return
      }
      if (new Date(scheduledAt).getTime() <= Date.now()) {
        showToast('A data/hora deve ser no futuro.', 'err')
        return
      }
    }

    setPublishing(true)
    try {
      const integrationId = normalizeIntegrationId(selectedInstanceId)
      if (!integrationId) {
        throw new Error('Selecione pelo menos uma integraÃ§Ã£o Meta vÃ¡lida.')
      }
      const instanceIds: string[] = []
      if (destinations.instagram)
        instanceIds.push(`meta_ig:${integrationId}`)
      if (destinations.facebook)
        instanceIds.push(`meta_fb:${integrationId}`)

      const orderedMedia = media.map((m) =>
        m.type === 'upload'
          ? { type: 'upload' as const, value: m.dataUrl }
          : m.type === 'gallery'
          ? { type: 'gallery' as const, value: m.fileId }
          : { type: 'url' as const, value: m.url }
      )

      const res = await adminFetchJson<{
        ok?: boolean
        message?: string
        scheduled?: boolean
        metaResults?: Array<{
          instanceId: string
          provider: string
          ok: boolean
          error?: string
        }>
      }>('/api/midia/nova-postagem', {
        method: 'POST',
        body: JSON.stringify({
          instanceIds,
          destinations,
          text,
          postType,
          orderedMedia,
          ...(postType === 'reel' && reelThumbOffsetMs > 0 ? { thumbOffset: reelThumbOffsetMs } : {}),
          ...(scheduledAt ? { scheduledAt } : {}),
        }),
      })

      const msg =
        res?.message ??
        (res?.scheduled ? 'Postagem agendada!' : 'Publicado com sucesso!')
      const failed = (res?.metaResults ?? []).filter((r) => !r.ok)
      setNotice({
        text:
          msg +
          (failed.length > 0
            ? '\n' + failed.map((r) => r.error).join('\n')
            : ''),
        ok: failed.length === 0,
      })
      showToast(msg, res?.ok || res?.scheduled ? 'ok' : 'err')

      if (res?.ok || res?.scheduled) {
        setMedia([])
        setText('')
        setScheduledDate('')
        setScheduledTime('12:00')
        setPublishMode('now')
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao publicar.'
      showToast(msg, 'err')
      setNotice({ text: msg, ok: false })
    } finally {
      setPublishing(false)
    }
  }

  function resetForm() {
    setMedia([])
    setText('')
    setSelectedInstanceId('')
    setDestinations({ instagram: true, facebook: false })
    setPostType('feed')
    setScheduledDate('')
    setPublishMode('now')
    setNotice(null)
    setReelThumbOffsetMs(0)
    setReelVideoDurationMs(0)
  }

  const charCount = text.length
  const maxMedia = postType === 'reel' || postType === 'story' ? 1 : 10
  const igLimitHit = destinations.instagram && postType === 'feed' && media.length > 10
  const reelStoryLimitHit = (postType === 'reel' || postType === 'story') && media.length > 1

  return (
    <div className="flex flex-col gap-0 px-4 py-6 pb-24 md:px-6 md:py-8 md:pb-24 max-w-7xl mx-auto w-full">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="mb-6">
        <AdminPageHeader
          icon={PenLine}
          title="Nova Postagem"
          subtitle="Crie e publique ou agende posts nas contas conectadas."
          backLink={{ href: '/admin/instagram/posts', label: 'Painel de Posts' }}
        />
      </div>
      {loadingReplay && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando dados da postagem para refazer...
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_340px]">
        {/* ═══════════ ESQUERDA – COMPOSER ══════════════════════════ */}
        <div className="space-y-4">
          {/* ┌── Card 1: Tipo de Postagem ───────────────────────────┐ */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/60 px-5 py-3.5 rounded-t-2xl">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#c62737] text-[11px] font-bold text-white flex-shrink-0">
                1
              </span>
              <h2 className="text-sm font-semibold text-slate-800">
                Tipo de postagem
              </h2>
            </div>
            <div className="px-5 py-4">
              <div className="grid grid-cols-3 gap-3">
                {/* Feed */}
                <button
                  type="button"
                  onClick={() => { setPostType('feed'); setMedia([]) }}
                  className={`flex flex-col items-center gap-2.5 rounded-2xl border-2 px-3 py-4 text-center transition-all ${
                    postType === 'feed'
                      ? 'border-[#c62737] bg-[#c62737]/5'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                    postType === 'feed' ? 'bg-[#c62737]' : 'bg-slate-100'
                  }`}>
                    <Newspaper className={`h-5 w-5 ${postType === 'feed' ? 'text-white' : 'text-slate-500'}`} />
                  </span>
                  <div>
                    <p className={`text-xs font-semibold ${postType === 'feed' ? 'text-[#c62737]' : 'text-slate-700'}`}>
                      Feed
                    </p>
                    <p className="mt-0.5 text-[10px] text-slate-400 leading-snug">
                      Foto ou carrossel (até 10)
                    </p>
                  </div>
                  {postType === 'feed' && (
                    <CheckCircle2 className="h-4 w-4 text-[#c62737]" />
                  )}
                </button>

                {/* Reel */}
                <button
                  type="button"
                  onClick={() => { setPostType('reel'); setMedia([]) }}
                  className={`flex flex-col items-center gap-2.5 rounded-2xl border-2 px-3 py-4 text-center transition-all ${
                    postType === 'reel'
                      ? 'border-[#c62737] bg-[#c62737]/5'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                    postType === 'reel' ? 'bg-[#c62737]' : 'bg-slate-100'
                  }`}>
                    <Film className={`h-5 w-5 ${postType === 'reel' ? 'text-white' : 'text-slate-500'}`} />
                  </span>
                  <div>
                    <p className={`text-xs font-semibold ${postType === 'reel' ? 'text-[#c62737]' : 'text-slate-700'}`}>
                      Reel
                    </p>
                    <p className="mt-0.5 text-[10px] text-slate-400 leading-snug">
                      Vídeo 9:16 · até 15 min
                    </p>
                  </div>
                  {postType === 'reel' && (
                    <CheckCircle2 className="h-4 w-4 text-[#c62737]" />
                  )}
                </button>

                {/* Story */}
                <button
                  type="button"
                  onClick={() => { setPostType('story'); setMedia([]) }}
                  className={`flex flex-col items-center gap-2.5 rounded-2xl border-2 px-3 py-4 text-center transition-all ${
                    postType === 'story'
                      ? 'border-[#c62737] bg-[#c62737]/5'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                    postType === 'story' ? 'bg-[#c62737]' : 'bg-slate-100'
                  }`}>
                    <PlayCircle className={`h-5 w-5 ${postType === 'story' ? 'text-white' : 'text-slate-500'}`} />
                  </span>
                  <div>
                    <p className={`text-xs font-semibold ${postType === 'story' ? 'text-[#c62737]' : 'text-slate-700'}`}>
                      Story
                    </p>
                    <p className="mt-0.5 text-[10px] text-slate-400 leading-snug">
                      Imagem ou vídeo 9:16
                    </p>
                  </div>
                  {postType === 'story' && (
                    <CheckCircle2 className="h-4 w-4 text-[#c62737]" />
                  )}
                </button>
              </div>

              {/* Avisos por tipo */}
              {postType === 'reel' && (
                <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-800">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>Reel:</strong> envie 1 vídeo MP4 (9:16 recomendado, máx. 15 min, áudio não silenciado). Instagram só publica no feed quando <em>share_to_feed=true</em>.
                  </span>
                </div>
              )}
              {postType === 'story' && (
                <div className="mt-3 flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2.5 text-xs text-blue-800">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>Story:</strong> envie 1 imagem ou vídeo (9:16 recomendado). Stories desaparecem em 24 h e não têm legenda pública.
                  </span>
                </div>
              )}
              {postType === 'story' && destinations.facebook && (
                <div className="mt-2 flex items-start gap-2 rounded-xl border border-orange-200 bg-orange-50 px-3.5 py-2.5 text-xs text-orange-800">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>Stories serão publicados apenas no <strong>Instagram</strong>. Facebook Stories usam uma API diferente (não suportada neste fluxo).</span>
                </div>
              )}
            </div>
          </div>

          {/* ┌── Card 2: Perfil & Canais ────────────────────────────┐ */}
          {/* Sem overflow-hidden no wrapper: contém CustomSelect com painel absoluto */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/60 px-5 py-3.5 rounded-t-2xl">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#c62737] text-[11px] font-bold text-white flex-shrink-0">
                2
              </span>
              <h2 className="text-sm font-semibold text-slate-800">
                Perfil e canais
              </h2>
            </div>
            <div className="px-5 py-4 space-y-4">
              {/* Seletor de conta */}
              {loadingInstances ? (
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" /> Carregando contas…
                </div>
              ) : instances.length === 0 ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Nenhuma conta conectada.{' '}
                  <a
                    href="/admin/instancias"
                    className="font-semibold underline hover:text-amber-900"
                  >
                    Conectar conta
                  </a>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Conta de destino
                  </label>
                  <CustomSelect
                    value={selectedInstanceId}
                    onChange={(v) => setSelectedInstanceId(v)}
                    placeholder="Selecione um perfil…"
                    options={instances.map((inst) => ({
                      value: inst.id,
                      label: inst.name,
                    }))}
                  />
                </div>
              )}

              {/* Canais */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-2">
                  Publicar em
                </label>
                <div className="flex flex-wrap gap-2">
                  {/* Instagram */}
                  <button
                    type="button"
                    disabled={
                      !selectedInstance ||
                      selectedInstance.has_instagram === false
                    }
                    onClick={() =>
                      setDestinations((p) => {
                        const n = { ...p, instagram: !p.instagram }
                        return !n.instagram && !n.facebook ? p : n
                      })
                    }
                    className={`group flex items-center gap-2.5 rounded-xl border-2 px-4 py-2.5 text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                      destinations.instagram
                        ? 'border-[#c62737] bg-gradient-to-r from-[#f09433]/10 to-[#c62737]/10 text-[#c62737]'
                        : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-lg transition-colors ${
                        destinations.instagram
                          ? 'bg-gradient-to-br from-[#f09433] via-[#e6683c] to-[#c62737]'
                          : 'bg-slate-100 group-hover:bg-slate-200'
                      }`}
                    >
                      <Instagram
                        className={`h-3.5 w-3.5 ${
                          destinations.instagram ? 'text-white' : 'text-slate-600'
                        }`}
                      />
                    </span>
                    Instagram
                    {destinations.instagram && (
                      <CheckCircle2 className="ml-auto h-4 w-4 text-[#c62737]" />
                    )}
                  </button>

                  {/* Facebook */}
                  <button
                    type="button"
                    disabled={
                      !selectedInstance || selectedInstance.has_facebook === false
                    }
                    onClick={() =>
                      setDestinations((p) => {
                        const n = { ...p, facebook: !p.facebook }
                        return !n.instagram && !n.facebook ? p : n
                      })
                    }
                    className={`group flex items-center gap-2.5 rounded-xl border-2 px-4 py-2.5 text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                      destinations.facebook
                        ? 'border-[#1877f2] bg-[#1877f2]/5 text-[#1877f2]'
                        : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-lg transition-colors ${
                        destinations.facebook
                          ? 'bg-[#1877f2]'
                          : 'bg-slate-100 group-hover:bg-slate-200'
                      }`}
                    >
                      <Facebook
                        className={`h-3.5 w-3.5 ${
                          destinations.facebook ? 'text-white' : 'text-slate-600'
                        }`}
                      />
                    </span>
                    Facebook
                    {destinations.facebook && (
                      <CheckCircle2 className="ml-auto h-4 w-4 text-[#1877f2]" />
                    )}
                  </button>
                </div>
                {selectedInstance?.has_facebook === false && (
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-600">
                    <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                    Conta sem página do Facebook vinculada.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ┌── Card 2: Mídias ─────────────────────────────────────┐ */}
          {/* Sem overflow-hidden: overlay de ações usa position:absolute */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/60 px-5 py-3.5 rounded-t-2xl">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#c62737] text-[11px] font-bold text-white flex-shrink-0">
                3
              </span>
              <h2 className="text-sm font-semibold text-slate-800">{postType === 'reel' ? 'Vídeo do Reel' : postType === 'story' ? 'Mídia do Story' : 'Mídias'}</h2>
              {media.length > 0 && (
                <span
                  className={`ml-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                    igLimitHit || reelStoryLimitHit
                      ? 'bg-red-100 text-red-700'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {media.length}/{maxMedia}
                </span>
              )}
              {/* Tabs Upload / Galeria — Galeria oculta para reels */}
              <div className="ml-auto flex overflow-hidden rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => setMediaTab('upload')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                    mediaTab === 'upload'
                      ? 'bg-[#c62737] text-white'
                      : 'bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {postType === 'reel' ? <Film className="h-3 w-3" /> : <Upload className="h-3 w-3" />}
                  {postType === 'reel' ? 'Vídeo' : 'Upload'}
                </button>
                {postType === 'feed' && (
                  <button
                    type="button"
                    onClick={() => setMediaTab('gallery')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                      mediaTab === 'gallery'
                        ? 'bg-[#c62737] text-white'
                        : 'bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <FolderOpen className="h-3 w-3" /> Galeria
                  </button>
                )}
              </div>
            </div>
            <div className="px-5 py-4">
              {/* Grid de mídias selecionadas */}
              {media.length > 0 && (
                <div className="mb-4 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                  {media.map((item, idx) => (
                    <div key={item.id} className="group flex flex-col gap-1">
                      {/* Thumbnail */}
                      <div className="relative aspect-square">
                        <div
                          className={`h-full w-full overflow-hidden rounded-xl border-2 bg-slate-100 transition-all ${
                            item.type === 'gallery'
                              ? 'border-blue-200'
                              : isVideoItem(item)
                              ? 'border-violet-200'
                              : 'border-slate-200'
                          }`}
                        >
                          {isVideoItem(item) ? (
                            <video
                              src={mediaThumb(item)}
                              className="h-full w-full object-cover"
                              muted
                              preload="metadata"
                            />
                          ) : (
                            <img
                              src={mediaThumb(item)}
                              alt={`Mídia ${idx + 1}`}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          )}
                        </div>
                        {/* Badge de ordem */}
                        <span
                          className={`absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded-md text-[10px] font-bold text-white shadow ${
                            item.type === 'gallery'
                              ? 'bg-blue-500'
                              : isVideoItem(item)
                              ? 'bg-violet-500'
                              : 'bg-slate-800/80'
                          }`}
                        >
                          {idx + 1}
                        </span>
                        {/* Badge de fonte */}
                        {item.type === 'gallery' && (
                          <span
                            className="absolute bottom-1 right-1 rounded-md bg-blue-500/80 p-0.5 text-white backdrop-blur-sm"
                            title="Da galeria"
                          >
                            <FolderOpen className="h-2.5 w-2.5" />
                          </span>
                        )}
                        {isVideoItem(item) && (
                          <span
                            className="absolute bottom-1 right-1 rounded-md bg-violet-500/80 p-0.5 text-white backdrop-blur-sm"
                            title="Vídeo"
                          >
                            <Film className="h-2.5 w-2.5" />
                          </span>
                        )}
                        {/* Ações ao hover — somente desktop (sm+) */}
                        <div className="absolute inset-0 hidden sm:flex flex-col items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 rounded-xl">
                          <div className="flex gap-1">
                            {!isVideoItem(item) && (
                              <button
                                type="button"
                                onClick={() => setCropItem(item)}
                                className="flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-slate-700 hover:bg-white shadow transition-colors"
                                title="Editar proporção"
                              >
                                <Crop className="h-3 w-3" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => removeMedia(item.id)}
                              className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600 shadow transition-colors"
                              title="Remover"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                          <div className="flex gap-1">
                            {idx > 0 && (
                              <button
                                type="button"
                                onClick={() => moveMedia(item.id, 'left')}
                                className="flex h-5 w-5 items-center justify-center rounded-full bg-white/90 text-slate-700 hover:bg-white shadow transition-colors"
                                title="Mover para esquerda"
                              >
                                <ChevronLeft className="h-3 w-3" />
                              </button>
                            )}
                            {idx < media.length - 1 && (
                              <button
                                type="button"
                                onClick={() => moveMedia(item.id, 'right')}
                                className="flex h-5 w-5 items-center justify-center rounded-full bg-white/90 text-slate-700 hover:bg-white shadow transition-colors"
                                title="Mover para direita"
                              >
                                <ChevronRight className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                      {/* Controles sempre visíveis no mobile */}
                      <div className="flex sm:hidden items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => idx > 0 && moveMedia(item.id, 'left')}
                          disabled={idx === 0}
                          className="flex flex-1 items-center justify-center rounded-lg bg-slate-100 py-1 hover:bg-slate-200 disabled:opacity-25 transition-colors"
                          title="Mover para esquerda"
                        >
                          <ChevronLeft className="h-3.5 w-3.5 text-slate-600" />
                        </button>
                        {!isVideoItem(item) && (
                          <button
                            type="button"
                            onClick={() => setCropItem(item)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors"
                            title="Editar proporção"
                          >
                            <Crop className="h-3 w-3 text-slate-600" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => removeMedia(item.id)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 hover:bg-red-100 transition-colors"
                          title="Remover"
                        >
                          <X className="h-3 w-3 text-red-500" />
                        </button>
                        <button
                          type="button"
                          onClick={() => idx < media.length - 1 && moveMedia(item.id, 'right')}
                          disabled={idx >= media.length - 1}
                          className="flex flex-1 items-center justify-center rounded-lg bg-slate-100 py-1 hover:bg-slate-200 disabled:opacity-25 transition-colors"
                          title="Mover para direita"
                        >
                          <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Slot "adicionar mais" */}
                  {media.length < maxMedia && mediaTab === 'upload' && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="aspect-square flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-[#c62737] hover:text-[#c62737] transition-colors"
                    >
                      {postType === 'reel' ? <Film className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
                      <span className="text-[10px] font-medium">{postType === 'reel' ? 'Vídeo' : 'Adicionar'}</span>
                    </button>
                  )}
                  {media.length < maxMedia && mediaTab === 'gallery' && (
                    <button
                      type="button"
                      onClick={() => setGalleryOpen(true)}
                      className="aspect-square flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-blue-200 text-blue-400 hover:border-blue-400 hover:text-blue-600 transition-colors"
                    >
                      <FolderOpen className="h-4 w-4" />
                      <span className="text-[10px] font-medium">Galeria</span>
                    </button>
                  )}
                </div>
              )}

              {/* ── Seletor de capa para Reel ─────────────────────────────── */}
              {postType === 'reel' && media.length > 0 && isVideoItem(media[0]) && (
                <div className="mb-4 rounded-xl border border-violet-100 bg-violet-50/40 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <ImageIcon className="h-4 w-4 text-violet-600" />
                    <h3 className="text-sm font-semibold text-slate-800">Capa do Reel</h3>
                    <span className="ml-auto rounded-lg bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700 tabular-nums">
                      {formatOffsetTime(reelThumbOffsetMs)}
                    </span>
                  </div>
                  <div className="flex gap-4 items-start">
                    {/* Preview do frame selecionado */}
                    <div className="relative flex-shrink-0 w-16 rounded-lg overflow-hidden bg-slate-900" style={{ aspectRatio: '9/16' }}>
                      <video
                        ref={reelVideoRef}
                        src={(media[0] as { type: 'upload'; dataUrl: string }).dataUrl}
                        className="h-full w-full object-cover"
                        muted
                        playsInline
                        preload="metadata"
                        onLoadedMetadata={(e) => {
                          const v = e.currentTarget
                          setReelVideoDurationMs(Math.floor(v.duration * 1000))
                          v.currentTime = reelThumbOffsetMs / 1000
                        }}
                      />
                    </div>
                    {/* Slider e instruções */}
                    <div className="flex-1 flex flex-col gap-2 pt-1">
                      <p className="text-xs text-slate-500">
                        Arraste para escolher o frame que será exibido como capa do Reel no Instagram.
                      </p>
                      <input
                        type="range"
                        min={0}
                        max={Math.max(reelVideoDurationMs, 1000)}
                        step={500}
                        value={reelThumbOffsetMs}
                        onChange={(e) => {
                          const val = Number(e.target.value)
                          setReelThumbOffsetMs(val)
                          const v = reelVideoRef.current
                          if (v) {
                            v.currentTime = val / 1000
                            v.pause()
                          }
                        }}
                        className="w-full accent-[#c62737] cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-slate-400 tabular-nums">
                        <span>0:00</span>
                        <span>{formatOffsetTime(reelVideoDurationMs)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Zona de drop — upload vazio */}
              {mediaTab === 'upload' && media.length === 0 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={async (e) => {
                    e.preventDefault()
                    await handleFilesSelected(e.dataTransfer.files)
                  }}
                  className="group w-full cursor-pointer rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 py-12 text-center transition-all hover:border-[#c62737] hover:bg-[#c62737]/5"
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 group-hover:bg-[#c62737]/10 transition-colors">
                      {postType === 'reel' ? (
                        <Film className="h-6 w-6 text-slate-400 group-hover:text-[#c62737] transition-colors" />
                      ) : (
                        <Upload className="h-6 w-6 text-slate-400 group-hover:text-[#c62737] transition-colors" />
                      )}
                    </div>
                    <div>
                      {postType === 'reel' ? (
                        <>
                          <p className="text-sm font-semibold text-slate-600 group-hover:text-[#c62737] transition-colors">
                            Selecione o vídeo do Reel
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            MP4 · 9:16 recomendado · máx. 15 minutos
                          </p>
                        </>
                      ) : postType === 'story' ? (
                        <>
                          <p className="text-sm font-semibold text-slate-600 group-hover:text-[#c62737] transition-colors">
                            Selecione imagem ou vídeo do Story
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            PNG, JPG, MP4 · 9:16 recomendado
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-semibold text-slate-600 group-hover:text-[#c62737] transition-colors">
                            Solte as imagens aqui ou clique para selecionar
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            PNG, JPG, WEBP · até 10 imagens
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </button>
              )}

              {/* Zona galeria — vazio */}
              {mediaTab === 'gallery' && media.length === 0 && (
                <div className="w-full rounded-2xl border-2 border-dashed border-blue-100 bg-blue-50/50 py-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100">
                      <FolderOpen className="h-6 w-6 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-600">
                        Selecione fotos de um álbum
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        Navegue pelos álbuns e escolha as fotos
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setGalleryOpen(true)}
                      className="mt-1 rounded-xl bg-blue-500 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-600 transition-colors"
                    >
                      Abrir galeria
                    </button>
                  </div>
                </div>
              )}

              {/* Input file oculto */}
              <input
                ref={fileInputRef}
                type="file"
                accept={
                  postType === 'reel'
                    ? 'video/mp4,video/quicktime,video/*'
                    : postType === 'story'
                    ? 'image/*,video/mp4,video/quicktime,video/*'
                    : 'image/*'
                }
                multiple={postType === 'feed'}
                className="hidden"
                onChange={(e) => handleFilesSelected(e.target.files)}
              />

              {/* Legenda de fontes */}
              {media.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-2.5 w-2.5 rounded bg-slate-700/70" />
                    Upload local
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-2.5 w-2.5 rounded bg-blue-500" />
                    Da galeria
                  </span>
                  <span className="ml-auto font-medium text-slate-500 hidden sm:inline">
                    Passe o mouse sobre a imagem para reordenar
                  </span>
                  <span className="ml-auto font-medium text-slate-500 sm:hidden">
                    Use ↔ abaixo de cada foto para reordenar
                  </span>
                </div>
              )}

              {igLimitHit && (
                <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  O Instagram aceita no máximo 10 imagens por post de feed.
                </p>
              )}
              {reelStoryLimitHit && (
                <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {postType === 'reel' ? 'Reels' : 'Stories'} aceitam apenas 1 mídia. Remova o excedente.
                </p>
              )}
            </div>
          </div>

          {/* ┌── Card 4: Legenda ────────────────────────────────────┐ */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/60 px-5 py-3.5 rounded-t-2xl">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#c62737] text-[11px] font-bold text-white flex-shrink-0">
                4
              </span>
              <h2 className="text-sm font-semibold text-slate-800">{postType === 'story' ? 'Legenda (opcional)' : 'Legenda'}</h2>
              <span
                className={`ml-auto text-xs tabular-nums font-medium ${
                  charCount > 2000 ? 'text-red-500' : 'text-slate-400'
                }`}
              >
                {charCount}/2200
              </span>
              <button
                type="button"
                onClick={() => setAiModalOpen(true)}
                className="flex items-center gap-1.5 rounded-xl border border-violet-200 bg-gradient-to-r from-violet-50 to-purple-50 px-3 py-1.5 text-xs font-semibold text-violet-700 hover:from-violet-100 hover:to-purple-100 transition-all shadow-sm"
              >
                <Sparkles className="h-3 w-3" />
                Gerar com IA
              </button>
            </div>
            <div className="px-5 py-4">
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={postType === 'story' ? 'Stories não exibem legenda publicamente (para anotação interna)…' : 'Digite a legenda do seu post… ✨'}
                rows={5}
                maxLength={2200}
                className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50/40 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-[#c62737] focus:ring-2 focus:ring-[#c62737]/20 focus:bg-white hover:border-slate-300"
              />
              {postType === 'story' && (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
                  <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                  Stories do Instagram não exibem legenda publicamente. Este campo é ignorado na publicação.
                </p>
              )}
              {/* Barra de emojis */}
              <div className="mt-2.5 flex flex-wrap items-center gap-1">
                {QUICK_EMOJIS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => insertEmoji(e)}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm leading-none hover:bg-slate-50 hover:border-slate-300 transition-colors"
                    title={e}
                  >
                    {e}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => insertEmoji(' #')}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors"
                  title="Inserir hashtag"
                >
                  #
                </button>
                {text && (
                  <span className="ml-auto text-xs text-slate-400">
                    {(text.match(/#\w/g) ?? []).length} hashtag(s)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ┌── Card 5: Agendamento ────────────────────────────────┐ */}
          {/* Sem overflow-hidden: contém DatePickerInput com calendário position:absolute */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/60 px-5 py-3.5 rounded-t-2xl">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#c62737] text-[11px] font-bold text-white flex-shrink-0">
                5
              </span>
              <h2 className="text-sm font-semibold text-slate-800">
                Quando publicar
              </h2>
            </div>
            <div className="px-5 py-4">
              <div className="flex overflow-hidden rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setPublishMode('now')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors ${
                    publishMode === 'now'
                      ? 'bg-[#c62737] text-white'
                      : 'bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Send className="h-4 w-4" />
                  Publicar agora
                </button>
                <button
                  type="button"
                  onClick={() => setPublishMode('scheduled')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors ${
                    publishMode === 'scheduled'
                      ? 'bg-[#c62737] text-white'
                      : 'bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <CalendarClock className="h-4 w-4" />
                  Agendar
                </button>
              </div>

              {publishMode === 'scheduled' && (
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Data
                    </label>
                    <DatePickerInput
                      value={scheduledDate}
                      onChange={setScheduledDate}
                      placeholder="dd/mm/aaaa"
                      minDate={new Date()}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Horário
                    </label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        type="time"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-800 outline-none transition focus:border-[#c62737] focus:ring-2 focus:ring-[#c62737]/20 hover:border-slate-300"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Resultado em mobile */}
          {notice && (
            <div
              className={`rounded-2xl border px-4 py-3 xl:hidden ${
                notice.ok
                  ? 'border-green-200 bg-green-50'
                  : 'border-amber-200 bg-amber-50'
              }`}
            >
              <p
                className={`text-sm font-semibold ${
                  notice.ok ? 'text-green-800' : 'text-amber-800'
                }`}
              >
                {notice.ok ? '✓' : '⚠'} {notice.text.split('\n')[0]}
              </p>
              {notice.text
                .split('\n')
                .slice(1)
                .map((e, i) => (
                  <p key={i} className="mt-1 text-xs text-amber-700">
                    {e}
                  </p>
                ))}
            </div>
          )}
        </div>

        {/* ═══════════ DIREITA – PREVIEW ════════════════════════════ */}
        <div className="hidden xl:block">
          <div className="sticky top-6 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <LayoutGrid className="h-3.5 w-3.5" /> Prévia
              </p>
              {media.length > 0 && (
                <span className="text-xs text-slate-400">
                  {media.length}{' '}
                  {postType === 'reel' ? 'vídeo' : postType === 'story' ? 'mídia' : media.length === 1 ? 'imagem' : 'imagens'}
                </span>
              )}
            </div>

            {/* Preview de Reel/Story (formato vertical 9:16) */}
            {(postType === 'reel' || postType === 'story') && media.length > 0 ? (
              <div className="mx-auto w-full max-w-[200px]">
                <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-black shadow-sm" style={{ aspectRatio: '9/16' }}>
                  {isVideoItem(media[0]) ? (
                    <video
                      src={mediaThumb(media[0])}
                      className="h-full w-full object-cover"
                      muted
                      autoPlay
                      loop
                      playsInline
                    />
                  ) : (
                    <img
                      src={mediaThumb(media[0])}
                      alt="preview"
                      className="h-full w-full object-cover"
                    />
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-3 py-3">
                    <p className="text-[10px] font-semibold text-white/90">
                      {postType === 'reel' ? '▶ Reel' : '⊕ Story'}
                    </p>
                    {text && postType === 'reel' && (
                      <p className="mt-0.5 text-[9px] text-white/70 line-clamp-2">{text}</p>
                    )}
                  </div>
                </div>
                <p className="mt-2 text-center text-[10px] text-slate-400">
                  Prévia {postType === 'reel' ? 'Reel' : 'Story'} (9:16)
                </p>
              </div>
            ) : (destinations.instagram || destinations.facebook) ? (
              <PreviewTabs
                showInstagram={destinations.instagram}
                showFacebook={destinations.facebook}
                pageName={pageName}
                text={text}
                media={media}
              />
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center">
                <Layers className="h-8 w-8 text-slate-300" />
                <p className="text-sm text-slate-400">
                  Selecione um canal
                  <br />
                  para ver a prévia
                </p>
              </div>
            )}

            {/* Resultado desktop */}
            {notice && (
              <div
                className={`rounded-2xl border px-4 py-3 ${
                  notice.ok
                    ? 'border-green-200 bg-green-50'
                    : 'border-amber-200 bg-amber-50'
                }`}
              >
                <p
                  className={`text-sm font-semibold ${
                    notice.ok ? 'text-green-800' : 'text-amber-800'
                  }`}
                >
                  {notice.ok ? '✓' : '⚠'} {notice.text.split('\n')[0]}
                </p>
                {notice.text
                  .split('\n')
                  .slice(1)
                  .map((e, i) => (
                    <p key={i} className="mt-1 text-xs text-amber-700">
                      {e}
                    </p>
                  ))}
              </div>
            )}

            {/* Checklist rápido */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                Checklist
              </p>
              {[
                { ok: !!selectedInstanceId, label: 'Perfil selecionado' },
                {
                  ok: destinations.instagram || destinations.facebook,
                  label: 'Canal escolhido',
                },
                {
                  ok: media.length > 0 && !igLimitHit && !reelStoryLimitHit,
                  label: postType === 'reel'
                    ? 'Vídeo do Reel adicionado'
                    : postType === 'story'
                    ? 'Mídia do Story adicionada'
                    : 'Imagem(ns) adicionada(s)',
                },
                ...(postType === 'reel'
                  ? [{
                      ok: media.some((m) => isVideoItem(m)),
                      label: 'Arquivo de vídeo selecionado',
                    }]
                  : []),
                ...(postType !== 'story'
                  ? [{ ok: text.length > 0, label: 'Legenda escrita' }]
                  : []),
                {
                  ok:
                    publishMode === 'now' ||
                    (!!scheduledDate && !!scheduledTime),
                  label: 'Horário definido',
                },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <div
                    className={`flex h-4 w-4 items-center justify-center rounded-full flex-shrink-0 transition-all ${
                      item.ok ? 'bg-green-500' : 'bg-slate-200'
                    }`}
                  >
                    {item.ok && (
                      <svg
                        width="8"
                        height="8"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="white"
                        strokeWidth="3.5"
                      >
                        <path d="M5 12l5 5L20 7" />
                      </svg>
                    )}
                  </div>
                  <span
                    className={`text-xs transition-colors ${
                      item.ok
                        ? 'text-slate-700 font-medium'
                        : 'text-slate-400'
                    }`}
                  >
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════ BARRA INFERIOR FIXA ══════════════════════════ */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur-sm px-4 py-3 shadow-lg md:left-[280px]">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <button
            type="button"
            onClick={resetForm}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Limpar tudo
          </button>

          <div className="flex items-center gap-3">
            {/* Status rápido */}
            <div className="hidden sm:flex items-center gap-3 text-xs text-slate-400 mr-1">
              {media.length > 0 && (
                <span className="flex items-center gap-1">
                  {postType === 'reel' ? <Film className="h-3.5 w-3.5" /> : <ImageIcon className="h-3.5 w-3.5" />}
                  {media.length}{' '}
                  {postType === 'reel' ? 'vídeo' : postType === 'story' ? 'mídia' : media.length === 1 ? 'imagem' : 'imagens'}
                </span>
              )}
              {postType !== 'feed' && (
                <span className="flex items-center gap-1 font-medium text-slate-500 capitalize">
                  {postType === 'reel' ? '🎬' : '⊕'} {postType}
                </span>
              )}
              {!!selectedInstanceId && (
                <span className="flex items-center gap-1 truncate max-w-[160px]">
                  {destinations.instagram && (
                    <Instagram className="h-3.5 w-3.5 text-[#c62737] flex-shrink-0" />
                  )}
                  {destinations.facebook && (
                    <Facebook className="h-3.5 w-3.5 text-[#1877f2] flex-shrink-0" />
                  )}
                  <span className="truncate">{selectedInstance?.name}</span>
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handlePublish}
              disabled={
                publishing ||
                loadingReplay ||
                !selectedInstanceId ||
                media.length === 0 ||
                igLimitHit ||
                reelStoryLimitHit
              }
              className="flex items-center gap-2 rounded-xl bg-[#c62737] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#9e1f2e] transition-colors disabled:cursor-not-allowed disabled:opacity-50 shadow-sm"
            >
              {publishing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : publishMode === 'now' ? (
                <Send className="h-4 w-4" />
              ) : (
                <CalendarDays className="h-4 w-4" />
              )}
              {publishing
                ? publishMode === 'scheduled'
                  ? 'Agendando…'
                  : 'Publicando…'
                : publishMode === 'scheduled'
                ? 'Agendar publicação'
                : 'Publicar agora'}
            </button>
          </div>
        </div>
      </div>

      {/* Modal IA */}
      <AiCaptionModal
        open={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        onApply={(caption) => setText(caption)}
        galleryAlbum={media.some((m) => m.type === 'gallery') ? lastGalleryAlbum : null}
        singleUploadImage={
          media.length === 1 && media[0].type === 'upload' ? media[0].dataUrl : null
        }
      />

      {/* Modal editor de imagem */}
      <ImageCropperModal
        item={cropItem}
        open={cropItem !== null}
        onClose={() => setCropItem(null)}
        onApply={handleCropApply}
      />

      {/* Modal galeria */}
      <GalleryPickerModal
        open={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        onConfirm={handleGalleryConfirm}
        alreadyCount={media.length}
      />

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((t) => ({ ...t, visible: false }))}
      />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
export default function NovaPostagemPage() {
  return (
    <PageAccessGuard pageKey="instagram">
      <NovaPostagemContent />
    </PageAccessGuard>
  )
}
