'use client'

import Link from 'next/link'
import { Image as ImageIcon, Upload, X } from 'lucide-react'

export interface AlbumEmptyStateProps {
  onClearFilters: () => void
  hasActiveFilters: boolean
}

export function AlbumEmptyState({
  onClearFilters,
  hasActiveFilters,
}: AlbumEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center mb-5 shadow-inner">
        <ImageIcon className="w-9 h-9 text-slate-300" />
      </div>
      <h3 className="text-base font-bold text-slate-800">
        {hasActiveFilters ? 'Nenhum álbum encontrado' : 'Nenhum álbum ainda'}
      </h3>
      <p className="mt-1.5 text-sm text-slate-500 max-w-xs">
        {hasActiveFilters
          ? 'Tente ajustar a busca, o tipo ou o período selecionado.'
          : 'Crie o primeiro álbum enviando fotos pela página de upload.'}
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Limpar filtros
          </button>
        )}
        <Link
          href="/admin/upload"
          className="inline-flex items-center gap-2 rounded-xl bg-[#c62737] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#a01f2d] transition-colors shadow-sm"
        >
          <Upload className="w-4 h-4" />
          {hasActiveFilters ? 'Fazer upload' : 'Criar primeiro álbum'}
        </Link>
      </div>
    </div>
  )
}
