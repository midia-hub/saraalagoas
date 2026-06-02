import type { AdminModuleAccessConfig } from '@/lib/admin-module-access'
import { getModuleLegacyQueryKeys } from '@/lib/admin-module-access'

type SupabaseAdmin = ReturnType<typeof import('@/lib/supabase-server').createSupabaseAdminClient>

const PERM_ROW = {
  can_view: true,
  can_create: false,
  can_edit: true,
  can_delete: false,
}

export type UpsertPermissionsResult = {
  ok: boolean
  failedKeys: string[]
}

/** Garante todas as page_keys do módulo no access_profile. */
export async function upsertModulePermissions(
  supabase: SupabaseAdmin,
  profileId: string,
  pageKeys: string[]
): Promise<UpsertPermissionsResult> {
  const failedKeys: string[] = []

  for (const pageKey of pageKeys) {
    const { data: perm } = await supabase
      .from('access_profile_permissions')
      .select('id')
      .eq('profile_id', profileId)
      .eq('page_key', pageKey)
      .maybeSingle()

    if (perm) {
      const { error } = await supabase
        .from('access_profile_permissions')
        .update(PERM_ROW)
        .eq('id', perm.id)
      if (error) {
        console.error(`[module-access] update perm ${pageKey}:`, error.message)
        failedKeys.push(pageKey)
      }
    } else {
      const { error } = await supabase.from('access_profile_permissions').insert({
        profile_id: profileId,
        page_key: pageKey,
        ...PERM_ROW,
      })
      if (error) {
        console.error(`[module-access] insert perm ${pageKey}:`, error.message)
        failedKeys.push(pageKey)
      }
    }
  }

  return { ok: failedKeys.length === 0, failedKeys }
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

/** Busca ou cria o access_profile exclusivo do módulo (tolera duplicatas de nome). */
export async function findOrCreateModuleAccessProfile(
  supabase: SupabaseAdmin,
  profileName: string,
  description: string
): Promise<string | null> {
  const { data: existingRows, error: findError } = await supabase
    .from('access_profiles')
    .select('id')
    .eq('name', profileName)
    .order('created_at', { ascending: true })
    .limit(1)

  if (findError) {
    console.error('[module-access] find access_profile:', findError.message)
  }

  if (existingRows?.[0]?.id) return existingRows[0].id

  const { data: created, error: createError } = await supabase
    .from('access_profiles')
    .insert({ name: profileName, description, is_admin: false })
    .select('id')
    .maybeSingle()

  if (createError) {
    console.error('[module-access] create access_profile:', createError.message)
    return null
  }

  return created?.id ?? null
}
