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

/**
 * Retorna a data local atual no formato civil "YYYY-MM-DD" baseada no relógio do navegador.
 */
export function getLocalTodayYMD(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Normaliza qualquer string de data (PocketBase date "YYYY-MM-DD HH:mm:ss.sssZ" ou "YYYY-MM-DD")
 * para a data civil no formato "YYYY-MM-DD".
 */
export function normalizeDateCivil(dateStr?: string | null): string {
  if (!dateStr) return ''
  const trimmed = dateStr.trim()
  if (!trimmed) return ''
  return trimmed.split(' ')[0].split('T')[0]
}

export type ReviewStatus = 'past' | 'today' | 'future'

/**
 * Compara uma data civil com a data local de hoje.
 * - 'past': revisar_em < hoje (atrasada)
 * - 'today': revisar_em === hoje (revisar hoje)
 * - 'future': revisar_em > hoje (futura)
 * Retorna null se não houver data válida.
 */
export function getReviewStatus(
  dateStr?: string | null,
  todayYMD = getLocalTodayYMD(),
): ReviewStatus | null {
  const civil = normalizeDateCivil(dateStr)
  if (!civil || !/^\d{4}-\d{2}-\d{2}$/.test(civil)) return null
  if (civil < todayYMD) return 'past'
  if (civil === todayYMD) return 'today'
  return 'future'
}

/**
 * Verifica se a data civil deve ser revisada (revisar_em <= hoje).
 */
export function isDueForReview(dateStr?: string | null, todayYMD = getLocalTodayYMD()): boolean {
  const status = getReviewStatus(dateStr, todayYMD)
  return status === 'past' || status === 'today'
}
