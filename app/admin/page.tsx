'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  Users,
  LayoutDashboard,
  ClipboardList,
  BarChart3,
  Heart,
  BookOpen,
  Church,
  Camera,
  Star,
  CheckCircle2,
  Home,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  AlertCircle,
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

// ────────────────────────────────────────────────────────────────────────────
// Tag de tendência
// ────────────────────────────────────────────────────────────────────────────
type TagVariant = 'up' | 'down' | 'neu' | 'warn'
function Tag({ variant, children }: { variant: TagVariant; children: React.ReactNode }) {
  const styles: Record<TagVariant, string> = {
    up: 'bg-green-100 text-green-700',
    down: 'bg-red-100 text-red-700',
    neu: 'bg-gray-100 text-gray-500',
    warn: 'bg-amber-100 text-amber-700',
  }
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full w-fit mt-1.5 ${styles[variant]}`}>
      {children}
    </span>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Barra de progresso inline
// ────────────────────────────────────────────────────────────────────────────
function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  return (
    <div className="mt-2">
      <div className="flex justify-between text-[0.65rem] font-semibold text-gray-400 mb-0.5">
        <span>Meta {fmt(max)}</span><span>{pct}%</span>
      </div>
      <div className="h-[3px] bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Sparkline
// ────────────────────────────────────────────────────────────────────────────
function Sparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1)
  return (
    <div className="flex items-end gap-[2px] h-5 mt-2">
      {data.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-[2px] min-h-[2px]"
          style={{
            height: `${(v / max) * 100}%`,
            background: i === data.length - 1 ? color : '#e2e8f0',
          }}
        />
      ))}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Métrica individual dentro de um ModuleRow
// ────────────────────────────────────────────────────────────────────────────
interface MetricProps {
  label: string
  dotColor?: string
  value: string
  valueLg?: boolean
  valueSm?: boolean
  colored?: string
  context?: string
  tag?: { variant: TagVariant; text: string }
  progress?: { value: number; max: number; color: string }
  sparkline?: { data: number[]; color: string }
}

function Metric({ label, dotColor, value, valueLg, valueSm, colored, context, tag, progress, sparkline }: MetricProps) {
  const valClass = [
    'font-extrabold leading-none tracking-tight',
    valueLg ? 'text-[2.2rem]' : valueSm ? 'text-[1.35rem] text-gray-500' : 'text-[1.9rem]',
    colored ? '' : 'text-gray-900',
    value === '—' ? 'text-gray-300' : '',
  ].filter(Boolean).join(' ')

  return (
    <div className="flex flex-col justify-center px-4 py-3.5 border-r border-gray-100 last:border-r-0 min-w-[120px]">
      <div className="flex items-center gap-1.5 mb-1.5">
        {dotColor && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: dotColor }} />}
        <span className="text-[0.67rem] font-bold uppercase tracking-wider text-gray-400">{label}</span>
      </div>
      <span className={valClass} style={colored ? { color: colored } : undefined}>
        {value}
      </span>
      {context && <span className="text-[0.7rem] text-gray-400 mt-1.5 leading-snug">{context}</span>}
      {tag && <Tag variant={tag.variant}>{tag.text}</Tag>}
      {progress && <ProgressBar {...progress} />}
      {sparkline && <Sparkline {...sparkline} />}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Módulo em linha horizontal
// ────────────────────────────────────────────────────────────────────────────
interface ModuleRowProps {
  accentColor: string
  iconBg: string
  icon: React.ReactNode
  name: string
  desc: string
  statusText: string
  statusBg: string
  statusColor: string
  links: { href: string; label: string }[]
  metrics: MetricProps[]
  href: string
  delay?: number
}

function ModuleRow({
  accentColor, iconBg, icon, name, desc, statusText, statusBg, statusColor,
  links, metrics, href, delay = 0,
}: ModuleRowProps) {
  const cardRef = useRef<HTMLDivElement>(null)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const y = ((e.clientY - r.top) / r.height - 0.5) * 2
    el.style.transform = `translateY(-1px) rotateX(${-y * 1.5}deg)`
  }
  const handleMouseLeave = () => {
    if (cardRef.current) cardRef.current.style.transform = ''
  }

  return (
    <div
      ref={cardRef}
      className="bg-white border border-gray-100 rounded-2xl flex flex-col md:grid overflow-hidden cursor-pointer relative
                 transition-shadow duration-200 hover:shadow-lg md:grid-cols-[210px_1fr_48px]"
      style={{
        animationDelay: `${delay}ms`,
        perspective: '600px',
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Barra lateral colorida */}
      <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-none" style={{ background: accentColor }} />

      {/* Identidade do módulo */}
      <div className="pl-5 pr-4 py-4 flex flex-col justify-center border-b md:border-b-0 md:border-r border-gray-100">
        <div className="flex items-center gap-2.5 mb-2.5">
          <div className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ background: iconBg }}>
            {icon}
          </div>
          <span className="font-bold text-sm text-gray-900 whitespace-nowrap" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            {name}
          </span>
        </div>
        <p className="text-xs text-gray-400 font-normal leading-snug">{desc}</p>
        <span
          className="inline-flex items-center gap-1 text-[0.65rem] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full w-fit mt-2.5"
          style={{ background: statusBg, color: statusColor }}
        >
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: statusColor }} />
          {statusText}
        </span>
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2.5">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-xs font-semibold text-gray-400 hover:text-[#C4232A] flex items-center gap-1 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              {l.label}
              <ChevronRight size={10} strokeWidth={2.5} />
            </Link>
          ))}
        </div>
      </div>

      {/* Métricas */}
      <Link href={href} className="flex items-stretch px-0 min-w-0 overflow-x-auto">
        {metrics.map((m, i) => <Metric key={i} {...m} />)}
      </Link>

      {/* Seta de ação */}
      <Link
        href={href}
        className="hidden md:flex items-center justify-center border-l border-gray-100 text-gray-300 hover:text-[#C4232A] hover:bg-red-50/30 transition-colors"
      >
        <ChevronRight size={14} strokeWidth={2} />
      </Link>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Skeleton de ModuleRow durante loading
// ────────────────────────────────────────────────────────────────────────────
function ModuleRowSkeleton() {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl h-[120px] animate-pulse" />
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
  const dateStr = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date())

  const name = access.profileName?.split(' ')[0] ?? 'Líder'

  // Atalhos do hero
  const heroPessoas = stats?.pessoas?.total ?? null
  const heroConversoes = stats?.consolidacao?.conversoes_mes ?? null
  const heroInscricoes = stats?.revisao_vidas?.inscricoes_30d ?? null
  const heroFotos = stats?.galeria?.total_fotos ?? null

  return (
    <PageAccessGuard pageKey="dashboard">
      <div className="bg-[#F0F0F3] min-h-full">
        <div className="max-w-7xl mx-auto px-5 md:px-8 py-6 space-y-5">

          {/* ── Hero ─────────────────────────────────────────── */}
          <div
            className="rounded-[18px] text-white px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden shadow-md"
            style={{ background: 'linear-gradient(130deg, #9E1C22 0%, #C4232A 55%, #D84048 100%)' }}
          >
            {/* Círculos decorativos */}
            <span className="absolute -right-10 -top-12 w-52 h-52 rounded-full bg-white/[0.05] pointer-events-none" />
            <span className="absolute right-20 -bottom-14 w-40 h-40 rounded-full bg-white/[0.04] pointer-events-none" />

            <div className="relative z-10">
              <p className="text-sm text-white/60 capitalize mb-0.5">{dateStr}</p>
              <h1 className="text-2xl font-extrabold leading-tight" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                {greeting}, {name}! 👋
              </h1>
              <p className="text-sm text-white/55 mt-1 font-light">
                Resumo da plataforma Sara Sede Alagoas.
              </p>
            </div>

            <div className="relative z-10 grid grid-cols-2 md:flex gap-3">
              {[
                { v: loading ? '…' : fmt(heroPessoas), l: 'Pessoas' },
                { v: loading ? '…' : fmt(heroConversoes), l: 'Conversões' },
                { v: loading ? '…' : fmt(heroInscricoes), l: 'Inscrições' },
                { v: loading ? '…' : fmt(heroFotos), l: 'Fotos' },
              ].map(({ v, l }) => (
                <div key={l} className="rounded-xl px-4 py-3 text-center backdrop-blur-sm border border-white/[0.14]" style={{ background: 'rgba(255,255,255,0.12)' }}>
                  <p className="text-2xl font-extrabold leading-none" style={{ fontFamily: 'Montserrat, sans-serif' }}>{v}</p>
                  <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-white/55 mt-1.5">{l}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Cabeçalho da seção ───────────────────────────── */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">Módulos da plataforma</span>
            <span className="text-xs text-gray-400">
              {new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date())}
            </span>
          </div>

          {/* ── Módulos em linha ─────────────────────────────── */}
          <div className="flex flex-col gap-3">

            {/* CONSOLIDAÇÃO */}
            {can('consolidacao') && (
              loading ? <ModuleRowSkeleton /> : (
                <ModuleRow
                  href="/admin/consolidacao"
                  accentColor="#C4232A"
                  iconBg="linear-gradient(135deg,#C4232A,#9E1C22)"
                  icon={<Heart size={18} color="white" fill="white" />}
                  name="Consolidação"
                  desc="Conversões, followups e acompanhamentos pastorais"
                  statusText="Ativo"
                  statusBg="#FEE2E2"
                  statusColor="#C4232A"
                  links={[
                    { href: '/admin/consolidacao', label: 'Ver tudo' },
                    { href: '/admin/consolidacao?aba=disparos', label: 'Disparos' },
                  ]}
                  metrics={[
                    {
                      label: 'Conversões / mês', dotColor: '#C4232A',
                      value: fmt(stats?.consolidacao?.conversoes_mes),
                      colored: '#C4232A', valueLg: true,
                      tag: { variant: 'up', text: '+2 vs mês anterior' },
                      sparkline: { data: [1, 2, 1, 3, 2, 3, stats?.consolidacao?.conversoes_mes ?? 4], color: '#C4232A' },
                    },
                    {
                      label: 'Acomp. pendentes',
                      value: fmt(stats?.consolidacao?.acompanhamentos_pendentes),
                      tag: (stats?.consolidacao?.acompanhamentos_pendentes ?? 0) > 0
                        ? { variant: 'warn', text: 'Verificar' }
                        : { variant: 'neu', text: 'Sem pendências' },
                    },
                    {
                      label: 'Total cadastrado',
                      value: fmt(stats?.pessoas?.total),
                      colored: '#C4232A',
                      context: 'pessoas na base',
                    },
                    {
                      label: 'Novos este mês',
                      value: fmt(stats?.pessoas?.novos_mes),
                      colored: '#C4232A',
                      ...(stats?.pessoas?.novos_mes != null
                        ? { progress: { value: stats.pessoas.novos_mes, max: 30, color: '#C4232A' } }
                        : {}),
                    },
                  ]}
                  delay={100}
                />
              )
            )}

            {/* CÉLULAS */}
            {can('celulas') && (
              loading ? <ModuleRowSkeleton /> : (
                <ModuleRow
                  href="/admin/celulas"
                  accentColor="#3b82f6"
                  iconBg="linear-gradient(135deg,#3b82f6,#1d4ed8)"
                  icon={<Church size={18} color="white" />}
                  name="Células"
                  desc="Grupos, realizações, presenças e discipulado"
                  statusText="Ativo"
                  statusBg="#DBEAFE"
                  statusColor="#1d4ed8"
                  links={[
                    { href: '/admin/celulas', label: 'Ver células' },
                    { href: '/admin/celulas?aba=realizacoes', label: 'Realizações' },
                  ]}
                  metrics={[
                    {
                      label: 'Células ativas', dotColor: '#3b82f6',
                      value: fmt(stats?.celulas?.celulas_ativas),
                      colored: '#3b82f6',
                      tag: stats?.celulas?.celulas_ativas == null ? { variant: 'neu', text: 'Aguardando dados' } : undefined,
                    },
                    {
                      label: 'Total de membros',
                      value: fmt(stats?.celulas?.total_membros),
                      context: 'membros registrados',
                    },
                    {
                      label: 'Realizações / mês',
                      value: '—',
                      context: 'encontros registrados',
                    },
                    {
                      label: 'Novos membros',
                      value: '—',
                      context: 'este mês',
                    },
                  ]}
                  delay={150}
                />
              )
            )}

            {/* REVISÃO DE VIDAS */}
            {can('revisao_vidas') && (
              loading ? <ModuleRowSkeleton /> : (
                <ModuleRow
                  href="/admin/revisao-vidas"
                  accentColor="#14b8a6"
                  iconBg="linear-gradient(135deg,#14b8a6,#0f766e)"
                  icon={<CheckCircle2 size={18} color="white" />}
                  name="Revisão de Vidas"
                  desc="Eventos, inscrições e anamneses pastorais"
                  statusText={`${fmt(stats?.revisao_vidas?.eventos_ativos, '0')} evento(s) ativo(s)`}
                  statusBg="#CCFBF1"
                  statusColor="#0f766e"
                  links={[
                    { href: '/admin/revisao-vidas', label: 'Ver eventos' },
                    { href: '/admin/revisao-vidas?aba=inscricoes', label: 'Inscrições' },
                  ]}
                  metrics={[
                    {
                      label: 'Eventos ativos', dotColor: '#14b8a6',
                      value: fmt(stats?.revisao_vidas?.eventos_ativos),
                      colored: '#14b8a6',
                      tag: (stats?.revisao_vidas?.eventos_ativos ?? 0) > 0
                        ? { variant: 'up', text: 'Em andamento' }
                        : { variant: 'neu', text: 'Nenhum ativo' },
                    },
                    {
                      label: 'Inscrições (30 dias)',
                      value: fmt(stats?.revisao_vidas?.inscricoes_30d),
                      colored: '#14b8a6',
                      ...(stats?.revisao_vidas?.inscricoes_30d != null
                        ? { progress: { value: stats.revisao_vidas.inscricoes_30d, max: 40, color: '#14b8a6' } }
                        : {}),
                    },
                    {
                      label: 'Taxa de conversão',
                      value: '—',
                      context: 'em análise',
                    },
                    {
                      label: 'Anamneses pendentes',
                      value: '—',
                      context: 'aguardando preenchimento',
                    },
                  ]}
                  delay={200}
                />
              )
            )}

            {/* LIVRARIA */}
            {can('livraria_dashboard', 'livraria_vendas', 'livraria_produtos') && (
              loading ? <ModuleRowSkeleton /> : (
                <ModuleRow
                  href="/admin/livraria"
                  accentColor="#f59e0b"
                  iconBg="linear-gradient(135deg,#f59e0b,#b45309)"
                  icon={<BookOpen size={18} color="white" />}
                  name="Livraria / PDV"
                  desc="Produtos, vendas, estoque e Mercado Pago"
                  statusText={
                    (stats?.livraria?.produtos_estoque_baixo ?? 0) > 0
                      ? `${stats!.livraria!.produtos_estoque_baixo} alertas de estoque`
                      : 'Estoque OK'
                  }
                  statusBg={(stats?.livraria?.produtos_estoque_baixo ?? 0) > 0 ? '#FEF3C7' : '#ECFDF5'}
                  statusColor={(stats?.livraria?.produtos_estoque_baixo ?? 0) > 0 ? '#b45309' : '#065f46'}
                  links={[
                    { href: '/admin/livraria', label: 'Dashboard' },
                    { href: '/admin/livraria/pdv', label: 'PDV' },
                    { href: '/admin/livraria/produtos', label: 'Produtos' },
                  ]}
                  metrics={[
                    {
                      label: 'Vendas / mês', dotColor: '#10b981',
                      value: fmt(stats?.livraria?.vendas_mes),
                      colored: '#10b981',
                      context: fmtCurrency(stats?.livraria?.receita_mes) + ' faturado',
                    },
                    {
                      label: 'Estoque baixo', dotColor: '#f59e0b',
                      value: fmt(stats?.livraria?.produtos_estoque_baixo),
                      colored: '#d97706',
                      tag: (stats?.livraria?.produtos_estoque_baixo ?? 0) > 0
                        ? { variant: 'warn', text: 'Repor produto' }
                        : { variant: 'neu', text: 'Tudo OK' },
                    },
                    {
                      label: 'Ticket médio',
                      value: fmtCurrency(
                        stats?.livraria?.receita_mes != null && (stats?.livraria?.vendas_mes ?? 0) > 0
                          ? stats.livraria.receita_mes / stats.livraria.vendas_mes!
                          : null
                      ),
                      valueSm: true,
                      context: `${fmt(stats?.livraria?.vendas_mes, '0')} venda(s) no período`,
                    },
                    {
                      label: 'Fiado em aberto',
                      value: '—',
                      tag: { variant: 'neu', text: 'Sem pendências' },
                    },
                  ]}
                  delay={250}
                />
              )
            )}

            {/* MÍDIA */}
            {can('galeria', 'upload', 'instagram') && (
              loading ? <ModuleRowSkeleton /> : (
                <ModuleRow
                  href="/admin/galeria"
                  accentColor="#f97316"
                  iconBg="linear-gradient(135deg,#f97316,#c2410c)"
                  icon={<Camera size={18} color="white" />}
                  name="Mídia e Social"
                  desc="Galerias, Instagram, demandas e publicações"
                  statusText="Integrado"
                  statusBg="#FFEDD5"
                  statusColor="#c2410c"
                  links={[
                    ...(can('galeria') ? [{ href: '/admin/galeria', label: 'Galerias' }] : []),
                    ...(can('instagram') ? [{ href: '/admin/instancias', label: 'Instagram' }] : []),
                  ]}
                  metrics={[
                    {
                      label: 'Galerias', dotColor: '#f97316',
                      value: fmt(stats?.galeria?.total_galerias),
                      colored: '#f97316',
                      tag: { variant: 'up', text: 'Ativas' },
                    },
                    {
                      label: 'Fotos indexadas',
                      value: fmt(stats?.galeria?.total_fotos),
                      colored: '#f97316',
                      ...(stats?.galeria?.total_fotos != null
                        ? { progress: { value: stats.galeria.total_fotos, max: 1000, color: '#f97316' } }
                        : {}),
                    },
                    {
                      label: 'Demandas abertas',
                      value: '—',
                      tag: { variant: 'neu', text: 'Em dia' },
                    },
                    {
                      label: 'Posts agendados',
                      value: '—',
                      context: 'próximos 7 dias',
                    },
                  ]}
                  delay={300}
                />
              )
            )}

            {/* SARA KIDS */}
            {can('sara_kids') && (
              loading ? <ModuleRowSkeleton /> : (
                <ModuleRow
                  href="/admin/sara-kids"
                  accentColor="#8b5cf6"
                  iconBg="linear-gradient(135deg,#8b5cf6,#6d28d9)"
                  icon={<Users size={18} color="white" />}
                  name="Sara Kids"
                  desc="Check-in, responsáveis e notificações infantis"
                  statusText="Ativo"
                  statusBg="#EDE9FE"
                  statusColor="#6d28d9"
                  links={[
                    { href: '/admin/sara-kids', label: 'Check-in' },
                    { href: '/admin/sara-kids?aba=responsaveis', label: 'Responsáveis' },
                  ]}
                  metrics={[
                    {
                      label: 'Check-ins hoje', dotColor: '#8b5cf6',
                      value: '—',
                      tag: { variant: 'neu', text: 'Sem culto ativo' },
                    },
                    {
                      label: 'Crianças cadastradas',
                      value: '—',
                      context: 'no banco de dados',
                    },
                    {
                      label: 'Notificações enviadas',
                      value: '—',
                      context: 'últimos 30 dias',
                    },
                    {
                      label: 'Alertas ativos',
                      value: '—',
                      tag: { variant: 'neu', text: 'Verificar' },
                    },
                  ]}
                  delay={350}
                />
              )
            )}

          </div>

          {/* ── Rodapé ───────────────────────────────────────── */}
          <p className="text-center text-[0.65rem] text-gray-400 pb-4">
            Sara Nossa Terra — Plataforma de Gestão · {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </PageAccessGuard>
  )
}
