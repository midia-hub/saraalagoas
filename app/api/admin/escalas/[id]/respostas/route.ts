import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

type Params = { params: { id: string } }

/** GET /api/admin/escalas/[id]/respostas  – resumo por voluntário */
export async function GET(request: NextRequest, { params }: Params) {
  const supabase = createSupabaseAdminClient(request)

  const [{ data: slots }, { data: respostas }, { data: link }] = await Promise.all([
    supabase
      .from('escalas_slots')
      .select('id, type, label, date, time_of_day, sort_order, funcoes')
      .eq('link_id', params.id)
      .order('date', { ascending: true })
      .order('time_of_day', { ascending: true }),
    supabase
      .from('escalas_respostas')
      .select('person_id, slot_id, disponivel, observacao, person:people(full_name)')
      .eq('link_id', params.id),
    supabase
      .from('escalas_links')
      .select('ministry, month, year, status, church:churches(name)')
      .eq('id', params.id)
      .single(),
  ])

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

  for (const r of respostas ?? []) {
    const pid = r.person_id
    // Se por acaso alguém respondeu e não está na lista oficial (ex: mudou de ministério), adiciona
    if (!volunteersMap[pid]) {
      volunteersMap[pid] = (r.person as any)?.full_name || 'Desconhecido'
    }
    if (!byPerson[pid]) byPerson[pid] = []
    byPerson[pid].push({
      person_id: pid,
      slot_id: r.slot_id,
      disponivel: r.disponivel,
      observacao: r.observacao
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
