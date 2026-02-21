'use client'

import { useEffect, useState } from 'react'
import { Save, Shield, AlertCircle, Loader2, Eye, Pencil, PlusCircle, Trash2, Zap } from 'lucide-react'
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

  // Colors for each permission action
  function actionStyle(action: string): { pill: string; icon: JSX.Element | null } {
    switch (action) {
      case 'view':    return { pill: 'bg-sky-50 border-sky-200 text-sky-700',     icon: <Eye className="w-3 h-3" /> }
      case 'edit':    return { pill: 'bg-amber-50 border-amber-200 text-amber-700',  icon: <Pencil className="w-3 h-3" /> }
      case 'create':  return { pill: 'bg-emerald-50 border-emerald-200 text-emerald-700', icon: <PlusCircle className="w-3 h-3" /> }
      case 'delete':  return { pill: 'bg-rose-50 border-rose-200 text-rose-700',    icon: <Trash2 className="w-3 h-3" /> }
      case 'manage':  return { pill: 'bg-violet-50 border-violet-200 text-violet-700', icon: <Zap className="w-3 h-3" /> }
      default:        return { pill: 'bg-slate-50 border-slate-200 text-slate-600',  icon: null }
    }
  }

  if (loading) {
    return (
      <PageAccessGuard pageKey="roles">
        <div className="p-6 md:p-8 space-y-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-200 rounded w-1/3" />
            <div className="h-48 bg-slate-200 rounded-2xl" />
            <div className="h-72 bg-slate-200 rounded-2xl" />
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

        <form id="role-form" onSubmit={handleSubmit} className="space-y-6">
          {/* Basic info card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-base font-bold text-slate-800 mb-5 flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#c62737]" /> Informações básicas
            </h2>

            <div className="space-y-5">
              {isNew && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Chave da função <span className="text-red-500">*</span>
                    <span className="ml-1 text-xs font-normal text-slate-400">(ex: editor_conteudo)</span>
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
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#c62737] focus:border-[#c62737] text-sm font-mono bg-slate-50"
                    required
                  />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Nome da função <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    disabled={!isNew && role?.is_system}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#c62737] focus:border-[#c62737] text-sm disabled:bg-slate-100 disabled:text-slate-400"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Ordem</label>
                  <input
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) =>
                      setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#c62737] focus:border-[#c62737] text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Descrição</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  disabled={!isNew && role?.is_system}
                  rows={2}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#c62737] focus:border-[#c62737] text-sm disabled:bg-slate-100 disabled:text-slate-400 resize-none"
                />
              </div>

              {/* Toggles row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <label
                  className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    formData.is_admin
                      ? 'border-[#c62737] bg-[#c62737]/5'
                      : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                  } ${(!isNew && !!role?.is_system) ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Acesso total (Admin)</p>
                    <p className="text-xs text-slate-500 mt-0.5">Acessa todos os recursos automaticamente</p>
                  </div>
                  <div className="relative ml-4 flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={formData.is_admin}
                      onChange={(e) => setFormData({ ...formData, is_admin: e.target.checked })}
                      disabled={!isNew && !!role?.is_system}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:bg-[#c62737] after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:border-slate-300 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full peer-checked:after:border-white" />
                  </div>
                </label>

                <label
                  className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    formData.is_active
                      ? 'border-emerald-400 bg-emerald-50'
                      : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Função ativa</p>
                    <p className="text-xs text-slate-500 mt-0.5">Usuários com esta função têm acesso ao sistema</p>
                  </div>
                  <div className="relative ml-4 flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:bg-emerald-500 after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:border-slate-300 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full peer-checked:after:border-white" />
                  </div>
                </label>
              </div>
            </div>
          </div>

          {!formData.is_admin && (isNew || !role?.is_system) && (
            <div className="space-y-4">
              <h2 className="text-base font-bold text-slate-800 px-1 flex items-center gap-2">
                <Zap className="w-4 h-4 text-violet-500" /> Permissões por Módulo
              </h2>

              {menuModules.filter(m => m.id !== 'dashboard').map((module) => {
                const moduleResources = resources.filter(res =>
                  res.key === module.permission ||
                  module.items.some(item => item.permission === res.key)
                )
                if (moduleResources.length === 0) return null

                // Count selected permissions for this module
                const totalPossible = moduleResources.length * permissions.length
                const totalSelected = moduleResources.reduce((acc, res) => {
                  return acc + permissions.filter(p => selectedPermissions[res.id]?.[p.id]).length
                }, 0)

                return (
                  <div key={module.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="bg-slate-50 px-5 py-3.5 border-b border-slate-200 flex items-center gap-3">
                      <div className="p-2 bg-white rounded-xl shadow-sm">
                        <module.icon size={18} className="text-[#c62737]" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-slate-800 text-sm">{module.title}</h3>
                      </div>
                      {totalSelected > 0 && (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#c62737]/10 text-[#c62737]">
                          {totalSelected}/{totalPossible}
                        </span>
                      )}
                    </div>

                    <div className="p-5 space-y-5">
                      {moduleResources.map((resource) => (
                        <div key={resource.id} className="space-y-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <h4 className="text-sm font-semibold text-slate-700">{resource.name}</h4>
                              {resource.description && (
                                <p className="text-xs text-slate-400">{resource.description}</p>
                              )}
                            </div>
                            {/* Select all for resource */}
                            <button
                              type="button"
                              onClick={() => {
                                const allSelected = permissions.every(p => selectedPermissions[resource.id]?.[p.id])
                                if (allSelected) {
                                  // deselect all
                                  setSelectedPermissions(prev => ({ ...prev, [resource.id]: {} }))
                                } else {
                                  // select all
                                  const all: Record<string, boolean> = {}
                                  permissions.forEach(p => { all[p.id] = true })
                                  setSelectedPermissions(prev => ({ ...prev, [resource.id]: all }))
                                }
                              }}
                              className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-colors flex-shrink-0 ${
                                permissions.every(p => selectedPermissions[resource.id]?.[p.id])
                                  ? 'bg-violet-600 border-violet-600 text-white'
                                  : 'bg-white border-slate-200 text-slate-400 hover:border-violet-400 hover:text-violet-600'
                              }`}
                            >
                              TUDO
                            </button>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {permissions.map((permission) => {
                              const checked = selectedPermissions[resource.id]?.[permission.id] || false
                              const style = actionStyle(permission.action)
                              return (
                                <label
                                  key={permission.id}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all cursor-pointer select-none ${
                                    checked
                                      ? style.pill + ' shadow-sm'
                                      : 'bg-slate-50 border-transparent text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => togglePermission(resource.id, permission.id)}
                                    className="sr-only"
                                  />
                                  {checked && style.icon}
                                  <span className="text-[11px] font-bold uppercase tracking-wider">{permission.name}</span>
                                </label>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}

              {/* Orphan resources */}
              {resources.filter(res =>
                res.key !== 'dashboard' &&
                !menuModules.some(m =>
                  res.key === m.permission ||
                  m.items.some(item => item.permission === res.key)
                )
              ).length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="bg-slate-50 px-5 py-3.5 border-b border-slate-200">
                    <h3 className="font-bold text-slate-800 text-sm">Outros Recursos</h3>
                  </div>
                  <div className="p-5 space-y-5">
                    {resources.filter(res =>
                      res.key !== 'dashboard' &&
                      !menuModules.some(m =>
                        res.key === m.permission ||
                        m.items.some(item => item.permission === res.key)
                      )
                    ).map((resource) => (
                      <div key={resource.id} className="space-y-2.5">
                        <h4 className="text-sm font-semibold text-slate-700">{resource.name}</h4>
                        <div className="flex flex-wrap gap-2">
                          {permissions.map((permission) => {
                            const checked = selectedPermissions[resource.id]?.[permission.id] || false
                            const style = actionStyle(permission.action)
                            return (
                              <label
                                key={permission.id}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all cursor-pointer select-none ${
                                  checked
                                    ? style.pill + ' shadow-sm'
                                    : 'bg-slate-50 border-transparent text-slate-400 hover:bg-slate-100'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => togglePermission(resource.id, permission.id)}
                                  className="sr-only"
                                />
                                {checked && style.icon}
                                <span className="text-[11px] font-bold uppercase tracking-wider">{permission.name}</span>
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {formData.is_admin && (isNew || !role?.is_system) && (
            <div className="bg-[#c62737]/5 border border-[#c62737]/20 rounded-2xl p-5 flex items-start gap-3">
              <Shield className="w-5 h-5 text-[#c62737] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-slate-800">Acesso administrativo completo</p>
                <p className="text-sm text-slate-600 mt-0.5">Funções de administrador têm acesso automático a todos os recursos e permissões da plataforma.</p>
              </div>
            </div>
          )}

          {/* Legend */}
          {!formData.is_admin && (
            <div className="flex flex-wrap items-center gap-3 px-1">
              <span className="text-xs text-slate-400 font-medium">Legenda:</span>
              {[['view','Visualizar'],['edit','Editar'],['create','Criar'],['delete','Excluir'],['manage','Gerenciar']].map(([action, label]) => {
                const style = actionStyle(action)
                return (
                  <span key={action} className={`flex items-center gap-1 px-2.5 py-1 rounded-xl border text-[11px] font-bold uppercase tracking-wider ${style.pill}`}>
                    {style.icon}{label}
                  </span>
                )
              })}
            </div>
          )}

          {/* Spacer for sticky bar */}
          <div className="h-4" />
        </form>

        {/* Sticky action bar */}
        <div className="sticky bottom-0 -mx-6 md:-mx-8 px-6 md:px-8 py-4 bg-white border-t border-slate-200 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-5 py-2.5 border border-slate-300 rounded-xl hover:bg-slate-50 transition text-sm font-medium text-slate-700"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="role-form"
            disabled={saving || !canEditRole}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#c62737] text-white rounded-xl hover:bg-[#a61f2e] transition text-sm font-semibold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Salvando...' : isNew ? 'Criar função' : 'Salvar alterações'}
          </button>
        </div>

        <Toast visible={!!toast} message={toast?.text ?? ''} type={toast?.type ?? 'err'} onClose={() => setToast(null)} />
      </div>
    </PageAccessGuard>
  )
}
