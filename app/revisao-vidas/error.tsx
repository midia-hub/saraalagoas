'use client'

import { useEffect } from 'react'

export default function RevisaoVidasError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[RevisaoVidasError]', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-sm w-full text-center">
        <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-red-100 flex items-center justify-center">
          <svg className="w-7 h-7 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-slate-800 mb-2">Erro ao carregar</h2>
        <p className="text-sm text-slate-500 mb-5">
          Não foi possível carregar a página. Verifique sua conexão e tente novamente.
        </p>
        <button
          onClick={reset}
          className="px-5 py-2.5 rounded-xl bg-[#c62737] text-white font-medium text-sm hover:bg-[#a82030] transition-colors"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  )
}
