'use client'

import { useEffect, useState } from 'react'
import { Plus, Shield, Users, Edit, Trash2, AlertCircle, CheckCircle2, XCircle, Lock } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useRBAC } from '@/lib/hooks/useRBAC'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { AdminPageHeader } from '@/app/admin/AdminPageHeader'
import { PermissionGate } from '@/components/admin/PermissionGate'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { Toast } from '@/components/Toast'
import { adminFetchJson } from '@/lib/admin-client'
import type { RoleListItem } from '@/lib/rbac-types'

export default function RolesPage() {
  const router = useRouter()
  const { canCreate, canEdit, canDelete } = useRBAC()
  const [roles, setRoles] = useState<RoleListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [roleToDelete, setRoleToDelete] = useState<{ id: string; name: string } | null>(null)
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  useEffect(() => {
    loadRoles()
  }, [])

  async function loadRoles() {
    try {
      setLoading(true)
      setError(null)

      const data = await adminFetchJson<{ roles: RoleListItem[] }>('/api/admin/roles')
      setRoles(data.roles || [])
    } catch (err) {
      console.error('Erro ao carregar roles:', err)
      setError('Erro ao carregar roles')
    } finally {
      setLoading(false)
    }
  }

  function openDeleteConfirm(roleId: string, roleName: string) {
    setRoleToDelete({ id: roleId, name: roleName })
  }

  async function confirmDeleteRole() {
    if (!roleToDelete) return
    try {
      await adminFetchJson(`/api/admin/roles/${roleToDelete.id}`, { method: 'DELETE' })
      setToast({ type: 'ok', text: 'Função excluída com sucesso!' })
      setRoleToDelete(null)
      loadRoles()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Não foi possível excluir a função.'
      setToast({ type: 'err', text: message })
    }
  }

  const activeRoles = roles.filter((r) => r.is_active)
  const totalUsers = roles.reduce((acc, r) => acc + (r.users_count || 0), 0)

  if (loading) {
    return (
      <PageAccessGuard pageKey="roles">
        <div className="p-6 md:p-8 space-y-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-200 rounded w-1/4" />
            <div className="grid grid-cols-3 gap-4">
              <div className="h-24 bg-slate-200 rounded-2xl" />
              <div className="h-24 bg-slate-200 rounded-2xl" />
              <div className="h-24 bg-slate-200 rounded-2xl" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="h-40 bg-slate-200 rounded-2xl" />
              <div className="h-40 bg-slate-200 rounded-2xl" />
            </div>
          </div>
        </div>
      </PageAccessGuard>
    )
  }

  return (
    <PageAccessGuard pageKey="roles">
      <div className="p-6 md:p-8 space-y-8">
        <AdminPageHeader
          icon={Shield}
          title="Gerenciar permissões"
          subtitle="Tipos de usuários e níveis de acesso na plataforma."
          actions={
            <PermissionGate resource="roles" action="create">
              <button
                onClick={() => router.push('/admin/roles/new')}
                className="flex items-center gap-2 px-4 py-2 bg-[#c62737] text-white rounded-xl hover:bg-[#a61f2e] transition shadow-sm font-medium text-sm"
              >
                <Plus className="w-4 h-4" />
                Nova função
              </button>
            </PermissionGate>
          }
        />

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-800 font-semibold">Erro</p>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
            <div className="p-3 bg-[#c62737]/10 rounded-xl">
              <Shield className="w-6 h-6 text-[#c62737]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{roles.length}</p>
              <p className="text-sm text-slate-500">Funções cadastradas</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
            <div className="p-3 bg-emerald-50 rounded-xl">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{activeRoles.length}</p>
              <p className="text-sm text-slate-500">Funções ativas</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
            <div className="p-3 bg-sky-50 rounded-xl">
              <Users className="w-6 h-6 text-sky-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{totalUsers}</p>
              <p className="text-sm text-slate-500">Usuários atribuídos</p>
            </div>
          </div>
        </div>

        {/* Role Cards */}
        {roles.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm py-16 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 rounded-full mb-4">
              <Shield className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-slate-600 font-medium">Nenhuma função cadastrada</p>
            <p className="text-slate-400 text-sm mt-1">Crie a primeira função para começar.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {roles.map((role) => (
              <RoleCard
                key={role.id}
                role={role}
                canEditRole={canEdit('roles')}
                canDeleteRole={canDelete('roles')}
                onEdit={() => router.push(`/admin/roles/${role.id}`)}
                onDelete={() => openDeleteConfirm(role.id, role.name)}
              />
            ))}
          </div>
        )}

        {/* Info */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Lock className="w-4 h-4 text-slate-500" />
            <h3 className="font-semibold text-slate-700 text-sm">Sobre as permissões</h3>
          </div>
          <ul className="text-sm text-slate-600 space-y-1.5">
            <li className="flex items-start gap-2">
              <span className="mt-1.5 inline-block w-2 h-2 rounded-full bg-[#c62737] flex-shrink-0" />
              <span><strong>Gerenciamento:</strong> Visualização e edição completa de todos os módulos</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 inline-block w-2 h-2 rounded-full bg-slate-400 flex-shrink-0" />
              <span><strong>Padrão:</strong> Somente visualização, sem permissão de escrita</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 inline-block w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
              <span>Funções do sistema não podem ser excluídas</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 inline-block w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
              <span>Funções com usuários atribuídos não podem ser excluídas</span>
            </li>
          </ul>
        </div>

        {roleToDelete && (
          <ConfirmDialog
            open={!!roleToDelete}
            title="Excluir função"
            message={`Tem certeza que deseja excluir a função "${roleToDelete.name}"?`}
            confirmLabel="Excluir"
            cancelLabel="Cancelar"
            variant="danger"
            onConfirm={confirmDeleteRole}
            onCancel={() => setRoleToDelete(null)}
          />
        )}

        <Toast visible={!!toast} message={toast?.text ?? ''} type={toast?.type ?? 'err'} onClose={() => setToast(null)} />
      </div>
    </PageAccessGuard>
  )
}

/* ─── Role Card ────────────────────────────────────────────────── */

interface RoleCardProps {
  role: RoleListItem
  canEditRole: boolean
  canDeleteRole: boolean
  onEdit: () => void
  onDelete: () => void
}

function RoleCard({ role, canEditRole, canDeleteRole, onEdit, onDelete }: RoleCardProps) {
  const isAdminRole = role.is_admin
  const usersCount = role.users_count || 0
  const cannotDelete = role.is_system || usersCount > 0

  return (
    <div
      className={`bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col ${
        role.is_active ? 'border-slate-200' : 'border-slate-200 opacity-60'
      }`}
    >
      {/* Header color stripe */}
      <div className={`h-1.5 w-full ${isAdminRole ? 'bg-[#c62737]' : 'bg-slate-300'}`} />

      <div className="p-5 flex-1 flex flex-col gap-4">
        {/* Title row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl flex-shrink-0 ${
                isAdminRole ? 'bg-[#c62737]/10' : 'bg-slate-100'
              }`}
            >
              <Shield
                className={`w-5 h-5 ${isAdminRole ? 'text-[#c62737]' : 'text-slate-500'}`}
              />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-slate-900 text-base">{role.name}</h3>
                {role.is_system && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full uppercase tracking-wide">
                    Sistema
                  </span>
                )}
              </div>
              {role.description && (
                <p className="text-sm text-slate-500 mt-0.5 line-clamp-2">{role.description}</p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {canEditRole && (
              <button
                onClick={onEdit}
                className="p-2 text-slate-400 hover:text-[#c62737] hover:bg-[#c62737]/10 rounded-lg transition"
                title="Editar"
              >
                <Edit className="w-4 h-4" />
              </button>
            )}
            {canDeleteRole && !cannotDelete && (
              <button
                onClick={onDelete}
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                title="Excluir"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Badges row */}
        <div className="flex items-center gap-2 flex-wrap mt-auto">
          {isAdminRole ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#c62737]/10 text-[#c62737]">
              <Shield className="w-3 h-3" /> Admin
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
              <Users className="w-3 h-3" /> Padrão
            </span>
          )}

          {role.is_active ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="w-3 h-3" /> Ativa
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500">
              <XCircle className="w-3 h-3" /> Inativa
            </span>
          )}

          <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            {usersCount} usuário{usersCount !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </div>
  )
}
