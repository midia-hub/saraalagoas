import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

type Params = { params: { id: string } }

// Garante que a rota nunca seja cacheada — dados mudam em tempo real
export const dynamic = 'force-dynamic'

/** GET /api/admin/escalas/[id]/respostas  – resumo por voluntário */
export async function GET(request: NextRequest, { params }: Params) {
  const supabase = createSupabaseAdminClient(request)

  const [
    { data: slots },
    { data: respostas, error: respostasErr },
    { data: link },
  ] = await Promise.all([
    supabase
      .from('escalas_slots')
      .select('id, type, label, date, time_of_day, sort_order, funcoes')
      .eq('link_id', params.id)
      .order('date', { ascending: true })
      .order('time_of_day', { ascending: true }),
    // Sem join — full_name vem do allPeople abaixo (evita erro silencioso de PostgREST)
    supabase
      .from('escalas_respostas')
      .select('person_id, slot_id, disponivel, observacao')
      .eq('link_id', params.id),
    supabase
      .from('escalas_links')
      .select('ministry, month, year, status, church:churches(name)')
      .eq('id', params.id)
      .single(),
  ])

  if (respostasErr) {
    console.error('[escalas/respostas] Erro ao buscar respostas:', respostasErr)
  }

  if (!link) return NextResponse.json({ error: 'Escala não encontrada' }, { status: 404 })

  // 1. Busca todos os voluntários registrados neste ministério e igreja
  const { data: ministryRecord } = await supabase
    .from('ministries')
    .select('id')
    .eq('name', link.ministry)
    .single()

  const churchName = (link.church as any)?.name || ''
  
  const { data: allPeople } = ministryRecord
    ? await supabase
        .from('people')
        .select('id, full_name, people_ministries!inner(ministry_id)')
        .eq('people_ministries.ministry_id', ministryRecord.id)
        .eq('church_name', churchName)
        .order('full_name')
    : { data: [] }

  // Prepara dados para o frontend
  const volunteersMap: Record<string, string> = {}
  
  // Primeiro, popula com TODOS os voluntários do ministério
  for (const p of allPeople ?? []) {
    volunteersMap[p.id] = p.full_name
  }

  const byPerson: Record<string, any[]> = {}

  // Coleta IDs de quem respondeu mas não está na lista oficial (ex: mudou de ministério)
  const extraIds: string[] = []
  for (const r of respostas ?? []) {
    if (!volunteersMap[r.person_id] && !extraIds.includes(r.person_id)) {
      extraIds.push(r.person_id)
    }
  }

  // Busca os nomes dos extra em lote (se houver)
  if (extraIds.length > 0) {
    const { data: extraPeople } = await supabase
      .from('people')
      .select('id, full_name')
      .in('id', extraIds)
    for (const p of extraPeople ?? []) {
      volunteersMap[p.id] = p.full_name
    }
  }

  for (const r of respostas ?? []) {
    const pid = r.person_id
    if (!byPerson[pid]) byPerson[pid] = []
    byPerson[pid].push({
      person_id: pid,
      slot_id: r.slot_id,
      disponivel: r.disponivel,
      observacao: r.observacao ?? null,
    })
  }

  const volunteersList = Object.entries(volunteersMap)
    .map(([id, full_name]) => ({ id, full_name }))
    .sort((a, b) => a.full_name.localeCompare(b.full_name))

  return NextResponse.json({ 
    link, 
    slots: slots ?? [], 
    byPerson,
    volunteers: volunteersList 
  })
}
