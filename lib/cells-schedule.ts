type CellSchedule = {
  day_of_week: 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat'
  time_of_day?: string | null
  frequency?: 'weekly' | 'biweekly' | 'monthly' | null
}

const DAY_MAP: Record<CellSchedule['day_of_week'], number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6
}

function applyTime(base: Date, time?: string | null) {
  if (!time) return base
  const [h, m] = time.split(':').map((v) => parseInt(v, 10))
  if (!Number.isFinite(h) || !Number.isFinite(m)) return base
  const withTime = new Date(base)
  withTime.setHours(h, m, 0, 0)
  return withTime
}

export function getNextOccurrence(cell: CellSchedule, realizationDate: Date): Date {
  const freq = cell.frequency || 'weekly'
  const dayTarget = DAY_MAP[cell.day_of_week]

  if (freq === 'biweekly') {
    const next = new Date(realizationDate)
    next.setDate(next.getDate() + 14)
    return applyTime(next, cell.time_of_day)
  }

  if (freq === 'monthly') {
    const nextMonth = new Date(realizationDate)
    nextMonth.setMonth(nextMonth.getMonth() + 1)
    const d = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 1)
    while (d.getDay() !== dayTarget) {
      d.setDate(d.getDate() + 1)
    }
    return applyTime(d, cell.time_of_day)
  }

  const next = new Date(realizationDate)
  next.setDate(next.getDate() + 7)
  return applyTime(next, cell.time_of_day)
}

export function getEditLockAt(cell: CellSchedule, realizationDate: Date): Date {
  return getNextOccurrence(cell, realizationDate)
}
