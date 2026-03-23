import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { requireAccess } from '@/lib/admin-api'

/**
 * POST /api/admin/midia/equipe-ia
 *
 * Aciona a equipe de IA com um orquestrador + 4 agentes especializados.
 *
 * Body:
 * {
 *   evento:              string
 *   contexto?:           string
 *   plataforma?:         string
 *   tipo?:               string
 *   contexto_instagram?: string   — saída do Analista
 *   config?:             AgentConfig — instruções customizadas por agente
 * }
 */
export async function POST(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'instagram', action: 'create' })
  if (!access.ok) return access.response

  const openaiKey = process.env.OPENAI_API_KEY ?? ''
  if (!openaiKey) {
    return NextResponse.json({ error: 'OPENAI_API_KEY não configurada.' }, { status: 503 })
  }

  const body = await request.json().catch(() => ({}))
  const evento            = String(body.evento     ?? '').slice(0, 400).trim()
  const contexto          = String(body.contexto   ?? '').slice(0, 800).trim()
  const plataforma        = String(body.plataforma ?? 'Instagram').slice(0, 50)
  const tipo              = String(body.tipo        ?? 'post').slice(0, 50)
  const contextoInstagram = typeof body.contexto_instagram === 'string'
    ? body.contexto_instagram.slice(0, 1500).trim()
    : ''
  const config = body.config && typeof body.config === 'object' ? body.config : {}

  if (!evento) {
    return NextResponse.json({ error: 'Informe o evento ou assunto.' }, { status: 400 })
  }

  // ── Constrói seções de config por agente ──────────────────────────────────
  const cfgOrq    = config.orquestrador   ?? {}
  const cfgEst    = config.estrategista   ?? {}
  const cfgRed    = config.redator        ?? {}
  const cfgDarte  = config.diretorArte    ?? {}
  const cfgSocial = config.socialManager  ?? {}

  const configSection = [
    cfgOrq.objetivo           ? `OBJETIVO DA SESSÃO: ${cfgOrq.objetivo}`                  : '',
    cfgOrq.tom                ? `TOM GERAL: ${cfgOrq.tom}`                                : '',
    cfgOrq.prioridade         ? `PRIORIDADE: ${cfgOrq.prioridade}`                        : '',
    cfgEst.instrucoes         ? `ESTRATEGISTA — instruções extras: ${cfgEst.instrucoes}`  : '',
    cfgEst.publicoAlvo        ? `ESTRATEGISTA — público-alvo: ${cfgEst.publicoAlvo}`      : '',
    cfgRed.instrucoes         ? `REDATOR — instruções extras: ${cfgRed.instrucoes}`       : '',
    cfgRed.hashtagsFixas      ? `REDATOR — hashtags fixas (sempre incluir): ${cfgRed.hashtagsFixas}` : '',
    cfgDarte.instrucoes       ? `DIRETOR DE ARTE — instruções extras: ${cfgDarte.instrucoes}`         : '',
    cfgDarte.elementosObrig   ? `DIRETOR DE ARTE — elementos obrigatórios: ${cfgDarte.elementosObrig}` : '',
    cfgSocial.instrucoes      ? `SOCIAL MANAGER — instruções extras: ${cfgSocial.instrucoes}` : '',
    cfgSocial.horarioPref     ? `SOCIAL MANAGER — horário preferido: ${cfgSocial.horarioPref}`  : '',
  ].filter(Boolean).join('\n')

  const briefing = [
    `Evento/Assunto: ${evento}`,
    contexto         ? `Contexto: ${contexto}`   : '',
    `Plataforma: ${plataforma}`,
    `Tipo de conteúdo: ${tipo}`,
    contextoInstagram
      ? `\n--- ANÁLISE DAS PÁGINAS DO INSTAGRAM ---\n${contextoInstagram}`
      : '',
    configSection
      ? `\n--- CONFIGURAÇÕES DA SESSÃO ---\n${configSection}`
      : '',
  ].filter(Boolean).join('\n')

  const systemPrompt = `Você é uma equipe criativa de social media especializada em igrejas evangélicas brasileiras (Igreja Sara Alagoas).

Ao receber um briefing, responda com um JSON estritamente neste formato, sem texto fora do JSON:

{
  "orquestrador": {
    "plano": "string — plano de execução resumido da sessão (1-2 frases)",
    "tom": "string — tom definido para toda a comunicação desta sessão",
    "prioridades": ["string", "string"] — 2 a 3 prioridades principais da sessão,
    "diretrizes": "string — diretrizes especiais que todos os agentes devem seguir"
  },
  "estrategista": {
    "objetivo": "string — objetivo principal do conteúdo",
    "angulo": "string — ângulo criativo central",
    "formato_ideal": "string — formato recomendado e por quê",
    "dicas": ["string", "string"] — 2 a 3 dicas estratégicas
  },
  "redator": {
    "legenda": "string — legenda completa pronta para publicar, com emojis e quebras de linha naturais",
    "cta": "string — chamada para ação principal",
    "variacao": "string — versão alternativa mais curta"
  },
  "diretor_arte": {
    "conceito_visual": "string — conceito visual e atmosfera",
    "paleta": "string — cores principais recomendadas",
    "elementos": ["string", "string"] — 2 a 4 elementos visuais obrigatórios,
    "briefing_arte": "string — briefing completo para o designer ou IA de geração de imagem"
  },
  "social_manager": {
    "hashtags": ["string"] — 8 a 12 hashtags relevantes sem #,
    "melhor_horario": "string — melhor horário e dia para postar com justificativa",
    "frequencia": "string — recomendação de frequência",
    "engajamento": "string — ação pós-publicação para estimular engajamento"
  }
}

Siga o estilo da Igreja Sara Alagoas: linguagem acolhedora, fé genuína, comunicação moderna e profissional.
O ORQUESTRADOR deve liderar definindo o tom e as prioridades antes dos demais agentes agirem.`

  try {
    const client = new OpenAI({ apiKey: openaiKey })

    const completion = await client.chat.completions.create({
      model:           'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: briefing },
      ],
      max_tokens:      1400,
      temperature:     0.75,
      response_format: { type: 'json_object' },
    })

    const raw = completion.choices[0]?.message?.content?.trim() ?? ''
    if (!raw) throw new Error('Resposta vazia da IA.')

    const result = JSON.parse(raw)
    return NextResponse.json({ result })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[equipe-ia] Erro:', msg)
    return NextResponse.json({ error: `Erro ao acionar equipe de IA: ${msg}` }, { status: 500 })
  }
}
