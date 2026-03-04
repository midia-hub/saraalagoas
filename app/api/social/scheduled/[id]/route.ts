import { NextRequest, NextResponse } from 'next/server'
import { requireAccess, requireAccessAny } from '@/lib/admin-api'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireAccessAny(request, [
    { pageKey: 'instagram', action: 'view' },
    { pageKey: 'galeria', action: 'view' },
  ])
  if (!access.ok) return access.response

  const { id } = await params
  if (!id) {
    return NextResponse.json({ error: 'ID da postagem Ã© obrigatÃ³rio.' }, { status: 400 })
  }

  const db = createSupabaseServerClient(request)
  const { data, error } = await db
    .from('scheduled_social_posts')
    .select('id, album_id, created_by, scheduled_at, instance_ids, destinations, caption, media_specs, status, published_at, error_message, created_at, updated_at, publication_group_id')
    .eq('id', id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Postagem nÃ£o encontrada.' }, { status: 404 })
  }

  return NextResponse.json(data)
}

/**
 * PATCH: Atualiza campos de uma postagem.
 * - scheduled_at: reprograma (apenas status 'pending')
 * - post_type: corrige tipo (feed/reel/story) em qualquer status
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireAccess(request, { pageKey: 'instagram', action: 'edit' })
  if (!access.ok) return access.response

  const { id } = await params
  if (!id) {
    return NextResponse.json({ error: 'ID da postagem é obrigatório.' }, { status: 400 })
  }

  let body: { scheduled_at?: string; post_type?: string; caption?: string; publish_now?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corpo da requisição inválido.' }, { status: 400 })
  }

  const db = createSupabaseServerClient(request)

  const { data: existing, error: fetchError } = await db
    .from('scheduled_social_posts')
    .select('id, status')
    .eq('id', id)
    .single()

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Postagem programada não encontrada.' }, { status: 404 })
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

  // Atualizar post_type (qualquer status)
  if (body?.post_type !== undefined) {
    const allowed = ['feed', 'reel', 'story']
    if (!allowed.includes(body.post_type)) {
      return NextResponse.json({ error: 'post_type inválido. Use: feed, reel ou story.' }, { status: 400 })
    }
    updates.post_type = body.post_type
  }

  // Atualizar legenda (apenas pending)
  if (body?.caption !== undefined) {
    if ((existing as { status: string }).status !== 'pending') {
      return NextResponse.json(
        { error: 'Apenas postagens com status "Programada" podem ter a legenda alterada.' },
        { status: 400 }
      )
    }
    updates.caption = typeof body.caption === 'string' ? body.caption : ''
  }

  // Postar agora: agenda para agora (run-scheduled processará em seguida)
  if (body?.publish_now === true) {
    if ((existing as { status: string }).status !== 'pending') {
      return NextResponse.json(
        { error: 'Apenas postagens com status "Programada" podem ser publicadas agora.' },
        { status: 400 }
      )
    }
    updates.scheduled_at = new Date(Date.now() - 5000).toISOString()
  }

  // Reprogramar data/hora (apenas pending)
  if (body?.scheduled_at !== undefined && body?.publish_now !== true) {
    const scheduledAtRaw = body.scheduled_at
    if (typeof scheduledAtRaw !== 'string' || !scheduledAtRaw.trim()) {
      return NextResponse.json({ error: 'scheduled_at inválido.' }, { status: 400 })
    }
    const scheduledAt = new Date(scheduledAtRaw.trim())
    if (Number.isNaN(scheduledAt.getTime())) {
      return NextResponse.json({ error: 'Data/hora inválida.' }, { status: 400 })
    }
    if (scheduledAt.getTime() <= Date.now()) {
      return NextResponse.json({ error: 'A nova data/hora deve ser no futuro.' }, { status: 400 })
    }
    if ((existing as { status: string }).status !== 'pending') {
      return NextResponse.json(
        { error: 'Apenas postagens com status "Programada" podem ser reprogramadas.' },
        { status: 400 }
      )
    }
    updates.scheduled_at = scheduledAt.toISOString()
  }

  if (Object.keys(updates).length === 1) {
    return NextResponse.json({ error: 'Nenhum campo válido para atualizar.' }, { status: 400 })
  }

  const { error: updateError } = await db
    .from('scheduled_social_posts')
    .update(updates)
    .eq('id', id)

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message ?? 'Erro ao atualizar postagem.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true, message: 'Postagem atualizada com sucesso.' })
}

/**
 * DELETE: Exclusão lógica (soft delete) — marca a postagem como "cancelled".
 * O registro permanece no banco para manutenção do histórico.
 * Apenas postagens com status "pending" ou "failed" podem ser canceladas.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireAccess(request, { pageKey: 'instagram', action: 'edit' })
  if (!access.ok) return access.response

  const { id } = await params
  if (!id) {
    return NextResponse.json({ error: 'ID da postagem é obrigatório.' }, { status: 400 })
  }

  const db = createSupabaseServerClient(request)

  const { data: existing, error: fetchError } = await db
    .from('scheduled_social_posts')
    .select('id, status')
    .eq('id', id)
    .single()

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Postagem programada não encontrada.' }, { status: 404 })
  }

  const allowedStatuses = ['pending', 'failed']
  if (!allowedStatuses.includes((existing as { status: string }).status)) {
    return NextResponse.json(
      { error: 'Apenas postagens com status "Programada" ou "Falha" podem ser excluídas.' },
      { status: 400 }
    )
  }

  const { error: updateError } = await db
    .from('scheduled_social_posts')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', id)

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message ?? 'Erro ao excluir postagem.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true, message: 'Postagem excluída com sucesso.' })
}
