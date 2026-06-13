import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { normalizePhone, isValidPhone } from '@/lib/bolao/phone'
import { z } from 'zod'

const guessSchema = z.object({
  game_id: z.string().uuid(),
  team_id: z.string().uuid(),
  participant_name: z.string().min(2).max(100),
  whatsapp: z.string(),
  brazil_guess: z.number().int().min(0).max(99),
  opponent_guess: z.number().int().min(0).max(99),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = guessSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Dados inválidos. Verifique os campos e tente novamente.' }, { status: 400 })
    }

    const { game_id, team_id, participant_name, whatsapp, brazil_guess, opponent_guess } = parsed.data
    const whatsapp_normalized = normalizePhone(whatsapp)

    if (!isValidPhone(whatsapp)) {
      return NextResponse.json({ error: 'Número de WhatsApp inválido.' }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient()

    const { data: game, error: gameError } = await supabase
      .schema('bolao_copa')
      .from('games')
      .select('id, status')
      .eq('id', game_id)
      .single()

    if (gameError || !game) {
      return NextResponse.json({ error: 'Jogo não encontrado.' }, { status: 404 })
    }

    if (game.status !== 'open') {
      return NextResponse.json(
        { error: 'Os palpites para este jogo estão encerrados.' },
        { status: 403 }
      )
    }

    const { error: insertError } = await supabase
      .schema('bolao_copa')
      .from('guesses')
      .insert({
        game_id,
        team_id,
        participant_name: participant_name.trim(),
        whatsapp,
        whatsapp_normalized,
        brazil_guess,
        opponent_guess,
        points: 0,
      })

    if (insertError) {
      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: 'Você já enviou seu palpite para este jogo. Após o envio, não é possível alterar.' },
          { status: 409 }
        )
      }
      throw insertError
    }

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    console.error('[bolao/guess] Erro:', error)
    return NextResponse.json({ error: 'Erro ao salvar palpite. Tente novamente.' }, { status: 500 })
  }
}
