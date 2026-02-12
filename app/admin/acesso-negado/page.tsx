'use client'

import Link from 'next/link'

export default function AcessoNegadoPage() {
  return (
    <div className="p-6 md:p-8">
      <div className="max-w-xl bg-white border border-red-200 rounded-xl p-6">
        <h1 className="text-2xl font-bold text-red-700">Acesso negado</h1>
        <p className="mt-2 text-slate-700">
          Você não tem permissão para acessar esta página. Entre em contato com o administrador.
        </p>
        <div className="mt-5 flex gap-2">
          <Link
            href="/admin"
            className="px-4 py-2 rounded-lg bg-[#c62737] text-white hover:bg-[#a01f2d]"
          >
            Voltar ao dashboard
          </Link>
          <Link
            href="/admin/login"
            className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            Fazer login com outro usuário
          </Link>
        </div>
      </div>
    </div>
  )
}
