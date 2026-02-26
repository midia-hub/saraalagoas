'use client'

import { useEffect } from 'react'

export default function GaleriaError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[GaleriaError]', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-sm w-full text-center">
        <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-red-100 flex items-center justify-center">
          <svg className="w-7 h-7 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-slate-800 mb-2">Erro ao carregar galeria</h2>
        <p className="text-sm text-slate-500 mb-5">
          Não foi possível carregar as fotos. Verifique sua conexão e tente novamente.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-5 py-2.5 rounded-xl bg-[#c62737] text-white font-medium text-sm hover:bg-[#a82030] transition-colors"
          >
            Tentar novamente
          </button>
          <a
            href="/galeria"
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium text-sm hover:bg-slate-50 transition-colors"
          >
            Voltar à galeria
          </a>
        </div>
      </div>
    </div>
  )
}
