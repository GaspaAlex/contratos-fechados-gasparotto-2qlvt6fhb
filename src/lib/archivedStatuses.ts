/**
 * Fonte única de verdade para identificação de contratos arquivados/inativos
 * no módulo "Contratos Fechados".
 *
 * Valores exatos aceitos:
 * - 'Arquivar'
 * - 'Litispendência'
 * - 'Sem Qualidade de Segurado'
 * - 'Tem Advogado'
 */

export const ARCHIVED_STATUSES = [
  'Arquivar',
  'Litispendência',
  'Sem Qualidade de Segurado',
  'Tem Advogado',
] as const

export type ArchivedStatus = (typeof ARCHIVED_STATUSES)[number]

/**
 * Normaliza uma string de status para comparação segura (trim e case insensitive,
 * preservando acentuação ou normalizando variações comuns).
 */
const normalizeStatus = (status?: string | null): string => {
  if (!status) return ''
  return status.trim().toLowerCase()
}

const ARCHIVED_NORMALIZED_SET = new Set<string>(ARCHIVED_STATUSES.map((s) => normalizeStatus(s)))

/**
 * Determina se um contrato ou status é considerado arquivado/inativo.
 * Aceita tanto uma string de status quanto um objeto com a propriedade `status`.
 */
export function isArchived(target?: string | { status?: string | null } | null): boolean {
  if (!target) return false
  const statusStr = typeof target === 'string' ? target : target.status
  if (!statusStr) return false
  return ARCHIVED_NORMALIZED_SET.has(normalizeStatus(statusStr))
}
