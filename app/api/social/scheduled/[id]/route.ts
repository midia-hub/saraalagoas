import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseServerClient } from '@/lib/supabase-server'

/**
 * PATCH: Reprogramar data/hora de uma postagem programada.
 * Apenas postagens com status 'pending' podem ser reprogramadas.
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

  let body: { scheduled_at?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corpo da requisição inválido.' }, { status: 400 })
  }

  const scheduledAtRaw = body?.scheduled_at
  if (typeof scheduledAtRaw !== 'string' || !scheduledAtRaw.trim()) {
    return NextResponse.json(
      { error: 'scheduled_at (data/hora em ISO) é obrigatório.' },
      { status: 400 }
    )
  }

  const scheduledAt = new Date(scheduledAtRaw.trim())
  if (Number.isNaN(scheduledAt.getTime())) {
    return NextResponse.json({ error: 'Data/hora inválida.' }, { status: 400 })
  }
  if (scheduledAt.getTime() <= Date.now()) {
    return NextResponse.json(
      { error: 'A nova data/hora deve ser no futuro.' },
      { status: 400 }
    )
  }

  const db = createSupabaseServerClient(request)

  const { data: existing, error: fetchError } = await db
    .from('scheduled_social_posts')
    .select('id, status')
    .eq('id', id)
    .single()

  if (fetchError || !existing) {
    return NextResponse.json(
      { error: 'Postagem programada não encontrada.' },
      { status: 404 }
    )
  }

  if ((existing as { status: string }).status !== 'pending') {
    return NextResponse.json(
      { error: 'Apenas postagens com status "Programada" podem ser reprogramadas.' },
      { status: 400 }
    )
  }

  const { error: updateError } = await db
    .from('scheduled_social_posts')
    .update({
      scheduled_at: scheduledAt.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message ?? 'Erro ao reprogramar postagem.' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    ok: true,
    message: 'Postagem reprogramada com sucesso.',
    scheduled_at: scheduledAt.toISOString(),
  })
}
