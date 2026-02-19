import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { APP_PERMISSION_CODES } from '@/lib/rbac-types'
import { hasAppPermission } from '@/lib/rbac'

/**
 * POST /api/admin/celulas/pd-management/[id]/reject
 * Rejeita o PD de uma realização
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const access = await requireAccess(request, { pageKey: 'celulas', action: 'edit' })
  if (!access.ok) return access.response

  if (!hasAppPermission(access.snapshot, APP_PERMISSION_CODES.CELLS_APPROVE_PD)) {
    return NextResponse.json({ error: 'Sem permissão para rejeitar PD.' }, { status: 403 })
  }

  const { id } = params
  const supabase = createSupabaseAdminClient(request)

  const { error } = await supabase
    .from('cell_realizations')
    .update({
      pd_approval_status: 'rejected',
      pd_confirmed: false,
      pd_approved_by: access.snapshot.userId,
      pd_approved_at: new Date().toISOString()
    })
    .eq('id', id)

  if (error) {
    console.error('Erro ao rejeitar PD:', error)
    return NextResponse.json({ error: 'Erro ao rejeitar PD.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
