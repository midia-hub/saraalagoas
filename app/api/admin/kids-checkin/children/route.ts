import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

/**
 * GET /api/admin/kids-checkin/children
 * Busca crianças cadastradas (is_child = true) para o seletor de check-in
 */
export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'pessoas', action: 'view' })
  if (!access.ok) return access.response

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim() ?? ''

  const supabase = createSupabaseAdminClient(request)

  let query = supabase
    .from('people')
    .select('id, full_name, birth_date')
    .or('is_child.eq.true')
    .order('full_name', { ascending: true })
    .limit(50)

  if (q.length >= 2) {
    query = query.ilike('full_name', `%${q}%`)
  }

  const { data, error } = await query

  if (error) {
    console.error('[kids-checkin/children GET]', error)
    return NextResponse.json({ children: [] })
  }

  return NextResponse.json({ children: data ?? [] })
}
