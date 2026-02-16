'use client'

import { Settings } from 'lucide-react'
import { AdminSiteConfig } from '@/app/admin/AdminSiteConfig'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { AdminPageHeader } from '@/app/admin/AdminPageHeader'

export default function ConfiguracoesPage() {
  return (
    <PageAccessGuard pageKey="configuracoes">
      <div className="p-6 md:p-8">
        <AdminPageHeader
          icon={Settings}
          title="Ajustes do Site"
          subtitle="Editar textos, menu e configurações gerais do site."
        />
        <AdminSiteConfig />
      </div>
    </PageAccessGuard>
  )
}
