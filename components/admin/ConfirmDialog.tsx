'use client'

import { useEffect } from 'react'
import { AlertCircle, Loader2, Trash2, X } from 'lucide-react'

export interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  /** Texto do botão principal. Padrão: "Excluir" (danger) ou "Confirmar" (primary) */
  confirmLabel?: string
  /** Texto do botão cancelar. Se null ou '' oculta o botão (estilo alerta). Padrão: "Cancelar" */
  cancelLabel?: string | null
  onConfirm: () => void
  onCancel: () => void
  /**
   * danger   = ação destrutiva (excluir) — ícone Trash2, botão vermelho sólido
   * primary  = ação de confirmação geral — ícone AlertCircle, botão sara-red
   */
  variant?: 'danger' | 'primary'
  /** Desabilita botões e exibe spinner no confirm (ex.: aguardando resposta da API) */
  loading?: boolean
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel,
  variant = 'primary',
  loading = false,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onCancel()
    }
    document.addEventListener('keydown', handleEscape)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [open, loading, onCancel])

  if (!open) return null

  const label = confirmLabel ?? (variant === 'danger' ? 'Excluir' : 'Confirmar')
  const isDanger = variant === 'danger'
  const Icon = isDanger ? Trash2 : AlertCircle

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-desc"
    >
      {/* Overlay com blur */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        aria-hidden
        onClick={loading ? undefined : onCancel}
      />

      {/* Card */}
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150">

        {/* Botão fechar */}
        <button
          type="button"
          onClick={loading ? undefined : onCancel}
          disabled={loading}
          aria-label="Fechar"
          className="absolute right-4 top-4 rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors disabled:pointer-events-none"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Corpo */}
        <div className="flex items-start gap-4 px-6 pt-6 pb-5">
          {/* Ícone */}
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
              isDanger
                ? 'bg-red-50 text-red-600'
                : 'bg-[#c62737]/10 text-[#c62737]'
            }`}
          >
            <Icon className="h-5 w-5" />
          </span>

          {/* Textos */}
          <div className="min-w-0 flex-1 pr-6">
            <h2
              id="confirm-dialog-title"
              className="text-base font-semibold text-slate-900 leading-snug"
            >
              {title}
            </h2>
            <p
              id="confirm-dialog-desc"
              className="mt-1.5 text-sm text-slate-600 leading-relaxed"
            >
              {message}
            </p>
          </div>
        </div>

        {/* Rodapé com ações */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-6 py-4 rounded-b-2xl">
          {cancelLabel != null && cancelLabel !== '' && (
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700
                         hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-50"
            >
              {cancelLabel}
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white
                        shadow-sm transition-all disabled:opacity-50 ${
                          isDanger
                            ? 'bg-red-600 hover:bg-red-700 active:bg-red-800'
                            : 'bg-[#c62737] hover:bg-[#9e1f2e] active:bg-[#7d1825]'
                        }`}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Aguarde…
              </>
            ) : (
              <>
                {isDanger && <Trash2 className="h-4 w-4" />}
                {label}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
