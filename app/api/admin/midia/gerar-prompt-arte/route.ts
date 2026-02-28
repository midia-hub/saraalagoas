import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { requireAccess } from '@/lib/admin-api'

/**
 * POST /api/admin/midia/gerar-prompt-arte
 *
 * Usa GPT-4o (Vision) para transformar um briefing em um prompt otimizado para DALL-E 3.
 * Segue o estilo identitário da Igreja Sara Alagoas.
 *
 * Body:
 * {
 *   tema:                    string
 *   tom:                     string
 *   formato:                 string
 *   detalhes?:               string
 *   reference_image_base64?: string  — data URI da arte de referência (max 5 MB)
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
  const tema                 = String(body.tema     ?? '').slice(0, 300).trim()
  const tom                  = String(body.tom      ?? 'Inspirador').slice(0, 100)
  const formato              = String(body.formato  ?? '1024x1024')
  const detalhes             = String(body.detalhes ?? '').slice(0, 500)
  const referenceImageBase64 = typeof body.reference_image_base64 === 'string'
    ? body.reference_image_base64.slice(0, 5_000_000)
    : null

  if (!tema) {
    return NextResponse.json({ error: 'Informe o tema da arte.' }, { status: 400 })
  }

  const formatLabel =
    formato === '1024x1792' ? 'retrato vertical (Stories / 9:16)' :
    formato === '1792x1024' ? 'horizontal (16:9)' :
    'quadrado (1:1 / Feed)'

  const systemPrompt = `Você é um especialista em design gráfico digital para igrejas evangélicas brasileiras.
Sua tarefa é criar prompts em inglês para o DALL-E 3 gerar artes gráficas profissionais.
O estilo identitário da Igreja Sara Alagoas possui:
- Fundos texturizados (concreto, papel envelhecido, degradê escuro)
- Tipografia bold e impactante como elemento gráfico de fundo (grandes letras cortadas pela borda)
- Acentos em ciano/teal vibrante como elemento de destaque e contraste
- Fotos de pessoas em estilo cutout (recorte sem fundo, integradas ao layout)
- Data do evento destacada em círculo escuro com tipografia forte
- Área inferior com fundo claro/bege para texto do evento
- Paleta principal: preto, branco, ciano/teal, bege claro
- Estética moderna, clean e profissional para redes sociais
NUNCA inclua texto ou letras nas imagens. Descreva APENAS elementos visuais.
O prompt deve ser direto, rico em detalhes visuais, até 200 palavras.`

  try {
    const client = new OpenAI({ apiKey: openaiKey })

    let userContent: OpenAI.Chat.ChatCompletionUserMessageParam['content']

    if (referenceImageBase64) {
      userContent = [
        {
          type: 'text' as const,
          text: `Analise esta arte de referência fornecida pelo usuário. Identifique: paleta de cores, estilo gráfico, layout, elementos visuais marcantes e atmosfera geral. Em seguida crie um prompt DALL-E que capture exatamente esse mesmo estilo visual aplicado ao seguinte briefing:

Tema: ${tema}
Tom: ${tom}
Formato: ${formatLabel}
${detalhes ? `Detalhes: ${detalhes}` : ''}

Responda APENAS com o prompt em inglês, sem explicações.`,
        },
        {
          type: 'image_url' as const,
          image_url: { url: referenceImageBase64, detail: 'low' as const },
        },
      ]
    } else {
      userContent = `Crie um prompt DALL-E para:
Tema: ${tema}
Tom: ${tom}
Formato: ${formatLabel}
${detalhes ? `Detalhes: ${detalhes}` : ''}

Siga o estilo Sara Alagoas descrito.
Responda APENAS com o prompt em inglês, sem explicações.`
    }

    const completion = await client.chat.completions.create({
      model:  'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userContent },
      ],
      max_tokens:  400,
      temperature: 0.7,
    })

    const prompt = completion.choices[0]?.message?.content?.trim() ?? ''
    if (!prompt) throw new Error('Resposta vazia da IA.')

    return NextResponse.json({ prompt })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[gerar-prompt-arte] Erro:', msg)
    return NextResponse.json({ error: `Erro ao gerar prompt: ${msg}` }, { status: 500 })
  }
}
