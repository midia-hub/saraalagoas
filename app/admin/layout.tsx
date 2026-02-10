'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import { AdminSidebar } from '@/app/admin/AdminSidebar'
import { AdminAccessProvider } from '@/lib/admin-access-context'
import { adminFetchJson } from '@/lib/admin-client'
import type { PermissionMap } from '@/lib/rbac'

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
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [canAccessAdmin, setCanAccessAdmin] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [profileName, setProfileName] = useState('')
  const [permissions, setPermissions] = useState<PermissionMap>({})

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)
      if (!currentUser) {
        document.cookie = 'admin_access=; path=/; max-age=0'
        setCanAccessAdmin(false)
        setIsAdmin(false)
        setProfileName('')
        setPermissions({})
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
          document.cookie = 'admin_access=1; path=/; max-age=86400'
        } else {
          document.cookie = 'admin_access=; path=/; max-age=0'
        }
      } catch {
        document.cookie = 'admin_access=; path=/; max-age=0'
        setCanAccessAdmin(false)
        setIsAdmin(false)
        setProfileName('')
        setPermissions({})
      } finally {
        setLoading(false)
      }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (!session?.user) {
        document.cookie = 'admin_access=; path=/; max-age=0'
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (loading || isLoginPage) return
    if (!user || !hasAdminCookie() || !canAccessAdmin) router.replace('/admin/login')
  }, [loading, isLoginPage, user, canAccessAdmin, router])

  if (isLoginPage) return <>{children}</>

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <p className="text-slate-600">Carregando...</p>
      </div>
    )
  }

  if (!user || !hasAdminCookie() || !canAccessAdmin) {
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
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </AdminAccessProvider>
  )
}
