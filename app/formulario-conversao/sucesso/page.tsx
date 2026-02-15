'use client'

import { useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import { CheckCircle2 } from 'lucide-react'

const FALLBACK_ACEITOU = `É com grande alegria que recebemos a notícia de que você tomou a decisão de aceitar Jesus como seu Senhor e Salvador! Isso é maravilhoso e estamos muito felizes por você!

Saiba que, como igreja, estamos aqui para caminhar ao seu lado, apoiando você em cada passo dessa nova jornada de fé. Pode contar conosco em tudo o que precisar – estamos prontos para ajudá-lo a crescer espiritualmente e viver a plenitude que Deus tem para sua vida.

Ficamos muito felizes em lhe chamar de irmão em Cristo Jesus. A Sara Nossa Terra lhe dá as boas-vindas com muito amor e orações.

Que Deus continue a abençoar sua caminhada e que você sinta Sua paz e amor a cada dia!

Em Cristo,
A Igreja Sara Nossa Terra`

const FALLBACK_RECONCILIOU = `Que alegria saber que você tomou a decisão de se reconciliar com Deus! O coração do Pai se alegra profundamente ao ver um filho de volta à Sua presença. Isso é um grande passo, e estamos emocionados por você!

Saiba que, como igreja, estamos aqui para caminhar ao seu lado nesse novo recomeço. Conte conosco para fortalecê-lo e ajudá-lo a viver a plenitude que Deus tem para a sua vida. A Sua graça é abundante, e estamos muito felizes em vê-lo restaurado e renovado em Cristo.

Ficamos muito felizes em lhe chamar de irmão em Cristo novamente. A Sara Nossa Terra lhe dá as boas-vindas de braços abertos, e estaremos sempre prontos para apoiá-lo em sua jornada.

Que Deus continue a abençoar sua vida, renovando sua fé, esperança e amor!

Em Cristo,
A Igreja Sara Nossa Terra`

function getTratamento(genero: string): string {
  return genero === 'F' ? 'Querida' : 'Querido'
}
function getIrmaoIrma(genero: string): string {
  return genero === 'F' ? 'irmã' : 'irmão'
}
// Nomes comuns que precisam do segundo nome para identificar (ex.: Maria Silva, João Santos)
const PRIMEIRO_NOME_COM_SEGUNDO = new Set([
  'maria', 'ana', 'sofia', 'laura', 'isabel',
  'joão', 'joao', 'josé', 'jose', 'antônio', 'antonio', 'miguel', 'luiz', 'carlos',
])
function getNomeExibicao(nome: string): string {
  const parts = nome.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return nome
  const primeiro = parts[0] ?? nome
  const primeiroNorm = primeiro.toLowerCase().normalize('NFD').replace(/\u0300/g, '')
  const precisaSegundo = PRIMEIRO_NOME_COM_SEGUNDO.has(primeiroNorm)
  if (precisaSegundo && parts.length >= 2) return `${parts[0]} ${parts[1]}`
  return primeiro
}

export default function ConversaoSucessoPublicoPage() {
const searchParams = useSearchParams()
   const nome = searchParams?.get('nome') ?? ''
   const genero = searchParams?.get('genero') ?? 'M'
   const tipo = searchParams?.get('tipo') ?? 'accepted'

  const [acceptedContent, setAcceptedContent] = useState<string | null>(null)
  const [reconciledContent, setReconciledContent] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/public/consolidacao/conversion-messages')
      .then((r) => r.json())
      .then((data) => {
        setAcceptedContent(data.accepted ?? '')
        setReconciledContent(data.reconciled ?? '')
      })
      .catch(() => {
        setAcceptedContent('')
        setReconciledContent('')
      })
  }, [])

  const trat = getTratamento(genero)
  const irmao = getIrmaoIrma(genero)
  const nomeExib = getNomeExibicao(nome)
  const paragrafoInicial = `${trat} ${nomeExib} ${irmao} em Cristo,`
  const textoCompleto =
    tipo === 'reconciled'
      ? (reconciledContent !== null && reconciledContent !== '' ? reconciledContent : FALLBACK_RECONCILIOU)
      : (acceptedContent !== null && acceptedContent !== '' ? acceptedContent : FALLBACK_ACEITOU)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8 flex flex-col items-center">
          <div className="relative w-32 h-32 mb-4">
            <Image src="/logo-sara-oficial.png" alt="Logo Sara Nossa Terra" fill className="object-contain" priority />
          </div>
          <div className="flex items-center gap-2 text-green-600 mb-2">
            <CheckCircle2 size={28} />
            <h1 className="text-2xl font-bold text-slate-800">Conversão registrada com sucesso</h1>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden p-6 md:p-8">
          <p className="text-slate-800 font-medium mb-4 whitespace-pre-line">{paragrafoInicial}</p>
          <div className="text-slate-700 whitespace-pre-line leading-relaxed">{textoCompleto}</div>
        </div>
      </div>
    </div>
  )
}
