// Identidade de caso — helpers de continuação de protocolo.
// A cadeia resolve SEMPRE à raiz (caso_origem é a raiz, gravado pelo hook
// protocolo_novo_mesmo_caso.js), mantendo a identidade nas 2ª, 3ª... movimentações.
import type { ProtocoloItem } from '@/services/protocolo'

export const TIPOS_CONTINUIDADE = [
  'Administrativo → Judicial',
  'Novo ajuizamento',
  'Outra continuidade justificada',
] as const

export type TipoContinuidade = (typeof TIPOS_CONTINUIDADE)[number]

/** O registro é uma continuação de outro protocolo (tem raiz gravada). */
export function isContinuacao(item: Pick<ProtocoloItem, 'caso_origem'> | any): boolean {
  return Boolean(item?.caso_origem)
}

/**
 * Raiz do caso: resolve a cadeia via expand.caso_origem (recursivo, com guarda
 * de ciclo). Com o hook, a raiz já vem direto; a resolução serve para dados
 * gravados antes da regra da raiz e como defesa adicional.
 */
export function resolverRaizCaso(
  item: ProtocoloItem | any,
  visita: Set<string> = new Set(),
): ProtocoloItem | any {
  if (!item) return item
  if (visita.has(item.id)) return null // guarda de ciclo
  visita.add(item.id)
  const origem = item.expand?.caso_origem
  if (origem) return resolverRaizCaso(origem, visita)
  return item
}

/** Ids da cadeia completa: raiz + todas as continuações registradas na raiz. */
export function idsDaCadeia(item: ProtocoloItem | any): string[] {
  const raiz = resolverRaizCaso(item)
  if (!raiz) return item ? [item.id] : []
  const ids = new Set<string>([raiz.id])
  const lista = Array.isArray(raiz.caso_continuacoes) ? raiz.caso_continuacoes : []
  for (const id of lista) ids.add(String(id))
  return Array.from(ids)
}
