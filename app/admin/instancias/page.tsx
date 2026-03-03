'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { AdminPageHeader } from '@/app/admin/AdminPageHeader'
import { adminFetchJson } from '@/lib/admin-client'
import {
  Facebook, Instagram, Youtube, CheckCircle, XCircle, AlertCircle,
  Loader2, Layers, Trash2, Video, Plus, Pencil, Link2,
  ChevronDown, ChevronUp, Settings, Users, UserCheck, UserMinus,
  Music2,
} from 'lucide-react'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { CustomSelect } from '@/components/ui/CustomSelect'

// ─── Tipos ───────────────────────────────────────────────────────────────────

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

type YouTubeIntegration = {
  id: string
  created_at: string
  updated_at: string
  channel_id: string | null
  channel_title: string | null
  channel_custom_url: string | null
  channel_thumbnail_url: string | null
  token_expires_at: string | null
  scopes: string[] | null
  is_active: boolean
  metadata: Record<string, unknown>
}

type TikTokIntegration = {
  id: string
  created_at: string
  updated_at: string
  open_id: string | null
  display_name: string | null
  handle: string | null
  avatar_url: string | null
  token_expires_at: string | null
  is_active: boolean
  metadata: Record<string, unknown>
}

type GroupAccount = {
  id: string
  group_id: string
  account_type: 'meta' | 'youtube' | 'tiktok'
  account_id: string
}

type PublicationGroup = {
  id: string
  created_at: string
  updated_at: string
  name: string
  description: string | null
  color: string
  is_active: boolean
  accounts: GroupAccount[]
}

type YouTubePostModal = {
  integrationId: string
  channelTitle: string
  open: boolean
}

type GroupFormData = {
  name: string
  description: string
  color: string
}

type GroupUserProfile = {
  id: string
  email: string | null
  full_name: string | null
}

const PRESET_COLORS = [
  '#c62737', '#1877f2', '#0a66c2', '#e1306c',
  '#ff0000', '#4f46e5', '#059669', '#d97706',
  '#7c3aed', '#0891b2',
]

// ─── Componente principal ─────────────────────────────────────────────────────

export default function AdminInstanciasPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // ── Estado: contas ──
  const [integrations, setIntegrations] = useState<MetaIntegration[]>([])
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // ── Estado: YouTube ──
  const [ytIntegrations, setYtIntegrations] = useState<YouTubeIntegration[]>([])
  const [ytLoading, setYtLoading] = useState(true)
  const [ytConnecting, setYtConnecting] = useState(false)
  const [ytTogglingId, setYtTogglingId] = useState<string | null>(null)
  const [ytDeletingId, setYtDeletingId] = useState<string | null>(null)
  const [ytDeleteConfirmId, setYtDeleteConfirmId] = useState<string | null>(null)
  const [ytPostModal, setYtPostModal] = useState<YouTubePostModal | null>(null)
  const [ytPostForm, setYtPostForm] = useState({
    videoUrl: '', title: '', description: '', privacyStatus: 'public', tags: '',
  })
  const [ytPosting, setYtPosting] = useState(false)

  // ── Estado: TikTok ──
  const [tkIntegrations, setTkIntegrations] = useState<TikTokIntegration[]>([])
  const [tkLoading, setTkLoading] = useState(true)
  const [tkConnecting, setTkConnecting] = useState(false)
  const [tkTogglingId, setTkTogglingId] = useState<string | null>(null)
  const [tkDeletingId, setTkDeletingId] = useState<string | null>(null)
  const [tkDeleteConfirmId, setTkDeleteConfirmId] = useState<string | null>(null)

  // ── Estado: instâncias ──
  const [groups, setGroups] = useState<PublicationGroup[]>([])
  const [groupsLoading, setGroupsLoading] = useState(true)
  const [groupForm, setGroupForm] = useState<GroupFormData>({ name: '', description: '', color: '#c62737' })
  const [groupFormOpen, setGroupFormOpen] = useState(false)
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [groupSaving, setGroupSaving] = useState(false)
  const [deleteGroupId, setDeleteGroupId] = useState<string | null>(null)
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null)

  // ── Estado: gerenciar contas na instância ──
  const [manageAccountsGroupId, setManageAccountsGroupId] = useState<string | null>(null)
  const [accountsUpdating, setAccountsUpdating] = useState(false)

  // ── Estado: desvincular Meta ──
  const [unlinkModalId, setUnlinkModalId] = useState<string | null>(null)
  const [unlinking, setUnlinking] = useState(false)
  const [revinkingId, setRevinkingId] = useState<string | null>(null)

  // ── Estado: expandir seção de contas ──
  const [accountsSectionOpen, setAccountsSectionOpen] = useState(false)

  // ── Estado: gerenciar usuários da instância ──
  const [manageUsersGroupId, setManageUsersGroupId] = useState<string | null>(null)
  const [groupUserLinkedIds, setGroupUserLinkedIds] = useState<string[]>([])
  const [allUsers, setAllUsers] = useState<GroupUserProfile[]>([])
  const [groupUsersLoading, setGroupUsersLoading] = useState(false)
  const [usersUpdating, setUsersUpdating] = useState(false)

  // ── Escopos Instagram ──
  const instagramScopeLabels: Record<string, string> = {
    pages_show_list: 'Listagem de páginas',
    pages_read_engagement: 'Leitura de engajamento da página',
    instagram_basic: 'Acesso básico ao Instagram',
    instagram_content_publish: 'Publicação de conteúdo no Instagram',
    pages_manage_posts: 'Publicar posts na Página do Facebook',
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Loaders
  // ───────────────────────────────────────────────────────────────────────────

  const loadIntegrations = useCallback(async () => {
    setLoading(true)
    try {
      const data = await adminFetchJson<{ integrations: MetaIntegration[] }>('/api/meta/integrations?all=1')
      setIntegrations(data.integrations || [])
    } catch {
      setError('Não foi possível carregar as integrações Meta. Tente novamente.')
      setIntegrations([])
    } finally {
      setLoading(false)
    }
  }, [])

  const loadYtIntegrations = useCallback(async () => {
    setYtLoading(true)
    try {
      const data = await adminFetchJson<{ integrations: YouTubeIntegration[] }>('/api/admin/youtube/integrations')
      setYtIntegrations(data.integrations || [])
    } catch {
      setYtIntegrations([])
    } finally {
      setYtLoading(false)
    }
  }, [])

  const loadTkIntegrations = useCallback(async () => {
    setTkLoading(true)
    try {
      const integrations = await adminFetchJson<TikTokIntegration[]>('/api/admin/tiktok/integrations')
      setTkIntegrations(integrations || [])
    } catch {
      setTkIntegrations([])
    } finally {
      setTkLoading(false)
    }
  }, [])

  const loadGroups = useCallback(async () => {
    setGroupsLoading(true)
    try {
      const data = await adminFetchJson<{ groups: PublicationGroup[] }>('/api/admin/publication-groups')
      setGroups(data.groups || [])
    } catch {
      setGroups([])
    } finally {
      setGroupsLoading(false)
    }
  }, [])

  async function openManageUsers(groupId: string) {
    setManageUsersGroupId(groupId)
    setGroupUsersLoading(true)
    setGroupUserLinkedIds([])
    setAllUsers([])
    try {
      const data = await adminFetchJson<{ linkedUserIds: string[]; users: GroupUserProfile[] }>(
        `/api/admin/publication-groups/${groupId}/users`
      )
      setGroupUserLinkedIds(data.linkedUserIds || [])
      setAllUsers(data.users || [])
    } catch {
      setError('Não foi possível carregar os usuários.')
    } finally {
      setGroupUsersLoading(false)
    }
  }

  async function handleToggleGroupUser(groupId: string, userId: string, isLinkedNow: boolean) {
    setUsersUpdating(true)
    try {
      if (isLinkedNow) {
        await adminFetchJson(`/api/admin/publication-groups/${groupId}/users`, {
          method: 'DELETE',
          body: JSON.stringify({ user_id: userId }),
        })
        setGroupUserLinkedIds((prev) => prev.filter((id) => id !== userId))
      } else {
        await adminFetchJson(`/api/admin/publication-groups/${groupId}/users`, {
          method: 'POST',
          body: JSON.stringify({ user_id: userId }),
        })
        setGroupUserLinkedIds((prev) => [...prev, userId])
      }
    } catch {
      setError('Não foi possível atualizar os usuários da instância.')
    } finally {
      setUsersUpdating(false)
    }
  }

  useEffect(() => {
    loadIntegrations()
    loadYtIntegrations()
    loadTkIntegrations()
    loadGroups()
  }, [loadIntegrations, loadYtIntegrations, loadTkIntegrations, loadGroups])

  // Tratar retorno OAuth por query params
  useEffect(() => {
    const connected = searchParams?.get('connected')
    const errorParam = searchParams?.get('error')
    const errorDescRaw = searchParams?.get('error_description')
    let errorDesc: string | null = null
    if (errorDescRaw) {
      try { errorDesc = decodeURIComponent(errorDescRaw) } catch { errorDesc = errorDescRaw }
    }
    if (connected === '1') {
      const count = searchParams?.get('count')
      const instagramParam = searchParams?.get('instagram')
      let msg = 'Conectado com sucesso!'
      if (count && Number(count) > 1) {
        msg = `${count} contas conectadas.`
      } else if (instagramParam) {
        const handles = instagramParam.split(',').map((s) => `@${s.trim()}`).filter(Boolean)
        msg = handles.length > 0 ? `Conectado! Instagram: ${handles.join(', ')}` : msg
      }
      setSuccess(msg)
      setTimeout(() => loadIntegrations(), 800)
      router.replace('/admin/instancias')
    } else if (errorParam) {
      setError(errorDesc || 'Não foi possível conectar a conta.')
      router.replace('/admin/instancias')
    }
  }, [searchParams, router, loadIntegrations])

  // ───────────────────────────────────────────────────────────────────────────
  // Funções: Conectar Meta
  // ───────────────────────────────────────────────────────────────────────────

  async function handleConnect() {
    setConnecting(true)
    setError(null)
    setSuccess(null)
    try {
      const data = await adminFetchJson<{ url: string }>('/api/meta/oauth/start?popup=1')
      const width = 560, height = 640
      const left = Math.round((window.screen.width - width) / 2)
      const top = Math.round((window.screen.height - height) / 2)
      const popup = window.open(data.url, 'meta-oauth', `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`)
      if (!popup) {
        setError('O popup foi bloqueado. Permita popups para este site.')
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
          setError(msg.errorDescription || 'Não foi possível conectar. Tente novamente.')
        } else if (msg.connected) {
          const n = msg.count ? Number(msg.count) : 0
          if (n > 1) setSuccess(`${n} contas conectadas.`)
          else if (msg.instagram) {
            const handles = String(msg.instagram).split(',').map((s) => `@${s.trim()}`).filter(Boolean)
            setSuccess(handles.length ? `Conectado! Instagram: ${handles.join(', ')}` : 'Conectado!')
          } else {
            setSuccess('Conectado com sucesso!')
          }
          loadIntegrations()
        } else if (msg.selectPage) {
          setSuccess('Selecione a página na janela que abriu.')
          loadIntegrations()
        }
      }
      const intervalId = setInterval(() => {
        if (popup.closed) { clearInterval(intervalId); window.removeEventListener('message', handleMessage); setConnecting(false) }
      }, 300)
      window.addEventListener('message', handleMessage)
    } catch (e) {
      setConnecting(false)
      const msg = e instanceof Error ? e.message : null
      setError(msg || 'Não foi possível iniciar a conexão Meta.')
    }
  }

  async function handleToggleActive(id: string, currentActive: boolean) {
    try {
      await adminFetchJson(`/api/meta/integrations/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: !currentActive }),
      })
      await loadIntegrations()
    } catch {
      setError('Não foi possível atualizar. Tente novamente.')
    }
  }

  async function confirmUnlink() {
    const id = unlinkModalId
    if (!id) return
    setUnlinking(true)
    setUnlinkModalId(null)
    try {
      await adminFetchJson(`/api/meta/integrations/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ show_in_list: false }),
      })
      setSuccess('Conta desvinculada da lista.')
      await loadIntegrations()
    } catch {
      setError('Não foi possível desvincular.')
    } finally {
      setUnlinking(false)
    }
  }

  function isLinked(integration: MetaIntegration) {
    return integration.metadata?.show_in_list !== false
  }

  async function handleRevincular(id: string) {
    setRevinkingId(id)
    try {
      await adminFetchJson(`/api/meta/integrations/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ show_in_list: true }),
      })
      setSuccess('Conta revinculada.')
      await loadIntegrations()
    } catch {
      setError('Não foi possível revincular.')
    } finally {
      setRevinkingId(null)
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Funções: YouTube
  // ───────────────────────────────────────────────────────────────────────────

  async function handleConnectYouTube() {
    setYtConnecting(true)
    setError(null)
    try {
      const data = await adminFetchJson<{ url: string }>('/api/youtube/oauth/start?popup=1')
      const width = 520, height = 640
      const left = Math.round((window.screen.width - width) / 2)
      const top = Math.round((window.screen.height - height) / 2)
      const popup = window.open(data.url, 'youtube-oauth', `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`)
      if (!popup) {
        setError('Popup bloqueado.')
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
      setError(e instanceof Error ? e.message : 'Erro ao conectar YouTube.')
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
      setError('Não foi possível atualizar.')
    } finally {
      setYtTogglingId(null)
    }
  }

  async function confirmDeleteYoutube() {
    const id = ytDeleteConfirmId
    if (!id) return
    setYtDeletingId(id)
    setYtDeleteConfirmId(null)
    try {
      await adminFetchJson(`/api/admin/youtube/integrations/${id}`, { method: 'DELETE' })
      setSuccess('Canal do YouTube removido.')
      await loadYtIntegrations()
    } catch {
      setError('Não foi possível remover.')
    } finally {
      setYtDeletingId(null)
    }
  }

  async function handlePostToYouTube() {
    if (!ytPostModal) return
    if (!ytPostForm.videoUrl) { setError('Informe a URL do vídeo.'); return }
    if (!ytPostForm.title) { setError('Informe o título.'); return }
    setYtPosting(true)
    setError(null)
    try {
      const tags = ytPostForm.tags ? ytPostForm.tags.split(',').map((t) => t.trim()).filter(Boolean) : []
      const result = await adminFetchJson<{ videoId: string; videoUrl: string }>('/api/admin/youtube/post', {
        method: 'POST',
        body: JSON.stringify({
          integrationId: ytPostModal.integrationId,
          videoUrl: ytPostForm.videoUrl,
          title: ytPostForm.title,
          description: ytPostForm.description,
          privacyStatus: ytPostForm.privacyStatus,
          tags,
        }),
      })
      setYtPostModal(null)
      setYtPostForm({ videoUrl: '', title: '', description: '', privacyStatus: 'public', tags: '' })
      setSuccess(`Vídeo enviado! ${result.videoUrl}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao publicar vídeo.')
    } finally {
      setYtPosting(false)
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Funções: TikTok
  // ───────────────────────────────────────────────────────────────────────────

  async function handleConnectTikTok() {
    setTkConnecting(true)
    setError(null)
    try {
      const data = await adminFetchJson<{ url: string }>('/api/tiktok/oauth/start?popup=1')
      const width = 520, height = 700
      const left = Math.round((window.screen.width - width) / 2)
      const top = Math.round((window.screen.height - height) / 2)
      const popup = window.open(data.url, 'tiktok-oauth', `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`)
      if (!popup) {
        setError('Popup bloqueado.')
        setTkConnecting(false)
        return
      }
      const handleMsg = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return
        if (event.data?.type !== 'tiktok-oauth-done') return
        window.removeEventListener('message', handleMsg)
        clearInterval(timer)
        setTkConnecting(false)
        if (event.data.connected) {
          const label = event.data.display_name ? `Perfil: ${event.data.display_name}` : 'Perfil conectado!'
          setSuccess(`TikTok conectado! ${label}`)
          loadTkIntegrations()
        } else {
          setError(event.data.error || 'Não foi possível conectar o TikTok.')
        }
      }
      const timer = setInterval(() => {
        if (popup.closed) { clearInterval(timer); window.removeEventListener('message', handleMsg); setTkConnecting(false) }
      }, 400)
      window.addEventListener('message', handleMsg)
    } catch (e) {
      setTkConnecting(false)
      setError(e instanceof Error ? e.message : 'Erro ao conectar TikTok.')
    }
  }

  async function handleToggleTikTokActive(id: string, current: boolean) {
    setTkTogglingId(id)
    try {
      await adminFetchJson(`/api/admin/tiktok/integrations/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: !current }),
      })
      await loadTkIntegrations()
    } catch {
      setError('Não foi possível atualizar o TikTok.')
    } finally {
      setTkTogglingId(null)
    }
  }

  async function confirmDeleteTikTok() {
    const id = tkDeleteConfirmId
    if (!id) return
    setTkDeletingId(id)
    setTkDeleteConfirmId(null)
    try {
      await adminFetchJson(`/api/admin/tiktok/integrations/${id}`, { method: 'DELETE' })
      setSuccess('Perfil do TikTok removido.')
      await loadTkIntegrations()
    } catch {
      setError('Não foi possível remover o TikTok.')
    } finally {
      setTkDeletingId(null)
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Funções: Grupos (Instâncias)
  // ───────────────────────────────────────────────────────────────────────────

  function openCreateGroup() {
    setEditingGroupId(null)
    setGroupForm({ name: '', description: '', color: '#c62737' })
    setGroupFormOpen(true)
  }

  function openEditGroup(group: PublicationGroup) {
    setEditingGroupId(group.id)
    setGroupForm({ name: group.name, description: group.description ?? '', color: group.color })
    setGroupFormOpen(true)
  }

  async function handleSaveGroup() {
    if (!groupForm.name.trim()) { setError('Informe o nome da instância.'); return }
    setGroupSaving(true)
    setError(null)
    try {
      if (editingGroupId) {
        await adminFetchJson(`/api/admin/publication-groups/${editingGroupId}`, {
          method: 'PATCH',
          body: JSON.stringify(groupForm),
        })
        setSuccess('Instância atualizada.')
      } else {
        await adminFetchJson('/api/admin/publication-groups', {
          method: 'POST',
          body: JSON.stringify(groupForm),
        })
        setSuccess('Instância criada!')
      }
      setGroupFormOpen(false)
      setEditingGroupId(null)
      await loadGroups()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar instância.')
    } finally {
      setGroupSaving(false)
    }
  }

  async function handleDeleteGroup() {
    const id = deleteGroupId
    if (!id) return
    setDeletingGroupId(id)
    setDeleteGroupId(null)
    try {
      await adminFetchJson(`/api/admin/publication-groups/${id}`, { method: 'DELETE' })
      setSuccess('Instância removida.')
      await loadGroups()
    } catch {
      setError('Não foi possível remover a instância.')
    } finally {
      setDeletingGroupId(null)
    }
  }

  async function handleToggleGroupAccount(
    groupId: string,
    accountType: 'meta' | 'youtube' | 'tiktok',
    accountId: string,
    isLinkedNow: boolean
  ) {
    setAccountsUpdating(true)
    try {
      if (isLinkedNow) {
        await adminFetchJson(`/api/admin/publication-groups/${groupId}/accounts`, {
          method: 'DELETE',
          body: JSON.stringify({ account_type: accountType, account_id: accountId }),
        })
      } else {
        await adminFetchJson(`/api/admin/publication-groups/${groupId}/accounts`, {
          method: 'POST',
          body: JSON.stringify({ account_type: accountType, account_id: accountId }),
        })
      }
      await loadGroups()
    } catch {
      setError('Não foi possível atualizar as contas da instância.')
    } finally {
      setAccountsUpdating(false)
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Helpers de UI
  // ───────────────────────────────────────────────────────────────────────────

  function getStatusBadge(integration: MetaIntegration) {
    if (integration.metadata?.pending_page_selection) {
      return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800"><AlertCircle size={12} /> Aguardando seleção</span>
    }
    if (!integration.is_active) {
      return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600"><XCircle size={12} /> Inativa</span>
    }
    const expiresAt = integration.token_expires_at ? new Date(integration.token_expires_at) : null
    if (expiresAt && expiresAt < new Date()) {
      return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700"><XCircle size={12} /> Token expirado</span>
    }
    return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700"><CheckCircle size={12} /> Ativa</span>
  }

  function getInstagramChecklist(integration: MetaIntegration) {
    const readiness = integration.readiness?.instagram
    const missingScopes = readiness?.missingScopes || []
    return [
      { ok: !!integration.is_active, label: 'Integração ativa' },
      { ok: readiness ? readiness.hasInstagramBusinessAccount : !!integration.instagram_username, label: 'Conta Instagram Business vinculada' },
      { ok: readiness ? readiness.hasPageAccessToken : true, label: 'Token de página disponível' },
      { ok: readiness ? !readiness.tokenExpired : true, label: 'Token válido (não expirado)' },
      {
        ok: missingScopes.length === 0,
        label: missingScopes.length === 0
          ? 'Permissões de publicação concedidas'
          : `Permissões ausentes: ${missingScopes.map((s) => instagramScopeLabels[s] || s).join(', ')}`,
      },
    ]
  }

  // Retorna as contas de cada tipo vinculadas a um grupo
  function getGroupAccountDetails(group: PublicationGroup) {
    const metaIds = group.accounts.filter((a) => a.account_type === 'meta').map((a) => a.account_id)
    const ytIds = group.accounts.filter((a) => a.account_type === 'youtube').map((a) => a.account_id)
    const tkIds = group.accounts.filter((a) => a.account_type === 'tiktok').map((a) => a.account_id)
    const metaAccounts = integrations.filter((i) => metaIds.includes(i.id))
    const ytAccounts = ytIntegrations.filter((i) => ytIds.includes(i.id))
    const tkAccounts = tkIntegrations.filter((i) => tkIds.includes(i.id))
    const igAccounts = metaAccounts.filter((i) => i.instagram_username)
    const fbAccounts = metaAccounts.filter((i) => i.page_id)
    return { igAccounts, fbAccounts, ytAccounts, tkAccounts }
  }

  const manageGroup = groups.find((g) => g.id === manageAccountsGroupId) ?? null

  // ───────────────────────────────────────────────────────────────────────────
  // Render
  // ───────────────────────────────────────────────────────────────────────────

  return (
    <PageAccessGuard pageKey="instagram">
      <div className="p-6 md:p-8">
        <AdminPageHeader
          icon={Layers}
          title="Instâncias de Publicação"
          subtitle="Agrupe as contas de redes sociais em instâncias (Sara Alagoas, Arena Sede, etc.) para direcionar postagens com facilidade."
        />

        {/* Mensagens */}
        {success && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-green-700 flex items-start gap-2">
            <CheckCircle size={18} className="shrink-0 mt-0.5" />
            <span>{success}</span>
            <button onClick={() => setSuccess(null)} className="ml-auto text-green-500 hover:text-green-700"><XCircle size={16} /></button>
          </div>
        )}
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700 flex items-start gap-2">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700"><XCircle size={16} /></button>
          </div>
        )}

        {/* ── Seção: Instâncias ─────────────────────────────────────────── */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Instâncias</h2>
              <p className="text-sm text-slate-500">Cada instância agrupa contas do Facebook, Instagram e YouTube.</p>
            </div>
            <button
              onClick={openCreateGroup}
              className="inline-flex items-center gap-2 rounded-xl bg-[#c62737] px-4 py-2 text-sm font-medium text-white hover:bg-[#a01f2d] transition-colors"
            >
              <Plus size={16} /> Nova instância
            </button>
          </div>

          {groupsLoading ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 flex items-center justify-center">
              <Loader2 size={24} className="animate-spin text-slate-400" />
            </div>
          ) : groups.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-slate-200 bg-white p-10 text-center">
              <Layers size={40} className="mx-auto mb-3 text-slate-300" />
              <p className="text-slate-600 font-medium mb-1">Nenhuma instância criada ainda</p>
              <p className="text-sm text-slate-400 mb-4">Crie a primeira instância para organizar as contas por perfil de publicação.</p>
              <button
                onClick={openCreateGroup}
                className="inline-flex items-center gap-2 rounded-xl bg-[#c62737] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#a01f2d]"
              >
                <Plus size={16} /> Criar primeira instância
              </button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {groups.map((group) => {
                const { igAccounts, fbAccounts, ytAccounts, tkAccounts } = getGroupAccountDetails(group)
                const isBeingDeleted = deletingGroupId === group.id
                return (
                  <div
                    key={group.id}
                    className="rounded-xl border border-slate-200 bg-white flex flex-col"
                    style={{ borderTopColor: group.color, borderTopWidth: 3 }}
                  >
                    {/* Header do card */}
                    <div className="px-5 pt-4 pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{ backgroundColor: group.color }}
                            />
                            <h3 className="font-semibold text-slate-900 truncate">{group.name}</h3>
                            {!group.is_active && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">Inativa</span>
                            )}
                          </div>
                          {group.description && (
                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{group.description}</p>
                          )}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={() => openEditGroup(group)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                            title="Editar instância"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => setDeleteGroupId(group.id)}
                            disabled={isBeingDeleted}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50"
                            title="Excluir instância"
                          >
                            {isBeingDeleted ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Contas vinculadas */}
                    <div className="px-5 pb-3 flex-1">
                      <div className="space-y-2">
                        <div className="flex items-start gap-2">
                          <Instagram size={14} className="text-pink-500 mt-0.5 shrink-0" />
                          {igAccounts.length === 0 ? (
                            <span className="text-xs text-slate-400">Nenhum Instagram vinculado</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {igAccounts.map((i) => (
                                <span key={i.id} className="text-xs bg-pink-50 text-pink-700 px-2 py-0.5 rounded-full border border-pink-100">
                                  @{i.instagram_username}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-start gap-2">
                          <Facebook size={14} className="text-[#1877f2] mt-0.5 shrink-0" />
                          {fbAccounts.length === 0 ? (
                            <span className="text-xs text-slate-400">Nenhuma página Facebook vinculada</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {fbAccounts.map((i) => (
                                <span key={i.id} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-100">
                                  {i.page_name || 'Página FB'}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-start gap-2">
                          <Youtube size={14} className="text-red-600 mt-0.5 shrink-0" />
                          {ytAccounts.length === 0 ? (
                            <span className="text-xs text-slate-400">Nenhum canal YouTube vinculado</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {ytAccounts.map((yt) => (
                                <span key={yt.id} className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full border border-red-100">
                                  {yt.channel_title || 'Canal YT'}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-start gap-2">
                          <Music2 size={14} className="text-slate-900 mt-0.5 shrink-0" />
                          {tkAccounts.length === 0 ? (
                            <span className="text-xs text-slate-400">Nenhum TikTok vinculado</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {tkAccounts.map((tk) => (
                                <span key={tk.id} className="text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded-full border border-slate-200">
                                  {tk.display_name || tk.handle || 'TikTok'}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Rodapé do card */}
                    <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 rounded-b-xl flex items-center justify-between gap-3">
                      <button
                        onClick={() => setManageAccountsGroupId(group.id)}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-[#c62737] hover:text-[#a01f2d] transition-colors"
                      >
                        <Settings size={13} /> Contas vinculadas
                      </button>
                      <button
                        onClick={() => openManageUsers(group.id)}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
                      >
                        <Users size={13} /> Usuários permitidos
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Seção: Contas conectadas (expansível) ─────────────────────── */}
        <div className="rounded-xl border border-slate-200 bg-white mb-6">
          <button
            onClick={() => setAccountsSectionOpen((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition-colors rounded-xl"
          >
            <div className="flex items-center gap-2">
              <Link2 size={18} className="text-slate-500" />
              <span className="font-semibold text-slate-900">Contas conectadas</span>
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                {loading ? '…' : integrations.length} Meta · {ytLoading ? '…' : ytIntegrations.length} YouTube · {tkLoading ? '…' : tkIntegrations.length} TikTok
              </span>
            </div>
            {accountsSectionOpen ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
          </button>

          {accountsSectionOpen && (
            <div className="border-t border-slate-100 px-5 py-5 space-y-6">
              {/* Botões de conexão */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleConnect}
                  disabled={connecting}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#1877f2] px-4 py-2.5 text-sm text-white font-medium hover:bg-[#166fe5] disabled:opacity-60 transition-colors"
                >
                  {connecting ? <Loader2 size={16} className="animate-spin" /> : <Facebook size={16} />}
                  {connecting ? 'Abrindo login...' : 'Conectar Instagram / Facebook'}
                </button>
                <button
                  onClick={handleConnectYouTube}
                  disabled={ytConnecting}
                  className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm text-white font-medium hover:bg-red-700 disabled:opacity-60 transition-colors"
                >
                  {ytConnecting ? <Loader2 size={16} className="animate-spin" /> : <Youtube size={16} />}
                  {ytConnecting ? 'Abrindo login...' : 'Conectar YouTube'}
                </button>
                <button
                  onClick={handleConnectTikTok}
                  disabled={tkConnecting}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm text-white font-medium hover:bg-black disabled:opacity-60 transition-colors"
                >
                  {tkConnecting ? <Loader2 size={16} className="animate-spin" /> : <Music2 size={16} />}
                  {tkConnecting ? 'Abrindo login...' : 'Conectar TikTok'}
                </button>
              </div>

              {/* Pendentes */}
              {integrations.filter((i) => isLinked(i) && i.metadata?.pending_page_selection).length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Pendentes — selecione a página</p>
                  {integrations.filter((i) => isLinked(i) && i.metadata?.pending_page_selection).map((intg) => (
                    <div key={intg.id} className="flex items-center justify-between gap-2">
                      <span className="text-sm text-slate-700">{intg.facebook_user_name || 'Conta Meta'}</span>
                      <div className="flex gap-2">
                        <button onClick={() => router.push(`/admin/instancias/select?integration_id=${intg.id}`)} className="rounded-lg bg-[#c62737] px-3 py-1.5 text-xs text-white hover:bg-[#a01f2c]">Selecionar página</button>
                        <button onClick={() => setUnlinkModalId(intg.id)} className="rounded-lg border border-red-300 px-3 py-1.5 text-xs text-red-700 hover:bg-red-50">Desvincular</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Lista integrações Meta */}
              {loading ? (
                <div className="flex items-center justify-center py-6"><Loader2 size={20} className="animate-spin text-slate-400" /></div>
              ) : integrations.filter(isLinked).length === 0 ? (
                <p className="text-sm text-slate-500">Nenhuma integração Meta conectada.</p>
              ) : (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">Integrações Meta</p>
                  <div className="rounded-xl border border-slate-200 divide-y divide-slate-100">
                    {integrations.filter(isLinked).map((intg) => (
                      <div key={intg.id} className="p-4 flex flex-wrap items-start justify-between gap-3 hover:bg-slate-50">
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {getStatusBadge(intg)}
                            {intg.instagram_username && (
                              <span className="font-medium text-slate-900 text-sm">@{intg.instagram_username}</span>
                            )}
                            {intg.page_name && (
                              <span className="text-sm text-slate-700">{intg.instagram_username ? `· ${intg.page_name}` : intg.page_name}</span>
                            )}
                          </div>
                          {intg.readiness?.instagram && (
                            <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Checklist Instagram</p>
                              <ul className="space-y-1">
                                {getInstagramChecklist(intg).map((item) => (
                                  <li key={item.label} className="flex items-start gap-1.5 text-xs text-slate-700">
                                    {item.ok ? <CheckCircle size={12} className="mt-0.5 shrink-0 text-green-600" /> : <XCircle size={12} className="mt-0.5 shrink-0 text-red-500" />}
                                    <span>{item.label}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5 shrink-0">
                          {!intg.readiness?.instagram?.ready && (
                            <button onClick={handleConnect} disabled={connecting} className="rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs text-amber-800 hover:bg-amber-100 disabled:opacity-50">
                              Reconectar
                            </button>
                          )}
                          <button onClick={() => router.push(`/admin/instancias/add-page?integration_id=${intg.id}`)} className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs hover:bg-slate-100">+ Página</button>
                          <button onClick={() => handleToggleActive(intg.id, intg.is_active)} className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs hover:bg-slate-100">{intg.is_active ? 'Desativar' : 'Ativar'}</button>
                          <button onClick={() => setUnlinkModalId(intg.id)} className="rounded-lg border border-red-300 px-2.5 py-1 text-xs text-red-700 hover:bg-red-50">Desvincular</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Contas desvinculadas */}
              {integrations.filter((i) => !isLinked(i)).length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">Desvinculadas (ainda disponíveis para postagem)</p>
                  <div className="rounded-xl border border-amber-200 bg-amber-50/30 divide-y divide-amber-100">
                    {integrations.filter((i) => !isLinked(i)).map((intg) => (
                      <div key={intg.id} className="p-4 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-sm">
                          {getStatusBadge(intg)}
                          <span className="text-slate-700">
                            {intg.instagram_username ? `@${intg.instagram_username}` : (intg.page_name || `Integração #${intg.id.slice(0, 8)}`)}
                          </span>
                        </div>
                        <div className="flex gap-1.5">
                          <button onClick={() => handleRevincular(intg.id)} disabled={revinkingId === intg.id} className="rounded-lg bg-[#1877f2] px-2.5 py-1 text-xs text-white hover:bg-[#166fe5] disabled:opacity-50 inline-flex items-center gap-1">
                            {revinkingId === intg.id && <Loader2 size={12} className="animate-spin" />} Revincular
                          </button>
                          <button onClick={() => handleToggleActive(intg.id, intg.is_active)} className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs hover:bg-slate-100">{intg.is_active ? 'Desativar' : 'Ativar'}</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* YouTube */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">Canais YouTube</p>
                {ytLoading ? (
                  <div className="flex items-center justify-center py-6"><Loader2 size={20} className="animate-spin text-slate-400" /></div>
                ) : ytIntegrations.length === 0 ? (
                  <p className="text-sm text-slate-500">Nenhum canal YouTube conectado.</p>
                ) : (
                  <div className="rounded-xl border border-slate-200 divide-y divide-slate-100">
                    {ytIntegrations.map((yt) => {
                      const expired = yt.token_expires_at ? new Date(yt.token_expires_at) < new Date() : false
                      return (
                        <div key={yt.id} className="p-4 flex flex-wrap items-start justify-between gap-3 hover:bg-slate-50">
                          <div className="flex items-center gap-3 min-w-0">
                            {yt.channel_thumbnail_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={yt.channel_thumbnail_url} alt={yt.channel_title ?? ''} className="w-9 h-9 rounded-full border border-slate-200 shrink-0" />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                                <Youtube size={16} className="text-red-600" />
                              </div>
                            )}
                            <div>
                              <div className="flex items-center gap-2 mb-0.5">
                                {yt.is_active && !expired
                                  ? <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700"><CheckCircle size={11} /> Ativa</span>
                                  : expired
                                    ? <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700"><XCircle size={11} /> Expirado</span>
                                    : <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600"><XCircle size={11} /> Inativa</span>
                                }
                                <span className="font-medium text-sm text-slate-900">{yt.channel_title || 'Canal sem nome'}</span>
                              </div>
                              {yt.channel_custom_url && <p className="text-xs text-slate-500">{yt.channel_custom_url}</p>}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1.5 shrink-0">
                            {expired && (
                              <button onClick={handleConnectYouTube} disabled={ytConnecting} className="rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs text-amber-800 hover:bg-amber-100 disabled:opacity-50">Reconectar</button>
                            )}
                            {yt.is_active && !expired && (
                              <button
                                onClick={() => {
                                  setYtPostForm({ videoUrl: '', title: yt.channel_title ? `Novo vídeo — ${yt.channel_title}` : '', description: '', privacyStatus: 'public', tags: '' })
                                  setYtPostModal({ integrationId: yt.id, channelTitle: yt.channel_title ?? '', open: true })
                                }}
                                className="rounded-lg bg-red-600 px-2.5 py-1 text-xs text-white hover:bg-red-700 inline-flex items-center gap-1"
                              >
                                <Video size={12} /> Publicar vídeo
                              </button>
                            )}
                            <button onClick={() => handleToggleYoutubeActive(yt.id, yt.is_active)} disabled={ytTogglingId === yt.id} className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs hover:bg-slate-100 disabled:opacity-50">
                              {ytTogglingId === yt.id ? <Loader2 size={12} className="animate-spin" /> : (yt.is_active ? 'Desativar' : 'Ativar')}
                            </button>
                            <button onClick={() => setYtDeleteConfirmId(yt.id)} disabled={ytDeletingId === yt.id} className="rounded-lg border border-red-300 px-2.5 py-1 text-xs text-red-700 hover:bg-red-50 inline-flex items-center gap-1 disabled:opacity-50">
                              {ytDeletingId === yt.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} Remover
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* TikTok */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">Contas TikTok</p>
                {tkLoading ? (
                  <div className="flex items-center justify-center py-6"><Loader2 size={20} className="animate-spin text-slate-400" /></div>
                ) : tkIntegrations.length === 0 ? (
                  <p className="text-sm text-slate-500">Nenhuma conta TikTok conectada.</p>
                ) : (
                  <div className="rounded-xl border border-slate-200 divide-y divide-slate-100">
                    {tkIntegrations.map((tk) => {
                      const expired = tk.token_expires_at ? new Date(tk.token_expires_at) < new Date() : false
                      return (
                        <div key={tk.id} className="p-4 flex flex-wrap items-start justify-between gap-3 hover:bg-slate-50">
                          <div className="flex items-center gap-3 min-w-0">
                            {tk.avatar_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={tk.avatar_url} alt={tk.display_name ?? ''} className="w-9 h-9 rounded-full border border-slate-200 shrink-0" />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                                <Music2 size={16} className="text-slate-600" />
                              </div>
                            )}
                            <div>
                              <div className="flex items-center gap-2 mb-0.5">
                                {tk.is_active && !expired
                                  ? <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700"><CheckCircle size={11} /> Ativo</span>
                                  : expired
                                    ? <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700"><XCircle size={11} /> Expirado</span>
                                    : <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600"><XCircle size={11} /> Inativo</span>
                                }
                                <span className="font-medium text-sm text-slate-900">{tk.display_name || tk.handle || 'TikTok'}</span>
                              </div>
                              {tk.handle && <p className="text-xs text-slate-500">{tk.handle}</p>}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1.5 shrink-0">
                            {expired && (
                              <button onClick={handleConnectTikTok} disabled={tkConnecting} className="rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs text-amber-800 hover:bg-amber-100 disabled:opacity-50">Reconectar</button>
                            )}
                            <button onClick={() => handleToggleTikTokActive(tk.id, tk.is_active)} disabled={tkTogglingId === tk.id} className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs hover:bg-slate-100 disabled:opacity-50">
                              {tkTogglingId === tk.id ? <Loader2 size={12} className="animate-spin" /> : (tk.is_active ? 'Desativar' : 'Ativar')}
                            </button>
                            <button onClick={() => setTkDeleteConfirmId(tk.id)} disabled={tkDeletingId === tk.id} className="rounded-lg border border-red-300 px-2.5 py-1 text-xs text-red-700 hover:bg-red-50 inline-flex items-center gap-1 disabled:opacity-50">
                              {tkDeletingId === tk.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} Remover
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <p className="text-xs text-slate-400">Para revogar o app no Facebook: Configurações → Apps e sites.</p>
            </div>
          )}
        </div>

        {/* ────────────────────────────────────────────────────────────────────
          Modal: Criar / Editar instância
        ──────────────────────────────────────────────────────────────────── */}
        {groupFormOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => !groupSaving && setGroupFormOpen(false)}
            role="dialog"
            aria-modal="true"
          >
            <div
              className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-slate-100">
                <h2 className="text-lg font-semibold text-slate-900">
                  {editingGroupId ? 'Editar instância' : 'Nova instância'}
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  {editingGroupId ? 'Altere os dados da instância.' : 'Defina o nome e a cor da nova instância.'}
                </p>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Nome da instância <span className="text-red-500">*</span></label>
                  <input
                    value={groupForm.name}
                    onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                    placeholder="Ex: Sara Alagoas, Arena Sede Maceió..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 focus:border-[#c62737] focus:ring-2 focus:ring-[#c62737]/20 outline-none transition-all placeholder:text-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Descrição (opcional)</label>
                  <input
                    value={groupForm.description}
                    onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
                    placeholder="Breve descrição desta instância..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 focus:border-[#c62737] focus:ring-2 focus:ring-[#c62737]/20 outline-none transition-all placeholder:text-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-2">Cor de identificação</label>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => setGroupForm({ ...groupForm, color })}
                        className="w-8 h-8 rounded-full border-2 transition-all"
                        style={{
                          backgroundColor: color,
                          borderColor: groupForm.color === color ? '#0f172a' : 'transparent',
                          boxShadow: groupForm.color === color ? '0 0 0 2px white, 0 0 0 4px #0f172a' : 'none',
                        }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-3 justify-end px-6 pb-6">
                <button
                  type="button"
                  onClick={() => !groupSaving && setGroupFormOpen(false)}
                  disabled={groupSaving}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveGroup}
                  disabled={groupSaving || !groupForm.name.trim()}
                  className="rounded-xl bg-[#c62737] px-4 py-2 text-sm font-medium text-white hover:bg-[#a01f2d] disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {groupSaving ? <Loader2 size={15} className="animate-spin" /> : null}
                  {editingGroupId ? 'Salvar alterações' : 'Criar instância'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ────────────────────────────────────────────────────────────────────
          Modal: Gerenciar contas da instância
        ──────────────────────────────────────────────────────────────────── */}
        {manageAccountsGroupId && manageGroup && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto"
            onClick={() => !accountsUpdating && setManageAccountsGroupId(null)}
            role="dialog"
            aria-modal="true"
          >
            <div
              className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-xl my-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-slate-100">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: manageGroup.color }} />
                  <h2 className="text-lg font-semibold text-slate-900">Contas — {manageGroup.name}</h2>
                </div>
                <p className="text-sm text-slate-500">Marque as contas que devem receber postagens desta instância.</p>
              </div>
              <div className="p-6 space-y-5 max-h-[65vh] overflow-y-auto">
                {/* Instagram / Meta */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2 flex items-center gap-1.5">
                    <Instagram size={13} className="text-pink-500" /> Contas Instagram / Meta
                  </p>
                  {integrations.filter((i) => i.instagram_username).length === 0 ? (
                    <p className="text-sm text-slate-400">Nenhuma conta Instagram conectada ainda.</p>
                  ) : (
                    <div className="space-y-2">
                      {integrations.filter((i) => i.instagram_username).map((intg) => {
                        const isSelected = manageGroup.accounts.some((a) => a.account_type === 'meta' && a.account_id === intg.id)
                        return (
                          <label key={intg.id} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${isSelected ? 'border-[#c62737]/40 bg-[#c62737]/5' : 'border-slate-200 hover:bg-slate-50'}`}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={accountsUpdating}
                              onChange={() => handleToggleGroupAccount(manageGroup.id, 'meta', intg.id, isSelected)}
                              className="mt-0.5 accent-[#c62737]"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
                                <Instagram size={13} className="text-pink-500 shrink-0" />
                                @{intg.instagram_username}
                              </div>
                              {intg.page_name && <p className="text-xs text-slate-500 mt-0.5">Página FB: {intg.page_name}</p>}
                              {intg.readiness?.instagram?.ready
                                ? <p className="text-xs text-green-600 mt-0.5">Pronta para postar</p>
                                : <p className="text-xs text-amber-600 mt-0.5">Verificar checklist</p>
                              }
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Facebook sem Instagram */}
                {integrations.filter((i) => i.page_id && !i.instagram_username).length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2 flex items-center gap-1.5">
                      <Facebook size={13} className="text-[#1877f2]" /> Páginas Facebook (sem Instagram)
                    </p>
                    <div className="space-y-2">
                      {integrations.filter((i) => i.page_id && !i.instagram_username).map((intg) => {
                        const isSelected = manageGroup.accounts.some((a) => a.account_type === 'meta' && a.account_id === intg.id)
                        return (
                          <label key={intg.id} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${isSelected ? 'border-[#c62737]/40 bg-[#c62737]/5' : 'border-slate-200 hover:bg-slate-50'}`}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={accountsUpdating}
                              onChange={() => handleToggleGroupAccount(manageGroup.id, 'meta', intg.id, isSelected)}
                              className="mt-0.5 accent-[#c62737]"
                            />
                            <div>
                              <div className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
                                <Facebook size={13} className="text-[#1877f2] shrink-0" />
                                {intg.page_name || 'Página do Facebook'}
                              </div>
                              {intg.is_active && <p className="text-xs text-green-600 mt-0.5">Ativa</p>}
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* YouTube */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2 flex items-center gap-1.5">
                    <Youtube size={13} className="text-red-600" /> Canais YouTube
                  </p>
                  {ytIntegrations.length === 0 ? (
                    <p className="text-sm text-slate-400">Nenhum canal YouTube conectado ainda.</p>
                  ) : (
                    <div className="space-y-2">
                      {ytIntegrations.map((yt) => {
                        const isSelected = manageGroup.accounts.some((a) => a.account_type === 'youtube' && a.account_id === yt.id)
                        return (
                          <label key={yt.id} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${isSelected ? 'border-[#c62737]/40 bg-[#c62737]/5' : 'border-slate-200 hover:bg-slate-50'}`}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={accountsUpdating}
                              onChange={() => handleToggleGroupAccount(manageGroup.id, 'youtube', yt.id, isSelected)}
                              className="mt-0.5 accent-[#c62737]"
                            />
                            <div className="flex items-center gap-2 min-w-0">
                              {yt.channel_thumbnail_url
                                // eslint-disable-next-line @next/next/no-img-element
                                ? <img src={yt.channel_thumbnail_url} alt={yt.channel_title ?? ''} className="w-7 h-7 rounded-full border border-slate-200 shrink-0" />
                                : <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center shrink-0"><Youtube size={13} className="text-red-600" /></div>
                              }
                              <div>
                                <p className="text-sm font-medium text-slate-800">{yt.channel_title || 'Canal sem nome'}</p>
                                {yt.channel_custom_url && <p className="text-xs text-slate-500">{yt.channel_custom_url}</p>}
                              </div>
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* TikTok */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2 flex items-center gap-1.5">
                    <Music2 size={13} className="text-slate-900" /> Contas TikTok
                  </p>
                  {tkIntegrations.length === 0 ? (
                    <p className="text-sm text-slate-400">Nenhuma conta TikTok conectada ainda.</p>
                  ) : (
                    <div className="space-y-2">
                      {tkIntegrations.map((tk) => {
                        const isSelected = manageGroup.accounts.some((a) => a.account_type === 'tiktok' && a.account_id === tk.id)
                        return (
                          <label key={tk.id} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${isSelected ? 'border-[#c62737]/40 bg-[#c62737]/5' : 'border-slate-200 hover:bg-slate-50'}`}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={accountsUpdating}
                              onChange={() => handleToggleGroupAccount(manageGroup.id, 'tiktok', tk.id, isSelected)}
                              className="mt-0.5 accent-[#c62737]"
                            />
                            <div className="flex items-center gap-2 min-w-0">
                              {tk.avatar_url
                                // eslint-disable-next-line @next/next/no-img-element
                                ? <img src={tk.avatar_url} alt={tk.display_name ?? ''} className="w-7 h-7 rounded-full border border-slate-200 shrink-0" />
                                : <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0"><Music2 size={13} className="text-slate-600" /></div>
                              }
                              <div>
                                <p className="text-sm font-medium text-slate-800">{tk.display_name || tk.handle || 'TikTok'}</p>
                                {tk.handle && <p className="text-xs text-slate-500">{tk.handle}</p>}
                              </div>
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
              <div className="px-6 py-4 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setManageAccountsGroupId(null)}
                  disabled={accountsUpdating}
                  className="rounded-xl bg-[#c62737] px-5 py-2 text-sm font-medium text-white hover:bg-[#a01f2d] disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {accountsUpdating && <Loader2 size={14} className="animate-spin" />}
                  Concluir
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ────────────────────────────────────────────────────────────────────
          Modal: Usuários da instância
        ──────────────────────────────────────────────────────────────────── */}
        {manageUsersGroupId && (() => {
          const usersGroup = groups.find((g) => g.id === manageUsersGroupId)
          if (!usersGroup) return null
          return (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto"
              onClick={() => !usersUpdating && setManageUsersGroupId(null)}
              role="dialog"
              aria-modal="true"
            >
              <div
                className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl my-8"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="p-6 border-b border-slate-100">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: usersGroup.color }} />
                    <h2 className="text-lg font-semibold text-slate-900">Usuários — {usersGroup.name}</h2>
                  </div>
                  <p className="text-sm text-slate-500">Defina quais usuários estão autorizados a publicar por esta instância.</p>
                </div>

                {/* Corpo */}
                <div className="p-6 max-h-[60vh] overflow-y-auto">
                  {groupUsersLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 size={22} className="animate-spin text-slate-400" />
                    </div>
                  ) : allUsers.length === 0 ? (
                    <div className="py-8 text-center text-slate-500 text-sm border border-dashed border-slate-200 rounded-xl">
                      Nenhum usuário cadastrado no sistema.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {allUsers.map((user) => {
                        const isLinked = groupUserLinkedIds.includes(user.id)
                        const displayName = user.full_name || user.email || user.id
                        return (
                          <label
                            key={user.id}
                            className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                              isLinked
                                ? 'border-[#c62737]/40 bg-[#c62737]/5'
                                : 'border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isLinked}
                              disabled={usersUpdating}
                              onChange={() => handleToggleGroupUser(manageUsersGroupId, user.id, isLinked)}
                              className="accent-[#c62737] shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                {isLinked
                                  ? <UserCheck size={14} className="text-[#c62737] shrink-0" />
                                  : <UserMinus size={14} className="text-slate-400 shrink-0" />}
                                <span className="text-sm font-medium text-slate-800 truncate">{displayName}</span>
                              </div>
                              {user.full_name && user.email && (
                                <p className="text-xs text-slate-500 mt-0.5 truncate">{user.email}</p>
                              )}
                            </div>
                            {isLinked && (
                              <span className="text-xs bg-[#c62737]/10 text-[#c62737] px-2 py-0.5 rounded-full font-medium shrink-0">Permitido</span>
                            )}
                          </label>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Rodapé */}
                <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-3">
                  <p className="text-xs text-slate-400">
                    {groupUserLinkedIds.length === 0
                      ? 'Nenhum usuário autorizado'
                      : `${groupUserLinkedIds.length} usuário${groupUserLinkedIds.length !== 1 ? 's' : ''} autorizado${groupUserLinkedIds.length !== 1 ? 's' : ''}`}
                  </p>
                  <button
                    onClick={() => setManageUsersGroupId(null)}
                    disabled={usersUpdating}
                    className="rounded-xl bg-[#c62737] px-5 py-2 text-sm font-medium text-white hover:bg-[#a01f2d] disabled:opacity-50 inline-flex items-center gap-2"
                  >
                    {usersUpdating && <Loader2 size={14} className="animate-spin" />}
                    Concluir
                  </button>
                </div>
              </div>
            </div>
          )
        })()}

        {/* ────────────────────────────────────────────────────────────────────
          Modal: YouTube — Publicar Vídeo
        ──────────────────────────────────────────────────────────────────── */}
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
                <div className="flex items-center gap-3">
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
                  <label className="block text-xs font-medium text-slate-700 mb-1">URL do vídeo <span className="text-red-500">*</span></label>
                  <input
                    value={ytPostForm.videoUrl}
                    onChange={(e) => setYtPostForm({ ...ytPostForm, videoUrl: e.target.value })}
                    placeholder="https://drive.google.com/... ou URL pública do vídeo"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:border-[#c62737] focus:ring-2 focus:ring-[#c62737]/20 outline-none transition-all placeholder:text-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Título <span className="text-red-500">*</span></label>
                  <input
                    value={ytPostForm.title}
                    onChange={(e) => setYtPostForm({ ...ytPostForm, title: e.target.value })}
                    maxLength={100}
                    placeholder="Título do vídeo"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:border-[#c62737] focus:ring-2 focus:ring-[#c62737]/20 outline-none transition-all placeholder:text-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Descrição</label>
                  <textarea
                    value={ytPostForm.description}
                    onChange={(e) => setYtPostForm({ ...ytPostForm, description: e.target.value })}
                    rows={3}
                    placeholder="Descrição do vídeo..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:border-[#c62737] focus:ring-2 focus:ring-[#c62737]/20 outline-none transition-all placeholder:text-slate-400 resize-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Visibilidade</label>
                    <CustomSelect
                      value={ytPostForm.privacyStatus}
                      onChange={(v) => setYtPostForm({ ...ytPostForm, privacyStatus: v })}
                      options={[
                        { value: 'public', label: 'Público' },
                        { value: 'unlisted', label: 'Não listado' },
                        { value: 'private', label: 'Privado' },
                      ]}
                      allowEmpty={false}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Tags (vírgula)</label>
                    <input
                      value={ytPostForm.tags}
                      onChange={(e) => setYtPostForm({ ...ytPostForm, tags: e.target.value })}
                      placeholder="Sara, Alagoas, culto"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:border-[#c62737] focus:ring-2 focus:ring-[#c62737]/20 outline-none transition-all placeholder:text-slate-400"
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 justify-end px-6 pb-6">
                <button type="button" onClick={() => !ytPosting && setYtPostModal(null)} disabled={ytPosting} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">Cancelar</button>
                <button type="button" onClick={handlePostToYouTube} disabled={ytPosting} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 inline-flex items-center gap-2">
                  {ytPosting ? <><Loader2 size={16} className="animate-spin" /> Enviando...</> : <><Youtube size={16} /> Publicar</>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ────────────────────────────────────────────────────────────────────
          ConfirmDialogs (usa componente canônico do Design System)
        ──────────────────────────────────────────────────────────────────── */}

        <ConfirmDialog
          open={!!deleteGroupId}
          title="Excluir instância"
          message="Esta instância será removida permanentemente com todas as suas vinculações de contas. As contas em si não serão desconectadas."
          confirmLabel="Excluir instância"
          variant="danger"
          onConfirm={handleDeleteGroup}
          onCancel={() => setDeleteGroupId(null)}
        />

        <ConfirmDialog
          open={!!ytDeleteConfirmId}
          title="Remover canal do YouTube"
          message="O canal será desconectado da plataforma. Para reconectar, faça o OAuth novamente."
          confirmLabel="Remover canal"
          variant="danger"
          onConfirm={confirmDeleteYoutube}
          onCancel={() => setYtDeleteConfirmId(null)}
        />

        <ConfirmDialog
          open={!!tkDeleteConfirmId}
          title="Remover perfil do TikTok"
          message="O perfil será desconectado da plataforma. Para reconectar, faça o login novamente."
          confirmLabel="Remover perfil"
          variant="danger"
          onConfirm={confirmDeleteTikTok}
          onCancel={() => setTkDeleteConfirmId(null)}
        />

        <ConfirmDialog
          open={!!unlinkModalId}
          title="Desvincular conta"
          message="A conta sairá da lista de integrações. Ela continuará disponível ao escolher onde postar, mas não aparecerá na listagem principal."
          confirmLabel={unlinking ? 'Desvinculando...' : 'Desvincular'}
          variant="primary"
          onConfirm={confirmUnlink}
          onCancel={() => setUnlinkModalId(null)}
        />
      </div>
    </PageAccessGuard>
  )
}
