import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

/**
 * GET /api/admin/pessoas/[id]/conversao
 * Busca os dados da consolidação/conversão mais recente para uma pessoa
 * Retorna os dados para pré-preenchimento do formulário
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireAccess(request, { pageKey: 'consolidacao', action: 'view' })
  if (!access.ok) return access.response

  try {
    const { id } = await params
    if (!id) return NextResponse.json({ error: 'ID da pessoa obrigatório' }, { status: 400 })

    const supabase = createSupabaseAdminClient(request)

    // Buscar a conversão mais recente para essa pessoa
    const { data: conversao, error } = await supabase
      .from('conversoes')
      .select('*')
      .eq('person_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('Erro ao buscar conversão:', error)
      return NextResponse.json({ error: 'Erro ao buscar dados da conversão' }, { status: 500 })
    }

    if (!conversao) {
      return NextResponse.json({ item: null })
    }

    // Enriquecer com dados do consolidador se houver
    let consolidador_pessoa = null
    if (conversao.consolidator_person_id) {
      const { data: consData } = await supabase
        .from('people')
        .select('id, full_name')
        .eq('id', conversao.consolidator_person_id)
        .maybeSingle()
      consolidador_pessoa = consData || null
    }

    // Enriquecer com dados da célula se houver
    let celula_data = null
    if (conversao.cell_id) {
      const { data: cellData } = await supabase
        .from('cells')
        .select('id, name')
        .eq('id', conversao.cell_id)
        .maybeSingle()
      celula_data = cellData || null
    }

    // Retornar dados formatados para pré-preenchimento
    return NextResponse.json({
      item: {
        // Dados pessoais
        nome: conversao.nome,
        email: conversao.email,
        telefone: conversao.telefone,
        data_nascimento: conversao.data_nascimento,
        genero: conversao.gender,
        instagram: conversao.instagram,
        
        // Endereço
        endereco: conversao.endereco,
        bairro: conversao.bairro,
        cidade: conversao.cidade,
        estado: conversao.estado,
        cep: conversao.cep,
        
        // Consolidação
        culto: conversao.culto,
        data_conversao: conversao.data_conversao,
        observacoes: conversao.observacoes,
        conversion_type: conversao.conversion_type,
        
        // Identificadores
        consolidator_person_id: conversao.consolidator_person_id,
        consolidador_pessoa,
        cell_id: conversao.cell_id,
        celula_data,
        church_id: conversao.church_id,
        team_id: conversao.team_id,
      },
    })
  } catch (err) {
    console.error('GET pessoas/[id]/conversao:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
