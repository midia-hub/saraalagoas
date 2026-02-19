'use client'

import { useEffect, useState } from 'react'
import { Save, Shield, AlertCircle, Loader2 } from 'lucide-react'
import { useRouter, useParams } from 'next/navigation'
import { useRBAC } from '@/lib/hooks/useRBAC'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { AdminPageHeader } from '@/app/admin/AdminPageHeader'
import { adminFetchJson } from '@/lib/admin-client'
import { Toast } from '@/components/Toast'
import type { Role, Resource, Permission } from '@/lib/rbac-types'
import { menuModules } from '../../menu-config'

interface RoleWithPermissions extends Role {
  role_permissions?: Array<{
    id: string
    resource_id: string
    permission_id: string
    resources: Resource
    permissions: Permission
  }>
}

interface PermissionSelection {
  [resourceId: string]: {
    [permissionId: string]: boolean
  }
}

export default function EditRolePage() {
  const router = useRouter()
  const params = useParams()
  const { canEdit } = useRBAC()
  const roleId = params?.id as string
  const isNew = roleId === 'new'

  const [role, setRole] = useState<RoleWithPermissions | null>(null)
  const [resources, setResources] = useState<Resource[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  // Estado do formulário (inclui key para nova role)
  const [formData, setFormData] = useState({
    key: '',
    name: '',
    description: '',
    is_admin: false,
    is_active: true,
    sort_order: 0,
  })

  // Estado das permissões selecionadas
  const [selectedPermissions, setSelectedPermissions] = useState<PermissionSelection>({})

  useEffect(() => {
    if (roleId) {
      loadData()
    }
  }, [roleId])

  async function loadData() {
    try {
      setLoading(true)
      setError(null)

      // Buscar recursos e permissões (sempre)
      const [resourcesData, permissionsData] = await Promise.all([
        adminFetchJson<{ resources: Resource[] }>('/api/admin/resources'),
        adminFetchJson<{ permissions: Permission[] }>('/api/admin/permissions'),
      ])
      setResources(resourcesData.resources || [])
      setPermissions(permissionsData.permissions || [])

      if (isNew) {
        setRole(null)
        setFormData((prev) => ({ ...prev, sort_order: 999 }))
        setSelectedPermissions({})
      } else {
        // Buscar role existente
        const roleData = await adminFetchJson<{ role: RoleWithPermissions }>(
          `/api/admin/roles/${roleId}`
        )
        const fetchedRole = roleData.role
        setRole(fetchedRole)
        setFormData({
          key: fetchedRole.key || '',
          name: fetchedRole.name,
          description: fetchedRole.description || '',
          is_admin: fetchedRole.is_admin,
          is_active: fetchedRole.is_active,
          sort_order: fetchedRole.sort_order,
        })
        const permissionsMap: PermissionSelection = {}
        for (const rp of fetchedRole.role_permissions || []) {
          if (!permissionsMap[rp.resource_id]) {
            permissionsMap[rp.resource_id] = {}
          }
          permissionsMap[rp.resource_id][rp.permission_id] = true
        }
        setSelectedPermissions(permissionsMap)
      }
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
      setError('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  function togglePermission(resourceId: string, permissionId: string) {
    setSelectedPermissions((prev) => {
      const prevResource = prev[resourceId] || {}
      const newResource = { ...prevResource, [permissionId]: !prevResource[permissionId] }
      return { ...prev, [resourceId]: newResource }
    })
  }

  function buildPermissionsArray(): Array<{ resource_id: string; permission_id: string }> {
    const arr: Array<{ resource_id: string; permission_id: string }> = []
    for (const resourceId in selectedPermissions) {
      for (const permissionId in selectedPermissions[resourceId]) {
        if (selectedPermissions[resourceId][permissionId]) {
          arr.push({ resource_id: resourceId, permission_id: permissionId })
        }
      }
    }
    return arr
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    try {
      setSaving(true)
      setError(null)

      const permissionsArray = buildPermissionsArray()

      if (isNew) {
        const key = formData.key.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
        if (!key) {
          setError('Informe uma chave para a função (ex: editor_conteudo).')
          setSaving(false)
          return
        }
        const { role: newRole } = await adminFetchJson<{ role: { id: string } }>('/api/admin/roles', {
          method: 'POST',
          body: JSON.stringify({
            key,
            name: formData.name.trim(),
            description: formData.description.trim() || undefined,
            is_admin: formData.is_admin,
            is_active: formData.is_active,
            sort_order: formData.sort_order,
            permissions: permissionsArray,
          }),
        })
        setToast({ type: 'ok', text: 'Função criada com sucesso!' })
        setTimeout(() => router.push('/admin/roles'), 800)
      } else {
        if (!role) return
        await adminFetchJson(`/api/admin/roles/${roleId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            name: formData.name,
            description: formData.description,
            is_admin: formData.is_admin,
            is_active: formData.is_active,
            sort_order: formData.sort_order,
            permissions: permissionsArray,
          }),
        })
        setToast({ type: 'ok', text: 'Função atualizada com sucesso!' })
        setTimeout(() => router.push('/admin/roles'), 800)
      }
    } catch (err: unknown) {
      setToast({ type: 'err', text: err instanceof Error ? err.message : 'Erro ao salvar.' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <PageAccessGuard pageKey="roles">
        <div className="p-6 md:p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-200 rounded w-1/4" />
            <div className="h-96 bg-slate-200 rounded" />
          </div>
        </div>
      </PageAccessGuard>
    )
  }

  if (!isNew && !role) {
    return (
      <PageAccessGuard pageKey="roles">
        <div className="p-6 md:p-8">
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-slate-600">Função não encontrada</p>
          </div>
        </div>
      </PageAccessGuard>
    )
  }

  const canEditRole = isNew || !role?.is_system || canEdit('roles')

  return (
    <PageAccessGuard pageKey="roles">
      <div className="p-6 md:p-8">
        <AdminPageHeader
          icon={Shield}
          title={isNew ? 'Nova função' : `Editar: ${role?.name}`}
          subtitle="Informações e permissões da função."
          backLink={{ href: '/admin/roles', label: 'Voltar às funções' }}
        />

        {!isNew && role?.is_system && (
          <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-sm text-amber-800">Esta é uma função do sistema. Apenas ordem e status podem ser alterados.</p>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-800 font-medium">Erro</p>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Informações básicas</h2>

            <div className="space-y-4">
              {isNew && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Chave da função * (ex: editor_conteudo)</label>
                  <input
                    type="text"
                    value={formData.key}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        key: e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
                      })
                    }
                    placeholder="editor_conteudo"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#c62737] focus:border-[#c62737]"
                    required
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome da função *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={!isNew && role?.is_system}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#c62737] focus:border-[#c62737] disabled:bg-slate-100"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  disabled={!isNew && role?.is_system}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#c62737] focus:border-[#c62737] disabled:bg-slate-100"
                />
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_admin}
                    onChange={(e) => setFormData({ ...formData, is_admin: e.target.checked })}
                    disabled={!isNew && !!role?.is_system}
                    className="w-4 h-4 text-[#c62737] border-slate-300 rounded focus:ring-[#c62737] disabled:bg-slate-100"
                  />
                  <span className="text-sm font-medium text-slate-700">Função de administrador (acesso total)</span>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Ordem</label>
                  <input
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) =>
                      setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#c62737] focus:border-[#c62737]"
                  />
                </div>

                <div className="flex items-end">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="w-4 h-4 text-[#c62737] border-slate-300 rounded focus:ring-[#c62737]"
                    />
                    <span className="text-sm font-medium text-slate-700">Função ativa</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {!formData.is_admin && (isNew || !role?.is_system) && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-slate-800 px-1">Permissões por Módulo</h2>

              {menuModules.filter(m => m.id !== 'dashboard').map((module) => {
                // Pegar recursos que pertencem a este módulo
                const moduleResources = resources.filter(res =>
                  res.key === module.permission ||
                  module.items.some(item => item.permission === res.key)
                )

                if (moduleResources.length === 0) return null

                return (
                  <div key={module.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center gap-3">
                      <div className="p-2 bg-white rounded-lg shadow-sm">
                        <module.icon size={20} className="text-red-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800">{module.title}</h3>
                        <p className="text-xs text-slate-500">Gerenciar acessos deste módulo</p>
                      </div>
                    </div>

                    <div className="p-6 space-y-6">
                      {moduleResources.map((resource) => (
                        <div key={resource.id} className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-semibold text-slate-700">{resource.name}</h4>
                              {resource.description && <p className="text-xs text-slate-500">{resource.description}</p>}
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  const managePerm = permissions.find(p => p.action === 'manage')
                                  if (managePerm) togglePermission(resource.id, managePerm.id)
                                }}
                                className={`text-[10px] font-bold px-2 py-1 rounded border transition-colors ${permissions.find(p => p.action === 'manage') && selectedPermissions[resource.id]?.[permissions.find(p => p.action === 'manage')!.id]
                                  ? 'bg-red-600 border-red-600 text-white'
                                  : 'bg-white border-slate-200 text-slate-400 hover:border-red-600 hover:text-red-600'
                                  }`}
                              >
                                ACESSO TOTAL
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                            {permissions.map((permission) => (
                              <label
                                key={permission.id}
                                className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all cursor-pointer ${selectedPermissions[resource.id]?.[permission.id]
                                  ? 'bg-red-50 border-red-200 text-red-700 shadow-sm'
                                  : 'bg-slate-50 border-transparent text-slate-500 hover:bg-slate-100'
                                  }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedPermissions[resource.id]?.[permission.id] || false}
                                  onChange={() => togglePermission(resource.id, permission.id)}
                                  className="w-4 h-4 text-red-600 border-slate-300 rounded focus:ring-red-600"
                                />
                                <span className="text-xs font-bold uppercase tracking-wider">{permission.name}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}

              {/* Recursos órfãos (que não estão em nenhum módulo definido) */}
              {resources.filter(res =>
                res.key !== 'dashboard' &&
                !menuModules.some(m =>
                  res.key === m.permission ||
                  m.items.some(item => item.permission === res.key)
                )
              ).length > 0 && (
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                      <h3 className="font-bold text-slate-800">Outros Recursos</h3>
                    </div>
                    <div className="p-6 space-y-6">
                      {resources.filter(res =>
                        res.key !== 'dashboard' &&
                        !menuModules.some(m =>
                          res.key === m.permission ||
                          m.items.some(item => item.permission === res.key)
                        )
                      ).map((resource) => (
                        <div key={resource.id} className="space-y-3">
                          <h4 className="font-semibold text-slate-700">{resource.name}</h4>
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                            {permissions.map((permission) => (
                              <label key={permission.id} className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl hover:bg-slate-100 cursor-pointer border border-transparent transition-all">
                                <input
                                  type="checkbox"
                                  checked={selectedPermissions[resource.id]?.[permission.id] || false}
                                  onChange={() => togglePermission(resource.id, permission.id)}
                                  className="w-4 h-4 text-red-600 border-slate-300 rounded focus:ring-red-600"
                                />
                                <span className="text-xs font-bold uppercase tracking-wider">{permission.name}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          )}

          {formData.is_admin && (isNew || !role?.is_system) && (
            <div className="bg-[#c62737]/5 border border-[#c62737]/20 rounded-xl p-4">
              <p className="text-sm text-slate-700">Funções de administrador têm acesso completo a todos os recursos automaticamente.</p>
            </div>
          )}

          <div className="flex items-center justify-end gap-3">
            <button type="button" onClick={() => router.back()} className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !canEditRole}
              className="flex items-center gap-2 px-4 py-2 bg-[#c62737] text-white rounded-lg hover:bg-[#a61f2e] transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Salvando...' : isNew ? 'Criar função' : 'Salvar alterações'}
            </button>
          </div>
        </form>

        <Toast visible={!!toast} message={toast?.text ?? ''} type={toast?.type ?? 'err'} onClose={() => setToast(null)} />
      </div>
    </PageAccessGuard>
  )
}
