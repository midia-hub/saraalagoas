'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import { AdminSidebar } from '@/app/admin/AdminSidebar'
import { AdminAccessProvider } from '@/lib/admin-access-context'
import { adminFetchJson } from '@/lib/admin-client'
import type { PermissionMap } from '@/lib/rbac-types'
import { clearSupabaseLocalSession, getSessionWithRecovery } from '@/lib/auth-recovery'

function hasAdminCookie(): boolean {
  if (typeof document === 'undefined') return false
  return document.cookie.split(';').some((item) => item.trim() === 'admin_access=1')
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const isLoginPage = pathname?.includes('/admin/login')
  const isCompletarCadastroPage = pathname?.includes('/admin/completar-cadastro')
  const isPublicAdminPage = isLoginPage || isCompletarCadastroPage
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [canAccessAdmin, setCanAccessAdmin] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [profileName, setProfileName] = useState('')
  const [permissions, setPermissions] = useState<PermissionMap>({})

  useEffect(() => {
    if (isPublicAdminPage) {
      setLoading(false)
      return
    }

    setLoading(true)

    function clearAccessState() {
      document.cookie = 'admin_access=; path=/; max-age=0'
      setCanAccessAdmin(false)
      setIsAdmin(false)
      setProfileName('')
      setPermissions({})
    }

    const client = supabase
    if (!client) {
      setLoading(false)
      return
    }

    let cancelled = false

    getSessionWithRecovery(client)
      .then(async (session) => {
        if (cancelled) return
        const currentUser = session?.user ?? null
        setUser(currentUser)
        if (!currentUser) {
          clearAccessState()
          setLoading(false)
          return
        }

        try {
          const access = await adminFetchJson<{
            canAccessAdmin: boolean
            isAdmin: boolean
            profile?: { name?: string }
            permissions?: PermissionMap
          }>('/api/auth/admin-check', {
            method: 'POST',
            body: JSON.stringify({ accessToken: session?.access_token }),
          })
          setCanAccessAdmin(!!access.canAccessAdmin)
          setIsAdmin(!!access.isAdmin)
          setProfileName(access.profile?.name || '')
          setPermissions(access.permissions || {})
          if (access.canAccessAdmin) {
            const isHttps = typeof window !== 'undefined' && window.location?.protocol === 'https:'
            document.cookie = `admin_access=1; path=/; max-age=86400; SameSite=Lax${isHttps ? '; Secure' : ''}`
          } else {
            clearAccessState()
          }
        } catch {
          await clearSupabaseLocalSession(client)
          if (cancelled) return
          clearAccessState()
        } finally {
          if (cancelled) return
          setLoading(false)
        }
      })
      .catch(async () => {
        await clearSupabaseLocalSession(client)
        if (cancelled) return
        clearAccessState()
        setLoading(false)
      })

    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return
      setUser(session?.user ?? null)
      if (!session?.user) {
        clearAccessState()
      }
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [isPublicAdminPage])

  useEffect(() => {
    if (loading || isPublicAdminPage) return
    // Não exige hasAdminCookie() aqui: o cookie pode ser HttpOnly (definido pela API set-admin-cookie)
    // e não fica visível em document.cookie. O middleware já validou o cookie no servidor.
    if (!user || !canAccessAdmin) router.replace('/admin/login')
  }, [loading, isPublicAdminPage, user, canAccessAdmin, router])

  if (isPublicAdminPage) return <>{children}</>

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <p className="text-slate-600">Carregando...</p>
      </div>
    )
  }

  if (!user || !canAccessAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <p className="text-slate-600">Redirecionando para o login...</p>
      </div>
    )
  }

  return (
    <AdminAccessProvider value={{ loading: false, canAccessAdmin, isAdmin, profileName, permissions }}>
      <div className="min-h-screen flex bg-slate-100">
        <AdminSidebar />
        <main className="flex-1 overflow-auto pt-14 md:pt-0">
          {children}
        </main>
      </div>
    </AdminAccessProvider>
  )
}
