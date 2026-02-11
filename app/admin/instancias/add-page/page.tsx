'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { adminFetchJson } from '@/lib/admin-client'
import { Facebook, Instagram, Loader2, AlertCircle, ArrowLeft, Plus } from 'lucide-react'

type MetaPage = {
  id: string
  name: string
  category?: string
}

type MetaIntegration = {
  id: string
  page_id: string | null
  page_name: string | null
  instagram_username: string | null
}

export default function AdminInstanciasAddPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const integrationId = searchParams?.get('integration_id')

  const [pages, setPages] = useState<MetaPage[]>([])
  const [existingPageIds, setExistingPageIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!integrationId) {
      setLoading(false)
      return
    }

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [pagesRes, integrationsRes] = await Promise.all([
          adminFetchJson<{ pages: MetaPage[] }>(`/api/meta/pages?integration_id=${integrationId}`),
          adminFetchJson<{ integrations: MetaIntegration[] }>('/api/meta/integrations'),
        ])
        const allPages = pagesRes.pages || []
        const connectedIds = new Set(
          (integrationsRes.integrations || [])
            .map((i) => i.page_id)
            .filter((id): id is string => !!id)
        )
        setPages(allPages)
        setExistingPageIds(connectedIds)
      } catch (e) {
        setError('Não foi possível carregar as páginas. Tente novamente.')
        setPages([])
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [integrationId])

  const availablePages = pages.filter((p) => !existingPageIds.has(p.id))

  async function handleAddPage(pageId: string) {
    if (!integrationId) return
    setAdding(true)
    setError(null)
    try {
      await adminFetchJson('/api/meta/add-page', {
        method: 'POST',
        body: JSON.stringify({ integration_id: integrationId, page_id: pageId }),
      })
      router.push('/admin/instancias?connected=1')
    } catch (e) {
      setAdding(false)
      setError('Não foi possível adicionar a página. Tente novamente.')
    }
  }

  if (!integrationId) {
    return (
      <PageAccessGuard pageKey="instagram">
        <div className="p-6 md:p-8">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            <p>Parâmetro integration_id ausente.</p>
            <button
              onClick={() => router.push('/admin/instancias')}
              className="mt-3 inline-flex items-center gap-2 text-sm underline"
            >
              <ArrowLeft size={16} />
              Voltar para instâncias
            </button>
          </div>
        </div>
      </PageAccessGuard>
    )
  }

  return (
    <PageAccessGuard pageKey="instagram">
      <div className="p-6 md:p-8">
        <div className="mb-6">
          <button
            onClick={() => router.push('/admin/instancias')}
            className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-3 text-sm"
          >
            <ArrowLeft size={16} />
            Voltar para instâncias
          </button>
          <h1 className="text-2xl font-bold text-slate-900">Adicionar outra página</h1>
          <p className="text-slate-600 mt-1">
            Escolha uma página da mesma conta Facebook para usar na plataforma. Páginas já conectadas não aparecem aqui.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700 flex items-start gap-2">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={32} className="animate-spin text-slate-400" />
          </div>
        ) : availablePages.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center">
            <p className="text-slate-600 mb-4">
              {pages.length === 0
                ? 'Nenhuma página encontrada nesta conta.'
                : 'Todas as páginas desta conta já estão conectadas.'}
            </p>
            <button
              onClick={() => router.push('/admin/instancias')}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-white"
            >
              <ArrowLeft size={16} />
              Voltar
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {availablePages.map((page) => (
              <div
                key={page.id}
                className="rounded-xl border border-slate-200 bg-white p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-[#1877f2] flex items-center justify-center shrink-0">
                    <Facebook size={20} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 truncate">{page.name}</h3>
                    {page.category && (
                      <p className="text-xs text-slate-500 mt-0.5">{page.category}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleAddPage(page.id)}
                  disabled={adding}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#c62737] px-4 py-2 text-sm text-white font-medium hover:bg-[#a01f2c] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {adding ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Plus size={16} />
                  )}
                  {adding ? 'Adicionando...' : 'Adicionar esta página'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageAccessGuard>
  )
}
