import { NextRequest, NextResponse } from 'next/server'
import { getAccessSnapshotFromRequest, hasPermission } from '@/lib/rbac'
import { supabaseServer } from '@/lib/supabase-server'

type RouteContext = { params: Promise<{ id: string }> }

async function resolveAccessProfileIdByRoleId(roleId: string | null): Promise<string | null> {
  if (!roleId) return null

  const { data: role, error: roleError } = await supabaseServer
    .from('roles')
    .select('id, name')
    .eq('id', roleId)
    .maybeSingle()

  if (roleError) {
    console.error('Erro ao buscar role:', roleError)
    return null
  }

  if (!role?.name) {
    console.warn('Role não encontrada ou sem nome:', roleId)
    return null
  }

  const { data: accessProfiles, error: profileError } = await supabaseServer
    .from('access_profiles')
    .select('id, name')
    .ilike('name', role.name)
    .limit(1)

  if (profileError) {
    console.error('Erro ao buscar access_profiles:', profileError)
    return null
  }

  return accessProfiles?.[0]?.id ?? null
}

async function buildLegacyRoleByRoleId(roleId: string | null): Promise<string | null> {
  if (!roleId) return null
  
  const { data: role, error } = await supabaseServer
    .from('roles')
    .select('key, name')
    .eq('id', roleId)
    .maybeSingle()

  if (error) {
    console.error('Erro ao buscar role:', error)
    return null
  }

  if (!role) {
    console.warn('Role não encontrada:', roleId)
    return null
  }

  const keyOrName = `${role.key ?? ''} ${role.name ?? ''}`.toLowerCase()
  return keyOrName.includes('padrao') || keyOrName.includes('padrão') || keyOrName.includes('viewer')
    ? 'viewer'
    : 'editor'
}

/**
 * GET /api/admin/roles/[id]/users
 * Lista todos os usuários que têm uma role específica
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const snapshot = await getAccessSnapshotFromRequest(request)

    if (!hasPermission(snapshot, 'roles', 'view')) {
      return NextResponse.json(
        { error: 'Sem permissão para visualizar usuários de roles' },
        { status: 403 }
      )
    }

    const { id: roleId } = await context.params
    if (!roleId) {
      return NextResponse.json({ error: 'ID da role é obrigatório' }, { status: 400 })
    }

    const scope = request.nextUrl.searchParams.get('scope')

    if (scope === 'available') {
      const { data: availableUsers, error: availableError } = await supabaseServer
        .from('profiles')
        .select('id, email, full_name, person_id, created_at, people:person_id(id, full_name, email)')
        .not('person_id', 'is', null)
        .or(`role_id.is.null,role_id.neq.${roleId}`)
        .order('full_name', { ascending: true })

      if (availableError) {
        console.error('Erro ao buscar usuários disponíveis da role:', availableError)
        return NextResponse.json({ error: availableError.message || 'Erro ao buscar usuários disponíveis' }, { status: 500 })
      }

      return NextResponse.json({ users: availableUsers || [] })
    }

    const { data: users, error } = await supabaseServer
      .from('profiles')
      .select('id, email, full_name, person_id, created_at, people:person_id(id, full_name, email)')
      .eq('role_id', roleId)
      .order('full_name', { ascending: true })

    if (error) {
      console.error('Erro ao buscar usuários da role:', error)
      return NextResponse.json({ error: error.message || 'Erro ao buscar usuários' }, { status: 500 })
    }

    return NextResponse.json({ users: users || [] })
  } catch (err) {
    console.error('GET /api/admin/roles/[id]/users error:', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

/**
 * POST /api/admin/roles/[id]/users
 * Adiciona um usuário (profile) à role
 * Body: { user_id: string }
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const snapshot = await getAccessSnapshotFromRequest(request)

    if (!hasPermission(snapshot, 'roles', 'edit') || !hasPermission(snapshot, 'usuarios', 'edit')) {
      return NextResponse.json(
        { error: 'Sem permissão para gerenciar usuários da role' },
        { status: 403 }
      )
    }

    const { id: roleId } = await context.params
    if (!roleId) {
      return NextResponse.json({ error: 'ID da role é obrigatório' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const userId = typeof body?.user_id === 'string' ? body.user_id : ''
    if (!userId) {
      return NextResponse.json({ error: 'user_id é obrigatório' }, { status: 400 })
    }

    const { data: profile, error: profileError } = await supabaseServer
      .from('profiles')
      .select('id, person_id')
      .eq('id', userId)
      .maybeSingle()

    if (profileError) {
      console.error('Erro ao buscar profile:', profileError)
      return NextResponse.json({ error: 'Erro ao buscar usuário' }, { status: 500 })
    }

    if (!profile) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    if (!profile.person_id) {
      return NextResponse.json(
        { error: 'Este usuário precisa estar vinculado a uma Pessoa antes de receber função.' },
        { status: 400 }
      )
    }

    const accessProfileId = await resolveAccessProfileIdByRoleId(roleId)
    const legacyRole = await buildLegacyRoleByRoleId(roleId)

    // Construir objeto de update sem access_profile_id (é um campo legado)
    const updateData: any = {
      role_id: roleId,
      role: legacyRole || 'editor', // Garantir que role nunca é null
      updated_at: new Date().toISOString(),
    }

    const { error: updateError } = await supabaseServer
      .from('profiles')
      .update(updateData)
      .eq('id', userId)

    if (updateError) {
      console.error('Erro ao adicionar usuário à role:', updateError)
      return NextResponse.json({ error: updateError.message || 'Erro ao adicionar usuário à função' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('POST /api/admin/roles/[id]/users error:', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/roles/[id]/users
 * Remove um usuário (profile) da role
 * Body: { user_id: string }
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const snapshot = await getAccessSnapshotFromRequest(request)

    if (!hasPermission(snapshot, 'roles', 'edit') || !hasPermission(snapshot, 'usuarios', 'edit')) {
      return NextResponse.json(
        { error: 'Sem permissão para gerenciar usuários da role' },
        { status: 403 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const userId = typeof body?.user_id === 'string' ? body.user_id : ''
    if (!userId) {
      return NextResponse.json({ error: 'user_id é obrigatório' }, { status: 400 })
    }

    const { error: updateError } = await supabaseServer
      .from('profiles')
      .update({
        role_id: null,
        role: 'viewer',
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    if (updateError) {
      console.error('Erro ao remover usuário da role:', updateError)
      return NextResponse.json({ error: updateError.message || 'Erro ao remover usuário da função' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('DELETE /api/admin/roles/[id]/users error:', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
