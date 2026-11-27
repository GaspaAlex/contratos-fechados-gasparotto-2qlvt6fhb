/**
 * FUNÇÃO PURA — META MENSAL DE COMISSÕES (Build E1)
 * ==================================================
 * Calcula, para UMA competência (mes/ano), a situação da meta comercial de
 * contratos fechados e o efeito dela sobre a parte condicionada da Nataly.
 * Sem efeitos colaterais: não acessa o banco, não grava nada — testável em
 * memória (cenários A–J em src/lib/comissoes.cenarios.ts).
 *
 * CONTAGEM DA META (mesmo padrão do RDocsDashboard):
 *   c.dcontrato.startsWith('YYYY-MM') && !isArchived(c.status)
 *   - Data do Contrato (dcontrato) define a competência da meta;
 *   - contratos ARQUIVADOS não contam;
 *   - R. Docs do PROTOCOLO NÃO exclui o contrato da meta comercial — contrato
 *     fechado e ativo conta mesmo com o protocolo aguardando documentos
 *     (regras separadas: a comissão individual do caso continua suspensa).
 *
 * COMISSÃO (independente da meta):
 *   Bia = casos × 20 | Nayara = casos × 20 | Kaique = casos × 10
 *   Total básico = casos × 50 | Nataly potencial = casos × 20
 *   Nataly entra no total SOMENTE quando a meta está atingida. Sem meta
 *   cadastrada, a situação é "não definida" e NÃO se presume meta atingida.
 *
 * COMPETÊNCIA DAS COMISSÕES: exclusivamente por dcalculo (Data do Cálculo do
 * protocolo) — a Data do Protocolo (dprotocolo) não determina competência.
 * A quantidade de casos elegíveis à comissão é ENTRADA desta função: quem a
 * produz é `apurarComissoes`/`acumuladoComissoes` (src/lib/comissoes.ts), que
 * este build não altera.
 */
import { isArchived } from './src__lib__archivedStatuses.mjs';
export function calcularMetaComissoes(params) {
    const { contratos, mes, ano } = params;
    const prefixo = `${ano}-${String(mes).padStart(2, '0')}`;
    const contratosAtivos = contratos.filter((c) => !!c.dcontrato && c.dcontrato.startsWith(prefixo) && !isArchived(c.status)).length;
    const metaConfigurada = params.meta === undefined || params.meta === null || !Number.isFinite(params.meta)
        ? null
        : params.meta;
    const casos = Math.max(0, Math.floor(params.casosElegiveis || 0));
    const natalyPotencial = casos * 20;
    const totalBasico = casos * 50;
    let situacaoMeta;
    let natalyIncluida = 0;
    if (metaConfigurada === null) {
        situacaoMeta = 'nao definida';
    }
    else if (contratosAtivos >= metaConfigurada) {
        situacaoMeta = 'atingida';
        natalyIncluida = natalyPotencial;
    }
    else {
        situacaoMeta = 'nao atingida';
    }
    return {
        contratosAtivos,
        metaConfigurada,
        situacaoMeta,
        natalyPotencial,
        natalyIncluida,
        totalBasico,
        totalCompetencia: totalBasico + natalyIncluida,
        competencia: prefixo,
    };
}
