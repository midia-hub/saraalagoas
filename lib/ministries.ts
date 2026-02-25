import type { SupabaseClient } from '@supabase/supabase-js'

export type MinistryRow = { id: string; name: string }

export function normalizeMinistryNames(input: unknown): string[] {
  if (!Array.isArray(input)) return []
  const byKey = new Map<string, string>()
  for (const value of input) {
    if (typeof value !== 'string') continue
    const trimmed = value.trim()
    if (!trimmed) continue
    const key = trimmed.toLowerCase()
    if (!byKey.has(key)) byKey.set(key, trimmed)
  }
  return Array.from(byKey.values())
}

export async function ensureMinistryIds(
  supabase: SupabaseClient,
  names: string[]
): Promise<string[]> {
  if (!names.length) return []

  const { data: existing } = await supabase
    .from('ministries')
    .select('id, name')
    .in('name', names)

  const existingByKey = new Map<string, string>()
  for (const row of (existing as MinistryRow[]) || []) {
    existingByKey.set(row.name.toLowerCase(), row.id)
  }

  const missing = names.filter((name) => !existingByKey.has(name.toLowerCase()))

  let created: MinistryRow[] = []
  if (missing.length) {
    const { data: inserted, error: insertError } = await supabase
      .from('ministries')
      .insert(missing.map((name) => ({ name })))
      .select('id, name')

    if (insertError && insertError.code !== '23505') {
      throw insertError
    }

    if (Array.isArray(inserted)) {
      created = inserted as MinistryRow[]
    }

    if (!created.length) {
      const { data: refetched } = await supabase
        .from('ministries')
        .select('id, name')
        .in('name', names)

      return ((refetched as MinistryRow[]) || []).map((row) => row.id)
    }
  }

  return [...(existing as MinistryRow[] || []), ...created].map((row) => row.id)
}

export async function replacePersonMinistries(
  supabase: SupabaseClient,
  personId: string,
  names: string[]
): Promise<string[]> {
  const normalized = normalizeMinistryNames(names)

  await supabase
    .from('people_ministries')
    .delete()
    .eq('person_id', personId)

  if (!normalized.length) return []

  const ministryIds = await ensureMinistryIds(supabase, normalized)
  if (!ministryIds.length) return []

  const { error } = await supabase
    .from('people_ministries')
    .insert(ministryIds.map((ministryId) => ({ person_id: personId, ministry_id: ministryId })))

  if (error) {
    throw error
  }

  return normalized
}

export async function fetchPersonMinistries(
  supabase: SupabaseClient,
  personId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from('people_ministries')
    .select('ministry: ministry_id(name)')
    .eq('person_id', personId)

  if (error || !Array.isArray(data)) return []

  return data
    .map((row) => (row as { ministry?: { name?: string | null } }).ministry?.name)
    .filter((name): name is string => !!name)
}
