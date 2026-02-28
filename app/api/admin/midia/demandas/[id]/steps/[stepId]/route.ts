import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

// PATCH – update step fields, assignees, tags
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> },
) {
  const access = await requireAccess(request, { pageKey: 'instagram', action: 'create' })
  if (!access.ok) return access.response

  const { id: demandId, stepId } = await params
  const body = await request.json().catch(() => ({}))
  const supabase = createSupabaseAdminClient(request)

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.title !== undefined) patch.title = String(body.title).trim()
  if (body.description !== undefined) patch.description = String(body.description).trim()
  if (body.status !== undefined) patch.status = String(body.status)
  if (body.stepType !== undefined) patch.step_type = String(body.stepType)
  if (body.metadata !== undefined && typeof body.metadata === 'object')
    patch.metadata = body.metadata
  if (body.dueDate !== undefined) {
    const dueDate = body.dueDate ? String(body.dueDate) : null

    // Validate against demand due_date
    if (dueDate) {
      const { data: demand } = await supabase
        .from('media_demands')
        .select('due_date')
        .eq('id', demandId)
        .single()
      if (demand?.due_date && dueDate > demand.due_date) {
        return NextResponse.json(
          { error: 'A data da etapa não pode ultrapassar a data limite da demanda.' },
          { status: 400 },
        )
      }
    }
    patch.due_date = dueDate
  }

  const { data: step, error } = await supabase
    .from('media_demand_steps')
    .update(patch)
    .eq('id', stepId)
    .eq('demand_id', demandId)
    .select('id, demand_id, parent_step_id, step_type, title, description, due_date, status, sort_order, metadata, created_at, updated_at')
    .single()

  if (error || !step) return NextResponse.json({ error: 'Erro ao atualizar etapa.' }, { status: 500 })

  // Replace assignees if provided
  if (Array.isArray(body.assigneeIds)) {
    await supabase.from('media_demand_step_assignees').delete().eq('step_id', stepId)
    if (body.assigneeIds.length > 0) {
      await supabase.from('media_demand_step_assignees').insert(
        body.assigneeIds.map((pid: string) => ({ step_id: stepId, person_id: pid })),
      )
    }
  }

  // Replace tags if provided
  if (Array.isArray(body.tags)) {
    await supabase.from('media_demand_step_tags').delete().eq('step_id', stepId)
    if (body.tags.length > 0) {
      await supabase.from('media_demand_step_tags').insert(
        body.tags.map((tag: string) => ({ step_id: stepId, tag })),
      )
    }
  }

  // Re-fetch assignees and tags
  const [assigneesRes, tagsRes] = await Promise.all([
    supabase
      .from('media_demand_step_assignees')
      .select('person_id, people:person_id(id, full_name)')
      .eq('step_id', stepId),
    supabase
      .from('media_demand_step_tags')
      .select('tag')
      .eq('step_id', stepId),
  ])

  return NextResponse.json({
    item: {
      id: step.id,
      demandId: step.demand_id,
      parentStepId: step.parent_step_id ?? null,
      stepType: step.step_type ?? 'geral',
      title: step.title,
      description: step.description ?? '',
      dueDate: step.due_date ?? null,
      status: step.status,
      sortOrder: step.sort_order,
      createdAt: step.created_at,
      updatedAt: step.updated_at,
      assignees: (assigneesRes.data ?? []).map((a: any) => ({
        personId: a.people?.id ?? a.person_id,
        name: a.people?.full_name ?? '',
      })),
      tags: (tagsRes.data ?? []).map((t: any) => t.tag),
      metadata: (step as any).metadata ?? {},
    },
  })
}

// DELETE step
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> },
) {
  const access = await requireAccess(request, { pageKey: 'instagram', action: 'delete' })
  if (!access.ok) return access.response

  const { id: demandId, stepId } = await params
  const supabase = createSupabaseAdminClient(request)

  const { error } = await supabase
    .from('media_demand_steps')
    .delete()
    .eq('id', stepId)
    .eq('demand_id', demandId)

  if (error) return NextResponse.json({ error: 'Erro ao excluir etapa.' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
