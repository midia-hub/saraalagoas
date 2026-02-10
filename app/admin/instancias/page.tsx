'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { adminFetchJson } from '@/lib/admin-client'
import { Facebook, Instagram, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react'

type MetaIntegration = {
  id: string
  created_at: string
  updated_at: string
  facebook_user_name: string | null
  page_name: string | null
  instagram_username: string | null
  is_active: boolean
  token_expires_at: string | null
  metadata: {
    pending_page_selection?: boolean
    pages_count?: number
  }
}

export default function AdminInstanciasPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [integrations, setIntegrations] = useState<MetaIntegration[]>([])
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function loadIntegrations() {
    setLoading(true)
    setError(null)
    try {
      const data = await adminFetchJson<{ integrations: MetaIntegration[] }>('/api/meta/integrations')
      setIntegrations(data.integrations || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar integrações.')
      setIntegrations([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadIntegrations()

    // Verificar mensagens de sucesso/erro da URL
    const connected = searchParams?.get('connected')
    const instagram = searchParams?.get('instagram')
    const errorParam = searchParams?.get('error')
    const errorDesc = searchParams?.get('error_description')

    if (connected === '1') {
      setSuccess(instagram 
        ? `Conectado com sucesso! Instagram: @${instagram}` 
        : 'Conectado com sucesso!'
      )
      // Recarregar lista após conexão (evita painel vazio por timing)
      const t = setTimeout(() => {
        loadIntegrations()
      }, 800)
      router.replace('/admin/instancias')
      return () => clearTimeout(t)
    } else if (errorParam) {
      setError(errorDesc || 'Erro ao conectar conta Meta')
      router.replace('/admin/instancias')
    }
  }, [searchParams, router])

  async function handleConnect() {
    setConnecting(true)
    setError(null)
    setSuccess(null)
    try {
      const data = await adminFetchJson<{ url: string }>('/api/meta/oauth/start', {
        method: 'GET',
      })
      // Redirecionar para OAuth
      window.location.href = data.url
    } catch (e) {
      setConnecting(false)
      setError(e instanceof Error ? e.message : 'Erro ao iniciar conexão.')
    }
  }

  async function handleToggleActive(id: string, currentActive: boolean) {
    setError(null)
    try {
      await adminFetchJson(`/api/meta/integrations/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: !currentActive }),
      })
      await loadIntegrations()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao atualizar integração.')
    }
  }

  async function handleUnlink(id: string) {
    if (
      !window.confirm(
        'Desvincular esta conta? A conexão será removida da nossa plataforma. Para revogar também no Facebook, use Configurações do Facebook → Apps e sites.'
      )
    ) {
      return
    }
    setError(null)
    try {
      await adminFetchJson(`/api/meta/integrations/${id}`, {
        method: 'DELETE',
      })
      setSuccess('Conta desvinculada com sucesso.')
      await loadIntegrations()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao desvincular conta.')
    }
  }

  function getStatusBadge(integration: MetaIntegration) {
    if (integration.metadata?.pending_page_selection) {
      return (
        <span className="inline-flex items-center gap-1 text-sm px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">
          <AlertCircle size={14} />
          Aguardando seleção
        </span>
      )
    }
    
    if (!integration.is_active) {
      return (
        <span className="inline-flex items-center gap-1 text-sm px-2 py-1 rounded-full bg-slate-100 text-slate-600">
          <XCircle size={14} />
          Inativa
        </span>
      )
    }

    const expiresAt = integration.token_expires_at ? new Date(integration.token_expires_at) : null
    const isExpired = expiresAt && expiresAt < new Date()

    if (isExpired) {
      return (
        <span className="inline-flex items-center gap-1 text-sm px-2 py-1 rounded-full bg-red-100 text-red-700">
          <XCircle size={14} />
          Token expirado
        </span>
      )
    }

    return (
      <span className="inline-flex items-center gap-1 text-sm px-2 py-1 rounded-full bg-green-100 text-green-700">
        <CheckCircle size={14} />
        Ativa
      </span>
    )
  }

  return (
    <PageAccessGuard pageKey="instagram">
      <div className="p-6 md:p-8">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Instâncias (Meta)</h1>
          <p className="text-slate-600 mt-1">
            Conecte contas do Facebook/Instagram via OAuth para publicar e gerenciar mensagens.
          </p>
        </header>

        {/* Mensagens de sucesso/erro */}
        {success && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-green-700 flex items-start gap-2">
            <CheckCircle size={18} className="shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700 flex items-start gap-2">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Botão conectar */}
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-slate-900 mb-3">Nova conexão</h2>
          <p className="text-slate-600 text-sm mb-4">
            Clique no botão abaixo para conectar uma conta Meta (Facebook) e selecionar uma página com Instagram Business.
          </p>
          <button
            onClick={handleConnect}
            disabled={connecting}
            className="inline-flex items-center gap-2 rounded-lg bg-[#1877f2] px-5 py-2.5 text-white font-medium hover:bg-[#166fe5] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {connecting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Conectando...
              </>
            ) : (
              <>
                <Facebook size={18} />
                Conectar conta Meta
              </>
            )}
          </button>
        </div>

        {/* Lista de integrações */}
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 p-4">
            <h2 className="font-semibold text-slate-900">Integrações conectadas</h2>
            <p className="text-xs text-slate-500 mt-1">
              Use &quot;Desvincular conta&quot; para remover a conexão da nossa plataforma. Para revogar o app no Facebook: Configurações → Apps e sites.
            </p>
          </div>
          {loading ? (
            <div className="p-8 flex items-center justify-center">
              <Loader2 size={24} className="animate-spin text-slate-400" />
            </div>
          ) : integrations.length === 0 ? (
            <p className="p-8 text-center text-slate-600">
              Nenhuma integração conectada. Clique em "Conectar conta Meta" para começar.
            </p>
          ) : (
            <div className="divide-y divide-slate-200">
              {integrations.map((integration) => (
                <div key={integration.id} className="p-5 hover:bg-slate-50 transition-colors">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusBadge(integration)}
                        {integration.instagram_username && (
                          <span className="inline-flex items-center gap-1 text-sm px-2 py-1 rounded-full bg-pink-50 text-pink-700">
                            <Instagram size={14} />
                            @{integration.instagram_username}
                          </span>
                        )}
                      </div>
                      <p className="font-medium text-slate-900 mb-1">
                        {integration.page_name || integration.facebook_user_name || 'Sem nome'}
                      </p>
                      <div className="text-sm text-slate-600 space-y-0.5">
                        {integration.facebook_user_name && (
                          <p>Usuário: {integration.facebook_user_name}</p>
                        )}
                        {integration.page_name && (
                          <p>Página: {integration.page_name}</p>
                        )}
                        {integration.token_expires_at && (
                          <p>
                            Token expira em: {new Date(integration.token_expires_at).toLocaleDateString('pt-BR')}
                          </p>
                        )}
                        <p className="text-xs text-slate-500">
                          Atualizado em: {new Date(integration.updated_at).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {integration.metadata?.pending_page_selection ? (
                        <button
                          onClick={() => router.push(`/admin/instancias/select?integration_id=${integration.id}`)}
                          className="rounded-lg bg-[#c62737] px-4 py-2 text-sm text-white hover:bg-[#a01f2c] transition-colors"
                        >
                          Selecionar página
                        </button>
                      ) : (
                        <button
                          onClick={() => handleToggleActive(integration.id, integration.is_active)}
                          className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100 transition-colors"
                        >
                          {integration.is_active ? 'Desativar' : 'Ativar'}
                        </button>
                      )}
                      <button
                        onClick={() => handleUnlink(integration.id)}
                        className="rounded-lg border border-red-300 px-4 py-2 text-sm text-red-700 hover:bg-red-50 transition-colors"
                        title="Remove a conexão desta conta Meta/Instagram da nossa plataforma"
                      >
                        Desvincular conta
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageAccessGuard>
  )
}
