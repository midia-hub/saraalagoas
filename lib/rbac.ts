import { createClient } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import type {
  AccessSnapshot,
  PermissionAction,
  PermissionMap,
  PermissionSet,
  Role,
  UserPermissionRow,
} from '@/lib/rbac-types'
import { type AppPermissionCode, APP_PERMISSION_CODES } from '@/lib/rbac-types'

export type { AccessSnapshot, PermissionAction, PermissionMap, PermissionSet } from '@/lib/rbac-types'

// ============================================================
// TIPOS INTERNOS (para o sistema legado e transição)
// ============================================================

type AccessProfile = {
  id: string
  name: string
  description: string
  isAdmin: boolean
}

type PermissionRow = {
  page_key: string
  can_view: boolean
  can_create: boolean
  can_edit: boolean
  can_delete: boolean
}

type ProfileRow = {
  role?: string | null
  email?: string | null
  access_profile_id?: string | null
  role_id?: string | null
  roles?: Role | Role[] | null
  access_profiles?:
    | {
        id: string
        name: string
        description: string | null
        is_admin: boolean
        access_profile_permissions?: PermissionRow[] | null
      }
    | {
        id: string
        name: string
        description: string | null
        is_admin: boolean
        access_profile_permissions?: PermissionRow[] | null
      }[]
    | null
}

const ADMIN_PAGE_KEYS = [
  'dashboard',
  'configuracoes',
  'upload',
  'galeria',
  'usuarios',
  'perfis',
  'roles',
  'pessoas',
  'consolidacao',
  'livraria_produtos',
  'livraria_estoque',
  'livraria_movimentacoes',
  'livraria_importacao',
  'livraria_dashboard',
  'livraria_pdv',
  'livraria_vendas',
  'livraria_reservas',
  'livraria_clientes',
  'livraria_fiado',
  'livraria_cupons',
  'instagram',
  'facebook',
  'meta',
  'cultos',
]

const LEGACY_ADMIN_PERMISSIONS: PermissionMap = {
  dashboard: { view: true, create: true, edit: true, delete: true, manage: true },
  configuracoes: { view: true, create: true, edit: true, delete: true, manage: true },
  upload: { view: true, create: true, edit: true, delete: true, manage: true },
  galeria: { view: true, create: true, edit: true, delete: true, manage: true },
  usuarios: { view: true, create: true, edit: true, delete: true, manage: true },
  perfis: { view: true, create: true, edit: true, delete: true, manage: true },
  roles: { view: true, create: true, edit: true, delete: true, manage: true },
  pessoas: { view: true, create: true, edit: true, delete: true, manage: true },
  consolidacao: { view: true, create: true, edit: true, delete: true, manage: true },
  instagram: { view: true, create: true, edit: true, delete: true, manage: true },
  facebook: { view: true, create: true, edit: true, delete: true, manage: true },
  meta: { view: true, create: true, edit: true, delete: true, manage: true },
  cultos: { view: true, create: true, edit: true, delete: true, manage: true },
  livraria_produtos: { view: true, create: true, edit: true, delete: true, manage: true },
  livraria_estoque: { view: true, create: true, edit: true, delete: true, manage: true },
  livraria_movimentacoes: { view: true, create: true, edit: true, delete: true, manage: true },
  livraria_importacao: { view: true, create: true, edit: true, delete: true, manage: true },
  livraria_dashboard: { view: true, create: true, edit: true, delete: true, manage: true },
  livraria_pdv: { view: true, create: true, edit: true, delete: true, manage: true },
  livraria_vendas: { view: true, create: true, edit: true, delete: true, manage: true },
  livraria_reservas: { view: true, create: true, edit: true, delete: true, manage: true },
  livraria_clientes: { view: true, create: true, edit: true, delete: true, manage: true },
  livraria_fiado: { view: true, create: true, edit: true, delete: true, manage: true },
  livraria_cupons: { view: true, create: true, edit: true, delete: true, manage: true },
}

const LEGACY_VIEWER_PERMISSIONS: PermissionMap = {
  dashboard: { view: true, create: false, edit: false, delete: false, manage: false },
}

const LEGACY_EDITOR_PERMISSIONS: PermissionMap = {
  dashboard: { view: true, create: false, edit: false, delete: false, manage: false },
  galeria: { view: true, create: false, edit: true, delete: false, manage: false },
  instagram: { view: true, create: true, edit: true, delete: false, manage: false },
}

/**
 * Mapeamento: código da função nomeada → recurso + ação
 * Deve estar alinhado com a tabela app_permissions no banco
 */
const APP_PERMISSION_TO_RESOURCE_ACTION: Record<string, { resource_key: string; action: PermissionAction }> = {
  [APP_PERMISSION_CODES.VIEW_DASHBOARD]: { resource_key: 'dashboard', action: 'view' },
  [APP_PERMISSION_CODES.VIEW_GALLERY]: { resource_key: 'galeria', action: 'view' },
  [APP_PERMISSION_CODES.CREATE_GALLERY]: { resource_key: 'galeria', action: 'create' },
  [APP_PERMISSION_CODES.EDIT_GALLERY]: { resource_key: 'galeria', action: 'edit' },
  [APP_PERMISSION_CODES.DELETE_GALLERY]: { resource_key: 'galeria', action: 'delete' },
  [APP_PERMISSION_CODES.CREATE_POST]: { resource_key: 'instagram', action: 'create' },
  [APP_PERMISSION_CODES.EDIT_POST]: { resource_key: 'instagram', action: 'edit' },
  [APP_PERMISSION_CODES.DELETE_POST]: { resource_key: 'instagram', action: 'delete' },
  [APP_PERMISSION_CODES.VIEW_INSTAGRAM]: { resource_key: 'instagram', action: 'view' },
  [APP_PERMISSION_CODES.MANAGE_USERS]: { resource_key: 'usuarios', action: 'manage' },
  [APP_PERMISSION_CODES.VIEW_USERS]: { resource_key: 'usuarios', action: 'view' },
  [APP_PERMISSION_CODES.MANAGE_SETTINGS]: { resource_key: 'configuracoes', action: 'manage' },
  [APP_PERMISSION_CODES.VIEW_SETTINGS]: { resource_key: 'configuracoes', action: 'view' },
  [APP_PERMISSION_CODES.MANAGE_ROLES]: { resource_key: 'roles', action: 'manage' },
  [APP_PERMISSION_CODES.VIEW_ROLES]: { resource_key: 'roles', action: 'view' },
  [APP_PERMISSION_CODES.UPLOAD_FILES]: { resource_key: 'upload', action: 'create' },
  [APP_PERMISSION_CODES.VIEW_META]: { resource_key: 'meta', action: 'view' },
  [APP_PERMISSION_CODES.VIEW_CULTOS]: { resource_key: 'cultos', action: 'view' },
  [APP_PERMISSION_CODES.MANAGE_CULTOS]: { resource_key: 'cultos', action: 'manage' },
}

function getAccessTokenFromRequest(request: NextRequest): string {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
  if (!authHeader) return ''
  const [scheme, token] = authHeader.split(' ')
  if (scheme?.toLowerCase() !== 'bearer') return ''
  return token || ''
}

function buildPermissionMap(rows: PermissionRow[] | null | undefined): PermissionMap {
  const map: PermissionMap = {}
  for (const row of rows || []) {
    map[row.page_key] = {
      view: !!row.can_view,
      create: !!row.can_create,
      edit: !!row.can_edit,
      delete: !!row.can_delete,
    }
  }
  return map
}

function resolveAccessProfile(
  profileData: ProfileRow | null,
  legacyRole: string | null
): AccessProfile {
  const related = Array.isArray(profileData?.access_profiles)
    ? profileData?.access_profiles[0]
    : profileData?.access_profiles

  if (related?.id) {
    return {
      id: related.id,
      name: related.name,
      description: related.description || '',
      isAdmin: !!related.is_admin,
    }
  }

  if (legacyRole === 'admin') {
    return {
      id: 'legacy-admin',
      name: 'Admin (legado)',
      description: 'Acesso total legado por role.',
      isAdmin: true,
    }
  }

  if (legacyRole === 'editor') {
    return {
      id: 'legacy-editor',
      name: 'Editor (legado)',
      description: 'Permissões padrão para editor legado.',
      isAdmin: false,
    }
  }

  return {
    id: 'legacy-viewer',
    name: 'Usuário padrão (legado)',
    description: 'Acesso limitado legado.',
    isAdmin: false,
  }
}

function hasAnyAdminViewPermission(permissions: PermissionMap): boolean {
  return ADMIN_PAGE_KEYS.some((key) => permissions[key]?.view)
}

async function getUserByAccessToken(accessToken: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('A configuração do serviço não está concluída. Tente novamente.')
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data, error } = await authClient.auth.getUser(accessToken)
  if (error || !data.user) {
    throw new Error('Sessão inválida.')
  }
  return data.user
}

async function getProfileRowWithUserToken(
  userId: string,
  accessToken: string
): Promise<ProfileRow | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) return null
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await client
    .from('profiles')
    .select('role, email, access_profile_id')
    .eq('id', userId)
    .maybeSingle()
  if (error) return null
  return (data as ProfileRow | null) ?? null
}

async function getProfileRow(userId: string, accessToken?: string): Promise<ProfileRow | null> {
  // Primeiro tenta buscar com o novo sistema de roles
  const { data: newData, error: newError } = await supabaseServer
    .from('profiles')
    .select(
      `
      role,
      email,
      access_profile_id,
      role_id,
      roles (
        id,
        key,
        name,
        description,
        is_admin,
        is_system,
        sort_order,
        is_active,
        created_at,
        updated_at
      ),
      access_profiles (
        id,
        name,
        description,
        is_admin,
        access_profile_permissions (
          page_key,
          can_view,
          can_create,
          can_edit,
          can_delete
        )
      )
    `
    )
    .eq('id', userId)
    .maybeSingle()

  if (!newError && newData) {
    return (newData as ProfileRow | null) ?? null
  }

  // Fallback para sistema legado
  const { data, error } = await supabaseServer
    .from('profiles')
    .select(
      `
      role,
      email,
      access_profile_id,
      access_profiles (
        id,
        name,
        description,
        is_admin,
        access_profile_permissions (
          page_key,
          can_view,
          can_create,
          can_edit,
          can_delete
        )
      )
    `
    )
    .eq('id', userId)
    .maybeSingle()

  if (!error && data) {
    return (data as ProfileRow | null) ?? null
  }

  const { data: fallback, error: fallbackError } = await supabaseServer
    .from('profiles')
    .select('role, email, access_profile_id, role_id')
    .eq('id', userId)
    .maybeSingle()

  if (!fallbackError && fallback) {
    return (fallback as ProfileRow | null) ?? null
  }

  if (accessToken) {
    const withToken = await getProfileRowWithUserToken(userId, accessToken)
    if (withToken) return withToken
  }

  if (fallbackError) {
    throw new Error(fallbackError.message)
  }
  return null
}

function getNestedPermissions(profileRow: ProfileRow | null): PermissionRow[] | null {
  const related = Array.isArray(profileRow?.access_profiles)
    ? profileRow.access_profiles[0]
    : profileRow?.access_profiles
  return related?.access_profile_permissions ?? null
}

/**
 * Busca as permissões do usuário no novo sistema RBAC
 */
async function getNewSystemPermissions(userId: string): Promise<UserPermissionRow[]> {
  try {
    const { data, error } = await supabaseServer.rpc('get_user_permissions', {
      user_id: userId,
    })

    if (error) {
      console.error('Erro ao buscar permissões:', error)
      return []
    }

    return (data as UserPermissionRow[]) || []
  } catch (err) {
    console.error('Erro ao buscar permissões:', err)
    return []
  }
}

/**
 * Converte as permissões do novo sistema para o formato PermissionMap
 */
function buildPermissionMapFromNewSystem(permissions: UserPermissionRow[]): PermissionMap {
  const map: PermissionMap = {}

  for (const perm of permissions) {
    if (!map[perm.resource_key]) {
      map[perm.resource_key] = {
        view: false,
        create: false,
        edit: false,
        delete: false,
        manage: false,
      }
    }

    const action = perm.permission_action
    if (action === 'manage') {
      // Manage dá todas as permissões
      map[perm.resource_key] = {
        view: true,
        create: true,
        edit: true,
        delete: true,
        manage: true,
      }
    } else {
      map[perm.resource_key]![action] = true
    }
  }

  return map
}

export async function getAccessSnapshotByToken(accessToken: string): Promise<AccessSnapshot> {
  if (!accessToken) throw new Error('Token ausente.')
  const user = await getUserByAccessToken(accessToken)
  const profileRow = await getProfileRow(user.id, accessToken)
  const legacyRole = profileRow?.role ?? null

  const displayName =
    (user.user_metadata?.full_name as string | undefined)?.trim() || user.email || null

  // ============================================================
  // NOVO SISTEMA RBAC (priority)
  // ============================================================
  const newRole = Array.isArray(profileRow?.roles) ? profileRow?.roles[0] : profileRow?.roles

  if (newRole && newRole.id) {
    // Usuário tem role no novo sistema
    const isAdmin = newRole.is_admin

    if (isAdmin) {
      // Admin tem acesso total
      return {
        userId: user.id,
        email: user.email ?? profileRow?.email ?? null,
        displayName,
        role: newRole,
        permissions: LEGACY_ADMIN_PERMISSIONS,
        canAccessAdmin: true,
        isAdmin: true,
        legacyRole,
      }
    }

    // Buscar permissões do novo sistema
    const userPermissions = await getNewSystemPermissions(user.id)
    const permissionMap = buildPermissionMapFromNewSystem(userPermissions)
    // Todo usuário com role tem acesso ao Dashboard (página inicial do painel)
    permissionMap.dashboard = { ...(permissionMap.dashboard || {}), view: true }
    const canAccessAdmin = hasAnyAdminViewPermission(permissionMap)

    return {
      userId: user.id,
      email: user.email ?? profileRow?.email ?? null,
      displayName,
      role: newRole,
      permissions: permissionMap,
      canAccessAdmin,
      isAdmin: false,
      legacyRole,
    }
  }

  // ============================================================
  // SISTEMA LEGADO (fallback)
  // ============================================================
  const legacyProfile = resolveAccessProfile(profileRow, legacyRole)

  if (legacyRole === 'admin' || legacyProfile.isAdmin) {
    return {
      userId: user.id,
      email: user.email ?? profileRow?.email ?? null,
      displayName,
      role: null,
      permissions: LEGACY_ADMIN_PERMISSIONS,
      canAccessAdmin: true,
      isAdmin: true,
      legacyRole,
      legacyProfile,
    }
  }

  const legacyPermissions = getNestedPermissions(profileRow)
  const permissionMap = legacyPermissions?.length
    ? buildPermissionMap(legacyPermissions)
    : legacyRole === 'editor'
      ? LEGACY_EDITOR_PERMISSIONS
      : LEGACY_VIEWER_PERMISSIONS

  const canAccessAdmin = hasAnyAdminViewPermission(permissionMap)

  return {
    userId: user.id,
    email: user.email ?? profileRow?.email ?? null,
    displayName,
    role: null,
    permissions: permissionMap,
    canAccessAdmin,
    isAdmin: false,
    legacyRole,
    legacyProfile,
  }
}

export async function getAccessSnapshotFromRequest(request: NextRequest): Promise<AccessSnapshot> {
  const accessToken = getAccessTokenFromRequest(request)
  return getAccessSnapshotByToken(accessToken)
}

export function hasPermission(
  snapshot: AccessSnapshot,
  pageKey: string,
  action: PermissionAction
): boolean {
  if (snapshot.isAdmin) return true
  
  // Se tem manage, tem todas as permissões
  if (snapshot.permissions[pageKey]?.manage) return true
  
  return !!snapshot.permissions[pageKey]?.[action]
}

/**
 * Verifica se o usuário pode visualizar um recurso
 */
export function canView(snapshot: AccessSnapshot, pageKey: string): boolean {
  return hasPermission(snapshot, pageKey, 'view')
}

/**
 * Verifica se o usuário pode criar em um recurso
 */
export function canCreate(snapshot: AccessSnapshot, pageKey: string): boolean {
  return hasPermission(snapshot, pageKey, 'create')
}

/**
 * Verifica se o usuário pode editar em um recurso
 */
export function canEdit(snapshot: AccessSnapshot, pageKey: string): boolean {
  return hasPermission(snapshot, pageKey, 'edit')
}

/**
 * Verifica se o usuário pode excluir em um recurso
 */
export function canDelete(snapshot: AccessSnapshot, pageKey: string): boolean {
  return hasPermission(snapshot, pageKey, 'delete')
}

/**
 * Verifica se o usuário pode gerenciar completamente um recurso
 */
export function canManage(snapshot: AccessSnapshot, pageKey: string): boolean {
  return hasPermission(snapshot, pageKey, 'manage')
}

/**
 * Verifica se o usuário tem uma função nomeada (permissão por código).
 * Ex.: hasAppPermission(snapshot, 'view_gallery'), hasAppPermission(snapshot, 'create_post')
 * Útil para controle de acesso no backend por nome de função.
 */
export function hasAppPermission(
  snapshot: AccessSnapshot,
  permissionCode: AppPermissionCode | string
): boolean {
  const mapping = APP_PERMISSION_TO_RESOURCE_ACTION[permissionCode]
  if (!mapping) return false
  return hasPermission(snapshot, mapping.resource_key, mapping.action)
}
