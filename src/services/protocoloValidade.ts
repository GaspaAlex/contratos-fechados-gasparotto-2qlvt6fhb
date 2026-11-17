import { isArchived } from '@/lib/archivedStatuses'

/**
 * Define um "Protocolo Válido" para os indicadores da página Protocolo.
 *
 * Regra:
 *  - Sem relation `contratos` preenchida → VÁLIDO (fallback conservador para
 *    registros antigos, sem vínculo automático/manual).
 *  - Com relation → válido apenas se EXISTIR pelo menos 1 contrato relacionado
 *    que (a) ainda exista (ID não órfão) e (b) NÃO esteja arquivado segundo
 *    `isArchived()` de `src/lib/archivedStatuses.ts` (fonte única).
 *  - Múltiplos contratos: basta 1 válido (item 9). IDs órfãos são ignorados
 *    (item 10) — se todos os IDs forem órfãos, fallback conservador: válido.
 */
export interface ContratoFechadoMini {
  id: string
  status?: string
}

export interface ProtocoloComContratos {
  contratos?: string[] | null
  expand?: {
    contratos?: ContratoFechadoMini[] | null
    [key: string]: any
  } | null
}

/** Contratos resolvíveis (que ainda existem) a partir de um protocolo. */
export function resolverContratosDoProtocolo(
  protocolo: ProtocoloComContratos,
  contratosPorId?: Map<string, ContratoFechadoMini>,
): ContratoFechadoMini[] {
  const ids = (protocolo.contratos || []).filter(Boolean)
  if (ids.length === 0) return []

  if (protocolo.expand?.contratos && protocolo.expand.contratos.length > 0) {
    return protocolo.expand.contratos
  }
  if (contratosPorId) {
    const resolv = ids
      .map((id) => contratosPorId.get(id))
      .filter((c): c is ContratoFechadoMini => !!c)
    return resolv
  }
  return []
}

/**
 * Protocolo Válido: continua contabilizando quando sem relation (fallback) ou
 * quando possui ao menos 1 contrato relacionado ainda existente e não arquivado.
 */
export function isProtocoloValido(
  protocolo: ProtocoloComContratos,
  contratosPorId?: Map<string, ContratoFechadoMini>,
): boolean {
  const ids = (protocolo.contratos || []).filter(Boolean)
  if (ids.length === 0) return true // fallback conservador

  const resolviveis = resolverContratosDoProtocolo(protocolo, contratosPorId)
  if (resolviveis.length === 0) return true // todos órfãos → conservador

  return resolviveis.some((c) => !isArchived(c.status))
}

/** Retorna o status do contrato "relevante" para exibição: o 1º arquivado; senão o 1º resolvido. */
export function statusContratoParaExibicao(
  protocolo: ProtocoloComContratos,
  contratosPorId?: Map<string, ContratoFechadoMini>,
): string | null {
  const resolviveis = resolverContratosDoProtocolo(protocolo, contratosPorId)
  if (resolviveis.length === 0) return null
  const arquivado = resolviveis.find((c) => isArchived(c.status))
  return arquivado ? arquivado.status || null : null
}
