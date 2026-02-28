import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

// GET /api/admin/midia/demandas/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await requireAccess(request, { pageKey: 'instagram', action: 'view' })
  if (!access.ok) return access.response

  const { id } = await params
  const supabase = createSupabaseAdminClient(request)

  const { data, error } = await supabase
    .from('media_demands')
    .select('id, source_type, title, description, status, due_date, church_id, created_at, churches(name)')
    .eq('id', id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Demanda não encontrada.' }, { status: 404 })

  return NextResponse.json({
    item: {
      id: data.id,
      sourceType: data.source_type,
      title: data.title,
      description: data.description ?? '',
      status: data.status,
      dueDate: data.due_date ?? null,
      churchId: data.church_id,
      churchName: (data as any).churches?.name ?? 'Sem igreja',
      createdAt: data.created_at,
    },
  })
}

// PATCH /api/admin/midia/demandas/[id] – update status and/or due_date
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await requireAccess(request, { pageKey: 'instagram', action: 'create' })
  if (!access.ok) return access.response

  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const supabase = createSupabaseAdminClient(request)

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.status !== undefined) patch.status = String(body.status)
  if (body.dueDate !== undefined) patch.due_date = body.dueDate ? String(body.dueDate) : null

  const { data, error } = await supabase
    .from('media_demands')
    .update(patch)
    .eq('id', id)
    .select('id, source_type, title, description, status, due_date, church_id, created_at, churches(name)')
    .single()

  if (error || !data) return NextResponse.json({ error: 'Erro ao atualizar demanda.' }, { status: 500 })

  return NextResponse.json({
    item: {
      id: data.id,
      sourceType: data.source_type,
      title: data.title,
      description: data.description ?? '',
      status: data.status,
      dueDate: data.due_date ?? null,
      churchId: data.church_id,
      churchName: (data as any).churches?.name ?? 'Sem igreja',
      createdAt: data.created_at,
    },
  })
}
