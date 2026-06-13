import { Shield, Info } from 'lucide-react'

const RULES = [
  'O bolão é apenas uma brincadeira entre as equipes do Arena. Não envolve dinheiro, aposta ou premiação financeira.',
  'Cada pessoa pode enviar apenas 1 palpite por jogo.',
  'O controle é feito pelo número de WhatsApp.',
  'Depois que o palpite for enviado, não será possível alterar.',
  'O palpite só pode ser enviado enquanto o jogo estiver com status aberto.',
  'Quando o jogo for encerrado para palpites, nenhum novo palpite será aceito.',
  'O ranking será atualizado após a liderança inserir o resultado oficial.',
  'Em caso de empate na pontuação, o desempate é por quem enviou o palpite primeiro.',
]

const SCORING = [
  { label: 'Placar exato', points: 10 },
  { label: 'Acertou o vencedor ou empate', points: 5 },
  { label: 'Acertou apenas gols do Brasil ou do adversário', points: 2 },
  { label: 'Participou (demais casos)', points: 1 },
]

export function RulesSection() {
  return (
    <section className="space-y-5">
      {/* Aviso principal */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-2xl p-4">
        <Info size={18} className="text-blue-500 mt-0.5 shrink-0" />
        <p className="text-blue-700 text-sm leading-relaxed">
          Este bolão é uma dinâmica recreativa do Arena Sede Maceió para envolver as equipes nos jogos do Brasil.{' '}
          <strong>Não há aposta em dinheiro.</strong> Cada participante pode enviar apenas um palpite por jogo usando seu
          nome, WhatsApp e equipe. Após o envio, o palpite não poderá ser alterado.
        </p>
      </div>

      {/* Pontuação */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="bg-yellow-400 px-5 py-3">
          <h3 className="font-black text-green-950 text-sm uppercase tracking-wide">Pontuação</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {SCORING.map((s) => (
            <div key={s.label} className="flex items-center justify-between px-5 py-3">
              <span className="text-sm text-gray-700">{s.label}</span>
              <span className="font-black text-green-700 text-sm ml-3 shrink-0">{s.points} pts</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 px-5 pb-4 pt-1">
          Pontuação não cumulativa — vale sempre a maior aplicável.
        </p>
      </div>

      {/* Regras */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="bg-green-700 px-5 py-3 flex items-center gap-2">
          <Shield size={15} className="text-green-200" />
          <h3 className="font-black text-white text-sm uppercase tracking-wide">Regras do Bolão</h3>
        </div>
        <ul className="divide-y divide-gray-50">
          {RULES.map((rule, i) => (
            <li key={i} className="flex items-start gap-3 px-5 py-3">
              <span className="text-green-600 font-black text-xs mt-0.5 shrink-0">{i + 1}.</span>
              <span className="text-sm text-gray-600 leading-relaxed">{rule}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
