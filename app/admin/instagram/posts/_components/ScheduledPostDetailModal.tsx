'use client'

import { useEffect, useState } from 'react'
import {
  X,
  Instagram,
  Facebook,
  Image as ImageIcon,
  CalendarClock,
  CheckCircle2,
  Clock,
  XCircle,
  User,
  Calendar,
  FileText,
  LayoutGrid,
  Film,
  Layers,
  Tag,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Hash,
  UsersRound,
  Dot,
} from 'lucide-react'
import type { ScheduledItem } from './types'

// ─────────────────────────────────────────────
// Configs
// ─────────────────────────────────────────────
const STATUS_CONFIG: Record<
  string,
  { label: string; icon: typeof Clock; pill: string; dot: string }
> = {
  pending:    { label: 'Programada',  icon: CalendarClock, pill: 'bg-amber-50 text-amber-700 border-amber-200',        dot: 'bg-amber-400' },
  publishing: { label: 'Publicando',  icon: Clock,         pill: 'bg-blue-50 text-blue-700 border-blue-200',          dot: 'bg-blue-400' },
  published:  { label: 'Publicada',   icon: CheckCircle2,  pill: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  failed:     { label: 'Falha',       icon: XCircle,       pill: 'bg-red-50 text-red-700 border-red-200',             dot: 'bg-red-500' },
}

const POST_TYPE_CONFIG: Record<string, { label: string; icon: typeof LayoutGrid; chip: string }> = {
  feed:  { label: 'Feed',  icon: LayoutGrid, chip: 'bg-slate-800 text-white' },
  reel:  { label: 'Reel',  icon: Film,       chip: 'bg-purple-600 text-white' },
  story: { label: 'Story', icon: Layers,     chip: 'bg-pink-600 text-white' },
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function buildMediaUrl(spec: { id?: string; url?: string }): string | null {
  if (spec.id) return `/api/gallery/image?fileId=${encodeURIComponent(spec.id)}&mode=thumb&size=800`
  if (typeof spec.url === 'string' && /^https?:\/\//i.test(spec.url)) return spec.url
  return null
}

function InfoRow({ icon: Icon, label, children }: { icon: typeof Clock; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0">
      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-100">
        <Icon className="h-3.5 w-3.5 text-slate-500" />
      </div>
      <div className="flex-1 min-w-0">
        <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">{label}</span>
        <div className="text-sm text-slate-800 break-words leading-snug">{children}</div>
      </div>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="h-px flex-1 bg-slate-100" />
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{children}</span>
      <span className="h-px flex-1 bg-slate-100" />
    </div>
  )
}

// ─────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────
interface ScheduledPostDetailModalProps {
  post: ScheduledItem
  integrations?: Array<{ value: string; label: string }>
  onClose: () => void
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────
export function ScheduledPostDetailModal({ post, integrations, onClose }: ScheduledPostDetailModalProps) {
  const [photoIndex, setPhotoIndex] = useState(0)

  const mediaSpecs = post.media_specs ?? []
  const mediaUrls = mediaSpecs.map((s) => buildMediaUrl(s)).filter((u): u is string => u !== null)
  const currentPhoto = mediaUrls[photoIndex] ?? null
  const hasMultiple = mediaUrls.length > 1

  const config = STATUS_CONFIG[post.status] ?? STATUS_CONFIG.pending

  const postTypeCfg = POST_TYPE_CONFIG[post.post_type ?? 'feed'] ?? POST_TYPE_CONFIG.feed
  const PostTypeIcon = postTypeCfg.icon

  const hasInstagram = post.destinations?.instagram !== false
  const hasFacebook = post.destinations?.facebook === true
  const isStoryOrReel = post.post_type === 'story' || post.post_type === 'reel'

  const accountLabels: string[] = (() => {
    if (!post.instance_ids || !integrations) return []
    return (Array.isArray(post.instance_ids) ? post.instance_ids : []).map((id) => {
      let cleanId = id
      if (id.includes(':')) cleanId = id.split(':').pop() || id
      const found = integrations.find((i) => i.value === cleanId || i.value === id)
      return found ? found.label : id.length > 20 ? id.slice(0, 20) + '…' : id
    })
  })()

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight' && hasMultiple) setPhotoIndex((i) => Math.min(i + 1, mediaUrls.length - 1))
      if (e.key === 'ArrowLeft' && hasMultiple) setPhotoIndex((i) => Math.max(i - 1, 0))
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, hasMultiple, mediaUrls.length])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Detalhes da publicação"
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />

      {/* Painel principal */}
      <div className="relative z-10 flex w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl max-h-[92vh]">

        {/* ── Cabeçalho ── */}
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-100 bg-white px-6 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#c62737]/10 to-pink-50">
              <Instagram className="h-5 w-5 text-[#c62737]" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-base font-bold text-slate-900 leading-tight">
                {post.galleries?.title ?? 'Publicação'}
              </h2>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${config.pill}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
                  {config.label}
                </span>
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${postTypeCfg.chip}`}>
                  <PostTypeIcon className="h-2.5 w-2.5" />
                  {postTypeCfg.label}
                </span>
                <span className="inline-flex items-center gap-0.5 text-[11px] font-mono text-slate-400">
                  <Hash className="h-2.5 w-2.5" />{post.id.slice(0, 8)}
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Corpo em duas colunas ── */}
        <div className="flex flex-1 flex-col overflow-hidden md:flex-row">

          {/* ── Coluna esquerda: Mídia ── */}
          <div className="flex shrink-0 flex-col gap-3 overflow-y-auto bg-slate-950 p-4 md:w-64 lg:w-72">
            {mediaUrls.length > 0 ? (
              <>
                {/* Imagem principal */}
                <div className="relative overflow-hidden rounded-xl bg-slate-900">
                  <img
                    key={currentPhoto}
                    src={currentPhoto!}
                    alt={`Foto ${photoIndex + 1}`}
                    className="w-full h-auto block"
                    style={{ maxHeight: isStoryOrReel ? 400 : 360, objectFit: 'contain' }}
                  />
                  {hasMultiple && (
                    <>
                      <button
                        type="button"
                        onClick={() => setPhotoIndex((i) => Math.max(i - 1, 0))}
                        disabled={photoIndex === 0}
                        className="absolute left-2 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition-opacity disabled:opacity-25 hover:bg-black/80"
                        aria-label="Foto anterior"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPhotoIndex((i) => Math.min(i + 1, mediaUrls.length - 1))}
                        disabled={photoIndex === mediaUrls.length - 1}
                        className="absolute right-2 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition-opacity disabled:opacity-25 hover:bg-black/80"
                        aria-label="Próxima foto"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                      <div className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
                        {photoIndex + 1}/{mediaUrls.length}
                      </div>
                    </>
                  )}
                </div>

                {/* Tira de miniaturas */}
                {hasMultiple && (
                  <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                    {mediaUrls.map((url, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setPhotoIndex(idx)}
                        className={`h-12 w-12 shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
                          idx === photoIndex
                            ? 'border-[#c62737] scale-105 shadow-md'
                            : 'border-white/10 opacity-50 hover:opacity-80'
                        }`}
                      >
                        <img src={url} alt="" className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="flex aspect-square items-center justify-center rounded-xl bg-slate-800">
                <div className="flex flex-col items-center gap-2 text-slate-600">
                  <ImageIcon className="h-10 w-10" />
                  <p className="text-xs">Sem imagens</p>
                </div>
              </div>
            )}

            {/* Canais — dentro da coluna escura */}
            <div className="rounded-xl bg-slate-900 px-3 py-3">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">Canais</p>
              <div className="flex flex-wrap gap-2">
                {hasInstagram && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-2.5 py-1.5 text-xs font-medium text-white">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400">
                      <Instagram className="h-2.5 w-2.5 text-white" />
                    </span>
                    Instagram
                  </span>
                )}
                {hasFacebook && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-2.5 py-1.5 text-xs font-medium text-white">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#1877F2]">
                      <Facebook className="h-2.5 w-2.5 text-white" />
                    </span>
                    Facebook
                  </span>
                )}
                {!hasInstagram && !hasFacebook && <span className="text-xs text-slate-500">—</span>}
              </div>
              {accountLabels.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {accountLabels.map((lbl, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
                      <UsersRound className="h-2.5 w-2.5" />
                      {lbl}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Coluna direita: Detalhes ── */}
          <div className="flex flex-1 flex-col overflow-y-auto px-6 py-5 space-y-5">

            {/* Erro em destaque */}
            {post.status === 'failed' && post.error_message && (
              <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                <div>
                  <p className="text-xs font-semibold text-red-700 mb-0.5">Erro na publicação</p>
                  <p className="text-xs text-red-600 leading-relaxed">{post.error_message}</p>
                </div>
              </div>
            )}

            {/* ── Publicação ── */}
            <div>
              <SectionTitle>Publicação</SectionTitle>
              <div className="rounded-xl border border-slate-100 bg-slate-50/50">
                <div className="divide-y divide-slate-100 px-4">
                  <InfoRow icon={CalendarClock} label={post.status === 'published' ? 'Publicada em' : 'Agendada para'}>
                    <span className="font-semibold text-slate-900">{formatDate(post.published_at || post.scheduled_at)}</span>
                  </InfoRow>
                  {post.galleries && (
                    <InfoRow icon={Tag} label="Galeria vinculada">
                      <span className="font-medium">{post.galleries.title}</span>
                      <span className="ml-1.5 inline-flex items-center gap-0.5 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                        {post.galleries.type}
                        <Dot className="h-2.5 w-2.5" />
                        {post.galleries.date}
                      </span>
                    </InfoRow>
                  )}
                </div>
              </div>
            </div>

            {/* ── Legenda ── */}
            <div>
              <SectionTitle>Legenda</SectionTitle>
              {post.caption ? (
                <div className="relative rounded-xl border border-slate-200 bg-white">
                  <div className="absolute left-0 top-0 bottom-0 w-0.5 rounded-l-xl bg-[#c62737]/30" />
                  <div className="flex items-start gap-3 px-4 py-3">
                    <FileText className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{post.caption}</p>
                  </div>
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-slate-200 px-4 py-3 text-sm text-slate-400 text-center">
                  Nenhuma legenda cadastrada
                </p>
              )}
            </div>

            {/* ── Informações internas ── */}
            <div>
              <SectionTitle>Informações internas</SectionTitle>
              <div className="rounded-xl border border-slate-100 bg-slate-50/50">
                <div className="divide-y divide-slate-100 px-4">

                  <InfoRow icon={User} label={post.status === 'published' ? 'Publicado por' : 'Programado por'}>
                    {post.created_by_user ? (
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#c62737]/10 text-[10px] font-bold text-[#c62737]">
                          {(post.created_by_user.full_name || post.created_by_user.email).slice(0, 1).toUpperCase()}
                        </span>
                        <div>
                          <p className="font-semibold text-slate-900 text-sm leading-none">{post.created_by_user.full_name || '(sem nome)'}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">{post.created_by_user.email}</p>
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-400">Não identificado</span>
                    )}
                  </InfoRow>

                  <InfoRow icon={Calendar} label="Registrado na plataforma">
                    <span className="font-medium">{formatDate(post.created_at)}</span>
                  </InfoRow>

                  {post.result_payload?.instagramMediaId && (
                    <InfoRow icon={Instagram} label="Media ID (Instagram)">
                      <span className="font-mono text-[11px] text-slate-500 break-all">{post.result_payload.instagramMediaId}</span>
                    </InfoRow>
                  )}

                  {post.result_payload?.facebookMediaId && (
                    <InfoRow icon={Facebook} label="Media ID (Facebook)">
                      <span className="font-mono text-[11px] text-slate-500 break-all">{post.result_payload.facebookMediaId}</span>
                    </InfoRow>
                  )}

                  <InfoRow icon={Hash} label="ID do registro">
                    <span className="font-mono text-[11px] text-slate-400">{post.id}</span>
                  </InfoRow>

                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ── Rodapé ── */}
        <div className="flex shrink-0 items-center justify-end border-t border-slate-100 bg-white px-6 py-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  )
}
