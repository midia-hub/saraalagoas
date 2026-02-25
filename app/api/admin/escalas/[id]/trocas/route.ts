import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

type Params = { params: { id: string } }

/**
 * GET /api/admin/escalas/[id]/trocas
 * Lista todas as solicitações de troca desta escala.
 */
export async function GET(request: NextRequest, { params }: Params) {
  const access = await requireAccess(request, { pageKey: 'escalas', action: 'view' })
  if (!access.ok) return access.response

  const supabase = createSupabaseAdminClient(request)

  const { data, error } = await supabase
    .from('escalas_trocas')
    .select(`
      id, slot_id, funcao, status, mensagem, resposta, criada_em, respondida_em,
      solicitante:people!escalas_trocas_solicitante_id_fkey(id, full_name),
      substituto:people!escalas_trocas_substituto_id_fkey(id, full_name),
      slot:escalas_slots!escalas_trocas_slot_id_fkey(label, date, type)
    `)
    .eq('link_id', params.id)
    .order('criada_em', { ascending: false })

  if (error) return NextResponse.json({ error: 'Erro ao buscar.' }, { status: 500 })

  return NextResponse.json({ trocas: data ?? [] })
}

/**
 * PUT /api/admin/escalas/[id]/trocas
 * Aprova ou rejeita uma troca. Ao aprovar, atualiza o dados da escala publicada.
 * Body: { troca_id, status: 'aprovada' | 'rejeitada', resposta? }
 */
export async function PUT(request: NextRequest, { params }: Params) {
  const access = await requireAccess(request, { pageKey: 'escalas', action: 'edit' })
  if (!access.ok) return access.response

  const body = await request.json().catch(() => ({}))
  const { troca_id, status, resposta } = body

  if (!troca_id || !['aprovada', 'rejeitada'].includes(status)) {
    return NextResponse.json({ error: 'troca_id e status (aprovada|rejeitada) são obrigatórios.' }, { status: 400 })
  }

  const supabase = createSupabaseAdminClient(request)

  // Busca a troca
  const { data: troca, error: trocaErr } = await supabase
    .from('escalas_trocas')
    .select('id, slot_id, funcao, solicitante_id, substituto_id, status')
    .eq('id', troca_id)
    .eq('link_id', params.id)
    .single()

  if (trocaErr || !troca) {
    return NextResponse.json({ error: 'Troca não encontrada.' }, { status: 404 })
  }

  if (troca.status !== 'pendente') {
    return NextResponse.json({ error: 'Esta troca já foi respondida.' }, { status: 409 })
  }

  const now = new Date().toISOString()

  // Atualiza status da troca
  const { error: updateErr } = await supabase
    .from('escalas_trocas')
    .update({ status, resposta: resposta ?? null, respondida_em: now })
    .eq('id', troca_id)

  if (updateErr) return NextResponse.json({ error: 'Erro ao atualizar troca.' }, { status: 500 })

  // Se aprovada e tem substituto → atualiza dados da escala publicada
  if (status === 'aprovada' && troca.substituto_id) {
    // Busca nome do substituto
    const { data: subData } = await supabase
      .from('people')
      .select('full_name')
      .eq('id', troca.substituto_id)
      .single()

    const { data: pubData } = await supabase
      .from('escalas_publicadas')
      .select('dados')
      .eq('link_id', params.id)
      .single()

    if (pubData?.dados) {
      const dados = pubData.dados as any
      const slots: any[] = dados.slots ?? []

      const slotIdx = slots.findIndex((s: any) => s.slot_id === troca.slot_id)
      if (slotIdx >= 0) {
        const assignments: any[] = slots[slotIdx].assignments ?? []
        const assignIdx = assignments.findIndex(
          (a: any) => a.funcao === troca.funcao && a.person_id === troca.solicitante_id
        )
        if (assignIdx >= 0 && subData) {
          assignments[assignIdx] = {
            ...assignments[assignIdx],
            person_id: troca.substituto_id,
            person_name: subData.full_name,
            trocado: true,
          }
        }
        slots[slotIdx] = { ...slots[slotIdx], assignments }
        dados.slots = slots
      }

      await supabase
        .from('escalas_publicadas')
        .update({ dados })
        .eq('link_id', params.id)
    }
  }

  return NextResponse.json({ ok: true })
}
