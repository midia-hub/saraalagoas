import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

export async function GET() {
  try {
    const supabase = createSupabaseAdminClient()

    const [gamesResult, teamsResult] = await Promise.all([
      supabase
        .schema('bolao_copa')
        .from('games')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1),
      supabase
        .schema('bolao_copa')
        .from('teams')
        .select('id, name, slug, color, secondary_color')
        .order('name'),
    ])

    if (gamesResult.error) throw gamesResult.error
    if (teamsResult.error) throw teamsResult.error

    return NextResponse.json({
      game: gamesResult.data?.[0] ?? null,
      teams: teamsResult.data ?? [],
    })
  } catch (error) {
    console.error('[bolao/games] Erro:', error)
    return NextResponse.json({ error: 'Erro ao buscar dados do jogo.' }, { status: 500 })
  }
}
