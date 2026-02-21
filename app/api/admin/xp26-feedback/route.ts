import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

const XP26_SELECT = 'id, created_at, perfil, nota_evento, fortalecer_fe, decisao_importante, acompanhou_instagram, comunicacao_digital, escala_organizada, instrucoes_claras, lider_acessivel, tempo_descanso, falhas_area, valorizado, servir_novamente, melhor_ministracao, melhor_banda, avaliacao_louvor_geral, participara_xp27, superou_expectativa, teve_problema, contato_whatsapp_autorizado, mensagem_final, impacto_outro, decisao_qual, falhas_descricao, motivo_ministracao, indicacao_preletor_xp27, indicacao_banda_xp27, tema_preferido_xp27_outro, sugestao_xp27, descricao_problema, melhorias, servir_melhorar'

/**
 * GET /api/admin/xp26-feedback
 * Lista todas as respostas da pesquisa XP26 (admin). Ordenado por created_at desc.
 */
export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'dashboard', action: 'view' })
  if (!access.ok) return access.response

  try {
    const limitParam = Number(request.nextUrl.searchParams.get('limit') ?? 0)
    const offsetParam = Number(request.nextUrl.searchParams.get('offset') ?? 0)
    const hasLimit = Number.isFinite(limitParam) && limitParam > 0
    const safeLimit = hasLimit ? Math.min(Math.floor(limitParam), 1000) : 0
    const safeOffset = Number.isFinite(offsetParam) && offsetParam >= 0 ? Math.floor(offsetParam) : 0

    const supabase = createSupabaseAdminClient(request)
    let query = supabase
      .from('xp26_feedback')
      .select(XP26_SELECT)
      .order('created_at', { ascending: false })

    if (hasLimit) {
      query = query.range(safeOffset, safeOffset + safeLimit - 1)
    }

    const { data, error } = await query

    if (error) {
      console.error('xp26_feedback list:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ items: data ?? [] })
  } catch (err) {
    console.error('GET /api/admin/xp26-feedback:', err)
    const message = err instanceof Error ? err.message : 'Erro ao carregar pesquisa.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
