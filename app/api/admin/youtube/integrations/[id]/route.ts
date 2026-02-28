import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseServerClient } from '@/lib/supabase-server'

type Params = { params: Promise<{ id: string }> }

/**
 * PATCH /api/admin/youtube/integrations/[id]
 * Atualiza is_active ou metadata da integração.
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  const access = await requireAccess(request, { pageKey: 'instagram', action: 'edit' })
  if (!access.ok) return access.response

  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const update: Record<string, unknown> = {}
  if (typeof body.is_active === 'boolean') update.is_active = body.is_active

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nenhum campo válido para atualizar.' }, { status: 400 })
  }

  const db = createSupabaseServerClient(request)
  const { error } = await db
    .from('youtube_integrations')
    .update(update)
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

/**
 * DELETE /api/admin/youtube/integrations/[id]
 * Remove a integração do banco.
 */
export async function DELETE(request: NextRequest, { params }: Params) {
  const access = await requireAccess(request, { pageKey: 'instagram', action: 'delete' })
  if (!access.ok) return access.response

  const { id } = await params
  const db = createSupabaseServerClient(request)
  const { error } = await db
    .from('youtube_integrations')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
