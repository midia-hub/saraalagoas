'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAdminAccess } from '@/lib/admin-access-context'
import {
  LayoutDashboard,
  Settings,
  Users,
  Upload,
  Image as ImageIcon,
  Instagram,
  Home,
  LogOut,
  ChevronRight,
  Menu,
  X,
  PanelLeftClose,
  PanelLeft,
  Shield,
  UserCircle,
} from 'lucide-react'

const SIDEBAR_WIDTH_KEY = 'admin-sidebar-width'
const MIN_WIDTH = 200
const MAX_WIDTH = 400
const DEFAULT_WIDTH = 256

const primaryLinks = [
  { href: '/admin', label: 'Início', icon: LayoutDashboard, permission: 'dashboard' },
  { href: '/admin/configuracoes', label: 'Configurações do site', icon: Settings, permission: 'configuracoes' },
  { href: '/admin/usuarios', label: 'Usuários e perfis', icon: Users, permission: 'usuarios' },
  { href: '/admin/roles', label: 'Funções e Permissões', icon: Shield, permission: 'roles' },
  { href: '/admin/upload', label: 'Upload', icon: Upload, permission: 'upload' },
  { href: '/admin/galeria', label: 'Galeria', icon: ImageIcon, permission: 'galeria' },
] as const

const instagramLinks = [
  { href: '/admin/instagram/posts', label: 'Painel de publicações' },
  { href: '/admin/instagram/collaboration', label: 'Convites de Colaboração' },
] as const

// Conexão via OAuth Meta (Facebook/Instagram) — fluxo principal
const metaLinks = [
  { href: '/admin/instancias', label: 'Instâncias (Meta)' },
] as const


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
      } catch {}
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

  const visibleLinks = primaryLinks.filter((link) => {
    if (access.isAdmin) return true
    // Dashboard (Início) sempre visível para todos no painel
    if (link.permission === 'dashboard') return true
    return !!access.permissions[link.permission]?.view
  })

  const canViewInstagram = access.isAdmin || !!access.permissions.instagram?.view

  const sidebarContent = (
    <>
      {/* Brand */}
      <div className="p-5 border-b border-slate-700/80">
        <Link href="/admin" className="flex items-center gap-2" onClick={closeMobileMenu}>
          <div className="w-9 h-9 rounded-lg bg-[#c62737] flex items-center justify-center">
            <span className="text-white font-bold text-sm">S</span>
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-white text-lg leading-tight">Admin</h1>
            <p className="text-slate-400 text-xs">Sara Sede Alagoas</p>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        <p className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Menu
        </p>
        {visibleLinks.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === '/admin'
              ? pathname === '/admin'
              : pathname?.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              onClick={closeMobileMenu}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-[#c62737] text-white shadow-md'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon size={20} className="shrink-0" />
              <span className="flex-1 truncate">{label}</span>
              {isActive && <ChevronRight size={16} className="shrink-0 opacity-80" />}
            </Link>
          )
        })}
        {canViewInstagram && (
          <div className="pt-2">
            <p className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Instagram
            </p>
            {metaLinks.map(({ href, label }) => {
              const isActive = pathname?.startsWith(href)
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={closeMobileMenu}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-[#c62737] text-white shadow-md'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Instagram size={18} className="shrink-0" />
                  <span className="flex-1 truncate">{label}</span>
                  {isActive && <ChevronRight size={16} className="shrink-0 opacity-80" />}
                </Link>
              )
            })}
            {instagramLinks.map(({ href, label }) => {
              const isActive = pathname?.startsWith(href)
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={closeMobileMenu}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-[#c62737] text-white shadow-md'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Instagram size={18} className="shrink-0" />
                  <span className="flex-1 truncate">{label}</span>
                  {isActive && <ChevronRight size={16} className="shrink-0 opacity-80" />}
                </Link>
              )
            })}
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-slate-700/80 space-y-0.5">
        <p className="px-3 pb-2 text-xs text-slate-500 truncate" title={access.profileName || ''}>
          Perfil: {access.profileName || 'Sem perfil'}
        </p>
        <Link
          href="/admin/conta"
          onClick={closeMobileMenu}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <UserCircle size={20} className="shrink-0" />
          <span className="truncate">Minha conta</span>
        </Link>
        <Link
          href="/"
          onClick={closeMobileMenu}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <Home size={20} className="shrink-0" />
          <span className="truncate">Ver site</span>
        </Link>
        <button
          type="button"
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors text-left"
        >
          <LogOut size={20} className="shrink-0" />
          Sair
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile: barra superior com botão do menu */}
      <header
        className="fixed top-0 left-0 right-0 h-14 z-40 flex md:hidden items-center gap-3 px-4 bg-slate-900 border-b border-slate-700/80 shadow-lg"
        aria-label="Menu do admin"
      >
        <button
          type="button"
          onClick={() => setOpenMobile(true)}
          className="p-2 -ml-2 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          aria-label="Abrir menu"
        >
          <Menu size={24} />
        </button>
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#c62737] flex items-center justify-center shrink-0">
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
        className="fixed top-0 left-0 bottom-0 z-50 w-64 min-h-screen bg-slate-900 flex flex-col shadow-xl md:hidden transition-transform duration-200 ease-out"
        style={{ transform: openMobile ? 'translateX(0)' : 'translateX(-100%)' }}
        aria-modal="true"
        aria-label="Menu lateral"
      >
        <div className="p-4 flex items-center justify-between border-b border-slate-700/80 shrink-0">
          <Link href="/admin" className="flex items-center gap-2 min-w-0" onClick={closeMobileMenu}>
            <div className="w-9 h-9 rounded-lg bg-[#c62737] flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-white text-lg leading-tight">Admin</h1>
              <p className="text-slate-400 text-xs">Sara Sede Alagoas</p>
            </div>
          </Link>
          <button
            type="button"
            onClick={closeMobileMenu}
            className="p-2 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white shrink-0"
            aria-label="Fechar menu"
          >
            <X size={22} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <nav className="p-3 space-y-0.5">
            <p className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Menu
            </p>
            {visibleLinks.map(({ href, label, icon: Icon }) => {
              const isActive =
                href === '/admin' ? pathname === '/admin' : pathname?.startsWith(href)
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={closeMobileMenu}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-[#c62737] text-white shadow-md'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon size={20} className="shrink-0" />
                  <span className="flex-1 truncate">{label}</span>
                  {isActive && <ChevronRight size={16} className="shrink-0 opacity-80" />}
                </Link>
              )
            })}
            {canViewInstagram && (
              <div className="pt-2">
                <p className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Instagram
                </p>
                {metaLinks.map(({ href, label }) => {
                  const isActive = pathname?.startsWith(href)
                  return (
                    <Link key={href} href={href} onClick={closeMobileMenu} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${isActive ? 'bg-[#c62737] text-white shadow-md' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
                      <Instagram size={18} className="shrink-0" />
                      <span className="flex-1 truncate">{label}</span>
                      {isActive && <ChevronRight size={16} className="shrink-0 opacity-80" />}
                    </Link>
                  )
                })}
                {instagramLinks.map(({ href, label }) => {
                  const isActive = pathname?.startsWith(href)
                  return (
                    <Link key={href} href={href} onClick={closeMobileMenu} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${isActive ? 'bg-[#c62737] text-white shadow-md' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
                      <Instagram size={18} className="shrink-0" />
                      <span className="flex-1 truncate">{label}</span>
                      {isActive && <ChevronRight size={16} className="shrink-0 opacity-80" />}
                    </Link>
                  )
                })}
              </div>
            )}
          </nav>
          <div className="p-3 border-t border-slate-700/80 space-y-0.5">
            <p className="px-3 pb-2 text-xs text-slate-500 truncate" title={access.profileName || ''}>
              Perfil: {access.profileName || 'Sem perfil'}
            </p>
            <Link href="/admin/conta" onClick={closeMobileMenu} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">
              <UserCircle size={20} className="shrink-0" />
              <span className="truncate">Minha conta</span>
            </Link>
            <Link href="/" onClick={closeMobileMenu} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">
              <Home size={20} className="shrink-0" />
              <span className="truncate">Ver site</span>
            </Link>
            <button type="button" onClick={handleSignOut} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors text-left">
              <LogOut size={20} className="shrink-0" />
              Sair
            </button>
          </div>
        </div>
      </aside>

      {/* Desktop: sidebar redimensionável (ou recolhido) */}
      <aside
        className="hidden md:flex flex-col shrink-0 min-h-screen bg-slate-900 shadow-xl relative"
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
              className="absolute top-4 right-2 p-1.5 rounded text-slate-400 hover:bg-slate-800 hover:text-white"
              aria-label="Recolher menu"
            >
              <PanelLeftClose size={18} />
            </button>
            <div
              className="absolute top-0 right-0 bottom-0 w-1.5 cursor-col-resize hover:bg-[#c62737]/50 active:bg-[#c62737] shrink-0"
              onMouseDown={(e) => {
                e.preventDefault()
                setResizing(true)
              }}
              aria-hidden
            />
          </>
        )}
        {collapsed && (
          <div className="flex flex-col items-center py-4 w-full border-r border-slate-700/80">
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              className="p-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
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
