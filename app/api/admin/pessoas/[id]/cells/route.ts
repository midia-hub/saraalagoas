import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

const DAYS_LABEL: Record<string, string> = {
  'mon': 'Segunda-feira',
  'tue': 'Terça-feira',
  'wed': 'Quarta-feira',
  'thu': 'Quinta-feira',
  'fri': 'Sexta-feira',
  'sat': 'Sábado',
  'sun': 'Domingo',
}

/**
 * GET /api/admin/pessoas/[id]/cells
 * Retorna todas as células relacionadas à pessoa:
 * - Células onde é líder
 * - Células onde é co-líder
 * - Células onde está vinculada como membro (cell_people)
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireAccess(request, { pageKey: 'consolidacao', action: 'view' })
  if (!access.ok) return access.response

  try {
    const { id } = await params
    if (!id) return NextResponse.json({ error: 'ID da pessoa obrigatório' }, { status: 400 })

    const supabase = createSupabaseAdminClient(request)

    // Buscar células onde a pessoa é líder ou co-líder
    const { data: leaderCells, error: leaderError } = await supabase
      .from('cells')
      .select('id, name, day_of_week, time_of_day, frequency, church_id, leader_person_id, co_leader_person_id, church:churches(name)')
      .or(`leader_person_id.eq.${id},co_leader_person_id.eq.${id}`)

    if (leaderError) {
      console.error('Erro ao buscar células como líder:', leaderError)
      return NextResponse.json({ error: 'Erro ao buscar células' }, { status: 500 })
    }

    // Buscar células onde a pessoa está vinculada como membro (cell_people)
    const { data: memberCells, error: memberError } = await supabase
      .from('cell_people')
      .select('cell_id')
      .eq('person_id', id)

    if (memberError) {
      console.error('Erro ao buscar células como membro:', memberError)
      return NextResponse.json({ error: 'Erro ao buscar células' }, { status: 500 })
    }

    const cellIds = memberCells?.map(m => m.cell_id) || []
    let membershipCells: any[] = []

    if (cellIds.length > 0) {
      const { data: cells, error: cellError } = await supabase
        .from('cells')
        .select('id, name, day_of_week, time_of_day, frequency, church_id, leader_person_id, co_leader_person_id, church:churches(name)')
        .in('id', cellIds)

      if (cellError) {
        console.error('Erro ao buscar dados das células de membro:', cellError)
        return NextResponse.json({ error: 'Erro ao buscar células' }, { status: 500 })
      }

      membershipCells = cells || []
    }

    // Combinar e desnuplicar (algumas células podem aparecer nos dois grupos)
    const leaderCellIds = new Set(leaderCells?.map(c => c.id) || [])
    const allCells = [
      ...(leaderCells || []),
      ...membershipCells.filter(c => !leaderCellIds.has(c.id))
    ]

    // Enriquecer com informações de papel (role) e label do dia
    const enrichedCells = allCells.map((cell: any) => ({
      id: cell.id,
      name: cell.name,
      day_of_week: cell.day_of_week,
      day_label: cell.day_of_week ? DAYS_LABEL[cell.day_of_week] || cell.day_of_week : null,
      time_of_day: cell.time_of_day,
      frequency: cell.frequency,
      church_id: cell.church_id,
      church_name: cell.church?.name || null,
      role: cell.leader_person_id === id ? 'Líder' : cell.co_leader_person_id === id ? 'Co-Líder' : 'Membro',
    }))

    return NextResponse.json({ items: enrichedCells })
  } catch (err) {
    console.error('GET pessoas/[id]/cells:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
