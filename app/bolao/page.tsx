import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { HeroSection } from '@/components/bolao/HeroSection'
import { GameCard, NoGameCard } from '@/components/bolao/GameCard'
import { GuessForm } from '@/components/bolao/GuessForm'
import { RulesSection } from '@/components/bolao/RulesSection'
import { ExternalLink, BarChart3 } from 'lucide-react'

async function getData() {
  try {
    const supabase = createSupabaseAdminClient()
    const [gamesRes, teamsRes] = await Promise.all([
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
    return {
      game: gamesRes.data?.[0] ?? null,
      teams: teamsRes.data ?? [],
    }
  } catch {
    return { game: null, teams: [] }
  }
}

export default async function BolaoPage() {
  const { game, teams } = await getData()

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Hero */}
      <HeroSection />

      <div className="max-w-lg mx-auto px-4 py-8 space-y-8">
        {/* Card do jogo atual */}
        <section>
          <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">
            Jogo atual
          </h2>
          {game ? <GameCard game={game} /> : <NoGameCard />}
        </section>

        {/* Formulário de palpite */}
        {game && (
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-black text-gray-900 mb-5">
              {game.status === 'open' ? 'Faça seu palpite' : 'Palpites encerrados'}
            </h2>
            <GuessForm game={game} teams={teams} />
          </section>
        )}

        {/* Regras */}
        <section>
          <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">
            Regras do Bolão
          </h2>
          <RulesSection />
        </section>

        {/* Link acompanhamento */}
        <section className="bg-green-700 rounded-2xl p-6 text-white text-center">
          <BarChart3 size={28} className="mx-auto mb-3 text-yellow-400" />
          <h3 className="font-black text-lg mb-1">Acompanhe o ranking</h3>
          <p className="text-green-200 text-sm mb-4">
            Veja os palpites de todos, o ranking das equipes e o placar ao vivo.
          </p>
          <a
            href="/acompanhamento"
            className="inline-flex items-center gap-2 bg-yellow-400 text-green-950 font-black px-6 py-3 rounded-xl hover:bg-yellow-300 transition-colors"
          >
            Ver acompanhamento
            <ExternalLink size={16} />
          </a>
        </section>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-100 mt-8 py-6 text-center text-xs text-gray-400">
        <p className="font-semibold text-gray-600">Bolão Arena da Copa</p>
        <p className="mt-1">Arena Sede Maceió · Sábados às 17h</p>
        <p className="mt-1">
          <a
            href="https://instagram.com/arenasedemaceio"
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-600 hover:underline"
          >
            @arenasedemaceio
          </a>
        </p>
        <p className="mt-3 text-gray-300">
          Dinâmica recreativa · Sem aposta em dinheiro
        </p>
      </footer>
    </main>
  )
}
