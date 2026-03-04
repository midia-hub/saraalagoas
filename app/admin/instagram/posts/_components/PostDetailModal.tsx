'use client'

import { useEffect } from 'react'
import {
  X,
  CheckCircle2,
  Clock,
  XCircle,
  CalendarClock,
  Image as ImageIcon,
  Instagram,
  ExternalLink,
  User,
  Calendar,
  Tag,
  Layers,
  FileText,
  Send,
} from 'lucide-react'
import type { LegacyPostItem } from './types'

// ─────────────────────────────────────────────
// Status config
// ─────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; icon: typeof Clock; className: string }> = {
  queued:     { label: 'Na fila',    icon: Clock,         className: 'bg-amber-100 text-amber-800 border-amber-200' },
  running:    { label: 'Publicando', icon: Clock,         className: 'bg-blue-100 text-blue-800 border-blue-200' },
  publishing: { label: 'Publicando', icon: Clock,         className: 'bg-blue-100 text-blue-800 border-blue-200' },
  published:  { label: 'Publicada',  icon: CheckCircle2,  className: 'bg-green-100 text-green-800 border-green-200' },
  failed:     { label: 'Falha',      icon: XCircle,       className: 'bg-red-100 text-red-800 border-red-200' },
  pending:    { label: 'Programada', icon: CalendarClock, className: 'bg-slate-100 text-slate-800 border-slate-200' },
}

function Row({ icon: Icon, label, children }: { icon: typeof Clock; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-slate-100 last:border-0">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-50 mt-0.5">
        <Icon className="h-3.5 w-3.5 text-slate-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-slate-500 mb-0.5">{label}</p>
        <div className="text-sm text-slate-800 break-words">{children}</div>
      </div>
    </div>
  )
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ─────────────────────────────────────────────
// Modal
// ─────────────────────────────────────────────
interface PostDetailModalProps {
  item: LegacyPostItem
  onClose: () => void
}

export function PostDetailModal({ item, onClose }: PostDetailModalProps) {
  const draft = item.instagram_post_drafts
  const gallery = draft?.galleries ?? (draft as { gallery?: { id: string; title: string; type: string; date: string } } | null)?.gallery
  const assets = draft?.instagram_post_assets
  const sorted = assets ? [...assets].sort((a, b) => a.sort_order - b.sort_order) : []
  const first = sorted[0]
  const thumbUrl = first?.final_url || first?.source_url
  const imageUrl = thumbUrl?.startsWith('drive:') ? null : (thumbUrl ?? null)

  const config = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.queued
  const Icon = config.icon

  const mediaId = item.result_payload?.mediaId
  const permalink = mediaId && !mediaId.startsWith('media_') ? `https://www.instagram.com/p/${mediaId}/` : null

  const user = item.created_by_user ?? draft?.created_by_user

  // Fechar com Esc
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Detalhes da publicação"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Painel */}
      <div className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl flex flex-col">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between gap-4 rounded-t-2xl border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4 sticky top-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#c62737]/10">
              <Instagram className="h-5 w-5 text-[#c62737]" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Detalhes da publicação</h2>
              <p className="text-xs text-slate-500 font-mono">#{item.id.slice(0, 8)}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="px-5 py-4 space-y-4">

          {/* Imagem + status */}
          <div className="flex gap-4 items-start">
            <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-100 border border-slate-200">
              {imageUrl ? (
                <img src={imageUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-slate-300">
                  <ImageIcon className="h-8 w-8" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0 space-y-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${config.className}`}>
                <Icon className="h-3.5 w-3.5" /> {config.label}
              </span>
              {sorted.length > 1 && (
                <p className="text-xs text-slate-500">{sorted.length} mídias no álbum</p>
              )}
              {permalink && (
                <a
                  href={permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[#c62737] hover:underline"
                >
                  <ExternalLink className="h-3 w-3" /> Ver no Instagram
                </a>
              )}
            </div>
          </div>

          {/* Informações */}
          <div className="rounded-xl border border-slate-200 bg-white px-4">

            {/* Usuário */}
            <Row icon={User} label="Publicado por">
              {user ? (
                <span>
                  <span className="font-medium">{user.full_name || '(sem nome)'}</span>{' '}
                  <span className="text-slate-500 text-xs">— {user.email}</span>
                </span>
              ) : (
                <span className="text-slate-400">Não identificado</span>
              )}
            </Row>

            {/* Conta */}
            <Row icon={Instagram} label="Conta">
              {item.instagram_instances?.name || <span className="text-slate-400">Sem conta</span>}
            </Row>

            {/* Galeria */}
            {gallery && (
              <Row icon={Tag} label="Galeria">
                <span className="font-medium">{gallery.title}</span>
                <span className="text-slate-500 text-xs ml-2">— {gallery.type} · {gallery.date}</span>
              </Row>
            )}

            {/* Caption */}
            {draft?.caption && (
              <Row icon={FileText} label="Legenda">
                <p className="whitespace-pre-wrap text-sm">{draft.caption}</p>
              </Row>
            )}

            {/* Modo de publicação */}
            {draft?.publish_mode && (
              <Row icon={Send} label="Modo de publicação">
                <span className="capitalize">{draft.publish_mode}</span>
              </Row>
            )}

            {/* Preset */}
            {draft?.preset && (
              <Row icon={Layers} label="Preset">
                {draft.preset}
              </Row>
            )}

            {/* Data de criação */}
            <Row icon={Calendar} label="Criado em">
              {formatDate(item.created_at)}
            </Row>

            {/* Data agendada */}
            {item.run_at && (
              <Row icon={CalendarClock} label="Agendado para">
                {formatDate(item.run_at)}
              </Row>
            )}

            {/* Data publicada */}
            {item.published_at && (
              <Row icon={CheckCircle2} label="Publicado em">
                {formatDate(item.published_at)}
              </Row>
            )}

            {/* ID do post no Instagram */}
            {mediaId && (
              <Row icon={Instagram} label="Media ID (Instagram)">
                <span className="font-mono text-xs break-all">{mediaId}</span>
              </Row>
            )}

            {/* Erro */}
            {item.error_message && (
              <Row icon={XCircle} label="Mensagem de erro">
                <span className="text-red-700">{item.error_message}</span>
              </Row>
            )}

          </div>
        </div>

        {/* Rodapé */}
        <div className="border-t border-slate-100 px-5 py-3 flex justify-end sticky bottom-0 bg-white rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
