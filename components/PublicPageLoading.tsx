/**
 * Skeleton de loading genérico para páginas públicas.
 * Mostra um spinner central com o branding da igreja.
 */
export default function PublicPageLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50" role="status" aria-label="Carregando">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-[#c62737] rounded-full animate-spin" />
        <span className="text-sm text-slate-400 font-medium">Carregando...</span>
      </div>
    </div>
  )
}
