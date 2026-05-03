import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

type Params = { params: { token: string } }

export const dynamic = 'force-dynamic'

/**
 * POST /api/public/escalas/[token]/disponibilidade
 * Body: { person_id: string, slots: { slot_id: string, disponivel: boolean, observacao?: string }[], funcoes?: string[] }
 *
 * Salva disponibilidade do voluntário.
 * Validação mínima: link ativo, pessoa existe, slots pertencem ao link.
 * A validação de ministério foi removida do caminho crítico para evitar
 * bloqueios por inconsistência de nome ou people_ministries desatualizado.
 */
export async function POST(request: NextRequest, { params }: Params) {
  const supabase = createSupabaseAdminClient(request)

  // 1. Verifica o link
  const { data: link, error: linkErr } = await supabase
    .from('escalas_links')
    .select('id, status, ministry, church:churches(name)')
    .eq('token', params.token)
    .single()

  if (linkErr || !link) {
    return NextResponse.json({ error: 'Link não encontrado.' }, { status: 404 })
  }
  if (link.status === 'closed') {
    return NextResponse.json(
      { error: 'Este link foi encerrado pelo administrador. Não é possível mais enviar respostas.' },
      { status: 410 }
    )
  }

  let body: { person_id?: string; slots?: unknown; funcoes?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corpo da requisição inválido.' }, { status: 400 })
  }

  const { person_id, slots, funcoes } = body as {
    person_id: string
    slots: { slot_id: string; disponivel?: boolean; observacao?: string }[]
    funcoes?: string[]
  }

  if (!person_id || typeof person_id !== 'string') {
    return NextResponse.json({ error: 'Pessoa não informada.' }, { status: 400 })
  }
  if (!Array.isArray(slots) || slots.length === 0) {
    return NextResponse.json({ error: 'Nenhum slot informado.' }, { status: 400 })
  }

  // 2. Valida que a pessoa existe (sem exigir vínculo com ministério via join)
  const { data: person, error: personErr } = await supabase
    .from('people')
    .select('id, full_name, church_name')
    .eq('id', person_id)
    .maybeSingle()

  if (personErr) {
    console.error('[escalas/disponibilidade] Erro ao buscar pessoa:', personErr)
    return NextResponse.json({ error: 'Erro ao verificar voluntário.' }, { status: 500 })
  }
  if (!person) {
    return NextResponse.json({ error: 'Voluntário não encontrado.' }, { status: 404 })
  }

  // Validação de igreja: aceita se o link não tem igreja, ou se a pessoa não tem igreja, ou se batem
  const churchName = (link.church as any)?.name || ''
  if (churchName && person.church_name && person.church_name !== churchName) {
    return NextResponse.json({ error: 'Voluntário não pertence a esta igreja.' }, { status: 403 })
  }

  // 3. Valida que os slot_ids pertencem a este link
  const submittedSlotIds = slots.map(s => s.slot_id).filter(Boolean)
  if (submittedSlotIds.length === 0) {
    return NextResponse.json({ error: 'Nenhum slot válido informado.' }, { status: 400 })
  }

  const { data: validSlotsData, error: slotsErr } = await supabase
    .from('escalas_slots')
    .select('id')
    .eq('link_id', link.id)
    .in('id', submittedSlotIds)

  if (slotsErr) {
    console.error('[escalas/disponibilidade] Erro ao validar slots:', slotsErr)
    return NextResponse.json({ error: 'Erro ao validar slots.' }, { status: 500 })
  }

  const validSlotIds = new Set((validSlotsData ?? []).map((s: any) => s.id))
  const validSlots = slots.filter(s => validSlotIds.has(s.slot_id))

  if (validSlots.length === 0) {
    return NextResponse.json({ error: 'Nenhum slot válido para esta escala.' }, { status: 400 })
  }

  // 4. Upsert das respostas
  const upsertPayload = validSlots.map((s) => ({
    link_id: link.id,
    person_id,
    slot_id: s.slot_id,
    disponivel: s.disponivel !== false,
    observacao: s.observacao ?? null,
    submitted_at: new Date().toISOString(),
  }))

  const { error: upsertErr } = await supabase
    .from('escalas_respostas')
    .upsert(upsertPayload, { onConflict: 'link_id,person_id,slot_id' })

  if (upsertErr) {
    console.error('[escalas/disponibilidade] Erro ao salvar disponibilidade:', upsertErr)
    return NextResponse.json({ error: 'Erro ao salvar disponibilidade.' }, { status: 500 })
  }

  // 5. Salva funções — falha aqui não bloqueia o resultado principal
  if (Array.isArray(funcoes)) {
    const { error: evErr } = await supabase
      .from('escalas_voluntarios')
      .upsert(
        { link_id: link.id, person_id, funcoes, updated_at: new Date().toISOString() },
        { onConflict: 'link_id,person_id' }
      )
    if (evErr) console.error('[escalas/disponibilidade] Erro ao salvar funções em escalas_voluntarios:', evErr)

    // Atualiza people_ministries apenas se encontrar o ministério — falha silenciosa aqui é aceitável
    const { data: ministryRecord } = await supabase
      .from('ministries')
      .select('id')
      .eq('name', link.ministry)
      .maybeSingle()

    if (ministryRecord) {
      const { error: pmErr } = await supabase
        .from('people_ministries')
        .update({ funcoes })
        .eq('person_id', person_id)
        .eq('ministry_id', ministryRecord.id)
      if (pmErr) console.error('[escalas/disponibilidade] Erro ao atualizar people_ministries:', pmErr)
    }
  }

  return NextResponse.json({ ok: true, saved: upsertPayload.length })
}
