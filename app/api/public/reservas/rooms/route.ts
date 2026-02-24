import { NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

const PUBLIC_CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
}

export async function GET() {
  try {
    const supabase = createSupabaseServiceClient()
    const { data, error } = await supabase
      .from('rooms')
      .select('id, name, description, capacity, available_days, available_start_time, available_end_time, day_times')
      .eq('active', true)
      .order('name')

    if (error) {
      console.error('GET public reservas/rooms:', error)
      return NextResponse.json({ error: 'Erro ao carregar salas' }, { status: 500 })
    }

    return NextResponse.json({ items: data ?? [] }, { headers: PUBLIC_CACHE_HEADERS })
  } catch (err) {
    console.error('GET public reservas/rooms:', err)
    return NextResponse.json({ error: 'Servico indisponivel' }, { status: 503 })
  }
}
