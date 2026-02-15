import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

const LIMIT = 20

/**
 * GET /api/admin/consolidacao/lookups/churches?q=
 */
export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'consolidacao', action: 'view' })
  if (!access.ok) return access.response

  try {
    const q = (request.nextUrl.searchParams.get('q') ?? '').trim()
    const supabase = createSupabaseAdminClient(request)

    let query = supabase
      .from('churches')
      .select('id, name')
      .order('name')
      .limit(LIMIT)

    if (q) {
      query = query.ilike('name', `%${q.replace(/%/g, '\\%')}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error('Lookup churches:', error)
      return NextResponse.json({ error: 'Erro ao buscar igrejas' }, { status: 500 })
    }

    const items = (data ?? []).map((r: { id: string; name: string }) => ({
      id: r.id,
      label: r.name,
      name: r.name,
    }))

    return NextResponse.json({ items })
  } catch (err) {
    console.error('GET lookups/churches:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
