import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { requireAccess } from '@/lib/admin-api'
import { supabaseServer } from '@/lib/supabase-server'

// ── Prompts padrão (fallback quando o banco não tiver registro) ────────────────
const DEFAULT_SYSTEM_PROMPT = `Você é um especialista em comunicação digital para igrejas evangélicas brasileiras.
Escreva legendas autênticas, acolhedoras e que conectam fé com o cotidiano das pessoas.
Use linguagem natural do português brasileiro. NUNCA use títulos como "Legenda:" ou "Post:".
Entregue APENAS o texto final da legenda, sem explicações adicionais.

REGRAS OBRIGATÓRIAS — siga sem exceção:
1. DATAS: NUNCA escreva datas no formato "24 de fevereiro", "24/02" ou similares. Use sempre termos relativos fornecidos no contexto: "Ontem", "Domingo", "Sábado", "Na última terça", "No domingo passado" etc.
2. FOTOS/IMAGENS: NUNCA mencione fotos, registros fotográficos, cliques, imagens, álbuns ou galeria. Foque nas pessoas, emoções, no culto e no impacto espiritual. Use expressões como "pudemos ver como foi impactante", "as pessoas viveram um momento incrível", "essa foi a emoção do culto", "que noite de transformações".
3. TRECHO DA PALAVRA: Se o contexto incluir trecho bíblico ou da pregação, incorpore-o naturalmente e fielmente na legenda, sem alterar seu sentido — integre ao texto corrido como parte da narrativa.
4. FORMATAÇÃO: Estruture a legenda com quebras de linha entre frases e parágrafos. NUNCA entregue tudo em um bloco único. Cada ideia principal deve ter seu próprio parágrafo ou linha para facilitar a leitura.`

const DEFAULT_ALBUM_INSTRUCTIONS = `IMPORTANTE: Este evento JÁ ACONTECEU. Estamos celebrando o que foi vivido.
- Escreva no passado/presente comemorativo ("Foi incrível", "Que momento", "Que noite", "Como foi lindo")
- Foque nas pessoas e no impacto espiritual — NUNCA nas fotos ou registros
- Use a data relativa fornecida no contexto ("No domingo", "Ontem", "Na última sexta") — NUNCA a data por extenso
- NÃO convide para algo futuro, NÃO use "venha", "não perca", "participe"
- Celebre o que aconteceu e agradeça quem esteve presente
- Convide quem vê a marcar quem estava lá`

const DEFAULT_STANDARD_INSTRUCTIONS = `- Se fizer sentido, termine com um convite ou chamada para ação
- NUNCA mencione fotos ou registros, foque nas pessoas e no impacto`

async function loadPrompts() {
  try {
    const { data } = await supabaseServer.from('ia_config').select('key, value')
    const map: Record<string, string> = {}
    for (const row of data ?? []) map[row.key as string] = row.value as string
    return {
      systemPrompt:        map['system_prompt']        || DEFAULT_SYSTEM_PROMPT,
      albumInstructions:   map['album_instructions']   || DEFAULT_ALBUM_INSTRUCTIONS,
      standardInstructions: map['standard_instructions'] || DEFAULT_STANDARD_INSTRUCTIONS,
    }
  } catch {
    return { systemPrompt: DEFAULT_SYSTEM_PROMPT, albumInstructions: DEFAULT_ALBUM_INSTRUCTIONS, standardInstructions: DEFAULT_STANDARD_INSTRUCTIONS }
  }
}

/**
 * POST /api/midia/gerar-legenda
 *
 * Estratégia: Gemini 2.0 Flash (gratuito, até 1.500 req/dia) → fallback OpenAI.
 *
 * Body:
 * {
 *   context?:      string   – Contexto do post (obrigatório quando sem visão)
 *   tone:          string   – inspirador | evangelístico | informativo | comemorativo | reflexivo
 *   platform:      'instagram' | 'facebook' | 'ambos'
 *   hashtags:      boolean  – Incluir hashtags sugeridas
 *   maxChars:      number   – Limite de caracteres (padrão 400)
 *   imageDataUrl?: string   – data:image/... base64 — ativa modo visão
 * }
 */
export async function POST(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'instagram', action: 'view' })
  if (!access.ok) return access.response

  const googleKey = process.env.GOOGLE_AI_API_KEY ?? ''
  const openaiKey = process.env.OPENAI_API_KEY   ?? ''

  if (!googleKey && !openaiKey) {
    return NextResponse.json(
      { error: 'Nenhuma chave de IA configurada. Configure GOOGLE_AI_API_KEY ou OPENAI_API_KEY.' },
      { status: 503 }
    )
  }

  const body = await request.json().catch(() => ({}))

  const context: string    = typeof body.context      === 'string' ? body.context.slice(0, 500)      : ''
  const tone: string       = typeof body.tone         === 'string' ? body.tone.slice(0, 50)           : 'inspirador'
  const platform: string   = typeof body.platform     === 'string' ? body.platform                    : 'instagram'
  const hashtags: boolean  = Boolean(body.hashtags ?? true)
  const maxChars: number   = Math.min(Math.max(Number(body.maxChars) || 400, 100), 2000)
  const isAlbumPost: boolean = Boolean(body.isAlbumPost)
  const albumDateRaw: string  = typeof body.albumDate === 'string' ? body.albumDate : ''
  const imageDataUrl: string | null =
    typeof body.imageDataUrl === 'string' && body.imageDataUrl.startsWith('data:image/')
      ? body.imageDataUrl
      : null

  // Visão: contexto é opcional; sem visão: contexto é obrigatório
  if (!imageDataUrl && !context.trim()) {
    return NextResponse.json({ error: 'Informe o contexto do post.' }, { status: 400 })
  }

  const toneMap: Record<string, string> = {
    inspirador:     'inspirador e motivacional, com energia positiva',
    evangelístico:  'evangelístico, convidando pessoas a conhecerem a fé',
    informativo:    'informativo e claro, comunicando os detalhes com objetividade',
    comemorativo:   'comemorativo e festivo, celebrando o momento',
    reflexivo:      'reflexivo e profundo, provocando o leitor a pensar',
  }

  const platformMap: Record<string, string> = {
    instagram: 'Instagram',
    facebook:  'Facebook',
    ambos:     'Instagram e Facebook',
  }

  const toneDesc     = toneMap[tone]     ?? `com tom ${tone}`
  const platformDesc = platformMap[platform] ?? 'redes sociais'

  // ── Label relativo para a data do evento ──────────────────────────────────────
  const PT_DAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
  function relativeDayLabel(isoDate: string): string {
    if (!isoDate) return ''
    const nowMs   = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Maceio' })).setHours(0, 0, 0, 0)
    const eventD  = new Date(isoDate + 'T12:00:00-03:00')
    const eventMs = new Date(eventD).setHours(0, 0, 0, 0)
    const diffDays = Math.round((nowMs - eventMs) / 86400000)
    if (diffDays === 0) return 'hoje'
    if (diffDays === 1) return 'ontem'
    if (diffDays <= 7)  return `no ${PT_DAYS[eventD.getDay()]}`
    return `no ${PT_DAYS[eventD.getDay()]} passado`
  }
  const dayLabel = albumDateRaw ? relativeDayLabel(albumDateRaw) : ''

  // Carrega prompts do banco (com fallback para defaults)
  const { systemPrompt, albumInstructions, standardInstructions } = await loadPrompts()

  const hashtagLine = hashtags
    ? '\n- Inclua de 3 a 8 hashtags relevantes ao final'
    : '\n- NÃO inclua hashtags'

  const contextLine = context.trim()
    ? `\n- Contexto adicional: ${context.trim()}`
    : ''

  const dayLabelLine = dayLabel
    ? `\n- Referência de quando foi: ${dayLabel} (use este termo relativo para mencionar quando aconteceu, NUNCA a data por extenso)`
    : ''

  // Instruções específicas para posts de álbum (evento já aconteceu — são fotos registradas)
  const albumInstructionsBlock = isAlbumPost ? albumInstructions : standardInstructions

  const visionPrompt = `Analise esta imagem e crie uma legenda para ${platformDesc}:
- Tom: ${toneDesc}${contextLine}${dayLabelLine}
- Máximo de ${maxChars} caracteres${hashtagLine}
- Use emojis com moderação para dar personalidade
${albumInstructionsBlock}

Escreva diretamente a legenda, sem prefixos ou labels.`

  const textPrompt = isAlbumPost
    ? `Crie uma legenda para ${platformDesc} sobre um evento que já aconteceu e que estamos celebrando.

${albumInstructionsBlock}${dayLabel ? `\n- Este evento aconteceu ${dayLabel}` : ''}

Detalhes:
- Tom: ${toneDesc}
- Contexto: ${context}
- Máximo de ${maxChars} caracteres${hashtagLine}
- Use emojis com moderação

Escreva diretamente a legenda, sem prefixos ou labels.`
    : `Crie uma legenda para ${platformDesc} com as seguintes características:
- Tom: ${toneDesc}
- Contexto: ${context}${dayLabelLine}
- Máximo de ${maxChars} caracteres${hashtagLine}
- Use emojis com moderação para dar personalidade
${albumInstructionsBlock}

Escreva diretamente a legenda, sem prefixos ou labels.`

  // ── Tentativa 1: Gemini 2.0 Flash (gratuito, 1.500 req/dia) ──────────────
  if (googleKey) {
    try {
      const genAI = new GoogleGenerativeAI(googleKey)
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
        systemInstruction: systemPrompt,
      })

      let result
      if (imageDataUrl) {
        const base64Data = imageDataUrl.split(',')[1] ?? ''
        const mimeType   = (imageDataUrl.match(/data:(image\/\w+);/) ?? [])[1] ?? 'image/jpeg'
        result = await model.generateContent([
          { inlineData: { data: base64Data, mimeType: mimeType as 'image/jpeg' | 'image/png' | 'image/webp' } },
          visionPrompt,
        ])
      } else {
        result = await model.generateContent(textPrompt)
      }

      const caption = result.response.text().trim()
      if (caption) return NextResponse.json({ caption, provider: 'gemini' })
    } catch (geminiErr) {
      // quota ou erro → tenta OpenAI abaixo
      console.warn('[gerar-legenda] Gemini falhou, usando OpenAI:', geminiErr instanceof Error ? geminiErr.message : geminiErr)
    }
  }

  // ── Fallback: OpenAI ──────────────────────────────────────────────────────
  if (!openaiKey) {
    return NextResponse.json(
      { error: 'Limite do Gemini atingido e OPENAI_API_KEY não configurada.' },
      { status: 503 }
    )
  }

  try {
    const client = new OpenAI({ apiKey: openaiKey })
    let caption = ''

    if (imageDataUrl) {
      const response = await client.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: imageDataUrl, detail: 'low' } },
              { type: 'text', text: visionPrompt },
            ],
          },
        ],
        max_tokens: 600,
        temperature: 0.78,
      })
      caption = response.choices[0]?.message?.content?.trim() ?? ''
    } else {
      const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: textPrompt   },
        ],
        max_tokens: 600,
        temperature: 0.78,
      })
      caption = response.choices[0]?.message?.content?.trim() ?? ''
    }

    if (!caption) throw new Error('Resposta vazia da IA.')
    return NextResponse.json({ caption, provider: 'openai' })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro ao conectar com a IA.'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
