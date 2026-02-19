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
  /** Variante visual */
  variant?: 'default' | 'dark'
}

export function GaleriaLoading({
  title,
  subtitle,
  showGrid = false,
  gridCount = 8,
  className = '',
  variant = 'default',
}: GaleriaLoadingProps) {
  const isDark = variant === 'dark'

  return (
    <div className={`flex flex-col min-h-[40vh] ${className}`.trim()}>
      <div className="flex items-center gap-3 mb-6">
        <div
          className={`h-8 w-8 shrink-0 rounded-full border-2 animate-spin ${isDark ? 'border-[#B6FF3B]' : 'border-[#c62737]'
            } border-t-transparent`}
          aria-hidden
        />
        <div>
          <p className={`font-medium ${isDark ? 'text-white' : 'text-slate-800'}`}>{title}</p>
          {subtitle && (
            <p className={`${isDark ? 'text-gray-400' : 'text-slate-500'} text-sm`}>{subtitle}</p>
          )}
        </div>
      </div>
      {showGrid && (
        <div className="w-full max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: gridCount }, (_, i) => (
              <div
                key={i}
                className={`${isDark
                    ? 'bg-white/5 border-white/10'
                    : 'bg-white border-slate-200'
                  } border rounded-xl overflow-hidden animate-pulse`}
              >
                <div className={`aspect-[4/3] ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />
                <div className="p-3 space-y-2">
                  <div className={`h-4 w-16 rounded ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />
                  <div className={`h-5 w-full rounded ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />
                  <div className={`h-4 w-24 rounded ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

