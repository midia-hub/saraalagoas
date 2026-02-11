'use client'

import Link from 'next/link'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'

export default function AdminInstagramInstancesPage() {
  return (
    <PageAccessGuard pageKey="instagram">
      <div className="p-6 md:p-8">
        <h1 className="text-2xl font-bold text-slate-900">Instagram - Instâncias</h1>
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm text-amber-900">
            O cadastro manual de instâncias foi desativado. A plataforma agora utiliza somente integrações via <strong>Meta OAuth</strong>.
          </p>
          <Link
            href="/admin/instancias"
            className="mt-4 inline-flex rounded-lg bg-[#c62737] px-4 py-2 text-sm font-medium text-white hover:bg-[#a01f2d]"
          >
            Ir para Instâncias (Meta)
          </Link>
        </div>
      </div>
    </PageAccessGuard>
  )
}
