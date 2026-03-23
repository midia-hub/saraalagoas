import { NextRequest } from 'next/server'
import OpenAI from 'openai'
import { GoogleGenAI, Modality } from '@google/genai'
import { requireAccess } from '@/lib/admin-api'
import { supabaseServer } from '@/lib/supabase-server'
import { fetchInstagramRecentMedia } from '@/lib/meta-fetch-posts'
import {
  loadReferenciasPorUrls,
  narrativaReferenciasParaAgentes,
} from '@/lib/equipe-ia-repositorio'
import { fetchInstagramReferencias, resumoReferenciasParaPrompt } from '@/lib/equipe-ia-instagram-refs'

export const maxDuration = 120

// ── Helpers de modelo ──────────────────────────────────────────────────────────

/** Modelos o1/o3/o4 não aceitam temperature, response_format json_object, nem max_tokens */
function reasoningModel(model: string) {
  return /^o\d/.test(model)
}

/** Modelos do Google Gemini (texto) */
function geminiModel(model: string) {
  return model.startsWith('gemini-')
}

function chatParams(model: string, maxTokens: number, temperature: number) {
  if (reasoningModel(model)) {
    return { model, max_completion_tokens: maxTokens * 4 }
  }
  return { model, max_tokens: maxTokens, temperature, response_format: { type: 'json_object' as const } }
}

function chatParamsNoJson(model: string, maxTokens: number, temperature: number) {
  if (reasoningModel(model)) {
    return { model, max_completion_tokens: maxTokens * 4 }
  }
  return { model, max_tokens: maxTokens, temperature }
}

/** Extrai JSON da resposta — lida com markdown e texto livre */
function safeParseJSON(raw: string | null | undefined): Record<string, unknown> {
  if (!raw) return {}
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
  try { return JSON.parse(cleaned) } catch { /* try regex */ }
  const match = cleaned.match(/\{[\s\S]*\}/)
  if (match) { try { return JSON.parse(match[0]) } catch { /* fall */ } }
  return {}
}

// ── Labels de agentes ──────────────────────────────────────────────────────────

const AGENT_LABELS: Record<string, string> = {
  orquestrador:  'Diretor de Marketing',
  analista:      'Analista de Dados',
  estrategista:  'Gerente de Conteúdo',
  redator:       'Copywriter',
  diretor_arte:  'Diretor de Arte',
  designer:      'Designer',
  social_manager:'Social Media Manager',
}

// ── System prompts por agente ──────────────────────────────────────────────────

const AGENT_SYSTEMS: Record<string, string> = {
  estrategista: `Você é o Gerente de Conteúdo da equipe de social media da Igreja Sara Alagoas.
Analise a instrução do Diretor de Marketing e o contexto dos agentes anteriores.
Responda APENAS com JSON válido (sem markdown):
{ "objetivo": "string", "angulo": "string", "formato_ideal": "string", "dicas": ["string"] }`,

  redator: `Você é o Copywriter da equipe de social media da Igreja Sara Alagoas.
Analise a instrução do Diretor de Marketing e o contexto dos agentes anteriores.
Linguagem acolhedora, fé genuína, comunicação moderna.
Responda APENAS com JSON válido (sem markdown):
{ "legenda": "string — legenda completa com emojis e quebras de linha naturais, pronta para publicar", "cta": "string — chamada para ação", "variacao": "string — versão alternativa mais curta" }`,

  diretor_arte: `Você é o Diretor de Arte da equipe de social media da Igreja Sara Alagoas.
Analise a instrução do Diretor de Marketing e o contexto dos agentes anteriores.
Responda APENAS com JSON válido (sem markdown):
{ "conceito_visual": "string", "paleta": "string — cores principais", "elementos": ["string"], "briefing_arte": "string — briefing detalhado em inglês para geração de imagem com IA, sem texto na imagem" }`,

  social_manager: `Você é o Social Media Manager da Igreja Sara Alagoas.
Analise a instrução do Diretor de Marketing e todo o contexto produzido pelos outros agentes.
Defina a estratégia completa de publicação: quando, onde e como postar.
Responda APENAS com JSON válido (sem markdown):
{ "hashtags": ["string — sem #, 8 a 12 hashtags relevantes"], "melhor_horario": "string — dia da semana e horário específico com justificativa", "plataforma": "string — Instagram/Facebook/ambos", "tipo_post": "string — feed/reel/story/carrossel", "frequencia": "string", "engajamento": "string — ação pós-publicação para estimular engajamento" }`,
}

// ── Execução de agente genérico (GPT) ─────────────────────────────────────────

async function runAgent(
  client: OpenAI,
  model: string,
  agentKey: string,
  instrucao: string,
  ctx: Record<string, unknown>,
  extraConfig: string = '',
): Promise<Record<string, unknown>> {
  const system = AGENT_SYSTEMS[agentKey] || `Você é um agente especialista. Responda APENAS com JSON válido.`

  const contextEntries = Object.entries(ctx)
    .filter(([k]) => !['solicitacao'].includes(k))
    .map(([k, v]) => {
      // Strip raw contas metrics from analista — too verbose, agents only need the summary
      if (k === 'analista' && typeof v === 'object' && v !== null) {
        const a = { ...(v as Record<string, unknown>) }
        delete a.contas
        return `[${AGENT_LABELS[k] || k}]: ${JSON.stringify(a)}`
      }
      return `[${AGENT_LABELS[k] || k}]: ${typeof v === 'string' ? v : JSON.stringify(v)}`
    })
    .join('\n\n')
    .slice(0, 8000)

  const userContent = [
    `INSTRUÇÃO DO DIRETOR DE MARKETING: ${instrucao}`,
    extraConfig ? `CONFIGURAÇÕES ADICIONAIS: ${extraConfig}` : '',
    contextEntries ? `\nCONTEXTO DOS AGENTES ANTERIORES:\n${contextEntries}` : '',
    `\nSOLICITAÇÃO ORIGINAL: ${String(ctx.solicitacao || '')}`,
  ].filter(Boolean).join('\n')

  const completion = await client.chat.completions.create({
    ...chatParams(model, 800, 0.75),
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: userContent },
    ],
  })
  return safeParseJSON(completion.choices[0]?.message?.content)
}

// ── Execução do Analista ───────────────────────────────────────────────────────

function ordenarEtapas(
  etapas: Array<{ agente: string; instrucao: string }>,
  solicitacao: string,
): Array<{ agente: string; instrucao: string }> {
  const valid = new Set(['analista', 'estrategista', 'redator', 'diretor_arte', 'designer', 'social_manager'])
  const seen = new Set<string>()
  let list = etapas.filter((e) => {
    if (!valid.has(e.agente) || seen.has(e.agente)) return false
    seen.add(e.agente)
    return true
  })

  const dIdx = list.findIndex((e) => e.agente === 'designer')
  if (dIdx >= 0 && !list.some((e) => e.agente === 'diretor_arte')) {
    list = [
      ...list.slice(0, dIdx),
      {
        agente:    'diretor_arte',
        instrucao: `Crie conceito visual e briefing em inglês para a arte pedida: ${solicitacao.slice(0, 400)}`,
      },
      ...list.slice(dIdx),
    ]
  }

  const nonSocial = list.filter((e) => e.agente !== 'social_manager')
  const social    = list.filter((e) => e.agente === 'social_manager')
  return [...nonSocial, ...social]
}

async function runAnalista(
  client: OpenAI,
  model: string,
  instrucao: string,
  config: Record<string, Record<string, string>>,
  send: (d: object) => void,
): Promise<Record<string, unknown>> {
  const periodoParam = config.analista?.periodo || '30'
  const daysAgo = Math.max(7, Math.min(60, parseInt(periodoParam, 10) || 30))

  const { data: integrations } = await supabaseServer
    .from('meta_integrations')
    .select('id, page_name, instagram_username, instagram_business_account_id, page_access_token, is_active')
    .eq('is_active', true)
    .not('instagram_business_account_id', 'is', null)
    .not('page_access_token', 'is', null)

  if (!integrations || integrations.length === 0) {
    return { resumo: 'Nenhuma conta conectada.', insights: [], referencias: [], recomendacoes: {} }
  }

  send({ type: 'agent_progress', agent: 'analista', message: `Coletando métricas de ${integrations.length} conta(s) — últimos ${daysAgo} dias...` })

  const contasMetrics: Array<{
    nome: string; totalPosts: number
    mediaLikes: number; mediaComentarios: number; mediaAlcance: number
    tipoMaisEngajado: string
  }> = []

  for (const ig of integrations.slice(0, 3)) {
    try {
      const posts = await fetchInstagramRecentMedia({
        igUserId:        ig.instagram_business_account_id as string,
        pageAccessToken: ig.page_access_token as string,
        accountName:     ig.instagram_username || ig.page_name || undefined,
        integrationId:   ig.id,
        daysAgo,
        withInsights:    true,
      })
      if (posts.length === 0) continue

      const n       = posts.length
      const typeMap: Record<string, { total: number; count: number }> = {}
      for (const p of posts) {
        const t = p.media_type || 'IMAGE'
        if (!typeMap[t]) typeMap[t] = { total: 0, count: 0 }
        typeMap[t].total += (p.like_count ?? 0) + (p.comments_count ?? 0) + (p.insights?.saved ?? 0)
        typeMap[t].count += 1
      }
      const tipoMaisEngajado = Object.entries(typeMap)
        .map(([t, { total, count }]) => ({ t, avg: total / count }))
        .sort((a, b) => b.avg - a.avg)[0]?.t ?? 'IMAGE'

      contasMetrics.push({
        nome:             ig.instagram_username || ig.page_name || 'Conta',
        totalPosts:       n,
        mediaLikes:       Math.round(posts.reduce((s, p) => s + (p.like_count ?? 0), 0) / n),
        mediaComentarios: Math.round(posts.reduce((s, p) => s + (p.comments_count ?? 0), 0) / n),
        mediaAlcance:     Math.round(posts.reduce((s, p) => s + (p.insights?.reach ?? 0), 0) / n),
        tipoMaisEngajado,
      })
    } catch { /* skip */ }
  }

  if (contasMetrics.length === 0) {
    return { resumo: 'Sem dados disponíveis no período.', insights: [], referencias: [], recomendacoes: {} }
  }

  send({ type: 'agent_progress', agent: 'analista', message: 'Gerando análise estratégica...' })

  const completion = await client.chat.completions.create({
    ...chatParams(model, 600, 0.3),
    messages: [
      {
        role: 'system',
        content: `Analista de dados de social media para igrejas evangélicas.
FOCO DA ANÁLISE: ${instrucao}
${config.analista?.foco ? `FOCO ADICIONAL: ${config.analista.foco}` : ''}
Responda APENAS com JSON válido (sem markdown):
{ "resumo": "string", "insights": ["string"], "referencias": ["string"], "recomendacoes": { "formato": "string", "horario": "string" } }`,
      },
      { role: 'user', content: `Métricas ${daysAgo} dias:\n${JSON.stringify(contasMetrics)}` },
    ],
  })

  const analise = safeParseJSON(completion.choices[0]?.message?.content)
  return { ...analise, contas: contasMetrics }
}

// ── Execução do Designer ───────────────────────────────────────────────────────

function primeiraRefParaDesigner(
  selectedRefs: string[],
  refItems: Awaited<ReturnType<typeof loadReferenciasPorUrls>>,
): string | undefined {
  for (const url of selectedRefs) {
    const row = refItems.find((r) => r.url === url)
    const pub = row?.meta?.publico ?? ['diretor_arte', 'designer']
    if (pub.includes('designer')) return url
  }
  return selectedRefs[0]
}

async function runDesigner(
  client: OpenAI,
  config: Record<string, Record<string, string>>,
  instrucao: string,
  ctx: Record<string, unknown>,
  selectedRefs: string[],
  refItems: Awaited<ReturnType<typeof loadReferenciasPorUrls>>,
  send: (d: object) => void,
): Promise<{ artUrl: string; dallePrompt: string }> {
  const model      = config.designer?.model || 'gpt-4o'
  const imageModel = config.designer?.imageModel || 'gemini-3.1-flash-image-preview'

  const dirArte  = ctx.diretor_arte as Record<string, unknown> | undefined
  const formatLabel =
    config.designer?.formato === '1024x1792' ? 'retrato vertical (Stories/9:16)' :
    config.designer?.formato === '1792x1024' ? 'horizontal (16:9)' : 'quadrado (1:1/Feed)'

  // Constrói prompt para geração de imagem
  const refTextDesigner = narrativaReferenciasParaAgentes(refItems, 'designer')

  const promptPayload: Record<string, unknown> = {
    tema:     String(ctx.solicitacao || '').slice(0, 200),
    tom:      ctx.tom || (ctx.estrategista as Record<string,unknown>)?.angulo || 'Inspirador',
    formato:  formatLabel,
    detalhes: [instrucao, dirArte?.briefing_arte, config.diretorArte?.elementosObrig, refTextDesigner].filter(Boolean).join(' | '),
  }

  const refImageUrl = primeiraRefParaDesigner(selectedRefs, refItems)

  // Referência visual do repositório (primeira marcada para o Designer)
  if (refImageUrl) {
    send({ type: 'agent_progress', agent: 'designer', message: `Analisando referência visual...` })
    try {
      const imgRes = await fetch(refImageUrl)
      const buf    = Buffer.from(await imgRes.arrayBuffer())
      const mime   = (imgRes.headers.get('content-type') || 'image/png').split(';')[0]
      promptPayload.reference_mime = mime
      promptPayload.reference_image_base64 = `data:${mime};base64,${buf.toString('base64')}`
    } catch { /* sem ref */ }
  }

  // Gera prompt textual para a IA de imagem
  const systemInstruction = `Especialista em design gráfico para igrejas evangélicas brasileiras.
Crie prompts em inglês para gerar artes gráficas profissionais com IA.
Estilo Sara Alagoas: fundo texturizado/escuro, tipografia bold impactante, acentos ciano/teal vibrante, estética clean e moderna.
NUNCA inclua texto nas imagens. Até 200 palavras. Responda APENAS com o prompt em inglês.`

  const hasRef     = !!promptPayload.reference_image_base64
  const userPrompt = hasRef
    ? `Analise a referência e crie prompt com esse estilo:\nTema: ${promptPayload.tema}\nTom: ${promptPayload.tom}\nFormato: ${promptPayload.formato}\nDetalhes: ${promptPayload.detalhes}`
    : `Crie prompt para:\nTema: ${promptPayload.tema}\nTom: ${promptPayload.tom}\nFormato: ${promptPayload.formato}\nDetalhes: ${promptPayload.detalhes}`

  let dallePrompt = ''

  if (geminiModel(model)) {
    // Usa Google GenAI para gerar o prompt de imagem
    const googleKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? ''
    if (!googleKey) throw new Error('GOOGLE_GENERATIVE_AI_API_KEY não configurada.')
    const genai = new GoogleGenAI({ apiKey: googleKey })

    const refMime = String(promptPayload.reference_mime || 'image/png')
    const gemParts = hasRef
      ? [
          { text: `${systemInstruction}\n\n${userPrompt}` },
          { inlineData: { mimeType: refMime, data: (promptPayload.reference_image_base64 as string).split(',')[1] ?? (promptPayload.reference_image_base64 as string) } },
        ]
      : [{ text: `${systemInstruction}\n\n${userPrompt}` }]

    const gemResp = await genai.models.generateContent({
      model,
      contents: [{ role: 'user', parts: gemParts }],
    })
    dallePrompt = gemResp.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? ''
  } else {
    // Usa OpenAI para gerar o prompt de imagem
    const promptMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemInstruction },
      {
        role: 'user',
        content: hasRef
          ? [
              { type: 'text' as const, text: userPrompt },
              { type: 'image_url' as const, image_url: { url: promptPayload.reference_image_base64 as string, detail: 'low' as const } },
            ]
          : userPrompt,
      },
    ]
    const promptCompletion = await client.chat.completions.create({
      ...chatParamsNoJson(model, 300, 0.7),
      messages: promptMessages,
    })
    dallePrompt = promptCompletion.choices[0]?.message?.content?.trim() ?? ''
  }

  if (!dallePrompt) throw new Error('Prompt de imagem vazio.')

  send({ type: 'agent_progress', agent: 'designer', message: `Gerando arte com ${AGENT_LABELS[imageModel] || imageModel} (pode levar até 30s)...` })

  // Prompt sempre em inglês para melhor performance dos modelos de imagem
  const fullPrompt = `${dallePrompt}. Graphic design for Brazilian evangelical church communication. Modern, colorful and welcoming style. No text overlaid on the image.`

  // Geração de imagem — exclusivamente Nano Banana (Gemini)
  const googleKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? ''
  if (!googleKey) throw new Error('GOOGLE_GENERATIVE_AI_API_KEY não configurada.')
  const genai = new GoogleGenAI({ apiKey: googleKey })

  const gemResp = await genai.models.generateContent({
    model:    imageModel,
    contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
    config:   { responseModalities: [Modality.TEXT, Modality.IMAGE] },
  })

  let b64Image: string | null = null
  let b64MimeType = 'image/png'
  for (const part of gemResp.candidates?.[0]?.content?.parts ?? []) {
    if (part.inlineData?.data) {
      b64Image    = part.inlineData.data
      b64MimeType = part.inlineData.mimeType || 'image/png'
      break
    }
  }

  if (!b64Image) {
    const textParts = (gemResp.candidates?.[0]?.content?.parts ?? [])
      .map(p => p.text).filter(Boolean).join(' ')
    throw new Error(
      `Nano Banana (${imageModel}) não retornou imagem.` +
      (textParts ? ` Resposta: "${textParts.slice(0, 200)}"` : ' Sem partes na resposta.')
    )
  }

  // Upload para Supabase
  const ART_BUCKET = 'equipe_ia_arts'
  const { data: buckets } = await supabaseServer.storage.listBuckets()
  if (!buckets?.some((b) => b.name === ART_BUCKET)) {
    const { error: bucketErr } = await supabaseServer.storage.createBucket(ART_BUCKET, { public: true })
    if (bucketErr) throw new Error(`Falha ao criar bucket '${ART_BUCKET}': ${bucketErr.message}`)
  }

  const buf      = Buffer.from(b64Image, 'base64')
  const ext      = b64MimeType.includes('jpeg') || b64MimeType.includes('jpg') ? 'jpg'
                 : b64MimeType.includes('webp') ? 'webp'
                 : 'png'
  const fileName = `sessao_${Date.now()}.${ext}`
  const { data: uploadData, error: uploadError } = await supabaseServer.storage
    .from(ART_BUCKET)
    .upload(`geradas/${fileName}`, buf, { contentType: b64MimeType, upsert: false })
  if (uploadError) throw new Error(`Upload da arte falhou: ${uploadError.message}`)

  const { data: urlData } = supabaseServer.storage.from(ART_BUCKET).getPublicUrl(uploadData.path)
  return { artUrl: urlData.publicUrl, dallePrompt }
}

// ── Route principal ────────────────────────────────────────────────────────────

/**
 * POST /api/admin/midia/equipe-ia/sessao
 *
 * Pipeline dinâmico dirigido pelo Orquestrador:
 *   1. Orquestrador analisa a demanda e cria um plano com etapas ordenadas
 *   2. Executa cada etapa passando contexto acumulado entre agentes
 *   3. Solicita aprovação do usuário antes de publicar
 */
export async function POST(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'instagram', action: 'view' })
  if (!access.ok) return sseError('Acesso negado.')

  const openaiKey = process.env.OPENAI_API_KEY ?? ''
  if (!openaiKey) return sseError('OPENAI_API_KEY não configurada.')

  const body        = await request.json().catch(() => ({}))
  const solicitacao = String(body.solicitacao ?? '').slice(0, 1000).trim()
  const config      = body.config && typeof body.config === 'object' ? body.config : {}
  const selectedRefs: string[] = Array.isArray(body.selectedRefs)
    ? body.selectedRefs.filter((r: unknown): r is string => typeof r === 'string')
    : []
  const continuacao = body.continuacao === true
  const solicitacaoInicial = typeof body.solicitacaoInicial === 'string'
    ? String(body.solicitacaoInicial).slice(0, 1000)
    : ''
  const resultadosAnteriores = body.resultadosAnteriores && typeof body.resultadosAnteriores === 'object'
    ? body.resultadosAnteriores as Record<string, unknown>
    : null

  if (!solicitacao) return sseError('Informe a solicitação.')

  const client  = new OpenAI({ apiKey: openaiKey })
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(ctrl) {
      const send = (data: object) => {
        try { ctrl.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`)) } catch { /* closed */ }
      }

      try {
        const refItems = selectedRefs.length > 0 ? await loadReferenciasPorUrls(selectedRefs) : []

        const igIds = Array.isArray((config as Record<string, unknown>).instagramRefsIntegracaoIds)
          ? ((config as { instagramRefsIntegracaoIds?: string[] }).instagramRefsIntegracaoIds ?? []).filter(
              (x): x is string => typeof x === 'string' && x.length > 0,
            )
          : []
        const periodoRef = parseInt(String((config as { analista?: { periodo?: string } }).analista?.periodo ?? '30'), 10) || 30
        const igRefs = igIds.length > 0 ? await fetchInstagramReferencias(igIds, Math.min(60, Math.max(7, periodoRef))) : null
        const blocoIg  = igRefs ? resumoReferenciasParaPrompt(igRefs) : ''

        // ── 1. ORQUESTRADOR — análise e plano dinâmico ─────────────────────
        send({ type: 'agent_start', agent: 'orquestrador', message: continuacao ? 'Incorporando sua nova instrução ao plano...' : 'Analisando sua demanda e montando o plano de execução...' })

        const cfgOrq   = config.orquestrador ?? {}
        const orqModel = cfgOrq.model || 'o4-mini'

        const userOrq = continuacao && resultadosAnteriores
          ? [
              'NOVA INSTRUÇÃO DO USUÁRIO (continuação da mesma demanda no workbench — não descarte o que já foi feito sem necessidade):',
              solicitacao,
              '',
              'SOLICITAÇÃO INICIAL DESTA SESSÃO (contexto):',
              solicitacaoInicial || '(não informada)',
              '',
              'RESULTADOS JÁ PRODUZIDOS PELOS AGENTES (use como base; execute só o que o usuário pedir agora):',
              JSON.stringify(resultadosAnteriores).slice(0, 14000),
              blocoIg ? `\n\n${blocoIg}` : '',
            ].join('\n')
          : [solicitacao, blocoIg ? `\n\n${blocoIg}` : ''].join('')

        const planCompletion = await client.chat.completions.create({
          ...chatParams(orqModel, 900, 0.65),
          messages: [
            {
              role: 'system',
              content: `Você é o Diretor de Marketing da equipe de IA de social media da Igreja Sara Alagoas.
Monte um plano SÓ com o que a demanda exige — NEM todo mundo precisa trabalhar em toda solicitação.

AGENTES DISPONÍVEIS:
- analista: métricas reais do Instagram (contas conectadas à plataforma). Use para pesquisa de desempenho, tendências de formato, análise de redes.
- estrategista: objetivo, ângulo, formato ideal.
- redator: legenda, CTA, copy para publicar.
- diretor_arte: conceito visual, paleta, briefing para IA de imagem (sempre antes do designer, se o designer entrar).
- designer: gera arte com IA (só se o pedido envolver criação visual).
- social_manager: quando/onde/como publicar, hashtags, tipo de post — use se o pedido envolver publicação ou programação.

REGRAS IMPORTANTES:
- Se o usuário pedir APENAS pesquisa/análise de redes ou métricas, pode usar SOMENTE "analista" (e mais ninguém).
- Se pedir APENAS uma arte, pode usar "diretor_arte" e "designer" sem redator nem social_manager.
- Se pedir texto para post SEM arte, use estrategista e/ou redator; inclua social_manager só se falar em postar/agendar.
- Inclua "social_manager" só quando faz sentido definir publicação (hashtags, horário, plataforma).
- diretor_arte antes de designer, se ambos existirem. social_manager por último se existir.
- Se houver CONTEXTO de Instagram de referência no bloco do usuário, use para alinhar tom e formatos (não invente dados que não estejam lá).

${continuacao ? 'Esta é uma CONTINUAÇÃO: o usuário já tem entregas anteriores. Planeje só as etapas necessárias para o novo pedido, reutilizando contexto.' : ''}

${cfgOrq.objetivo   ? `OBJETIVO DO USUÁRIO: ${cfgOrq.objetivo}` : ''}
${cfgOrq.tom        ? `TOM DESEJADO: ${cfgOrq.tom}` : ''}
${cfgOrq.prioridade ? `PRIORIDADE: ${cfgOrq.prioridade}` : ''}

Responda APENAS com JSON válido (sem markdown):
{
  "plano": "string",
  "tom": "string",
  "prioridade": "string",
  "mensagem_usuario": "string — o que a equipe vai fazer nesta rodada",
  "solicitar_aprovacao": true ou false — true se houver entrega para revisar antes de agendar/publicar (legenda+arte+plano de post); false se for só pesquisa/resumo/análise sem necessidade de aprovação de postagem,
  "etapas": [
    { "agente": "analista | estrategista | redator | diretor_arte | designer | social_manager", "instrucao": "string específica" }
  ]
}`,
            },
            { role: 'user', content: userOrq },
          ],
        })

        const plan   = safeParseJSON(planCompletion.choices[0]?.message?.content)
        const etapas = Array.isArray(plan.etapas)
          ? (plan.etapas as Array<{ agente: string; instrucao: string }>)
          : []

        let finalEtapas = ordenarEtapas(etapas, solicitacao)
        if (finalEtapas.length === 0) {
          finalEtapas = [
            {
              agente:    'analista',
              instrucao: `Atenda a solicitação com os dados disponíveis das contas conectadas e referências: ${solicitacao}`,
            },
          ]
          send({ type: 'orchestrator_message', message: '⚠️ Plano vazio — executando analista como fallback.' })
        }

        const solicitarAprovacao = plan.solicitar_aprovacao !== false

        send({ type: 'agent_done', agent: 'orquestrador', message: plan.mensagem_usuario || plan.plano || 'Plano criado.', result: plan })
        send({ type: 'orchestrator_message', message: `📋 ${plan.mensagem_usuario || plan.plano}` })

        // ── 2. LOOP DINÂMICO — executa cada etapa ──────────────────────────
        const ctx: Record<string, unknown> = {
          solicitacao,
          tom:          plan.tom,
          prioridade:   plan.prioridade,
          referencias_instagram: igRefs?.contas?.length ? igRefs : undefined,
        }

        if (continuacao && resultadosAnteriores) {
          ctx.modo_continuacao = true
          ctx.solicitacao_inicial_sessao = solicitacaoInicial
          for (const [k, v] of Object.entries(resultadosAnteriores)) {
            if (k !== 'solicitacao' && v !== undefined) ctx[k] = v
          }
        }

        let redatorResult: Record<string, unknown>  = {}
        let socialResult:  Record<string, unknown>  = {}
        let artUrl                                  = ''
        let dallePrompt                             = ''

        for (let i = 0; i < finalEtapas.length; i++) {
          const { agente, instrucao } = finalEtapas[i]
          const label = AGENT_LABELS[agente] || agente
          const next  = finalEtapas[i + 1]

          // Orquestrador direciona para o próximo agente
          const directive = next
            ? `➡️ Enviando para **${label}**: ${instrucao}`
            : `➡️ Última etapa — **${label}**: ${instrucao}`
          send({ type: 'orchestrator_message', message: directive })
          send({ type: 'agent_start', agent: agente, message: instrucao })

          try {
            if (agente === 'analista') {
              const analistaModel = config.analista?.model || 'gpt-4o'
              const instrucaoIg = blocoIg
                ? `${instrucao}\n\n--- Contas Instagram de referência (amostra de posts) ---\n${blocoIg}`
                : instrucao
              const result = await runAnalista(client, analistaModel, instrucaoIg, config, send)
              ctx.analista = result
              send({ type: 'agent_done', agent: 'analista', message: String(result.resumo || 'Análise concluída.'), result })
              send({ type: 'orchestrator_message', message: `📊 Analista concluiu. Passando contexto para o próximo agente.` })

            } else if (agente === 'estrategista') {
              const model  = config.estrategista?.model || 'o3-mini'
              const extra  = [config.estrategista?.instrucoes, config.estrategista?.publicoAlvo ? `Público-alvo: ${config.estrategista.publicoAlvo}` : ''].filter(Boolean).join(' | ')
              const result = await runAgent(client, model, 'estrategista', instrucao, ctx, extra)
              ctx.estrategista = result
              send({ type: 'agent_done', agent: 'estrategista', message: String(result.objetivo || 'Estratégia definida.'), result })
              send({ type: 'orchestrator_message', message: `🎯 Gerente de Conteúdo concluiu: ${result.objetivo || ''}. Encaminhando resultado.` })

            } else if (agente === 'redator') {
              const model  = config.redator?.model || 'gpt-4o'
              const extra  = [config.redator?.instrucoes, config.redator?.hashtagsFixas ? `Hashtags fixas: ${config.redator.hashtagsFixas}` : ''].filter(Boolean).join(' | ')
              const result = await runAgent(client, model, 'redator', instrucao, ctx, extra)
              ctx.redator  = result
              redatorResult = result
              send({ type: 'agent_done', agent: 'redator', message: 'Legenda e copy prontos.', result })
              send({ type: 'orchestrator_message', message: `✍️ Copywriter entregou a legenda. Seguindo para próxima etapa.` })

            } else if (agente === 'diretor_arte') {
              const model  = config.diretorArte?.model || 'gpt-4o'
              const extraRefs = narrativaReferenciasParaAgentes(refItems, 'diretor_arte')
              const extra  = [config.diretorArte?.instrucoes, config.diretorArte?.elementosObrig ? `Elementos obrigatórios: ${config.diretorArte.elementosObrig}` : '', extraRefs].filter(Boolean).join(' | ')
              const result = await runAgent(client, model, 'diretor_arte', instrucao, ctx, extra)
              ctx.diretor_arte = result
              send({ type: 'agent_done', agent: 'diretor_arte', message: 'Briefing visual criado.', result })
              send({ type: 'orchestrator_message', message: `🎨 Diretor de Arte entregou o conceito visual. Passando briefing para o Designer.` })

            } else if (agente === 'designer') {
              const { artUrl: url, dallePrompt: prompt } = await runDesigner(client, config, instrucao, ctx, selectedRefs, refItems, send)
              artUrl      = url
              dallePrompt = prompt
              ctx.designer = { url, prompt }
              send({ type: 'agent_done', agent: 'designer', message: 'Arte gerada com sucesso!', result: { url, prompt } })
              send({ type: 'orchestrator_message', message: `🖼️ Designer entregou a arte. Encaminhando para o Social Media Manager.` })

            } else if (agente === 'social_manager') {
              const model  = config.socialManager?.model || 'gpt-4o-mini'
              const extra  = [config.socialManager?.instrucoes, config.socialManager?.horarioPref ? `Horário preferido: ${config.socialManager.horarioPref}` : ''].filter(Boolean).join(' | ')
              const result = await runAgent(client, model, 'social_manager', instrucao, ctx, extra)
              ctx.social_manager = result
              socialResult       = result
              const horario      = String(result.melhor_horario || '')
              const tipo         = String(result.tipo_post || 'feed')
              const plataforma   = String(result.plataforma || 'Instagram')
              send({ type: 'agent_done', agent: 'social_manager', message: `${plataforma} · ${tipo} · ${horario}`, result })
              send({ type: 'orchestrator_message', message: `📅 Social Media Manager definiu: ${tipo} no ${plataforma}, ${horario}. Compilando tudo para aprovação.` })
            }

          } catch (agentErr) {
            const msg = agentErr instanceof Error ? agentErr.message : 'Erro no agente.'
            send({ type: 'agent_error', agent: agente, message: msg })
            send({ type: 'orchestrator_message', message: `⚠️ ${label} encontrou um problema: ${msg}. Continuando com os próximos agentes.` })
          }

          await sleep(250)
        }

        // ── 3. Encerramento: aprovação opcional ou rodada concluída ─────────
        await sleep(400)

        const temEntregaParaPost =
          !!(String(redatorResult.legenda || '').trim()) ||
          !!artUrl ||
          !!(String((socialResult as { melhor_horario?: string }).melhor_horario || '').trim())

        const pedirPainel = solicitarAprovacao && temEntregaParaPost

        if (pedirPainel) {
          const approvalMsg = artUrl
            ? '✅ Entrega pronta para revisão. Preciso da sua aprovação para programar.'
            : '✅ Conteúdo pronto. Aguardando sua aprovação para prosseguir.'
          send({ type: 'orchestrator_message', message: approvalMsg })
          send({
            type:    'approval_required',
            summary: {
              legenda:        String(redatorResult.legenda        || ''),
              cta:            String(redatorResult.cta            || ''),
              variacao:       String(redatorResult.variacao       || ''),
              hashtags:       Array.isArray(socialResult.hashtags) ? socialResult.hashtags : [],
              melhor_horario: String(socialResult.melhor_horario  || ''),
              plataforma:     String(socialResult.plataforma      || 'Instagram'),
              tipo_post:      String(socialResult.tipo_post       || 'feed'),
              artUrl,
              dallePrompt,
              briefing_arte:  String((ctx.diretor_arte as Record<string,unknown>)?.briefing_arte  || ''),
              estrategia:     String((ctx.estrategista  as Record<string,unknown>)?.objetivo       || ''),
              conceito_visual:String((ctx.diretor_arte as Record<string,unknown>)?.conceito_visual || ''),
            },
          })
        } else {
          send({
            type:    'round_complete',
            message: 'Rodada concluída. Você pode enviar uma nova instrução ao Diretor de Marketing na mesma demanda.',
          })
        }

      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erro interno.'
        console.error('[sessao]', msg)
        send({ type: 'error', message: msg })
      } finally {
        send({ type: 'done' })
        ctrl.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type':      'text/event-stream',
      'Cache-Control':     'no-cache, no-transform',
      'Connection':        'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms))
}

function sseError(message: string) {
  return new Response(
    `data: ${JSON.stringify({ type: 'error', message })}\n\ndata: ${JSON.stringify({ type: 'done' })}\n\n`,
    { headers: { 'Content-Type': 'text/event-stream' } },
  )
}
