'use client'

import { PageAccessGuard } from '@/app/admin/PageAccessGuard'

export default function AdminInstagramPage() {
  return (
    <PageAccessGuard pageKey="instagram">
      <h1>Instagram</h1>
    </PageAccessGuard>
  )
}
