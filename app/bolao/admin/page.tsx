'use client'

import { useState, useEffect } from 'react'
import { Lock, Plus, RefreshCw, CheckCircle, AlertCircle, ChevronDown } from 'lucide-react'

interface Game {
  id: string
  home_team: string
  away_team: string
  game_date: string
  status: 'open' | 'closed' | 'finished'
  brazil_score: number | null
  opponent_score: number | null
}

const STATUS_LABELS = {
  open: 'Aberto (palpites aceitos)',
  closed: 'Encerrado (aguardando resultado)',
  finished: 'Finalizado (resultado publicado)',
}

function InputField({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="block text-sm font-bold text-gray-700 mb-1">{label}</label>
      <input
        {...props}
        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
      />
    </div>
  )
}

function Toast({ msg, type }: { msg: string; type: 'success' | 'error' }) {
  return (
    <div
      className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold ${
        type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
      }`}
    >
      {type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
      {msg}
    </div>
  )
}

export default function BolaoAdminPage() {
  const [secret, setSecret] = useState('')
  const [authenticated, setAuthenticated] = useState(false)
  const [authError, setAuthError] = useState('')

  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  // Formulário criar jogo
  const [newAwayTeam, setNewAwayTeam] = useState('')
  const [newGameDate, setNewGameDate] = useState('')

  // Formulário resultado
  const [resultGameId, setResultGameId] = useState('')
  const [brazilScore, setBrazilScore] = useState('')
  const [opponentScore, setOpponentScore] = useState('')

  function showToast(msg: string, type: 'success' | 'error') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  async function callAdmin(body: Record<string, unknown>) {
    const res = await fetch('/api/bolao/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? 'Erro desconhecido.')
    return data
  }

  async function loadGames() {
    try {
      const res = await fetch('/api/bolao/ranking')
      const data = await res.json()
      if (data.game) setGames([data.game])
    } catch {
      // silently fail
    }
  }

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault()
    setAuthError('')
    setLoading(true)
    try {
      // Testa autenticação criando uma requisição inválida — se der 401 é senha errada
      const res = await fetch('/api/bolao/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret },
        body: JSON.stringify({ action: 'ping' }),
      })
      if (res.status === 401) {
        setAuthError('Senha incorreta.')
        return
      }
      setAuthenticated(true)
      loadGames()
    } catch {
      setAuthError('Erro de conexão.')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateGame(e: React.FormEvent) {
    e.preventDefault()
    if (!newAwayTeam.trim() || !newGameDate) return
    setLoading(true)
    try {
      const data = await callAdmin({
        action: 'create_game',
        away_team: newAwayTeam.trim(),
        game_date: new Date(newGameDate).toISOString(),
      })
      showToast(`Jogo criado: Brasil × ${data.game.away_team}`, 'success')
      setNewAwayTeam('')
      setNewGameDate('')
      loadGames()
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Erro.', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleUpdateStatus(gameId: string, status: Game['status']) {
    setLoading(true)
    try {
      await callAdmin({ action: 'update_status', game_id: gameId, status })
      showToast('Status atualizado.', 'success')
      loadGames()
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Erro.', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleSetResult(e: React.FormEvent) {
    e.preventDefault()
    if (!resultGameId || brazilScore === '' || opponentScore === '') return
    setLoading(true)
    try {
      await callAdmin({
        action: 'set_result',
        game_id: resultGameId,
        brazil_score: Number(brazilScore),
        opponent_score: Number(opponentScore),
      })
      showToast('Resultado salvo.', 'success')
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Erro.', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleRecalculate(gameId: string) {
    setLoading(true)
    try {
      const data = await callAdmin({ action: 'recalculate', game_id: gameId })
      showToast(data.message, 'success')
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Erro.', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Tela de login
  if (!authenticated) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
            <div className="bg-green-700 px-6 py-5 text-center">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Lock size={22} className="text-white" />
              </div>
              <h1 className="text-white font-black text-lg">Admin · Bolão</h1>
              <p className="text-green-300 text-sm mt-1">Acesso restrito à liderança</p>
            </div>
            <form onSubmit={handleAuth} className="p-6 space-y-4">
              <InputField
                label="Senha de administrador"
                type="password"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder="••••••••"
                required
              />
              {authError && (
                <div className="text-red-600 text-sm font-semibold">{authError}</div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-700 hover:bg-green-600 text-white font-black py-3 rounded-xl transition-colors"
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
            </form>
          </div>
          <p className="text-center text-xs text-gray-400 mt-4">
            <a href="/" className="hover:underline">← Voltar para o Bolão</a>
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-green-800 text-white px-4 py-5">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <p className="text-xs text-green-300 uppercase tracking-widest font-bold">Admin</p>
            <h1 className="font-black text-lg">Bolão Arena da Copa</h1>
          </div>
          <a href="/" className="text-green-300 text-sm hover:text-white transition-colors">
            Ver site
          </a>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Toast */}
        {toast && <Toast msg={toast.msg} type={toast.type} />}

        {/* Criar jogo */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-green-700 px-5 py-3 flex items-center gap-2">
            <Plus size={15} className="text-green-200" />
            <h2 className="font-black text-white text-sm uppercase tracking-wide">Criar novo jogo</h2>
          </div>
          <form onSubmit={handleCreateGame} className="p-5 space-y-4">
            <InputField
              label="Adversário do Brasil"
              type="text"
              value={newAwayTeam}
              onChange={(e) => setNewAwayTeam(e.target.value)}
              placeholder="Ex: Argentina"
              required
            />
            <InputField
              label="Data e horário do jogo"
              type="datetime-local"
              value={newGameDate}
              onChange={(e) => setNewGameDate(e.target.value)}
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl text-sm transition-colors"
            >
              {loading ? 'Criando...' : 'Criar jogo'}
            </button>
          </form>
        </div>

        {/* Jogos cadastrados */}
        {games.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest">
              Jogo atual
            </h2>
            {games.map((game) => (
              <div key={game.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-50">
                  <p className="font-black text-gray-900">Brasil × {game.away_team}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(game.game_date).toLocaleString('pt-BR')}
                  </p>
                </div>

                {/* Status */}
                <div className="px-5 py-4 border-b border-gray-50 space-y-2">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Alterar status</p>
                  <div className="grid grid-cols-1 gap-2">
                    {(['open', 'closed', 'finished'] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => handleUpdateStatus(game.id, s)}
                        disabled={loading || game.status === s}
                        className={`text-sm px-4 py-2.5 rounded-xl font-bold text-left transition-all ${
                          game.status === s
                            ? 'bg-green-600 text-white cursor-default'
                            : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {game.status === s && <span className="mr-2">✓</span>}
                        {STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Resultado */}
                <div className="px-5 py-4 border-b border-gray-50">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Resultado final</p>
                  <form onSubmit={handleSetResult} className="space-y-3">
                    <input type="hidden" value={game.id} onChange={() => setResultGameId(game.id)} />
                    <div className="flex gap-3 items-end">
                      <div className="flex-1">
                        <label className="block text-xs text-gray-500 font-bold mb-1">Brasil</label>
                        <input
                          type="number"
                          min={0}
                          max={99}
                          value={brazilScore}
                          onChange={(e) => { setBrazilScore(e.target.value); setResultGameId(game.id) }}
                          placeholder={game.brazil_score?.toString() ?? '0'}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-center text-xl font-black focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                      <div className="text-gray-300 font-black text-xl pb-2">×</div>
                      <div className="flex-1">
                        <label className="block text-xs text-gray-500 font-bold mb-1">{game.away_team}</label>
                        <input
                          type="number"
                          min={0}
                          max={99}
                          value={opponentScore}
                          onChange={(e) => { setOpponentScore(e.target.value); setResultGameId(game.id) }}
                          placeholder={game.opponent_score?.toString() ?? '0'}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-center text-xl font-black focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl text-sm transition-colors"
                    >
                      Salvar resultado
                    </button>
                  </form>
                </div>

                {/* Recalcular */}
                <div className="px-5 py-4">
                  <button
                    onClick={() => handleRecalculate(game.id)}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-yellow-900 font-bold py-2.5 rounded-xl text-sm transition-colors"
                  >
                    <RefreshCw size={15} />
                    Recalcular pontuação
                  </button>
                  <p className="text-xs text-gray-400 text-center mt-2">
                    Execute após salvar o resultado oficial.
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Link acompanhamento */}
        <a
          href="/acompanhamento"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 font-semibold transition-colors"
        >
          Ver painel de acompanhamento
          <ChevronDown size={14} className="-rotate-90" />
        </a>
      </div>
    </main>
  )
}
