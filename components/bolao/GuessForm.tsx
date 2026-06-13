'use client'

import { useState } from 'react'
import { Send, CheckCircle, AlertCircle, Minus, Plus } from 'lucide-react'
import { TeamSelector } from './TeamSelector'

interface Team {
  id: string
  name: string
  slug: string
  color: string
  secondary_color: string | null
}

interface Game {
  id: string
  home_team: string
  away_team: string
  status: string
}

interface GuessFormProps {
  game: Game
  teams: Team[]
}

function ScoreInput({
  label,
  value,
  onChange,
  teamColor,
}: {
  label: string
  value: number | ''
  onChange: (v: number) => void
  teamColor?: string
}) {
  const num = value === '' ? 0 : value

  return (
    <div className="flex-1 text-center">
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{label}</p>
      <div className="flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(0, num - 1))}
          className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center active:scale-90 transition-all"
        >
          <Minus size={16} />
        </button>
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-black"
          style={
            teamColor
              ? { background: teamColor, color: '#fff' }
              : { background: '#f1f5f9', color: '#111827' }
          }
        >
          {value === '' ? '0' : value}
        </div>
        <button
          type="button"
          onClick={() => onChange(Math.min(99, num + 1))}
          className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center active:scale-90 transition-all"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  )
}

export function GuessForm({ game, teams }: GuessFormProps) {
  const [name, setName] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [teamId, setTeamId] = useState('')
  const [brazilGuess, setBrazilGuess] = useState<number | ''>(0)
  const [opponentGuess, setOpponentGuess] = useState<number | ''>(0)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const selectedTeam = teams.find((t) => t.id === teamId)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Informe seu nome.'); return }
    if (!whatsapp.trim()) { setError('Informe seu WhatsApp.'); return }
    if (!teamId) { setError('Selecione sua equipe.'); return }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/bolao/guess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game_id: game.id,
          team_id: teamId,
          participant_name: name.trim(),
          whatsapp: whatsapp.trim(),
          brazil_guess: brazilGuess === '' ? 0 : brazilGuess,
          opponent_guess: opponentGuess === '' ? 0 : opponentGuess,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Erro ao enviar palpite.')
        return
      }

      setSuccess(true)
    } catch {
      setError('Erro de conexão. Verifique sua internet e tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  if (game.status !== 'open') {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center">
        <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mx-auto mb-3">
          <AlertCircle size={24} className="text-amber-600" />
        </div>
        <h3 className="font-bold text-amber-800 mb-1">Palpites encerrados</h3>
        <p className="text-amber-700 text-sm">
          {game.status === 'closed'
            ? 'Os palpites foram encerrados. Aguarde o resultado!'
            : 'Este jogo já foi finalizado.'}
        </p>
      </div>
    )
  }

  if (success) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
        <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={32} className="text-green-600" />
        </div>
        <h3 className="text-xl font-black text-green-800 mb-2">Palpite enviado!</h3>
        <p className="text-green-700 text-sm leading-relaxed">
          Palpite enviado com sucesso!<br />Agora é torcer pelo Brasil e pela sua equipe!
        </p>
        <a
          href="/acompanhamento"
          className="inline-block mt-5 bg-green-600 text-white font-bold px-6 py-3 rounded-xl text-sm hover:bg-green-500 transition-colors"
        >
          Ver o ranking
        </a>
      </div>
    )
  }

  return (
    <form id="palpitar" onSubmit={handleSubmit} className="space-y-6">
      {/* Nome */}
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-1.5">
          Seu nome <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Como você quer aparecer no ranking"
          className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-shadow"
          maxLength={100}
          required
        />
      </div>

      {/* WhatsApp */}
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-1.5">
          WhatsApp <span className="text-red-500">*</span>
        </label>
        <input
          type="tel"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          placeholder="(82) 99999-9999"
          className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-shadow"
          required
        />
        <p className="text-xs text-gray-400 mt-1">
          Usado apenas para controle de duplicidade — não será exibido publicamente.
        </p>
      </div>

      {/* Equipe */}
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">
          Sua equipe <span className="text-red-500">*</span>
        </label>
        <TeamSelector teams={teams} selectedId={teamId} onChange={setTeamId} />
      </div>

      {/* Palpite do placar */}
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-3">
          Palpite do placar <span className="text-red-500">*</span>
        </label>
        <div className="bg-gray-50 rounded-2xl p-5 flex items-center gap-4">
          <ScoreInput
            label={game.home_team}
            value={brazilGuess}
            onChange={setBrazilGuess}
            teamColor={selectedTeam?.color}
          />
          <div className="text-2xl font-black text-gray-300">×</div>
          <ScoreInput
            label={game.away_team}
            value={opponentGuess}
            onChange={setOpponentGuess}
          />
        </div>
      </div>

      {/* Erro */}
      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* LGPD */}
      <p className="text-xs text-gray-400 text-center leading-relaxed">
        Seu nome e número serão usados apenas para identificação no Bolão Arena da Copa e organização interna da liderança.
      </p>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 disabled:bg-gray-300 text-white font-black text-lg py-4 rounded-2xl transition-all active:scale-95 shadow-lg shadow-green-600/20"
      >
        {loading ? (
          <>
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Enviando...
          </>
        ) : (
          <>
            <Send size={20} />
            Enviar palpite
          </>
        )}
      </button>
    </form>
  )
}
