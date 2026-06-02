import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

type Ctx = { params: Promise<{ key: string }> }

const MODULE_MAP: Record<string, { resourceKey: string; legacyPageKey: string; label: string }> = {
  celulas:         { resourceKey: 'celulas',           legacyPageKey: 'celulas',       label: 'Células' },
  consolidacao:    { resourceKey: 'consolidacao',      legacyPageKey: 'consolidacao',  label: 'Consolidação' },
  livraria:        { resourceKey: 'livraria_produtos', legacyPageKey: 'livraria_pdv',  label: 'Livraria' },
  reservas:        { resourceKey: 'reservas',          legacyPageKey: 'reservas',      label: 'Reservas' },
  'sara-kids':     { resourceKey: 'pessoas',           legacyPageKey: 'pessoas',       label: 'Sara Kids' },
  escalas:         { resourceKey: 'escalas',           legacyPageKey: 'escalas',       label: 'Escalas' },
  galeria:         { resourceKey: 'galeria',           legacyPageKey: 'galeria',       label: 'Galeria' },
  pessoas:         { resourceKey: 'pessoas',           legacyPageKey: 'pessoas',       label: 'Pessoas' },
  lideranca:       { resourceKey: 'pessoas',           legacyPageKey: 'pessoas',       label: 'Liderança' },
  'revisao-vidas': { resourceKey: 'consolidacao',      legacyPageKey: 'consolidacao',  label: 'Revisão de Vidas' },
}

// ─── GET: lista usuários com flag de acesso ───────────────────────────────────

export async function GET(request: NextRequest, ctx: Ctx) {
  const access = await requireAccess(request, { pageKey: 'usuarios', action: 'view' })
  if (!access.ok) return access.response

  const { key } = await ctx.params
  const mapping = MODULE_MAP[key]
  if (!mapping) return NextResponse.json({ error: 'Módulo não encontrado' }, { status: 404 })

  const supabase = createSupabaseAdminClient(request)

  // Queries paralelas — sem joins em profiles (joins falham silenciosamente quando tabela ausente)
  const [profilesResult, legacyPermsResult, adminRolesResult, adminApsResult] = await Promise.all([

    // 1. Perfis — full_name vem de people (não existe como coluna em profiles; avatar_url também ausente)
    supabase
      .from('profiles')
      .select('id, email, role, role_id, access_profile_id, person_id, people:person_id(full_name)')
      .order('created_at', { ascending: false }),

    // 2. access_profiles que têm can_view=true para este módulo
    // ATENÇÃO: o FK em access_profile_permissions é "profile_id" (aponta para access_profiles.id)
    supabase
      .from('access_profile_permissions')
      .select('profile_id')
      .eq('page_key', mapping.legacyPageKey)
      .eq('can_view', true),

    // 3. IDs de roles com is_admin=true (novo RBAC)
    supabase
      .from('roles')
      .select('id')
      .eq('is_admin', true),

    // 4. IDs de access_profiles com is_admin=true (sistema legado)
    supabase
      .from('access_profiles')
      .select('id')
      .eq('is_admin', true),
  ])

  if (profilesResult.error)  console.error('[module-access GET] profiles:', profilesResult.error.message)
  if (legacyPermsResult.error) console.error('[module-access GET] perms:', legacyPermsResult.error.message)
  if (adminRolesResult.error) console.error('[module-access GET] roles:', adminRolesResult.error.message)
  if (adminApsResult.error)   console.error('[module-access GET] access_profiles:', adminApsResult.error.message)

  // Sets para lookup O(1)
  // profile_id em access_profile_permissions = access_profiles.id (mesmo valor que profiles.access_profile_id)
  const legacyProfileIds = new Set<string>(
    (legacyPermsResult.data ?? []).map((r: any) => r.profile_id).filter(Boolean)
  )
  const adminRoleIds = new Set<string>(
    (adminRolesResult.data ?? []).map((r: any) => r.id).filter(Boolean)
  )
  const adminApIds = new Set<string>(
    (adminApsResult.data ?? []).map((r: any) => r.id).filter(Boolean)
  )

  // RBAC novo: roles que têm view/manage para o resource deste módulo
  const rbacRoleIds = new Set<string>()
  try {
    const { data: resource } = await supabase
      .from('resources')
      .select('id')
      .eq('key', mapping.resourceKey)
      .maybeSingle()

    if (resource?.id) {
      const { data: rps } = await supabase
        .from('role_permissions')
        .select('role_id, permissions ( action )')
        .eq('resource_id', resource.id)

      for (const rp of rps ?? []) {
        const action = Array.isArray((rp as any).permissions)
          ? (rp as any).permissions[0]?.action
          : (rp as any).permissions?.action
        if (action === 'view' || action === 'manage') {
          rbacRoleIds.add((rp as any).role_id)
        }
      }
    }
  } catch {
    // RBAC tables podem ainda não existir — tolerado
  }

  const users = (profilesResult.data ?? []).map((u: any) => {
    const person = Array.isArray(u.people) ? u.people[0] : u.people

    const isAdmin =
      u.role === 'admin' ||
      (u.role_id           ? adminRoleIds.has(u.role_id)           : false) ||
      (u.access_profile_id ? adminApIds.has(u.access_profile_id)   : false)

    const hasLegacyAccess = u.access_profile_id
      ? legacyProfileIds.has(u.access_profile_id)
      : false

    const hasRbacAccess = u.role_id ? rbacRoleIds.has(u.role_id) : false

    return {
      id:            u.id,
      email:         u.email ?? '',
      full_name:     person?.full_name || u.email?.split('@')[0] || 'Usuário',
      person_id:     u.person_id       ?? null,
      avatar_url:    null,
      role_is_admin: isAdmin,
      has_access:    isAdmin || hasLegacyAccess || hasRbacAccess,
    }
  })

  const _debug = process.env.NODE_ENV !== 'production' ? {
    profilesError:    profilesResult.error?.message    ?? null,
    profilesCount:    profilesResult.data?.length      ?? 0,
    legacyPermsError: legacyPermsResult.error?.message ?? null,
    legacyPermsCount: legacyPermsResult.data?.length   ?? 0,
    adminRolesError:  adminRolesResult.error?.message  ?? null,
    adminRoleIds:     [...adminRoleIds],
    adminApIds:       [...adminApIds],
    legacyProfileIds: [...legacyProfileIds],
    rbacRoleIds:      [...rbacRoleIds],
    usersWithAccess:  users.filter(u => u.has_access).length,
  } : undefined

  return NextResponse.json({ users, _debug })
}

// ─── POST: concede acesso ─────────────────────────────────────────────────────
// Body: { user_id: string, level: 'usuario' | 'admin' }

export async function POST(request: NextRequest, ctx: Ctx) {
  const access = await requireAccess(request, { pageKey: 'usuarios', action: 'edit' })
  if (!access.ok) return access.response

  const { key } = await ctx.params
  const mapping = MODULE_MAP[key]
  if (!mapping) return NextResponse.json({ error: 'Módulo não encontrado' }, { status: 404 })

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
    // Usa ou cria o access_profile de admin
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
    // Usa ou cria access_profile específico para este módulo
    const profileName = `Acesso:${key}`

    const { data: existing } = await supabase
      .from('access_profiles').select('id').eq('name', profileName).maybeSingle()

    apId = existing?.id ?? null

    if (!apId) {
      const { data: created } = await supabase
        .from('access_profiles')
        .insert({
          name:        profileName,
          description: `Acesso ao módulo ${mapping.label}`,
          is_admin:    false,
        })
        .select('id').maybeSingle()
      apId = created?.id ?? null
    }

    // Garante permissão de visualização para este módulo no access_profile
    // ATENÇÃO: a coluna FK em access_profile_permissions é "profile_id" (não "access_profile_id")
    if (apId) {
      const { data: perm } = await supabase
        .from('access_profile_permissions')
        .select('id')
        .eq('profile_id', apId)
        .eq('page_key', mapping.legacyPageKey)
        .maybeSingle()

      if (perm) {
        await supabase.from('access_profile_permissions')
          .update({ can_view: true, can_edit: true, can_create: false, can_delete: false })
          .eq('id', perm.id)
      } else {
        const { error: permErr } = await supabase.from('access_profile_permissions').insert({
          profile_id:  apId,
          page_key:    mapping.legacyPageKey,
          can_view:    true,
          can_create:  false,
          can_edit:    true,
          can_delete:  false,
        })
        if (permErr) console.error('[module-access POST] insert perm:', permErr.message)
      }
    }
  }

  // Lê o role atual para não rebaixar um admin existente
  const { data: currentProfile } = await supabase
    .from('profiles').select('role').eq('id', user_id).maybeSingle()

  const updatePayload: Record<string, unknown> = {
    access_profile_id: apId,
    updated_at:        new Date().toISOString(),
  }
  // Só eleva role para 'admin' — nunca rebaixa quem já é admin
  if (level === 'admin' && currentProfile?.role !== 'admin') {
    updatePayload.role = 'admin'
  }

  const { error } = await supabase.from('profiles').update(updatePayload).eq('id', user_id)

  if (error) {
    console.error('[module-access POST] update profile:', error)
    return NextResponse.json({ error: 'Erro ao conceder acesso' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, message: 'Acesso concedido com sucesso.' })
}

// ─── DELETE: revoga acesso ────────────────────────────────────────────────────

export async function DELETE(request: NextRequest, ctx: Ctx) {
  const access = await requireAccess(request, { pageKey: 'usuarios', action: 'edit' })
  if (!access.ok) return access.response

  const { key } = await ctx.params
  const mapping = MODULE_MAP[key]
  if (!mapping) return NextResponse.json({ error: 'Módulo não encontrado' }, { status: 404 })

  const body = await request.json().catch(() => ({}))
  const { user_id } = body as { user_id?: string }
  if (!user_id) return NextResponse.json({ error: 'user_id é obrigatório' }, { status: 400 })

  const supabase = createSupabaseAdminClient(request)

  const { data: userProfile } = await supabase
    .from('profiles').select('id, access_profile_id').eq('id', user_id).maybeSingle()

  // Se o access_profile é exclusivo deste módulo (nome "Acesso:key"), remove a permissão
  if (userProfile?.access_profile_id) {
    const profileName = `Acesso:${key}`
    const { data: ap } = await supabase
      .from('access_profiles').select('id, name').eq('id', userProfile.access_profile_id).maybeSingle()

    if (ap?.name === profileName) {
      await supabase.from('access_profile_permissions')
        .delete()
        .eq('profile_id', userProfile.access_profile_id)
        .eq('page_key', mapping.legacyPageKey)
    }
  }

  // Só limpa access_profile_id — o campo role não é o que controla acesso por módulo
  // e 'viewer' pode não ser um valor válido dependendo do schema do banco
  const { error } = await supabase.from('profiles').update({
    access_profile_id: null,
    updated_at:        new Date().toISOString(),
  }).eq('id', user_id)

  if (error) {
    console.error('[module-access DELETE]', error)
    return NextResponse.json({ error: 'Erro ao revogar acesso' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
