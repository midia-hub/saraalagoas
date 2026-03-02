'use client'

import React, { useState, useMemo } from 'react'
import { 
  ChevronRight, 
  ChevronDown, 
  Shield, 
  Settings, 
  LayoutDashboard, 
  Users, 
  Zap, 
  Eye, 
  Pencil, 
  PlusCircle, 
  Trash2,
  Check,
  X,
  Minus,
  LayoutGrid,
  UsersRound,
  CalendarDays,
  Heart,
  BookOpen,
  ImageIcon,
  UserCircle,
  Baby
} from 'lucide-react'
import type { Resource, Permission } from '@/lib/rbac-types'
import { menuModules } from '../menu-config'

// Mapeamento de ícones por chave de recurso (opcional)
const MODULE_ICONS: Record<string, any> = {
  dashboard: LayoutDashboard,
  reservas: LayoutGrid,
  lideranca: UsersRound,
  escalas: CalendarDays,
  celulas: UsersRound,
  consolidacao: Users,
  'revisao-vidas': Heart,
  livraria: BookOpen,
  midia: ImageIcon,
  cadastros: UserCircle,
  'sara-kids': Baby,
  configuracoes: Settings,
}

interface PageNode {
  id: string
  key: string
  name: string
  description?: string | null
  children: PageNode[]
  isModule?: boolean
}

interface PermissionTreeProps {
  resources: Resource[]
  permissions: Permission[]
  selectedPermissions: { [resourceId: string]: { [permissionId: string]: boolean } }
  onChange: (resourceId: string, permissionId: string, value: boolean) => void
  onToggleModule?: (resourceIds: string[], permissionId: string, value: boolean) => void
  readOnly?: boolean
}

export function PermissionTree({
  resources,
  permissions,
  selectedPermissions,
  onChange,
  onToggleModule,
  readOnly = false
}: PermissionTreeProps) {
  const [expandedNodes, setExpandedNodes] = useState<string[]>([])

  // Constrói a árvore baseada no menu-config.ts
  const treeData = useMemo(() => {
    const nodes: PageNode[] = []
    const processedResourceIds = new Set<string>()

    // Iterar pelos módulos do menu
    menuModules.forEach(module => {
      const children: PageNode[] = []

      // Coletar recursos únicos para este módulo baseado nas permissões dos itens
      module.items.forEach(item => {
        const itemPerms = Array.isArray(item.permission) ? item.permission : [item.permission]
        
        resources.forEach(res => {
          if (itemPerms.includes(res.key) && !processedResourceIds.has(res.id)) {
            processedResourceIds.add(res.id)
            children.push({
              id: res.id,
              key: res.key,
              name: res.name,
              description: res.description,
              children: [],
              isModule: false
            })
          }
        })
      })

      if (children.length > 0 || module.id === 'dashboard') {
        // Fallback para dashboard se vazio
        if (module.id === 'dashboard' && children.length === 0) {
            const dashRes = resources.find(r => r.key === 'dashboard')
            if (dashRes) {
                processedResourceIds.add(dashRes.id)
                children.push({
                    id: dashRes.id,
                    key: dashRes.key,
                    name: dashRes.name,
                    description: dashRes.description,
                    children: [],
                    isModule: false
                })
            }
        }

        nodes.push({
          id: `mod-${module.id}`,
          key: module.id,
          name: module.title,
          children: children.sort((a, b) => a.name.localeCompare(b.name)),
          isModule: true
        })
      }
    })

    // Adicionar recursos "órfãos" que não estão no menu
    const orphanResources = resources.filter(res => !processedResourceIds.has(res.id))
    if (orphanResources.length > 0) {
      nodes.push({
        id: 'mod-outros',
        key: 'outros',
        name: 'Outros Recursos',
        children: orphanResources.map(res => ({
          id: res.id,
          key: res.key,
          name: res.name,
          description: res.description,
          children: [],
          isModule: false
        })),
        isModule: true
      })
    }

    return nodes
  }, [resources])

  const toggleExpand = (nodeId: string) => {
    setExpandedNodes(prev => 
      prev.includes(nodeId) ? prev.filter(id => id !== nodeId) : [...prev, nodeId]
    )
  }

  const isSelected = (resourceId: string, permissionId: string) => {
    return !!selectedPermissions[resourceId]?.[permissionId]
  }

  // Verifica estado do módulo (toda categoria)
  const getModuleState = (node: PageNode, permissionId: string) => {
    if (!node.children.length) return 'none'
    const childrenIds = node.children.map(c => c.id)
    const selectedCount = childrenIds.filter(id => isSelected(id, permissionId)).length
    
    if (selectedCount === 0) return 'none'
    if (selectedCount === childrenIds.length) return 'all'
    return 'partial'
  }

  const handleModuleToggle = (node: PageNode, permissionId: string) => {
    if (readOnly || !onToggleModule) return
    const state = getModuleState(node, permissionId)
    const newValue = state !== 'all'
    const childrenIds = node.children.map(c => c.id)
    onToggleModule(childrenIds, permissionId, newValue)
  }

  const renderNode = (node: PageNode, level = 0) => {
    const isExpanded = expandedNodes.includes(node.id) || node.key === 'dashboard'
    const Icon = MODULE_ICONS[node.key] || (node.isModule ? Shield : null)

    return (
      <div key={node.id} className="select-none">
        <div 
          className={`group flex items-center py-2.5 px-3 hover:bg-slate-50 rounded-xl transition-colors border-b border-transparent ${
            node.isModule ? 'font-bold text-slate-800 bg-slate-100/40 mb-1 mt-3' : 'text-slate-600 ml-4 py-3'
          }`}
        >
          {/* Expander */}
          <div className="w-6 h-6 flex items-center justify-center mr-1">
            {node.children.length > 0 && (
              <button 
                onClick={() => toggleExpand(node.id)}
                className="p-1 hover:bg-slate-200 rounded-md transition-colors"
                type="button"
              >
                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
            )}
          </div>

          {/* Icon & Name */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {Icon && <Icon size={16} className={node.isModule ? 'text-[#c62737]' : 'text-slate-400'} />}
            <span className="truncate text-sm">{node.name}</span>
            {node.description && !node.isModule && (
              <span className="hidden md:inline text-[10px] text-slate-400 font-normal truncate max-w-[200px]">
                • {node.description}
              </span>
            )}
          </div>

          {/* Permissions Grid */}
          <div className="flex items-center gap-1 md:gap-4 ml-4">
            {permissions.map(perm => {
              if (node.isModule) {
                const state = getModuleState(node, perm.id)
                return (
                  <button
                    key={perm.id}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleModuleToggle(node, perm.id)
                    }}
                    type="button"
                    disabled={readOnly}
                    title={`${perm.name} em todo o módulo ${node.name}`}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all border-2 ${
                      state === 'all' 
                        ? 'bg-[#c62737] border-[#c62737] text-white' 
                        : state === 'partial'
                        ? 'bg-[#c62737]/10 border-[#c62737] text-[#c62737]'
                        : 'bg-white border-slate-200 text-transparent hover:border-slate-300'
                    } disabled:opacity-50`}
                  >
                    {state === 'all' && <Check size={14} strokeWidth={3} />}
                    {state === 'partial' && <Minus size={14} strokeWidth={3} />}
                  </button>
                )
              }

              const active = isSelected(node.id, perm.id)
              return (
                <button
                  key={perm.id}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    if (!readOnly) onChange(node.id, perm.id, !active)
                  }}
                  type="button"
                  disabled={readOnly}
                  title={`${perm.name} em ${node.name}`}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all border-2 ${
                    active 
                      ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm' 
                      : 'bg-white border-slate-200 text-transparent hover:border-slate-300'
                  } disabled:opacity-50`}
                >
                  {active && <Check size={14} strokeWidth={3} />}
                </button>
              )
            })}
          </div>
        </div>

        {/* Children */}
        {isExpanded && node.children.length > 0 && (
          <div className="ml-6 border-l-2 border-slate-100 pl-2">
            {node.children.map(child => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      {/* Header da Tabela/Árvore */}
      <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-slate-400" />
          <h3 className="font-bold text-slate-700">Matriz de Acessos</h3>
        </div>
        
        <div className="flex items-center gap-1 md:gap-4 overflow-x-auto pb-1">
          {permissions.map(perm => (
            <div key={perm.id} className="flex flex-col items-center min-w-[32px]">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                {perm.name.substring(0, 3)}
              </span>
              <div className="w-8 h-8 flex items-center justify-center text-slate-400" title={perm.name}>
                {perm.action === 'view' && <Eye size={16} />}
                {perm.action === 'create' && <PlusCircle size={16} />}
                {perm.action === 'edit' && <Pencil size={16} />}
                {perm.action === 'delete' && <Trash2 size={16} />}
                {perm.action === 'manage' && <Zap size={16} />}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-1 max-h-[600px] overflow-y-auto custom-scrollbar">
        {treeData.map(node => renderNode(node))}
      </div>

      <div className="bg-slate-50 border-t border-slate-200 p-4 flex flex-wrap gap-4 text-[11px] text-slate-500 font-medium justify-center items-center">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-emerald-500" /> Ativo
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded border border-slate-300 bg-white" /> Inativo
        </div>
        <div className="flex items-center gap-1.5 font-bold text-slate-400">
          V: Ver | C: Criar | E: Editar | X: Excluir | G: Gerenciar (Tudo)
        </div>
      </div>
    </div>
  )
}
