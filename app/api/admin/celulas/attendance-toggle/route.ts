import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { getEditLockAt } from '@/lib/cells-schedule'
import { hasPermission } from '@/lib/rbac'
import { maybePromoteCellPeople } from '@/lib/cells-people'

/**
 * POST /api/admin/celulas/attendance-toggle
 * Endpoint leve para toggle de presença individual.
 * 
 * Body: {
 *   cell_id: string
 *   realization_date: string  // YYYY-MM-DD
 *   cell_person_id?: string | null
 *   person_id?: string | null
 *   status: 'V' | 'X' | null  // null = remover
 * }
 */
export async function POST(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'celulas', action: 'edit' })
  if (!access.ok) return access.response

  const body = await request.json()
  const { cell_id, realization_date, cell_person_id, person_id, status } = body

  if (!cell_id || !realization_date) {
    return NextResponse.json({ error: 'cell_id e realization_date são obrigatórios.' }, { status: 400 })
  }

  // Bloquear datas futuras
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const relDay = new Date(`${realization_date}T00:00:00`)
  if (relDay > today) {
    return NextResponse.json({ error: 'Não é permitido preencher antes da data de realização.' }, { status: 400 })
  }

  const supabase = createSupabaseAdminClient(request)

  // 1. Buscar célula e realization em paralelo
  const [cellRes, relRes] = await Promise.all([
    supabase
      .from('cells')
      .select('id, day_of_week, time_of_day, frequency')
      .eq('id', cell_id)
      .single(),
    supabase
      .from('cell_realizations')
      .select('id, edit_lock_at, pd_approval_status, attendance_edit_used')
      .eq('cell_id', cell_id)
      .eq('realization_date', realization_date)
      .maybeSingle()
  ])

  if (cellRes.error || !cellRes.data) {
    return NextResponse.json({ error: 'Célula não encontrada.' }, { status: 404 })
  }

  const cell = cellRes.data
  const editLockAt = getEditLockAt(cell, relDay).toISOString()
  const isLateEdit = new Date() > new Date(editLockAt)
  const isAdmin = hasPermission(access.snapshot, 'usuarios', 'manage')

  let realizationId: string

  if (relRes.data) {
    realizationId = relRes.data.id

    // Admin pode editar sem restrições
    if (!isAdmin && relDay < today && relRes.data.attendance_edit_used) {
      return NextResponse.json({ error: 'Essa data já foi alterada uma vez.' }, { status: 400 })
    }

    // Atualizar approval_status se necessário (sem tocar pd_value)
    if (isLateEdit) {
      await supabase
        .from('cell_realizations')
        .update({ requires_approval: true, approval_status: 'pending' })
        .eq('id', realizationId)
    }
  } else {
    // Criar realização
    const { data: newRel, error: insertErr } = await supabase
      .from('cell_realizations')
      .insert({
        cell_id,
        reference_month: `${realization_date.slice(0, 7)}-01`,
        realization_date,
        pd_value: 0,
        edit_lock_at: editLockAt,
        requires_approval: false,
        approval_status: 'approved',
        pd_approval_status: 'pending',
        created_by: access.snapshot.userId
      })
      .select('id')
      .single()

    if (insertErr || !newRel) {
      return NextResponse.json({ error: 'Erro ao criar realização.' }, { status: 500 })
    }

    realizationId = newRel.id
  }

  // 2. Upsert ou deletar a presença individual
  if (status === null) {
    // Remover presença
    let deleteQuery = supabase
      .from('cell_attendances')
      .delete()
      .eq('realization_id', realizationId)

    if (cell_person_id) {
      deleteQuery = deleteQuery.eq('cell_person_id', cell_person_id)
    } else if (person_id) {
      deleteQuery = deleteQuery.eq('person_id', person_id)
    } else {
      return NextResponse.json({ error: 'cell_person_id ou person_id é obrigatório.' }, { status: 400 })
    }

    await deleteQuery
  } else {
    // Upsert presença
    if (cell_person_id) {
      const { error } = await supabase
        .from('cell_attendances')
        .upsert(
          { realization_id: realizationId, cell_person_id, person_id: person_id || null, status },
          { onConflict: 'realization_id,cell_person_id', ignoreDuplicates: false }
        )
      if (error) {
        // Fallback: delete + insert
        await supabase.from('cell_attendances').delete()
          .eq('realization_id', realizationId).eq('cell_person_id', cell_person_id)
        await supabase.from('cell_attendances').insert(
          { realization_id: realizationId, cell_person_id, person_id: person_id || null, status }
        )
      }
    } else if (person_id) {
      const { error } = await supabase
        .from('cell_attendances')
        .upsert(
          { realization_id: realizationId, cell_person_id: null, person_id, status },
          { onConflict: 'realization_id,person_id', ignoreDuplicates: false }
        )
      if (error) {
        await supabase.from('cell_attendances').delete()
          .eq('realization_id', realizationId).eq('person_id', person_id)
        await supabase.from('cell_attendances').insert(
          { realization_id: realizationId, cell_person_id: null, person_id, status }
        )
      }
    } else {
      return NextResponse.json({ error: 'cell_person_id ou person_id é obrigatório.' }, { status: 400 })
    }
  }

  // 3. Verificar promoção automática se for um vínculo de célula
  if (cell_person_id) {
    await maybePromoteCellPeople({ supabase, cellId: cell_id, cellPersonIds: [cell_person_id] })
  }

  return NextResponse.json({ ok: true, realization_id: realizationId, status })
}
