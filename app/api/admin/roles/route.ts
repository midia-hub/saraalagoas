import { NextRequest, NextResponse } from 'next/server'
import { getAccessSnapshotFromRequest, hasPermission } from '@/lib/rbac'
import { supabaseServer } from '@/lib/supabase-server'
import type { Role, RoleFormData } from '@/lib/rbac-types'

/**
 * GET /api/admin/roles
 * Lista todas as roles do sistema
 */
export async function GET(request: NextRequest) {
  try {
    const snapshot = await getAccessSnapshotFromRequest(request)

    if (!hasPermission(snapshot, 'roles', 'view')) {
      return NextResponse.json(
        { error: 'Sem permissão para visualizar roles' },
        { status: 403 }
      )
    }

    // Buscar roles (tabela pode não existir se a migration RBAC não foi aplicada)
    const { data: roles, error } = await supabaseServer
      .from('roles')
      .select('*')
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Erro ao buscar roles:', error)
      const isMissingTable = error.code === '42P01' || error.message?.includes('does not exist')
      return NextResponse.json(
        {
          error: isMissingTable
            ? 'Tabela de roles não encontrada. Aplique a migration do RBAC no Supabase.'
            : 'Erro ao buscar roles',
        },
        { status: 500 }
      )
    }

    // Contagem de usuários por role (se a tabela profiles tiver role_id)
    let countByRole: Record<string, number> = {}
    try {
      const { data: profiles } = await supabaseServer
        .from('profiles')
        .select('role_id')
        .not('role_id', 'is', null)
      if (Array.isArray(profiles)) {
        for (const p of profiles) {
          if (p?.role_id) {
            countByRole[p.role_id] = (countByRole[p.role_id] ?? 0) + 1
          }
        }
      }
    } catch {
      // Ignora se profiles não tiver role_id ainda
    }

    const rolesWithCount = (roles || []).map((role: any) => ({
      ...role,
      users_count: countByRole[role.id] ?? 0,
    }))

    return NextResponse.json({ roles: rolesWithCount })
  } catch (error) {
    console.error('Erro ao processar requisição:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

/**
 * POST /api/admin/roles
 * Cria uma nova role
 */
export async function POST(request: NextRequest) {
  try {
    const snapshot = await getAccessSnapshotFromRequest(request)

    if (!hasPermission(snapshot, 'roles', 'create')) {
      return NextResponse.json(
        { error: 'Sem permissão para criar roles' },
        { status: 403 }
      )
    }

    const body = (await request.json()) as RoleFormData

    // Validações
    if (!body.key || !body.name) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: key, name' },
        { status: 400 }
      )
    }

    // Verificar se a key já existe
    const { data: existing } = await supabaseServer
      .from('roles')
      .select('id')
      .eq('key', body.key)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'Já existe uma role com esta chave' }, { status: 409 })
    }

    // Criar role
    const { data: newRole, error: roleError } = await supabaseServer
      .from('roles')
      .insert({
        key: body.key,
        name: body.name,
        description: body.description || null,
        is_admin: body.is_admin || false,
        is_system: false, // Roles criadas via API não são do sistema
        sort_order: body.sort_order || 999,
        is_active: body.is_active !== false,
      })
      .select()
      .single()

    if (roleError) {
      console.error('Erro ao criar role:', roleError)
      return NextResponse.json({ error: 'Erro ao criar role' }, { status: 500 })
    }

    // Se foram fornecidas permissões, criar os relacionamentos
    if (body.permissions && body.permissions.length > 0) {
      const rolePermissions = body.permissions.map((perm) => ({
        role_id: newRole.id,
        resource_id: perm.resource_id,
        permission_id: perm.permission_id,
      }))

      const { error: permError } = await supabaseServer
        .from('role_permissions')
        .insert(rolePermissions)

      if (permError) {
        console.error('Erro ao criar permissões:', permError)
        // Não falha a criação da role, mas loga o erro
      }
    }

    return NextResponse.json({ role: newRole }, { status: 201 })
  } catch (error) {
    console.error('Erro ao processar requisição:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
