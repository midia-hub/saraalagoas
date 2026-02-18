import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

const LIMIT = 30

/**
 * GET /api/public/consolidacao/cells?q=&church_id=
 * Lista células para o formulário público (sem auth). Opcional: church_id para filtrar por igreja.
 */
export async function GET(request: NextRequest) {
  let supabase: ReturnType<typeof createSupabaseServiceClient>
  try {
    supabase = createSupabaseServiceClient()
  } catch {
    return NextResponse.json({ error: 'Serviço indisponível' }, { status: 503 })
  }
  try {
    const q = (request.nextUrl.searchParams.get('q') ?? '').trim()
    const churchId = request.nextUrl.searchParams.get('church_id') ?? ''

    let query = supabase
      .from('cells')
      .select('id, name, leader_person_id, leader:people!leader_person_id(full_name)')
      .order('name')
      .limit(LIMIT)

    if (churchId) query = query.eq('church_id', churchId)
    if (q) query = query.ilike('name', `%${q.replace(/%/g, '\\%')}%`)

    const { data, error } = await query

    if (error) {
      console.error('GET public cells:', error)
      return NextResponse.json({ error: 'Erro ao buscar células' }, { status: 500 })
    }

    const items = (data ?? []).map((row: { id: string; name: string; leader?: { full_name: string }[] | { full_name: string } | null }) => {
      const leader = row.leader
      const leaderName = Array.isArray(leader) ? leader[0]?.full_name : (leader && typeof leader === 'object' && 'full_name' in leader ? (leader as { full_name: string }).full_name : null)
      const label = leaderName ? `${row.name} — ${leaderName}` : `${row.name} — Sem líder`
      return { id: row.id, label }
    })

    return NextResponse.json({ items })
  } catch (err) {
    console.error('GET public cells:', err)
    return NextResponse.json({ error: 'Erro ao carregar células' }, { status: 500 })
  }
}
