'use client'

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
} from 'lucide-react'

const primaryLinks = [
  { href: '/admin', label: 'Início', icon: LayoutDashboard, permission: 'dashboard' },
  { href: '/admin/configuracoes', label: 'Configurações do site', icon: Settings, permission: 'configuracoes' },
  { href: '/admin/usuarios', label: 'Usuários e perfis', icon: Users, permission: 'usuarios' },
  { href: '/admin/upload', label: 'Upload', icon: Upload, permission: 'upload' },
  { href: '/admin/galeria', label: 'Galeria', icon: ImageIcon, permission: 'galeria' },
] as const

const instagramLinks = [
  { href: '/admin/instagram/instances', label: 'Instâncias' },
  { href: '/admin/instagram/posts', label: 'Painel de publicações' },
] as const

const metaLinks = [
  { href: '/admin/instancias', label: 'Instâncias (Meta)' },
] as const

export function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const access = useAdminAccess()

  async function handleSignOut() {
    await supabase?.auth.signOut()
    document.cookie = 'admin_access=; path=/; max-age=0'
    router.replace('/admin/login')
  }

  const visibleLinks = primaryLinks.filter((link) => {
    if (access.isAdmin) return true
    return !!access.permissions[link.permission]?.view
  })

  const canViewInstagram = access.isAdmin || !!access.permissions.instagram?.view

  return (
    <aside className="w-64 min-h-screen bg-slate-900 flex flex-col shadow-xl">
      {/* Brand */}
      <div className="p-5 border-b border-slate-700/80">
        <Link href="/admin" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-[#c62737] flex items-center justify-center">
            <span className="text-white font-bold text-sm">S</span>
          </div>
          <div>
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
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-[#c62737] text-white shadow-md'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon size={20} className="shrink-0" />
              <span className="flex-1">{label}</span>
              {isActive && <ChevronRight size={16} className="shrink-0 opacity-80" />}
            </Link>
          )
        })}
        {canViewInstagram && (
          <div className="pt-2">
            <p className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Instagram
            </p>
            {instagramLinks.map(({ href, label }) => {
              const isActive = pathname?.startsWith(href)
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-[#c62737] text-white shadow-md'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Instagram size={18} className="shrink-0" />
                  <span className="flex-1">{label}</span>
                  {isActive && <ChevronRight size={16} className="shrink-0 opacity-80" />}
                </Link>
              )
            })}
            {metaLinks.map(({ href, label }) => {
              const isActive = pathname?.startsWith(href)
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-[#c62737] text-white shadow-md'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Instagram size={18} className="shrink-0" />
                  <span className="flex-1">{label}</span>
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
          href="/"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <Home size={20} className="shrink-0" />
          Ver site
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
    </aside>
  )
}
