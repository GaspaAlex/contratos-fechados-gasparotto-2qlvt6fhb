/**
 * DECISÕES DO CAMPO `decisao` DA COLEÇÃO `protocolo` — fonte única dos rótulos.
 *
 * Opção 0107: "Extinto sem resolução do mérito" acrescentada por migration
 * aditiva (somente as opções do select). Nada foi convertido: registros
 * antigos (Aguardando/Procedente/Improcedente e vazios) seguem idênticos.
 *
 * Usado por: ProtocoloTableRow, ProtocoloTableRowArquivado, ProtocoloTable
 * (relatório impresso) e pelos cenários de decisão em memória.
 */

export const DECISAO_EXTINTO_SEM_MERITO = 'Extinto sem resolução do mérito'

/** Rótulo de exibição da decisão — idêntico ao valor armazenado. */
export function decisaoBadgeLabel(decisao: string | null | undefined): string {
  if (!decisao) return ''
  return decisao
}

/** Todas as decisões com rótulo exibível (≠ Aguardando). */
export function isDecisaoConhecida(decisao: string | null | undefined): boolean {
  return (
    decisao === 'Aguardando' ||
    decisao === 'Procedente' ||
    decisao === 'Improcedente' ||
    decisao === DECISAO_EXTINTO_SEM_MERITO
  )
}

/**
 * Decisões que tiram o caso da projeção financeira (mesma lista central de
 * src/lib/protocoloIndicadores.ts — DECISOES_SEM_PROJECAO). 'Extinto sem
 * resolução do mérito' se soma a 'Improcedente' sem alterá-la.
 */
export function isDecisaoSemProjecao(decisao: string | null | undefined): boolean {
  return decisao === 'Improcedente' || decisao === DECISAO_EXTINTO_SEM_MERITO
}
