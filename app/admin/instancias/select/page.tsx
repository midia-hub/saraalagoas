'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { adminFetchJson } from '@/lib/admin-client'
import { Facebook, Instagram, Loader2, AlertCircle, ArrowLeft, Unlink } from 'lucide-react'

type MetaPage = {
  id: string
  name: string
  category?: string
  tasks?: string[]
}

type PageWithInstagram = MetaPage & {
  instagram_account?: {
    id: string
    username: string
  }
  loading?: boolean
}

export default function AdminInstanciasSelectPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const integrationId = searchParams?.get('integration_id')

  const [pages, setPages] = useState<PageWithInstagram[]>([])
  const [loading, setLoading] = useState(true)
  const [selecting, setSelecting] = useState(false)
  const [unlinking, setUnlinking] = useState(false)
  const [showUnlinkModal, setShowUnlinkModal] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const isPopup = searchParams?.get('popup') === '1'
    if (isPopup && typeof window !== 'undefined' && window.opener) {
      try {
        window.opener.postMessage(
          { type: 'meta-oauth-done', selectPage: true, connected: false },
          window.location.origin
        )
      } catch {
        // ignore
      }
    }
  }, [searchParams])

  useEffect(() => {
    if (!integrationId) {
      setError('integration_id ausente na URL')
      setLoading(false)
      return
    }

    async function loadPages() {
      setLoading(true)
      setError(null)
      try {
        const data = await adminFetchJson<{ pages: MetaPage[] }>(
          `/api/meta/pages?integration_id=${integrationId}`
        )
        setPages(data.pages || [])
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro ao carregar páginas.')
        setPages([])
      } finally {
        setLoading(false)
      }
    }

    loadPages()
  }, [integrationId])

  async function handleSelectPage(pageId: string) {
    if (!integrationId) return

    setSelecting(true)
    setError(null)
    try {
      const result = await adminFetchJson<{ success: boolean; has_instagram: boolean }>(
        '/api/meta/select-page',
        {
          method: 'POST',
          body: JSON.stringify({
            integration_id: integrationId,
            page_id: pageId,
          }),
        }
      )

      if (result.success) {
        const isPopup = searchParams?.get('popup') === '1'
        if (isPopup && typeof window !== 'undefined' && window.opener) {
          const instagram = (result as { integration?: { instagram_username?: string } }).integration?.instagram_username ?? ''
          window.location.href = `/admin/instancias/oauth-done?connected=1${instagram ? `&instagram=${encodeURIComponent(instagram)}` : ''}`
        } else {
          router.push('/admin/instancias?connected=1')
        }
      }
    } catch (e) {
      setSelecting(false)
      setError(e instanceof Error ? e.message : 'Erro ao selecionar página.')
    }
  }

  async function confirmUnlink() {
    if (!integrationId) return
    setUnlinking(true)
    setError(null)
    setShowUnlinkModal(false)
    try {
      await adminFetchJson(`/api/meta/integrations/${integrationId}`, {
        method: 'PATCH',
        body: JSON.stringify({ show_in_list: false }),
      })
      const isPopup = searchParams?.get('popup') === '1'
      if (isPopup && typeof window !== 'undefined' && window.opener) {
        window.location.href = '/admin/instancias/oauth-done'
      } else {
        router.push('/admin/instancias')
      }
    } catch (e) {
      setUnlinking(false)
      setError(e instanceof Error ? e.message : 'Erro ao desvincular.')
    }
  }

  if (!integrationId) {
    return (
      <PageAccessGuard pageKey="instagram">
        <div className="p-6 md:p-8">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            <p>Parâmetro integration_id ausente. Volte para a página de instâncias.</p>
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
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <button
              onClick={() => router.push('/admin/instancias')}
              className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 text-sm"
            >
              <ArrowLeft size={16} />
              Voltar para instâncias
            </button>
            <span className="text-slate-300">|</span>
            <button
              onClick={() => setShowUnlinkModal(true)}
              disabled={unlinking}
              className="inline-flex items-center gap-2 text-red-600 hover:text-red-700 text-sm disabled:opacity-60"
            >
              {unlinking ? 'Removendo...' : 'Desvincular esta conexão'}
            </button>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Selecionar página</h1>
          <p className="text-slate-600 mt-1">
            Escolha a página do Facebook que deseja conectar. Se houver uma conta Instagram Business vinculada, ela será detectada automaticamente.
          </p>
          <p className="text-sm text-slate-500 mt-2">
            Se nenhuma dessas páginas for a que você quer conectar, volte para Instâncias e use &quot;Desvincular&quot; na integração pendente para remover esta conexão e conectar com a conta correta.
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
        ) : pages.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center">
            <p className="text-slate-600 mb-4">
              Nenhuma página encontrada. Você precisa ter uma Página do Facebook para continuar.
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
            {pages.map((page) => (
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

                {page.instagram_account && (
                  <div className="mb-3 p-2 rounded-lg bg-pink-50 border border-pink-100">
                    <div className="flex items-center gap-2 text-sm">
                      <Instagram size={14} className="text-pink-700" />
                      <span className="text-pink-700 font-medium">
                        @{page.instagram_account.username}
                      </span>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => handleSelectPage(page.id)}
                  disabled={selecting}
                  className="w-full rounded-lg bg-[#c62737] px-4 py-2 text-sm text-white font-medium hover:bg-[#a01f2c] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {selecting ? 'Conectando...' : 'Selecionar esta página'}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Modal Desvincular */}
        {showUnlinkModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => !unlinking && setShowUnlinkModal(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="unlink-modal-title"
          >
            <div
              className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
                    <Unlink size={20} className="text-amber-700" />
                  </div>
                  <h2 id="unlink-modal-title" className="text-lg font-semibold text-slate-900">
                    Desvincular esta conexão
                  </h2>
                </div>
                <p className="text-slate-600 text-sm mb-1">
                  A conta sairá da lista de integrações na plataforma.
                </p>
                <p className="text-slate-600 text-sm mb-4">
                  Ela <strong>continuará disponível</strong> ao escolher onde postar (Instagram/Facebook).
                </p>
              </div>
              <div className="flex gap-3 justify-end px-6 pb-6">
                <button
                  type="button"
                  onClick={() => !unlinking && setShowUnlinkModal(false)}
                  disabled={unlinking}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmUnlink}
                  disabled={unlinking}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {unlinking ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Desvinculando...
                    </>
                  ) : (
                    'Desvincular'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageAccessGuard>
  )
}
