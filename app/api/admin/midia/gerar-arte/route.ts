import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { requireAccess } from '@/lib/admin-api'

/**
 * POST /api/admin/midia/gerar-arte
 *
 * Gera imagem com DALL-E 3 a partir de um briefing de arte para demanda.
 *
 * Body:
 * {
 *   prompt:       string  — briefing/instrução para a arte
 *   size?:        '1024x1024' | '1792x1024' | '1024x1792'   (default: 1024x1024)
 *   quality?:     'standard' | 'hd'                         (default: standard)
 *   style?:       'vivid' | 'natural'                        (default: vivid)
 *   n?:           1..4                                        (default: 1)
 * }
 */
export async function POST(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'instagram', action: 'create' })
  if (!access.ok) return access.response

  const openaiKey = process.env.OPENAI_API_KEY ?? ''
  if (!openaiKey) {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY não configurada.' },
      { status: 503 },
    )
  }

  const body = await request.json().catch(() => ({}))

  const prompt: string = typeof body.prompt === 'string' ? body.prompt.slice(0, 1000).trim() : ''
  if (!prompt) {
    return NextResponse.json({ error: 'Informe o prompt/briefing para a arte.' }, { status: 400 })
  }

  const size = (['1024x1024', '1792x1024', '1024x1792'] as const).includes(body.size)
    ? (body.size as '1024x1024' | '1792x1024' | '1024x1792')
    : '1024x1024'
  const quality = body.quality === 'hd' ? 'hd' : 'standard'
  const style   = body.style === 'natural' ? 'natural' : 'vivid'
  const n       = Math.min(Math.max(Number(body.n) || 1, 1), 4)

  // Inject de contexto para igrejas evangélicas
  const fullPrompt = `Arte gráfica para comunicação de igreja evangélica brasileira. ${prompt}. Estilo moderno, colorido e acolhedor. Sem texto sobreposto.`

  try {
    const client = new OpenAI({ apiKey: openaiKey })
    const response = await client.images.generate({
      model:   'dall-e-3',
      prompt:  fullPrompt,
      size,
      quality,
      style,
      n: Math.min(n, 1), // DALL-E 3 suporta n=1 apenas
      response_format: 'url',
    })

    const images = (response.data ?? []).map((img) => ({
      url:             img.url,
      revisedPrompt:   img.revised_prompt,
    }))

    return NextResponse.json({ images, prompt: fullPrompt })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[gerar-arte] Erro DALL-E:', msg)
    return NextResponse.json({ error: `Erro ao gerar arte: ${msg}` }, { status: 500 })
  }
}
