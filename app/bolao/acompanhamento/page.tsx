import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { RankingSection } from '@/components/bolao/RankingSection'
import { ArrowLeft, Trophy, Users, Target, Zap } from 'lucide-react'

async function getData() {
  try {
    const supabase = createSupabaseAdminClient()

    const [guessesRes, gamesRes, teamsRes] = await Promise.all([
      supabase
        .schema('bolao_copa')
        .from('guesses')
        .select('id, participant_name, team_id, brazil_guess, opponent_guess, points, created_at')
        .order('points', { ascending: false })
        .order('created_at', { ascending: true }),
      supabase
        .schema('bolao_copa')
        .from('games')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1),
      supabase.schema('bolao_copa').from('teams').select('id, name, slug, color, secondary_color'),
    ])

    const guesses = guessesRes.data ?? []
    const game = gamesRes.data?.[0] ?? null
    const teams = teamsRes.data ?? []

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
        avgPoints: s.totalGuesses > 0 ? Number((s.totalPoints / s.totalGuesses).toFixed(1)) : 0,
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

    return {
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
    }
  } catch {
    return {
      game: null,
      teams: [],
      teamRanking: [],
      individualRanking: [],
      summary: { totalGuesses: 0, uniqueParticipants: 0, uniqueTeams: 0, leadingTeam: null },
    }
  }
}

export const revalidate = 30

export default async function AcompanhamentoPage() {
  const { game, teamRanking, individualRanking, summary } = await getData()
  const showResult = game?.status === 'finished' && game.brazil_score !== null

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-green-950 to-green-800 text-white px-4 pt-10 pb-8">
        <div className="max-w-lg mx-auto">
          <a href="/" className="inline-flex items-center gap-1.5 text-green-300 text-sm mb-5 hover:text-white transition-colors">
            <ArrowLeft size={14} />
            Voltar
          </a>
          <h1 className="text-2xl font-black mb-1">Acompanhamento</h1>
          <p className="text-green-300 text-sm">
            {game
              ? `Brasil × ${game.away_team}`
              : 'Bolão Arena da Copa'}
          </p>

          {/* Jogo atual */}
          {game && (
            <div className="mt-4 bg-white/10 rounded-2xl px-5 py-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-green-300 uppercase tracking-wider font-bold mb-1">
                  {game.status === 'open' && 'Palpites abertos'}
                  {game.status === 'closed' && 'Aguardando resultado'}
                  {game.status === 'finished' && 'Jogo finalizado'}
                </p>
                <p className="font-black text-white text-lg">
                  Brasil × {game.away_team}
                </p>
              </div>
              {showResult && (
                <div className="text-right">
                  <p className="text-4xl font-black text-yellow-400">
                    {game.brazil_score}×{game.opponent_score}
                  </p>
                  <p className="text-xs text-green-300">resultado oficial</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Cards resumo */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
              <Target size={18} className="text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-black text-gray-900">{summary.totalGuesses}</p>
              <p className="text-xs text-gray-400 font-semibold">Palpites</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
              <Users size={18} className="text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-black text-gray-900">{summary.uniqueParticipants}</p>
              <p className="text-xs text-gray-400 font-semibold">Participantes</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-yellow-50 flex items-center justify-center shrink-0">
              <Trophy size={18} className="text-yellow-500" />
            </div>
            <div className="min-w-0">
              <p
                className="text-base font-black truncate"
                style={{ color: summary.leadingTeam?.color ?? '#111827' }}
              >
                {summary.leadingTeam?.name ?? '—'}
              </p>
              <p className="text-xs text-gray-400 font-semibold">Equipe líder</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
              <Zap size={18} className="text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-black text-gray-900">{summary.uniqueTeams}</p>
              <p className="text-xs text-gray-400 font-semibold">Equipes</p>
            </div>
          </div>
        </div>

        {/* Ranking */}
        <RankingSection
          teamRanking={teamRanking}
          individualRanking={individualRanking}
          homeTeam={game?.home_team ?? 'Brasil'}
          awayTeam={game?.away_team ?? 'Adversário'}
          showResult={!!showResult}
        />

        {/* Regras resumidas */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-black text-gray-900 text-sm mb-3">Pontuação</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex justify-between"><span>Placar exato</span><strong className="text-green-700">10 pts</strong></div>
            <div className="flex justify-between"><span>Acertou o vencedor ou empate</span><strong className="text-green-700">5 pts</strong></div>
            <div className="flex justify-between"><span>Acertou apenas um placar</span><strong className="text-green-700">2 pts</strong></div>
            <div className="flex justify-between"><span>Participou</span><strong className="text-green-700">1 pt</strong></div>
          </div>
          <p className="text-xs text-gray-400 mt-3">
            A pontuação é calculada após o resultado oficial ser inserido pela liderança.
          </p>
        </div>

        {/* Aviso de privacidade */}
        <p className="text-xs text-gray-400 text-center">
          Números de WhatsApp não são exibidos publicamente.
        </p>
      </div>

      <footer className="border-t border-gray-100 py-5 text-center text-xs text-gray-400">
        <a href="/" className="text-green-600 hover:underline font-semibold">
          Bolão Arena da Copa
        </a>
        {' · '}Arena Sede Maceió · Sábados às 17h
      </footer>
    </main>
  )
}
