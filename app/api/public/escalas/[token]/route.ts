import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

type Params = { params: { token: string } }

/**
 * GET /api/public/escalas/[token]
 * Retorna os dados públicos de um link de escala:
 * - link (ministério, mês, ano, label, status)
 * - slots (cultos/arenas/eventos do mês)
 * - volunteers (pessoas vinculadas ao ministério da church)
 */
export async function GET(request: NextRequest, { params }: Params) {
  const supabase = createSupabaseAdminClient(request)

  // 1. Busca o link pelo token
  const { data: link, error: linkErr } = await supabase
    .from('escalas_links')
    .select('id, token, ministry, month, year, label, status, church_id, church:churches(id, name)')
    .eq('token', params.token)
    .single()

  if (linkErr || !link) {
    return NextResponse.json({ error: 'Link não encontrado ou inválido.' }, { status: 404 })
  }

  // 2. Busca os slots
  const { data: slots } = await supabase
    .from('escalas_slots')
    .select('id, type, label, date, time_of_day, sort_order, funcoes')
    .eq('link_id', link.id)
    .order('date', { ascending: true })
    .order('time_of_day', { ascending: true })

  // 3. Busca voluntários vinculados ao ministério do link
  // Primeiro buscamos o ID do ministério pelo nome (pois o link guarda o nome)
  const { data: ministryRecord } = await supabase
    .from('ministries')
    .select('id')
    .eq('name', link.ministry)
    .single()

  const ministryId = ministryRecord?.id || null
  const churchName = (link.church as any)?.name || ''

  // Depois buscamos as pessoas que pertencem a esse ministério.
  // Buscamos também as funções cadastradas para cada pessoa no people_ministries.
  let peopleQuery = supabase
    .from('people')
    .select(`
      id, 
      full_name,
      church_name,
      people_ministries!inner(ministry_id, funcoes)
    `)
    .eq('people_ministries.ministry_id', ministryId || '00000000-0000-0000-0000-000000000001')
    .order('full_name')

  // Se tivermos churchName, filtramos para mostrar apenas dessa igreja ou sem igreja definida (para evitar sumir gente por erro de cadastro)
  const { data: peopleData, error: peopleErr } = await peopleQuery

  if (peopleErr) {
    console.error('❌ [API:public:escalas] Erro ao buscar voluntários:', peopleErr)
  }

  // Filtragem flexível em JS para garantir compatibilidade
  const volunteers = (peopleData ?? [])
    .filter((p: any) => !churchName || !p.church_name || p.church_name === churchName)
    .map((p: any) => ({
      id: p.id,
      full_name: p.full_name,
      funcoes: (p.people_ministries as any)?.funcoes || []
    }))

  // 4. Respostas já enviadas (para pre-popular se o voluntário voltar)
  const { data: respostas } = await supabase
    .from('escalas_respostas')
    .select('person_id, slot_id, disponivel, observacao')
    .eq('link_id', link.id)

  // 5. Metadados dos voluntários para esta escala específica (como as funções que ele marcou que pode fazer NESTE mês)
  const { data: linkVolunteers } = await supabase
    .from('escalas_voluntarios')
    .select('person_id, funcoes')
    .eq('link_id', link.id)

  // Mescla as funções: Link-specific tem prioridade sobre o perfil global
  const volunteersFinal = volunteers.map(v => {
    const lv = linkVolunteers?.find(l => l.person_id === v.id)
    return {
      ...v,
      funcoes: lv?.funcoes ?? v.funcoes
    }
  })

  // 6. Calcula a lista de todas as funções únicas exigidas nos slots
  const funcoesDisponiveis = Array.from(new Set(
    (slots ?? []).flatMap(s => Array.isArray(s.funcoes) ? s.funcoes : [])
  )).sort()

  return NextResponse.json({
    link: {
      id: link.id,
      ministry: link.ministry,
      month: link.month,
      year: link.year,
      label: link.label,
      status: link.status,
      church: link.church,
    },
    slots: slots ?? [],
    volunteers: volunteersFinal,
    respostas: respostas ?? [],
    funcoes_disponiveis: funcoesDisponiveis,
  })
}
