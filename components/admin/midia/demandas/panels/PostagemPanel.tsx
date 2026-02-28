'use client'

import Link from 'next/link'

interface PostagemPanelProps {
  demandId:    string
  demandTitle: string
  description: string
  dueDate?:    string
}

export default function PostagemPanel({
  demandId,
  demandTitle,
  description,
  dueDate,
}: PostagemPanelProps) {
  const params = new URLSearchParams({
    demanda_id: demandId,
    titulo:     demandTitle,
    descricao:  description ?? '',
    ...(dueDate ? { data: dueDate } : {}),
  })

  const url = `/admin/midia/nova-postagem?${params.toString()}`

  return (
    <div className="space-y-5">
      {/* Resumo da demanda */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Dados da demanda
        </h4>
        <p className="text-sm font-medium text-slate-800">{demandTitle}</p>
        {description && (
          <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">{description}</p>
        )}
        {dueDate && (
          <p className="text-xs text-slate-400">
            Prazo: {new Date(dueDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        )}
      </div>

      {/* Instruções */}
      <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 text-xs text-blue-700">
        <p className="font-semibold mb-1">Como funciona:</p>
        <ul className="list-disc list-inside space-y-1 text-blue-600">
          <li>Clique em "Criar postagem" para abrir o formulário completo de nova postagem.</li>
          <li>Os dados da demanda serão pré-preenchidos automaticamente.</li>
          <li>O material produzido já estará disponível no bucket <code className="bg-blue-100 px-1 rounded">demanda-materiais</code>.</li>
        </ul>
      </div>

      {/* CTA principal */}
      <Link
        href={url}
        className="block w-full text-center py-3 rounded-xl bg-[#c62737] hover:bg-red-700 text-white text-sm font-semibold transition-colors"
      >
        📲 Criar postagem
      </Link>

      {/* Link para histórico de postagens vinculadas (futuro) */}
      <Link
        href={`/admin/midia?search=${encodeURIComponent(demandTitle)}`}
        className="block w-full text-center py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-sm text-slate-600 font-medium transition-colors"
      >
        🔍 Ver postagens com este título
      </Link>
    </div>
  )
}
