type EliteInput = {
  monthKey: string
  realizations: Array<{
    id: string
    cell_id: string
    reference_month: string
    pd_value: number
    pd_approval_status?: string | null
    attendances?: Array<{ status: string; cell_person?: { type: string } | null }>
    visitors?: Array<unknown>
  }>
}

export function computeEliteCells(input: EliteInput) {
  const byCell = new Map<string, { count: number; pdTotal: number; pdCount: number; hasVisitor: boolean }>()

  for (const rel of input.realizations) {
    if (rel.reference_month !== input.monthKey) continue
    const current = byCell.get(rel.cell_id) || { count: 0, pdTotal: 0, pdCount: 0, hasVisitor: false }

    current.count += 1
    if (rel.pd_approval_status !== 'rejected') {
      current.pdTotal += Number(rel.pd_value || 0)
      current.pdCount += 1
    }

    const hasVisitors = (rel.visitors?.length || 0) > 0
    const hasVisitorAttendance = (rel.attendances || []).some((a) => a.cell_person?.type === 'visitor')
    if (hasVisitors || hasVisitorAttendance) current.hasVisitor = true

    byCell.set(rel.cell_id, current)
  }

  const eliteCellIds = new Set<string>()
  for (const [cellId, stat] of byCell.entries()) {
    const avg = stat.pdCount ? stat.pdTotal / stat.pdCount : 0
    if (stat.count > 0 && avg >= 10 && stat.hasVisitor) {
      eliteCellIds.add(cellId)
    }
  }

  return eliteCellIds
}
