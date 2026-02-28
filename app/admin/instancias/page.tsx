'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { AdminPageHeader } from '@/app/admin/AdminPageHeader'
import { adminFetchJson } from '@/lib/admin-client'
import { Facebook, Instagram, Youtube, CheckCircle, XCircle, AlertCircle, Loader2, Unlink, Link2, Trash2, Video } from 'lucide-react'
import { CustomSelect } from '@/components/ui/CustomSelect'

type MetaIntegration = {
  id: string
  created_at: string
  updated_at: string
  facebook_user_name: string | null
  page_name: string | null
  page_id: string | null
  instagram_username: string | null
  is_active: boolean
  token_expires_at: string | null
  metadata: {
    pending_page_selection?: boolean
    pages_count?: number
    show_in_list?: boolean
  }
  readiness?: {
    instagram?: {
      ready: boolean
      hasInstagramBusinessAccount: boolean
      hasPageAccessToken: boolean
      tokenExpired: boolean
      missingScopes: string[]
    }
  }
}

// ─── Tipo YouTube ────────────────────────────────────────────────────────────
type YouTubeIntegration = {
  id:                    string
  created_at:            string
  updated_at:            string
  channel_id:            string | null
  channel_title:         string | null
  channel_custom_url:    string | null
  channel_thumbnail_url: string | null
  token_expires_at:      string | null
  scopes:                string[] | null
  is_active:             boolean
  metadata:              Record<string, unknown>
}

type YouTubePostModal = {
  integrationId: string
  channelTitle:  string
  open:          boolean
}

export default function AdminInstanciasPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [integrations, setIntegrations] = useState<MetaIntegration[]>([])
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [unlinkModalId, setUnlinkModalId] = useState<string | null>(null)
  const [unlinking, setUnlinking] = useState(false)
  const [revinkingId, setRevinkingId] = useState<string | null>(null)

  // ── YouTube ──
  const [ytIntegrations, setYtIntegrations]   = useState<YouTubeIntegration[]>([])
  const [ytLoading, setYtLoading]             = useState(true)
  const [ytConnecting, setYtConnecting]       = useState(false)
  const [ytTogglingId, setYtTogglingId]       = useState<string | null>(null)
  const [ytDeletingId, setYtDeletingId]       = useState<string | null>(null)
  const [ytDeleteModalId, setYtDeleteModalId] = useState<string | null>(null)
  const [ytPostModal, setYtPostModal]         = useState<YouTubePostModal | null>(null)
  const [ytPostForm, setYtPostForm]           = useState({
    videoUrl:      '',
    title:         '',
    description:   '',
    privacyStatus: 'public',
    tags:          '',
  })
  const [ytPosting, setYtPosting]             = useState(false)

  const instagramScopeLabels: Record<string, string> = {
    pages_show_list: 'Listagem de páginas',
    pages_read_engagement: 'Leitura de engajamento da página',
    instagram_basic: 'Acesso básico ao Instagram',
    instagram_content_publish: 'Publicação de conteúdo no Instagram',
    pages_manage_posts: 'Publicar posts na Página do Facebook',
  }

  async function loadIntegrations() {
    setLoading(true)
    setError(null)
    try {
      const data = await adminFetchJson<{ integrations: MetaIntegration[] }>('/api/meta/integrations?all=1')
      setIntegrations(data.integrations || [])
    } catch (e) {
      setError('Não foi possível carregar as integrações. Tente novamente.')
      setIntegrations([])
    } finally {
      setLoading(false)
    }
  }

  async function loadYtIntegrations() {
    setYtLoading(true)
    try {
      const data = await adminFetchJson<{ integrations: YouTubeIntegration[] }>('/api/admin/youtube/integrations')
      setYtIntegrations(data.integrations || [])
    } catch {
      setYtIntegrations([])
    } finally {
      setYtLoading(false)
    }
  }

  useEffect(() => {
    loadIntegrations()
    loadYtIntegrations()
  }, [])

  // Tratar retorno por query params (fluxo sem popup / fallback)
  useEffect(() => {
    const connected = searchParams?.get('connected')
    const instagram = searchParams?.get('instagram')
    const errorParam = searchParams?.get('error')
    const errorDescRaw = searchParams?.get('error_description')
    let errorDesc: string | null = null
    if (errorDescRaw) {
      try {
        errorDesc = decodeURIComponent(errorDescRaw)
      } catch {
        errorDesc = errorDescRaw
      }
    }

    if (connected === '1') {
      const count = searchParams?.get('count')
      const instagramParam = searchParams?.get('instagram')
      let msg = 'Conectado com sucesso!'
      if (count && Number(count) > 1) {
        msg = `${count} contas conectadas. Todas aparecem na lista abaixo.`
      } else if (instagramParam) {
        const handles = instagramParam.split(',').map((s) => `@${s.trim()}`).filter(Boolean)
        msg = handles.length > 0 ? `Conectado! Instagram: ${handles.join(', ')}` : msg
      }
      setSuccess(msg)
      setTimeout(() => loadIntegrations(), 800)
      router.replace('/admin/instancias')
    } else if (errorParam) {
      setError(errorDesc || 'Não foi possível conectar a conta. Tente novamente.')
      router.replace('/admin/instancias')
    }
  }, [searchParams, router])

  async function handleConnect() {
    setConnecting(true)
    setError(null)
    setSuccess(null)
    try {
      const data = await adminFetchJson<{ url: string }>('/api/meta/oauth/start?popup=1', {
        method: 'GET',
      })
      const width = 560
      const height = 640
      const left = Math.round((window.screen.width - width) / 2)
      const top = Math.round((window.screen.height - height) / 2)
      const popup = window.open(
        data.url,
        'meta-oauth',
        `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
      )
      if (!popup) {
        setError('O popup foi bloqueado. Permita popups para este site e tente novamente.')
        setConnecting(false)
        return
      }

      const handleMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return
        const msg = event.data
        if (msg?.type !== 'meta-oauth-done') return
        window.removeEventListener('message', handleMessage)
        clearInterval(intervalId)
        setConnecting(false)
        if (msg.error) {
          setError(
            msg.errorDescription || 'Não foi possível conectar a conta. Tente novamente.'
          )
        } else if (msg.connected) {
          const n = msg.count ? Number(msg.count) : 0
          if (n > 1) {
            setSuccess(`${n} contas conectadas. Todas aparecem na lista abaixo.`)
          } else if (msg.instagram) {
            const handles = String(msg.instagram).split(',').map((s) => `@${s.trim()}`).filter(Boolean)
            setSuccess(handles.length ? `Conectado! Instagram: ${handles.join(', ')}` : 'Conectado com sucesso!')
          } else {
            setSuccess('Conectado com sucesso!')
          }
          loadIntegrations()
        } else if (msg.selectPage) {
          setSuccess('Selecione a página e o Instagram na janela que abriu.')
          loadIntegrations()
        }
      }

      const intervalId = setInterval(() => {
        if (popup.closed) {
          clearInterval(intervalId)
          window.removeEventListener('message', handleMessage)
          setConnecting(false)
        }
      }, 300)

      window.addEventListener('message', handleMessage)
    } catch (e) {
      setConnecting(false)
      const msg = e instanceof Error ? e.message : null
      setError(msg && msg !== 'Erro 500' ? msg : 'Não foi possível iniciar a conexão. Verifique as configurações do servidor (Meta) e tente novamente.')
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
      setError('Não foi possível atualizar. Tente novamente.')
    }
  }

  function openUnlinkModal(id: string) {
    setUnlinkModalId(id)
  }

  async function confirmUnlink() {
    const id = unlinkModalId
    if (!id) return
    setUnlinking(true)
    setError(null)
    setUnlinkModalId(null)
    try {
      await adminFetchJson(`/api/meta/integrations/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ show_in_list: false }),
      })
      setSuccess('Conta desvinculada da lista. Ela continua disponível ao escolher onde postar.')
      await loadIntegrations()
    } catch (e) {
      setError('Não foi possível desvincular. Tente novamente.')
    } finally {
      setUnlinking(false)
    }
  }

  function isLinked(integration: MetaIntegration) {
    return (integration.metadata as { show_in_list?: boolean })?.show_in_list !== false
  }

  async function handleRevincular(id: string) {
    setRevinkingId(id)
    setError(null)
    try {
      await adminFetchJson(`/api/meta/integrations/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ show_in_list: true }),
      })
      setSuccess('Conta revinculada. Ela voltou à lista de integrações.')
      await loadIntegrations()
    } catch (e) {
      setError('Não foi possível revincular. Tente novamente.')
    } finally {
      setRevinkingId(null)
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Funções YouTube
  // ──────────────────────────────────────────────────────────────────────────
  async function handleConnectYouTube() {
    setYtConnecting(true)
    setError(null)
    setSuccess(null)
    try {
      const data = await adminFetchJson<{ url: string }>('/api/youtube/oauth/start?popup=1')
      const width  = 520
      const height = 640
      const left   = Math.round((window.screen.width  - width)  / 2)
      const top    = Math.round((window.screen.height - height) / 2)
      const popup  = window.open(
        data.url,
        'youtube-oauth',
        `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
      )
      if (!popup) {
        setError('Popup bloqueado. Permita popups para este site e tente novamente.')
        setYtConnecting(false)
        return
      }
      const handleMsg = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return
        if (event.data?.type !== 'youtube-oauth-done') return
        window.removeEventListener('message', handleMsg)
        clearInterval(timer)
        setYtConnecting(false)
        if (event.data.connected) {
          const label = event.data.channel ? `Canal: ${event.data.channel}` : 'Canal conectado!'
          setSuccess(`YouTube conectado! ${label}`)
          loadYtIntegrations()
        } else {
          setError(event.data.error || 'Não foi possível conectar o canal.')
        }
      }
      const timer = setInterval(() => {
        if (popup.closed) { clearInterval(timer); window.removeEventListener('message', handleMsg); setYtConnecting(false) }
      }, 400)
      window.addEventListener('message', handleMsg)
    } catch (e) {
      setYtConnecting(false)
      const msg = e instanceof Error ? e.message : null
      setError(msg || 'Não foi possível iniciar a conexão com o YouTube. Configure YOUTUBE_CLIENT_ID e YOUTUBE_CLIENT_SECRET no .env.')
    }
  }

  async function handleToggleYoutubeActive(id: string, current: boolean) {
    setYtTogglingId(id)
    try {
      await adminFetchJson(`/api/admin/youtube/integrations/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: !current }),
      })
      await loadYtIntegrations()
    } catch {
      setError('Não foi possível atualizar. Tente novamente.')
    } finally {
      setYtTogglingId(null)
    }
  }

  async function confirmDeleteYoutube() {
    const id = ytDeleteModalId
    if (!id) return
    setYtDeletingId(id)
    setYtDeleteModalId(null)
    try {
      await adminFetchJson(`/api/admin/youtube/integrations/${id}`, { method: 'DELETE' })
      setSuccess('Canal do YouTube removido.')
      await loadYtIntegrations()
    } catch {
      setError('Não foi possível remover. Tente novamente.')
    } finally {
      setYtDeletingId(null)
    }
  }

  async function handlePostToYouTube() {
    if (!ytPostModal) return
    if (!ytPostForm.videoUrl) { setError('Informe a URL do vídeo.'); return }
    if (!ytPostForm.title)    { setError('Informe o título do vídeo.'); return }
    setYtPosting(true)
    setError(null)
    try {
      const tags = ytPostForm.tags
        ? ytPostForm.tags.split(',').map((t) => t.trim()).filter(Boolean)
        : []
      const result = await adminFetchJson<{ videoId: string; videoUrl: string }>('/api/admin/youtube/post', {
        method: 'POST',
        body: JSON.stringify({
          integrationId: ytPostModal.integrationId,
          videoUrl:      ytPostForm.videoUrl,
          title:         ytPostForm.title,
          description:   ytPostForm.description,
          privacyStatus: ytPostForm.privacyStatus,
          tags,
        }),
      })
      setYtPostModal(null)
      setYtPostForm({ videoUrl: '', title: '', description: '', privacyStatus: 'public', tags: '' })
      setSuccess(`Vídeo enviado ao YouTube! ${result.videoUrl}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao publicar vídeo.')
    } finally {
      setYtPosting(false)
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

  function getInstagramChecklist(integration: MetaIntegration) {
    const readiness = integration.readiness?.instagram
    const missingScopes = readiness?.missingScopes || []
    return [
      {
        ok: !!integration.is_active,
        label: 'Integração ativa',
      },
      {
        ok: readiness ? readiness.hasInstagramBusinessAccount : !!integration.instagram_username,
        label: 'Conta Instagram Business vinculada',
      },
      {
        ok: readiness ? readiness.hasPageAccessToken : true,
        label: 'Token de página disponível',
      },
      {
        ok: readiness ? !readiness.tokenExpired : true,
        label: 'Token válido (não expirado)',
      },
      {
        ok: missingScopes.length === 0,
        label:
          missingScopes.length === 0
            ? 'Permissões de publicação no Instagram concedidas'
            : `Permissões ausentes: ${missingScopes
                .map((scope) => instagramScopeLabels[scope] || scope)
                .join(', ')}`,
      },
    ]
  }

  return (
    <PageAccessGuard pageKey="instagram">
      <div className="p-6 md:p-8">
        <AdminPageHeader
          icon={Link2}
          title="Contas Conectadas"
          subtitle="Gerencie as integrações com Instagram, Facebook e YouTube para publicar diretamente da plataforma."
        />

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

        {/* Login / Conectar Instagram e Facebook */}
        <div className="mb-6 rounded-xl border-2 border-[#c62737]/20 bg-white p-5">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Conectar Instagram e Facebook</h2>
          <p className="text-slate-600 text-sm mb-4">
            O login é validado para publicação no Instagram (escopos obrigatórios + conta Instagram Business). Faça login com a conta Meta que administra a página e o perfil do Instagram.
          </p>
          <button
            onClick={handleConnect}
            disabled={connecting}
            className="inline-flex items-center gap-2 rounded-lg bg-[#1877f2] px-5 py-2.5 text-white font-medium hover:bg-[#166fe5] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {connecting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Abrindo login...
              </>
            ) : (
              <>
                <Facebook size={18} />
                Conectar conta (login Meta / Instagram)
              </>
            )}
          </button>
          <p className="mt-3 text-xs text-slate-500">
            Para usar outras páginas da mesma conta, use &quot;Adicionar outra página&quot; na integração abaixo.
          </p>
        </div>

        {/* Conectar YouTube */}
        <div className="mb-6 rounded-xl border-2 border-red-100 bg-white p-5">
          <h2 className="text-lg font-semibold text-slate-900 mb-2 flex items-center gap-2">
            <Youtube size={20} className="text-red-600" />
            Conectar YouTube
          </h2>
          <p className="text-slate-600 text-sm mb-4">
            Faça login com a conta Google que administra o canal. O acesso permite fazer upload de vídeos
            diretamente pelo painel. Necessário configurar <strong>YOUTUBE_CLIENT_ID</strong> e{' '}
            <strong>YOUTUBE_CLIENT_SECRET</strong> (Google Cloud Console &rarr; APIs &amp; Services &rarr; Credentials).
          </p>
          <button
            onClick={handleConnectYouTube}
            disabled={ytConnecting}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-white font-medium hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {ytConnecting ? (
              <><Loader2 size={18} className="animate-spin" /> Abrindo login...</>
            ) : (
              <><Youtube size={18} /> Conectar canal do YouTube</>
            )}
          </button>
          <p className="mt-3 text-xs text-slate-500">
            O canal vinculado aparecerá na lista abaixo. Cada conta Google pode ter apenas um canal por conexão.
          </p>
        </div>

        {/* Resumo: contas disponíveis para postagem */}
        {!loading && integrations.length > 0 && (
          <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total integrações</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{integrations.length}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Instagram (ativas)</p>
              <p className="mt-1 text-2xl font-semibold text-pink-600">
                {integrations.filter((i) => i.instagram_username && i.is_active).length}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">disponíveis para postar</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Instagram prontas</p>
              <p className="mt-1 text-2xl font-semibold text-emerald-600">
                {integrations.filter((i) => i.instagram_username && i.readiness?.instagram?.ready).length}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">com checklist completo</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Facebook (ativas)</p>
              <p className="mt-1 text-2xl font-semibold text-[#1877f2]">
                {integrations.filter((i) => i.page_id && i.is_active).length}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">disponíveis para postar</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Na lista / Desvinculadas</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">
                {integrations.filter(isLinked).length} / {integrations.filter((i) => !isLinked(i)).length}
              </p>
            </div>
            <div className="rounded-xl border border-red-100 bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 flex items-center gap-1">
                <Youtube size={12} className="text-red-600" /> YouTube (ativo)
              </p>
              <p className="mt-1 text-2xl font-semibold text-red-600">
                {ytIntegrations.filter((i) => i.is_active).length}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">canais conectados</p>
            </div>
          </div>
        )}

        {/* Lista de integrações: separada em Instagram e Facebook */}
        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 flex items-center justify-center">
            <Loader2 size={24} className="animate-spin text-slate-400" />
          </div>
        ) : integrations.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-600">
            Nenhuma integração conectada. Clique em &quot;Conectar conta Meta&quot; para começar.
          </div>
        ) : (
          <div className="space-y-8">
            {/* Canais YouTube */}
            <div className="rounded-xl border border-red-200 bg-white">
              <div className="border-b border-red-100 px-4 py-3 bg-red-50/50">
                <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                  <Youtube size={20} className="text-red-600" />
                  Canais YouTube
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Canais do YouTube conectados via OAuth Google.</p>
              </div>
              {ytLoading ? (
                <div className="p-6 flex items-center justify-center">
                  <Loader2 size={20} className="animate-spin text-slate-400" />
                </div>
              ) : ytIntegrations.length === 0 ? (
                <p className="p-5 text-sm text-slate-500">Nenhum canal conectado. Clique em &quot;Conectar canal do YouTube&quot; acima.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {ytIntegrations.map((yt) => {
                    const expiresAt = yt.token_expires_at ? new Date(yt.token_expires_at) : null
                    const isExpired = expiresAt ? expiresAt < new Date() : false
                    return (
                      <div key={yt.id} className="p-5 hover:bg-slate-50 flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0 flex items-start gap-3">
                          {yt.channel_thumbnail_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={yt.channel_thumbnail_url} alt={yt.channel_title ?? ''} className="w-10 h-10 rounded-full shrink-0 border border-slate-200" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                              <Youtube size={18} className="text-red-600" />
                            </div>
                          )}
                          <div>
                            <div className="flex flex-wrap items-center gap-2 mb-0.5">
                              {yt.is_active && !isExpired ? (
                                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                                  <CheckCircle size={12} /> Ativa
                                </span>
                              ) : isExpired ? (
                                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                                  <XCircle size={12} /> Token expirado
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                  <XCircle size={12} /> Inativa
                                </span>
                              )}
                              <span className="font-medium text-slate-900">{yt.channel_title || 'Canal sem nome'}</span>
                            </div>
                            <div className="text-xs text-slate-500 space-y-0.5">
                              {yt.channel_custom_url && <p>Handle: {yt.channel_custom_url}</p>}
                              {yt.channel_id && <p>ID: {yt.channel_id}</p>}
                              <p>Atualizado: {new Date(yt.updated_at).toLocaleString('pt-BR')}</p>
                              {expiresAt && (
                                <p className={isExpired ? 'text-red-600 font-medium' : ''}>
                                  Token {isExpired ? 'expirou' : 'expira'}: {expiresAt.toLocaleDateString('pt-BR')}
                                  {isExpired && ' — Reconecte o canal'}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 shrink-0">
                          {isExpired && (
                            <button
                              onClick={handleConnectYouTube}
                              disabled={ytConnecting}
                              className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm text-amber-800 hover:bg-amber-100 disabled:opacity-50 flex items-center gap-1"
                            >
                              {ytConnecting && <Loader2 className="w-3 h-3 animate-spin" />}
                              Reconectar
                            </button>
                          )}
                          {yt.is_active && !isExpired && (
                            <button
                              onClick={() => {
                                setYtPostForm({ videoUrl: '', title: yt.channel_title ? `Novo vídeo — ${yt.channel_title}` : '', description: '', privacyStatus: 'public', tags: '' })
                                setYtPostModal({ integrationId: yt.id, channelTitle: yt.channel_title ?? '', open: true })
                              }}
                              className="rounded-lg bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700 flex items-center gap-1"
                            >
                              <Video size={14} /> Publicar vídeo
                            </button>
                          )}
                          <button
                            onClick={() => handleToggleYoutubeActive(yt.id, yt.is_active)}
                            disabled={ytTogglingId === yt.id}
                            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 disabled:opacity-50"
                          >
                            {ytTogglingId === yt.id ? <Loader2 size={14} className="animate-spin" /> : (yt.is_active ? 'Desativar' : 'Ativar')}
                          </button>
                          <button
                            onClick={() => setYtDeleteModalId(yt.id)}
                            disabled={ytDeletingId === yt.id}
                            className="rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 flex items-center gap-1 disabled:opacity-50"
                          >
                            {ytDeletingId === yt.id ? <Loader2 size={14} className="animate-spin" /> : <><Trash2 size={14} /> Remover</>}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Pendentes (sem página escolhida) - só vinculadas */}
            {integrations.filter((i) => isLinked(i) && i.metadata?.pending_page_selection).length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white">
                <div className="border-b border-slate-200 px-4 py-3 bg-slate-50">
                  <h2 className="font-semibold text-slate-900">Pendentes</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Conclua a seleção da página. Se as páginas que aparecerem não forem da conta que você quer conectar, use &quot;Desvincular&quot; para remover esta conexão e conectar de novo com a conta correta.
                  </p>
                </div>
                <div className="divide-y divide-slate-200">
                  {integrations
                    .filter((i) => isLinked(i) && i.metadata?.pending_page_selection)
                    .map((integration) => (
                      <div key={integration.id} className="p-5 flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          {getStatusBadge(integration)}
                          <span className="text-slate-700">{integration.facebook_user_name || 'Conta Meta'}</span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => router.push(`/admin/instancias/select?integration_id=${integration.id}`)}
                            className="rounded-lg bg-[#c62737] px-4 py-2 text-sm text-white hover:bg-[#a01f2c]"
                          >
                            Selecionar página
                          </button>
                          <button
                            onClick={() => openUnlinkModal(integration.id)}
                            className="rounded-lg border border-red-300 px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                          >
                            Desvincular
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Contas Instagram (vinculadas) */}
            <div className="rounded-xl border border-slate-200 bg-white">
              <div className="border-b border-slate-200 px-4 py-3 bg-pink-50/50">
                <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                  <Instagram size={20} className="text-pink-600" />
                  Contas Instagram
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Contas do Instagram na lista (vinculadas) para publicar.</p>
              </div>
              {integrations.filter((i) => i.instagram_username && isLinked(i)).length === 0 ? (
                <p className="p-5 text-sm text-slate-500">Nenhuma conta Instagram vinculada.</p>
              ) : (
                <div className="divide-y divide-slate-200">
                  {integrations
                    .filter((i) => i.instagram_username && isLinked(i))
                    .map((integration) => (
                      <div key={integration.id} className="p-5 hover:bg-slate-50 flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            {getStatusBadge(integration)}
                            {integration.readiness?.instagram?.ready ? (
                              <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">Pronta para postar no Instagram</span>
                            ) : integration.is_active ? (
                              <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-700">Pendências para Instagram</span>
                            ) : null}
                            <span className="font-medium text-slate-900">@{integration.instagram_username}</span>
                          </div>
                          <div className="text-xs text-slate-500 space-y-0.5">
                            {integration.page_name && <p>Página Facebook: {integration.page_name}</p>}
                            {integration.facebook_user_name && <p>Usuário Meta: {integration.facebook_user_name}</p>}
                            <p>Atualizado: {new Date(integration.updated_at).toLocaleString('pt-BR')}</p>
                            {integration.token_expires_at && (
                              <p>Token expira: {new Date(integration.token_expires_at).toLocaleDateString('pt-BR')}</p>
                            )}
                          </div>
                          <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Checklist Instagram</p>
                            <ul className="mt-2 space-y-1.5 text-xs text-slate-700">
                              {getInstagramChecklist(integration).map((item) => (
                                <li key={item.label} className="flex items-start gap-2">
                                  {item.ok ? (
                                    <CheckCircle size={14} className="mt-0.5 shrink-0 text-emerald-600" />
                                  ) : (
                                    <XCircle size={14} className="mt-0.5 shrink-0 text-red-500" />
                                  )}
                                  <span>{item.label}</span>
                                </li>
                              ))}
                            </ul>
                            {(integration.readiness?.instagram?.missingScopes?.length ?? 0) > 0 && (
                              <p className="mt-2 text-xs text-slate-600 border-t border-slate-200 pt-2">
                                Já ativou essas permissões no app Meta (ex.: Mídia_sara_alagoas)? Clique em <strong>Reconectar permissões</strong> para obter um novo token e liberar a publicação.
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 shrink-0">
                          {!integration.readiness?.instagram?.ready && (
                            <button
                              onClick={handleConnect}
                              disabled={connecting}
                              className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm text-amber-800 hover:bg-amber-100 disabled:opacity-50 flex items-center gap-2"
                              title="Reconecta a conta Meta para atualizar permissões e liberar postagem no Instagram"
                            >
                              {connecting && <Loader2 className="w-3 h-3 animate-spin" />}
                              {connecting ? 'Reconectando...' : 'Reconectar permissões'}
                            </button>
                          )}
                          <button
                            onClick={() => router.push(`/admin/instancias/add-page?integration_id=${integration.id}`)}
                            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100"
                          >
                            Adicionar outra página
                          </button>
                          <button
                            onClick={() => handleToggleActive(integration.id, integration.is_active)}
                            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100"
                          >
                            {integration.is_active ? 'Desativar' : 'Ativar'}
                          </button>
                          <button
                            onClick={() => openUnlinkModal(integration.id)}
                            className="rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
                          >
                            Desvincular
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Contas Facebook (vinculadas) */}
            <div className="rounded-xl border border-slate-200 bg-white">
              <div className="border-b border-slate-200 px-4 py-3 bg-[#1877f2]/5">
                <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                  <Facebook size={20} className="text-[#1877f2]" />
                  Contas Facebook (páginas)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Páginas do Facebook na lista (vinculadas) para publicar.</p>
              </div>
              {integrations.filter((i) => i.page_id && isLinked(i)).length === 0 ? (
                <p className="p-5 text-sm text-slate-500">Nenhuma página do Facebook vinculada.</p>
              ) : (
                <div className="divide-y divide-slate-200">
                  {integrations
                    .filter((i) => i.page_id && isLinked(i))
                    .map((integration) => (
                      <div key={integration.id} className="p-5 hover:bg-slate-50 flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            {getStatusBadge(integration)}
                            {integration.is_active && (
                              <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">Disponível para postagem</span>
                            )}
                            <span className="font-medium text-slate-900">
                              {integration.page_name || 'Página do Facebook'}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 space-y-0.5">
                            {integration.instagram_username && <p>Instagram: @{integration.instagram_username}</p>}
                            {integration.facebook_user_name && <p>Usuário Meta: {integration.facebook_user_name}</p>}
                            <p>Atualizado: {new Date(integration.updated_at).toLocaleString('pt-BR')}</p>
                            {integration.token_expires_at && (
                              <p>Token expira: {new Date(integration.token_expires_at).toLocaleDateString('pt-BR')}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 shrink-0">
                          <button
                            onClick={() => router.push(`/admin/instancias/add-page?integration_id=${integration.id}`)}
                            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100"
                          >
                            Adicionar outra página
                          </button>
                          <button
                            onClick={() => handleToggleActive(integration.id, integration.is_active)}
                            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100"
                          >
                            {integration.is_active ? 'Desativar' : 'Ativar'}
                          </button>
                          <button
                            onClick={() => openUnlinkModal(integration.id)}
                            className="rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
                          >
                            Desvincular
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Contas desvinculadas (ainda disponíveis para postagem) */}
            {integrations.filter((i) => !isLinked(i)).length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/30">
                <div className="border-b border-amber-200 px-4 py-3 bg-amber-100/50">
                  <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                    <Unlink size={20} className="text-amber-700" />
                    Contas desvinculadas da lista
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Não aparecem na lista principal, mas continuam disponíveis ao escolher onde postar. Use &quot;Revincular&quot; para trazer de volta.
                  </p>
                </div>
                <div className="divide-y divide-amber-200/50 p-4">
                  {integrations
                    .filter((i) => !isLinked(i))
                    .map((integration) => (
                      <div key={integration.id} className="py-4 first:pt-0 flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            {getStatusBadge(integration)}
                            {integration.is_active && (
                              <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">Disponível para postagem</span>
                            )}
                            {integration.instagram_username && (
                              <span className="font-medium text-slate-900">@{integration.instagram_username}</span>
                            )}
                            {integration.page_name && (
                              <span className="font-medium text-slate-900">
                                {integration.instagram_username ? ` · ${integration.page_name}` : integration.page_name}
                              </span>
                            )}
                            {!integration.instagram_username && !integration.page_name && (
                              <span className="text-slate-600">Integração #{integration.id.slice(0, 8)}</span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 space-y-0.5">
                            {integration.facebook_user_name && <p>Usuário Meta: {integration.facebook_user_name}</p>}
                            <p>Atualizado: {new Date(integration.updated_at).toLocaleString('pt-BR')}</p>
                            {integration.token_expires_at && (
                              <p>Token expira: {new Date(integration.token_expires_at).toLocaleDateString('pt-BR')}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 shrink-0">
                          <button
                            onClick={() => handleRevincular(integration.id)}
                            disabled={revinkingId === integration.id}
                            className="rounded-lg bg-[#1877f2] px-3 py-1.5 text-sm text-white hover:bg-[#166fe5] disabled:opacity-50 inline-flex items-center gap-1"
                          >
                            {revinkingId === integration.id ? <Loader2 size={14} className="animate-spin" /> : null}
                            Revincular
                          </button>
                          <button
                            onClick={() => handleToggleActive(integration.id, integration.is_active)}
                            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100"
                          >
                            {integration.is_active ? 'Desativar' : 'Ativar'}
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        <p className="mt-4 text-xs text-slate-500">
          Para revogar o app no Facebook: Configurações → Apps e sites.
        </p>

        {/* Modal YouTube: Publicar Vídeo */}
        {ytPostModal?.open && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => !ytPosting && setYtPostModal(null)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="yt-post-modal-title"
          >
            <div
              className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-slate-100">
                <div className="flex items-center gap-3 mb-1">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100">
                    <Youtube size={18} className="text-red-600" />
                  </div>
                  <div>
                    <h2 id="yt-post-modal-title" className="text-base font-semibold text-slate-900">Publicar vídeo no YouTube</h2>
                    <p className="text-xs text-slate-500">Canal: {ytPostModal.channelTitle}</p>
                  </div>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">URL do vídeo <span className="text-red-500">*</span></label>
                  <input
                    value={ytPostForm.videoUrl}
                    onChange={(e) => setYtPostForm({ ...ytPostForm, videoUrl: e.target.value })}
                    placeholder="https://drive.google.com/... ou URL pública do vídeo"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 hover:border-slate-300 focus:border-[#c62737] focus:ring-1 focus:ring-[#c62737] outline-none transition-colors"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">O arquivo de vídeo deve ser acessível publicamente (URL direta).</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Título <span className="text-red-500">*</span></label>
                  <input
                    value={ytPostForm.title}
                    onChange={(e) => setYtPostForm({ ...ytPostForm, title: e.target.value })}
                    maxLength={100}
                    placeholder="Título do vídeo (max 100 caracteres)"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 hover:border-slate-300 focus:border-[#c62737] focus:ring-1 focus:ring-[#c62737] outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Descrição</label>
                  <textarea
                    value={ytPostForm.description}
                    onChange={(e) => setYtPostForm({ ...ytPostForm, description: e.target.value })}
                    rows={3}
                    placeholder="Descrição do vídeo..."
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 hover:border-slate-300 focus:border-[#c62737] focus:ring-1 focus:ring-[#c62737] outline-none transition-colors resize-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Visibilidade</label>
                    <CustomSelect
                      value={ytPostForm.privacyStatus}
                      onChange={(v) => setYtPostForm({ ...ytPostForm, privacyStatus: v })}
                      options={[
                        { value: 'public',   label: 'Público' },
                        { value: 'unlisted', label: 'Não listado' },
                        { value: 'private',  label: 'Privado' },
                      ]}
                      allowEmpty={false}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Tags (vírgula)</label>
                    <input
                      value={ytPostForm.tags}
                      onChange={(e) => setYtPostForm({ ...ytPostForm, tags: e.target.value })}
                      placeholder="Sara, Alagoas, culto"
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 hover:border-slate-300 focus:border-[#c62737] focus:ring-1 focus:ring-[#c62737] outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 justify-end px-6 pb-6">
                <button
                  type="button"
                  onClick={() => !ytPosting && setYtPostModal(null)}
                  disabled={ytPosting}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handlePostToYouTube}
                  disabled={ytPosting}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {ytPosting ? (
                    <><Loader2 size={16} className="animate-spin" /> Enviando vídeo...</>
                  ) : (
                    <><Youtube size={16} /> Publicar no YouTube</>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal YouTube: Confirmar remoção */}
        {ytDeleteModalId && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => setYtDeleteModalId(null)}
            role="dialog"
            aria-modal="true"
          >
            <div
              className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
                    <Trash2 size={20} className="text-red-600" />
                  </div>
                  <h2 className="text-lg font-semibold text-slate-900">Remover canal do YouTube</h2>
                </div>
                <p className="text-slate-600 text-sm mb-4">
                  O canal será desconectado da plataforma. Para reconectar, faça o OAuth novamente.
                </p>
              </div>
              <div className="flex gap-3 justify-end px-6 pb-6">
                <button
                  type="button"
                  onClick={() => setYtDeleteModalId(null)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteYoutube}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 inline-flex items-center gap-2"
                >
                  <Trash2 size={16} /> Remover canal
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Desvincular */}
        {unlinkModalId && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => !unlinking && setUnlinkModalId(null)}
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
                    Desvincular conta
                  </h2>
                </div>
                <p className="text-slate-600 text-sm mb-1">
                  A conta sairá da lista de integrações aqui na plataforma.
                </p>
                <p className="text-slate-600 text-sm mb-4">
                  Ela <strong>continuará disponível</strong> ao escolher onde postar (Instagram/Facebook).
                </p>
                <p className="text-xs text-slate-500">
                  Para revogar o app no Facebook: Configurações → Apps e sites.
                </p>
              </div>
              <div className="flex gap-3 justify-end px-6 pb-6">
                <button
                  type="button"
                  onClick={() => !unlinking && setUnlinkModalId(null)}
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
