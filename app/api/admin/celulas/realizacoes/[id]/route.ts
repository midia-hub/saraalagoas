import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { getEditLockAt } from '@/lib/cells-schedule'
import { hasPermission } from '@/lib/rbac'

type RouteContext = { params: Promise<{ id: string }> }

/**
 * PATCH /api/admin/celulas/realizacoes/[id]
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const access = await requireAccess(request, { pageKey: 'celulas', action: 'edit' })
  if (!access.ok) return access.response

  const { id } = await context.params
  const supabase = createSupabaseAdminClient(request)

  try {
    const body = await request.json()
    const { pd_value, attendances, visitors, realization_date: newRealizationDate } = body

    const { data: realization, error: relError } = await supabase
      .from('cell_realizations')
      .select('id, cell_id, realization_date, edit_lock_at, pd_approval_status, pd_value, attendance_edit_used, pd_filled_at')
      .eq('id', id)
      .single()

    if (relError || !realization) {
      return NextResponse.json({ error: 'Realização não encontrada.' }, { status: 404 })
    }

    const { data: cell, error: cellError } = await supabase
      .from('cells')
      .select('id, day_of_week, time_of_day, frequency')
      .eq('id', realization.cell_id)
      .single()

    if (cellError || !cell) {
      return NextResponse.json({ error: 'Célula não encontrada.' }, { status: 404 })
    }

    const targetDate = newRealizationDate || realization.realization_date
    const realizationDateObj = new Date(`${targetDate}T00:00:00`)
    const editLockAt = realization.edit_lock_at || getEditLockAt(cell, realizationDateObj).toISOString()
    const isLateEdit = new Date() > new Date(editLockAt)
    const isAdmin = hasPermission(access.snapshot, 'usuarios', 'manage')

    if (newRealizationDate && newRealizationDate !== realization.realization_date) {
      // Administradores podem alterar data sem restrições
      if (!isAdmin && realization.attendance_edit_used) {
        return NextResponse.json({ error: 'Essa data ja foi alterada uma vez.' }, { status: 400 })
      }
      const { data: existingDate } = await supabase
        .from('cell_realizations')
        .select('id')
        .eq('cell_id', realization.cell_id)
        .eq('realization_date', newRealizationDate)
        .maybeSingle()
      if (existingDate && existingDate.id !== realization.id) {
        return NextResponse.json({ error: 'Ja existe realizacao para essa data.' }, { status: 400 })
      }
    }

    // Verificar se o PD mudou para registrar auditoria
    const pdChanged = (pd_value ?? realization.pd_value ?? 0) !== realization.pd_value
    const shouldRecordPDFill = pdChanged && (pd_value ?? 0) > 0 && !realization.pd_filled_at

    const updatePayload: Record<string, any> = {
      pd_value: pd_value ?? realization.pd_value ?? 0,
      edit_lock_at: editLockAt,
      requires_approval: isLateEdit,
      approval_status: isLateEdit ? 'pending' : 'approved'
    }

    // Registrar quem preencheu o PD pela primeira vez
    if (shouldRecordPDFill) {
      updatePayload.pd_filled_by = access.snapshot.userId
      updatePayload.pd_filled_at = new Date().toISOString()
    }

    // Não mudar pd_approval_status automaticamente - só Secretário PD pode aprovar

    if (newRealizationDate && newRealizationDate !== realization.realization_date) {
      updatePayload.realization_date = newRealizationDate
      updatePayload.reference_month = `${newRealizationDate.slice(0, 7)}-01`
      updatePayload.attendance_edit_used = true
    }

    const { data: updated, error: updateError } = await supabase
      .from('cell_realizations')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: 'Erro ao atualizar realização.' }, { status: 500 })
    }

    if (Array.isArray(attendances)) {
      await supabase.from('cell_attendances').delete().eq('realization_id', id)
      if (attendances.length) {
        const payload = attendances.map((a: any) => ({
          realization_id: id,
          cell_person_id: a.cell_person_id || null,
          person_id: a.person_id || null,
          status: a.status
        }))
        await supabase.from('cell_attendances').insert(payload)
      }
    }

    if (Array.isArray(visitors)) {
      await supabase.from('cell_visitors').delete().eq('realization_id', id)
      if (visitors.length) {
        const payload = visitors.map((v: any) => ({
          realization_id: id,
          full_name: v.full_name,
          phone: v.phone
        }))
        await supabase.from('cell_visitors').insert(payload)
      }
    }

    return NextResponse.json({ item: updated })
  } catch (err) {
    return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })
  }
}
