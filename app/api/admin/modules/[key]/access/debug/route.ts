import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import {
  ADMIN_MODULE_ACCESS,
  getModuleAccessConfig,
  getModuleLegacyQueryKeys,
} from '@/lib/admin-module-access'

type Ctx = { params: Promise<{ key: string }> }

/**
 * GET /api/admin/modules/[key]/access/debug
 * Diagnóstico: mostra exatamente o que o banco retorna para detectar acesso.
 */
export async function GET(request: NextRequest, ctx: Ctx) {
  const access = await requireAccess(request, { pageKey: 'usuarios', action: 'manage' })
  if (!access.ok) return access.response

  const { key } = await ctx.params
  const config = getModuleAccessConfig(key)
  if (!config) return NextResponse.json({ error: 'Módulo não encontrado' }, { status: 404 })

  const supabase = createSupabaseAdminClient(request)
  const legacyPageKeys = getModuleLegacyQueryKeys(config)

  const { count: totalProfiles } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })

  const { data: legacyPerms, error: legacyError } = await supabase
    .from('access_profile_permissions')
    .select('profile_id, page_key, can_view')
    .in('page_key', legacyPageKeys)
    .eq('can_view', true)

  const legacyProfileIds = [...new Set((legacyPerms ?? []).map((r) => r.profile_id).filter(Boolean))]

  let profilesWithLegacyAccess = 0
  if (legacyProfileIds.length > 0) {
    const { count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .in('access_profile_id', legacyProfileIds)
    profilesWithLegacyAccess = count ?? 0
  }

  const { data: sample } = await supabase
    .from('profiles')
    .select('id, email, role, role_id, access_profile_id')
    .limit(5)

  return NextResponse.json({
    module: { key, config, legacyPageKeys },
    database: {
      totalProfiles,
      legacyPermsFound: legacyPerms?.length ?? 0,
      legacyPermsError: legacyError?.message ?? null,
      legacyProfileIdsWithAccess: legacyProfileIds,
      profilesWithLegacyAccess,
    },
    sample,
    allModules: Object.keys(ADMIN_MODULE_ACCESS),
  })
}
