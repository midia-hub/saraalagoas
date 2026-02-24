/**
 * Tipos para o Sistema RBAC (Role-Based Access Control)
 * 
 * Este arquivo define todos os tipos relacionados ao sistema de controle
 * de acesso baseado em funções (roles) da plataforma.
 */

// ============================================================
// TIPOS DE AÇÕES/PERMISSÕES
// ============================================================

/**
 * Ações que podem ser realizadas em um recurso
 */
export type PermissionAction =
  | 'view'     // Visualizar
  | 'create'   // Criar
  | 'edit'     // Editar
  | 'delete'   // Excluir
  | 'manage'   // Gerenciar (todas as ações)

/**
 * Conjunto de permissões para um recurso específico
 */
export type PermissionSet = {
  view: boolean
  create: boolean
  edit: boolean
  delete: boolean
  manage: boolean
}

/**
 * Mapa de permissões por recurso (chave do recurso -> conjunto de permissões)
 */
export type PermissionMap = Record<string, Partial<PermissionSet>>

// ============================================================
// TIPOS DE ENTIDADES DO BANCO
// ============================================================

/**
 * Recurso do sistema (módulo/página)
 */
export interface Resource {
  id: string
  key: string
  name: string
  description: string | null
  category: 'admin' | 'content' | 'social' | 'config' | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

/**
 * Permissão (ação que pode ser realizada)
 */
export interface Permission {
  id: string
  action: PermissionAction
  name: string
  description: string | null
  created_at: string
}

/**
 * Role (tipo de usuário)
 */
export interface Role {
  id: string
  key: string
  name: string
  description: string | null
  is_admin: boolean
  is_system: boolean
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

/**
 * Relacionamento entre Role, Resource e Permission
 */
export interface RolePermission {
  id: string
  role_id: string
  resource_id: string
  permission_id: string
  created_at: string
  updated_at: string
}

// ============================================================
// TIPOS EXPANDIDOS (COM JOINS)
// ============================================================

/**
 * Role com suas permissões expandidas
 */
export interface RoleWithPermissions extends Role {
  permissions?: Array<{
    resource: Resource
    permission: Permission
  }>
}

/**
 * Permissão de usuário (resultado da função get_user_permissions)
 */
export interface UserPermissionRow {
  resource_key: string
  resource_name: string
  permission_action: PermissionAction
  permission_name: string
}

// ============================================================
// TIPOS DE PERFIL DE ACESSO (AccessSnapshot)
// ============================================================

/**
 * Snapshot completo de acesso do usuário
 * Contém todas as informações necessárias para verificar permissões
 */
export interface AccessSnapshot {
  userId: string
  email: string | null
  displayName: string | null

  // Role atual do usuário
  role: Role | null

  // Permissões consolidadas por recurso
  permissions: PermissionMap

  // Flags de acesso rápido
  canAccessAdmin: boolean
  isAdmin: boolean

  // Dados do usuário
  personId?: string | null
  avatarUrl?: string | null
  source?: string // Debug

  // Compatibilidade com sistema legado
  legacyRole?: string | null
  legacyProfile?: {
    id: string
    name: string
    description: string
    isAdmin: boolean
  } | null
}

// ============================================================
// TIPOS PARA APIS E FORMULÁRIOS
// ============================================================

/**
 * Dados para criar/atualizar uma role
 */
export interface RoleFormData {
  key: string
  name: string
  description?: string
  is_admin?: boolean
  sort_order?: number
  is_active?: boolean
  permissions?: Array<{
    resource_id: string
    permission_id: string
  }>
}

/**
 * Dados para atribuir role a um usuário
 */
export interface AssignRoleData {
  user_id: string
  role_id: string
}

/**
 * Dados para verificar permissão
 */
export interface CheckPermissionData {
  user_id: string
  resource_key: string
  permission_action: PermissionAction
}

/**
 * Resposta da verificação de permissão
 */
export interface CheckPermissionResponse {
  has_permission: boolean
  reason?: string // Motivo caso não tenha permissão
}

// ============================================================
// TIPOS DE LISTAGENS
// ============================================================

/**
 * Lista de roles com contagem de usuários
 */
export interface RoleListItem extends Role {
  users_count?: number
}

/**
 * Lista de recursos com contagem de permissões
 */
export interface ResourceListItem extends Resource {
  permissions_count?: number
}

// ============================================================
// CHAVES DE RECURSOS CONHECIDOS
// ============================================================

/**
 * Chaves dos recursos principais do sistema
 */
export const RESOURCE_KEYS = {
  DASHBOARD: 'dashboard',
  CONFIGURACOES: 'configuracoes',
  USUARIOS: 'usuarios',
  ROLES: 'roles',
  GALERIA: 'galeria',
  UPLOAD: 'upload',
  INSTAGRAM: 'instagram',
  FACEBOOK: 'facebook',
  META: 'meta',
  CULTOS: 'cultos',
  RESERVAS: 'reservas',
} as const

/**
 * Chaves das roles padrão do sistema
 */
export const ROLE_KEYS = {
  ADMIN: 'admin',
  MODERADOR: 'moderador',
  USUARIO_PADRAO: 'usuario_padrao',
  CONVIDADO: 'convidado',
} as const

/**
 * Ações de permissão disponíveis
 */
export const PERMISSION_ACTIONS = {
  VIEW: 'view',
  CREATE: 'create',
  EDIT: 'edit',
  DELETE: 'delete',
  MANAGE: 'manage',
} as const

// ============================================================
// FUNÇÕES NOMEADAS (APP PERMISSIONS)
// ============================================================

/**
 * Função nomeada (permissão por código) – armazenada em app_permissions
 */
export interface AppPermission {
  id: string
  code: string
  name: string
  description: string | null
  resource_id: string
  permission_id: string
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

/**
 * Códigos das funções nomeadas disponíveis no sistema.
 * Cada código mapeia para um (recurso + ação) no RBAC.
 * Novas funcionalidades: adicione aqui e na tabela app_permissions.
 */
export const APP_PERMISSION_CODES = {
    // Reservas de Salas
    VIEW_RESERVAS: 'view_reservas',
    CREATE_RESERVAS: 'create_reservas',
    EDIT_RESERVAS: 'edit_reservas',
    DELETE_RESERVAS: 'delete_reservas',
    MANAGE_RESERVAS: 'manage_reservas',
  VIEW_DASHBOARD: 'view_dashboard',
  VIEW_GALLERY: 'view_gallery',
  CREATE_GALLERY: 'create_gallery',
  EDIT_GALLERY: 'edit_gallery',
  DELETE_GALLERY: 'delete_gallery',
  CREATE_POST: 'create_post',
  EDIT_POST: 'edit_post',
  DELETE_POST: 'delete_post',
  VIEW_INSTAGRAM: 'view_instagram',
  MANAGE_USERS: 'manage_users',
  VIEW_USERS: 'view_users',
  MANAGE_SETTINGS: 'manage_settings',
  VIEW_SETTINGS: 'view_settings',
  MANAGE_ROLES: 'manage_roles',
  VIEW_ROLES: 'view_roles',
  UPLOAD_FILES: 'upload_files',
  VIEW_META: 'view_meta',
  VIEW_CULTOS: 'view_cultos',
  MANAGE_CULTOS: 'manage_cultos',
  CELLS_APPROVE_EDIT: 'cells_approve_edit',
  CELLS_APPROVE_PD: 'cells_approve_pd',
  CELLS_MANAGE: 'cells_manage',
  VALIDAR_PAGAMENTO_REVISAO: 'validar_pagamento_revisao',
} as const

export type AppPermissionCode = (typeof APP_PERMISSION_CODES)[keyof typeof APP_PERMISSION_CODES]

// ============================================================
// TIPOS PARA CONTEXTO REACT
// ============================================================

/**
 * Contexto de acesso do usuário (para React Context)
 */
export interface AccessContextValue {
  snapshot: AccessSnapshot | null
  loading: boolean
  error: Error | null

  // Métodos auxiliares
  hasPermission: (resourceKey: string, action: PermissionAction) => boolean
  canView: (resourceKey: string) => boolean
  canCreate: (resourceKey: string) => boolean
  canEdit: (resourceKey: string) => boolean
  canDelete: (resourceKey: string) => boolean
  canManage: (resourceKey: string) => boolean

  // Refresh
  refresh: () => Promise<void>
}
