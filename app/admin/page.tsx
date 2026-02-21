'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Settings,
  Users,
  Upload,
  Image as ImageIcon,
  Instagram,
  Link2,
  LayoutDashboard,
  ClipboardList,
  BarChart3,
  Heart,
  PersonStanding,
  BookOpen,
  Church,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Camera,
  ShoppingCart,
} from 'lucide-react'
import { useAdminAccess } from '@/lib/admin-access-context'
import { adminFetchJson } from '@/lib/admin-client'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'

// ────────────────────────────────────────────────────────────────────────────
// Tipos
// ────────────────────────────────────────────────────────────────────────────
type DashboardStats = {
  consolidacao?: { conversoes_mes: number | null; acompanhamentos_pendentes: number | null }
  pessoas?: { total: number | null; novos_mes: number | null }
  celulas?: { celulas_ativas: number | null; total_membros: number | null }
  revisao_vidas?: { eventos_ativos: number | null; inscricoes_30d: number | null }
  livraria?: { vendas_mes: number | null; receita_mes: number | null; produtos_estoque_baixo: number | null }
  galeria?: { total_galerias: number | null; total_fotos: number | null }
  usuarios?: { total_usuarios: number | null }
  instagram?: { integracoes_ativas: number | null }
  cultos?: { presencas_hoje: number | null; cultos_ativos: number | null }
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────
function fmt(n: number | null | undefined, fallback = '—') {
  if (n === null || n === undefined) return fallback
  return n.toLocaleString('pt-BR')
}

function fmtCurrency(n: number | null | undefined) {
  if (n === null || n === undefined) return '—'
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function StatCard({
  label,
  value,
  sub,
  accent = false,
  warn = false,
}: {
  label: string
  value: string
  sub?: string
  accent?: boolean
  warn?: boolean
}) {
  return (
    <div
      className={`rounded-xl p-4 flex flex-col gap-1 border ${
        warn
          ? 'bg-amber-50 border-amber-200'
          : accent
          ? 'bg-[#c62737]/5 border-[#c62737]/20'
          : 'bg-white border-slate-100'
      }`}
    >
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide leading-none">{label}</p>
      <p className={`text-2xl font-bold leading-none mt-1 ${warn ? 'text-amber-600' : 'text-slate-900'}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="rounded-xl p-4 border border-slate-100 bg-white animate-pulse flex flex-col gap-2">
      <div className="h-3 w-20 bg-slate-200 rounded" />
      <div className="h-7 w-16 bg-slate-200 rounded" />
    </div>
  )
}

function QuickLink({ href, label, external }: { href: string; label: string; external?: boolean }) {
  return (
    <Link
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      className="inline-flex items-center gap-1 text-sm text-[#c62737] hover:underline font-medium"
    >
      {label}
      <ArrowRight size={13} />
    </Link>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Componente de módulo
// ────────────────────────────────────────────────────────────────────────────
function ModuleCard({
  icon: Icon,
  title,
  color,
  loading,
  children,
  links,
}: {
  icon: React.ElementType
  title: string
  color: string
  loading: boolean
  children: React.ReactNode
  links: { href: string; label: string; external?: boolean }[]
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header do módulo */}
      <div className={`flex items-center gap-3 px-5 py-4 border-b border-slate-100`}>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
          <Icon size={18} className="text-white" />
        </div>
        <h2 className="font-semibold text-slate-800 text-sm">{title}</h2>
      </div>

      {/* Stats grid */}
      <div className="p-4 grid grid-cols-2 gap-3">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          children
        )}
      </div>

      {/* Quick links */}
      {links.length > 0 && (
        <div className="px-5 pb-4 flex flex-wrap gap-x-4 gap-y-1">
          {links.map((l) => (
            <QuickLink key={l.href} {...l} />
          ))}
        </div>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Página principal
// ────────────────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const access = useAdminAccess()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  const can = (...keys: string[]) =>
    access.isAdmin || keys.some((k) => !!(access.permissions[k]?.view || access.permissions[k]?.manage))

  useEffect(() => {
    adminFetchJson<DashboardStats>('/api/admin/dashboard/stats')
      .then((data) => setStats(data))
      .catch(() => setStats({}))
      .finally(() => setLoading(false))
  }, [])

  // Saudação por hora
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'
  const dateStr = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(
    new Date()
  )

  const name = access.displayName?.split(' ')[0] ?? 'Líder'

  return (
    <PageAccessGuard pageKey="dashboard">
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-7xl mx-auto p-5 md:p-8 space-y-6">

          {/* ── Hero ─────────────────────────────────────────── */}
          <div className="rounded-2xl bg-gradient-to-br from-[#c62737] to-[#a01f2d] text-white p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-4 shadow-md">
            <div className="flex-1">
              <p className="text-sm font-medium text-white/70 capitalize">{dateStr}</p>
              <h1 className="text-2xl md:text-3xl font-bold mt-1">
                {greeting}, {name}! 👋
              </h1>
              <p className="text-white/70 text-sm mt-1">Aqui está um resumo da plataforma Sara Sede Alagoas.</p>
            </div>
            <div className="hidden md:flex w-16 h-16 rounded-2xl bg-white/10 items-center justify-center">
              <LayoutDashboard size={32} className="text-white/80" />
            </div>
          </div>

          {/* ── Grid de módulos ──────────────────────────────── */}
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">

            {/* CONSOLIDAÇÃO */}
            {can('consolidacao') && (
              <ModuleCard
                icon={Heart}
                title="Consolidação"
                color="bg-rose-500"
                loading={loading}
                links={[
                  { href: '/admin/consolidacao', label: 'Ver consolidações' },
                ]}
              >
                <StatCard
                  label="Conversões este mês"
                  value={fmt(stats?.consolidacao?.conversoes_mes)}
                  accent
                />
                <StatCard
                  label="Acompanhamentos pendentes"
                  value={fmt(stats?.consolidacao?.acompanhamentos_pendentes)}
                  warn={(stats?.consolidacao?.acompanhamentos_pendentes ?? 0) > 0}
                />
              </ModuleCard>
            )}

            {/* PESSOAS */}
            {can('pessoas') && (
              <ModuleCard
                icon={PersonStanding}
                title="Cadastro de Pessoas"
                color="bg-violet-500"
                loading={loading}
                links={[
                  { href: '/admin/pessoas', label: 'Ver pessoas' },
                ]}
              >
                <StatCard label="Total de pessoas" value={fmt(stats?.pessoas?.total)} />
                <StatCard
                  label="Novos este mês"
                  value={fmt(stats?.pessoas?.novos_mes)}
                  accent
                />
              </ModuleCard>
            )}

            {/* CÉLULAS */}
            {can('celulas') && (
              <ModuleCard
                icon={Church}
                title="Células"
                color="bg-sky-500"
                loading={loading}
                links={[
                  { href: '/admin/celulas', label: 'Ver células' },
                ]}
              >
                <StatCard label="Células ativas" value={fmt(stats?.celulas?.celulas_ativas)} accent />
                <StatCard label="Total de membros" value={fmt(stats?.celulas?.total_membros)} />
              </ModuleCard>
            )}

            {/* REVISÃO DE VIDAS */}
            {can('revisao_vidas') && (
              <ModuleCard
                icon={ClipboardList}
                title="Revisão de Vidas"
                color="bg-teal-500"
                loading={loading}
                links={[
                  { href: '/admin/revisao-vidas', label: 'Ver eventos' },
                ]}
              >
                <StatCard label="Eventos ativos" value={fmt(stats?.revisao_vidas?.eventos_ativos)} accent />
                <StatCard label="Inscrições (30 dias)" value={fmt(stats?.revisao_vidas?.inscricoes_30d)} />
              </ModuleCard>
            )}

            {/* LIVRARIA */}
            {can('livraria_dashboard', 'livraria_vendas', 'livraria_produtos') && (
              <ModuleCard
                icon={BookOpen}
                title="Livraria"
                color="bg-amber-500"
                loading={loading}
                links={[
                  { href: '/admin/livraria', label: 'Dashboard' },
                  { href: '/admin/livraria/pdv', label: 'PDV' },
                  { href: '/admin/livraria/produtos', label: 'Produtos' },
                ]}
              >
                <StatCard
                  label="Vendas este mês"
                  value={fmt(stats?.livraria?.vendas_mes)}
                  sub={fmtCurrency(stats?.livraria?.receita_mes)}
                  accent
                />
                {(stats?.livraria?.produtos_estoque_baixo ?? 0) > 0 ? (
                  <StatCard
                    label="Estoque baixo"
                    value={fmt(stats?.livraria?.produtos_estoque_baixo)}
                    warn
                  />
                ) : (
                  <StatCard label="Estoque baixo" value="0" sub="Tudo OK" />
                )}
              </ModuleCard>
            )}

            {/* MÍDIA */}
            {can('galeria', 'upload', 'instagram') && (
              <ModuleCard
                icon={Camera}
                title="Mídia"
                color="bg-indigo-500"
                loading={loading}
                links={[
                  ...(can('galeria') ? [{ href: '/admin/galeria', label: 'Galerias' }] : []),
                  ...(can('upload') ? [{ href: '/admin/upload', label: 'Upload' }] : []),
                  ...(can('instagram')
                    ? [
                        { href: '/admin/instancias', label: 'Instagram' },
                        { href: '/admin/instagram/posts', label: 'Publicações' },
                      ]
                    : []),
                ]}
              >
                {can('galeria') ? (
                  <>
                    <StatCard label="Galerias" value={fmt(stats?.galeria?.total_galerias)} />
                    <StatCard label="Fotos indexadas" value={fmt(stats?.galeria?.total_fotos)} />
                  </>
                ) : (
                  <>
                    <StatCard label="Integrações ativas" value={fmt(stats?.instagram?.integracoes_ativas)} accent />
                    <SkeletonCard />
                  </>
                )}
              </ModuleCard>
            )}

            {/* USUÁRIOS / CONFIGURAÇÕES */}
            {can('usuarios', 'configuracoes', 'roles') && (
              <ModuleCard
                icon={Users}
                title="Usuários & Configurações"
                color="bg-slate-600"
                loading={loading}
                links={[
                  ...(can('usuarios') ? [{ href: '/admin/usuarios', label: 'Usuários' }] : []),
                  ...(can('roles') ? [{ href: '/admin/roles', label: 'Perfis de acesso' }] : []),
                  ...(can('configuracoes') ? [{ href: '/admin/configuracoes', label: 'Configurações' }] : []),
                ]}
              >
                <StatCard
                  label="Total de usuários"
                  value={fmt(stats?.usuarios?.total_usuarios)}
                />
                <div className="rounded-xl p-4 flex flex-col gap-2 border border-slate-100 bg-slate-50">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Atalhos</p>
                  <div className="flex flex-col gap-1 mt-1">
                    {can('usuarios') && <QuickLink href="/admin/usuarios" label="Convidar usuário" />}
                    {can('roles') && <QuickLink href="/admin/roles" label="Gerenciar perfis" />}
                  </div>
                </div>
              </ModuleCard>
            )}

            {/* XP26 */}
            {(access.isAdmin) && (
              <ModuleCard
                icon={BarChart3}
                title="Pesquisa XP26"
                color="bg-emerald-500"
                loading={false}
                links={[
                  { href: '/xp26-pesquisa', label: 'Formulário', external: true },
                  { href: '/xp26-resultados', label: 'Resultados', external: true },
                  { href: '/admin/xp26-feedback', label: 'Administrar respostas' },
                ]}
              >
                <div className="col-span-2 text-sm text-slate-500 py-2">
                  Pesquisa pós-evento XP26 Alagoas. Acesse os links abaixo para visualizar ou administrar.
                </div>
              </ModuleCard>
            )}

          </div>

          {/* ── Rodapé informativo ───────────────────────────── */}
          <p className="text-center text-xs text-slate-400 pb-4">
            Sara Nossa Terra — Plataforma de Gestão · {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </PageAccessGuard>
  )
}
