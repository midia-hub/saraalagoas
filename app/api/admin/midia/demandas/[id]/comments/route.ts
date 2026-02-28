import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

// GET /api/admin/midia/demandas/[id]/comments?step_id=...
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await requireAccess(request, { pageKey: 'instagram', action: 'view' })
  if (!access.ok) return access.response

  const { id: demandId } = await params
  const stepId = request.nextUrl.searchParams.get('step_id') ?? null
  const supabase = createSupabaseAdminClient(request)

  let query = supabase
    .from('media_demand_comments')
    .select('id, demand_id, step_id, content, author_name, created_by, created_at')
    .eq('demand_id', demandId)
    .order('created_at', { ascending: true })

  if (stepId) {
    query = query.eq('step_id', stepId)
  } else {
    query = query.is('step_id', null)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: 'Erro ao listar comentários.' }, { status: 500 })

  const items = (data ?? []).map((row: any) => ({
    id: row.id,
    demandId: row.demand_id,
    stepId: row.step_id ?? null,
    content: row.content,
    authorName: row.author_name,
    createdAt: row.created_at,
  }))

  return NextResponse.json({ items })
}

// POST /api/admin/midia/demandas/[id]/comments
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await requireAccess(request, { pageKey: 'instagram', action: 'create' })
  if (!access.ok) return access.response

  const { id: demandId } = await params
  const body = await request.json().catch(() => ({}))
  const content = String(body.content ?? '').trim()
  const stepId = body.stepId ?? null
  const authorName = String(body.authorName ?? access.snapshot.email ?? '').trim()

  if (!content) return NextResponse.json({ error: 'Comentário não pode ser vazio.' }, { status: 400 })

  const supabase = createSupabaseAdminClient(request)

  const { data, error } = await supabase
    .from('media_demand_comments')
    .insert({ demand_id: demandId, step_id: stepId, content, author_name: authorName, created_by: access.snapshot.userId })
    .select('id, demand_id, step_id, content, author_name, created_at')
    .single()

  if (error || !data) return NextResponse.json({ error: 'Erro ao salvar comentário.' }, { status: 500 })

  return NextResponse.json({
    item: {
      id: data.id,
      demandId: data.demand_id,
      stepId: data.step_id ?? null,
      content: data.content,
      authorName: data.author_name,
      createdAt: data.created_at,
    },
  })
}

// DELETE /api/admin/midia/demandas/[id]/comments?comment_id=...
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await requireAccess(request, { pageKey: 'instagram', action: 'delete' })
  if (!access.ok) return access.response

  const commentId = request.nextUrl.searchParams.get('comment_id') ?? ''
  if (!commentId) return NextResponse.json({ error: 'comment_id é obrigatório.' }, { status: 400 })

  const supabase = createSupabaseAdminClient(request)
  const { error } = await supabase
    .from('media_demand_comments')
    .delete()
    .eq('id', commentId)

  if (error) return NextResponse.json({ error: 'Erro ao excluir comentário.' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
