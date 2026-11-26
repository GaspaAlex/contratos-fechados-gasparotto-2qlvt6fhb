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
];
/**
 * Normaliza uma string de status para comparação segura (trim e case insensitive,
 * preservando acentuação ou normalizando variações comuns).
 */
const normalizeStatus = (status) => {
    if (!status)
        return '';
    return status.trim().toLowerCase();
};
const ARCHIVED_NORMALIZED_SET = new Set(ARCHIVED_STATUSES.map((s) => normalizeStatus(s)));
/**
 * Determina se um contrato ou status é considerado arquivado/inativo.
 * Aceita tanto uma string de status quanto um objeto com a propriedade `status`.
 */
export function isArchived(target) {
    if (!target)
        return false;
    const statusStr = typeof target === 'string' ? target : target.status;
    if (!statusStr)
        return false;
    return ARCHIVED_NORMALIZED_SET.has(normalizeStatus(statusStr));
}
