'use client'

import { useEffect, useState } from 'react'
import { Plus, Shield, Users, Edit, Trash2, AlertCircle } from 'lucide-react'
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

  if (loading) {
    return (
      <PageAccessGuard pageKey="roles">
        <div className="p-6 md:p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-200 rounded w-1/4" />
            <div className="h-32 bg-slate-200 rounded" />
            <div className="h-32 bg-slate-200 rounded" />
          </div>
        </div>
      </PageAccessGuard>
    )
  }

  return (
    <PageAccessGuard pageKey="roles">
      <div className="p-6 md:p-8">
        <AdminPageHeader
          icon={Shield}
          title="Gerenciar permissões"
          subtitle="Tipos de usuários e permissões na plataforma."
          actions={
            <PermissionGate resource="roles" action="create">
              <button
                onClick={() => router.push('/admin/roles/new')}
                className="flex items-center gap-2 px-4 py-2 bg-[#c62737] text-white rounded-lg hover:bg-[#a61f2e] transition"
              >
                <Plus className="w-5 h-5" />
                Nova função
              </button>
            </PermissionGate>
          }
        />

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-800 font-medium">Erro</p>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Função</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Tipo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Usuários</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {roles.map((role) => (
                  <tr key={role.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-900">{role.name}</span>
                          {role.is_system && (
                            <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full">Sistema</span>
                          )}
                        </div>
                        {role.description && <p className="text-sm text-slate-500 mt-1">{role.description}</p>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {role.is_admin ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#c62737]/10 text-[#c62737]">
                          <Shield className="w-3 h-3 mr-1" /> Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                          <Users className="w-3 h-3 mr-1" /> Padrão
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-slate-400" />
                        <span className="text-sm text-slate-900">{role.users_count || 0} usuário(s)</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {role.is_active ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Ativa</span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">Inativa</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <PermissionGate resource="roles" action="edit">
                          <button onClick={() => router.push(`/admin/roles/${role.id}`)} className="p-2 text-[#c62737] hover:bg-[#c62737]/10 rounded-lg transition" title="Editar">
                            <Edit className="w-4 h-4" />
                          </button>
                        </PermissionGate>
                        {!role.is_system && (
                          <PermissionGate resource="roles" action="delete">
                            <button onClick={() => openDeleteConfirm(role.id, role.name)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition" title="Excluir" disabled={(role.users_count ?? 0) > 0}>
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </PermissionGate>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {roles.length === 0 && !loading && (
            <div className="text-center py-12">
              <Shield className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-500">Nenhuma função encontrada</p>
            </div>
          )}
        </div>

        <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-xl">
          <h3 className="font-medium text-slate-800 mb-2">Sobre funções e permissões</h3>
          <ul className="text-sm text-slate-600 space-y-1">
            <li>• <strong>Admin:</strong> Acesso completo a todas as funcionalidades</li>
            <li>• <strong>Moderador:</strong> Pode gerenciar conteúdo e aspectos operacionais</li>
            <li>• <strong>Usuário Padrão:</strong> Acesso restrito a funcionalidades específicas</li>
            <li>• <strong>Convidado:</strong> Apenas visualização, sem edição</li>
            <li>• Funções do sistema não podem ser excluídas</li>
            <li>• Funções com usuários atribuídos não podem ser excluídas</li>
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
