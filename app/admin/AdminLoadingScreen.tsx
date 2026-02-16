'use client'

/**
 * Tela de carregamento do painel admin: identidade visual da marca + feedback claro.
 */
export function AdminLoadingScreen({ message = 'Carregando...' }: { message?: string }) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100"
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      <div className="flex flex-col items-center gap-8 px-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-red-600 flex items-center justify-center shadow-lg shadow-red-600/20">
            <span className="text-white font-bold text-xl">S</span>
          </div>
          <div className="text-left">
            <h1 className="font-bold text-slate-800 text-xl leading-tight">Admin</h1>
            <p className="text-slate-500 text-sm">Sara Sede Alagoas</p>
          </div>
        </div>

        {/* Spinner + mensagem */}
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-12 h-12 rounded-full border-2 border-slate-200 border-t-red-600 animate-spin"
            aria-hidden
          />
          <p className="text-sm font-medium text-slate-600 max-w-[220px] text-center">{message}</p>
        </div>

        {/* Barra sutil de progresso indeterminada */}
        <div className="w-40 h-1 rounded-full bg-slate-200 overflow-hidden">
          <div className="h-full w-1/3 rounded-full bg-red-500 admin-loading-bar" />
        </div>
      </div>
    </div>
  )
}
