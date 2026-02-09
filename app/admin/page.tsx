'use client'

import { useSearchParams } from 'next/navigation'
import { AdminSiteConfig } from '@/app/admin/AdminSiteConfig'
import { AdminUsers } from '@/app/admin/AdminUsers'
import { AdminGallerySettings } from '@/app/admin/AdminGallerySettings'

type Tab = 'site' | 'users' | 'gallery'

export default function AdminPage() {
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab') as Tab | null
  const tab: Tab = tabParam && ['site', 'users', 'gallery'].includes(tabParam) ? tabParam : 'site'

  return (
    <>
      {tab === 'site' && <AdminSiteConfig />}
      {tab === 'gallery' && <AdminGallerySettings />}
      {tab === 'users' && <AdminUsers />}
    </>
  )
}
