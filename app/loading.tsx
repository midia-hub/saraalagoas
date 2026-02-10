export default function GlobalLoading() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 md:px-6 lg:px-8 py-12 animate-pulse">
        <div className="mx-auto h-9 w-56 rounded bg-slate-200" />
        <div className="mx-auto mt-3 h-4 w-80 max-w-full rounded bg-slate-200" />
        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <div className="h-40 rounded-xl bg-slate-200" />
          <div className="h-40 rounded-xl bg-slate-200" />
          <div className="h-40 rounded-xl bg-slate-200" />
        </div>
      </div>
    </div>
  )
}
