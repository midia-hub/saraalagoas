'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAdminAccess } from '@/lib/admin-access-context'
import { menuModules } from './menu-config'
import {
  Home,
  LogOut,
  ChevronRight,
  Menu,
  X,
  PanelLeftClose,
  PanelLeft,
  UserCircle,
} from 'lucide-react'

const SIDEBAR_WIDTH_KEY = 'admin-sidebar-width'
const MIN_WIDTH = 200
const MAX_WIDTH = 400
const DEFAULT_WIDTH = 256

function getStoredWidth(): number {
  if (typeof window === 'undefined') return DEFAULT_WIDTH
  const v = localStorage.getItem(SIDEBAR_WIDTH_KEY)
  const n = v ? parseInt(v, 10) : DEFAULT_WIDTH
  return Number.isFinite(n) ? Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, n)) : DEFAULT_WIDTH
}

export function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const access = useAdminAccess()
  const [openMobile, setOpenMobile] = useState(false)
  const [width, setWidth] = useState(DEFAULT_WIDTH)
  const [resizing, setResizing] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    setWidth(getStoredWidth())
  }, [])

  const handleResizeMove = useCallback(
    (e: MouseEvent) => {
      if (!resizing) return
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, e.clientX))
      setWidth(newWidth)
      try {
        localStorage.setItem(SIDEBAR_WIDTH_KEY, String(newWidth))
      } catch { }
    },
    [resizing]
  )

  const handleResizeEnd = useCallback(() => {
    setResizing(false)
  }, [])

  useEffect(() => {
    if (!resizing) return
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('mousemove', handleResizeMove)
    window.addEventListener('mouseup', handleResizeEnd)
    return () => {
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('mousemove', handleResizeMove)
      window.removeEventListener('mouseup', handleResizeEnd)
    }
  }, [resizing, handleResizeMove, handleResizeEnd])

  async function handleSignOut() {
    await supabase?.auth.signOut()
    document.cookie = 'admin_access=; path=/; max-age=0'
    router.replace('/admin/login')
  }

  function closeMobileMenu() {
    setOpenMobile(false)
  }

  // Filtrar módulos e itens baseado nas permissões
  const visibleModules = menuModules.map(module => {
    // Se o módulo tem uma permissão específica, verificar se o usuário tem acesso
    if (module.permission && !access.isAdmin) {
      const hasModulePermission = !!access.permissions[module.permission]?.view
      if (!hasModulePermission) return null
    }

    // Filtrar itens do módulo
    const visibleItems = module.items.filter(item => {
      if (access.isAdmin) return true
      // Dashboard (Início) sempre visível para todos no painel
      if (item.permission === 'dashboard') return true
      if (!item.permission) return true
      return !!access.permissions[item.permission]?.view
    })

    if (visibleItems.length === 0) return null

    return {
      ...module,
      items: visibleItems
    }
  }).filter((m): m is NonNullable<typeof m> => m != null)

  const sidebarContent = (
    <>
      {/* Brand */}
      <div className="p-5 border-b border-slate-600/40">
        <Link href="/admin" className="flex items-center gap-2" onClick={closeMobileMenu}>
          <div className="w-9 h-9 rounded-lg bg-red-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">S</span>
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-white text-lg leading-tight">Admin</h1>
            <p className="text-slate-300 text-xs">Sara Sede Alagoas</p>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {visibleModules.map((module, moduleIndex) => (
          <div key={moduleIndex} className={moduleIndex > 0 ? 'pt-4' : ''}>
            <p className="px-3 py-2 text-xs font-semibold text-slate-300 uppercase tracking-wider">
              {module.title}
            </p>
            {module.items.map(({ href, label, icon: Icon }) => {
              const isActive =
                href === '/admin'
                  ? pathname === '/admin'
                  : pathname?.startsWith(href)
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={closeMobileMenu}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${isActive
                      ? 'bg-red-600 text-white shadow-md'
                      : 'text-slate-300 hover:bg-white/10 hover:text-white'
                    }`}
                >
                  <Icon size={20} className="shrink-0" />
                  <span className="flex-1 truncate">{label}</span>
                  {isActive && <ChevronRight size={16} className="shrink-0 opacity-80" />}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-slate-600/40 space-y-0.5">
        <p className="px-3 pb-2 text-xs text-slate-300 truncate" title={access.profileName || ''}>
          Perfil: {access.profileName || 'Sem perfil'}
        </p>
        <Link
          href="/admin/conta"
          onClick={closeMobileMenu}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
        >
          <UserCircle size={20} className="shrink-0" />
          <span className="truncate">Minha conta</span>
        </Link>
        <Link
          href="/"
          onClick={closeMobileMenu}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
        >
          <Home size={20} className="shrink-0" />
          <span className="truncate">Ver site</span>
        </Link>
        <button
          type="button"
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-300 hover:bg-white/10 hover:text-white transition-all duration-300 text-left"
        >
          <LogOut size={20} className="shrink-0" />
          Sair do Painel
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile: barra superior com botão do menu */}
      <header
        className="fixed top-0 left-0 right-0 h-14 z-40 flex md:hidden items-center gap-3 px-4 bg-slate-800 border-b border-slate-600/40 shadow-lg"
        aria-label="Menu do admin"
      >
        <button
          type="button"
          onClick={() => setOpenMobile(true)}
          className="p-2 -ml-2 rounded-lg text-white hover:bg-white/10 transition-colors"
          aria-label="Abrir menu"
        >
          <Menu size={24} />
        </button>
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-sm">S</span>
          </div>
          <span className="font-bold text-white truncate">Admin</span>
        </div>
      </header>

      {/* Mobile: overlay quando menu aberto */}
      <div
        className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-200"
        style={{
          opacity: openMobile ? 1 : 0,
          pointerEvents: openMobile ? 'auto' : 'none',
        }}
        onClick={closeMobileMenu}
        aria-hidden
      />

      {/* Mobile: drawer do menu */}
      <aside
        className="fixed top-0 left-0 bottom-0 z-50 w-64 min-h-screen bg-slate-800 flex flex-col shadow-xl md:hidden transition-transform duration-200 ease-out"
        style={{ transform: openMobile ? 'translateX(0)' : 'translateX(-100%)' }}
        aria-modal="true"
        aria-label="Menu lateral"
      >
        <div className="p-4 flex items-center justify-between border-b border-slate-600/40 shrink-0">
          <Link href="/admin" className="flex items-center gap-2 min-w-0" onClick={closeMobileMenu}>
            <div className="w-9 h-9 rounded-lg bg-red-600 flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-white text-lg leading-tight">Admin</h1>
              <p className="text-slate-300 text-xs">Sara Sede Alagoas</p>
            </div>
          </Link>
          <button
            type="button"
            onClick={closeMobileMenu}
            className="p-2 rounded-lg text-slate-300 hover:bg-white/10 hover:text-white shrink-0 transition-all duration-300"
            aria-label="Fechar menu"
          >
            <X size={22} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <nav className="p-3 space-y-0.5">
            {visibleModules.map((module, moduleIndex) => (
              <div key={moduleIndex} className={moduleIndex > 0 ? 'pt-4' : ''}>
                <p className="px-3 py-2 text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  {module.title}
                </p>
                {module.items.map(({ href, label, icon: Icon }) => {
                  const isActive =
                    href === '/admin' ? pathname === '/admin' : pathname?.startsWith(href)
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={closeMobileMenu}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${isActive
                          ? 'bg-red-600 text-white shadow-md'
                          : 'text-slate-300 hover:bg-white/10 hover:text-white'
                        }`}
                    >
                      <Icon size={20} className="shrink-0" />
                      <span className="flex-1 truncate">{label}</span>
                      {isActive && <ChevronRight size={16} className="shrink-0 opacity-80" />}
                    </Link>
                  )
                })}
              </div>
            ))}
          </nav>
          <div className="p-3 border-t border-slate-600/40 space-y-0.5">
            <p className="px-3 pb-2 text-xs text-slate-300 truncate" title={access.profileName || ''}>
              Perfil: {access.profileName || 'Sem perfil'}
            </p>
            <Link href="/admin/conta" onClick={closeMobileMenu} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-300 hover:bg-white/10 hover:text-white transition-all duration-300">
              <UserCircle size={20} className="shrink-0" />
              <span className="truncate">Minha conta</span>
            </Link>
            <Link href="/" onClick={closeMobileMenu} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-300 hover:bg-white/10 hover:text-white transition-all duration-300">
              <Home size={20} className="shrink-0" />
              <span className="truncate">Ver site</span>
            </Link>
            <button type="button" onClick={handleSignOut} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-300 hover:bg-white/10 hover:text-white transition-all duration-300 text-left">
              <LogOut size={20} className="shrink-0" />
              Sair do Painel
            </button>
          </div>
        </div>
      </aside>

      {/* Desktop: sidebar redimensionável (ou recolhido) */}
      <aside
        className="hidden md:flex flex-col shrink-0 min-h-screen bg-slate-800 shadow-xl relative"
        style={{
          width: collapsed ? 56 : width,
          minWidth: collapsed ? 56 : undefined,
        }}
      >
        {!collapsed && (
          <>
            <div className="flex-1 flex flex-col min-w-0">{sidebarContent}</div>
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              className="absolute top-4 right-2 p-1.5 rounded text-slate-300 hover:bg-white/10 hover:text-white"
              aria-label="Recolher menu"
            >
              <PanelLeftClose size={18} />
            </button>
            <div
              className="absolute top-0 right-0 bottom-0 w-1.5 cursor-col-resize hover:bg-red-600/50 active:bg-red-600 shrink-0"
              onMouseDown={(e) => {
                e.preventDefault()
                setResizing(true)
              }}
              aria-hidden
            />
          </>
        )}
        {collapsed && (
          <div className="flex flex-col items-center py-4 w-full border-r border-slate-600/40">
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              className="p-2 rounded-lg text-slate-300 hover:bg-white/10 hover:text-white"
              aria-label="Expandir menu"
            >
              <PanelLeft size={22} />
            </button>
          </div>
        )}
      </aside>
    </>
  )
}
