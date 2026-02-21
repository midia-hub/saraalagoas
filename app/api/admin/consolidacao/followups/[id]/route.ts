import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { canAccessPerson } from '@/lib/people-access'

const FOLLOWUP_SELECT = 'id, person_id, conversion_id, consolidator_person_id, leader_person_id, contacted, contacted_at, contacted_channel, contacted_notes, fono_visit_done, fono_visit_date, visit_done, visit_date, status, next_review_event_id, next_review_date, notes, created_at, updated_at'

/**
 * GET /api/admin/consolidacao/followups/[id]
 * PATCH /api/admin/consolidacao/followups/[id]
 * DELETE /api/admin/consolidacao/followups/[id]
 */

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const access = await requireAccess(request, { pageKey: 'consolidacao', action: 'view' })
  if (!access.ok) return access.response

  try {
    const supabase = createSupabaseAdminClient(request)
    const { data, error } = await supabase
      .from('consolidation_followups')
      .select(FOLLOWUP_SELECT)
      .eq('id', params.id)
      .single()

    if (error || !data) return NextResponse.json({ error: 'Acompanhamento não encontrado' }, { status: 404 })
    return NextResponse.json({ item: data })
  } catch (err) {
    console.error('GET followup [id]:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const access = await requireAccess(request, { pageKey: 'consolidacao', action: 'edit' })
  if (!access.ok) return access.response

  try {
    const body = await request.json().catch(() => ({}))
    const supabase = createSupabaseAdminClient(request)

    // Apenas campos editáveis
    const allowed = [
      'contacted',
      'contacted_at',
      'contacted_channel',
      'contacted_notes',
      'fono_visit_done',
      'fono_visit_date',
      'visit_done',
      'visit_date',
      'status',
      'next_review_event_id',
      'next_review_date',
      'notes',
      'leader_person_id',
      'consolidator_person_id',
    ]
    const patch: Record<string, unknown> = {}
    for (const key of allowed) {
      if (key in body) patch[key] = body[key] === '' ? null : body[key]
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 })
    }

    const nextStatus = patch.status as string | undefined
    if (nextStatus === 'inscrito_revisao') {
      const leaderId = access.snapshot.personId
      if (!leaderId) {
        return NextResponse.json({ error: 'Líder responsável não identificado.' }, { status: 403 })
      }

      const { data: current, error: currentError } = await supabase
        .from('consolidation_followups')
        .select('status, leader_person_id, person_id')
        .eq('id', params.id)
        .single()

      if (currentError || !current) {
        return NextResponse.json({ error: 'Acompanhamento não encontrado' }, { status: 404 })
      }

      if (current.status !== 'direcionado_revisao') {
        return NextResponse.json({
          error: 'Pessoa precisa estar direcionada para o Revisão de Vidas antes da inscrição.'
        }, { status: 400 })
      }

      const hasLeadershipAccess = await canAccessPerson(access.snapshot, current.person_id)
      if (!hasLeadershipAccess) {
        return NextResponse.json({ error: 'Somente líderes na linha de discipulado podem inscrever.' }, { status: 403 })
      }
    }

    const { data, error } = await supabase
      .from('consolidation_followups')
      .update(patch)
      .eq('id', params.id)
      .select(FOLLOWUP_SELECT)
      .single()

    if (error) {
      console.error('PATCH followup:', error)
      return NextResponse.json({ error: 'Erro ao atualizar acompanhamento' }, { status: 500 })
    }

    return NextResponse.json({ item: data })
  } catch (err) {
    console.error('PATCH followup [id]:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const access = await requireAccess(request, { pageKey: 'consolidacao', action: 'delete' })
  if (!access.ok) return access.response

  try {
    const supabase = createSupabaseAdminClient(request)
    const { error } = await supabase
      .from('consolidation_followups')
      .delete()
      .eq('id', params.id)

    if (error) {
      console.error('DELETE followup:', error)
      return NextResponse.json({ error: 'Erro ao deletar acompanhamento' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('DELETE followup [id]:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
