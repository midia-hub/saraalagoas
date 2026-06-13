import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

export async function GET() {
  try {
    const supabase = createSupabaseAdminClient()

    const [guessesResult, gamesResult, teamsResult] = await Promise.all([
      supabase
        .schema('bolao_copa')
        .from('guesses')
        .select('id, participant_name, team_id, brazil_guess, opponent_guess, points, created_at, game_id')
        .order('points', { ascending: false })
        .order('created_at', { ascending: true }),
      supabase
        .schema('bolao_copa')
        .from('games')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1),
      supabase
        .schema('bolao_copa')
        .from('teams')
        .select('id, name, slug, color, secondary_color'),
    ])

    if (guessesResult.error) throw guessesResult.error
    if (gamesResult.error) throw gamesResult.error
    if (teamsResult.error) throw teamsResult.error

    const guesses = guessesResult.data ?? []
    const game = gamesResult.data?.[0] ?? null
    const teams = teamsResult.data ?? []

    type Team = (typeof teams)[0]
    const teamMap: Record<string, Team> = Object.fromEntries(teams.map((t) => [t.id, t]))

    const teamStats: Record<
      string,
      { team: Team; participants: Set<string>; totalPoints: number; totalGuesses: number }
    > = {}

    for (const g of guesses) {
      if (!teamStats[g.team_id]) {
        teamStats[g.team_id] = {
          team: teamMap[g.team_id],
          participants: new Set(),
          totalPoints: 0,
          totalGuesses: 0,
        }
      }
      teamStats[g.team_id].participants.add(g.participant_name)
      teamStats[g.team_id].totalPoints += g.points ?? 0
      teamStats[g.team_id].totalGuesses += 1
    }

    const teamRanking = Object.values(teamStats)
      .map((s) => ({
        team: s.team,
        totalParticipants: s.participants.size,
        totalPoints: s.totalPoints,
        totalGuesses: s.totalGuesses,
        avgPoints:
          s.totalGuesses > 0 ? Number((s.totalPoints / s.totalGuesses).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.totalPoints - a.totalPoints)

    const individualRanking = guesses.map((g, idx) => ({
      position: idx + 1,
      name: g.participant_name,
      team: teamMap[g.team_id] ?? null,
      brazilGuess: g.brazil_guess,
      opponentGuess: g.opponent_guess,
      points: g.points ?? 0,
      createdAt: g.created_at,
    }))

    const uniqueParticipants = new Set(guesses.map((g) => g.participant_name)).size
    const uniqueTeams = new Set(guesses.map((g) => g.team_id)).size

    return NextResponse.json({
      game,
      teams,
      teamRanking,
      individualRanking,
      summary: {
        totalGuesses: guesses.length,
        uniqueParticipants,
        uniqueTeams,
        leadingTeam: teamRanking[0]?.team ?? null,
      },
    })
  } catch (error) {
    console.error('[bolao/ranking] Erro:', error)
    return NextResponse.json({ error: 'Erro ao buscar ranking.' }, { status: 500 })
  }
}
