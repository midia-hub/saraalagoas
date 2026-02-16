'use client'

import { useEffect, useState } from 'react'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { AdminPageHeader } from '@/app/admin/AdminPageHeader'
import { adminFetchJson } from '@/lib/admin-client'
import { Check, X, Users, Loader2, RefreshCw, ExternalLink } from 'lucide-react'
import { CustomSelect } from '@/components/ui/CustomSelect'

type MetaIntegration = {
  id: string
  page_name: string | null
  instagram_username: string | null
}

type CollaborationInvite = {
  media_id: string
  media_owner_username: string
  caption: string
  media_url: string
}

type CollaborationInvitesResponse = {
  ok: boolean
  invites: CollaborationInvite[]
  paging?: {
    cursors?: {
      before?: string
      after?: string
    }
  }
}

export default function InstagramCollaborationPage() {
  const [integrations, setIntegrations] = useState<MetaIntegration[]>([])
  const [selectedIntegrationId, setSelectedIntegrationId] = useState<string>('')
  const [invites, setInvites] = useState<CollaborationInvite[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [processingMediaId, setProcessingMediaId] = useState<string | null>(null)

  // Carregar integrações
  useEffect(() => {
    async function loadIntegrations() {
      try {
        const data = await adminFetchJson<{ instances: MetaIntegration[] }>(
          '/api/admin/instagram/instances?forPosting=1&metaOnly=1&instagramOnly=1'
        )
        const instances = data?.instances || []
        setIntegrations(instances)
        if (instances.length > 0 && !selectedIntegrationId) {
          setSelectedIntegrationId(instances[0].id)
        }
      } catch (err) {
        setError('Erro ao carregar integrações.')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadIntegrations()
  }, [])

  // Carregar convites quando a integração mudar
  useEffect(() => {
    if (selectedIntegrationId) {
      loadInvites()
    }
  }, [selectedIntegrationId])

  async function loadInvites() {
    if (!selectedIntegrationId) return

    setRefreshing(true)
    setError(null)

    try {
      const data = await adminFetchJson<CollaborationInvitesResponse>(
        `/api/meta/collaboration?action=list_invites&integrationId=${selectedIntegrationId}&limit=50`
      )
      setInvites(data?.invites || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar convites.')
      console.error(err)
    } finally {
      setRefreshing(false)
    }
  }

  async function handleRespond(mediaId: string, accept: boolean) {
    if (!selectedIntegrationId) return

    setProcessingMediaId(mediaId)
    setError(null)

    try {
      const response = await fetch('/api/meta/collaboration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          integrationId: selectedIntegrationId,
          mediaId,
          accept,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Falha ao responder convite.')
      }

      // Remover convite da lista
      setInvites((prev) => prev.filter((invite) => invite.media_id !== mediaId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao responder convite.')
      console.error(err)
    } finally {
      setProcessingMediaId(null)
    }
  }

  const selectedIntegration = integrations.find((i) => i.id === selectedIntegrationId)

  if (loading) {
    return (
      <PageAccessGuard pageKey="instagram">
        <div className="p-6 md:p-8 flex items-center justify-center min-h-[320px]">
          <Loader2 className="w-8 h-8 animate-spin text-[#c62737]" />
        </div>
      </PageAccessGuard>
    )
  }

  return (
    <PageAccessGuard pageKey="instagram">
      <div className="p-6 md:p-8">
        <AdminPageHeader
          icon={Users}
          title="Convites de colaboração"
          subtitle="Gerencie convites recebidos de outros usuários do Instagram."
        />

        {/* Seletor de conta */}
        {integrations.length > 0 && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Conta Instagram
            </label>
            <div className="flex items-center gap-3">
              <CustomSelect
                value={selectedIntegrationId}
                onChange={setSelectedIntegrationId}
                placeholder="Conta Instagram"
                options={integrations.map((integration) => ({
                  value: integration.id,
                  label: integration.instagram_username ? `@${integration.instagram_username}` : integration.page_name || 'Conta Instagram',
                }))}
              />
              <button
                onClick={loadInvites}
                disabled={refreshing}
                className="px-4 py-2 bg-[#c62737] text-white rounded-lg hover:bg-[#a61f2e] disabled:opacity-50 flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                Atualizar
              </button>
            </div>
          </div>
        )}

        {/* Mensagem de erro */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Nenhuma integração */}
        {integrations.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-16 h-16 mx-auto text-slate-400 mb-4" />
            <p className="text-slate-600">
              Nenhuma conta Instagram conectada.
            </p>
            <a
              href="/admin/instancias"
              className="mt-4 inline-block text-[#c62737] hover:text-[#a61f2e]"
            >
              Conectar conta Instagram →
            </a>
          </div>
        )}

        {/* Lista de convites */}
        {integrations.length > 0 && (
          <>
            {invites.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-lg">
                <Users className="w-16 h-16 mx-auto text-slate-400 mb-4" />
                <p className="text-slate-600">
                  {refreshing
                    ? 'Carregando convites...'
                    : 'Nenhum convite de colaboração pendente.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-sm text-slate-600 mb-4">
                  {invites.length} {invites.length === 1 ? 'convite' : 'convites'} pendente
                  {invites.length !== 1 ? 's' : ''}
                </div>

                {invites.map((invite) => (
                  <div
                    key={invite.media_id}
                    className="bg-white border border-slate-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start gap-4">
                      {/* Thumbnail do post */}
                      <div className="flex-shrink-0">
                        <img
                          src={invite.media_url}
                          alt="Post"
                          className="w-32 h-32 object-cover rounded-lg"
                        />
                      </div>

                      {/* Informações do convite */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-slate-900">
                            @{invite.media_owner_username}
                          </span>
                          <span className="text-slate-500">te convidou para colaborar</span>
                        </div>

                        {invite.caption && (
                          <p className="text-slate-700 mb-3 line-clamp-3">
                            {invite.caption}
                          </p>
                        )}

                        <a
                          href={invite.media_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                          Ver post original
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>

                      {/* Ações */}
                      <div className="flex-shrink-0 flex gap-2">
                        <button
                          onClick={() => handleRespond(invite.media_id, true)}
                          disabled={processingMediaId === invite.media_id}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                        >
                          {processingMediaId === invite.media_id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                          Aceitar
                        </button>
                        <button
                          onClick={() => handleRespond(invite.media_id, false)}
                          disabled={processingMediaId === invite.media_id}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                        >
                          {processingMediaId === invite.media_id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <X className="w-4 h-4" />
                          )}
                          Recusar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Informações sobre colaborações */}
        <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
          <h2 className="text-lg font-semibold text-blue-900 mb-3">
            📖 Sobre Convites de Colaboração
          </h2>
          <ul className="space-y-2 text-blue-800 text-sm">
            <li>• Quando você aceita, o post aparece no seu feed também</li>
            <li>• O engajamento é compartilhado entre os colaboradores</li>
            <li>• Até 5 contas podem colaborar em um único post</li>
            <li>• Funciona com posts de Feed, Reels e Carrosséis</li>
            <li>• O autor original sempre mantém o controle do post</li>
          </ul>
        </div>
      </div>
    </PageAccessGuard>
  )
}
