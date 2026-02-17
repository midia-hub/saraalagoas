import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase-server'

const ARENAS = ['Arena Principal', 'Arena Games', 'Arena Experiência', 'Arena Kids', 'Todas']
const PERFIS = ['Participante', 'Voluntário']
const ORGANIZACAO_OPCOES = ['Excelente', 'Muito boa', 'Boa', 'Regular', 'Precisa melhorar']
const SUPEROU_OPCOES = ['Sim', 'Não', 'Parcialmente']
const IMPACTO_OPCOES = ['Estrutura', 'Programação', 'Organização', 'Comunicação', 'Experiência espiritual', 'Ambiente', 'Outro']

const MAX_TEXT = 500

function truncate(s: string | null | undefined, max: number): string | null {
  if (s == null) return null
  const t = String(s).trim()
  if (!t) return null
  return t.length > max ? t.slice(0, max) : t
}

/**
 * POST /api/public/xp26-feedback
 * Recebe o payload da pesquisa pós-evento XP26 Alagoas (formulário público).
 */
export async function POST(request: NextRequest) {
  let supabase: ReturnType<typeof createSupabaseServiceClient>
  try {
    supabase = createSupabaseServiceClient()
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Supabase não configurado.'
    console.error('createSupabaseServiceClient:', msg)
    return NextResponse.json({ error: msg }, { status: 503 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const arena = body.arena != null && ARENAS.includes(String(body.arena).trim())
      ? String(body.arena).trim()
      : null
    const perfil = body.perfil != null ? String(body.perfil).trim() : ''
    const nota_evento = body.nota_evento != null ? Number(body.nota_evento) : null
    const organizacao = body.organizacao != null ? String(body.organizacao).trim() : ''
    const nps = body.nps != null ? Number(body.nps) : null

    const perfilValido = perfil && PERFIS.includes(perfil) ? perfil : null
    const notaValida = nota_evento != null && !Number.isNaN(nota_evento) && nota_evento >= 0 && nota_evento <= 10 ? Math.round(nota_evento) : null
    const organizacaoValida = organizacao && ORGANIZACAO_OPCOES.includes(organizacao) ? organizacao : null
    const npsValido = nps != null && !Number.isNaN(nps) && nps >= 0 && nps <= 10 ? Math.round(nps) : null

    const impactoRaw = body.impacto_principal
    let impacto_principal: string[] | null = null
    if (Array.isArray(impactoRaw)) {
      impacto_principal = impactoRaw
        .map((x: unknown) => (x != null ? String(x).trim() : ''))
        .filter((x: string) => x && IMPACTO_OPCOES.includes(x))
      if (impacto_principal.length === 0) impacto_principal = null
    }
    const impacto_outro = truncate(body.impacto_outro, MAX_TEXT)

    const teve_problema = body.teve_problema === true || body.teve_problema === 'true'
    const descricao_problema = truncate(body.descricao_problema, MAX_TEXT)
    const superou_expectativa = body.superou_expectativa != null && SUPEROU_OPCOES.includes(String(body.superou_expectativa))
      ? String(body.superou_expectativa).trim()
      : null
    const melhorias = truncate(body.melhorias, MAX_TEXT)
    const mensagem_final = truncate(body.mensagem_final, MAX_TEXT)

    // Campos específicos Participante
    const decisao_importante = body.decisao_importante === true || body.decisao_importante === 'true' ? true : body.decisao_importante === false || body.decisao_importante === 'false' ? false : null
    const acompanhou_instagram = body.acompanhou_instagram === true || body.acompanhou_instagram === 'true' ? true : body.acompanhou_instagram === false || body.acompanhou_instagram === 'false' ? false : null
    const falhas_area = body.falhas_area === true || body.falhas_area === 'true' ? true : body.falhas_area === false || body.falhas_area === 'false' ? false : null

    const contato_whatsapp_autorizado = body.contato_whatsapp_autorizado === true || body.contato_whatsapp_autorizado === 'true'
    const nome_contato = truncate(body.nome_contato, 120)
    const whatsapp_contato = truncate(body.whatsapp_contato, 20)

    const payload = {
      arena: arena ?? null,
      perfil: perfilValido,
      nota_evento: notaValida,
      impacto_principal: impacto_principal ?? [],
      impacto_outro: impacto_outro ?? null,
      fortalecer_fe: truncate(body.fortalecer_fe, MAX_TEXT),
      decisao_importante,
      decisao_qual: truncate(body.decisao_qual, MAX_TEXT),
      ministeracoes_claras: truncate(body.ministeracoes_claras, MAX_TEXT),
      tempo_atividades: truncate(body.tempo_atividades, MAX_TEXT),
      sinalizacao: truncate(body.sinalizacao, MAX_TEXT),
      filas: truncate(body.filas, MAX_TEXT),
      som: truncate(body.som, MAX_TEXT),
      info_antes_evento: truncate(body.info_antes_evento, MAX_TEXT),
      acompanhou_instagram,
      comunicacao_digital: truncate(body.comunicacao_digital, MAX_TEXT),
      participara_xp27: truncate(body.participara_xp27, MAX_TEXT),
      escala_organizada: truncate(body.escala_organizada, MAX_TEXT),
      instrucoes_claras: truncate(body.instrucoes_claras, MAX_TEXT),
      lider_acessivel: truncate(body.lider_acessivel, MAX_TEXT),
      carga_horaria: truncate(body.carga_horaria, MAX_TEXT),
      tempo_descanso: truncate(body.tempo_descanso, MAX_TEXT),
      falhas_area,
      falhas_descricao: truncate(body.falhas_descricao, MAX_TEXT),
      valorizado: truncate(body.valorizado, MAX_TEXT),
      lider_avaliacao: truncate(body.lider_avaliacao, MAX_TEXT),
      servir_novamente: truncate(body.servir_novamente, MAX_TEXT),
      servir_melhorar: truncate(body.servir_melhorar, MAX_TEXT),
      melhor_ministracao: truncate(body.melhor_ministracao, MAX_TEXT),
      motivo_ministracao: truncate(body.motivo_ministracao, 400),
      avaliacao_geral_ministracoes: truncate(body.avaliacao_geral_ministracoes, MAX_TEXT),
      melhor_banda: truncate(body.melhor_banda, MAX_TEXT),
      avaliacao_louvor_geral: truncate(body.avaliacao_louvor_geral, MAX_TEXT),
      avaliacao_som_louvor: truncate(body.avaliacao_som_louvor, MAX_TEXT),
      avaliacao_energia_banda: truncate(body.avaliacao_energia_banda, MAX_TEXT),
      avaliacao_conexao_louvor: truncate(body.avaliacao_conexao_louvor, MAX_TEXT),
      formato_preferido_xp27: truncate(body.formato_preferido_xp27, MAX_TEXT),
      indicacao_preletor_xp27: truncate(body.indicacao_preletor_xp27, 300),
      indicacao_banda_xp27: truncate(body.indicacao_banda_xp27, MAX_TEXT),
      tema_preferido_xp27: Array.isArray(body.tema_preferido_xp27)
        ? body.tema_preferido_xp27.map((x: unknown) => (x != null ? String(x).trim() : '')).filter(Boolean)
        : null,
      tema_preferido_xp27_outro: truncate(body.tema_preferido_xp27_outro, MAX_TEXT),
      sugestao_xp27: truncate(body.sugestao_xp27, MAX_TEXT),
      organizacao: organizacaoValida,
      teve_problema,
      descricao_problema,
      superou_expectativa,
      nps: npsValido,
      melhorias,
      mensagem_final,
      contato_whatsapp_autorizado,
      nome_contato,
      whatsapp_contato,
    }

    const { data, error } = await supabase.from('xp26_feedback').insert(payload).select('id').single()
    if (error) {
      console.error('xp26_feedback insert:', error)
      return NextResponse.json(
        { error: process.env.NODE_ENV === 'development' ? error.message : 'Erro ao salvar pesquisa. Tente novamente.' },
        { status: 500 }
      )
    }
    return NextResponse.json({ id: data?.id, ok: true })
  } catch (err) {
    console.error('Erro em public xp26-feedback:', err)
    const message = err instanceof Error ? err.message : 'Erro interno do servidor'
    return NextResponse.json(
      { error: process.env.NODE_ENV === 'development' ? message : 'Erro ao enviar pesquisa. Tente novamente.' },
      { status: 500 }
    )
  }
}
