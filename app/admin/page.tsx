'use client'

import Link from 'next/link'
import { Settings, Users, Upload, Image as ImageIcon, Instagram, Link2, LayoutDashboard } from 'lucide-react'
import { useAdminAccess } from '@/lib/admin-access-context'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { AdminPageHeader } from '@/app/admin/AdminPageHeader'

const cards = [
  { href: '/admin/configuracoes', label: 'Ajustes do Site', icon: Settings, desc: 'Editar textos e menu do site', permission: 'configuracoes' },
  { href: '/admin/usuarios', label: 'Usuários', icon: Users, desc: 'Convidar e gerenciar acessos', permission: 'usuarios' },
  { href: '/admin/upload', label: 'Upload Cultos/Eventos', icon: Upload, desc: 'Fluxo em etapas + Google Drive', permission: 'upload' },
  { href: '/admin/galeria', label: 'Galerias', icon: ImageIcon, desc: 'Lista e filtros de galerias', permission: 'galeria' },
  { href: '/admin/instancias', label: 'Configurações do Instagram/Facebook', icon: Link2, desc: 'Conectar Facebook/Instagram', permission: 'instagram' },
  { href: '/admin/instagram/posts', label: 'Publicações Instagram', icon: Instagram, desc: 'Acompanhar fila e posts', permission: 'instagram' },
]

export default function AdminPage() {
  const access = useAdminAccess()
  const visibleCards = cards.filter((card) => {
    if (access.isAdmin) return true
    return !!access.permissions[card.permission]?.view
  })

  return (
    <PageAccessGuard pageKey="dashboard">
      <div className="p-6 md:p-8">
        <AdminPageHeader
          icon={LayoutDashboard}
          title="Painel administrativo"
          subtitle="Selecione uma área para começar."
        />
        {visibleCards.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {visibleCards.map(({ href, label, icon: Icon, desc }) => (
              <Link
                key={href}
                href={href}
                className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:border-[#c62737]/40 hover:shadow-md transition-all flex flex-col"
              >
                <div className="w-11 h-11 rounded-lg bg-[#c62737]/10 flex items-center justify-center mb-4">
                  <Icon className="text-[#c62737]" size={22} />
                </div>
                <h2 className="font-semibold text-slate-900 mb-1">{label}</h2>
                <p className="text-sm text-slate-500">{desc}</p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-slate-600">
            Seu perfil não possui páginas disponíveis neste painel no momento. Se precisar, solicite acesso a um administrador.
          </div>
        )}
      </div>
    </PageAccessGuard>
  )
}
