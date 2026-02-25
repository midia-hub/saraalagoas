import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

type Params = { params: { id: string } }

/**
 * GET /api/admin/escalas/[id]/voluntarios
 * Retorna todos os voluntários do ministério/igreja da escala,
 * mesclados com os dados de escalas_voluntarios já gravados.
 */
export async function GET(request: NextRequest, { params }: Params) {
  const access = await requireAccess(request, { pageKey: 'escalas', action: 'view' })
  if (!access.ok) return access.response

  const supabase = createSupabaseAdminClient(request)

  // 1. Busca o link para saber ministério, igreja e funções dos slots
  const { data: link, error: linkErr } = await supabase
    .from('escalas_links')
    .select('id, token, ministry, month, year, label, church_id, church:churches(id, name)')
    .eq('id', params.id)
    .single()

  if (linkErr || !link) {
    return NextResponse.json({ error: 'Escala não encontrada.' }, { status: 404 })
  }

  const churchName = (link.church as any)?.name || ''

  // 2. Funções únicas dos slots desta escala
  const { data: slots } = await supabase
    .from('escalas_slots')
    .select('funcoes')
    .eq('link_id', params.id)

  const funcoesDisponiveis: string[] = Array.from(
    new Set((slots ?? []).flatMap((s: any) => s.funcoes ?? []))
  ).filter(Boolean)

  // 3. ID do ministério pelo nome
  const { data: ministryRecord } = await supabase
    .from('ministries')
    .select('id')
    .eq('name', link.ministry)
    .single()

  const ministryId = ministryRecord?.id ?? null

  // 4. Todos os voluntários do ministério + igreja
  const { data: peopleData } = ministryId
    ? await supabase
        .from('people')
        .select('id, full_name, people_ministries!inner(ministry_id, funcoes)')
        .eq('people_ministries.ministry_id', ministryId)
        .eq('church_name', churchName)
        .order('full_name')
    : { data: [] }

  // 5. Registros já gravados de escalas_voluntarios
  const { data: evData } = await supabase
    .from('escalas_voluntarios')
    .select('person_id, ativo, vai_servir, funcoes')
    .eq('link_id', params.id)

  const evMap: Record<string, { ativo: boolean; vai_servir: boolean | null; funcoes: string[] | null }> = {}
  for (const ev of evData ?? []) {
    evMap[ev.person_id] = {
      ativo: ev.ativo,
      vai_servir: ev.vai_servir,
      funcoes: ev.funcoes,
    }
  }

  // 6. Merge: todos os voluntários + dados salvos
  const volunteers = (peopleData ?? []).map((p: any) => {
    const saved = evMap[p.id]
    // Funções: escalas_voluntarios tem prioridade. Se não houver registro lá,
    // usamos as funções "padrão" do people_ministries.
    // Se o registro em escalas_voluntarios existir mas funcoes for vazio,
    // ele deve permanecer vazio (usuário pode ter limpado).
    // Mas para o primeiro carregamento, se saved não existir, usamos o default.

    const fallbackFuncoes = (p.people_ministries?.[0]?.funcoes) ?? []

    return {
      id: p.id,
      full_name: p.full_name,
      ativo: saved ? saved.ativo : true,
      vai_servir: saved ? saved.vai_servir : null,
      funcoes: saved ? (saved.funcoes ?? []) : fallbackFuncoes,
    }
  })

  return NextResponse.json({
    link: {
      id: link.id,
      token: link.token,
      ministry: link.ministry,
      month: link.month,
      year: link.year,
      label: link.label,
      church: link.church,
    },
    funcoes_disponiveis: funcoesDisponiveis,
    volunteers,
  })
}

/**
 * PUT /api/admin/escalas/[id]/voluntarios
 * Upsert de um voluntário na escala.
 * Body: { person_id, ativo, vai_servir, funcoes }
 */
export async function PUT(request: NextRequest, { params }: Params) {
  const access = await requireAccess(request, { pageKey: 'escalas', action: 'edit' })
  if (!access.ok) return access.response

  const body = await request.json().catch(() => ({}))
  const { person_id, ativo, vai_servir, funcoes } = body

  if (!person_id) return NextResponse.json({ error: 'person_id obrigatório.' }, { status: 400 })

  const supabase = createSupabaseAdminClient(request)

  // 1. Descobrir qual o ministério desta escala para atualizar persistência global
  const { data: link } = await supabase
    .from('escalas_links')
    .select('ministry')
    .eq('id', params.id)
    .single()

  const { data: ministryRecord } = link
    ? await supabase.from('ministries').select('id').eq('name', link.ministry).single()
    : { data: null }

  // 2. Transação / Gravação paralela (escala específica + global por ministério)
  const ops = [
    // Atualiza registro específico desta escala
    supabase
      .from('escalas_voluntarios')
      .upsert(
        {
          link_id: params.id,
          person_id,
          ativo: ativo ?? true,
          vai_servir: vai_servir ?? null,
          funcoes: Array.isArray(funcoes) ? funcoes : [],
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'link_id,person_id' }
      )
  ]

  // Se tivermos as funções e o ministério, atualizamos a "memória" desse voluntário
  if (Array.isArray(funcoes) && ministryRecord?.id) {
    ops.push(
      supabase
        .from('people_ministries')
        .update({ funcoes })
        .eq('person_id', person_id)
        .eq('ministry_id', ministryRecord.id)
    )
  }

  const results = await Promise.all(ops)
  const err = results.find(r => r.error)

  if (err) {
    console.error('Erro ao salvar voluntário e/ou funções globais:', err.error)
    return NextResponse.json({ error: 'Erro ao salvar.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
