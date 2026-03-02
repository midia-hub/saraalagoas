import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseServerClient } from '@/lib/supabase-server'

/**
 * GET /api/admin/publication-groups
 * Lista todos os grupos de publicação (instâncias) com suas contas vinculadas.
 */
export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'instagram', action: 'view' })
  if (!access.ok) return access.response

  const db = createSupabaseServerClient(request)

  const { data: groups, error: groupsError } = await db
    .from('publication_groups')
    .select('id, created_at, updated_at, name, description, color, is_active')
    .order('created_at', { ascending: true })

  if (groupsError) {
    return NextResponse.json({ error: groupsError.message }, { status: 500 })
  }

  const { data: accounts, error: accountsError } = await db
    .from('publication_group_accounts')
    .select('id, group_id, account_type, account_id')

  if (accountsError) {
    return NextResponse.json({ error: accountsError.message }, { status: 500 })
  }

  // Filtrar grupos se forPosting=1 (apenas os que o usuário tem acesso)
  const isForPosting = request.nextUrl.searchParams.get('forPosting') === '1'
  let filteredGroups = groups ?? []

  if (isForPosting) {
    const { data: userPermissions } = await db
      .from('publication_group_users')
      .select('group_id')
      .eq('user_id', access.snapshot.userId)

    const allowedGroupIds = new Set((userPermissions ?? []).map((p) => p.group_id))
    filteredGroups = filteredGroups.filter((g) => allowedGroupIds.has(g.id))
  }

  const groupsWithAccounts = filteredGroups.map((g) => {
    const groupAccounts = (accounts ?? []).filter((a) => a.group_id === g.id)
    return {
      ...g,
      accounts: groupAccounts,
      has_instagram: groupAccounts.some((a) => a.account_type === 'meta_ig' || a.account_type === 'meta'),
      has_facebook: groupAccounts.some((a) => a.account_type === 'meta_fb' || a.account_type === 'meta'),
      has_youtube: groupAccounts.some((a) => a.account_type === 'youtube'),
    }
  })

  // Se forPosting=1, retorna o array direto para o CustomSelect
  if (isForPosting) {
    return NextResponse.json(groupsWithAccounts)
  }

  return NextResponse.json({ groups: groupsWithAccounts })
}

/**
 * POST /api/admin/publication-groups
 * Cria um novo grupo de publicação.
 */
export async function POST(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'instagram', action: 'edit' })
  if (!access.ok) return access.response

  const body = await request.json() as { name?: string; description?: string; color?: string }

  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'Nome é obrigatório.' }, { status: 400 })
  }

  const db = createSupabaseServerClient(request)

  const { data, error } = await db
    .from('publication_groups')
    .insert({
      name: body.name.trim(),
      description: body.description?.trim() || null,
      color: body.color || '#c62737',
    })
    .select('id, created_at, updated_at, name, description, color, is_active')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ group: data }, { status: 201 })
}
