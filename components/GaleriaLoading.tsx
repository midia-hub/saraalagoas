'use client'

export interface GaleriaLoadingProps {
  /** Título principal (ex.: "Carregando álbuns", "Carregando galeria...") */
  title: string
  /** Texto secundário (ex.: "Buscando capas e fotos...") */
  subtitle?: string
  /** Exibe skeleton em grade de álbuns abaixo do spinner */
  showGrid?: boolean
  /** Quantidade de cards no skeleton (quando showGrid) */
  gridCount?: number
  /** Classes do container (ex.: para fundo da página pública) */
  className?: string
}

export function GaleriaLoading({
  title,
  subtitle,
  showGrid = false,
  gridCount = 8,
  className = '',
}: GaleriaLoadingProps) {
  return (
    <div className={`flex flex-col min-h-[40vh] ${className}`.trim()}>
      <div className="flex items-center gap-3 mb-6">
        <div
          className="h-8 w-8 shrink-0 rounded-full border-2 border-[#c62737] border-t-transparent animate-spin"
          aria-hidden
        />
        <div>
          <p className="text-slate-800 font-medium">{title}</p>
          {subtitle && (
            <p className="text-slate-500 text-sm">{subtitle}</p>
          )}
        </div>
      </div>
      {showGrid && (
        <div className="w-full max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: gridCount }, (_, i) => (
              <div
                key={i}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden animate-pulse"
              >
                <div className="aspect-[4/3] bg-slate-200" />
                <div className="p-3 space-y-2">
                  <div className="h-4 w-16 rounded bg-slate-200" />
                  <div className="h-5 w-full rounded bg-slate-200" />
                  <div className="h-4 w-24 rounded bg-slate-200" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
