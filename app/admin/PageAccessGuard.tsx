'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAdminAccess } from '@/lib/admin-access-context'

export function PageAccessGuard({
  pageKey,
  children,
}: {
  pageKey: string
  children: React.ReactNode
}) {
  const router = useRouter()
  const access = useAdminAccess()
  const allowed = access.isAdmin || !!access.permissions[pageKey]?.view

  useEffect(() => {
    if (!access.loading && !allowed) {
      router.replace('/admin/acesso-negado')
    }
  }, [access.loading, allowed, router])

  if (access.loading) {
    return <p className="text-slate-600">Carregando permissões...</p>
  }

  if (!allowed) {
    return <p className="text-slate-600">Redirecionando...</p>
  }

  return <>{children}</>
}
