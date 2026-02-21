import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'
const PUBLIC_CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
}

const LIMIT = 30

/**
 * GET /api/public/consolidacao/people?q=
 * Lista pessoas (Líder/Consolidador) para o formulário público (sem auth).
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

    let query = supabase
      .from('people')
      .select('id, full_name')
      .order('full_name')
      .limit(LIMIT)

    if (q) query = query.ilike('full_name', `%${q.replace(/%/g, '\\%')}%`)

    const { data, error } = await query

    if (error) {
      console.error('GET public people:', error)
      return NextResponse.json({ error: 'Erro ao buscar pessoas' }, { status: 500 })
    }

    const items = (data ?? []).map((r: { id: string; full_name: string }) => ({
      id: r.id,
      label: r.full_name,
    }))

    return NextResponse.json({ items }, { headers: PUBLIC_CACHE_HEADERS })
  } catch (err) {
    console.error('GET public people:', err)
    return NextResponse.json({ error: 'Erro ao carregar pessoas' }, { status: 500 })
  }
}
