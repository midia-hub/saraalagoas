import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

function mapStep(step: any, assignees: any[], tags: any[], children?: any[]) {
  return {
    id: step.id,
    demandId: step.demand_id,
    parentStepId: step.parent_step_id ?? null,
    stepType: step.step_type ?? 'geral',
    title: step.title,
    description: step.description ?? '',
    dueDate: step.due_date ?? null,
    status: step.status,
    sortOrder: step.sort_order,
    metadata: step.metadata ?? {},
    createdAt: step.created_at,
    updatedAt: step.updated_at,
    assignees: assignees
      .filter((a: any) => a.step_id === step.id)
      .map((a: any) => ({ personId: a.people?.id ?? a.person_id, name: a.people?.full_name ?? '' })),
    tags: tags.filter((t: any) => t.step_id === step.id).map((t: any) => t.tag),
    ...(children !== undefined ? { children } : {}),
  }
}

// GET all stages+items of a demand, returned as stages[] with nested items
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await requireAccess(request, { pageKey: 'instagram', action: 'view' })
  if (!access.ok) return access.response

  const { id: demandId } = await params
  const supabase = createSupabaseAdminClient(request)

  const { data: allSteps, error } = await supabase
    .from('media_demand_steps')
    .select('id, demand_id, parent_step_id, step_type, title, description, due_date, status, sort_order, metadata, created_at, updated_at')
    .eq('demand_id', demandId)
    .order('sort_order', { ascending: true })

  if (error) return NextResponse.json({ error: 'Erro ao listar etapas.' }, { status: 500 })

  const stepIds = (allSteps ?? []).map((s: any) => s.id)
  let assignees: any[] = []
  let tags: any[] = []

  if (stepIds.length > 0) {
    const [assigneesRes, tagsRes] = await Promise.all([
      supabase
        .from('media_demand_step_assignees')
        .select('step_id, person_id, people:person_id(id, full_name)')
        .in('step_id', stepIds),
      supabase
        .from('media_demand_step_tags')
        .select('step_id, tag')
        .in('step_id', stepIds),
    ])
    assignees = assigneesRes.data ?? []
    tags = tagsRes.data ?? []
  }

  // Build hierarchy: stages first, children nested
  const stages = (allSteps ?? []).filter((s: any) => !s.parent_step_id)
  const stageItems = (allSteps ?? []).filter((s: any) => !!s.parent_step_id)

  const stagesWithChildren = stages.map((stage: any) => {
    const children = stageItems
      .filter((item: any) => item.parent_step_id === stage.id)
      .map((item: any) => mapStep(item, assignees, tags))
    return mapStep(stage, assignees, tags, children)
  })

  return NextResponse.json({ stages: stagesWithChildren })
}

// POST create a new stage OR item
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await requireAccess(request, { pageKey: 'instagram', action: 'create' })
  if (!access.ok) return access.response

  const { id: demandId } = await params
  const body = await request.json().catch(() => ({}))
  const title = String(body.title ?? '').trim()
  const description = String(body.description ?? '').trim()
  const dueDate = body.dueDate ? String(body.dueDate) : null
  const assigneeIds: string[] = Array.isArray(body.assigneeIds) ? body.assigneeIds : []
  const tags: string[] = Array.isArray(body.tags) ? body.tags : []
  const stepType: string = String(body.stepType ?? 'geral').trim()
  const parentStepId: string | null = body.parentStepId ? String(body.parentStepId) : null

  if (!title) return NextResponse.json({ error: 'Título é obrigatório.' }, { status: 400 })

  const supabase = createSupabaseAdminClient(request)

  // Validate due_date
  if (dueDate) {
    const { data: demand } = await supabase
      .from('media_demands')
      .select('due_date')
      .eq('id', demandId)
      .single()
    if (demand?.due_date && dueDate > demand.due_date) {
      return NextResponse.json(
        { error: 'A data não pode ultrapassar a data limite da demanda.' },
        { status: 400 },
      )
    }
  }

  // Determine sort_order scoped to same parent
  const sortQuery = supabase
    .from('media_demand_steps')
    .select('sort_order')
    .eq('demand_id', demandId)
    .order('sort_order', { ascending: false })
    .limit(1)
  if (parentStepId) sortQuery.eq('parent_step_id', parentStepId)
  else sortQuery.is('parent_step_id', null)
  const { data: maxRow } = await sortQuery.maybeSingle()
  const sortOrder = (maxRow?.sort_order ?? -1) + 1

  const { data: step, error } = await supabase
    .from('media_demand_steps')
    .insert({
      demand_id: demandId,
      parent_step_id: parentStepId,
      step_type: stepType,
      title,
      description,
      due_date: dueDate,
      sort_order: sortOrder,
      created_by: access.snapshot.userId,
    })
    .select('id, demand_id, parent_step_id, step_type, title, description, due_date, status, sort_order, metadata, created_at, updated_at')
    .single()

  if (error || !step) return NextResponse.json({ error: 'Erro ao criar.' }, { status: 500 })

  // Insert assignees
  if (assigneeIds.length > 0) {
    await supabase.from('media_demand_step_assignees').insert(
      assigneeIds.map((pid) => ({ step_id: step.id, person_id: pid })),
    )
  }

  // Insert tags
  if (tags.length > 0) {
    await supabase.from('media_demand_step_tags').insert(
      tags.map((tag) => ({ step_id: step.id, tag })),
    )
  }

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
      metadata: (step as any).metadata ?? {},
      createdAt: step.created_at,
      updatedAt: step.updated_at,
      assignees: [],
      tags: [],
      children: [],
    },
  })
}
