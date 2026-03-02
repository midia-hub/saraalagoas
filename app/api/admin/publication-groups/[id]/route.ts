import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseServerClient } from '@/lib/supabase-server'

/**
 * PATCH /api/admin/publication-groups/[id]
 * Atualiza nome, descrição, cor ou status de um grupo.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const access = await requireAccess(request, { pageKey: 'instagram', action: 'edit' })
  if (!access.ok) return access.response

  const body = await request.json() as {
    name?: string
    description?: string
    color?: string
    is_active?: boolean
  }

  const db = createSupabaseServerClient(request)

  const patch: Record<string, unknown> = {}
  if (body.name !== undefined)        patch.name        = body.name.trim()
  if (body.description !== undefined) patch.description = body.description?.trim() || null
  if (body.color !== undefined)       patch.color       = body.color
  if (body.is_active !== undefined)   patch.is_active   = body.is_active

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Nenhum campo enviado.' }, { status: 400 })
  }

  const { data, error } = await db
    .from('publication_groups')
    .update(patch)
    .eq('id', params.id)
    .select('id, created_at, updated_at, name, description, color, is_active')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ group: data })
}

/**
 * DELETE /api/admin/publication-groups/[id]
 * Remove um grupo (e todas suas vinculações de conta, via CASCADE).
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const access = await requireAccess(request, { pageKey: 'instagram', action: 'edit' })
  if (!access.ok) return access.response

  const db = createSupabaseServerClient(request)

  const { error } = await db
    .from('publication_groups')
    .delete()
    .eq('id', params.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
