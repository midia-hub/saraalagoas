import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

type Params = { params: { token: string } }

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

  const { data: person } = await supabase
    .from('people')
    .select(`
      id, 
      full_name,
      people_ministries!inner(ministry_id)
    `)
    .eq('id', person_id)
    .eq('people_ministries.ministry_id', ministryRecord.id)
    .eq('church_name', churchName) // Garante que a pessoa é da mesma igreja do link
    .maybeSingle()

  if (!person) {
    return NextResponse.json({ error: 'Voluntário não encontrado ou não pertence a esta igreja/ministério.' }, { status: 404 })
  }

  // 3. Upsert das respostas
  const upsertPayload = slots.map((s) => ({
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

  // 4. Se informou funções, atualiza metadados deste link e perfil global
  if (Array.isArray(funcoes)) {
    // Escala específica (usada na geração)
    await supabase
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

    // Perfil global (salva para futuras escalas)
    await supabase
      .from('people_ministries')
      .update({ funcoes })
      .eq('person_id', person_id)
      .eq('ministry_id', ministryRecord.id)
  }

  return NextResponse.json({ ok: true, saved: upsertPayload.length })
}
