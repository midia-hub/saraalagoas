import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'
const PUBLIC_CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
}

/** GET - lista equipes (público). Opcional: ?church_id= para filtrar por igreja */
export async function GET(request: NextRequest) {
  try {
    const churchId = request.nextUrl.searchParams.get('church_id') ?? ''
    const supabase = createSupabaseServiceClient()
    let query = supabase.from('teams').select('id, name, church_id').order('name')
    if (churchId) query = query.eq('church_id', churchId)
    const { data, error } = await query
    if (error) {
      console.error('GET public teams:', error)
      return NextResponse.json({ error: 'Erro ao carregar equipes' }, { status: 500 })
    }
    return NextResponse.json({ items: data ?? [] }, { headers: PUBLIC_CACHE_HEADERS })
  } catch (err) {
    console.error('GET public teams:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
