import { NextRequest, NextResponse } from 'next/server'
import { getAccessSnapshotFromRequest, hasPermission } from '@/lib/rbac'
import { supabaseServer } from '@/lib/supabase-server'
import type { RoleFormData } from '@/lib/rbac-types'

type RouteContext = {
  params: {
    id: string
  }
}

/**
 * GET /api/admin/roles/[id]
 * Busca uma role específica com suas permissões
 */
export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const snapshot = await getAccessSnapshotFromRequest(request)

    if (!hasPermission(snapshot, 'roles', 'view')) {
      return NextResponse.json(
        { error: 'Sem permissão para visualizar roles' },
        { status: 403 }
      )
    }

    const { id } = params

    if (id === 'new' || !id) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 404 })
    }

    // Buscar role com suas permissões
    const { data: role, error } = await supabaseServer
      .from('roles')
      .select(
        `
        *,
        role_permissions (
          id,
          resource_id,
          permission_id,
          resources (
            id,
            key,
            name,
            description,
            category
          ),
          permissions (
            id,
            action,
            name,
            description
          )
        )
      `
      )
      .eq('id', id)
      .maybeSingle()

    if (error) {
      console.error('Erro ao buscar role:', error)
      return NextResponse.json({ error: 'Erro ao buscar role' }, { status: 500 })
    }

    if (!role) {
      return NextResponse.json({ error: 'Role não encontrada' }, { status: 404 })
    }

    return NextResponse.json({ role })
  } catch (error) {
    console.error('Erro ao processar requisição:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

/**
 * PATCH /api/admin/roles/[id]
 * Atualiza uma role
 */
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const snapshot = await getAccessSnapshotFromRequest(request)

    if (!hasPermission(snapshot, 'roles', 'edit')) {
      return NextResponse.json(
        { error: 'Sem permissão para editar roles' },
        { status: 403 }
      )
    }

    const { id } = params
    if (id === 'new' || !id) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 404 })
    }
    const body = (await request.json()) as Partial<RoleFormData>

    // Buscar role atual
    const { data: currentRole, error: fetchError } = await supabaseServer
      .from('roles')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (fetchError || !currentRole) {
      return NextResponse.json({ error: 'Role não encontrada' }, { status: 404 })
    }

    // Não permitir editar roles do sistema (exceto ordem e ativo/inativo)
    if (currentRole.is_system) {
      const allowedFields = ['sort_order', 'is_active']
      const hasDisallowedChanges = Object.keys(body).some(
        (key) => !allowedFields.includes(key)
      )

      if (hasDisallowedChanges) {
        return NextResponse.json(
          { error: 'Roles do sistema só podem ter ordem e status alterados' },
          { status: 403 }
        )
      }
    }

    // Atualizar role
    const updateData: any = {}
    if (body.name !== undefined) updateData.name = body.name
    if (body.description !== undefined) updateData.description = body.description
    if (body.is_admin !== undefined) updateData.is_admin = body.is_admin
    if (body.sort_order !== undefined) updateData.sort_order = body.sort_order
    if (body.is_active !== undefined) updateData.is_active = body.is_active

    const { data: updatedRole, error: updateError } = await supabaseServer
      .from('roles')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Erro ao atualizar role:', updateError)
      return NextResponse.json({ error: 'Erro ao atualizar role' }, { status: 500 })
    }

    // Atualizar permissões se fornecidas
    if (body.permissions !== undefined) {
      // Deletar permissões existentes
      await supabaseServer.from('role_permissions').delete().eq('role_id', id)

      // Inserir novas permissões
      if (body.permissions.length > 0) {
        const rolePermissions = body.permissions.map((perm) => ({
          role_id: id,
          resource_id: perm.resource_id,
          permission_id: perm.permission_id,
        }))

        const { error: permError } = await supabaseServer
          .from('role_permissions')
          .insert(rolePermissions)

        if (permError) {
          console.error('Erro ao atualizar permissões:', permError)
        }
      }
    }

    return NextResponse.json({ role: updatedRole })
  } catch (error) {
    console.error('Erro ao processar requisição:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/roles/[id]
 * Deleta uma role
 */
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const snapshot = await getAccessSnapshotFromRequest(request)

    if (!hasPermission(snapshot, 'roles', 'delete')) {
      return NextResponse.json(
        { error: 'Sem permissão para deletar roles' },
        { status: 403 }
      )
    }

    const { id } = params
    if (id === 'new' || !id) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 404 })
    }

    // Buscar role
    const { data: role, error: fetchError } = await supabaseServer
      .from('roles')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (fetchError || !role) {
      return NextResponse.json({ error: 'Role não encontrada' }, { status: 404 })
    }

    // Não permitir deletar roles do sistema
    if (role.is_system) {
      return NextResponse.json(
        { error: 'Não é possível deletar roles do sistema' },
        { status: 403 }
      )
    }

    // Verificar se há usuários com esta role
    const { count } = await supabaseServer
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role_id', id)

    if (count && count > 0) {
      return NextResponse.json(
        { error: `Não é possível deletar. ${count} usuário(s) ainda possui(em) esta role.` },
        { status: 409 }
      )
    }

    // Deletar role (cascade vai deletar role_permissions automaticamente)
    const { error: deleteError } = await supabaseServer.from('roles').delete().eq('id', id)

    if (deleteError) {
      console.error('Erro ao deletar role:', deleteError)
      return NextResponse.json({ error: 'Erro ao deletar role' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao processar requisição:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
