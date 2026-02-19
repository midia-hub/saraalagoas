import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { hasAppPermission } from '@/lib/rbac'
import { APP_PERMISSION_CODES } from '@/lib/rbac-types'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

/**
 * POST /api/admin/celulas/confirmar-pd
 */
export async function POST(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'celulas', action: 'edit' })
  if (!access.ok) return access.response

  try {
    const { realization_id } = await request.json()
    if (!realization_id) {
      return NextResponse.json({ error: 'realization_id é obrigatório.' }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient(request)

    // Buscar realização para validar criador
    const { data: realization, error: fetchError } = await supabase
      .from('cell_realizations')
      .select('created_by')
      .eq('id', realization_id)
      .single()

    if (fetchError || !realization) {
      return NextResponse.json({ error: 'Realização não encontrada.' }, { status: 404 })
    }

    if (!hasAppPermission(access.snapshot, APP_PERMISSION_CODES.CELLS_APPROVE_PD)) {
      return NextResponse.json({ error: 'Permissão insuficiente.' }, { status: 403 })
    }

    const { error: updateError } = await supabase
      .from('cell_realizations')
      .update({
        pd_approval_status: 'approved',
        pd_approved_by: access.snapshot.userId,
        pd_approved_at: new Date().toISOString(),
        pd_confirmed: true,
        pd_confirmed_by: access.snapshot.userId
      })
      .eq('id', realization_id)

    if (updateError) throw updateError

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Erro ao confirmar PD:', err)
    return NextResponse.json({ error: 'Erro ao confirmar PD.' }, { status: 500 })
  }
}
