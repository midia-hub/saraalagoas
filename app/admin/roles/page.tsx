'use client'

import { useEffect, useState } from 'react'
import { Plus, Shield, Users, Edit, Trash2, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useRBAC } from '@/lib/hooks/useRBAC'
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
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Shield className="w-8 h-8 text-blue-600" />
              Gerenciar Funções e Acessos
            </h1>
            <p className="mt-2 text-gray-600">
              Gerencie os tipos de usuários e suas permissões na plataforma
            </p>
          </div>

          <PermissionGate resource="roles" action="create">
            <button
              onClick={() => router.push('/admin/roles/new')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <Plus className="w-5 h-5" />
              Nova Role
            </button>
          </PermissionGate>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-800 font-medium">Erro</p>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Roles List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuários
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {roles.map((role) => (
                <tr key={role.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{role.name}</span>
                        {role.is_system && (
                          <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                            Sistema
                          </span>
                        )}
                      </div>
                      {role.description && (
                        <p className="text-sm text-gray-500 mt-1">{role.description}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {role.is_admin ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        <Shield className="w-3 h-3 mr-1" />
                        Admin
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        <Users className="w-3 h-3 mr-1" />
                        Padrão
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-900">
                        {role.users_count || 0} usuário(s)
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {role.is_active ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Ativa
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        Inativa
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <PermissionGate resource="roles" action="edit">
                        <button
                          onClick={() => router.push(`/admin/roles/${role.id}`)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </PermissionGate>

                      {!role.is_system && (
                        <PermissionGate resource="roles" action="delete">
                          <button
                            onClick={() => openDeleteConfirm(role.id, role.name)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Excluir"
                            disabled={(role.users_count ?? 0) > 0}
                          >
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
            <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Nenhuma role encontrada</p>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-medium text-blue-900 mb-2">ℹ️ Sobre Roles</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>Admin:</strong> Acesso completo a todas as funcionalidades</li>
          <li>• <strong>Moderador:</strong> Pode gerenciar conteúdo e aspectos operacionais</li>
          <li>• <strong>Usuário Padrão:</strong> Acesso restrito a funcionalidades específicas</li>
          <li>• <strong>Convidado:</strong> Apenas visualização, sem edição</li>
          <li>• Roles do sistema não podem ser excluídas</li>
          <li>• Roles com usuários atribuídos não podem ser excluídas</li>
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

      <Toast
        visible={!!toast}
        message={toast?.text ?? ''}
        type={toast?.type ?? 'err'}
        onClose={() => setToast(null)}
      />
    </div>
  )
}
