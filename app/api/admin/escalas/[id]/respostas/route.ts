import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

type Params = { params: { id: string } }

export const dynamic = 'force-dynamic'

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
  'Pragma': 'no-cache',
  'Surrogate-Control': 'no-store',
}

/** GET /api/admin/escalas/[id]/respostas — resumo por voluntário */
export async function GET(request: NextRequest, { params }: Params) {
  const access = await requireAccess(request, { pageKey: 'escalas', action: 'view' })
  if (!access.ok) return access.response

  const supabase = createSupabaseAdminClient(request)

  // Busca link, slots e respostas em paralelo
  const [
    { data: link, error: linkErr },
    { data: slots, error: slotsErr },
    { data: respostas, error: respostasErr },
  ] = await Promise.all([
    supabase
      .from('escalas_links')
      .select('ministry, month, year, label, status, church:churches(name)')
      .eq('id', params.id)
      .single(),
    supabase
      .from('escalas_slots')
      .select('id, type, label, date, time_of_day, sort_order, funcoes')
      .eq('link_id', params.id)
      .order('date', { ascending: true })
      .order('time_of_day', { ascending: true }),
    supabase
      .from('escalas_respostas')
      .select('person_id, slot_id, disponivel, observacao, submitted_at')
      .eq('link_id', params.id)
      .order('submitted_at', { ascending: false })
      .range(0, 9999),
  ])

  if (linkErr || !link) {
    return NextResponse.json({ error: 'Escala não encontrada.' }, { status: 404 })
  }

  if (slotsErr) {
    console.error('[escalas/respostas] Erro ao buscar slots:', slotsErr)
    return NextResponse.json({ error: 'Erro ao buscar slots da escala.' }, { status: 500 })
  }

  // Erro em respostas é crítico — retorna erro explícito em vez de mostrar painel vazio
  if (respostasErr) {
    console.error('[escalas/respostas] Erro ao buscar respostas:', respostasErr)
    return NextResponse.json({ error: 'Erro ao carregar respostas. Tente novamente.' }, { status: 500 })
  }

  const churchName = (link.church as any)?.name || ''

  // Busca voluntários do ministério
  const { data: ministryRecord } = await supabase
    .from('ministries')
    .select('id')
    .eq('name', link.ministry)
    .maybeSingle()

  const { data: rawAllPeople } = ministryRecord
    ? await supabase
        .from('people')
        .select('id, full_name, church_name, people_ministries!inner(ministry_id)')
        .eq('people_ministries.ministry_id', ministryRecord.id)
        .order('full_name')
    : { data: [] }

  // Filtra por igreja — aceita pessoas sem igreja para não sumirem por erro de cadastro
  const allPeople = (rawAllPeople ?? []).filter((p: any) =>
    !churchName || !p.church_name || p.church_name === churchName
  )

  const volunteersMap: Record<string, string> = {}
  for (const p of allPeople) {
    volunteersMap[p.id] = p.full_name
  }

  // Inclui quem respondeu mas saiu do ministério (mudança de cadastro)
  const extraIds: string[] = []
  for (const r of respostas ?? []) {
    if (!volunteersMap[r.person_id] && !extraIds.includes(r.person_id)) {
      extraIds.push(r.person_id)
    }
  }

  if (extraIds.length > 0) {
    const { data: extraPeople } = await supabase
      .from('people')
      .select('id, full_name')
      .in('id', extraIds)
    for (const p of extraPeople ?? []) {
      volunteersMap[p.id] = p.full_name
    }
  }

  // Agrupa respostas por person_id
  const byPerson: Record<string, { person_id: string; slot_id: string; disponivel: boolean; observacao: string | null; submitted_at: string }[]> = {}
  for (const r of respostas ?? []) {
    if (!byPerson[r.person_id]) byPerson[r.person_id] = []
    byPerson[r.person_id].push({
      person_id: r.person_id,
      slot_id: r.slot_id,
      disponivel: r.disponivel,
      observacao: r.observacao ?? null,
      submitted_at: r.submitted_at,
    })
  }

  const volunteers = Object.entries(volunteersMap)
    .map(([id, full_name]) => ({ id, full_name }))
    .sort((a, b) => a.full_name.localeCompare(b.full_name))

  return NextResponse.json(
    { link, slots: slots ?? [], byPerson, volunteers },
    { headers: NO_CACHE_HEADERS }
  )
}
