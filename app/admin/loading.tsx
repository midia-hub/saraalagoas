export default function AdminLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 rounded-full border-4 border-slate-300 border-t-[#c62737] animate-spin" />
        <p className="mt-3 text-sm text-slate-600">Carregando painel...</p>
      </div>
    </div>
  )
}
