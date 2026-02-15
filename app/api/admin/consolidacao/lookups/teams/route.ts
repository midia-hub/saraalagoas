import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

const LIMIT = 20

/**
 * GET /api/admin/consolidacao/lookups/teams?q=&arena_id=&church_id=
 * arena_id opcional: filtra equipes da arena informada.
 * church_id opcional: filtra equipes da igreja informada.
 */
export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'consolidacao', action: 'view' })
  if (!access.ok) return access.response

  try {
    const q = (request.nextUrl.searchParams.get('q') ?? '').trim()
    const arenaId = request.nextUrl.searchParams.get('arena_id') ?? ''
    const churchId = request.nextUrl.searchParams.get('church_id') ?? ''
    const supabase = createSupabaseAdminClient(request)

    let query = supabase
      .from('teams')
      .select('id, name, church_id, arena_id')
      .order('name')
      .limit(LIMIT)

    if (arenaId) {
      query = query.eq('arena_id', arenaId)
    }
    if (churchId) {
      query = query.eq('church_id', churchId)
    }
    if (q) {
      query = query.ilike('name', `%${q.replace(/%/g, '\\%')}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error('Lookup teams:', error)
      return NextResponse.json({ error: 'Erro ao buscar equipes' }, { status: 500 })
    }

    const items = (data ?? []).map((r: { id: string; name: string; church_id: string | null; arena_id: string | null }) => ({
      id: r.id,
      label: r.name,
      name: r.name,
      church_id: r.church_id,
      arena_id: r.arena_id,
    }))

    return NextResponse.json({ items })
  } catch (err) {
    console.error('GET lookups/teams:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
