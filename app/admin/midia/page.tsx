'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ImageIcon, Instagram, PenLine, CalendarDays,
  ClipboardList, Settings, ScanFace, Camera,
  ChevronRight, LayoutGrid, Upload,
  BookOpen,
} from 'lucide-react'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { adminFetchJson } from '@/lib/admin-client'
import { useAdminAccess } from '@/lib/admin-access-context'

type Stats = {
  galeria?: { total_galerias: number | null; total_fotos: number | null }
  instagram?: { integracoes_ativas: number | null }
}

function fmt(n: number | null | undefined) {
  if (n == null) return '—'
  return n.toLocaleString('pt-BR')
}

function StatCard({
  icon: Icon, label, value, sub, color, loading,
}: {
  icon: React.ElementType; label: string; value: string; sub?: string
  color: string; loading?: boolean
}) {
  return (
    <div className="bg-white rounded-2xl p-3 sm:p-5 border border-gray-100 flex items-center gap-3 sm:gap-4">
      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}18` }}>
        <Icon size={20} style={{ color }} />
      </div>
      <div>
        <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-0.5 sm:mb-1">{label}</p>
        <p className="text-xl sm:text-2xl font-extrabold text-gray-900 leading-none">
          {loading ? <span className="inline-block w-10 h-6 bg-gray-100 rounded animate-pulse" /> : value}
        </p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
    </div>
  )
}

function ActionCard({
  href, icon: Icon, label, description, color,
}: {
  href: string; icon: React.ElementType; label: string; description: string; color: string
}) {
  return (
    <Link
      href={href}
      className="bg-white rounded-2xl p-3 sm:p-5 border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all duration-200 group flex flex-col gap-2 sm:gap-3"
    >
      <div className="flex items-center justify-between">
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}18` }}>
          <Icon size={16} style={{ color }} />
        </div>
        <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all" />
      </div>
      <div>
        <p className="text-xs sm:text-sm font-bold text-gray-900">{label}</p>
        <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5 leading-snug hidden sm:block">{description}</p>
      </div>
    </Link>
  )
}

export default function MidiaDashboard() {
  const access = useAdminAccess()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminFetchJson<Stats>('/api/admin/dashboard/stats')
      .then(d => setStats(d))
      .catch(() => setStats({}))
      .finally(() => setLoading(false))
  }, [])

  const name = access.profileName?.split(' ')[0] ?? 'Líder'
  const canInstagram = access.isAdmin || !!access.permissions['instagram']?.view

  return (
    <PageAccessGuard pageKey={['galeria', 'instagram']}>
      <div className="bg-[#F0F0F3] min-h-full">
        <div className="max-w-6xl mx-auto px-3 sm:px-5 md:px-8 py-4 sm:py-6 space-y-4 sm:space-y-5">

          {/* Hero */}
          <div
            className="rounded-2xl text-white px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden shadow-md"
            style={{ background: 'linear-gradient(130deg, #c2410c 0%, #f97316 55%, #fb923c 100%)' }}
          >
            <span className="absolute -right-10 -top-12 w-52 h-52 rounded-full bg-white/[0.05] pointer-events-none" />
            <span className="absolute right-20 -bottom-14 w-40 h-40 rounded-full bg-white/[0.04] pointer-events-none" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-1">
                <Camera size={16} className="opacity-70" />
                <p className="text-sm text-white/60 font-medium">Módulo de Mídia e Social</p>
              </div>
              <h1 className="text-2xl font-extrabold leading-tight">Olá, {name}!</h1>
              <p className="text-sm text-white/60 mt-1">Gerencie galerias, publicações e integrações de redes sociais.</p>
            </div>
            <div className="relative z-10 flex gap-3 flex-wrap shrink-0">
              {[
                { v: loading ? '…' : fmt(stats?.galeria?.total_galerias), l: 'Galerias' },
                { v: loading ? '…' : fmt(stats?.galeria?.total_fotos), l: 'Fotos' },
                { v: loading ? '…' : fmt(stats?.instagram?.integracoes_ativas), l: 'Integrações' },
              ].map(({ v, l }) => (
                <div key={l} className="rounded-xl px-3 py-2 sm:px-5 sm:py-3 text-center border border-white/[0.14]" style={{ background: 'rgba(255,255,255,0.12)' }}>
                  <p className="text-xl sm:text-2xl font-extrabold leading-none">{v}</p>
                  <p className="text-[0.6rem] sm:text-[0.65rem] font-semibold uppercase tracking-widest text-white/55 mt-1">{l}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard icon={ImageIcon} label="Galerias" value={fmt(stats?.galeria?.total_galerias)} sub="álbuns criados" color="#f97316" loading={loading} />
            <StatCard icon={Camera} label="Fotos indexadas" value={fmt(stats?.galeria?.total_fotos)} sub="total de imagens" color="#f59e0b" loading={loading} />
            <StatCard icon={Instagram} label="Integrações" value={fmt(stats?.instagram?.integracoes_ativas)} sub="contas conectadas" color="#ec4899" loading={loading} />
            <StatCard icon={ClipboardList} label="Demandas abertas" value="—" sub="em andamento" color="#3b82f6" loading={loading} />
          </div>

          {/* Galeria */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-gray-400 mb-3">Galeria e Fotos</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <ActionCard href="/admin/galeria" icon={ImageIcon} label="Galeria de Fotos" description="Gerencie álbuns e imagens dos eventos" color="#f97316" />
              <ActionCard href="/admin/rekognition" icon={ScanFace} label="Reconhecimento Facial" description="Identifique pessoas nas fotos automaticamente" color="#8b5cf6" />
              <ActionCard href="/admin/upload" icon={Upload} label="Upload de Arquivos" description="Envie arquivos e mídias para a plataforma" color="#64748b" />
            </div>
          </div>

          {/* Social */}
          {canInstagram && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-gray-400 mb-3">Redes Sociais e Publicações</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <ActionCard href="/admin/midia/nova-postagem" icon={PenLine} label="Nova Postagem" description="Crie e publique nas redes sociais" color="#ec4899" />
                <ActionCard href="/admin/instagram/posts" icon={Instagram} label="Painel de Posts" description="Visualize e gerencie publicações" color="#f97316" />
                <ActionCard href="/admin/midia/agenda-social" icon={CalendarDays} label="Agenda Social" description="Calendário de postagens agendadas" color="#3b82f6" />
                <ActionCard href="/admin/midia/demandas" icon={ClipboardList} label="Demandas" description="Solicitações da equipe de mídia" color="#10b981" />
                <ActionCard href="/admin/midia/referencias-design" icon={BookOpen} label="Referências de design" description="Bucket, descrições e categorias para a IA" color="#8b5cf6" />
              </div>
            </div>
          )}

          {/* Config */}
          {canInstagram && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-gray-400 mb-3">Configurações</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <ActionCard href="/admin/instancias" icon={Settings} label="Configuração do Instagram" description="Gerencie contas e tokens de integração" color="#6366f1" />
                <ActionCard href="/admin/midia/ia-config" icon={LayoutGrid} label="IA — Prompts" description="Configure os prompts de inteligência artificial" color="#8b5cf6" />
              </div>
            </div>
          )}

        </div>
      </div>
    </PageAccessGuard>
  )
}
