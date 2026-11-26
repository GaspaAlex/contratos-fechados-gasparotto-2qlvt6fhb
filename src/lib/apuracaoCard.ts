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
import {
  apurarComissoes,
  type ApuracaoComissoes,
  type ContratoComissoesInput,
  type ProtocoloComissoesInput,
} from '@/lib/comissoes'
import { calcularMetaComissoes, type ResultadoMetaComissoes } from '@/lib/comissaoMeta'
import {
  calcularComissoesColaboradores,
  COMPETENCIA_INICIO_CONTROLE,
  competenciaDeMesAno,
  type ColaboradorComissionado,
  type ResultadoComissoesColaboradores,
  type RegraComissao,
} from '@/lib/comissoesColaboradores'

export type EstadoConfiguracao = 'sem cadastro' | 'completa' | 'incompleta'

export interface ApuracaoCardComissoes {
  /** Apuração preliminar antiga — casos, suspensos, listas do detalhamento. */
  apuracao: ApuracaoComissoes
  /** Situação da meta comercial (sempre calculada; null fora do controle). */
  meta: ResultadoMetaComissoes | null
  /** Modo de apuração desta competência: 'fallback' (antiga) ou 'dinamico'. */
  modo: 'fallback' | 'dinamico'
  estadoConfiguracao: EstadoConfiguracao
  /** Colaboradores com regra vigente — linhas do rosto (modo dinâmico). */
  linhas: ResultadoComissoesColaboradores['linhas']
  /** Total da competência: soma APENAS das comissões efetivamente incluídas. */
  totalCompetencia: number
  /** Somatório potencial (condicionadas fora quando meta não confirma). */
  totalPotencial: number
  /** Avisos para o gestor (configuração incompleta, fora do controle…). */
  avisos: string[]
  /** A competência está sob o novo controle (>= nov/2026)? */
  noControle: boolean
}

export function apurarCardComissoes(params: {
  protocolos: ProtocoloComissoesInput[]
  contratos: ContratoComissoesInput[]
  tiposAcaoPorId?: Map<string, { id: string; nome: string }>
  meses: readonly string[]
  mes: number
  ano: number
  /** Meta cadastrada da competência (null = não definida). */
  metaCadastrada?: number | null
  /** Cadastro dinâmico carregado; undefined = ainda não carregado (fallback). */
  colaboradores?: ColaboradorComissionado[]
  regras?: RegraComissao[]
  /** Competência corrente (YYYY-MM); padrão = hoje. Cenários passam valor fixo. */
  competenciaReferencia?: string
}): ApuracaoCardComissoes {
  const { protocolos, contratos, tiposAcaoPorId, meses, mes, ano } = params
  const competencia = competenciaDeMesAno(mes, ano)
  const competenciaRef =
    params.competenciaReferencia ??
    competenciaDeMesAno(new Date().getMonth() + 1, new Date().getFullYear())
  const noControle = competencia >= COMPETENCIA_INICIO_CONTROLE

  const apuracao = apurarComissoes(protocolos, contratos, mes, ano, meses, tiposAcaoPorId)

  const meta = noControle
    ? calcularMetaComissoes({
        contratos,
        mes,
        ano,
        meta: params.metaCadastrada ?? null,
        casosElegiveis: apuracao.quantidadeElegivel,
      })
    : null

  const colaboradores = params.colaboradores ?? []
  const regras = params.regras ?? []
  const temCadastro = colaboradores.length > 0
  const avisos: string[] = []

  // Fallback: nada cadastrado OU competência fora do novo controle.
  if (!noControle || !temCadastro) {
    if (noControle && !temCadastro) {
      avisos.push(
        'Nenhum colaborador comissionado cadastrado — usando a distribuição fixa antiga (Bia 20, Nayara 20, Kaique 10, Nataly 20 potencial). Cadastre a equipe para ativar o novo controle.',
      )
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
    }
  }

  // Modo dinâmico — EXCLUSIVO (nunca soma com o fallback).
  const resultado = calcularComissoesColaboradores({
    casosElegiveis: apuracao.quantidadeElegivel,
    competencia,
    colaboradores,
    regras,
    situacaoMeta: meta ? meta.situacaoMeta : 'nao definida',
    competenciaReferencia: competenciaRef,
  })

  const comRegraVigente = new Set(resultado.linhas.map((l) => l.colaboradorId))
  const semRegra = colaboradores.filter((c) => !comRegraVigente.has(c.id))
  const estadoConfiguracao: EstadoConfiguracao = semRegra.length > 0 ? 'incompleta' : 'completa'
  if (semRegra.length > 0) {
    const nomes = semRegra.map((c) => c.nome).join(', ')
    avisos.push(
      `Configuração incompleta: ${nomes} sem regra vigente em ${competencia} — sem comissão calculada para este(s) colaborador(es) nesta competência (não é usado valor antigo).`,
    )
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
  }
}
