'use client'

import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { ArrowLeft } from 'lucide-react'

export interface AdminPageHeaderProps {
  /** Ícone exibido no quadrado ao lado do título */
  icon: LucideIcon
  /** Título principal da página */
  title: string
  /** Subtítulo ou descrição (opcional) */
  subtitle?: React.ReactNode
  /** Link "Voltar" - ex: { href: '/admin/consolidacao/cadastros', label: 'Voltar aos cadastros' } */
  backLink?: { href: string; label?: string }
  /** Conteúdo extra à direita do header (botões de ação) */
  actions?: React.ReactNode
}

/**
 * Cabeçalho padrão das páginas do admin: ícone + título + subtítulo.
 * Opcional: link voltar e área de ações à direita.
 */
export function AdminPageHeader({
  icon: Icon,
  title,
  subtitle,
  backLink,
  actions,
}: AdminPageHeaderProps) {
  return (
    <div className={`mb-8 ${actions ? 'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4' : ''}`}>
      <div className="flex flex-col gap-4">
        {backLink && (
          <Link
            href={backLink.href}
            className="inline-flex items-center gap-2 text-slate-600 hover:text-[#c62737] text-sm font-medium"
          >
            <ArrowLeft size={18} />
            {backLink.label ?? 'Voltar'}
          </Link>
        )}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#c62737]/10 flex items-center justify-center shrink-0">
            <Icon className="text-[#c62737]" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
            {subtitle && <div className="text-slate-500">{subtitle}</div>}
          </div>
        </div>
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  )
}
