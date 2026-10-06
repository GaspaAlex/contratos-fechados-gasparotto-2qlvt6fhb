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
 * Regra centralizada de atraso da aba Protocolo.
 * - Somente registros com status exatamente "Prov. Inicial" podem ser considerados atrasados.
 * - Utiliza exclusivamente a data civil local de `dprotocolo`.
 * - Se `dprotocolo` estiver vazio, retorna false.
 * - Atrasado somente quando `dprotocolo` for anterior à data civil de hoje.
 * - Data igual a hoje NÃO é atrasada.
 * - Não utiliza dcalculo, dcontrato, prazo, decisao, origem ou parceiro.
 */
export function isProtocoloOverdue(
  item: { status?: string | null; dprotocolo?: string | null } | null | undefined,
): boolean {
  if (!item || item.status !== 'Prov. Inicial' || !item.dprotocolo) {
    return false
  }

  const dStr = item.dprotocolo.includes('T')
    ? item.dprotocolo.split('T')[0]
    : item.dprotocolo.split(' ')[0]
  const [y, m, d] = dStr.split('-').map(Number)
  if (isNaN(y) || isNaN(m) || isNaN(d)) return false

  const itemDate = new Date(y, m - 1, d)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return itemDate.getTime() < today.getTime()
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

/**
 * Predicado canônico para verificar se um contrato precisa de revisão.
 * Um contrato precisa de revisão quando:
 * - Não está arquivado (!isArchived(status))
 * - Possui data de revisão preenchida (Boolean(revisar_em))
 * - A data de revisão está para hoje ou no passado (isDueForReview(revisar_em))
 */
export function isContractDueForReview(
  contract: { status?: string | null; revisar_em?: string | null } | null | undefined,
  isArchivedFn: (status?: string | null) => boolean,
  todayYMD = getLocalTodayYMD(),
): boolean {
  if (!contract) return false
  if (isArchivedFn(contract.status)) return false
  if (!contract.revisar_em) return false
  return isDueForReview(contract.revisar_em, todayYMD)
}

export interface ProtocoloFollowUpStats {
  total: number // Registros únicos que precisam de acompanhamento
  atrasados: number // Protocolos atrasados (isProtocoloOverdue)
  revisarHoje: number // Revisões devidas hoje (revisar_em === hoje)
  revisarAtrasadas: number // Revisões atrasadas (revisar_em < hoje)
  items: any[] // Lista deduplicada de itens que atendem a pelo menos uma condição
}

/**
 * Predicado canônico para verificar se um item de Protocolo precisa de acompanhamento.
 * Retorna true se:
 * - isProtocoloOverdue(item) === true (status 'Prov. Inicial' + dprotocolo < hoje)
 * - OU revisar_em <= hoje (getReviewStatus(item.revisar_em) === 'today' || 'past')
 */
export function isProtocoloDueForFollowUp(
  item:
    | { status?: string | null; dprotocolo?: string | null; revisar_em?: string | null }
    | null
    | undefined,
  todayYMD = getLocalTodayYMD(),
): boolean {
  if (!item) return false
  const overdue = isProtocoloOverdue(item)
  const reviewStatus = getReviewStatus(item.revisar_em, todayYMD)
  const hasReviewDue = reviewStatus === 'today' || reviewStatus === 'past'
  return overdue || hasReviewDue
}

/**
 * Fonte única de verdade para contagens e detalhamentos do alerta e filtros de acompanhamento do Protocolo.
 * Deduplica registros únicos no total e agrupa as 3 categorias:
 * - atrasados (isProtocoloOverdue)
 * - revisarHoje (revisar_em === hoje)
 * - revisarAtrasadas (revisar_em < hoje)
 */
export function getProtocoloFollowUpStats(
  items: any[] = [],
  todayYMD = getLocalTodayYMD(),
): ProtocoloFollowUpStats {
  let atrasadosCount = 0
  let revisarHojeCount = 0
  let revisarAtrasadasCount = 0
  const matchedItems: any[] = []

  for (const item of items) {
    if (!item) continue
    const overdue = isProtocoloOverdue(item)
    const reviewStatus = getReviewStatus(item.revisar_em, todayYMD)
    const isToday = reviewStatus === 'today'
    const isPast = reviewStatus === 'past'

    if (overdue) {
      atrasadosCount++
    }
    if (isToday) {
      revisarHojeCount++
    } else if (isPast) {
      revisarAtrasadasCount++
    }

    if (overdue || isToday || isPast) {
      matchedItems.push(item)
    }
  }

  return {
    total: matchedItems.length,
    atrasados: atrasadosCount,
    revisarHoje: revisarHojeCount,
    revisarAtrasadas: revisarAtrasadasCount,
    items: matchedItems,
  }
}
