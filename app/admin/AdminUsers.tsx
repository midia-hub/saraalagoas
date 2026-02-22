'use client'

import { useState, useEffect } from 'react'
import { UserPlus, Mail, Pencil, KeyRound, Trash2, Loader2, UserCheck, UserMinus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { adminFetchJson } from '@/lib/admin-client'
import { Toast } from '@/components/Toast'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { TableSkeleton } from '@/components/ui/TableSkeleton'
import { CustomSelect } from '@/components/ui/CustomSelect'

interface RoleItem {
  id: string
  key: string
  name: string
  description?: string | null
  is_admin: boolean
  is_system?: boolean
  is_active?: boolean
  sort_order?: number
}

interface UserProfile {
  id: string
  email: string | null
  full_name?: string | null
  person_id?: string | null
  people?:
    | { id: string; full_name?: string | null; email?: string | null }
    | Array<{ id: string; full_name?: string | null; email?: string | null }>
    | null
  avatar_url?: string | null
  role: string | null
  access_profile_id: string | null
  role_id: string | null
  created_at: string
  access_profiles?: { id: string; name: string; is_admin?: boolean } | Array<{ id: string; name: string; is_admin?: boolean }> | null
  roles?: RoleItem | RoleItem[] | null
}

type RbacResponse = {
  pages?: unknown[]
  profiles?: unknown[]
  users: UserProfile[]
}

export function AdminUsers() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [roles, setRoles] = useState<RoleItem[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteMessage, setInviteMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [savingMessage, setSavingMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [assigningRoleUserId, setAssigningRoleUserId] = useState<string | null>(null)
  const [editUser, setEditUser] = useState<UserProfile | null>(null)
  const [editFullName, setEditFullName] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const [loadingReset, setLoadingReset] = useState<string | null>(null)
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null)
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null)
  const [reconcilingUserId, setReconcilingUserId] = useState<string | null>(null)
  const [reconcilingAll, setReconcilingAll] = useState(false)

  function getUserRole(user: UserProfile): RoleItem | null {
    const r = user.roles
    if (Array.isArray(r)) return r[0] || null
    return r || null
  }

  function getUserPerson(user: UserProfile): { id: string; full_name?: string | null; email?: string | null } | null {
    const p = user.people
    if (!p) return null
    if (Array.isArray(p)) return p[0] || null
    return p
  }

  async function loadData() {
    setLoading(true)
    try {
      const [rbacData, rolesData] = await Promise.all([
        adminFetchJson<RbacResponse>('/api/admin/rbac').catch(() => ({ users: [] as UserProfile[] })),
        adminFetchJson<{ roles: RoleItem[] }>('/api/admin/roles').catch(() => ({ roles: [] })),
      ])
      setUsers(rbacData.users || [])
      setRoles(rolesData.roles || [])
    } catch (error) {
      setSavingMessage({
        type: 'err',
        text: 'Não foi possível carregar usuários. Tente novamente.',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    ;(async () => {
      await adminFetchJson('/api/admin/users/reconcile-person-links', {
        method: 'POST',
      }).catch(() => null)
      await loadData()
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviteMessage(null)
    const email = inviteEmail.trim()
    if (!email) {
      setInviteMessage({ type: 'err', text: 'Por favor, insira seu e-mail.' })
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
      setInviteMessage({ type: 'ok', text: 'Convite enviado! Aguarde o e-mail.' })
      setInviteEmail('')
      await loadData()
    } catch (err) {
      setInviteMessage({ type: 'err', text: 'Não foi possível enviar o convite. Tente novamente.' })
    } finally {
      setInviteLoading(false)
    }
  }

  async function handleAssignRole(userId: string, roleId: string) {
    if (!roleId) return
    setSavingMessage(null)
    setAssigningRoleUserId(userId)
    try {
      await adminFetchJson(`/api/admin/users/${userId}/assign-role`, {
        method: 'POST',
        body: JSON.stringify({ role_id: roleId }),
      })
      const role = roles.find((r) => r.id === roleId) || null
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, role_id: roleId, roles: role ? [role] : null } : u
        )
      )
      setSavingMessage({ type: 'ok', text: 'Função do usuário atualizada.' })
    } catch (error) {
      setSavingMessage({ type: 'err', text: 'Não foi possível atualizar a função. Tente novamente.' })
    } finally {
      setAssigningRoleUserId(null)
    }
  }

  function openEditModal(user: UserProfile) {
    setEditUser(user)
    setEditFullName(user.full_name ?? '')
  }

  function closeEditModal() {
    setEditUser(null)
    setEditFullName('')
  }

  async function handleEditSave() {
    if (!editUser) return
    setSavingEdit(true)
    setSavingMessage(null)
    try {
      const data = await adminFetchJson<{ user: UserProfile }>(`/api/admin/users/${editUser.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ full_name: editFullName.trim() || null }),
      })
      setUsers((prev) =>
        prev.map((u) => (u.id === editUser.id ? { ...u, full_name: data.user?.full_name ?? editFullName } : u))
      )
      setSavingMessage({ type: 'ok', text: 'Informações atualizadas.' })
      closeEditModal()
    } catch (error) {
      setSavingMessage({ type: 'err', text: 'Não foi possível atualizar. Tente novamente.' })
    } finally {
      setSavingEdit(false)
    }
  }

  async function handleSendResetPassword(userId: string) {
    setSavingMessage(null)
    setLoadingReset(userId)
    try {
      await adminFetchJson(`/api/admin/users/${userId}/send-reset-password`, { method: 'POST' })
      setSavingMessage({ type: 'ok', text: 'Enviamos um e-mail para redefinir sua senha.' })
    } catch (error) {
      setSavingMessage({ type: 'err', text: 'Não foi possível enviar o e-mail. Tente novamente.' })
    } finally {
      setLoadingReset(null)
    }
  }

  function openDeleteConfirm(user: UserProfile) {
    setUserToDelete(user)
  }

  async function confirmDeleteUser() {
    if (!userToDelete) return
    setSavingMessage(null)
    setDeletingUserId(userToDelete.id)
    try {
      await adminFetchJson(`/api/admin/users/${userToDelete.id}`, { method: 'DELETE' })
      setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id))
      setSavingMessage({ type: 'ok', text: 'Usuário excluído com sucesso.' })
      if (editUser?.id === userToDelete.id) closeEditModal()
      setUserToDelete(null)
    } catch (error) {
      setSavingMessage({ type: 'err', text: 'Não foi possível excluir. O usuário pode ser dono de arquivos no Storage.' })
    } finally {
      setDeletingUserId(null)
    }
  }

  async function handleReconcileUser(userId: string) {
    setReconcilingUserId(userId)
    setSavingMessage(null)
    try {
      const result = await adminFetchJson<{ fixed: number }>(`/api/admin/users/reconcile-person-links`, {
        method: 'POST',
        body: JSON.stringify({ user_id: userId }),
      })
      if ((result?.fixed ?? 0) > 0) {
        setSavingMessage({ type: 'ok', text: 'Usuário vinculado com sucesso ao cadastro de Pessoa.' })
      } else {
        setSavingMessage({ type: 'err', text: 'Não foi possível regularizar este usuário.' })
      }
      await loadData()
    } catch {
      setSavingMessage({ type: 'err', text: 'Erro ao regularizar vínculo de Pessoa.' })
    } finally {
      setReconcilingUserId(null)
    }
  }

  async function handleReconcileAll() {
    setReconcilingAll(true)
    setSavingMessage(null)
    try {
      const result = await adminFetchJson<{ total: number; fixed: number }>(`/api/admin/users/reconcile-person-links`, {
        method: 'POST',
      })
      setSavingMessage({
        type: 'ok',
        text: `Regularização concluída: ${result.fixed} de ${result.total} usuário(s) vinculados ao cadastro de Pessoa.`,
      })
      await loadData()
    } catch {
      setSavingMessage({ type: 'err', text: 'Erro ao revisar vínculos de usuários.' })
    } finally {
      setReconcilingAll(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl space-y-6">
        <div className="animate-pulse">
          <div className="h-8 w-48 rounded bg-slate-200 mb-6" />
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="h-10 w-64 rounded-lg bg-slate-100" />
            <div className="h-10 w-32 rounded-lg bg-slate-100" />
          </div>
        </div>
        <TableSkeleton rows={6} columns={4} showHeader />
      </div>
    )
  }

  return (
    <div className="max-w-6xl space-y-6">
      <h2 className="text-xl font-bold text-gray-900 mb-2">Usuários</h2>
      <p className="text-gray-600 mb-6">
        Convide usuários e atribua perfis de acesso. Para gerenciar funções e permissões, use o menu &quot;Gerenciar Permissões&quot;.
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
            {inviteLoading ? <Loader2 size={18} className="animate-spin" /> : <Mail size={18} />}
            {inviteLoading ? 'Enviando...' : 'Enviar convite'}
          </button>
        </form>
        <p className="mt-3 text-xs text-gray-500">
          O convidado receberá um e-mail para definir a senha e acessar o painel.
        </p>
      </section>

      <section className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h3 className="font-semibold text-gray-900">Usuários com acesso</h3>
          <button
            type="button"
            onClick={handleReconcileAll}
            disabled={reconcilingAll}
            className="px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-50"
          >
            {reconcilingAll ? 'Revisando vínculos...' : 'Revisar vínculos Pessoa'}
          </button>
        </div>
        {users.length === 0 ? (
          <p className="text-gray-500">Nenhum usuário encontrado. Convide alguém acima.</p>
        ) : (
          <ul className="divide-y divide-gray-200">
            {users.map((user) => {
              const currentRole = getUserRole(user)
              const person = getUserPerson(user)
              const isAssigning = assigningRoleUserId === user.id
              return (
                <li key={user.id} className="py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-gray-900 font-bold">
                        {person?.full_name || user.full_name || user.email || user.id}
                      </p>
                      {user.person_id ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-green-50 text-green-600 px-2 py-0.5 rounded-full border border-green-100 uppercase tracking-wider" title="Vinculado ao Cadastro Central">
                          <UserCheck size={12} />
                          Vinculado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full border border-amber-100 uppercase tracking-wider" title="Não vinculado a uma Pessoa">
                          <UserMinus size={12} />
                          Sem Vínculo
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">{user.email}</p>
                    {user.person_id ? (
                      <a href={`/admin/pessoas/${user.person_id}`} className="text-xs text-[#c62737] hover:underline">
                        Ver cadastro da Pessoa
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleReconcileUser(user.id)}
                        disabled={reconcilingUserId === user.id}
                        className="text-xs text-amber-700 hover:underline disabled:opacity-50"
                      >
                        {reconcilingUserId === user.id ? 'Regularizando vínculo...' : 'Regularizar vínculo com Pessoa'}
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="text-sm text-gray-600 whitespace-nowrap sr-only md:not-sr-only">Função</label>
                    <div className="min-w-[160px]">
                      <CustomSelect
                        value={user.role_id || ''}
                        onChange={(v) => handleAssignRole(user.id, v)}
                        disabled={isAssigning}
                        placeholder="Função..."
                        options={roles
                          .filter((r) => r.is_active !== false)
                          .map((role) => ({
                            value: role.id,
                            label: role.name + (role.is_admin ? ' (Admin)' : ''),
                          }))}
                      />
                    </div>
                    {isAssigning && <span className="text-xs text-gray-500">Salvando...</span>}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditModal(user)}
                        className="p-2 text-gray-600 hover:text-[#c62737] hover:bg-gray-100 rounded-lg transition-colors"
                        title="Editar informações"
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSendResetPassword(user.id)}
                        disabled={!!loadingReset}
                        className="p-2 text-gray-600 hover:text-[#c62737] hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                        title="Enviar e-mail de redefinição de senha"
                      >
                        {loadingReset === user.id ? <Loader2 size={18} className="animate-spin" /> : <KeyRound size={18} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => openDeleteConfirm(user)}
                        disabled={!!deletingUserId}
                        className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Excluir usuário"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {userToDelete && (
        <ConfirmDialog
          open={!!userToDelete}
          title="Excluir usuário"
          message={`Excluir "${userToDelete.full_name || userToDelete.email || 'Usuário'}"? Esta ação não pode ser desfeita.`}
          confirmLabel="Excluir"
          cancelLabel="Cancelar"
          variant="danger"
          loading={deletingUserId === userToDelete.id}
          onConfirm={confirmDeleteUser}
          onCancel={() => setUserToDelete(null)}
        />
      )}

      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true" aria-labelledby="edit-user-title">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 id="edit-user-title" className="text-lg font-semibold text-gray-900 mb-4">Editar usuário</h3>
            <p className="text-sm text-gray-500 mb-3">{editUser.email}</p>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome completo</label>
            <input
              type="text"
              value={editFullName}
              onChange={(e) => setEditFullName(e.target.value)}
              placeholder="Nome do usuário"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={closeEditModal}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleEditSave}
                disabled={savingEdit}
                className="px-4 py-2 bg-[#c62737] text-white rounded-lg hover:bg-[#a01f2d] disabled:opacity-50 flex items-center gap-2"
              >
                {savingEdit && <Loader2 className="w-4 h-4 animate-spin" />}
                {savingEdit ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

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