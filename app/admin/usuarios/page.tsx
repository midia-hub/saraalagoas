'use client'

import { AdminUsers } from '@/app/admin/AdminUsers'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'

export default function UsuariosPage() {
  return (
    <PageAccessGuard pageKey="usuarios">
      <div className="p-6 md:p-8">
        <AdminUsers />
      </div>
    </PageAccessGuard>
  )
}
