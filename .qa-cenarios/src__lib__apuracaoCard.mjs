/**
 * FUNÇÃO PURA — AURAÇÃO DINÂMICA DO CARD DE COMISSÕES (Build F2)
 * ===============================================================
 * Junta as peças já existentes (SEM duplicar cálculo):
 *   - apurarComissoes (src/lib/comissoes.ts): casos únicos elegíveis por
 *     competência (competência exclusivamente por dcalculo);
 *   - calcularMetaComissoes (src/lib/comissaoMeta.ts): situação da meta
 *     comercial da competência (contratos ativos por dcontrato, isArchived);
 *   - calcularComissoesColaboradores (src/lib/comissoesColaboradores.ts):
 *     regras dinâmicas vigentes por colaborador.
 *
 * REGRA DE TRANSIÇÃO (fallback):
 *   - ZERO colaboradores cadastrados  → apuração ANTIGA (constantes fixas de
 *     comissoes.ts) — comportamento atual preservado;
 *   - ≥ 1 colaborador cadastrado      → EXCLUSIVAMENTE regras dinâmicas
 *     (nunca mistura com o fallback);
 *   - ≥ 1 colaborador mas ALGUM sem regra vigente na competência →
 *     configuração incompleta: o colaborador sem regra fica de fora e um
 *     aviso claro é gerado (sem valor fictício, sem fallback parcial).
 *
 * Competências anteriores a NOV/2026: fora do novo controle (apuração antiga).
 * Função pura: não acessa o banco, não grava nada.
 */
import { apurarComissoes, } from './src__lib__comissoes.mjs';
import { calcularMetaComissoes } from './src__lib__comissaoMeta.mjs';
import { calcularComissoesColaboradores, COMPETENCIA_INICIO_CONTROLE, competenciaDeMesAno, } from './src__lib__comissoesColaboradores.mjs';
export function apurarCardComissoes(params) {
    const { protocolos, contratos, tiposAcaoPorId, meses, mes, ano } = params;
    const competencia = competenciaDeMesAno(mes, ano);
    const competenciaRef = params.competenciaReferencia ??
        competenciaDeMesAno(new Date().getMonth() + 1, new Date().getFullYear());
    const noControle = competencia >= COMPETENCIA_INICIO_CONTROLE;
    const apuracao = apurarComissoes(protocolos, contratos, mes, ano, [...meses], tiposAcaoPorId);
    const meta = noControle
        ? calcularMetaComissoes({
            contratos,
            mes,
            ano,
            meta: params.metaCadastrada ?? null,
            casosElegiveis: apuracao.quantidadeElegivel,
        })
        : null;
    const colaboradores = params.colaboradores ?? [];
    const regras = params.regras ?? [];
    const temCadastro = colaboradores.length > 0;
    const avisos = [];
    // Fallback: nada cadastrado OU competência fora do novo controle.
    if (!noControle || !temCadastro) {
        if (noControle && !temCadastro) {
            avisos.push('Nenhum colaborador comissionado cadastrado — usando a distribuição fixa antiga (Bia 20, Nayara 20, Kaique 10, Nataly 20 potencial). Cadastre a equipe para ativar o novo controle.');
        }
        return {
            apuracao,
            meta,
            modo: 'fallback',
            estadoConfiguracao: temCadastro ? 'completa' : 'sem cadastro',
            linhas: [],
            totalCompetencia: apuracao.totalBasico,
            totalPotencial: apuracao.totalPotencial,
            avisos,
            noControle,
        };
    }
    // Modo dinâmico — EXCLUSIVO (nunca soma com o fallback).
    const resultado = calcularComissoesColaboradores({
        casosElegiveis: apuracao.quantidadeElegivel,
        competencia,
        colaboradores,
        regras,
        situacaoMeta: meta ? meta.situacaoMeta : 'nao definida',
        competenciaReferencia: competenciaRef,
    });
    const comRegraVigente = new Set(resultado.linhas.map((l) => l.colaboradorId));
    const semRegra = colaboradores.filter((c) => !comRegraVigente.has(c.id));
    const estadoConfiguracao = semRegra.length > 0 ? 'incompleta' : 'completa';
    if (semRegra.length > 0) {
        const nomes = semRegra.map((c) => c.nome).join(', ');
        avisos.push(`Configuração incompleta: ${nomes} sem regra vigente em ${competencia} — sem comissão calculada para este(s) colaborador(es) nesta competência (não é usado valor antigo).`);
    }
    return {
        apuracao,
        meta,
        modo: 'dinamico',
        estadoConfiguracao,
        linhas: resultado.linhas,
        // Total = soma APENAS das comissões efetivamente incluídas.
        totalCompetencia: resultado.totalConfirmado,
        totalPotencial: resultado.totalPotencial,
        avisos,
        noControle,
    };
}
