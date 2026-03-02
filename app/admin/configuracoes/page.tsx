'use client'

import { useState } from 'react'
import { Settings, Layout } from 'lucide-react'
import { AdminSiteConfig } from '@/app/admin/AdminSiteConfig'
import { LayoutBuilder } from '@/app/admin/LayoutBuilder'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { AdminPageHeader } from '@/app/admin/AdminPageHeader'

const TABS = [
  { id: 'config', label: 'Configurações', icon: Settings },
  { id: 'layout', label: 'Layout da Página', icon: Layout },
]

export default function ConfiguracoesPage() {
  const [tab, setTab] = useState<'config' | 'layout'>('config')

  return (
    <PageAccessGuard pageKey="configuracoes">
      <div className="p-6 md:p-8">
        <AdminPageHeader
          icon={Settings}
          title="Ajustes do Site"
          subtitle="Editar textos, menu, configurações gerais e layout da página inicial."
        />

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-slate-100 rounded-xl mb-8 w-fit">
          {TABS.map(t => {
            const Icon = t.icon
            const active = tab === t.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id as 'config' | 'layout')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? 'bg-white text-[#c62737] shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            )
          })}
        </div>

        {tab === 'config' && <AdminSiteConfig />}
        {tab === 'layout' && (
          <div className="max-w-4xl">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-1">Builder de Layout</h2>
              <p className="text-gray-500 text-sm">Defina a ordem e visibilidade das seções exibidas na página inicial.</p>
            </div>
            <LayoutBuilder />
          </div>
        )}
      </div>
    </PageAccessGuard>
  )
}
