import { Trophy, Users } from 'lucide-react'

interface Team {
  id: string
  name: string
  slug: string
  color: string
}

interface TeamRankingItem {
  team: Team
  totalParticipants: number
  totalPoints: number
  totalGuesses: number
  avgPoints: number
}

interface IndividualItem {
  position: number
  name: string
  team: Team | null
  brazilGuess: number
  opponentGuess: number
  points: number
}

interface Props {
  teamRanking: TeamRankingItem[]
  individualRanking: IndividualItem[]
  homeTeam: string
  awayTeam: string
  showResult: boolean
}

const POSITION_COLORS = ['text-yellow-500', 'text-gray-400', 'text-amber-600']
const POSITION_MEDALS = ['🥇', '🥈', '🥉']

export function RankingSection({ teamRanking, individualRanking, homeTeam, awayTeam, showResult }: Props) {
  if (teamRanking.length === 0 && individualRanking.length === 0) {
    return (
      <div className="text-center py-10 text-gray-400">
        <Trophy size={40} className="mx-auto mb-3 opacity-30" />
        <p className="font-semibold">Ainda não temos palpites registrados.</p>
        <p className="text-sm mt-1">Seja o primeiro a participar!</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Ranking por equipe */}
      {teamRanking.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-yellow-400 to-yellow-300 px-5 py-3 flex items-center gap-2">
            <Trophy size={16} className="text-yellow-800" />
            <h3 className="font-black text-yellow-900 text-sm uppercase tracking-wide">Ranking das Equipes</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {teamRanking.map((item, idx) => (
              <div key={item.team?.id ?? idx} className="flex items-center gap-3 px-5 py-4">
                <span className="text-lg w-6 text-center shrink-0">
                  {idx < 3 ? POSITION_MEDALS[idx] : `${idx + 1}°`}
                </span>
                <div
                  className="w-3 h-10 rounded-full shrink-0"
                  style={{ backgroundColor: item.team?.color ?? '#ccc' }}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-black text-gray-900 text-sm truncate">{item.team?.name ?? '—'}</p>
                  <p className="text-xs text-gray-400">
                    {item.totalParticipants} participante{item.totalParticipants !== 1 ? 's' : ''} · média {item.avgPoints} pts
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-black text-green-700 text-lg leading-none">{item.totalPoints}</p>
                  <p className="text-xs text-gray-400">pontos</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ranking individual */}
      {individualRanking.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-green-700 px-5 py-3 flex items-center gap-2">
            <Users size={15} className="text-green-200" />
            <h3 className="font-black text-white text-sm uppercase tracking-wide">Ranking Individual</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {individualRanking.slice(0, 20).map((item) => (
              <div key={item.position} className="flex items-center gap-3 px-5 py-3">
                <span className={`font-black text-sm w-6 text-center shrink-0 ${POSITION_COLORS[item.position - 1] ?? 'text-gray-400'}`}>
                  {item.position <= 3 ? POSITION_MEDALS[item.position - 1] : `${item.position}°`}
                </span>
                <div
                  className="w-2 h-8 rounded-full shrink-0"
                  style={{ backgroundColor: item.team?.color ?? '#ccc' }}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 text-sm truncate">{item.name}</p>
                  <p className="text-xs text-gray-400 truncate">
                    {item.team?.name ?? '—'} · Palpite: {homeTeam.slice(0, 3)} {item.brazilGuess}×{item.opponentGuess} {awayTeam.slice(0, 3)}
                  </p>
                </div>
                {showResult && (
                  <div className="text-right shrink-0">
                    <p className="font-black text-green-700">{item.points}</p>
                    <p className="text-xs text-gray-400">pts</p>
                  </div>
                )}
              </div>
            ))}
            {individualRanking.length > 20 && (
              <div className="px-5 py-3 text-center text-xs text-gray-400">
                e mais {individualRanking.length - 20} participante(s)…
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
