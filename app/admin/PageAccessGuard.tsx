'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAdminAccess } from '@/lib/admin-access-context'

export function PageAccessGuard({
  pageKey,
  children,
}: {
  pageKey: string | string[]
  children: React.ReactNode
}) {
  const router = useRouter()
  const access = useAdminAccess()
  // Dashboard (página inicial) é acessível a todos os usuários do painel
  const keys = Array.isArray(pageKey) ? pageKey : [pageKey]
  const allowed =
    access.isAdmin ||
    keys.includes('dashboard') ||
    keys.some((k) => !!access.permissions[k]?.view)

  useEffect(() => {
    if (!allowed) {
      router.replace('/admin/acesso-negado')
    }
  }, [allowed, router])

  if (!allowed) return null

  return <>{children}</>
}
