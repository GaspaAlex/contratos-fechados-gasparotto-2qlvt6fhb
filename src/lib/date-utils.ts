import { addDays, getDay, isAfter, startOfDay, parseISO } from 'date-fns'

export function addWorkingDays(date: Date, days: number): Date {
  let current = new Date(date)
  let added = 0
  while (added < days) {
    current = addDays(current, 1)
    // 0 = Sunday, 6 = Saturday
    if (getDay(current) !== 0 && getDay(current) !== 6) {
      added++
    }
  }
  return current
}

export function isOverdue(protocolDate: string | Date | undefined, prazo: number): boolean {
  if (!protocolDate) return false
  const start = typeof protocolDate === 'string' ? parseISO(protocolDate) : protocolDate
  const due = addWorkingDays(start, prazo || 15)
  return isAfter(startOfDay(new Date()), startOfDay(due))
}
