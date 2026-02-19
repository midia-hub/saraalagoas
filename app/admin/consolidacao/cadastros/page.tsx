'use client'

import Link from 'next/link'
import { BookUser, UserCircle, Building2, Trophy, UserCog, MessageSquare, Send } from 'lucide-react'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'

const cards = [
  { href: '/admin/consolidacao/cadastros/pessoas', label: 'Pessoas', icon: UserCircle, desc: 'Líderes, pastores, consolidadores' },
  { href: '/admin/consolidacao/cadastros/igrejas', label: 'Igrejas', icon: Building2, desc: 'Igrejas e pastores vinculados' },
  { href: '/admin/consolidacao/cadastros/arenas', label: 'Arenas', icon: Trophy, desc: 'Arenas por igreja e líderes' },
  { href: '/admin/consolidacao/cadastros/equipes', label: 'Equipes', icon: UserCog, desc: 'Equipes (Arena ou Igreja) e líder' },
  { href: '/admin/consolidacao/cadastros/mensagens-conversao', label: 'Mensagens de conversão', icon: MessageSquare, desc: 'Texto exibido após cadastro (aceitou / reconciliou)' },
  { href: '/admin/consolidacao/cadastros/api-disparos', label: 'API de disparos', icon: Send, desc: 'Ativar envio automático de mensagem ao finalizar formulário de consolidação' },
]

export default function CadastrosHubPage() {
  return (
    <PageAccessGuard pageKey="consolidacao">
      <div className="p-6 md:p-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-[#c62737]/10 flex items-center justify-center">
              <BookUser className="text-[#c62737]" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Cadastros</h1>
              <p className="text-slate-500">Pessoas, igrejas, células, arenas e equipes para o módulo de consolidação</p>
            </div>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map(({ href, label, icon: Icon, desc }) => (
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
      </div>
    </PageAccessGuard>
  )
}
