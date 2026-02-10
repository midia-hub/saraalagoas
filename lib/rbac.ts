import { createClient } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete'

export type PermissionSet = {
  view: boolean
  create: boolean
  edit: boolean
  delete: boolean
}

export type PermissionMap = Record<string, PermissionSet>

export type AccessProfile = {
  id: string
  name: string
  description: string
  isAdmin: boolean
}

export type AccessSnapshot = {
  userId: string
  email: string | null
  role: string | null
  profile: AccessProfile
  permissions: PermissionMap
  canAccessAdmin: boolean
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

const ADMIN_PAGE_KEYS = ['dashboard', 'configuracoes', 'upload', 'galeria', 'usuarios', 'perfis', 'instagram']

const LEGACY_ADMIN_PERMISSIONS: PermissionMap = {
  dashboard: { view: true, create: true, edit: true, delete: true },
  configuracoes: { view: true, create: true, edit: true, delete: true },
  upload: { view: true, create: true, edit: true, delete: true },
  galeria: { view: true, create: true, edit: true, delete: true },
  usuarios: { view: true, create: true, edit: true, delete: true },
  perfis: { view: true, create: true, edit: true, delete: true },
}

const LEGACY_VIEWER_PERMISSIONS: PermissionMap = {
  dashboard: { view: true, create: false, edit: false, delete: false },
}

const LEGACY_EDITOR_PERMISSIONS: PermissionMap = {
  dashboard: { view: true, create: false, edit: false, delete: false },
  galeria: { view: true, create: false, edit: true, delete: false },
  instagram: { view: true, create: true, edit: true, delete: false },
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
    throw new Error('Supabase não configurado no servidor.')
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
    .select('role, email, access_profile_id')
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

export async function getAccessSnapshotByToken(accessToken: string): Promise<AccessSnapshot> {
  if (!accessToken) throw new Error('Token ausente.')
  const user = await getUserByAccessToken(accessToken)
  const profileRow = await getProfileRow(user.id, accessToken)
  const role = profileRow?.role ?? null

  const profile = resolveAccessProfile(profileRow, role)

  if (role === 'admin' || profile.isAdmin) {
    return {
      userId: user.id,
      email: user.email ?? profileRow?.email ?? null,
      role,
      profile: {
        ...profile,
        name: profile.isAdmin ? profile.name : 'Admin',
        isAdmin: true,
      },
      permissions: LEGACY_ADMIN_PERMISSIONS,
      canAccessAdmin: true,
      isAdmin: true,
    }
  }

  const permissions = getNestedPermissions(profileRow)
  const permissionMap = permissions?.length
    ? buildPermissionMap(permissions)
    : role === 'editor'
      ? LEGACY_EDITOR_PERMISSIONS
      : LEGACY_VIEWER_PERMISSIONS

  const canAccessAdmin = hasAnyAdminViewPermission(permissionMap)

  return {
    userId: user.id,
    email: user.email ?? profileRow?.email ?? null,
    role,
    profile,
    permissions: permissionMap,
    canAccessAdmin,
    isAdmin: false,
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
  return !!snapshot.permissions[pageKey]?.[action]
}
