/**
 * FUNÇÕES PURAS — COLABORADORES COMISSIONADOS DINÂMICOS (Build F1)
 * ================================================================
 * Base estrutural para a comissão deixar de ser "chumbada" em código
 * (VALOR_BASICO_POR_COLABORADOR, src/lib/comissoes.ts) e passar a ser
 * configurável por competência, com histórico imutável.
 *
 * PRINCÍPIO CENTRAL — HISTÓRICO POR COMPETÊNCIA:
 *   A comissão de uma competência vem da regra VIGENTE nela. O sistema NUNCA
 *   recalcula competências anteriores com valores novos: mudar o valor a
 *   partir de jan/2027 é FECHAR a regra anterior (vigencia_fim = 2026-12) e
 *   CRIAR outra com vigencia_inicio = 2027-01. nov/2026 continua pagando o
 *   valor da regra antiga para sempre.
 *
 * CAMPO ativo (situação administrativa ATUAL):
 *   - NÃO apaga histórico: enquanto havia regra vigente, a competência
 *     histórica continua paga mesmo com ativo=false hoje;
 *   - Futuro: colaborador inativo não paga em competências posteriores ao
 *     mês corrente (a saída definitiva é por vigencia_fim, que tem data).
 *
 * MODALIDADES:
 *   - fixa: integra sempre o total confirmado da competência;
 *   - condicionada_meta: integra SÓ quando a meta mensal da competência está
 *     atingida. Reutiliza a SituacaoMeta de src/lib/comissaoMeta.ts
 *     ('atingida' | 'nao atingida' | 'nao definida') — a lógica da meta NÃO é
 *     duplicada aqui. Meta não atingida ou não definida: o valor permanece
 *     apenas POTENCIAL.
 *
 * O campo Responsável do protocolo NÃO é critério de distribuição: a entrada
 * desta função é a quantidade de casos elegíveis, que quem produz é
 * `apurarComissoes` (src/lib/comissoes.ts) — deduplicação global e competência
 * exclusivamente por dcalculo permanecem lá.
 *
 * Função pura: não acessa o banco, não grava nada (cenários F-A..F-P em
 * src/lib/comissoesColaboradores.cenarios.ts, executados no prebuild).
 */

/** Primeira competência sob o novo controle (nenhuma regra pode começar antes). */
export const COMPETENCIA_INICIO_CONTROLE = '2026-11'

/** Modalidades disponíveis (mesmos valores do select da collection comissoes_regras). */
export type ModalidadeComissao = 'fixa' | 'condicionada_meta'

export interface ColaboradorComissionado {
  id: string
  nome: string
  ativo: boolean
  ordem: number
}

export interface RegraComissao {
  id: string
  /** Id do colaborador (relation obrigatória com comissoes_colaboradores). */
  colaborador: string
  modalidade: ModalidadeComissao
  /** Comissão por caso elegível (R$). */
  valor: number
  /** Competência de início, formato YYYY-MM. */
  vigencia_inicio: string
  /** Competência de encerramento (INCLUSIVA) ou vazio = em vigor. */
  vigencia_fim?: string | null
}

/** Competência "YYYY-MM" a partir de mes (1-12) e ano. */
export function competenciaDeMesAno(mes: number, ano: number): string {
  return `${ano}-${String(mes).padStart(2, '0')}`
}

/** Formato AAAA-MM com mês 01–12. */
export function isCompetenciaValida(valor: unknown): valor is string {
  return typeof valor === 'string' && /^[0-9]{4}-(0[1-9]|1[0-2])$/.test(valor)
}

/** Competência corrente (YYYY-MM) — usado só como padrão; cenários passam o valor. */
export function competenciaAtualPadrao(): string {
  const agora = new Date()
  return competenciaDeMesAno(agora.getMonth() + 1, agora.getFullYear())
}

/** Competência imediatamente anterior (fechamento de vigência: fim = mês antes do novo início). */
export function competenciaAnterior(competencia: string): string | null {
  if (!isCompetenciaValida(competencia)) return null
  const [anoTxt, mesTxt] = competencia.split('-')
  const ano = Number(anoTxt)
  const mes = Number(mesTxt)
  return mes === 1 ? `${ano - 1}-12` : competenciaDeMesAno(mes - 1, ano)
}

/** Competência imediatamente seguinte. */
export function competenciaSeguinte(competencia: string): string | null {
  if (!isCompetenciaValida(competencia)) return null
  const [anoTxt, mesTxt] = competencia.split('-')
  const ano = Number(anoTxt)
  const mes = Number(mesTxt)
  return mes === 12 ? `${ano + 1}-01` : competenciaDeMesAno(mes + 1, ano)
}

/**
 * VALIDAÇÃO DE REGRA — espelho fiel da validação do pb_hook
 * (pocketbase/hooks/comissoes_regras_sobreposicao.js), que a aplica de verdade
 * no backend, dentro da transação de gravação. Os cenários F-I/F-J exercitam
 * esta cópia (a do hook não é executável em memória).
 *
 * Devolve null quando a regra é válida, ou a mensagem de recusa:
 *   - formato/mês inválido;
 *   - fim anterior ao início (períodos INCLUSIVOS);
 *   - início anterior a nov/2026;
 *   - sobreposição com outra regra do mesmo colaborador;
 *   - edição de regra já iniciada alterando algo além do encerramento.
 */
export function validarRegra(
  existentes: RegraComissao[],
  candidata: RegraComissao,
  opcoes: {
    /** true = edição (a candidata já tem id no banco). */
    isUpdate?: boolean
    /** Estado ORIGINAL da regra no banco (edição). */
    original?: RegraComissao | null
    /** Competência corrente para o conceito de "regra já iniciada". */
    competenciaAtual?: string
  } = {},
): string | null {
  const { isUpdate = false, original = null } = opcoes
  const competenciaAgora = opcoes.competenciaAtual ?? competenciaAtualPadrao()

  if (!isCompetenciaValida(candidata.vigencia_inicio)) {
    return 'Vigência inicial inválida: use o formato AAAA-MM com mês entre 01 e 12.'
  }
  const fim = candidata.vigencia_fim || ''
  if (fim && !isCompetenciaValida(fim)) {
    return 'Vigência final inválida: use o formato AAAA-MM com mês entre 01 e 12.'
  }
  if (fim && fim < candidata.vigencia_inicio) {
    return `Vigência inválida: o encerramento (${fim}) não pode ser anterior ao início (${candidata.vigencia_inicio}).`
  }
  if (candidata.vigencia_inicio < COMPETENCIA_INICIO_CONTROLE) {
    return 'Competência anterior a nov/2026 está fora do novo controle de comissões por colaborador.'
  }
  if (!candidata.colaborador) {
    return 'Regra exige um colaborador vinculado.'
  }

  // Edição de regra JÁ INICIADA: histórico imutável — só o encerramento pode
  // ser definido ou movido para frente.
  if (isUpdate && original) {
    const iniciada = !!original.vigencia_inicio && original.vigencia_inicio <= competenciaAgora
    if (iniciada) {
      const fimOriginal = original.vigencia_fim || ''
      const fimAvancou = fim !== fimOriginal && (fimOriginal === '' || fim > fimOriginal)
      const mudouAlgo =
        candidata.vigencia_inicio !== original.vigencia_inicio ||
        candidata.colaborador !== original.colaborador ||
        candidata.modalidade !== original.modalidade ||
        Number(candidata.valor) !== Number(original.valor)
      if (mudouAlgo || !fimAvancou) {
        return `Esta regra já está em vigor desde ${original.vigencia_inicio} (histórico imutável). Somente o ENCERRAMENTO (vigencia_fim) pode ser definido ou movido para frente. Para novo valor a partir de uma competência, crie uma NOVA regra com nova vigência.`
      }
    }
  }

  // Sobreposição INCLUSIVA: [inicio, fim] onde fim vazio = aberta (9999-99).
  const fimCandidato = fim === '' ? '9999-99' : fim
  for (const outra of existentes) {
    if (outra.colaborador !== candidata.colaborador) continue
    if (isUpdate && outra.id === candidata.id) continue // a própria regra
    const fimOutra = outra.vigencia_fim || '9999-99'
    const sobrepoe = candidata.vigencia_inicio <= fimOutra && outra.vigencia_inicio <= fimCandidato
    if (sobrepoe) {
      return `Conflito de vigência: já existe regra sobreposta para este colaborador (${outra.vigencia_inicio} a ${outra.vigencia_fim || 'em vigor'}). Para alterar valores futuros, feche a vigência anterior (vigencia_fim) e crie uma NOVA regra.`
    }
  }
  return null
}

/**
 * Resolve, por COMPETÊNCIA, a regra vigente de cada colaborador: a de MAIOR
 * vigencia_inicio <= competência com vigencia_fim vazio ou >= competência.
 * Colaborador inativo continua AQUI (histórico é pelas vigências); o efeito
 * do inativo é aplicado no cálculo (competências futuras).
 * Sem regra vigente → o colaborador NÃO entra no resultado (não se presume valor).
 */
export function resolverRegrasVigentes(
  regras: RegraComissao[],
  competencia: string,
): Map<string, RegraComissao> {
  const vigentes = new Map<string, RegraComissao>()
  if (!isCompetenciaValida(competencia)) return vigentes
  for (const regra of regras) {
    // Competências anteriores a nov/2026 estão fora do novo controle.
    if (regra.vigencia_inicio < COMPETENCIA_INICIO_CONTROLE) continue
    if (regra.vigencia_inicio > competencia) continue
    const fim = regra.vigencia_fim || ''
    if (fim && fim < competencia) continue
    const atual = vigentes.get(regra.colaborador)
    if (!atual || regra.vigencia_inicio > atual.vigencia_inicio) {
      vigentes.set(regra.colaborador, regra)
    }
  }
  return vigentes
}

export interface ComissaoColaboradorCalculada {
  colaboradorId: string
  nome: string
  modalidade: ModalidadeComissao
  /** Valor unitário por caso elegível, VIGENTE NA COMPETÊNCIA. */
  valorUnitario: number
  casos: number
  /** casos × valorUnitario (o que o colaborador geraria). */
  valorPotencial: number
  /** true quando o valor integra o total CONFIRMADO da competência. */
  integraTotal: boolean
  /** integraTotal ? valorPotencial : 0. */
  valorConfirmado: number
  /** Motivo de não integrar o total (null quando integra). */
  motivoNaoIntegracao: string | null
}

export interface ResultadoComissoesColaboradores {
  competencia: string
  situacaoMeta: 'atingida' | 'nao atingida' | 'nao definida'
  /** Somente colaboradores com regra vigente na competência, ordenados por nome. */
  linhas: ComissaoColaboradorCalculada[]
  /** Soma das comissões confirmadas (fixas + condicionadas com meta atingida). */
  totalConfirmado: number
  /** Soma do potencial de TODAS as linhas (inclui o que não integra). */
  totalPotencial: number
}

/**
 * Calcula a comissão por colaborador para UMA competência.
 * `casosElegiveis` é a quantidade de casos únicos elegíveis já deduplicados
 * (saída de apurarComissoes — dedup global e competência por dcalculo ficam
 * lá). `situacaoMeta` vem de calcularMetaComissoes (meta não duplicada).
 */
export function calcularComissoesColaboradores(params: {
  casosElegiveis: number
  competencia: string
  colaboradores: ColaboradorComissionado[]
  regras: RegraComissao[]
  situacaoMeta: 'atingida' | 'nao atingida' | 'nao definida'
  /** Padrão = competência corrente; cenários passam valor fixo. */
  competenciaReferencia?: string
}): ResultadoComissoesColaboradores {
  const { casosElegiveis, competencia, colaboradores, regras, situacaoMeta } = params
  const competenciaRef = params.competenciaReferencia ?? competenciaAtualPadrao()
  const casos = Math.max(0, Math.floor(casosElegiveis || 0))
  const vigentes = resolverRegrasVigentes(regras, competencia)

  const porId = new Map(colaboradores.map((c) => [c.id, c]))
  const linhas: ComissaoColaboradorCalculada[] = []

  for (const [colaboradorId, regra] of vigentes) {
    const colab = porId.get(colaboradorId)
    if (!colab) continue // regra órfã — ignorada com segurança

    const valorUnitario = Number(regra.valor) || 0
    const valorPotencial = casos * valorUnitario

    let integraTotal: boolean
    let motivo: string | null = null
    if (regra.modalidade === 'condicionada_meta') {
      if (situacaoMeta === 'atingida') {
        integraTotal = true
      } else {
        integraTotal = false
        motivo =
          situacaoMeta === 'nao atingida'
            ? 'Condicionada à meta — meta não atingida'
            : 'Condicionada à meta — meta não definida'
      }
    } else {
      integraTotal = true
    }

    // Inativo: histórico (competência <= mês corrente) permanece pago;
    // competências futuras não pagam (saída definitiva é por vigencia_fim).
    if (!colab.ativo && competencia > competenciaRef) {
      integraTotal = false
      motivo = motivo ?? 'Colaborador inativo — participação encerrada para competências futuras'
    }

    linhas.push({
      colaboradorId,
      nome: colab.nome,
      modalidade: regra.modalidade,
      valorUnitario,
      casos,
      valorPotencial,
      integraTotal,
      valorConfirmado: integraTotal ? valorPotencial : 0,
      motivoNaoIntegracao: motivo,
    })
  }

  linhas.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))

  return {
    competencia,
    situacaoMeta,
    linhas,
    totalConfirmado: linhas.reduce((s, l) => s + l.valorConfirmado, 0),
    totalPotencial: linhas.reduce((s, l) => s + l.valorPotencial, 0),
  }
}
