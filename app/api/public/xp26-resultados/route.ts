import { NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase-server'

const XP26_SELECT = 'id, created_at, perfil, nota_evento, fortalecer_fe, decisao_importante, acompanhou_instagram, comunicacao_digital, escala_organizada, instrucoes_claras, lider_acessivel, tempo_descanso, falhas_area, valorizado, servir_novamente, melhor_ministracao, melhor_banda, avaliacao_louvor_geral, participara_xp27, superou_expectativa, teve_problema, contato_whatsapp_autorizado, mensagem_final, impacto_outro, decisao_qual, falhas_descricao, motivo_ministracao, indicacao_preletor_xp27, indicacao_banda_xp27, tema_preferido_xp27_outro, sugestao_xp27, descricao_problema, melhorias, servir_melhorar'
const PUBLIC_CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
}

/**
 * GET /api/public/xp26-resultados
 * Retorna as respostas da pesquisa XP26 para o dashboard público (sem autenticação).
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const limitParam = Number(url.searchParams.get('limit') ?? 0)
    const offsetParam = Number(url.searchParams.get('offset') ?? 0)
    const hasLimit = Number.isFinite(limitParam) && limitParam > 0
    const safeLimit = hasLimit ? Math.min(Math.floor(limitParam), 1000) : 0
    const safeOffset = Number.isFinite(offsetParam) && offsetParam >= 0 ? Math.floor(offsetParam) : 0

    const supabase = createSupabaseServiceClient()
    let query = supabase
      .from('xp26_feedback')
      .select(XP26_SELECT)
      .order('created_at', { ascending: false })

    if (hasLimit) {
      query = query.range(safeOffset, safeOffset + safeLimit - 1)
    }

    const { data, error } = await query

    if (error) {
      console.error('xp26_resultados list:', error)
      return NextResponse.json({ error: error.message }, { status: 500, headers: PUBLIC_CACHE_HEADERS })
    }

    return NextResponse.json({ items: data ?? [] }, { headers: PUBLIC_CACHE_HEADERS })
  } catch (err) {
    console.error('GET /api/public/xp26-resultados:', err)
    const message = err instanceof Error ? err.message : 'Erro ao carregar resultados.'
    return NextResponse.json({ error: message }, { status: 500, headers: PUBLIC_CACHE_HEADERS })
  }
}
