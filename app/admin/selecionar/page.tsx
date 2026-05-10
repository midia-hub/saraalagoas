'use client'

import { useMemo, useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAdminAccess } from '@/lib/admin-access-context'
import { menuModules } from '@/app/admin/menu-config'
import { LogOut, Home, Settings, Star, ChevronRight } from 'lucide-react'

const PINNED_KEY = 'sara_pinned_modules'
const RECENT_KEY = 'sara_recent_modules'

export default function SelecionarModuloPage() {
  const access = useAdminAccess()
  const router = useRouter()
  const [pinned, setPinned] = useState<string[]>([])
  const [recents, setRecents] = useState<string[]>([])

  useEffect(() => {
    try {
      setPinned(JSON.parse(localStorage.getItem(PINNED_KEY) ?? '[]'))
      setRecents(JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]'))
    } catch {}
  }, [])

  async function handleSignOut() {
    await supabase?.auth.signOut()
    document.cookie = 'admin_access=; path=/; max-age=0'
    router.replace('/admin/login')
  }

  function togglePin(e: React.MouseEvent, moduleId: string) {
    e.preventDefault()
    e.stopPropagation()
    setPinned(prev => {
      const next = prev.includes(moduleId)
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId].slice(0, 5)
      localStorage.setItem(PINNED_KEY, JSON.stringify(next))
      return next
    })
  }

  function trackRecent(moduleId: string) {
    setRecents(prev => {
      const next = [moduleId, ...prev.filter(id => id !== moduleId)].slice(0, 3)
      localStorage.setItem(RECENT_KEY, JSON.stringify(next))
      return next
    })
  }

  const visibleModules = useMemo(() => {
    return menuModules
      .filter(m => m.id !== 'dashboard')
      .filter(m => {
        if (access.isAdmin) return true
        if (!m.permission) return true
        return !!access.permissions[m.permission]?.view
      })
  }, [access])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'
  const firstName = access.profileName?.split(' ')[0] ?? 'Líder'

  const pinnedModules = visibleModules.filter(m => pinned.includes(m.id))
  const recentModules = visibleModules
    .filter(m => recents.includes(m.id) && !pinned.includes(m.id))
    .sort((a, b) => recents.indexOf(a.id) - recents.indexOf(b.id))
    .slice(0, 3)

  return (
    <div className="fixed inset-0 bg-slate-900 flex">

      {/* ── Sidebar (md+) ── */}
      <aside className="hidden md:flex w-52 flex-col flex-shrink-0 bg-slate-950 border-r border-white/[0.06] py-4 px-3">

        {/* Brand */}
        <Link
          href="/admin/selecionar"
          className="flex items-center gap-3 pb-4 border-b border-white/[0.06] mb-4 px-1 group"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center flex-shrink-0 shadow-lg shadow-red-700/20 group-hover:scale-105 transition-transform p-1.5">
            <Image
              src="/favicon.png"
              alt="Logo"
              width={32}
              height={32}
              className="w-full h-full object-contain brightness-0 invert"
            />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-100 leading-tight">Sara Hub</p>
            <p className="text-[10px] text-red-500 font-semibold tracking-wide uppercase">Alagoas</p>
          </div>
        </Link>

        {/* User */}
        <Link
          href="/admin/conta"
          className="flex items-center gap-2.5 px-2 py-2 rounded-xl bg-white/[0.04] border border-white/[0.05] hover:bg-white/[0.07] transition-colors mb-5 group"
        >
          <div className="w-8 h-8 rounded-lg bg-slate-700 overflow-hidden flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
            {access.avatarUrl ? (
              <img src={access.avatarUrl} alt={access.profileName} className="w-full h-full object-cover" />
            ) : (
              <span>{access.profileName?.charAt(0).toUpperCase() || 'U'}</span>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-100 truncate group-hover:text-red-400 transition-colors">
              {access.profileName?.split(' ')[0] || 'Usuário'}
            </p>
            <p className="text-[10px] text-slate-500 capitalize truncate">{access.roleName || 'Perfil'}</p>
          </div>
        </Link>

        {/* Pinned */}
        {pinnedModules.length > 0 && (
          <div className="mb-2">
            <p className="text-[10px] uppercase tracking-widest text-slate-600 font-semibold px-1 mb-2">
              ⭐ Fixados
            </p>
            {pinnedModules.map(mod => {
              const Icon = mod.icon
              const href = mod.mainHref ?? mod.items[0]?.href ?? '/admin'
              return (
                <Link
                  key={mod.id}
                  href={href}
                  onClick={() => trackRecent(mod.id)}
                  className="flex items-center gap-2.5 w-full px-2 py-2 rounded-lg hover:bg-white/[0.05] transition-colors mb-0.5 group/item"
                >
                  <div
                    className="w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center"
                    style={{ background: mod.color ? `${mod.color}30` : 'rgba(255,255,255,0.08)' }}
                  >
                    <Icon size={12} style={{ color: mod.color ?? '#94a3b8' }} />
                  </div>
                  <span className="text-xs text-slate-300 font-medium truncate flex-1">
                    {mod.title}
                  </span>
                  <Star size={10} className="text-amber-400 flex-shrink-0" fill="currentColor" />
                </Link>
              )
            })}
          </div>
        )}

        {pinnedModules.length > 0 && recentModules.length > 0 && (
          <div className="h-px bg-white/[0.05] mx-1 my-2" />
        )}

        {/* Recents */}
        {recentModules.length > 0 && (
          <div className="mb-2">
            <p className="text-[10px] uppercase tracking-widest text-slate-600 font-semibold px-1 mb-2">
              🕐 Recentes
            </p>
            {recentModules.map(mod => {
              const Icon = mod.icon
              const href = mod.mainHref ?? mod.items[0]?.href ?? '/admin'
              return (
                <Link
                  key={mod.id}
                  href={href}
                  onClick={() => trackRecent(mod.id)}
                  className="flex items-center gap-2.5 w-full px-2 py-2 rounded-lg hover:bg-white/[0.05] transition-colors mb-0.5"
                >
                  <div
                    className="w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center"
                    style={{ background: mod.color ? `${mod.color}20` : 'rgba(255,255,255,0.06)' }}
                  >
                    <Icon size={12} style={{ color: mod.color ?? '#94a3b8' }} />
                  </div>
                  <span className="text-xs text-slate-400 truncate">{mod.title}</span>
                </Link>
              )
            })}
          </div>
        )}

        {/* Footer actions */}
        <div className="mt-auto pt-3 border-t border-white/[0.05] flex flex-col gap-0.5">
          <Link
            href="/"
            className="flex items-center gap-2.5 px-2 py-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/[0.04] transition-all text-xs"
          >
            <Home size={14} />
            <span>Ver site</span>
          </Link>
          <Link
            href="/admin/conta"
            className="flex items-center gap-2.5 px-2 py-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/[0.04] transition-all text-xs"
          >
            <Settings size={14} />
            <span>Minha conta</span>
          </Link>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2.5 px-2 py-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/[0.08] transition-all w-full text-xs"
          >
            <LogOut size={14} />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* ── Mobile header (< md) ── */}
      <div className="md:hidden fixed top-0 inset-x-0 z-10 flex items-center justify-between px-4 py-3 bg-slate-950 border-b border-white/[0.06]">
        <Link href="/admin/selecionar" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center p-1.5">
            <Image
              src="/favicon.png"
              alt="Logo"
              width={32}
              height={32}
              className="w-full h-full object-contain brightness-0 invert"
            />
          </div>
          <span className="font-bold text-sm text-white">Sara Hub</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/conta"
            className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center text-xs font-bold text-white overflow-hidden"
          >
            {access.avatarUrl ? (
              <img src={access.avatarUrl} alt={access.profileName} className="w-full h-full object-cover" />
            ) : (
              <span>{access.profileName?.charAt(0).toUpperCase() || 'U'}</span>
            )}
          </Link>
          <button
            onClick={handleSignOut}
            className="p-2 text-slate-500 hover:text-red-400 transition-colors"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-y-auto pt-[52px] md:pt-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <main className="flex-1 px-6 md:px-10 py-8 max-w-5xl w-full mx-auto">

          {/* Greeting */}
          <div className="mb-8">
            <p className="text-slate-500 text-sm mb-1">{greeting},</p>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">{firstName}!</h1>
            <p className="text-slate-500 text-sm mt-2">Selecione um módulo para começar.</p>
          </div>

          {/* Grid */}
          {visibleModules.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mb-4">
                <Home size={28} className="text-slate-600" />
              </div>
              <p className="text-slate-400 font-medium">Nenhum módulo disponível</p>
              <p className="text-slate-600 text-sm mt-1">Entre em contato com o administrador para obter acesso.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {visibleModules.map((mod) => {
                const Icon = mod.icon
                const href = mod.mainHref ?? mod.items[0]?.href ?? '/admin'
                const isPinned = pinned.includes(mod.id)

                return (
                  <Link
                    key={mod.id}
                    href={href}
                    onClick={() => trackRecent(mod.id)}
                    className="group relative bg-slate-800/50 border border-white/[0.07] rounded-2xl p-5 flex flex-col gap-4 hover:border-white/[0.14] hover:bg-slate-800 transition-all duration-200 overflow-hidden"
                  >
                    {/* glow */}
                    <div
                      className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-0 group-hover:opacity-[0.08] transition-opacity duration-300 pointer-events-none -translate-y-1/2 translate-x-1/2 blur-2xl"
                      style={{ background: mod.color ?? '#ffffff' }}
                    />

                    {/* pin button */}
                    <button
                      onClick={(e) => togglePin(e, mod.id)}
                      title={isPinned ? 'Desafixar' : 'Fixar no sidebar'}
                      className={`absolute top-4 right-4 w-7 h-7 rounded-lg flex items-center justify-center transition-all z-10
                        ${isPinned
                          ? 'opacity-100 bg-amber-400/10 text-amber-400'
                          : 'opacity-0 group-hover:opacity-100 bg-white/[0.06] text-slate-500 hover:bg-amber-400/10 hover:text-amber-400'
                        }`}
                    >
                      <Star size={13} fill={isPinned ? 'currentColor' : 'none'} />
                    </button>

                    {/* icon */}
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-105"
                      style={{ background: mod.color ? `${mod.color}22` : 'rgba(255,255,255,0.06)' }}
                    >
                      <Icon size={22} style={{ color: mod.color ?? '#94a3b8' }} />
                    </div>

                    {/* text */}
                    <div className="flex-1 min-w-0 pr-4">
                      <p className="font-bold text-white text-base leading-tight">{mod.title}</p>
                      {mod.description && (
                        <p className="text-sm text-slate-500 mt-1 leading-snug group-hover:text-slate-400 transition-colors">
                          {mod.description}
                        </p>
                      )}
                    </div>

                    {/* sub-items */}
                    {mod.items.length > 1 && (
                      <div className="flex items-center justify-between pt-3 border-t border-white/[0.05]">
                        <div className="flex flex-wrap gap-x-0">
                          {mod.items.slice(0, 3).map((item, i, arr) => (
                            <span key={item.href} className="text-xs text-slate-600 group-hover:text-slate-500 transition-colors">
                              {item.label}{i < arr.length - 1 ? ' · ' : ''}
                            </span>
                          ))}
                          {mod.items.length > 3 && (
                            <span className="text-xs text-slate-600">&nbsp;+{mod.items.length - 3}</span>
                          )}
                        </div>
                        <ChevronRight
                          size={15}
                          className="text-slate-600 group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all flex-shrink-0"
                        />
                      </div>
                    )}
                  </Link>
                )
              })}
            </div>
          )}
        </main>

        <footer className="px-6 md:px-10 py-4 border-t border-white/[0.05]">
          <p className="text-xs text-slate-700">Sara Nossa Terra — Plataforma de Gestão · {new Date().getFullYear()}</p>
        </footer>
      </div>

    </div>
  )
}
