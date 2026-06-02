import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

type Ctx = { params: Promise<{ key: string }> }

const MODULE_MAP: Record<string, { resourceKey: string; legacyPageKey: string }> = {
  celulas:         { resourceKey: 'celulas',           legacyPageKey: 'celulas' },
  consolidacao:    { resourceKey: 'consolidacao',      legacyPageKey: 'consolidacao' },
  livraria:        { resourceKey: 'livraria_produtos', legacyPageKey: 'livraria_pdv' },
  reservas:        { resourceKey: 'reservas',          legacyPageKey: 'reservas' },
  'sara-kids':     { resourceKey: 'pessoas',           legacyPageKey: 'pessoas' },
  escalas:         { resourceKey: 'escalas',           legacyPageKey: 'escalas' },
  galeria:         { resourceKey: 'galeria',           legacyPageKey: 'galeria' },
  pessoas:         { resourceKey: 'pessoas',           legacyPageKey: 'pessoas' },
  lideranca:       { resourceKey: 'pessoas',           legacyPageKey: 'pessoas' },
  'revisao-vidas': { resourceKey: 'consolidacao',      legacyPageKey: 'consolidacao' },
}

/**
 * GET /api/admin/modules/[key]/access/debug
 * Diagnóstico: mostra exatamente o que o banco retorna para detectar acesso.
 * Só disponível para admins.
 */
export async function GET(request: NextRequest, ctx: Ctx) {
  const access = await requireAccess(request, { pageKey: 'usuarios', action: 'manage' })
  if (!access.ok) return access.response

  const { key } = await ctx.params
  const mapping = MODULE_MAP[key]
  if (!mapping) return NextResponse.json({ error: 'Módulo não encontrado' }, { status: 404 })

  const supabase = createSupabaseAdminClient(request)

  // 1. Contagem total de profiles
  const { count: totalProfiles } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })

  // 2. Access profiles com permissão legada para este módulo
  const { data: legacyPerms, error: legacyError } = await supabase
    .from('access_profile_permissions')
    .select('access_profile_id, page_key, can_view')
    .eq('page_key', mapping.legacyPageKey)
    .eq('can_view', true)

  // 3. Quantos profiles têm access_profile_id que confere acesso
  const legacyProfileIds = (legacyPerms ?? []).map((r: any) => r.access_profile_id).filter(Boolean)

  let profilesWithLegacyAccess = 0
  if (legacyProfileIds.length > 0) {
    const { count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .in('access_profile_id', legacyProfileIds)
    profilesWithLegacyAccess = count ?? 0
  }

  // 4. Profiles com role = 'admin' (legado puro)
  const { count: legacyAdminCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'admin')

  // 5. Profiles com role admin via roles.is_admin = true
  const { data: adminRoles } = await supabase
    .from('roles')
    .select('id, name')
    .eq('is_admin', true)

  const adminRoleIds = (adminRoles ?? []).map((r: any) => r.id)
  let profilesWithAdminRole = 0
  if (adminRoleIds.length > 0) {
    const { count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .in('role_id', adminRoleIds)
    profilesWithAdminRole = count ?? 0
  }

  // 6. Profiles com access_profiles.is_admin = true
  const { data: adminAPs } = await supabase
    .from('access_profiles')
    .select('id, name')
    .eq('is_admin', true)

  const adminAPIds = (adminAPs ?? []).map((r: any) => r.id)
  let profilesWithAdminAP = 0
  if (adminAPIds.length > 0) {
    const { count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .in('access_profile_id', adminAPIds)
    profilesWithAdminAP = count ?? 0
  }

  // 7. Amostra de 5 profiles para inspecionar
  const { data: sample } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, role_id, access_profile_id')
    .limit(5)

  return NextResponse.json({
    module: { key, mapping },
    database: {
      totalProfiles,
      legacyPermsFound: legacyPerms?.length ?? 0,
      legacyPermsError: legacyError?.message ?? null,
      legacyProfileIdsWithAccess: legacyProfileIds,
      profilesWithLegacyAccess,
      profilesWithLegacyAdminRole: legacyAdminCount,
      adminRoles: adminRoles?.map((r: any) => r.name) ?? [],
      profilesWithAdminRole,
      adminAccessProfiles: adminAPs?.map((r: any) => r.name) ?? [],
      profilesWithAdminAP,
    },
    sample,
  })
}
