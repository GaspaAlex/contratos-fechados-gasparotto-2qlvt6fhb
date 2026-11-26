import { isArchived } from './src__lib__archivedStatuses.mjs';
/** Contratos resolvíveis (que ainda existem) a partir de um protocolo. */
export function resolverContratosDoProtocolo(protocolo, contratosPorId) {
    const ids = (protocolo.contratos || []).filter(Boolean);
    if (ids.length === 0)
        return [];
    if (protocolo.expand?.contratos && protocolo.expand.contratos.length > 0) {
        return protocolo.expand.contratos;
    }
    if (contratosPorId) {
        const resolv = ids
            .map((id) => contratosPorId.get(id))
            .filter((c) => !!c);
        return resolv;
    }
    return [];
}
/**
 * Protocolo Válido: continua contabilizando quando sem relation (fallback) ou
 * quando possui ao menos 1 contrato relacionado ainda existente e não arquivado.
 */
export function isProtocoloValido(protocolo, contratosPorId) {
    const ids = (protocolo.contratos || []).filter(Boolean);
    if (ids.length === 0)
        return true; // fallback conservador
    const resolviveis = resolverContratosDoProtocolo(protocolo, contratosPorId);
    if (resolviveis.length === 0)
        return true; // todos órfãos → conservador
    return resolviveis.some((c) => !isArchived(c.status));
}
/** Retorna o status do contrato "relevante" para exibição: o 1º arquivado; senão o 1º resolvido. */
export function statusContratoParaExibicao(protocolo, contratosPorId) {
    const resolviveis = resolverContratosDoProtocolo(protocolo, contratosPorId);
    if (resolviveis.length === 0)
        return null;
    const arquivado = resolviveis.find((c) => isArchived(c.status));
    return arquivado ? arquivado.status || null : null;
}
