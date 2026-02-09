'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Settings, Users, LogOut, Home, Menu, X, Image as ImageIcon, Upload } from 'lucide-react'

export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname() ?? ''
  const searchParams = useSearchParams()
  const tab = searchParams.get('tab')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userDisplayName, setUserDisplayName] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setUserEmail(user.email ?? null)
      setUserDisplayName((user.user_metadata?.full_name as string) || user.email || 'Usuário')
    })
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const handler = () => { if (mq.matches) setSidebarOpen(false) }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Em mobile: travar scroll do body quando o menu estiver aberto
  useEffect(() => {
    if (typeof document === 'undefined') return
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [sidebarOpen])

  // Fechar menu com tecla Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  async function handleSignOut() {
    await supabase?.auth.signOut()
    router.replace('/admin/login')
  }

  const isAdminRoot = pathname === '/admin' || pathname === '/admin/'
  const activeSite = isAdminRoot && (!tab || tab === 'site')
  const activeGallery = isAdminRoot && tab === 'gallery'
  const activeUsers = isAdminRoot && tab === 'users'
  const activeUpload = pathname.startsWith('/admin/upload')
  const activeVerGaleria = pathname.startsWith('/admin/galeria')

  const linkClass = (active: boolean) =>
    `w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
      active ? 'bg-[#c62737] text-white' : 'text-gray-700 hover:bg-gray-100'
    }`

  const nav = (
    <>
      <div className="px-4 pt-4 pb-4 border-b border-gray-200 flex items-center gap-2.5 shrink-0 min-h-[56px]">
        <Image
          src="/brand/logo.png"
          alt="Sara Sede Alagoas"
          width={28}
          height={28}
          priority
          className="shrink-0 rounded-lg object-contain w-7 h-7"
        />
        <div className="min-w-0 flex-1">
          <h1 className="font-bold text-gray-900 text-sm leading-tight">Admin</h1>
          <p className="text-xs text-gray-500 leading-tight mt-0.5 truncate">Sara Sede Alagoas</p>
        </div>
      </div>
      <nav className="flex-1 min-h-0 overflow-auto p-3 pt-4 flex flex-col gap-1">
        <Link
          href="/admin"
          onClick={() => setSidebarOpen(false)}
          className={linkClass(activeSite)}
        >
          <Settings size={20} />
          Configurações do site
        </Link>
        <Link
          href="/admin?tab=gallery"
          onClick={() => setSidebarOpen(false)}
          className={linkClass(activeGallery)}
        >
          <ImageIcon size={20} />
          Galeria & Cultos
        </Link>
        <Link
          href="/admin/upload"
          onClick={() => setSidebarOpen(false)}
          className={linkClass(activeUpload)}
        >
          <Upload size={20} />
          Fazer Upload
        </Link>
        <Link
          href="/admin/galeria"
          onClick={() => setSidebarOpen(false)}
          className={linkClass(activeVerGaleria)}
        >
          <ImageIcon size={20} />
          Ver Galeria
        </Link>
        <Link
          href="/admin?tab=users"
          onClick={() => setSidebarOpen(false)}
          className={linkClass(activeUsers)}
        >
          <Users size={20} />
          Usuários
        </Link>
      </nav>
      <div className="p-2 border-t border-gray-200 space-y-1 shrink-0">
        {(userDisplayName || userEmail) && (
          <div className="px-3 py-2 text-sm text-gray-700 space-y-0.5 min-w-0">
            {userDisplayName && (
              <p className="font-medium text-gray-900 truncate" title={userDisplayName}>{userDisplayName}</p>
            )}
            {userEmail && (
              <p className="text-gray-500 truncate text-xs" title={userEmail}>{userEmail}</p>
            )}
          </div>
        )}
        <Link
          href="/"
          onClick={() => setSidebarOpen(false)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-100"
        >
          <Home size={20} />
          Ver site
        </Link>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-100"
        >
          <LogOut size={20} />
          Sair
        </button>
      </div>
    </>
  )

  return (
    <div className="min-h-screen min-h-[100dvh] bg-gray-100 flex flex-col md:flex-row">
      {/* Barra superior só em mobile: hambúrguer + logo */}
      <header className="md:hidden flex items-center justify-between gap-3 px-3 py-3 bg-white border-b border-gray-200 sticky top-0 z-30 shrink-0 safe-area-inset-top">
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="p-2.5 -ml-1 rounded-xl text-gray-600 hover:bg-gray-100 active:bg-gray-200 touch-manipulation"
          aria-label="Abrir menu"
        >
          <Menu size={24} strokeWidth={2} />
        </button>
        <div className="flex items-center gap-2 min-w-0 flex-1 justify-center">
          <Image
            src="/brand/logo.png"
            alt=""
            width={24}
            height={24}
            priority
            className="shrink-0 rounded-lg object-contain w-6 h-6"
          />
          <h1 className="font-bold text-gray-900 truncate text-sm sm:text-base">Admin</h1>
        </div>
        <div className="w-12" />
      </header>

      {/* Overlay em mobile quando menu aberto */}
      <div
        role="button"
        tabIndex={-1}
        aria-label="Fechar menu"
        onClick={() => setSidebarOpen(false)}
        className={`
          fixed inset-0 z-40 bg-black/50 transition-opacity duration-200
          md:hidden md:pointer-events-none
          ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
        style={{ touchAction: 'manipulation' }}
      />

      {/* Sidebar: em mobile fica escondido à esquerda e desliza ao abrir */}
      <aside
        className={`
          fixed md:relative inset-y-0 left-0 z-50
          w-[min(280px,85vw)] md:w-60
          h-full md:h-screen max-h-[100dvh]
          bg-white border-r border-gray-200 flex flex-col min-h-0
          transform transition-[transform] duration-300 ease-out
          md:transform-none
          ${sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0 md:shadow-none'}
        `}
      >
        <div className="md:hidden flex items-center justify-between p-4 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Image src="/brand/logo.png" alt="" width={24} height={24} className="shrink-0 rounded object-contain w-6 h-6" />
            <span className="font-bold text-gray-900 truncate">Menu</span>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="p-2.5 rounded-xl text-gray-600 hover:bg-gray-100 active:bg-gray-200 touch-manipulation shrink-0"
            aria-label="Fechar menu"
          >
            <X size={22} strokeWidth={2} />
          </button>
        </div>
        {nav}
      </aside>

      <main className="flex-1 min-w-0 overflow-auto px-4 py-5 sm:px-6 sm:py-8 w-full min-h-0">
        {children}
      </main>
    </div>
  )
}
