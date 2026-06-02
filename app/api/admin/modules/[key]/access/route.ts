import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import {
  getModuleAccessConfig,
  getModuleLegacyQueryKeys,
  getModuleProfileName,
} from '@/lib/admin-module-access'
import {
  findOrCreateModuleAccessProfile,
  removeModuleLegacyAliases,
  removeModulePermissions,
  upsertModulePermissions,
} from '@/lib/admin-module-access-db'

type Ctx = { params: Promise<{ key: string }> }

// ─── GET: lista usuários com flag de acesso ───────────────────────────────────

export async function GET(request: NextRequest, ctx: Ctx) {
  const access = await requireAccess(request, { pageKey: 'usuarios', action: 'view' })
  if (!access.ok) return access.response

  const { key } = await ctx.params
  const config = getModuleAccessConfig(key)
  if (!config) return NextResponse.json({ error: 'Módulo não encontrado' }, { status: 404 })

  const supabase = createSupabaseAdminClient(request)
  const legacyPageKeys = getModuleLegacyQueryKeys(config)
  const moduleProfileName = getModuleProfileName(key)

  const [profilesResult, legacyPermsResult, moduleProfilesResult, adminRolesResult, adminApsResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, email, role, role_id, access_profile_id, person_id, people:person_id(full_name)')
      .order('created_at', { ascending: false }),

    supabase
      .from('access_profile_permissions')
      .select('profile_id')
      .in('page_key', legacyPageKeys)
      .eq('can_view', true),

    supabase
      .from('access_profiles')
      .select('id')
      .eq('name', moduleProfileName),

    supabase.from('roles').select('id').eq('is_admin', true),
    supabase.from('access_profiles').select('id').eq('is_admin', true),
  ])

  if (profilesResult.error)  console.error('[module-access GET] profiles:', profilesResult.error.message)
  if (legacyPermsResult.error) console.error('[module-access GET] perms:', legacyPermsResult.error.message)

  const legacyProfileIds = new Set<string>(
    (legacyPermsResult.data ?? []).map((r: { profile_id: string }) => r.profile_id).filter(Boolean)
  )
  const moduleAccessProfileIds = new Set<string>(
    (moduleProfilesResult.data ?? []).map((r: { id: string }) => r.id).filter(Boolean)
  )

  // Repara perfis do módulo que perderam permissões (ex.: bug ao remover alias legado)
  for (const profileId of moduleAccessProfileIds) {
    if (!legacyProfileIds.has(profileId)) {
      const repaired = await upsertModulePermissions(supabase, profileId, config.usuarioPageKeys)
      if (repaired.ok) legacyProfileIds.add(profileId)
    }
  }
  const adminRoleIds = new Set<string>(
    (adminRolesResult.data ?? []).map((r: { id: string }) => r.id).filter(Boolean)
  )
  const adminApIds = new Set<string>(
    (adminApsResult.data ?? []).map((r: { id: string }) => r.id).filter(Boolean)
  )

  const rbacRoleIds = new Set<string>()
  try {
    const { data: resource } = await supabase
      .from('resources')
      .select('id')
      .eq('key', config.resourceKey)
      .maybeSingle()

    if (resource?.id) {
      const { data: rps } = await supabase
        .from('role_permissions')
        .select('role_id, permissions ( action )')
        .eq('resource_id', resource.id)

      for (const rp of rps ?? []) {
        const row = rp as { role_id: string; permissions: { action: string } | { action: string }[] | null }
        const perm = row.permissions
        const action = Array.isArray(perm) ? perm[0]?.action : perm?.action
        if (action === 'view' || action === 'manage') {
          rbacRoleIds.add(row.role_id)
        }
      }
    }
  } catch {
    // RBAC tables podem ainda não existir
  }

  const users = (profilesResult.data ?? []).map((u: Record<string, unknown>) => {
    const person = Array.isArray(u.people) ? u.people[0] : u.people

    const isAdmin =
      u.role === 'admin' ||
      (u.role_id ? adminRoleIds.has(u.role_id as string) : false) ||
      (u.access_profile_id ? adminApIds.has(u.access_profile_id as string) : false)

    const hasLegacyAccess = u.access_profile_id
      ? legacyProfileIds.has(u.access_profile_id as string) ||
        moduleAccessProfileIds.has(u.access_profile_id as string)
      : false

    const hasRbacAccess = u.role_id ? rbacRoleIds.has(u.role_id as string) : false

    const email = (u.email as string) ?? ''
    const personName = (person as { full_name?: string } | null)?.full_name

    return {
      id: u.id as string,
      email,
      full_name: personName || email.split('@')[0] || 'Usuário',
      person_id: (u.person_id as string | null) ?? null,
      avatar_url: null,
      role_is_admin: isAdmin,
      has_access: isAdmin || hasLegacyAccess || hasRbacAccess,
    }
  })

  const _debug = process.env.NODE_ENV !== 'production' ? {
    moduleKey: key,
    legacyPageKeys,
    usuarioPageKeys: config.usuarioPageKeys,
    usersWithAccess: users.filter(u => u.has_access).length,
  } : undefined

  return NextResponse.json({ users, _debug })
}

// ─── POST: concede acesso ─────────────────────────────────────────────────────
// Body: { user_id: string, level: 'usuario' | 'admin' }

export async function POST(request: NextRequest, ctx: Ctx) {
  const access = await requireAccess(request, { pageKey: 'usuarios', action: 'edit' })
  if (!access.ok) return access.response

  const { key } = await ctx.params
  const config = getModuleAccessConfig(key)
  if (!config) return NextResponse.json({ error: 'Módulo não encontrado' }, { status: 404 })

  const body = await request.json().catch(() => ({}))
  const { user_id, level } = body as { user_id?: string; level?: 'usuario' | 'admin' }

  if (!user_id)                                 return NextResponse.json({ error: 'user_id é obrigatório' }, { status: 400 })
  if (level !== 'usuario' && level !== 'admin') return NextResponse.json({ error: 'level deve ser "usuario" ou "admin"' }, { status: 400 })

  const supabase = createSupabaseAdminClient(request)

  const { data: userProfile } = await supabase
    .from('profiles').select('id').eq('id', user_id).maybeSingle()
  if (!userProfile) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

  let apId: string | null = null

  if (level === 'admin') {
    const { data: existing } = await supabase
      .from('access_profiles').select('id').eq('is_admin', true).limit(1).maybeSingle()

    apId = existing?.id ?? null

    if (!apId) {
      const { data: created } = await supabase
        .from('access_profiles')
        .insert({ name: 'Administrador', description: 'Perfil administrativo', is_admin: true })
        .select('id').maybeSingle()
      apId = created?.id ?? null
    }
  } else {
    const profileName = getModuleProfileName(key)

    apId = await findOrCreateModuleAccessProfile(
      supabase,
      profileName,
      `Acesso ao módulo ${config.label}`
    )

    if (!apId) {
      return NextResponse.json({ error: 'Erro ao criar perfil de acesso do módulo.' }, { status: 500 })
    }

    const permResult = await upsertModulePermissions(supabase, apId, config.usuarioPageKeys)
    if (!permResult.ok) {
      return NextResponse.json(
        {
          error: 'Erro ao gravar permissões do módulo.',
          failedKeys: permResult.failedKeys,
        },
        { status: 500 }
      )
    }

    await removeModuleLegacyAliases(supabase, apId, config.legacyAliases ?? [])
  }

  if (!apId) {
    return NextResponse.json({ error: 'Perfil de acesso não pôde ser definido.' }, { status: 500 })
  }

  const { data: currentProfile } = await supabase
    .from('profiles').select('role').eq('id', user_id).maybeSingle()

  const updatePayload: Record<string, unknown> = {
    access_profile_id: apId,
    updated_at: new Date().toISOString(),
  }
  if (level === 'admin' && currentProfile?.role !== 'admin') {
    updatePayload.role = 'admin'
  }

  const { error } = await supabase.from('profiles').update(updatePayload).eq('id', user_id)

  if (error) {
    console.error('[module-access POST] update profile:', error)
    return NextResponse.json({ error: 'Erro ao conceder acesso' }, { status: 500 })
  }

  const { data: verified } = await supabase
    .from('profiles')
    .select('access_profile_id')
    .eq('id', user_id)
    .maybeSingle()

  if (verified?.access_profile_id !== apId) {
    return NextResponse.json({ error: 'Acesso não foi vinculado ao usuário. Tente novamente.' }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    message: 'Acesso concedido com sucesso.',
    requiresRelogin: true,
  })
}

// ─── DELETE: revoga acesso ────────────────────────────────────────────────────

export async function DELETE(request: NextRequest, ctx: Ctx) {
  const access = await requireAccess(request, { pageKey: 'usuarios', action: 'edit' })
  if (!access.ok) return access.response

  const { key } = await ctx.params
  const config = getModuleAccessConfig(key)
  if (!config) return NextResponse.json({ error: 'Módulo não encontrado' }, { status: 404 })

  const body = await request.json().catch(() => ({}))
  const { user_id } = body as { user_id?: string }
  if (!user_id) return NextResponse.json({ error: 'user_id é obrigatório' }, { status: 400 })

  const supabase = createSupabaseAdminClient(request)

  const { data: userProfile } = await supabase
    .from('profiles').select('id, access_profile_id').eq('id', user_id).maybeSingle()

  if (userProfile?.access_profile_id) {
    const profileName = getModuleProfileName(key)
    const { data: ap } = await supabase
      .from('access_profiles').select('id, name').eq('id', userProfile.access_profile_id).maybeSingle()

    if (ap?.name === profileName) {
      await removeModulePermissions(supabase, userProfile.access_profile_id, config)
    }
  }

  const { error } = await supabase.from('profiles').update({
    access_profile_id: null,
    updated_at: new Date().toISOString(),
  }).eq('id', user_id)

  if (error) {
    console.error('[module-access DELETE]', error)
    return NextResponse.json({ error: 'Erro ao revogar acesso' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
