'use client'

import { useCallback, useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
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
  ChevronDown,
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
  const [openMobile, setOpenMobile] = useState(false)
  const [width, setWidth] = useState(DEFAULT_WIDTH)
  const [resizing, setResizing] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [expandedModules, setExpandedModules] = useState<string[]>([])

  useEffect(() => {
    setWidth(getStoredWidth())

    // Auto-expandir módulo atual baseado no pathname
    const currentModule = menuModules.find(m =>
      m.items.some(item => pathname?.startsWith(item.href))
    )
    if (currentModule) {
      setExpandedModules(prev => prev.includes(currentModule.id) ? prev : [...prev, currentModule.id])
    }
  }, [pathname])

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

  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev =>
      prev.includes(moduleId)
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    )
  }

  // Filtrar módulos e itens baseado nas permissões
  const visibleModules = menuModules.map(module => {
    if (module.permission && !access.isAdmin) {
      const hasModulePermission = !!access.permissions[module.permission]?.view
      if (!hasModulePermission) return null
    }

    const visibleItems = module.items.filter(item => {
      if (access.isAdmin) return true
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

  // Encontrar o item ativo (o que tem o match mais longo com o pathname)
  const activeItemHref = useMemo(() => {
    let bestMatch = ''
    visibleModules.forEach(module => {
      module.items.forEach(item => {
        if (item.href === '/admin') {
          if (pathname === '/admin' && bestMatch.length < 6) bestMatch = '/admin'
        } else if (pathname === item.href || pathname?.startsWith(`${item.href}/`)) {
          if (item.href.length > bestMatch.length) {
            bestMatch = item.href
          }
        }
      })
    })
    return bestMatch
  }, [visibleModules, pathname])

  const renderNavItems = (isMobile = false) => (
    <nav className="flex-1 min-h-0 p-4 space-y-2 overflow-y-auto custom-scrollbar">
      {visibleModules.map((module) => {
        const isExpanded = expandedModules.includes(module.id)
        const hasActiveItem = module.items.some(item => item.href === activeItemHref)

        return (
          <div key={module.id} className="space-y-1">
            <button
              onClick={() => toggleModule(module.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${hasActiveItem
                ? 'bg-red-600/10 text-red-500'
                : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
            >
              <module.icon size={20} className="shrink-0" />
              <span className="flex-1 text-left">{module.title}</span>
              <motion.div
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown size={16} />
              </motion.div>
            </button>

            <AnimatePresence initial={false}>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <div className="ml-4 pl-4 border-l border-slate-700/50 space-y-1 mt-1 pb-1">
                    {module.items.map(({ href, label, icon: Icon }) => {
                      const isActive = href === activeItemHref
                      return (
                        <Link
                          key={href}
                          href={href}
                          onClick={isMobile ? closeMobileMenu : undefined}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 ${isActive
                            ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
                            : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
                            }`}
                        >
                          {Icon && <Icon size={16} className="shrink-0" />}
                          <span className="flex-1 truncate">{label}</span>
                        </Link>
                      )
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </nav>
  )

  const sidebarContent = (
    <div className="flex flex-col h-full min-h-0 bg-slate-900 text-slate-300 overflow-hidden">
      {/* Brand */}
      <div className="p-6 border-b border-white/5 shrink-0">
        <Link href="/admin" className="flex items-center gap-3 group" onClick={closeMobileMenu}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shadow-lg shadow-red-600/20 group-hover:scale-105 transition-transform duration-300">
            <span className="text-white font-black text-xl">S</span>
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-white text-lg leading-tight tracking-tight">Mídia Hub</h1>
            <p className="text-red-500/80 text-[10px] font-bold uppercase tracking-[1.5px] mt-0.5">Sara Alagoas</p>
          </div>
        </Link>
      </div>

      {/* Nav */}
      {renderNavItems()}

      {/* Footer */}
      <div className="p-4 mt-auto border-t border-white/5 bg-slate-950/30">
        <Link
          href="/admin/conta"
          className="block px-3 py-3 mb-2 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all group"
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

        <div className="space-y-1">
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium hover:bg-white/5 hover:text-white transition-all"
          >
            <Home size={18} />
            <span>Voltar ao Site</span>
          </Link>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-500 transition-all text-left"
          >
            <LogOut size={18} />
            <span>Sair do Painel</span>
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
          <span className="font-bold text-white text-sm">Mídia Hub</span>
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
                <h1 className="font-bold text-white text-base leading-tight">Mídia Hub</h1>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Dashboard Admin</p>
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

          <div className="p-4 border-t border-white/5 space-y-4">
            <Link
              href="/admin/conta"
              onClick={closeMobileMenu}
              className="block px-4 py-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 active:scale-[0.98] transition-all"
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
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-red-600/10 text-red-500 text-sm font-bold hover:bg-red-600 hover:text-white transition-all shadow-lg shadow-red-600/5"
            >
              <LogOut size={18} />
              <span>Sair do Painel</span>
            </button>
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
            <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center mb-10 shadow-lg shadow-red-600/20">
              <span className="text-white font-black text-xl">S</span>
            </div>
            <button
              onClick={() => setCollapsed(false)}
              className="p-3 rounded-xl text-slate-400 hover:bg-white/5 hover:text-white transition-all"
            >
              <PanelLeft size={24} />
            </button>
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
