const BRAZIL_UTC_OFFSET = '-03:00'

export type ReservationStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'

export function parseTimeToMinutes(value: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  return hours * 60 + minutes
}

export function isAllowedDay(availableDays: number[] | null | undefined, dateYmd: string): boolean {
  if (!Array.isArray(availableDays) || availableDays.length === 0) return false
  const anchor = new Date(`${dateYmd}T12:00:00${BRAZIL_UTC_OFFSET}`)
  if (Number.isNaN(anchor.getTime())) return false
  const day = anchor.getUTCDay()
  return availableDays.includes(day)
}

export function toUtcIsoFromBrazilDateTime(dateYmd: string, hhmm: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateYmd)) return null
  if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(hhmm)) return null
  const date = new Date(`${dateYmd}T${hhmm}:00${BRAZIL_UTC_OFFSET}`)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

export function isWithinRoomWindow(
  startTime: string,
  endTime: string,
  roomStartTime: string | null | undefined,
  roomEndTime: string | null | undefined
): boolean {
  const start = parseTimeToMinutes(startTime)
  const end = parseTimeToMinutes(endTime)
  const allowedStart = parseTimeToMinutes((roomStartTime ?? '').slice(0, 5))
  const allowedEnd = parseTimeToMinutes((roomEndTime ?? '').slice(0, 5))
  if (start == null || end == null || allowedStart == null || allowedEnd == null) return false
  if (end <= start) return false
  return start >= allowedStart && end <= allowedEnd
}

export function formatDatePtBr(isoString: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    dateStyle: 'short',
  }).format(new Date(isoString))
}

export function formatTimePtBr(isoString: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(isoString))
}

