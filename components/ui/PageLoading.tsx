'use client'

import { Spinner } from './Spinner'

export interface PageLoadingProps {
  /** Mensagem exibida abaixo do spinner */
  message?: string
  /** Usar fundo da página inteira (min-h-screen) e centralizar */
  fullScreen?: boolean
  className?: string
}

/**
 * Bloco de carregamento para páginas: spinner + mensagem.
 * Usado em loading.tsx, layout admin e estados "Carregando..." / "Redirecionando...".
 */
export function PageLoading({
  message = 'Carregando...',
  fullScreen = true,
  className = '',
}: PageLoadingProps) {
  return (
    <div
      className={
        fullScreen
          ? `min-h-screen flex items-center justify-center bg-slate-50 ${className}`.trim()
          : `flex items-center justify-center min-h-[320px] ${className}`.trim()
      }
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      <div className="text-center">
        <Spinner size="xl" />
        <p className="mt-3 text-sm text-slate-600">{message}</p>
      </div>
    </div>
  )
}
