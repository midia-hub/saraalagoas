import type { AdminModuleAccessConfig } from '@/lib/admin-module-access'
import { getModuleLegacyQueryKeys } from '@/lib/admin-module-access'

type SupabaseAdmin = ReturnType<typeof import('@/lib/supabase-server').createSupabaseAdminClient>

const PERM_ROW = {
  can_view: true,
  can_create: false,
  can_edit: true,
  can_delete: false,
}

/** Garante todas as page_keys do módulo no access_profile. */
export async function upsertModulePermissions(
  supabase: SupabaseAdmin,
  profileId: string,
  pageKeys: string[]
) {
  for (const pageKey of pageKeys) {
    const { data: perm } = await supabase
      .from('access_profile_permissions')
      .select('id')
      .eq('profile_id', profileId)
      .eq('page_key', pageKey)
      .maybeSingle()

    if (perm) {
      await supabase
        .from('access_profile_permissions')
        .update(PERM_ROW)
        .eq('id', perm.id)
    } else {
      const { error } = await supabase.from('access_profile_permissions').insert({
        profile_id: profileId,
        page_key: pageKey,
        ...PERM_ROW,
      })
      if (error) console.error(`[module-access] insert perm ${pageKey}:`, error.message)
    }
  }
}

/** Remove page_keys legadas/erradas após conceder as corretas. */
export async function removeModuleLegacyAliases(
  supabase: SupabaseAdmin,
  profileId: string,
  aliases: string[]
) {
  if (aliases.length === 0) return
  await supabase
    .from('access_profile_permissions')
    .delete()
    .eq('profile_id', profileId)
    .in('page_key', aliases)
}

/** Remove todas as permissões do módulo ao revogar acesso. */
export async function removeModulePermissions(
  supabase: SupabaseAdmin,
  profileId: string,
  config: AdminModuleAccessConfig
) {
  const keys = getModuleLegacyQueryKeys(config)
  await supabase
    .from('access_profile_permissions')
    .delete()
    .eq('profile_id', profileId)
    .in('page_key', keys)
}
