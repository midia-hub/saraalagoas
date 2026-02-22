'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import { AdminAccessProvider } from '@/lib/admin-access-context'
import { adminFetchJson } from '@/lib/admin-client'
import type { PermissionMap } from '@/lib/rbac-types'
import { clearSupabaseLocalSession, getSessionWithRecovery } from '@/lib/auth-recovery'
import { AdminLoadingScreen } from '@/app/admin/AdminLoadingScreen'
import { AdminSidebar } from '@/app/admin/AdminSidebar'

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
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [canAccessAdmin, setCanAccessAdmin] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [profileName, setProfileName] = useState('')
  const [roleName, setRoleName] = useState('')
  const [personId, setPersonId] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [source, setSource] = useState<string>('')
  const [permissions, setPermissions] = useState<PermissionMap>({})

  function clearAccessState() {
    document.cookie = 'admin_access=; path=/; max-age=0'
    setCanAccessAdmin(false)
    setIsAdmin(false)
    setProfileName('')
    setRoleName('')
    setPersonId(null)
    setAvatarUrl(null)
    setSource('')
    setPermissions({})
  }

  const loadPermissions = useCallback(async () => {
    const client = supabase
    if (!client) return

    const session = await getSessionWithRecovery(client)
    const currentUser = session?.user ?? null
    setUser(currentUser)

    if (!currentUser) {
      clearAccessState()
      setLoading(false)
      return
    }

    const accessToken = session?.access_token

    try {
      const access = await adminFetchJson<{
        canAccessAdmin: boolean
        isAdmin: boolean
        profile?: { name?: string }
        role?: { name: string }
        legacyProfile?: { name: string }
        displayName?: string
        personId?: string | null
        avatarUrl?: string | null
        source?: string
        permissions?: PermissionMap
      }>('/api/auth/admin-check', {
        method: 'POST',
        body: JSON.stringify({ accessToken }),
      })

      setCanAccessAdmin(!!access.canAccessAdmin)
      setIsAdmin(!!access.isAdmin)
      setProfileName(access.displayName || access.profile?.name || access.role?.name || access.legacyProfile?.name || 'Usuário')
      setRoleName(access.role?.name || access.legacyProfile?.name || 'Membro')
      setPersonId(access.personId || null)
      setAvatarUrl(access.avatarUrl || (currentUser.user_metadata?.avatar_url as string | undefined) || null)
      setSource(access.source || '')
      setPermissions(access.permissions || {})

      if (access.canAccessAdmin && !access.personId) {
        try {
          const ensureRes = await fetch('/api/auth/self/create-person', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({
              full_name: access.displayName || currentUser.user_metadata?.full_name,
              email: access.email || currentUser.email,
            }),
          })
          const ensureJson = await ensureRes.json().catch(() => ({}))
          if (ensureRes.ok && ensureJson?.person?.id) {
            setPersonId(ensureJson.person.id)
          }
        } catch {
          // mantém navegação; regularização pode ser feita pela tela de usuários
        }
      }

      if (access.canAccessAdmin) {
        const isHttps = typeof window !== 'undefined' && window.location?.protocol === 'https:'
        document.cookie = `admin_access=1; path=/; max-age=86400; SameSite=Lax${isHttps ? '; Secure' : ''}`
      } else {
        clearAccessState()
      }
    } catch (error) {
      console.error('Erro ao carregar permissões:', error)
      await clearSupabaseLocalSession(client)
      clearAccessState()
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isPublicAdminPage) {
      setLoading(false)
      return
    }

    setLoading(true)

    let cancelled = false
    loadPermissions()

    const client = supabase
    if (!client) return

    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return
      if (!session) {
        setUser(null)
        clearAccessState()
      } else {
        loadPermissions()
      }
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [isPublicAdminPage, loadPermissions])

  useEffect(() => {
    if (loading || isPublicAdminPage) return
    // Não exige hasAdminCookie() aqui: o cookie pode ser HttpOnly (definido pela API set-admin-cookie)
    // e não fica visível em document.cookie. O middleware já validou o cookie no servidor.
    if (!user || !canAccessAdmin) router.replace('/admin/login')
  }, [loading, isPublicAdminPage, user, canAccessAdmin, router])

  if (isPublicAdminPage) return <>{children}</>

  if (loading) {
    return <AdminLoadingScreen message="Carregando painel..." />
  }

  if (!user || !canAccessAdmin) {
    return <AdminLoadingScreen message="Redirecionando para o login..." />
  }

  return (
    <AdminAccessProvider value={{
      loading: false,
      canAccessAdmin,
      isAdmin,
      userId: user?.id || null,
      profileName,
      roleName,
      personId,
      avatarUrl,
      source,
      permissions,
      refresh: loadPermissions
    }}>
      <div className="h-screen flex overflow-hidden bg-slate-50">
        <AdminSidebar />
        <main className="flex-1 overflow-auto pt-14 md:pt-0">
          {children}
        </main>
      </div>
    </AdminAccessProvider>
  )
}
