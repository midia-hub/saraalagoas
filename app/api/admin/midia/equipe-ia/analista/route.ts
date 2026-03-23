import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { requireAccess } from '@/lib/admin-api'
import { supabaseServer } from '@/lib/supabase-server'
import { fetchInstagramRecentMedia } from '@/lib/meta-fetch-posts'

/**
 * GET /api/admin/midia/equipe-ia/analista
 *
 * Analisa todas as contas Instagram conectadas (Meta integrations).
 * Busca os últimos 30 dias de publicações com insights e usa GPT-4o
 * para gerar contexto de referência para a equipe de IA.
 */
export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'instagram', action: 'view' })
  if (!access.ok) return access.response

  const openaiKey = process.env.OPENAI_API_KEY ?? ''
  if (!openaiKey) {
    return NextResponse.json({ error: 'OPENAI_API_KEY não configurada.' }, { status: 503 })
  }

  const periodoParam = request.nextUrl.searchParams.get('periodo') ?? '30'
  const daysAgo      = Math.max(7, Math.min(60, parseInt(periodoParam, 10) || 30))
  const foco         = request.nextUrl.searchParams.get('foco') ?? ''

  // Busca integrações Meta ativas com Instagram conectado
  const { data: integrations, error: intError } = await supabaseServer
    .from('meta_integrations')
    .select('id, page_name, instagram_username, instagram_business_account_id, page_access_token, is_active')
    .eq('is_active', true)
    .not('instagram_business_account_id', 'is', null)
    .not('page_access_token', 'is', null)

  if (intError) {
    return NextResponse.json({ error: 'Erro ao buscar integrações Meta.' }, { status: 500 })
  }

  if (!integrations || integrations.length === 0) {
    return NextResponse.json(
      { error: 'Nenhuma conta do Instagram conectada e ativa. Configure as integrações Meta.' },
      { status: 404 },
    )
  }

  // Coleta métricas de cada conta em paralelo
  const contas: Array<{
    integrationId: string
    nome: string
    username: string | null
    totalPosts: number
    mediaLikes: number
    mediaComentarios: number
    mediaAlcance: number
    totalImpressoes: number
    totalSalvos: number
    tipoMaisEngajado: string
    distribuicaoTipos: Record<string, number>
    topPost: {
      caption: string | undefined
      likes: number | undefined
      comentarios: number | undefined
      tipo: string | undefined
      permalink: string | undefined
    } | null
  }> = []

  await Promise.all(
    integrations.map(async (integration) => {
      try {
        const posts = await fetchInstagramRecentMedia({
          igUserId:       integration.instagram_business_account_id as string,
          pageAccessToken: integration.page_access_token as string,
          accountName:    integration.instagram_username || integration.page_name || undefined,
          integrationId:  integration.id,
          daysAgo,
          withInsights:   true,
        })

        if (posts.length === 0) return

        const totalLikes       = posts.reduce((s, p) => s + (p.like_count      ?? 0), 0)
        const totalComments    = posts.reduce((s, p) => s + (p.comments_count  ?? 0), 0)
        const totalReach       = posts.reduce((s, p) => s + (p.insights?.reach ?? 0), 0)
        const totalImpressions = posts.reduce((s, p) => s + (p.insights?.impressions ?? 0), 0)
        const totalSaved       = posts.reduce((s, p) => s + (p.insights?.saved ?? 0), 0)

        const n = posts.length

        // Distribuição e engajamento médio por tipo
        const typeEngagement: Record<string, { total: number; count: number }> = {}
        const distribuicaoTipos: Record<string, number> = {}

        for (const post of posts) {
          const t = post.media_type || 'IMAGE'
          distribuicaoTipos[t] = (distribuicaoTipos[t] || 0) + 1
          if (!typeEngagement[t]) typeEngagement[t] = { total: 0, count: 0 }
          typeEngagement[t].total +=
            (post.like_count ?? 0) + (post.comments_count ?? 0) + (post.insights?.saved ?? 0)
          typeEngagement[t].count += 1
        }

        const tipoMaisEngajado =
          Object.entries(typeEngagement)
            .map(([type, { total, count }]) => ({ type, avg: total / count }))
            .sort((a, b) => b.avg - a.avg)[0]?.type ?? 'IMAGE'

        const topPost = [...posts]
          .sort(
            (a, b) =>
              (b.like_count ?? 0) + (b.comments_count ?? 0) + (b.insights?.saved ?? 0) -
              ((a.like_count ?? 0) + (a.comments_count ?? 0) + (a.insights?.saved ?? 0)),
          )[0]

        contas.push({
          integrationId:    integration.id,
          nome:             integration.page_name || integration.instagram_username || 'Conta',
          username:         integration.instagram_username,
          totalPosts:       n,
          mediaLikes:       Math.round(totalLikes / n),
          mediaComentarios: Math.round(totalComments / n),
          mediaAlcance:     Math.round(totalReach / n),
          totalImpressoes:  totalImpressions,
          totalSalvos:      totalSaved,
          tipoMaisEngajado,
          distribuicaoTipos,
          topPost: topPost
            ? {
                caption:    topPost.caption?.slice(0, 200),
                likes:      topPost.like_count,
                comentarios: topPost.comments_count,
                tipo:       topPost.media_type,
                permalink:  topPost.permalink,
              }
            : null,
        })
      } catch (err) {
        console.error(`[analista] Conta ${integration.id}:`, err instanceof Error ? err.message : err)
      }
    }),
  )

  if (contas.length === 0) {
    return NextResponse.json(
      { error: 'Não foi possível obter métricas. Verifique os tokens das integrações Meta.' },
      { status: 500 },
    )
  }

  // GPT-4o analisa as métricas e gera contexto de referência
  try {
    const client = new OpenAI({ apiKey: openaiKey })

    const systemPrompt = `Você é um analista sênior de social media especializado em igrejas evangélicas brasileiras.
Analise as métricas do Instagram fornecidas e retorne APENAS um JSON com este formato exato, sem explicações fora do JSON.
${foco ? `FOCO DESTA ANÁLISE: ${foco}` : ''}
{
  "resumo": "string — análise geral do desempenho em 2-3 frases objetivas",
  "insights": ["string", "string", "string"] — 3 a 5 insights acionáveis baseados nos dados,
  "referencias": ["string", "string", "string"] — 3 tipos/formatos de conteúdo que mais performam para usar como referência,
  "recomendacoes": {
    "formato": "string — formato que mais engaja (Reels/Carrossel/Foto) com justificativa",
    "horario": "string — melhor horário para postar com base nos padrões observados",
    "frequencia": "string — frequência recomendada de postagem",
    "estilo": "string — estilo de comunicação que mais ressoa com a audiência"
  }
}
Base-se APENAS nos dados fornecidos. Não invente métricas. Seja específico e acionável.`

    const completion = await client.chat.completions.create({
      model:  'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role:    'user',
          content: `Métricas do Instagram — últimos ${daysAgo} dias:\n${JSON.stringify(contas, null, 2)}`,
        },
      ],
      max_tokens:       700,
      temperature:      0.3,
      response_format:  { type: 'json_object' },
    })

    const raw    = completion.choices[0]?.message?.content?.trim() ?? '{}'
    const analise = JSON.parse(raw)

    return NextResponse.json({ contas, analise })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[analista] GPT-4o erro:', msg)
    // Retorna métricas mesmo sem análise GPT
    return NextResponse.json({ contas, analise: null, aviso: 'Métricas coletadas, análise GPT indisponível.' })
  }
}
