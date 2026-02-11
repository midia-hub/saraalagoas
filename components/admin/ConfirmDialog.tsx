'use client'

import { useEffect } from 'react'
import { AlertCircle } from 'lucide-react'

export interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  /** Texto do botão principal. Padrão: "Excluir" (danger) ou "Confirmar" (primary) */
  confirmLabel?: string
  /** Texto do botão cancelar. Se não informado, não exibe botão cancelar (estilo alert). */
  cancelLabel?: string | null
  onConfirm: () => void
  onCancel: () => void
  /** danger = vermelho para ações destrutivas; primary = vermelho padrão do site */
  variant?: 'danger' | 'primary'
  /** Desabilita botões e mostra "Salvando..." no confirm (ex.: durante exclusão) */
  loading?: boolean
}

const SITE_RED = '#c62737'

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
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handleEscape)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [open, onCancel])

  if (!open) return null

  const label = confirmLabel ?? (variant === 'danger' ? 'Excluir' : 'Confirmar')
  const isDanger = variant === 'danger'

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-desc"
    >
      <div
        className="absolute inset-0 bg-black/50"
        aria-hidden
        onClick={loading ? undefined : onCancel}
      />
      <div className="relative w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl">
        <div className="flex items-start gap-4">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
            style={{
              backgroundColor: isDanger ? 'rgba(220, 38, 38, 0.1)' : 'rgba(198, 39, 55, 0.1)',
              color: isDanger ? '#dc2626' : SITE_RED,
            }}
          >
            <AlertCircle className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="confirm-dialog-title" className="text-lg font-semibold text-gray-900">
              {title}
            </h2>
            <p id="confirm-dialog-desc" className="mt-2 text-sm text-gray-600">
              {message}
            </p>
          </div>
        </div>
        <div className="mt-6 flex flex-row-reverse flex-wrap gap-2">
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
            style={{
              backgroundColor: isDanger ? '#dc2626' : SITE_RED,
            }}
          >
            {loading ? 'Aguarde...' : label}
          </button>
          {cancelLabel != null && cancelLabel !== '' && (
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
            >
              {cancelLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
