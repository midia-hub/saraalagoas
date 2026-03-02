import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { supabaseServer } from '@/lib/supabase-server'

/**
 * GET /api/admin/publication-groups/[id]/users
 * Retorna os usuários vinculados ao grupo + todos os usuários disponíveis.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const access = await requireAccess(request, { pageKey: 'instagram', action: 'view' })
  if (!access.ok) return access.response

  // Usuários já vinculados ao grupo
  const { data: linked, error: linkedError } = await supabaseServer
    .from('publication_group_users')
    .select('id, user_id, created_at, profiles:user_id(id, email, full_name)')
    .eq('group_id', params.id)

  if (linkedError) {
    return NextResponse.json({ error: linkedError.message }, { status: 500 })
  }

  // Todos os usuários com acesso ao sistema
  const { data: allUsersData, error: allError } = await supabaseServer
    .from('profiles')
    .select('id, email, full_name, people:person_id(id, full_name)')

  if (allError) {
    return NextResponse.json({ error: allError.message }, { status: 500 })
  }

  const allUsers = (allUsersData || []).map(u => {
    const person = u.people as any
    return {
      id: u.id,
      email: u.email || '',
      full_name: u.full_name || person?.full_name || u.email?.split('@')[0] || 'Usuário sem nome'
    }
  }).sort((a, b) => a.full_name.localeCompare(b.full_name))

  const linkedUserIds = (linked ?? []).map((l) => l.user_id)

  return NextResponse.json({
    linkedUserIds,
    users: allUsers,
  })
}

/**
 * POST /api/admin/publication-groups/[id]/users
 * Vincula um usuário ao grupo.
 * Body: { user_id: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const access = await requireAccess(request, { pageKey: 'instagram', action: 'edit' })
  if (!access.ok) return access.response

  const body = await request.json() as { user_id?: string }

  if (!body.user_id) {
    return NextResponse.json({ error: 'user_id é obrigatório.' }, { status: 400 })
  }

  const db = createSupabaseServerClient(request)

  const { data: group } = await db
    .from('publication_groups')
    .select('id')
    .eq('id', params.id)
    .single()

  if (!group) {
    return NextResponse.json({ error: 'Grupo não encontrado.' }, { status: 404 })
  }

  const { error } = await supabaseServer
    .from('publication_group_users')
    .upsert(
      { group_id: params.id, user_id: body.user_id },
      { onConflict: 'group_id,user_id' }
    )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true }, { status: 201 })
}

/**
 * DELETE /api/admin/publication-groups/[id]/users
 * Remove a vinculação de um usuário ao grupo.
 * Body: { user_id: string }
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const access = await requireAccess(request, { pageKey: 'instagram', action: 'edit' })
  if (!access.ok) return access.response

  const body = await request.json() as { user_id?: string }

  if (!body.user_id) {
    return NextResponse.json({ error: 'user_id é obrigatório.' }, { status: 400 })
  }

  const { error } = await supabaseServer
    .from('publication_group_users')
    .delete()
    .eq('group_id', params.id)
    .eq('user_id', body.user_id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
