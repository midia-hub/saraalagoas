'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, Save, Shield, AlertCircle } from 'lucide-react'
import { useRouter, useParams } from 'next/navigation'
import { useRBAC } from '@/lib/hooks/useRBAC'
import { adminFetchJson } from '@/lib/admin-client'
import { Toast } from '@/components/Toast'
import type { Role, Resource, Permission } from '@/lib/rbac-types'

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
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!isNew && !role) {
    return (
      <div className="p-8">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Role não encontrada</p>
        </div>
      </div>
    )
  }

  const canEditRole = isNew || !role?.is_system || canEdit('roles')

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          Voltar
        </button>

        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Shield className="w-8 h-8 text-blue-600" />
          {isNew ? 'Nova função' : `Editar: ${role?.name}`}
        </h1>

        {!isNew && role?.is_system && (
          <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              ⚠️ Esta é uma role do sistema. Apenas ordem e status podem ser alterados.
            </p>
          </div>
        )}
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

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Informações Básicas */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Informações Básicas</h2>

          <div className="space-y-4">
            {isNew && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Chave da função * (ex: editor_conteudo)
                </label>
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome da função *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={!isNew && role?.is_system}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                disabled={!isNew && role?.is_system}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
              />
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_admin}
                  onChange={(e) => setFormData({ ...formData, is_admin: e.target.checked })}
                  disabled={!isNew && !!role?.is_system}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:bg-gray-100"
                />
                <span className="text-sm font-medium text-gray-700">
                  Role de Administrador (acesso total)
                </span>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ordem</label>
                <input
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) =>
                    setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex items-end">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Role Ativa</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Permissões */}
        {!formData.is_admin && (isNew || !role?.is_system) && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Permissões</h2>

            <div className="space-y-4">
              {resources.map((resource) => (
                <div key={resource.id} className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3">{resource.name}</h3>
                  {resource.description && (
                    <p className="text-sm text-gray-500 mb-3">{resource.description}</p>
                  )}

                  <div className="flex flex-wrap gap-3">
                    {permissions.map((permission) => (
                      <label
                        key={permission.id}
                        className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={
                            selectedPermissions[resource.id]?.[permission.id] || false
                          }
                          onChange={() => togglePermission(resource.id, permission.id)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-700">
                          {permission.name}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {formData.is_admin && (isNew || !role?.is_system) && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <p className="text-sm text-purple-800">
              ℹ️ Roles de administrador têm acesso completo a todos os recursos
              automaticamente.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={saving || !canEditRole}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-5 h-5" />
            {saving ? 'Salvando...' : isNew ? 'Criar função' : 'Salvar alterações'}
          </button>
        </div>
      </form>

      <Toast
        visible={!!toast}
        message={toast?.text ?? ''}
        type={toast?.type ?? 'err'}
        onClose={() => setToast(null)}
      />
    </div>
  )
}
