import { NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase-server'

/**
 * GET /api/public/xp26-resultados
 * Retorna as respostas da pesquisa XP26 para o dashboard público (sem autenticação).
 */
export async function GET() {
  try {
    const supabase = createSupabaseServiceClient()
    const { data, error } = await supabase
      .from('xp26_feedback')
      .select('id, created_at, perfil, nota_evento, fortalecer_fe, decisao_importante, acompanhou_instagram, comunicacao_digital, escala_organizada, instrucoes_claras, lider_acessivel, tempo_descanso, falhas_area, valorizado, servir_novamente, melhor_ministracao, melhor_banda, avaliacao_louvor_geral, participara_xp27, superou_expectativa, teve_problema, contato_whatsapp_autorizado, mensagem_final, impacto_outro, decisao_qual, falhas_descricao, motivo_ministracao, indicacao_preletor_xp27, indicacao_banda_xp27, tema_preferido_xp27_outro, sugestao_xp27, descricao_problema, melhorias, servir_melhorar')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('xp26_resultados list:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ items: data ?? [] })
  } catch (err) {
    console.error('GET /api/public/xp26-resultados:', err)
    const message = err instanceof Error ? err.message : 'Erro ao carregar resultados.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
