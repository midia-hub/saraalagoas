'use client'

import { useCallback, useEffect, useState, useMemo, useRef, type MouseEvent } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { signOutAdmin } from '@/lib/admin-auth-client'
import { useAdminAccess } from '@/lib/admin-access-context'
import { notifyNavigation, completeNavigation, subscribeLoadingOverlayState } from '@/lib/loading-overlay'
import { getModuleRootHref } from '@/lib/admin-module-routes'
import {
  filterVisibleModules,
  findActiveMenuItemHref,
  isModuleNavActive,
} from '@/lib/admin-menu-access'
import { menuModules } from './menu-config'
import { useIsStandalone } from '@/lib/use-is-standalone'
import {
  Home,
  LogOut,
  ChevronRight,
  Menu,
  X,
  PanelLeft,
  Loader2,
} from 'lucide-react'

const SIDEBAR_WIDTH_KEY = 'admin-sidebar-width'
const MIN_WIDTH = 240
const MAX_WIDTH = 400
const DEFAULT_WIDTH = 280

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
  const isStandalone = useIsStandalone()
  const [openMobile, setOpenMobile] = useState(false)
  const [width, setWidth] = useState(DEFAULT_WIDTH)
  const [resizing, setResizing] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [pendingHref, setPendingHref] = useState<string | null>(null)
  const [globalBusy, setGlobalBusy] = useState(false)
  const navFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setWidth(getStoredWidth())
  }, [])

  // Rodando como PWA instalado (ex.: PDV da Livraria): inicia recolhido para poupar espaço.
  useEffect(() => {
    if (isStandalone) setCollapsed(true)
  }, [isStandalone])

  useEffect(() => {
    const unsubscribe = subscribeLoadingOverlayState((state) => {
      setGlobalBusy(state.busy)
    })
    return unsubscribe
  }, [])

  useEffect(() => {
    if (!pendingHref) return
    const t = setTimeout(() => {
      completeNavigation()
    }, 150)
    return () => clearTimeout(t)
  }, [pathname, pendingHref])

  useEffect(() => {
    if (!pendingHref || globalBusy) return
    if (navFallbackTimerRef.current) {
      clearTimeout(navFallbackTimerRef.current)
      navFallbackTimerRef.current = null
    }
    setPendingHref(null)
  }, [pendingHref, globalBusy])

  useEffect(() => {
    return () => {
      if (navFallbackTimerRef.current) {
        clearTimeout(navFallbackTimerRef.current)
      }
    }
  }, [])

  const handleResizeMove = useCallback(
    (e: globalThis.MouseEvent) => {
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
    await signOutAdmin()
    router.replace('/admin/login')
  }

  function closeMobileMenu() {
    setOpenMobile(false)
  }

  function handleMenuClick(href: string, isMobile = false) {
    return (e: MouseEvent<HTMLAnchorElement>) => {
      if (e.defaultPrevented) return
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
      if (isMobile) closeMobileMenu()
      if (pathname === href) return
      notifyNavigation()
      if (navFallbackTimerRef.current) clearTimeout(navFallbackTimerRef.current)
      navFallbackTimerRef.current = setTimeout(() => {
        completeNavigation()
      }, 15000)
      setPendingHref(href)
    }
  }

  // Módulos e itens liberados para este usuário
  const visibleModules = useMemo(
    () => filterVisibleModules(menuModules, access.permissions, access.isAdmin),
    [access.permissions, access.isAdmin]
  )

  const hubModules = useMemo(
    () => visibleModules.filter((m) => m.id !== 'dashboard'),
    [visibleModules]
  )

  // Detecta o módulo ativo pelo match mais longo de basePaths
  const activeModule = useMemo(() => {
    if (!pathname) return null

    let bestMatch: { module: typeof visibleModules[0]; len: number } | null = null

    for (const mod of visibleModules) {
      for (const bp of (mod.basePaths ?? [])) {
        if (
          (pathname === bp || pathname.startsWith(bp + '/')) &&
          bp.length > (bestMatch?.len ?? 0)
        ) {
          bestMatch = { module: mod, len: bp.length }
        }
      }
    }

    // Usa dashboard como fallback para que o sidebar sempre exiba a seção de sub-itens
    return bestMatch?.module ?? visibleModules.find(m => m.id === 'dashboard') ?? null
  }, [visibleModules, pathname])

  // Encontrar o item ativo (o que tem o match mais longo com o pathname)
  const activeItemHref = useMemo(() => {
    const items = activeModule
      ? activeModule.items
      : visibleModules.flatMap((m) => m.items)
    return findActiveMenuItemHref(pathname, items)
  }, [activeModule, visibleModules, pathname])

  const renderNavItems = (isMobile = false) => {
    return (
      <nav className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {/* Módulos liberados — sempre visíveis, exceto no PDV instalado (fica só na Livraria) */}
        {!isStandalone && (
          <div className="px-4 pt-4 pb-2 shrink-0 space-y-1 overflow-y-auto custom-scrollbar max-h-[42vh]">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 px-3 mb-2">
              Módulos disponíveis
            </p>
            {hubModules.length === 0 ? (
              <p className="px-3 text-xs text-slate-500">Nenhum módulo liberado.</p>
            ) : (
              hubModules.map((mod) => {
                const href = getModuleRootHref(mod)
                const isActiveModule = isModuleNavActive(pathname, mod)
                return (
                  <Link
                    key={mod.id}
                    href={href}
                    onClick={handleMenuClick(href, isMobile)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                      isActiveModule
                        ? 'bg-white/10 text-white border border-white/10'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform"
                      style={{ background: mod.color ? `${mod.color}22` : 'rgba(255,255,255,0.05)' }}
                    >
                      <mod.icon size={15} style={{ color: mod.color ?? '#94a3b8' }} />
                    </div>
                    <span className="flex-1 truncate">{mod.title}</span>
                    {isActiveModule ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                    ) : (
                      <ChevronRight size={13} className="opacity-0 group-hover:opacity-60 transition-opacity shrink-0" />
                    )}
                  </Link>
                )
              })
            )}
          </div>
        )}

        {/* Itens do módulo ativo */}
        {activeModule ? (
          <>
            <div className="mx-4 border-t border-white/5 my-2 shrink-0" />
            <div className="px-4 pb-2 shrink-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 px-3 mb-2">
                {activeModule.title}
              </p>
            </div>
            <div className="flex-1 min-h-0 px-4 space-y-1 overflow-y-auto custom-scrollbar pb-4">
              {activeModule.items.map(({ href, label, icon: Icon }) => {
                const isActive = href === activeItemHref
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={handleMenuClick(href, isMobile)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
                    }`}
                  >
                    {Icon && <Icon size={16} className="shrink-0" />}
                    <span className="flex-1 truncate">{label}</span>
                    {pendingHref === href ? (
                      <Loader2 size={13} className="shrink-0 animate-spin opacity-80" aria-hidden />
                    ) : null}
                  </Link>
                )
              })}
            </div>
          </>
        ) : null}
      </nav>
    )
  }

  const sidebarContent = (
    <div className="flex flex-col h-full min-h-0 bg-slate-900 text-slate-300 overflow-hidden">
      {/* Brand */}
      <div className="p-6 border-b border-white/5 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <Link href="/admin" className="flex items-center gap-3 group min-w-0" onClick={closeMobileMenu}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shadow-lg shadow-red-600/20 group-hover:scale-105 transition-transform duration-300 shrink-0 p-1.5">
              <Image
                src="/favicon.png"
                alt="Logo"
                width={40}
                height={40}
                className="w-full h-full object-contain brightness-0 invert"
              />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-white text-lg leading-tight tracking-tight">Sara Hub</h1>
              <p className="text-red-500/80 text-[10px] font-bold uppercase tracking-[1.5px] mt-0.5">Sara Alagoas</p>
            </div>
          </Link>
          <Link
            href="/"
            title="Voltar ao Site"
            className="p-2 rounded-xl text-slate-400 hover:bg-white/5 hover:text-white transition-all shrink-0"
          >
            <Home size={18} />
          </Link>
        </div>
      </div>

      {/* Nav */}
      {renderNavItems()}

      {/* Footer */}
      <div className="p-4 mt-auto border-t border-white/5 bg-slate-950/30">
        <div className="flex items-center gap-2">
          <Link
            href="/admin/conta"
            className="flex-1 min-w-0 px-3 py-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl overflow-hidden bg-slate-700 flex items-center justify-center text-xs font-bold text-white shrink-0 group-hover:scale-105 transition-transform">
                {access.avatarUrl ? (
                  <img src={access.avatarUrl} alt={access.profileName} className="w-full h-full object-cover" />
                ) : (
                  access.profileName?.charAt(0).toUpperCase() || 'U'
                )}
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-white truncate leading-none mb-1 group-hover:text-red-400 transition-colors uppercase tracking-tight">{access.profileName || 'Usuário'}</p>
                <p className="text-[10px] text-slate-400 truncate capitalize leading-none tracking-wider">{access.roleName || 'Perfil'}</p>
              </div>
            </div>
          </Link>
          <button
            onClick={handleSignOut}
            title="Sair do Painel"
            className="p-2.5 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-500 transition-all shrink-0"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile: Header */}
      <header className="fixed top-0 left-0 right-0 h-16 z-40 flex md:hidden items-center justify-between px-4 bg-slate-900 border-b border-white/5 shadow-xl">
        <button
          onClick={() => setOpenMobile(true)}
          className="p-2.5 rounded-xl bg-white/5 text-white hover:bg-white/10 transition-colors"
        >
          <Menu size={22} />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">S</span>
          </div>
          <span className="font-bold text-white text-sm">
            {activeModule ? activeModule.title : 'Sara Hub'}
          </span>
        </div>
        <div className="w-10" /> {/* Spacer */}
      </header>

      {/* Mobile: Drawer */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-50 md:hidden transition-opacity duration-300 ${openMobile ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        onClick={closeMobileMenu}
      />

      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-72 bg-slate-900 shadow-2xl md:hidden transition-transform duration-300 ease-out ${openMobile ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        <div className="flex flex-col h-full min-h-0">
          <div className="p-6 flex items-center justify-between border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-600 flex items-center justify-center">
                <span className="text-white font-bold text-lg">S</span>
              </div>
              <div>
                <h1 className="font-bold text-white text-base leading-tight">Sara Hub</h1>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                  {activeModule ? activeModule.title : 'Selecionar Módulo'}
                </p>
              </div>
            </div>
            <button
              onClick={closeMobileMenu}
              className="p-2 rounded-lg text-slate-400 hover:bg-white/5 hover:text-white transition-all"
            >
              <X size={20} />
            </button>
          </div>
          {renderNavItems(true)}

          <div className="p-4 border-t border-white/5">
            <div className="flex items-center gap-2">
              <Link
                href="/admin/conta"
                onClick={closeMobileMenu}
                className="flex-1 min-w-0 px-4 py-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 active:scale-[0.98] transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-700 flex items-center justify-center text-sm font-bold text-white shrink-0">
                    {access.avatarUrl ? (
                      <img src={access.avatarUrl} alt={access.profileName} className="w-full h-full object-cover" />
                    ) : (
                      access.profileName?.charAt(0).toUpperCase() || 'U'
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[14px] font-bold text-white truncate leading-none mb-1.5 uppercase tracking-tight">{access.profileName || 'Usuário'}</p>
                    <p className="text-[11px] text-slate-400 truncate capitalize leading-none tracking-wider">{access.roleName || 'Perfil'}</p>
                  </div>
                </div>
              </Link>
              <button
                title="Sair do Painel"
                onClick={handleSignOut}
                className="p-3 rounded-2xl text-red-500 hover:bg-red-600/10 transition-all shrink-0"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Desktop: Sidebar */}
      <aside
        className="hidden md:flex flex-col shrink-0 h-screen sticky top-0 min-h-0 transition-all duration-300 ease-in-out border-r border-white/5"
        style={{ width: collapsed ? 80 : width }}
      >
        {!collapsed ? (
          <>
            <div className="flex-1 min-h-0 flex flex-col min-w-0">{sidebarContent}</div>
            <button
              onClick={() => setCollapsed(true)}
              className="absolute top-6 -right-3 h-6 w-6 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-red-600 hover:border-red-600 transition-all shadow-xl z-20"
            >
              <ChevronRight size={14} className="rotate-180" />
            </button>
            <div
              className="absolute top-0 right-0 bottom-0 w-1 cursor-col-resize hover:bg-red-600/40 active:bg-red-600 transition-colors"
              onMouseDown={(e) => {
                e.preventDefault()
                setResizing(true)
              }}
            />
          </>
        ) : (
          <div className="flex flex-col items-center py-6 w-full h-full bg-slate-900">
            <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center mb-6 shadow-lg shadow-red-600/20 shrink-0">
              <span className="text-white font-black text-xl">S</span>
            </div>
            <button
              onClick={() => setCollapsed(false)}
              className="p-3 rounded-xl text-slate-400 hover:bg-white/5 hover:text-white transition-all shrink-0 mb-4"
            >
              <PanelLeft size={24} />
            </button>
            {activeModule ? (
              <div className="flex-1 min-h-0 w-full flex flex-col items-center gap-1.5 overflow-y-auto custom-scrollbar px-2">
                {activeModule.items.map(({ href, label, icon: Icon }) => {
                  const isActive = href === activeItemHref
                  return (
                    <Link
                      key={href}
                      href={href}
                      title={label}
                      onClick={handleMenuClick(href)}
                      className={`w-11 h-11 shrink-0 rounded-xl flex items-center justify-center transition-all duration-200 ${
                        isActive
                          ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
                          : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
                      }`}
                    >
                      {Icon && <Icon size={19} />}
                    </Link>
                  )
                })}
              </div>
            ) : null}
            <div className="mt-auto space-y-4 pb-6">
              <button
                onClick={handleSignOut}
                className="p-3 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-500 transition-all"
              >
                <LogOut size={22} />
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  )
}
