import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

type Params = { params: { token: string } }

export const dynamic = 'force-dynamic'

/**
 * POST /api/public/escalas/[token]/disponibilidade
 * Body: { person_id: string, slots: { slot_id: string, disponivel: boolean, observacao?: string }[] }
 *
 * Voluntário envia sua disponibilidade.
 * Usa UPSERT para permitir renvio.
 */
export async function POST(request: NextRequest, { params }: Params) {
  const supabase = createSupabaseAdminClient(request)

  // 1. Verifica o link
  const { data: link } = await supabase
    .from('escalas_links')
    .select('id, status, ministry, church:churches(name)')
    .eq('token', params.token)
    .single()

  if (!link) {
    return NextResponse.json({ error: 'Link não encontrado.' }, { status: 404 })
  }
  if (link.status === 'closed') {
    return NextResponse.json({ error: 'Este link foi encerrado pelo administrador. Não é possível mais enviar respostas.' }, { status: 410 })
  }

  const body = await request.json().catch(() => ({}))
  const { person_id, slots, funcoes } = body as {
    person_id: string
    slots: { slot_id: string; disponivel?: boolean; observacao?: string }[]
    funcoes?: string[]
  }

  if (!person_id) return NextResponse.json({ error: 'Pessoa não informada.' }, { status: 400 })
  if (!Array.isArray(slots) || slots.length === 0) {
    return NextResponse.json({ error: 'Nenhum slot informado.' }, { status: 400 })
  }

  // 2. Valida que a pessoa existe e pertence ao ministério
  // Primeiro buscamos o ID do ministério pelo nome (pois o link guarda o nome)
  const { data: ministryRecord } = await supabase
    .from('ministries')
    .select('id')
    .eq('name', link.ministry)
    .single()

  if (!ministryRecord) {
    return NextResponse.json({ error: 'Ministério do link não encontrado.' }, { status: 404 })
  }

  const churchName = (link.church as any)?.name || ''

  // Busca pessoa apenas pelo ministério (sem filtro rígido de church_name no SQL)
  const { data: person } = await supabase
    .from('people')
    .select(`
      id,
      full_name,
      church_name,
      people_ministries!inner(ministry_id)
    `)
    .eq('id', person_id)
    .eq('people_ministries.ministry_id', ministryRecord.id)
    .maybeSingle()

  if (!person) {
    return NextResponse.json({ error: 'Voluntário não encontrado ou não pertence a este ministério.' }, { status: 404 })
  }

  // Valida a igreja com a mesma lógica permissiva do GET:
  // aceita se o link não tem igreja, ou se a pessoa não tem igreja cadastrada, ou se a igreja bate
  if (churchName && person.church_name && person.church_name !== churchName) {
    return NextResponse.json({ error: 'Voluntário não pertence a esta igreja.' }, { status: 403 })
  }

  // 3. Valida que os slot_ids pertencem a este link (segurança)
  const submittedSlotIds = slots.map(s => s.slot_id).filter(Boolean)
  if (submittedSlotIds.length === 0) {
    return NextResponse.json({ error: 'Nenhum slot válido informado.' }, { status: 400 })
  }

  const { data: validSlotsData } = await supabase
    .from('escalas_slots')
    .select('id')
    .eq('link_id', link.id)
    .in('id', submittedSlotIds)

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

  const { error } = await supabase
    .from('escalas_respostas')
    .upsert(upsertPayload, { onConflict: 'link_id,person_id,slot_id' })

  if (error) {
    console.error('Erro ao salvar disponibilidade:', error)
    return NextResponse.json({ error: 'Erro ao salvar disponibilidade.' }, { status: 500 })
  }

  // 5. Se informou funções, atualiza metadados deste link e perfil global
  if (Array.isArray(funcoes)) {
    const { error: evErr } = await supabase
      .from('escalas_voluntarios')
      .upsert(
        {
          link_id: link.id,
          person_id,
          funcoes,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'link_id,person_id' }
      )
    if (evErr) console.error('Erro ao salvar funcoes no escalas_voluntarios:', evErr)

    const { error: pmErr } = await supabase
      .from('people_ministries')
      .update({ funcoes })
      .eq('person_id', person_id)
      .eq('ministry_id', ministryRecord.id)
    if (pmErr) console.error('Erro ao salvar funcoes no people_ministries:', pmErr)
  }

  return NextResponse.json({ ok: true, saved: upsertPayload.length })
}
