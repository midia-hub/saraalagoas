'use client'

import { AdminSiteConfig } from '@/app/admin/AdminSiteConfig'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'

export default function ConfiguracoesPage() {
  return (
    <PageAccessGuard pageKey="configuracoes">
      <div className="p-6 md:p-8">
        <AdminSiteConfig />
      </div>
    </PageAccessGuard>
  )
}
