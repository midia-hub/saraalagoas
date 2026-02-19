import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { getEditLockAt } from '@/lib/cells-schedule'
import { hasPermission } from '@/lib/rbac'
import { maybePromoteCellPeople } from '@/lib/cells-people'

/**
 * GET /api/admin/celulas/realizacoes
 */
export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'celulas', action: 'view' })
  if (!access.ok) return access.response

  const { searchParams } = new URL(request.url)
  const cellId = searchParams.get('cell_id')

  const supabase = createSupabaseAdminClient(request)
  let query = supabase
    .from('cell_realizations')
    .select(`
      *,
      confirmed_by:profiles!pd_approved_by(id, person:people(full_name)),
      filled_by:profiles!pd_filled_by(id, person:people(full_name)),
      attendances:cell_attendances(
        id,
        person_id,
        cell_person_id,
        status,
        person:people(id, full_name),
        cell_person:cell_people(
          id,
          type,
          full_name,
          person_id,
          phone,
          person:people(id, full_name)
        )
      ),
      visitors:cell_visitors(*)
    `)
    .order('realization_date', { ascending: false })

  if (cellId) {
    query = query.eq('cell_id', cellId)
  }

  const { data, error } = await query
  if (error) {
    console.error('Erro ao buscar realizações:', error)
    return NextResponse.json({ error: 'Erro ao buscar realizações.' }, { status: 500 })
  }

  return NextResponse.json({ items: data || [] })
}

/**
 * POST /api/admin/celulas/realizacoes
 */
export async function POST(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'celulas', action: 'edit' })
  if (!access.ok) return access.response

  try {
    let body: any
    try {
      body = await request.json()
    } catch (parseError: any) {
      throw new Error(`Erro ao fazer parse do JSON: ${parseError?.message || String(parseError)}`)
    }
    
    const { cell_id, reference_month, realization_date, pd_value, attendances, visitors } = body

    if (!cell_id || !reference_month || !realization_date) {
      throw new Error('Parâmetros obrigatórios faltando.')
    }

    if (pd_value === undefined || pd_value === null) {
      throw new Error('pd_value é obrigatório.')
    }

    const supabase = createSupabaseAdminClient(request)

    // 1. Buscar dados da célula para calcular janela de edição
    const { data: cell, error: cellError } = await supabase
      .from('cells')
      .select('id, day_of_week, time_of_day, frequency')
      .eq('id', cell_id)
      .single()

    if (cellError || !cell) {
      throw new Error('Não foi possível carregar a célula para calcular a janela de edição')
    }

    const realizationDateObj = new Date(`${realization_date}T00:00:00`)
    const editLockAt = getEditLockAt(cell, realizationDateObj).toISOString()

    // 2. Verificar se realização já existe para essa data específica
    const { data: existing, error: checkError } = await supabase
      .from('cell_realizations')
      .select('id, pd_value, edit_lock_at, approval_status, pd_approval_status, attendance_edit_used')
      .eq('cell_id', cell_id)
      .eq('realization_date', realization_date)
      .maybeSingle()

    if (checkError) {
      console.error('Erro ao verificar realização:', checkError)
      throw new Error(`Erro ao verificar realização: ${checkError?.message}`)
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const realizationDay = new Date(`${realization_date}T00:00:00`)
    const isAdmin = hasPermission(access.snapshot, 'usuarios', 'manage')

    if (realizationDay > today) {
      return NextResponse.json({ error: 'Nao e permitido preencher antes da data de realizacao.' }, { status: 400 })
    }

    // Validar data de corte do PD (apenas para não-admin)
    if (!isAdmin) {
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
            error: `Prazo para preenchimento do PD expirado. Data limite: ${deadlineDate.toLocaleDateString('pt-BR')}` 
          }, { status: 400 })
        }
      }
    }

    let realization: any

    if (existing) {
      const editLock = existing.edit_lock_at ? new Date(existing.edit_lock_at) : null
      const isLateEdit = editLock ? new Date() > editLock : new Date() > new Date(editLockAt)

      // Admin pode editar sem restrições
      if (!isAdmin && realizationDay < today && existing.attendance_edit_used) {
        return NextResponse.json({ error: 'Essa data ja foi alterada uma vez.' }, { status: 400 })
      }

      // Verificar se o PD mudou para registrar auditoria
      const pdChanged = Number(pd_value || 0) !== existing.pd_value
      const shouldRecordPDFill = pdChanged && Number(pd_value || 0) > 0 && !existing.pd_filled_at

      const updateData: any = {
        pd_value: Number(pd_value || 0),
        reference_month,
        edit_lock_at: existing.edit_lock_at || editLockAt,
        requires_approval: isLateEdit,
        approval_status: isLateEdit ? 'pending' : 'approved',
        attendance_edit_used: realizationDay < today ? true : existing.attendance_edit_used
      }

      // Registrar quem preencheu o PD pela primeira vez
      if (shouldRecordPDFill) {
        updateData.pd_filled_by = access.snapshot.userId
        updateData.pd_filled_at = new Date().toISOString()
      }

      // Se o PD ainda está pendente e foi alterado, continua pendente
      // Se já foi aprovado/rejeitado, mantém o status (só Secretário PD pode mudar)
      if (existing.pd_approval_status === 'pending' && pdChanged) {
        updateData.pd_approval_status = 'pending'
      }

      const { data: updatedRel, error: updateError } = await supabase
        .from('cell_realizations')
        .update(updateData)
        .eq('id', existing.id)
        .select()
        .single()

      if (updateError) {
        throw new Error(`Erro ao atualizar realização: ${updateError?.message}`)
      }

      realization = updatedRel
    } else {
      const insertData: any = {
        cell_id,
        reference_month,
        realization_date,
        pd_value: Number(pd_value || 0),
        edit_lock_at: editLockAt,
        requires_approval: false,
        approval_status: 'approved',
        pd_approval_status: 'pending',
        created_by: access.snapshot.userId
      }

      // Registrar quem preencheu se já vem com valor
      if (Number(pd_value || 0) > 0) {
        insertData.pd_filled_by = access.snapshot.userId
        insertData.pd_filled_at = new Date().toISOString()
      }

      const { data: newRel, error: insertError } = await supabase
        .from('cell_realizations')
        .insert(insertData)
        .select()
        .single()

      if (insertError) {
        throw new Error(`Erro ao criar realização: ${insertError?.message}`)
      }

      realization = newRel
    }

    if (!realization?.id) {
      throw new Error('Realização não foi criada/atualizada corretamente')
    }

    // 3. Limpar e salvar presenças
    await supabase.from('cell_attendances').delete().eq('realization_id', realization.id)
    
    if (attendances && attendances.length > 0) {
      const attPayload = attendances.map((a: any) => ({
        realization_id: realization.id,
        cell_person_id: a.cell_person_id || null,
        person_id: a.person_id || null,
        status: a.status
      }))
      const { error: attError } = await supabase.from('cell_attendances').insert(attPayload)
      if (attError) throw new Error(`Erro ao inserir presenças: ${attError?.message}`)
    }

    // 4. Limpar e salvar visitantes
    await supabase.from('cell_visitors').delete().eq('realization_id', realization.id)

    if (visitors && visitors.length > 0) {
      const visPayload = visitors.map((v: any) => ({
        realization_id: realization.id,
        full_name: v.full_name,
        phone: v.phone
      }))
      const { error: visError } = await supabase.from('cell_visitors').insert(visPayload)
      if (visError) throw new Error(`Erro ao inserir visitantes: ${visError?.message}`)
    }

    const cellPersonIds = Array.from(new Set((attendances || [])
      .map((a: any) => a.cell_person_id)
      .filter((id: string | null | undefined) => !!id))) as string[]

    if (cellPersonIds.length > 0) {
      await maybePromoteCellPeople({ supabase, cellId: cell_id, cellPersonIds })
    }

    return NextResponse.json({ item: realization })
  } catch (error: any) {
    console.error('========== ERRO NO POST /realizacoes ==========')
    console.error('Error object:', error)
    console.error('Error constructor:', error?.constructor?.name)
    console.error('Error message:', error?.message)
    console.error('Error code:', error?.code)
    console.error('Error details:', error?.details)
    console.error('Error status:', error?.status)
    console.error('Is Error instance:', error instanceof Error)
    console.error('Full Error JSON:', JSON.stringify(error, Object.getOwnPropertyNames(error)))
    if (error instanceof Error) {
      console.error('Stack:', error.stack)
    }
    console.error('==========================================')
    
    let errorMessage = 'Erro desconhecido'
    if (error instanceof Error) {
      errorMessage = error.message
    } else if (error?.message) {
      errorMessage = String(error.message)
    } else if (error?.error?.message) {
      errorMessage = String(error.error.message)
    } else if (typeof error === 'object' && error !== null) {
      errorMessage = JSON.stringify(error)
    } else if (typeof error === 'string') {
      errorMessage = error
    }
    
    console.error('Mensagem de erro processada:', errorMessage)
    
    return NextResponse.json(
      { error: 'Erro ao salvar realização', message: errorMessage },
      { status: 500 }
    )
  }
}
