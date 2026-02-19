import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

/**
 * GET /api/admin/celulas/check-duplicates
 * Verifica duplicatas na tabela cell_people
 */
export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'celulas', action: 'view' })
  if (!access.ok) return access.response

  const supabase = createSupabaseAdminClient(request)

  try {
    // Buscar todas as pessoas das células
    const { data: allPeople, error } = await supabase
      .from('cell_people')
      .select(`
        id,
        cell_id,
        person_id,
        full_name,
        phone,
        type,
        status,
        created_at,
        person:people(id, full_name),
        cell:cells(id, name)
      `)
      .order('cell_id')
      .order('created_at')

    if (error) {
      console.error('Erro ao buscar pessoas:', error)
      return NextResponse.json({ error: 'Erro ao buscar pessoas.' }, { status: 500 })
    }

    // Agrupar por célula
    const byCellId: Record<string, any[]> = {}
    allPeople.forEach(record => {
      if (!byCellId[record.cell_id]) {
        byCellId[record.cell_id] = []
      }
      byCellId[record.cell_id].push(record)
    })

    const duplicates: any[] = []

    // Verificar duplicatas por célula
    for (const cellId in byCellId) {
      const records = byCellId[cellId]
      const cellName = records[0]?.cell?.name || cellId

      // Agrupar por person_id ou nome+telefone
      const personMap: Record<string, any[]> = {}

      records.forEach(record => {
        let key: string
        
        if (record.person_id) {
          // Membro com person_id - chave é o person_id
          key = `person_${record.person_id}`
        } else {
          // Visitante sem person_id - chave é nome + telefone
          const name = (record.full_name || '').toLowerCase().trim()
          const phone = (record.phone || '').trim()
          key = `visitor_${name}_${phone}`
        }

        if (!personMap[key]) {
          personMap[key] = []
        }
        personMap[key].push(record)
      })

      // Verificar quais têm duplicatas
      for (const key in personMap) {
        const group = personMap[key]
        if (group.length > 1) {
          const first = group[0]
          const personName = first.person?.full_name || first.full_name || 'Sem nome'
          
          duplicates.push({
            cellId,
            cellName,
            personName,
            personId: first.person_id,
            type: first.type,
            count: group.length,
            records: group.map(r => ({
              id: r.id,
              status: r.status,
              createdAt: r.created_at
            }))
          })
        }
      }
    }

    return NextResponse.json({ 
      total: allPeople.length,
      duplicates,
      duplicateCount: duplicates.reduce((sum, d) => sum + (d.count - 1), 0)
    })
  } catch (err) {
    console.error('Erro ao verificar duplicatas:', err)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/celulas/check-duplicates?ids=id1,id2,id3
 * Remove registros duplicados específicos
 */
export async function DELETE(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'celulas', action: 'manage' })
  if (!access.ok) return access.response

  const idsParam = request.nextUrl.searchParams.get('ids')
  if (!idsParam) {
    return NextResponse.json({ error: 'IDs não fornecidos.' }, { status: 400 })
  }

  const ids = idsParam.split(',').filter(Boolean)
  if (ids.length === 0) {
    return NextResponse.json({ error: 'Nenhum ID válido fornecido.' }, { status: 400 })
  }

  const supabase = createSupabaseAdminClient(request)

  try {
    const { error } = await supabase
      .from('cell_people')
      .delete()
      .in('id', ids)

    if (error) {
      console.error('Erro ao deletar registros:', error)
      return NextResponse.json({ error: 'Erro ao deletar registros.' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      deletedCount: ids.length 
    })
  } catch (err) {
    console.error('Erro ao deletar duplicatas:', err)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
