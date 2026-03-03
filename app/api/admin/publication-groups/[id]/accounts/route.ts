import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseServerClient } from '@/lib/supabase-server'

/**
 * POST /api/admin/publication-groups/[id]/accounts
 * Vincula uma conta (meta, youtube ou tiktok) a um grupo.
 * Body: { account_type: 'meta' | 'youtube' | 'tiktok', account_id: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const access = await requireAccess(request, { pageKey: 'instagram', action: 'edit' })
  if (!access.ok) return access.response

  const body = await request.json() as { account_type?: string; account_id?: string }

  if (!body.account_type || !body.account_id) {
    return NextResponse.json({ error: 'account_type e account_id são obrigatórios.' }, { status: 400 })
  }
  if (!['meta', 'youtube', 'tiktok'].includes(body.account_type)) {
    return NextResponse.json({ error: 'account_type inválido.' }, { status: 400 })
  }

  const db = createSupabaseServerClient(request)

  // Verifica se o grupo existe
  const { data: group, error: groupError } = await db
    .from('publication_groups')
    .select('id')
    .eq('id', params.id)
    .single()

  if (groupError || !group) {
    return NextResponse.json({ error: 'Grupo não encontrado.' }, { status: 404 })
  }

  const { data, error } = await db
    .from('publication_group_accounts')
    .upsert({
      group_id:     params.id,
      account_type: body.account_type,
      account_id:   body.account_id,
    }, { onConflict: 'group_id,account_type,account_id' })
    .select('id, group_id, account_type, account_id')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ account: data }, { status: 201 })
}

/**
 * DELETE /api/admin/publication-groups/[id]/accounts
 * Remove uma vinculação de conta.
 * Body: { account_type: 'meta' | 'youtube', account_id: string }
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const access = await requireAccess(request, { pageKey: 'instagram', action: 'edit' })
  if (!access.ok) return access.response

  const body = await request.json() as { account_type?: string; account_id?: string }

  if (!body.account_type || !body.account_id) {
    return NextResponse.json({ error: 'account_type e account_id são obrigatórios.' }, { status: 400 })
  }

  const db = createSupabaseServerClient(request)

  const { error } = await db
    .from('publication_group_accounts')
    .delete()
    .eq('group_id', params.id)
    .eq('account_type', body.account_type)
    .eq('account_id', body.account_id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
