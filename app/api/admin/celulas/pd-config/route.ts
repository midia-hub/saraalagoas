import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { APP_PERMISSION_CODES } from '@/lib/rbac-types'
import { hasAppPermission } from '@/lib/rbac'

/**
 * GET /api/admin/celulas/pd-config
 * Retorna a configuração da data de corte do PD
 */
export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'celulas', action: 'view' })
  if (!access.ok) return access.response

  if (!hasAppPermission(access.snapshot, APP_PERMISSION_CODES.CELLS_APPROVE_PD)) {
    return NextResponse.json({ error: 'Sem permissão para acessar configurações de PD.' }, { status: 403 })
  }

  const supabase = createSupabaseAdminClient(request)

  const { data, error } = await supabase
    .from('cell_configs')
    .select('config_value')
    .eq('config_key', 'pd_deadline')
    .single()

  if (error) {
    console.error('Erro ao buscar configuração de PD:', error)
    return NextResponse.json({ deadline_date: null }, { status: 200 })
  }

  return NextResponse.json({
    deadline_date: data?.config_value?.deadline_date || null
  })
}

/**
 * PATCH /api/admin/celulas/pd-config
 * Atualiza a data de corte do PD
 */
export async function PATCH(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'celulas', action: 'edit' })
  if (!access.ok) return access.response

  if (!hasAppPermission(access.snapshot, APP_PERMISSION_CODES.CELLS_APPROVE_PD)) {
    return NextResponse.json({ error: 'Sem permissão para editar configurações de PD.' }, { status: 403 })
  }

  const body = await request.json()
  const { deadline_date } = body

  if (!deadline_date) {
    return NextResponse.json({ error: 'Data de corte é obrigatória.' }, { status: 400 })
  }

  // Valida formato da data
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(deadline_date)) {
    return NextResponse.json({ error: 'Formato de data inválido. Use YYYY-MM-DD.' }, { status: 400 })
  }

  const supabase = createSupabaseAdminClient(request)

  const { error } = await supabase
    .from('cell_configs')
    .update({
      config_value: {
        deadline_date,
        description: 'Data limite para preenchimento do Parceiro de Deus'
      },
      updated_by: access.snapshot.userId,
      updated_at: new Date().toISOString()
    })
    .eq('config_key', 'pd_deadline')

  if (error) {
    console.error('Erro ao atualizar configuração de PD:', error)
    return NextResponse.json({ error: 'Erro ao atualizar configuração.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, deadline_date })
}
