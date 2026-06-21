import { NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

const PUBLIC_CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
}

export async function GET() {
  try {
    const supabase = createSupabaseServiceClient()
    const nowIso = new Date().toISOString()

    const { data, error } = await supabase
      .from('room_reservations')
      .select('id, start_datetime, end_datetime, reason, room:room_id(name)')
      .eq('status', 'approved')
      .gte('end_datetime', nowIso)
      .order('start_datetime', { ascending: true })
      .limit(12)

    if (error) {
      console.error('GET public reservas/upcoming:', error)
      return NextResponse.json({ error: 'Erro ao carregar reservas' }, { status: 500 })
    }

    return NextResponse.json({ items: data ?? [] }, { headers: PUBLIC_CACHE_HEADERS })
  } catch (err) {
    console.error('GET public reservas/upcoming:', err)
    return NextResponse.json({ error: 'Servico indisponivel' }, { status: 503 })
  }
}
