import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { APP_PERMISSION_CODES } from '@/lib/rbac-types'
import { hasAppPermission } from '@/lib/rbac'

/**
 * POST /api/admin/celulas/pd-management/[id]/approve
 * Aprova o PD de uma realização (com ou sem edição do valor)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const access = await requireAccess(request, { pageKey: 'celulas', action: 'edit' })
  if (!access.ok) return access.response

  if (!hasAppPermission(access.snapshot, APP_PERMISSION_CODES.CELLS_APPROVE_PD)) {
    return NextResponse.json({ error: 'Sem permissão para aprovar PD.' }, { status: 403 })
  }

  const { id } = params
  const body = await request.json()
  const { pd_value } = body

  const supabase = createSupabaseAdminClient(request)

  // 1. Buscar a realização com suas frequências
  const { data: realization, error: fetchError } = await supabase
    .from('cell_realizations')
    .select('attendance_edit_used, realization_date, attendances:cell_attendances(id)')
    .eq('id', id)
    .single()

  if (fetchError || !realization) {
    console.error('Erro ao buscar realização:', fetchError)
    return NextResponse.json({ error: 'Realização não encontrada.' }, { status: 404 })
  }

  // 2. Validar se há frequências registradas (célula foi realizada)
  const hasAttendances = (realization.attendances?.length ?? 0) > 0
  if (!hasAttendances) {
    return NextResponse.json({ 
      error: 'A célula não foi realizada. É necessário registrar pelo menos uma frequência antes de aprovar o PD.' 
    }, { status: 400 })
  }

  // 3. Validar se a realização foi editada
  if (!realization.attendance_edit_used) {
    return NextResponse.json({ 
      error: 'O PD só pode ser aprovado após a célula ter sido realizada e editada (frequências registradas).' 
    }, { status: 400 })
  }

  // 4. Buscar data de corte e validar prazo
  const { data: configData } = await supabase
    .from('cell_configs')
    .select('config_value')
    .eq('config_key', 'pd_deadline')
    .single()

  if (configData?.config_value?.deadline_date) {
    const deadlineDate = new Date(configData.config_value.deadline_date + 'T23:59:59')
    const now = new Date()
    
    if (now > deadlineDate) {
      return NextResponse.json({ 
        error: `Prazo para aprovação de PD expirado. Data limite: ${deadlineDate.toLocaleDateString('pt-BR')}` 
      }, { status: 400 })
    }
  }

  const updateData: any = {
    pd_approval_status: 'approved',
    pd_confirmed: true,
    pd_approved_by: access.snapshot.userId,
    pd_approved_at: new Date().toISOString()
  }

  // Se o valor do PD foi alterado, atualiza também
  if (pd_value !== undefined && pd_value !== null) {
    updateData.pd_value = Number(pd_value)
  }

  const { error } = await supabase
    .from('cell_realizations')
    .update(updateData)
    .eq('id', id)

  if (error) {
    console.error('Erro ao aprovar PD:', error)
    return NextResponse.json({ error: 'Erro ao aprovar PD.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
