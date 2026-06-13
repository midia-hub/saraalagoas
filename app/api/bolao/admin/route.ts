import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { calculateGuessPoints } from '@/lib/bolao/scoring'
import { z } from 'zod'

function checkAdminAuth(request: NextRequest): boolean {
  const secret = process.env.ADMIN_SECRET
  if (!secret) return false
  return (
    request.headers.get('x-admin-secret') === secret ||
    request.cookies.get('admin_secret')?.value === secret
  )
}

const createGameSchema = z.object({
  action: z.literal('create_game'),
  away_team: z.string().min(1).max(100),
  game_date: z.string().datetime(),
})

const updateStatusSchema = z.object({
  action: z.literal('update_status'),
  game_id: z.string().uuid(),
  status: z.enum(['open', 'closed', 'finished']),
})

const setResultSchema = z.object({
  action: z.literal('set_result'),
  game_id: z.string().uuid(),
  brazil_score: z.number().int().min(0),
  opponent_score: z.number().int().min(0),
})

const recalculateSchema = z.object({
  action: z.literal('recalculate'),
  game_id: z.string().uuid(),
})

export async function POST(request: NextRequest) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const supabase = createSupabaseAdminClient()

    if (body.action === 'create_game') {
      const parsed = createGameSchema.safeParse(body)
      if (!parsed.success) return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })

      const { data, error } = await supabase
        .schema('bolao_copa')
        .from('games')
        .insert({ away_team: parsed.data.away_team, game_date: parsed.data.game_date, status: 'open' })
        .select()
        .single()

      if (error) throw error
      return NextResponse.json({ game: data })
    }

    if (body.action === 'update_status') {
      const parsed = updateStatusSchema.safeParse(body)
      if (!parsed.success) return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })

      const { data, error } = await supabase
        .schema('bolao_copa')
        .from('games')
        .update({ status: parsed.data.status, updated_at: new Date().toISOString() })
        .eq('id', parsed.data.game_id)
        .select()
        .single()

      if (error) throw error
      return NextResponse.json({ game: data })
    }

    if (body.action === 'set_result') {
      const parsed = setResultSchema.safeParse(body)
      if (!parsed.success) return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })

      const { data, error } = await supabase
        .schema('bolao_copa')
        .from('games')
        .update({
          brazil_score: parsed.data.brazil_score,
          opponent_score: parsed.data.opponent_score,
          updated_at: new Date().toISOString(),
        })
        .eq('id', parsed.data.game_id)
        .select()
        .single()

      if (error) throw error
      return NextResponse.json({ game: data })
    }

    if (body.action === 'recalculate') {
      const parsed = recalculateSchema.safeParse(body)
      if (!parsed.success) return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })

      const { data: game, error: gameError } = await supabase
        .schema('bolao_copa')
        .from('games')
        .select('brazil_score, opponent_score')
        .eq('id', parsed.data.game_id)
        .single()

      if (gameError || !game) {
        return NextResponse.json({ error: 'Jogo não encontrado.' }, { status: 404 })
      }
      if (game.brazil_score === null || game.opponent_score === null) {
        return NextResponse.json({ error: 'Insira o resultado antes de recalcular.' }, { status: 400 })
      }

      const { data: guesses, error: guessesError } = await supabase
        .schema('bolao_copa')
        .from('guesses')
        .select('id, brazil_guess, opponent_guess')
        .eq('game_id', parsed.data.game_id)

      if (guessesError) throw guessesError

      const now = new Date().toISOString()
      let updated = 0
      for (const g of guesses ?? []) {
        const points = calculateGuessPoints(
          { brazil_guess: g.brazil_guess, opponent_guess: g.opponent_guess },
          { brazil_score: game.brazil_score!, opponent_score: game.opponent_score! }
        )
        await supabase
          .schema('bolao_copa')
          .from('guesses')
          .update({ points, updated_at: now })
          .eq('id', g.id)
        updated++
      }

      return NextResponse.json({ success: true, updated, message: `${updated} palpite(s) recalculados.` })
    }

    return NextResponse.json({ error: 'Ação desconhecida.' }, { status: 400 })
  } catch (error) {
    console.error('[bolao/admin] Erro:', error)
    return NextResponse.json({ error: 'Erro interno. Tente novamente.' }, { status: 500 })
  }
}
