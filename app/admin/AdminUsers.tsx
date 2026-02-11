'use client'

import { useState, useEffect } from 'react'
import { UserPlus, Mail } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { adminFetchJson } from '@/lib/admin-client'
import { Toast } from '@/components/Toast'

type PageCatalog = {
  key: string
  label: string
  description: string
}

type PermissionItem = {
  page_key: string
  can_view: boolean
  can_create: boolean
  can_edit: boolean
  can_delete: boolean
}

interface AccessProfile {
  id: string
  name: string
  description: string
  is_admin: boolean
  is_system: boolean
  access_profile_permissions: PermissionItem[]
}

interface UserProfile {
  id: string
  email: string | null
  role: string | null
  access_profile_id: string | null
  created_at: string
  access_profiles?: { id: string; name: string; is_admin?: boolean } | Array<{ id: string; name: string; is_admin?: boolean }> | null
}

type RbacResponse = {
  pages: PageCatalog[]
  profiles: AccessProfile[]
  users: UserProfile[]
}

export function AdminUsers() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [profiles, setProfiles] = useState<AccessProfile[]>([])
  const [pages, setPages] = useState<PageCatalog[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteMessage, setInviteMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [savingMessage, setSavingMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null)
  const [profileName, setProfileName] = useState('')
  const [profileDescription, setProfileDescription] = useState('')
  const [profilePermissions, setProfilePermissions] = useState<Record<string, PermissionItem>>({})

  function getAttachedProfile(user: UserProfile): { id: string; name: string } | null {
    if (Array.isArray(user.access_profiles)) return user.access_profiles[0] || null
    return user.access_profiles || null
  }

  function emptyPermission(pageKey: string): PermissionItem {
    return {
      page_key: pageKey,
      can_view: false,
      can_create: false,
      can_edit: false,
      can_delete: false,
    }
  }

  function buildPermissionState(source: PermissionItem[], availablePages: PageCatalog[]) {
    const map: Record<string, PermissionItem> = {}
    for (const page of availablePages) {
      map[page.key] = emptyPermission(page.key)
    }
    for (const permission of source) {
      map[permission.page_key] = {
        page_key: permission.page_key,
        can_view: !!permission.can_view,
        can_create: !!permission.can_create,
        can_edit: !!permission.can_edit,
        can_delete: !!permission.can_delete,
      }
    }
    return map
  }

  function resetProfileForm(availablePages = pages) {
    setEditingProfileId(null)
    setProfileName('')
    setProfileDescription('')
    setProfilePermissions(buildPermissionState([], availablePages))
  }

  async function loadRbacData() {
    setLoading(true)
    try {
      const data = await adminFetchJson<RbacResponse>('/api/admin/rbac')
      setPages(data.pages || [])
      setProfiles(data.profiles || [])
      setUsers(data.users || [])
      resetProfileForm(data.pages || [])
    } catch (error) {
      setSavingMessage({
        type: 'err',
        text: 'Não foi possível carregar usuários e perfis. Tente novamente.',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRbacData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviteMessage(null)
    const email = inviteEmail.trim()
    if (!email) {
      setInviteMessage({ type: 'err', text: 'Informe o e-mail.' })
      return
    }
    if (!supabase) {
      setInviteMessage({ type: 'err', text: 'Serviço temporariamente indisponível. Tente mais tarde.' })
      return
    }
    setInviteLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setInviteMessage({ type: 'err', text: 'Sessão expirada. Faça login novamente.' })
        setInviteLoading(false)
        return
      }
      const base = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
      const url = `${base}/functions/v1/admin-invite-user`
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ email }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setInviteMessage({ type: 'err', text: 'Não foi possível enviar o convite. Tente novamente.' })
        setInviteLoading(false)
        return
      }
      setInviteMessage({ type: 'ok', text: 'Convite enviado! O usuário receberá um e-mail para definir a senha.' })
      setInviteEmail('')
      await loadRbacData()
    } catch (err) {
      setInviteMessage({ type: 'err', text: 'Não foi possível enviar o convite. Tente novamente.' })
    } finally {
      setInviteLoading(false)
    }
  }

  async function handleAssignUserProfile(userId: string, profileId: string) {
    setSavingMessage(null)
    try {
      await adminFetchJson('/api/admin/rbac', {
        method: 'POST',
        body: JSON.stringify({
          action: 'assignUserProfile',
          userId,
          profileId,
        }),
      })
      setUsers((prev) => prev.map((user) => (user.id === userId ? { ...user, access_profile_id: profileId } : user)))
      setSavingMessage({ type: 'ok', text: 'Perfil do usuário atualizado.' })
    } catch (error) {
      setSavingMessage({ type: 'err', text: 'Não foi possível atualizar. Tente novamente.' })
    }
  }

  function togglePermission(pageKey: string, action: keyof Omit<PermissionItem, 'page_key'>, value: boolean) {
    setProfilePermissions((prev) => {
      const current = prev[pageKey] || emptyPermission(pageKey)
      const next = { ...current, [action]: value }
      if (action !== 'can_view' && value) next.can_view = true
      return { ...prev, [pageKey]: next }
    })
  }

  function handleEditProfile(profile: AccessProfile) {
    setEditingProfileId(profile.id)
    setProfileName(profile.name)
    setProfileDescription(profile.description)
    setProfilePermissions(buildPermissionState(profile.access_profile_permissions || [], pages))
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    setSavingMessage(null)
    const name = profileName.trim()
    const description = profileDescription.trim()
    const permissions = Object.values(profilePermissions).filter((item) => item.can_view)

    if (!name) {
      setSavingMessage({ type: 'err', text: 'Informe o nome do perfil.' })
      return
    }
    if (!description) {
      setSavingMessage({ type: 'err', text: 'Informe a descrição do perfil.' })
      return
    }
    if (!permissions.length) {
      setSavingMessage({ type: 'err', text: 'Selecione ao menos uma página com permissão de visualização.' })
      return
    }

    try {
      await adminFetchJson('/api/admin/rbac', {
        method: 'POST',
        body: JSON.stringify(
          editingProfileId
            ? { action: 'updateProfile', profileId: editingProfileId, name, description, permissions }
            : { action: 'createProfile', name, description, permissions }
        ),
      })
      setSavingMessage({ type: 'ok', text: editingProfileId ? 'Perfil atualizado.' : 'Perfil criado com sucesso.' })
      await loadRbacData()
    } catch (error) {
      setSavingMessage({ type: 'err', text: 'Não foi possível salvar o perfil. Tente novamente.' })
    }
  }

  async function handleDeleteProfile(profileId: string) {
    setSavingMessage(null)
    try {
      await adminFetchJson('/api/admin/rbac', {
        method: 'POST',
        body: JSON.stringify({ action: 'deleteProfile', profileId }),
      })
      setSavingMessage({ type: 'ok', text: 'Perfil removido.' })
      await loadRbacData()
    } catch (error) {
      setSavingMessage({ type: 'err', text: 'Não foi possível remover o perfil. Tente novamente.' })
    }
  }

  if (loading) return <p className="text-gray-600">Carregando usuários...</p>

  return (
    <div className="max-w-6xl space-y-6">
      <h2 className="text-xl font-bold text-gray-900 mb-2">Usuários, perfis e permissões</h2>
      <p className="text-gray-600 mb-6">
        O Admin cria perfis personalizados, define permissões por página e atribui exatamente um perfil para cada usuário.
      </p>

      <section className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <UserPlus size={20} />
          Convidar usuário
        </h3>
        <form onSubmit={handleInvite} className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="novo@email.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <button
            type="submit"
            disabled={inviteLoading}
            className="px-4 py-2 bg-[#c62737] text-white font-medium rounded-lg hover:bg-[#a01f2d] disabled:opacity-50 flex items-center gap-2"
          >
            <Mail size={18} />
            {inviteLoading ? 'Enviando...' : 'Enviar convite'}
          </button>
        </form>
        <p className="mt-3 text-xs text-gray-500">
          O convidado receberá um e-mail para definir a senha e acessar o painel.
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4">{editingProfileId ? 'Editar perfil' : 'Novo perfil personalizado'}</h3>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome do perfil</label>
              <input
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="Ex: Editor de Conteúdo"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrição do perfil</label>
              <textarea
                value={profileDescription}
                onChange={(e) => setProfileDescription(e.target.value)}
                rows={2}
                placeholder="Finalidade do acesso"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Permissões por página</p>
              {pages.map((page) => {
                const perm = profilePermissions[page.key] || emptyPermission(page.key)
                return (
                  <div key={page.key} className="border border-gray-200 rounded-lg p-3">
                    <p className="font-medium text-gray-900">{page.label}</p>
                    <p className="text-xs text-gray-500">{page.description}</p>
                    <div className="mt-2 flex flex-wrap gap-3 text-sm">
                      <label className="inline-flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={perm.can_view}
                          onChange={(e) => togglePermission(page.key, 'can_view', e.target.checked)}
                        />
                        Visualizar
                      </label>
                      <label className="inline-flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={perm.can_create}
                          onChange={(e) => togglePermission(page.key, 'can_create', e.target.checked)}
                        />
                        Criar
                      </label>
                      <label className="inline-flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={perm.can_edit}
                          onChange={(e) => togglePermission(page.key, 'can_edit', e.target.checked)}
                        />
                        Editar
                      </label>
                      <label className="inline-flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={perm.can_delete}
                          onChange={(e) => togglePermission(page.key, 'can_delete', e.target.checked)}
                        />
                        Excluir
                      </label>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-[#c62737] text-white font-medium rounded-lg hover:bg-[#a01f2d]"
              >
                {editingProfileId ? 'Salvar alterações' : 'Criar perfil'}
              </button>
              {editingProfileId && (
                <button
                  type="button"
                  onClick={() => resetProfileForm()}
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                >
                  Cancelar edição
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4">Perfis cadastrados</h3>
          {profiles.length === 0 ? (
            <p className="text-gray-500">Nenhum perfil encontrado.</p>
          ) : (
            <ul className="divide-y divide-gray-200">
              {profiles.map((profile) => (
                <li key={profile.id} className="py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-gray-900">
                        {profile.name}
                        {profile.is_admin ? ' (Admin)' : ''}
                      </p>
                      <p className="text-sm text-gray-600">{profile.description}</p>
                    </div>
                    {!profile.is_admin && !profile.is_system && (
                      <div className="flex gap-2">
                        <button type="button" onClick={() => handleEditProfile(profile)} className="text-sm text-[#c62737] hover:underline">
                          Editar
                        </button>
                        <button type="button" onClick={() => handleDeleteProfile(profile.id)} className="text-sm text-red-600 hover:underline">
                          Excluir
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-4">Usuários com acesso</h3>
        {users.length === 0 ? (
          <p className="text-gray-500">Nenhum usuário encontrado. Convide alguém acima.</p>
        ) : (
          <ul className="divide-y divide-gray-200">
            {users.map((user) => {
              const attachedProfile = getAttachedProfile(user)
              return (
                <li key={user.id} className="py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <p className="text-gray-900">{user.email || user.id}</p>
                    <p className="text-xs text-gray-500">Role legado: {user.role || 'n/a'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">Perfil</label>
                    <select
                      value={user.access_profile_id || attachedProfile?.id || ''}
                      onChange={(e) => handleAssignUserProfile(user.id, e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="" disabled>Selecione...</option>
                      {profiles.map((profile) => (
                        <option key={profile.id} value={profile.id}>
                          {profile.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <Toast
        visible={!!inviteMessage || !!savingMessage}
        message={(savingMessage ?? inviteMessage)?.text ?? ''}
        type={(savingMessage ?? inviteMessage)?.type ?? 'err'}
        onClose={() => {
          setInviteMessage(null)
          setSavingMessage(null)
        }}
      />
    </div>
  )
}