'use client'

import { Users } from 'lucide-react'
import { AdminUsers } from '@/app/admin/AdminUsers'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { AdminPageHeader } from '@/app/admin/AdminPageHeader'

export default function UsuariosPage() {
  return (
    <PageAccessGuard pageKey="usuarios">
      <div className="p-6 md:p-8">
        <AdminPageHeader
          icon={Users}
          title="Usuários e perfis"
          subtitle="Convidar e gerenciar acessos ao painel."
        />
        <AdminUsers />
      </div>
    </PageAccessGuard>
  )
}
