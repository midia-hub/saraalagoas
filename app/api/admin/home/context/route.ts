import { NextRequest, NextResponse } from 'next/server'
import { getAccessSnapshotFromRequest } from '@/lib/rbac'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

const DAY_NAMES: Record<string, string> = {
  sun: 'Domingo', mon: 'Segunda', tue: 'Terça',
  wed: 'Quarta', thu: 'Quinta', fri: 'Sexta', sat: 'Sábado',
}

export async function GET(request: NextRequest) {
  const snapshot = await getAccessSnapshotFromRequest(request).catch(() => null)
  if (!snapshot?.canAccessAdmin) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })
  }

  const personId = snapshot.personId
  const supabase = createSupabaseAdminClient(request)

  const canCelulas = snapshot.isAdmin || !!snapshot.permissions['celulas']?.view
  const canConsolidacao = snapshot.isAdmin || !!snapshot.permissions['consolidacao']?.view

  const [myCellsResult, followupsResult] = await Promise.all([
    // Células onde o usuário é líder ou co-líder
    (canCelulas && personId)
      ? supabase
          .from('cells')
          .select('id, name, day_of_week, time_of_day, status')
          .or(`leader_person_id.eq.${personId},co_leader_person_id.eq.${personId}`)
          .eq('status', 'ativa')
          .limit(3)
      : Promise.resolve({ data: [], error: null }),

    // Followups pendentes de consolidação
    canConsolidacao
      ? supabase
          .from('consolidation_followups')
          .select('*', { count: 'exact', head: true })
          .in('status', ['em_acompanhamento', 'direcionado_revisao'])
      : Promise.resolve({ count: 0, error: null }),
  ])

  const myCells = (myCellsResult.data ?? []).map((c: any) => ({
    id: c.id,
    name: c.name,
    dayLabel: DAY_NAMES[c.day_of_week] ?? c.day_of_week,
    timeOfDay: c.time_of_day ?? null,
  }))

  return NextResponse.json({
    myCells,
    pendingFollowups: followupsResult.count ?? 0,
  })
}
