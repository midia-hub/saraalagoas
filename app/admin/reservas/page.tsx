'use client'

import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import ReservationsAdminClient from '@/components/admin/reservas/ReservationsAdminClient'
import Link from 'next/link'
import { Plus, Building2 } from 'lucide-react'

export default function ReservasPage() {
  return (
    <PageAccessGuard pageKey="reservas">
      <div className="p-6 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Reservas de Salas</h1>
            <p className="text-sm text-slate-500 mt-0.5">Gerencie solicitações de uso das salas da Igreja</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href="/admin/reservas/salas"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium px-3 py-2 transition-colors"
            >
              <Building2 size={15} /> Salas
            </Link>
            <Link
              href="/reservar-sala"
              target="_blank"
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 transition-colors"
            >
              <Plus size={15} /> Nova solicitação
            </Link>
          </div>
        </div>

        <ReservationsAdminClient />
      </div>
    </PageAccessGuard>
  )
}

