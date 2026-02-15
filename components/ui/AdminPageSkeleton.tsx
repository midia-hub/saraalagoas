'use client'

import { TableSkeleton } from './TableSkeleton'

/**
 * Skeleton genérico para páginas do admin: título + filtros + tabela.
 * Usado em loading.tsx das rotas para feedback imediato na navegação.
 */
export function AdminPageSkeleton() {
  return (
    <div className="p-6 md:p-8 animate-pulse" role="status" aria-label="Carregando página">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-slate-200" />
          <div className="space-y-1">
            <div className="h-7 w-32 rounded bg-slate-200" />
            <div className="h-4 w-48 rounded bg-slate-100" />
          </div>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-2 space-y-2">
            <div className="h-4 w-14 rounded bg-slate-100" />
            <div className="h-10 w-full rounded-lg bg-slate-100" />
          </div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-16 rounded bg-slate-100" />
              <div className="h-10 w-full rounded-lg bg-slate-100" />
            </div>
          ))}
        </div>
      </div>
      <TableSkeleton rows={8} columns={4} showHeader />
    </div>
  )
}
