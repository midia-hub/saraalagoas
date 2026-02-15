'use client'

export interface TableSkeletonProps {
  /** Número de linhas do skeleton */
  rows?: number
  /** Número de colunas (células por linha) */
  columns?: number
  /** Mostrar cabeçalho (uma linha mais escura no topo) */
  showHeader?: boolean
  className?: string
}

/**
 * Skeleton para tabelas: cabeçalho + linhas com células em pulse.
 * Mantém o layout da tabela real para evitar “pulo” quando os dados carregam.
 */
export function TableSkeleton({
  rows = 8,
  columns = 4,
  showHeader = true,
  className = '',
}: TableSkeletonProps) {
  return (
    <div
      className={`overflow-x-auto rounded-xl border border-slate-200 bg-white ${className}`.trim()}
      role="status"
      aria-label="Carregando tabela"
    >
      <table className="w-full">
        {showHeader && (
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {Array.from({ length: columns }, (_, i) => (
                <th key={i} className="px-6 py-4 text-left">
                  <div className="h-4 w-24 rounded bg-slate-200 animate-pulse" />
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody className="divide-y divide-slate-200">
          {Array.from({ length: rows }, (_, rowIndex) => (
            <tr key={rowIndex}>
              {Array.from({ length: columns }, (_, colIndex) => (
                <td key={colIndex} className="px-6 py-4">
                  <div
                    className="h-5 rounded bg-slate-100 animate-pulse"
                    style={{
                      width: colIndex === 0 ? '70%' : colIndex === columns - 1 ? '48px' : '50%',
                    }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
