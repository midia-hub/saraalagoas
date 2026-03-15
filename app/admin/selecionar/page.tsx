'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAdminAccess } from '@/lib/admin-access-context'
import { menuModules } from '@/app/admin/menu-config'
import { LogOut, Home, ChevronRight } from 'lucide-react'

export default function SelecionarModuloPage() {
  const access = useAdminAccess()
  const router = useRouter()

  async function handleSignOut() {
    await supabase?.auth.signOut()
    document.cookie = 'admin_access=; path=/; max-age=0'
    router.replace('/admin/login')
  }

  // Módulos visíveis baseado nas permissões (exclui dashboard)
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

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">

      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        {/* Brand */}
        <Link href="/admin/selecionar" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shadow-lg shadow-red-700/30 group-hover:scale-105 transition-transform p-1.5">
            <Image
              src="/favicon.png"
              alt="Logo"
              width={36}
              height={36}
              className="w-full h-full object-contain brightness-0 invert"
            />
          </div>
          <div>
            <p className="font-bold text-white text-sm leading-tight">Sara Hub</p>
            <p className="text-red-500/70 text-[10px] font-bold uppercase tracking-[1.5px]">Sara Alagoas</p>
          </div>
        </Link>

        {/* User + actions */}
        <div className="flex items-center gap-2">
          <Link
            href="/"
            title="Voltar ao site"
            className="p-2 rounded-xl text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all text-sm hidden sm:flex items-center gap-1.5"
          >
            <Home size={16} />
            <span className="text-xs font-medium">Ver site</span>
          </Link>

          <Link
            href="/admin/conta"
            className="flex items-center gap-2.5 pl-2 pr-3 py-2 rounded-xl hover:bg-white/5 transition-all group"
          >
            <div className="w-7 h-7 rounded-lg overflow-hidden bg-slate-700 flex items-center justify-center text-xs font-bold text-white shrink-0">
              {access.avatarUrl ? (
                <img src={access.avatarUrl} alt={access.profileName} className="w-full h-full object-cover" />
              ) : (
                <span>{access.profileName?.charAt(0).toUpperCase() || 'U'}</span>
              )}
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-bold text-white leading-tight group-hover:text-red-400 transition-colors uppercase tracking-tight">{access.profileName || 'Usuário'}</p>
              <p className="text-[10px] text-slate-500 capitalize leading-tight">{access.roleName || 'Perfil'}</p>
            </div>
          </Link>

          <button
            onClick={handleSignOut}
            title="Sair"
            className="p-2 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col px-6 py-10 max-w-5xl mx-auto w-full">

        {/* Saudação */}
        <div className="mb-10">
          <p className="text-slate-500 text-sm mb-1">{greeting},</p>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">{firstName}!</h1>
          <p className="text-slate-400 text-sm mt-2">Selecione o módulo que deseja acessar.</p>
        </div>

        {/* Grid de módulos */}
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

              return (
                <Link
                  key={mod.id}
                  href={href}
                  className="group relative bg-slate-900 border border-white/[0.06] rounded-2xl p-6 flex flex-col gap-4 hover:border-white/[0.14] hover:bg-slate-800/60 transition-all duration-200 overflow-hidden"
                >
                  {/* Glow de fundo */}
                  <div
                    className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-0 group-hover:opacity-10 transition-opacity duration-300 pointer-events-none -translate-y-1/2 translate-x-1/2 blur-2xl"
                    style={{ background: mod.color ?? '#ffffff' }}
                  />

                  {/* Ícone */}
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105"
                    style={{ background: mod.color ? `${mod.color}22` : 'rgba(255,255,255,0.06)' }}
                  >
                    <Icon size={22} style={{ color: mod.color ?? '#94a3b8' }} />
                  </div>

                  {/* Texto */}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white text-base leading-tight group-hover:text-white transition-colors">
                      {mod.title}
                    </p>
                    {mod.description && (
                      <p className="text-sm text-slate-500 mt-1 leading-snug group-hover:text-slate-400 transition-colors">
                        {mod.description}
                      </p>
                    )}
                  </div>

                  {/* Seta */}
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1.5 flex-wrap">
                      {mod.items.slice(0, 3).map(item => (
                        <span
                          key={item.href}
                          className="text-[10px] font-medium text-slate-600 group-hover:text-slate-500 transition-colors"
                        >
                          {item.label}{mod.items.indexOf(item) < Math.min(mod.items.length, 3) - 1 ? ' ·' : ''}
                        </span>
                      ))}
                      {mod.items.length > 3 && (
                        <span className="text-[10px] font-medium text-slate-600">+{mod.items.length - 3}</span>
                      )}
                    </div>
                    <ChevronRight
                      size={16}
                      className="text-slate-600 group-hover:text-slate-300 group-hover:translate-x-0.5 transition-all shrink-0"
                      style={{ color: mod.color ? `${mod.color}80` : undefined }}
                    />
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 border-t border-white/5 text-center">
        <p className="text-[11px] text-slate-700">Sara Nossa Terra — Plataforma de Gestão · {new Date().getFullYear()}</p>
      </footer>
    </div>
  )
}
