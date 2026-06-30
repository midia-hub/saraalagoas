'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ClipboardList, Loader2, Sparkles } from 'lucide-react'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { AdminPageHeader } from '@/app/admin/AdminPageHeader'
import { adminFetchJson } from '@/lib/admin-client'
import { generateSlug } from '@/lib/formularios'
import type { Formulario } from '@/lib/formularios'

export default function NovoFormularioPage() {
  const router = useRouter()
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [slug, setSlug] = useState('')
  const [slugManual, setSlugManual] = useState(false)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  function handleTituloChange(v: string) {
    setTitulo(v)
    if (!slugManual) setSlug(generateSlug(v))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!titulo.trim()) { setErro('Informe um título.'); return }
    setLoading(true)
    setErro('')
    try {
      const { formulario } = await adminFetchJson<{ formulario: Formulario }>(
        '/api/admin/midia/formularios',
        { method: 'POST', body: JSON.stringify({ titulo: titulo.trim(), descricao: descricao.trim(), slug: slug.trim() }) }
      )
      router.push(`/admin/midia/formularios/${formulario.id}/editar`)
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao criar formulário.')
      setLoading(false)
    }
  }

  return (
    <PageAccessGuard pageKey="instagram">
      <div className="p-3 sm:p-4 md:p-6">
        <AdminPageHeader
          icon={ClipboardList}
          title="Novo formulário"
          subtitle="Defina o título e as configurações básicas antes de montar os campos."
          backLink={{ href: '/admin/midia/formularios', label: 'Voltar para Formulários' }}
        />

        <div className="max-w-xl">
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">

            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-700">
                Título <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={titulo}
                onChange={(e) => handleTituloChange(e.target.value)}
                placeholder="Ex.: Inscrição no Retiro 2026"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 outline-none transition"
                maxLength={120}
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-700">Descrição</label>
              <textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Descreva o formulário brevemente (opcional)"
                rows={3}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 outline-none transition resize-none"
                maxLength={300}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-700">
                URL pública
              </label>
              <div className="flex items-center rounded-xl border border-slate-200 overflow-hidden focus-within:border-orange-400 focus-within:ring-2 focus-within:ring-orange-400/20 transition">
                <span className="bg-slate-50 border-r border-slate-200 px-3 py-2.5 text-xs text-slate-400 font-medium shrink-0 whitespace-nowrap">
                  /f/
                </span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => { setSlug(e.target.value); setSlugManual(true) }}
                  placeholder="meu-formulario"
                  className="flex-1 px-3 py-2.5 text-sm outline-none bg-white"
                  maxLength={60}
                />
              </div>
              <p className="text-[11px] text-slate-400">
                O formulário ficará acessível em <strong>saraalagoas.com/f/{slug || 'meu-formulario'}</strong>
              </p>
            </div>

            {erro && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{erro}</p>
            )}

            <button
              type="submit"
              disabled={loading || !titulo.trim()}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#c2410c] hover:bg-[#9a3412] disabled:opacity-50 text-white font-bold text-sm py-3 transition-colors"
            >
              {loading
                ? <><Loader2 size={16} className="animate-spin" /> Criando...</>
                : <><Sparkles size={16} /> Criar e ir para o editor</>
              }
            </button>
          </form>
        </div>
      </div>
    </PageAccessGuard>
  )
}
