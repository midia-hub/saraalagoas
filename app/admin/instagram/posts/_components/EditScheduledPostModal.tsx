'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  X,
  Sparkles,
  Wand2,
  RefreshCw,
  Loader2,
  Calendar,
  Clock,
  Zap,
  CheckCircle2,
  FileText,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { adminFetchJson } from '@/lib/admin-client'
import { DatePickerInput } from '@/components/ui/DatePickerInput'
import type { ScheduledItem } from './types'

// ─────────────────────────────────────────────
// AI Tones (mirrors nova-postagem)
// ─────────────────────────────────────────────
const AI_TONES = [
  { value: 'inspirador',    label: 'Inspirador',    emoji: '✨' },
  { value: 'evangélístico', label: 'Evangélístico', emoji: '🙏' },
  { value: 'informativo',   label: 'Informativo',   emoji: '📌' },
  { value: 'comemorativo',  label: 'Comemorativo',  emoji: '🎉' },
  { value: 'reflexivo',     label: 'Reflexivo',     emoji: '📖' },
] as const

type AiTone = (typeof AI_TONES)[number]['value']

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function isoToDateLocal(iso: string): string {
  // YYYY-MM-DD
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return ''
    return d.toLocaleDateString('sv-SE') // returns YYYY-MM-DD
  } catch { return '' }
}

function isoToTimeLocal(iso: string): string {
  // HH:MM
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return ''
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  } catch { return '' }
}

function buildIso(dateStr: string, timeStr: string): string | null {
  if (!dateStr || !timeStr) return null
  const [y, m, d] = dateStr.split('-').map(Number)
  const [h, min] = timeStr.split(':').map(Number)
  if (!y || !m || !d) return null
  const dt = new Date(y, m - 1, d, h ?? 0, min ?? 0, 0)
  return isNaN(dt.getTime()) ? null : dt.toISOString()
}

// ─────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────
export type EditScheduledPostModalProps = {
  open: boolean
  post: ScheduledItem
  displayTitle?: string
  onClose: () => void
  onSaved: () => void
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────
export function EditScheduledPostModal({ open, post, displayTitle, onClose, onSaved }: EditScheduledPostModalProps) {
  /* ── Caption state ── */
  const [caption, setCaption] = useState(post.caption ?? '')

  /* ── Schedule state ── */
  const [publishNow, setPublishNow] = useState(false)
  const [dateStr, setDateStr] = useState(isoToDateLocal(post.scheduled_at))
  const [timeStr, setTimeStr] = useState(isoToTimeLocal(post.scheduled_at))

  /* ── Save state ── */
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  /* ── AI panel state ── */
  const [aiOpen, setAiOpen] = useState(false)
  const [aiContext, setAiContext] = useState('')
  const [aiTone, setAiTone] = useState<AiTone>('inspirador')
  const [aiPlatform, setAiPlatform] = useState<'instagram' | 'facebook' | 'ambos'>('instagram')
  const [aiHashtags, setAiHashtags] = useState(true)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState('')
  const [aiError, setAiError] = useState('')
  const [aiProvider, setAiProvider] = useState<'gemini' | 'openai' | null>(null)

  /* ── Reset when post changes or closes ── */
  useEffect(() => {
    if (!open) return
    setCaption(post.caption ?? '')
    setPublishNow(false)
    setDateStr(isoToDateLocal(post.scheduled_at))
    setTimeStr(isoToTimeLocal(post.scheduled_at))
    setSaveError('')
    // Reset AI panel
    setAiOpen(false)
    setAiResult('')
    setAiError('')
    setAiContext('')
    setAiProvider(null)
  }, [open, post])

  /* ── Keyboard ESC ── */
  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !saving) onClose()
    }
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [open, saving, onClose])

  /* ── AI: generate ── */
  async function generateCaption() {
    if (!aiContext.trim()) { setAiError('Descreva o contexto do post.'); return }
    setAiError('')
    setAiResult('')
    setAiLoading(true)
    try {
      const data = await adminFetchJson<{ caption?: string; error?: string; provider?: 'gemini' | 'openai' }>(
        '/api/midia/gerar-legenda',
        {
          method: 'POST',
          body: JSON.stringify({
            context: aiContext,
            tone: aiTone,
            platform: aiPlatform,
            hashtags: aiHashtags,
            maxChars: 500,
          }),
        }
      )
      if (data.error) throw new Error(data.error)
      setAiResult(data.caption ?? '')
      if (data.provider) setAiProvider(data.provider)
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'Erro ao conectar com a IA.')
    } finally {
      setAiLoading(false)
    }
  }

  function applyAiCaption() {
    if (!aiResult) return
    setCaption(aiResult)
    setAiOpen(false)
    setAiResult('')
  }

  /* ── Save ── */
  const handleSave = useCallback(async () => {
    setSaveError('')
    setSaving(true)

    try {
      const body: Record<string, unknown> = {}

      // Only send caption if it changed
      if (caption !== (post.caption ?? '')) {
        body.caption = caption
      }

      if (publishNow) {
        body.publish_now = true
      } else {
        const newIso = buildIso(dateStr, timeStr)
        if (!newIso) {
          setSaveError('Informe uma data e hora válidas.')
          setSaving(false)
          return
        }
        if (new Date(newIso).getTime() <= Date.now()) {
          setSaveError('A data e hora devem ser no futuro.')
          setSaving(false)
          return
        }
        // Only send if date changed
        const originalIso = post.scheduled_at
        if (newIso !== originalIso) {
          body.scheduled_at = newIso
        }
      }

      if (Object.keys(body).length === 0) {
        onClose()
        return
      }

      await adminFetchJson(`/api/social/scheduled/${post.id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      })

      // If "publish now", trigger the run-scheduled endpoint
      if (publishNow) {
        try {
          await adminFetchJson('/api/social/run-scheduled', { method: 'POST' })
        } catch { /* silently ignore — post is already scheduled for now */ }
      }

      onSaved()
      onClose()
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }, [caption, post, publishNow, dateStr, timeStr, onSaved, onClose])

  if (!open) return null

  const todayStr = new Date().toLocaleDateString('sv-SE')

  return (
    <div
      className="fixed inset-0 z-[150] flex items-end justify-center sm:items-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-modal-title"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={saving ? undefined : onClose}
        aria-hidden
      />

      {/* Card */}
      <div className="relative z-10 flex w-full max-w-xl flex-col rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl"
        style={{ maxHeight: '95dvh' }}>

        {/* ── Header ── */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#c62737]/10">
              <FileText className="h-4 w-4 text-[#c62737]" />
            </div>
            <div>
              <p id="edit-modal-title" className="text-sm font-semibold text-slate-900">
                Alterar programação
              </p>
              <p className="text-[11px] text-slate-400 truncate max-w-[260px]">
                {displayTitle ?? post.galleries?.title ?? 'Postagem'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={saving ? undefined : onClose}
            disabled={saving}
            aria-label="Fechar"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors disabled:pointer-events-none"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">

          {/* ══ Section 1: Caption (não exibida para Stories) ══ */}
          {post.post_type !== 'story' && (
            <div className="px-5 py-4 space-y-3">
            <div className="flex items-center justify-between">
              <label htmlFor="edit-caption" className="text-xs font-semibold text-slate-700">
                Legenda
              </label>
              <button
                type="button"
                onClick={() => setAiOpen((v) => !v)}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-semibold transition-all ${
                  aiOpen
                    ? 'border-violet-400 bg-violet-50 text-violet-700'
                    : 'border-violet-200 bg-violet-50/60 text-violet-600 hover:bg-violet-50 hover:border-violet-300'
                }`}
              >
                <Sparkles className="h-3 w-3" />
                Gerar com IA
                {aiOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
            </div>

            <textarea
              id="edit-caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={4}
              maxLength={2200}
              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#c62737] focus:ring-2 focus:ring-[#c62737]/20 hover:border-slate-300 transition"
              placeholder="Escreva ou gere uma legenda com IA…"
            />
            <p className="text-right text-[11px] text-slate-400">{caption.length}/2200</p>

            {/* ── Painel IA inline ── */}
            {aiOpen && (
              <div className="rounded-2xl border border-violet-200 bg-violet-50/40 p-4 space-y-3">

                {/* Header IA */}
                <div className="flex items-center gap-2 pb-1 border-b border-violet-100">
                  <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
                    <Sparkles className="h-3 w-3 text-white" />
                  </div>
                  <p className="text-xs font-semibold text-violet-900">Gerar legenda com IA</p>
                  <p className="ml-auto text-[10px] text-violet-400">
                    {aiProvider === 'gemini' ? 'Gemini 2.0 Flash' : aiProvider === 'openai' ? 'GPT-4o mini' : 'Gemini · GPT-4o'}
                  </p>
                </div>

                {/* Contexto */}
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                    Sobre o quê é este post? <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={aiContext}
                    onChange={(e) => setAiContext(e.target.value)}
                    rows={2}
                    maxLength={500}
                    placeholder="Ex: Culto de domingo com tema 'A fé que move montes', convite para toda a igreja…"
                    className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 placeholder:text-slate-400 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 transition"
                  />
                </div>

                {/* Tom */}
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-slate-600">Tom</label>
                  <div className="flex flex-wrap gap-1.5">
                    {AI_TONES.map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setAiTone(t.value as AiTone)}
                        className={`flex items-center gap-1 rounded-xl border px-2 py-1 text-[11px] font-medium transition-all ${
                          aiTone === t.value
                            ? 'border-violet-500 bg-violet-100 text-violet-700'
                            : 'border-slate-200 text-slate-600 hover:border-slate-300 bg-white'
                        }`}
                      >
                        {t.emoji} {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Plataforma + hashtags */}
                <div className="flex flex-wrap items-end gap-4">
                  <div className="flex-1 min-w-[130px]">
                    <label className="mb-1 block text-[11px] font-semibold text-slate-600">Plataforma</label>
                    <div className="flex rounded-xl border border-slate-200 overflow-hidden bg-white">
                      {(['instagram', 'facebook', 'ambos'] as const).map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setAiPlatform(p)}
                          className={`flex-1 py-1.5 text-[11px] font-medium transition-colors ${
                            aiPlatform === p ? 'bg-violet-500 text-white' : 'text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {p === 'ambos' ? 'Ambos' : p.charAt(0).toUpperCase() + p.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-end pb-0.5">
                    <label className="flex cursor-pointer items-center gap-2 text-[11px] font-medium text-slate-600 select-none">
                      <div
                        onClick={() => setAiHashtags((v) => !v)}
                        className={`relative h-4 w-7 rounded-full transition-colors ${aiHashtags ? 'bg-violet-500' : 'bg-slate-200'}`}
                      >
                        <div className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform ${aiHashtags ? 'left-3.5' : 'left-0.5'}`} />
                      </div>
                      Hashtags
                    </label>
                  </div>
                </div>

                {/* Resultado */}
                {(aiResult || aiLoading || aiError) && (
                  <div className={`rounded-xl border p-3 text-xs ${
                    aiError
                      ? 'border-red-200 bg-red-50 text-red-700'
                      : 'border-violet-100 bg-white text-slate-800'
                  }`}>
                    {aiLoading ? (
                      <div className="flex items-center gap-2 text-violet-600">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Gerando legenda…</span>
                      </div>
                    ) : aiError ? (
                      <p>{aiError}</p>
                    ) : (
                      <>
                        <p className="whitespace-pre-wrap leading-relaxed">{aiResult}</p>
                        <p className="mt-1.5 text-right text-[10px] text-slate-400">{aiResult.length} caracteres</p>
                      </>
                    )}
                  </div>
                )}

                {/* Ações IA */}
                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={generateCaption}
                    disabled={aiLoading}
                    className="flex items-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700 hover:bg-violet-100 disabled:opacity-50 transition-colors"
                  >
                    {aiLoading
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : aiResult ? <RefreshCw className="h-3.5 w-3.5" /> : <Wand2 className="h-3.5 w-3.5" />}
                    {aiLoading ? 'Gerando…' : aiResult ? 'Gerar novamente' : 'Gerar legenda'}
                  </button>
                  {aiResult && (
                    <button
                      type="button"
                      onClick={applyAiCaption}
                      className="flex items-center gap-1.5 rounded-xl bg-[#c62737] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#9e1f2e] transition-colors"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Usar esta legenda
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
          )}

          {/* ══ Section 2: Schedule ══ */}
          <div className="px-5 py-4 space-y-3">
            <p className="text-xs font-semibold text-slate-700">Agendamento</p>

            {/* Toggle: Postar agora vs Programar */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPublishNow(false)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-all ${
                  !publishNow
                    ? 'border-[#c62737] bg-[#c62737]/5 text-[#c62737]'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Calendar className="h-3.5 w-3.5" />
                Programar data
              </button>
              <button
                type="button"
                onClick={() => setPublishNow(true)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-all ${
                  publishNow
                    ? 'border-amber-500 bg-amber-50 text-amber-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Zap className="h-3.5 w-3.5" />
                Postar agora
              </button>
            </div>

            {/* Programar: date + time */}
            {!publishNow && (
              <div className="flex gap-3">
                <div className="flex-1">
                  <label htmlFor="edit-date" className="mb-1 block text-[11px] font-semibold text-slate-600">
                    Data
                  </label>
                  <DatePickerInput
                    id="edit-date"
                    value={dateStr}
                    minDate={new Date(todayStr + 'T00:00:00')}
                    onChange={setDateStr}
                    placeholder="Selecione a data"
                    inputClassName="py-2 pl-9 bg-white"
                  />
                </div>
                <div className="w-[130px]">
                  <label htmlFor="edit-time" className="mb-1 block text-[11px] font-semibold text-slate-600">
                    Hora
                  </label>
                  <div className="relative">
                    <Clock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      id="edit-time"
                      type="time"
                      value={timeStr}
                      onChange={(e) => setTimeStr(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-800 outline-none focus:border-[#c62737] focus:ring-2 focus:ring-[#c62737]/20 hover:border-slate-300 transition"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Postar agora: aviso */}
            {publishNow && (
              <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3">
                <Zap className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-amber-800">Publicação imediata</p>
                  <p className="text-[11px] text-amber-600 mt-0.5">
                    A postagem será publicada assim que você salvar. Certifique-se de que as mídias e a legenda estão prontas.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="shrink-0 border-t border-slate-100 px-5 py-4">
          {saveError && (
            <p className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {saveError}
            </p>
          )}
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={saving ? undefined : onClose}
              disabled={saving}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-[#c62737] px-5 py-2 text-sm font-semibold text-white hover:bg-[#9e1f2e] transition-colors disabled:opacity-50"
            >
              {saving
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Salvando…</>
                : publishNow
                  ? <><Zap className="h-4 w-4" /> Publicar agora</>
                  : <><CheckCircle2 className="h-4 w-4" /> Salvar</>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
