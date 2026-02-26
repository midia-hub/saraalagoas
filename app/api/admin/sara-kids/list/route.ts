import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

/**
 * GET /api/admin/sara-kids/list
 * Retorna os vínculos kids mais recentes com dados de adulto e criança.
 */
export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'pessoas', action: 'view' })
  if (!access.ok) return access.response

  const supabase = createSupabaseAdminClient(request)

  const { data, error } = await supabase
    .from('people_kids_links')
    .select(
      'adult_id, child_id, relationship_type, created_at, ' +
      'adult:people!adult_id(full_name), ' +
      'child:people!child_id(full_name, birth_date)'
    )
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('sara-kids list:', error)
    return NextResponse.json({ entries: [] })
  }

  const entries = ((data ?? []) as unknown as Array<{
    adult_id: string
    child_id: string
    relationship_type: string
    created_at: string
    adult: { full_name: string } | Array<{ full_name: string }> | null
    child: { full_name: string; birth_date: string | null } | Array<{ full_name: string; birth_date: string | null }> | null
  }>).map((row) => {
    const adultRec = Array.isArray(row.adult) ? row.adult[0] : row.adult
    const childRec = Array.isArray(row.child) ? row.child[0] : row.child
    return {
      adult_id: row.adult_id,
      adult_name: adultRec?.full_name ?? '—',
      child_id: row.child_id,
      child_name: childRec?.full_name ?? '—',
      child_birth_date: childRec?.birth_date ?? null,
      relationship_type: row.relationship_type,
      created_at: row.created_at,
    }
  })

  return NextResponse.json({ entries })
}
