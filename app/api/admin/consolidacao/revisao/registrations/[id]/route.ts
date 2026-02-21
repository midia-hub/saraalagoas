import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

const REGISTRATION_SELECT = 'id, event_id, person_id, leader_person_id, status, notes, created_at, updated_at, anamnese_token, anamnese_completed, anamnese_completed_at, pre_revisao_aplicado, payment_status, payment_date, payment_method, amount, payment_notes, payment_validated_by, payment_validated_at'

/**
 * PATCH  /api/admin/consolidacao/revisao/registrations/[id]
 * DELETE /api/admin/consolidacao/revisao/registrations/[id]
 */

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const access = await requireAccess(request, { pageKey: 'consolidacao', action: 'edit' })
  if (!access.ok) return access.response

  try {
    const body = await request.json().catch(() => ({}))
    const supabase = createSupabaseAdminClient(request)

    const allowed = ['status', 'notes', 'leader_person_id', 'pre_revisao_aplicado', 'payment_status', 'payment_date', 'payment_method', 'amount', 'payment_notes', 'anamnese_completed', 'anamnese_completed_at']
    const patch: Record<string, unknown> = {}
    for (const key of allowed) {
      if (key in body) patch[key] = body[key] === '' ? null : body[key]
    }

    // Se validando pagamento, verificar permissão e adicionar dados de validação
    if (patch.payment_status === 'validated') {
      // Buscar o evento da inscrição para validar se o usuário é o secretário
      const { data: registration, error: regError } = await supabase
        .from('revisao_vidas_registrations')
        .select('event_id')
        .eq('id', params.id)
        .maybeSingle()

      if (regError) {
        console.error('PATCH revisao: erro ao buscar registration:', regError)
        return NextResponse.json({ error: 'Erro ao carregar inscrição' }, { status: 500 })
      }

      if (registration?.event_id) {
        const { data: event, error: eventError } = await supabase
          .from('revisao_vidas_events')
          .select('secretary_person_id')
          .eq('id', registration.event_id)
          .maybeSingle()

        if (eventError) {
          console.error('PATCH revisao: erro ao buscar evento:', eventError)
          return NextResponse.json({ error: 'Erro ao carregar evento' }, { status: 500 })
        }

        // Se houver secretário definido, verificar se é o usuário logado
        if (event?.secretary_person_id && event.secretary_person_id !== access.snapshot.personId) {
          return NextResponse.json(
            { error: 'Apenas o secretário responsável pode validar pagamentos deste evento' },
            { status: 403 }
          )
        }
      }

      patch.payment_validated_by = access.snapshot.personId
      patch.payment_validated_at = new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('revisao_vidas_registrations')
      .update(patch)
      .eq('id', params.id)
      .select(REGISTRATION_SELECT)
      .single()

    if (error) {
      console.error('PATCH revisao/registrations update error:', error)
      return NextResponse.json({ error: 'Erro ao atualizar inscrição' }, { status: 500 })
    }

    // Se concluiu, atualizar followup e registrar conclusão em people
    if (patch.status === 'concluiu' && data?.person_id) {
      // Registrar conclusão na tabela de people
      await supabase
        .from('people')
        .update({ completed_review_date: new Date().toISOString() })
        .eq('id', data.person_id)

      const { data: followup } = await supabase
        .from('consolidation_followups')
        .select('id')
        .eq('person_id', data.person_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (followup) {
        await supabase
          .from('consolidation_followups')
          .update({ status: 'concluiu_revisao' })
          .eq('id', followup.id)
      }
    }

    return NextResponse.json({ item: data })
  } catch (err) {
    console.error('PATCH revisao/registrations [id]:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const access = await requireAccess(request, { pageKey: 'consolidacao', action: 'delete' })
  if (!access.ok) return access.response

  try {
    const supabase = createSupabaseAdminClient(request)
    
    // Buscar person_id e status antes de deletar
    const { data: registration } = await supabase
      .from('revisao_vidas_registrations')
      .select('person_id, status')
      .eq('id', params.id)
      .single()

    if (!registration?.person_id) {
      return NextResponse.json({ error: 'Inscrição não encontrada' }, { status: 404 })
    }

    // Verificar se a pessoa já completou a revisão
    const { data: person } = await supabase
      .from('people')
      .select('completed_review_date')
      .eq('id', registration.person_id)
      .single()

    // Não permitir remover se pessoa já completou a revisão
    if (person?.completed_review_date) {
      return NextResponse.json(
        { error: 'Não é possível remover inscrição de pessoa que já completou a Revisão de Vidas' },
        { status: 403 }
      )
    }

    const { error } = await supabase.from('revisao_vidas_registrations').delete().eq('id', params.id)
    if (error) {
      console.error('DELETE revisao/registrations:', error)
      return NextResponse.json({ error: 'Erro ao remover inscrição' }, { status: 500 })
    }

    // Voltar o followup para direcionado_revisao se a inscrição foi removida
    if (registration?.person_id) {
      const { data: followup } = await supabase
        .from('consolidation_followups')
        .select('id')
        .eq('person_id', registration.person_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (followup) {
        await supabase
          .from('consolidation_followups')
          .update({ status: 'direcionado_revisao' })
          .eq('id', followup.id)
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('DELETE revisao/registrations [id]:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
