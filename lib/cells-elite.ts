type Realization = {
  id: string
  cell_id: string
  reference_month: string
  pd_value: number | null
  pd_approval_status?: string | null
  attendances?: Array<{ status: string; cell_person?: { type: string } | null }>
  visitors?: Array<unknown>
}

type EliteInput = {
  monthKey: string
  realizations: Realization[]
}

export type EliteCriteria = {
  minPresent: boolean   // >= 7 presentes (grade + visitantes rápidos)
  hasVisitor: boolean   // >= 1 visitante na reunião
  pdOk: boolean         // PD >= R$ 10 (não rejeitado)
  totalPresent: number  // contagem real para exibição
  visitorsCount: number
  pdValue: number
}

export type CellEliteResult = {
  isElite: boolean
  realizationCount: number
  criteriaList: EliteCriteria[]     // uma entrada por realização do mês
  allMeetMinPresent: boolean
  allHaveVisitor: boolean
  allMeetPd: boolean
}

function checkRealization(rel: Realization): EliteCriteria {
  const att = rel.attendances || []

  const presentFromAtt = att.filter((a) => a.status === 'V').length
  const quickVisitors   = rel.visitors?.length || 0
  const totalPresent    = presentFromAtt + quickVisitors

  const visitorPresentInAtt = att.filter((a) => a.status === 'V' && a.cell_person?.type === 'visitor').length
  const visitorsCount = visitorPresentInAtt + quickVisitors
  const hasVisitor    = visitorsCount > 0

  const pdValue = Number(rel.pd_value || 0)
  const pdOk    = rel.pd_approval_status !== 'rejected' && pdValue >= 10

  return {
    minPresent: totalPresent >= 7,
    hasVisitor,
    pdOk,
    totalPresent,
    visitorsCount,
    pdValue,
  }
}

/** Retorna apenas o Set de IDs elite — compatível com código existente */
export function computeEliteCells(input: EliteInput): Set<string> {
  return computeEliteDetails(input).eliteCellIds
}

/** Retorna Set de IDs elite + detalhes por célula para exibição na UI */
export function computeEliteDetails(input: EliteInput): {
  eliteCellIds: Set<string>
  detailsByCellId: Map<string, CellEliteResult>
} {
  const byCell = new Map<string, EliteCriteria[]>()

  for (const rel of input.realizations) {
    if (rel.reference_month !== input.monthKey) continue
    const list = byCell.get(rel.cell_id) || []
    list.push(checkRealization(rel))
    byCell.set(rel.cell_id, list)
  }

  const eliteCellIds    = new Set<string>()
  const detailsByCellId = new Map<string, CellEliteResult>()

  for (const [cellId, criteriaList] of byCell.entries()) {
    if (criteriaList.length === 0) continue

    const allMeetMinPresent = criteriaList.every((c) => c.minPresent)
    const allHaveVisitor    = criteriaList.every((c) => c.hasVisitor)
    const allMeetPd         = criteriaList.every((c) => c.pdOk)
    const isElite           = allMeetMinPresent && allHaveVisitor && allMeetPd

    detailsByCellId.set(cellId, {
      isElite,
      realizationCount: criteriaList.length,
      criteriaList,
      allMeetMinPresent,
      allHaveVisitor,
      allMeetPd,
    })

    if (isElite) eliteCellIds.add(cellId)
  }

  return { eliteCellIds, detailsByCellId }
}
