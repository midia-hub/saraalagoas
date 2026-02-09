'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[App] Erro no boundary:', error)
  }, [error])

  return (
    <div
      className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-12"
      style={{ fontFamily: 'system-ui, sans-serif' }}
    >
      <div className="max-w-md rounded-xl border border-red-200 bg-red-50 p-6 text-center shadow-lg">
        <h2 className="mb-2 text-lg font-semibold text-red-800">Algo deu errado</h2>
        <p className="mb-4 text-sm text-red-700">
          Um erro inesperado ocorreu. Pode ser causado por uma extensão do navegador. Tente
          recarregar ou abrir em janela anônima.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Tentar novamente
          </button>
          <button
            type="button"
            onClick={() => (window.location.href = '/')}
            className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
          >
            Ir para a página inicial
          </button>
        </div>
      </div>
    </div>
  )
}
