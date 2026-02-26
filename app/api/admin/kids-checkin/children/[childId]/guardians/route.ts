import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

/**
 * GET /api/admin/kids-checkin/children/[childId]/guardians
 * Retorna os responsáveis (adultos vinculados) de uma criança.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { childId: string } }
) {
  const access = await requireAccess(request, { pageKey: 'pessoas', action: 'view' })
  if (!access.ok) return access.response

  const { childId } = params
  if (!childId) {
    return NextResponse.json({ error: 'childId obrigatório.' }, { status: 400 })
  }

  const supabase = createSupabaseAdminClient(request)

  const { data, error } = await supabase
    .from('people_kids_links')
    .select(
      `adult_id, relationship_type,
       adult:people!adult_id(id, full_name)`
    )
    .eq('child_id', childId)

  if (error) {
    console.error('[guardians GET]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Normaliza para um array simples
  const guardians = (data ?? []).map((row: any) => ({
    id: row.adult?.id ?? row.adult_id,
    full_name: row.adult?.full_name ?? '—',
    relationship_type: row.relationship_type ?? '',
  }))

  return NextResponse.json({ guardians })
}
