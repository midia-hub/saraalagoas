import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

const LIMIT = 20

/**
 * GET /api/admin/consolidacao/lookups/cells?q=
 * Retorna células com label = "Nome da Célula — Nome do Líder"
 */
export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'consolidacao', action: 'view' })
  if (!access.ok) return access.response

  try {
    const q = (request.nextUrl.searchParams.get('q') ?? '').trim()
    const supabase = createSupabaseAdminClient(request)

    let query = supabase
      .from('cells')
      .select('id, name, leader_person_id, leader:people!leader_person_id(full_name)')
      .order('name')
      .limit(LIMIT)

    if (q) {
      query = query.ilike('name', `%${q.replace(/%/g, '\\%')}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error('Lookup cells:', error)
      return NextResponse.json({ error: 'Erro ao buscar células' }, { status: 500 })
    }

    const items = (data ?? []).map((row: { id: string; name: string; leader?: { full_name: string }[] | { full_name: string } | null }) => {
      const leader = row.leader
      const leaderName = Array.isArray(leader) ? leader[0]?.full_name : (leader && typeof leader === 'object' && 'full_name' in leader ? (leader as { full_name: string }).full_name : null)
      const label = leaderName ? `${row.name} — ${leaderName}` : `${row.name} — Sem líder`
      return { id: row.id, label, name: row.name, leaderName: leaderName ?? null }
    })

    return NextResponse.json({ items })
  } catch (err) {
    console.error('GET lookups/cells:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
