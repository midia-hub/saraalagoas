import { Calendar, Clock, Lock, CheckCircle, Loader2 } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Game {
  id: string
  home_team: string
  away_team: string
  game_date: string
  status: 'open' | 'closed' | 'finished'
  brazil_score: number | null
  opponent_score: number | null
}

const STATUS_LABEL: Record<Game['status'], { label: string; color: string; Icon: typeof Lock }> = {
  open: { label: 'Palpites abertos', color: 'text-green-600 bg-green-50 border-green-200', Icon: CheckCircle },
  closed: { label: 'Aguardando resultado', color: 'text-amber-600 bg-amber-50 border-amber-200', Icon: Loader2 },
  finished: { label: 'Finalizado', color: 'text-gray-600 bg-gray-50 border-gray-200', Icon: Lock },
}

export function GameCard({ game }: { game: Game }) {
  const { label, color, Icon } = STATUS_LABEL[game.status]
  const date = parseISO(game.game_date)
  const isFinished = game.status === 'finished'

  return (
    <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
      {/* Topo verde com status */}
      <div className="bg-gradient-to-r from-green-700 to-green-600 px-5 py-3 flex items-center justify-between">
        <span className="text-white font-bold text-sm uppercase tracking-wide">Jogo do Brasil</span>
        <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${color}`}>
          <Icon size={11} />
          {label}
        </span>
      </div>

      <div className="px-5 py-6">
        {/* Placar */}
        <div className="flex items-center justify-center gap-4 mb-5">
          {/* Brasil */}
          <div className="flex-1 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="text-2xl">🇧🇷</span>
              <span className="font-black text-gray-900 text-lg">{game.home_team}</span>
            </div>
            {isFinished && game.brazil_score !== null ? (
              <div className="text-5xl font-black text-green-700">{game.brazil_score}</div>
            ) : (
              <div className="text-5xl font-black text-gray-200">—</div>
            )}
          </div>

          {/* VS */}
          <div className="flex flex-col items-center gap-1 px-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">vs</span>
            {isFinished && game.brazil_score !== null && game.opponent_score !== null && (
              <div className="w-0.5 h-8 bg-gray-200 rounded" />
            )}
          </div>

          {/* Adversário */}
          <div className="flex-1 text-center">
            <div className="font-black text-gray-900 text-lg mb-1">{game.away_team}</div>
            {isFinished && game.opponent_score !== null ? (
              <div className="text-5xl font-black text-gray-700">{game.opponent_score}</div>
            ) : (
              <div className="text-5xl font-black text-gray-200">—</div>
            )}
          </div>
        </div>

        {/* Data e hora */}
        <div className="flex items-center justify-center gap-4 text-sm text-gray-500 border-t border-gray-100 pt-4">
          <span className="flex items-center gap-1.5">
            <Calendar size={14} className="text-green-600 shrink-0" />
            {format(date, "dd 'de' MMMM", { locale: ptBR })}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock size={14} className="text-green-600 shrink-0" />
            {format(date, 'HH:mm')}
          </span>
        </div>

        {/* Botão de palpite */}
        {game.status === 'open' && (
          <a
            href="#palpitar"
            className="mt-4 w-full flex items-center justify-center bg-green-600 hover:bg-green-500 active:scale-95 text-white font-black py-3.5 rounded-xl transition-all shadow-md shadow-green-600/20"
          >
            Palpitar agora
          </a>
        )}
        {game.status === 'closed' && (
          <div className="mt-4 text-center text-sm text-amber-600 font-semibold">
            Palpites encerrados — aguardando resultado oficial
          </div>
        )}
      </div>
    </div>
  )
}

export function NoGameCard() {
  return (
    <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-8 text-center">
      <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <Calendar size={28} className="text-green-600" />
      </div>
      <h3 className="font-bold text-gray-900 mb-2">Nenhum jogo cadastrado ainda</h3>
      <p className="text-gray-500 text-sm">
        Em breve os jogos do Brasil serão divulgados aqui. Fique de olho!
      </p>
    </div>
  )
}
