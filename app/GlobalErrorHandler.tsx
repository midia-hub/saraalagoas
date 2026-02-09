'use client'

import { useEffect, useState } from 'react'

const FALLBACK_ID = 'app-fallback'

export function GlobalErrorHandler() {
  const [showRecovery, setShowRecovery] = useState(false)

  useEffect(() => {
    // Marca que o app montou (para o script de timeout no layout)
    if (typeof window !== 'undefined') {
      (window as Window & { __APP_MOUNTED__?: boolean }).__APP_MOUNTED__ = true
      // Esconde o fallback de timeout se ele tiver aparecido logo antes da hidratação
      const fallbackEl = document.getElementById(FALLBACK_ID)
      if (fallbackEl) fallbackEl.style.display = 'none'
    }

    const handleError = (event: ErrorEvent | PromiseRejectionEvent) => {
      const err = event instanceof PromiseRejectionEvent ? event.reason : event.error || event.message
      console.error('[App] Erro capturado (pode ser extensão do navegador):', err)
      setShowRecovery(true)
      return true // evita que o erro suba e quebre a UI
    }

    const onError = (event: ErrorEvent) => handleError(event)
    const onUnhandledRejection = (event: PromiseRejectionEvent) => handleError(event)

    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onUnhandledRejection)

    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onUnhandledRejection)
    }
  }, [])

  if (!showRecovery) return null

  return (
    <div
      role="alert"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/95 p-6"
      style={{ fontFamily: 'system-ui, sans-serif' }}
    >
      <div className="max-w-md rounded-xl border border-red-200 bg-red-50 p-6 text-center shadow-lg">
        <h2 className="mb-2 text-lg font-semibold text-red-800">
          Algo deu errado ao carregar a página
        </h2>
        <p className="mb-4 text-sm text-red-700">
          Isso pode ser causado por uma extensão do navegador. Tente recarregar ou abrir o site em
          janela anônima / com extensões desativadas.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Recarregar página
          </button>
          <button
            type="button"
            onClick={() => setShowRecovery(false)}
            className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
          >
            Tentar continuar
          </button>
        </div>
      </div>
    </div>
  )
}
