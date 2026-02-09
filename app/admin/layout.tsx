'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import { AdminShell } from '@/app/admin/AdminShell'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const pathNormalized = (pathname ?? '').replace(/\/$/, '') || '/'
  const isLoginPage = pathNormalized === '/admin/login'
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setUser(session?.user ?? null)
        setLoading(false)
      })
      .catch(async (err) => {
        // Token/refresh inválido (ex.: Refresh Token Not Found) → limpar sessão e ir para login
        const msg = err?.message ?? ''
        if (msg.includes('Refresh Token') || msg.includes('refresh_token') || err?.status === 400) {
          await supabase.auth.signOut()
        }
        setUser(null)
        setLoading(false)
      })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  // Redirecionar para login apenas em efeito, nunca durante o render (evita warning do React)
  useEffect(() => {
    if (loading || isLoginPage) return
    if (!user) router.replace('/admin/login/')
  }, [loading, isLoginPage, user, router])

  if (isLoginPage) return <>{children}</>

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-gray-600">Carregando...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-gray-600">Redirecionando para o login...</p>
      </div>
    )
  }

  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-100"><p className="text-gray-600">Carregando...</p></div>}>
      <AdminShell>{children}</AdminShell>
    </Suspense>
  )
}
