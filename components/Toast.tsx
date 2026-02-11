'use client'

import { useEffect } from 'react'

export type ToastType = 'ok' | 'err'

export interface ToastProps {
  visible: boolean
  message: string
  type: ToastType
  onClose: () => void
  /** Tempo em ms para fechar automaticamente (0 = não fecha sozinho). Padrão 5000 */
  autoDismissMs?: number
}

export function Toast({
  visible,
  message,
  type,
  onClose,
  autoDismissMs = 5000,
}: ToastProps) {
  useEffect(() => {
    if (!visible || autoDismissMs <= 0) return
    const t = setTimeout(onClose, autoDismissMs)
    return () => clearTimeout(t)
  }, [visible, autoDismissMs, onClose])

  if (!visible || !message) return null

  const isSuccess = type === 'ok'
  const bg = isSuccess ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
  const text = isSuccess ? 'text-emerald-800' : 'text-red-800'
  const iconBg = isSuccess ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`fixed top-4 right-4 z-[100] flex max-w-sm items-start gap-3 rounded-xl border px-4 py-3 shadow-lg animate-toast-in ${bg} ${text}`}
    >
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${iconBg}`}>
        {isSuccess ? (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
      </span>
      <p className="flex-1 pt-0.5 text-sm font-medium">{message}</p>
      <button
        type="button"
        onClick={onClose}
        className={`shrink-0 rounded-lg p-1.5 transition-colors hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-1 ${isSuccess ? 'focus:ring-emerald-500' : 'focus:ring-red-500'}`}
        aria-label="Fechar"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
