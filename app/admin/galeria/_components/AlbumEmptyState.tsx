'use client'

import Link from 'next/link'

export interface AlbumEmptyStateProps {
  onClearFilters: () => void
  hasActiveFilters: boolean
}

export function AlbumEmptyState({
  onClearFilters,
  hasActiveFilters,
}: AlbumEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
        <svg
          className="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14"
          />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-slate-900">
        Nenhum álbum encontrado com esses filtros
      </h3>
      <p className="mt-1 text-slate-600 max-w-sm">
        {hasActiveFilters
          ? 'Tente alterar a busca, o tipo ou o período.'
          : 'Ainda não há álbuns. Crie um enviando fotos na página de upload.'}
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Limpar filtros
          </button>
        )}
        <Link
          href="/admin/upload"
          className="inline-flex items-center rounded-lg bg-[#c62737] px-4 py-2 text-sm font-medium text-white hover:bg-[#a01f2d]"
        >
          Fazer upload / Criar álbum
        </Link>
      </div>
    </div>
  )
}
