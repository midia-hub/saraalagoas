import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

const LIMIT = 20

/**
 * GET /api/admin/consolidacao/lookups/people?q=
 * Lista pessoas para dropdown (Líder/Consolidador). Retorna id, full_name.
 */
export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'consolidacao', action: 'view' })
  if (!access.ok) return access.response

  try {
    const q = (request.nextUrl.searchParams.get('q') ?? '').trim()
    const supabase = createSupabaseAdminClient(request)

    let query = supabase
      .from('people')
      .select('id, full_name')
      .order('full_name')
      .limit(LIMIT)

    if (q) {
      query = query.ilike('full_name', `%${q.replace(/%/g, '\\%')}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error('Lookup people:', error)
      return NextResponse.json({ error: 'Erro ao buscar pessoas' }, { status: 500 })
    }

    const items = (data ?? []).map((r: { id: string; full_name: string }) => ({
      id: r.id,
      label: r.full_name,
      full_name: r.full_name,
    }))

    return NextResponse.json({ items })
  } catch (err) {
    console.error('GET lookups/people:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
