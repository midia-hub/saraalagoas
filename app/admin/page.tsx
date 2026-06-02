'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronRight, Clock, AlertCircle, UsersRound } from 'lucide-react'
import { useAdminAccess } from '@/lib/admin-access-context'
import { adminFetchJson } from '@/lib/admin-client'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { menuModules } from '@/app/admin/menu-config'
import { getModuleRootHref } from '@/lib/admin-module-routes'
import { filterVisibleModules } from '@/lib/admin-menu-access'

type HomeContext = {
  myCells: { id: string; name: string; dayLabel: string; timeOfDay: string | null }[]
  pendingFollowups: number
}

export default function AdminPage() {
  const access = useAdminAccess()
  const [homeCtx, setHomeCtx] = useState<HomeContext | null>(null)

  useEffect(() => {
    adminFetchJson<HomeContext>('/api/admin/home/context')
      .then(setHomeCtx)
      .catch(() => setHomeCtx({ myCells: [], pendingFollowups: 0 }))
  }, [])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'
  const dateStr = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long',
  }).format(new Date())

  const name = access.profileName?.split(' ')[0] ?? 'Líder'

  const visibleModules = filterVisibleModules(
    menuModules,
    access.permissions,
    access.isAdmin
  ).filter((m) => m.id !== 'dashboard' && m.id !== 'configuracoes')

  const badges: Record<string, number> = {}
  if (homeCtx?.pendingFollowups && homeCtx.pendingFollowups > 0) {
    badges['consolidacao'] = homeCtx.pendingFollowups
  }

  return (
    <PageAccessGuard pageKey="dashboard">
      <div className="min-h-full bg-slate-50">

        {/* ── Hero ── */}
        <div
          className="px-6 py-8 sm:px-10 sm:py-10 relative overflow-hidden"
          style={{ background: 'linear-gradient(130deg, #9E1C22 0%, #C4232A 55%, #D84048 100%)' }}
        >
          <span className="absolute -right-10 -top-12 w-52 h-52 rounded-full bg-white/[0.05] pointer-events-none" />
          <span className="absolute right-32 -bottom-16 w-40 h-40 rounded-full bg-white/[0.04] pointer-events-none" />
          <div className="relative z-10">
            <p className="text-sm text-white/55 capitalize mb-1">{dateStr}</p>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
              {greeting}, {name}!
            </h1>
            <p className="text-sm text-white/50 mt-1 font-light">{access.roleName || 'Membro'}</p>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-8 py-7 space-y-7">

          {/* ── Minha(s) célula(s) ── */}
          {homeCtx && homeCtx.myCells.length > 0 && (
            <div className="space-y-2">
              {homeCtx.myCells.map((cell) => (
                <Link
                  key={cell.id}
                  href={`/admin/celulas/${cell.id}`}
                  className="flex items-center justify-between gap-4 p-4 bg-white rounded-2xl border border-blue-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                      <UsersRound size={20} className="text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-0.5">Minha Célula</p>
                      <p className="text-sm font-bold text-slate-800 truncate">{cell.name}</p>
                      {(cell.dayLabel || cell.timeOfDay) && (
                        <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                          <Clock size={11} />
                          {cell.dayLabel}{cell.timeOfDay ? ` às ${cell.timeOfDay}` : ''}
                        </p>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-blue-400 shrink-0" />
                </Link>
              ))}
            </div>
          )}

          {/* ── Pendências ── */}
          {homeCtx && homeCtx.pendingFollowups > 0 && (
            <Link
              href="/admin/consolidacao/acompanhamento"
              className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <AlertCircle size={16} className="text-red-500 shrink-0" />
                <p className="text-sm font-medium text-slate-700">Acompanhamentos pendentes</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-sm font-bold text-red-600">{homeCtx.pendingFollowups}</span>
                <ChevronRight size={14} className="text-red-400" />
              </div>
            </Link>
          )}

          {/* ── Módulos ── */}
          {visibleModules.length > 0 ? (
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400 mb-4">
                Módulos disponíveis
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {visibleModules.map((mod) => {
                  const href = getModuleRootHref(mod)
                  const badge = badges[mod.id]
                  const Icon = mod.icon
                  const iconBg = mod.color ? `${mod.color}18` : '#f1f5f9'
                  return (
                    <Link
                      key={mod.id}
                      href={href}
                      className="relative group flex flex-col gap-3 p-4 sm:p-5 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 active:scale-[0.98] transition-all"
                    >
                      {badge != null && badge > 0 && (
                        <span className="absolute top-3 right-3 min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
                          {badge > 99 ? '99+' : badge}
                        </span>
                      )}
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: iconBg }}
                      >
                        <Icon size={22} style={{ color: mod.color ?? '#64748b' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 leading-snug">{mod.title}</p>
                        {mod.description && (
                          <p className="text-xs text-slate-400 mt-1 leading-snug line-clamp-2">
                            {mod.description}
                          </p>
                        )}
                      </div>
                      <ChevronRight
                        size={14}
                        className="absolute bottom-4 right-4 text-slate-300 group-hover:text-slate-400 transition-colors"
                      />
                    </Link>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
              <p className="text-slate-600 font-semibold">Nenhum módulo disponível</p>
              <p className="text-sm text-slate-400">Entre em contato com o administrador para obter acesso.</p>
            </div>
          )}

        </div>
      </div>
    </PageAccessGuard>
  )
}
