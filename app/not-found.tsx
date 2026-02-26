import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full text-center">
        <div className="text-7xl font-bold text-slate-200 mb-2">404</div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Página não encontrada</h1>
        <p className="text-slate-500 mb-8">
          A página que você procura não existe ou foi movida.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#c62737] text-white font-medium text-sm hover:bg-[#a82030] transition-colors"
        >
          Voltar ao início
        </Link>
      </div>
    </div>
  )
}
