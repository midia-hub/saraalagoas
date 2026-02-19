import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { APP_PERMISSION_CODES } from '@/lib/rbac-types'
import { hasAppPermission } from '@/lib/rbac'

/**
 * GET /api/admin/celulas/pd-management
 * Lista todas as realizações com seus status de PD
 */
export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'celulas', action: 'view' })
  if (!access.ok) return access.response

  // Apenas secretário PD ou admin pode acessar
  if (!hasAppPermission(access.snapshot, APP_PERMISSION_CODES.CELLS_APPROVE_PD)) {
    return NextResponse.json({ error: 'Sem permissão para gerenciar PD.' }, { status: 403 })
  }

  const supabase = createSupabaseAdminClient(request)

  const { data, error } = await supabase
    .from('cell_realizations')
    .select(`
      id,
      realization_date,
      pd_value,
      pd_approval_status,
      created_at,
      attendance_edit_used,
      attendances:cell_attendances(id, status),
      cell:cells(
        id,
        name,
        leader:people!cells_leader_person_id_fkey(full_name)
      )
    `)
    .order('realization_date', { ascending: false })
    .limit(500)

  if (error) {
    console.error('Erro ao buscar realizações:', error)
    return NextResponse.json({ error: 'Erro ao buscar realizações.' }, { status: 500 })
  }

  return NextResponse.json({ items: data || [] })
}
