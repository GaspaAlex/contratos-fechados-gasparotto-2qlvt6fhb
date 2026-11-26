/**
 * CENÁRIOS F-A..F-P — COLABORADORES COMISSIONADOS DINÂMICOS (Build F1)
 * ====================================================================
 * Testes em MEMÓRIA (sem tocar no banco compartilhado), mesmo padrão de
 * src/lib/comissoes.cenarios.ts. Executados no prebuild por
 * scripts/run-cenarios.mjs.
 */

import {
  COMPETENCIA_INICIO_CONTROLE,
  competenciaAnterior,
  competenciaSeguinte,
  calcularComissoesColaboradores,
  resolverRegrasVigentes,
  validarRegra,
  type ColaboradorComissionado,
  type RegraComissao,
} from './comissoesColaboradores'
import type { ResultadoCenario } from './comissoes.cenarios'

type SituacaoMeta = 'atingida' | 'nao atingida' | 'nao definida'

const BIA = 'col-bia'
const NAYARA = 'col-nayara'

function colab(id: string, nome: string, ativo = true, ordem = 0): ColaboradorComissionado {
  return { id, nome, ativo, ordem }
}

function regra(
  id: string,
  colaborador: string,
  valor: number,
  inicio: string,
  opts: { modalidade?: 'fixa' | 'condicionada_meta'; fim?: string | null } = {},
): RegraComissao {
  return {
    id,
    colaborador,
    modalidade: opts.modalidade ?? 'fixa',
    valor,
    vigencia_inicio: inicio,
    vigencia_fim: opts.fim ?? null,
  }
}

/** Cenário padrão: 3 casos elegíveis, meta atingida. */
function calcular(
  regras: RegraComissao[],
  opcoes: {
    casos?: number
    situacaoMeta?: SituacaoMeta
    competencia?: string
    colaboradores?: ColaboradorComissionado[]
    competenciaReferencia?: string
  } = {},
) {
  return calcularComissoesColaboradores({
    casosElegiveis: opcoes.casos ?? 3,
    competencia: opcoes.competencia ?? '2026-11',
    colaboradores: opcoes.colaboradores ?? [colab(BIA, 'Bia'), colab(NAYARA, 'Nayara')],
    regras,
    situacaoMeta: opcoes.situacaoMeta ?? 'atingida',
    competenciaReferencia: opcoes.competenciaReferencia,
  })
}

function resumoLinha(r: ReturnType<typeof calcular>, nome: string) {
  const linha = r.linhas.find((l) => l.nome === nome)
  if (!linha) return 'sem linha'
  return `${linha.valorUnitario} (${linha.valorConfirmado} confirmado${
    linha.integraTotal ? '' : ` — ${linha.motivoNaoIntegracao}`
  })`
}

export function runCenariosColaboradores(): ResultadoCenario[] {
  const cenarios: ResultadoCenario[] = []

  const ok = (id: string, titulo: string, condicao: boolean | string, detalhe?: string): void => {
    cenarios.push({
      cenario: `${id} ${titulo}`,
      ok: condicao === true,
      detalhe: condicao === true ? (detalhe ?? 'ok') : String(condicao),
    })
  }

  // F-A — Novo colaborador com vigência futura: não paga em competências anteriores.
  {
    const r1 = calcular([regra('r1', BIA, 20, '2027-01')], { competencia: '2026-12' })
    const r2 = calcular([regra('r1', BIA, 20, '2027-01')], { competencia: '2027-01' })
    ok(
      'F-A',
      'Novo colaborador com vigência futura não paga em competências anteriores',
      r1.linhas.length === 0 && r2.linhas.length === 1 && r2.linhas[0].valorConfirmado === 60,
      `2026-12: ${r1.linhas.length} linha(s); 2027-01: ${r2.linhas[0]?.valorUnitario}/caso`,
    )
  }

  // F-B — Alteração R$20 → R$25 preservando competências anteriores.
  {
    const regras = [
      regra('r1', BIA, 20, '2026-11', { fim: '2026-12' }),
      regra('r2', BIA, 25, '2027-01'),
    ]
    const nov = calcular(regras, { competencia: '2026-11' })
    const dez = calcular(regras, { competencia: '2026-12' })
    const jan = calcular(regras, { competencia: '2027-01' })
    ok(
      'F-B',
      'R$20→R$25: nov/dez continuam R$20 e jan usa R$25 (sem recálculo retroativo)',
      nov.linhas[0]?.valorUnitario === 20 &&
        dez.linhas[0]?.valorUnitario === 20 &&
        jan.linhas[0]?.valorUnitario === 25,
      `nov: ${resumoLinha(nov, 'Bia')}; dez: ${resumoLinha(dez, 'Bia')}; jan: ${resumoLinha(jan, 'Bia')}`,
    )
  }

  // F-C — Desativação (ativo=false hoje) sem apagar comissões históricas.
  {
    const regras = [regra('r1', BIA, 20, '2026-11')]
    const r = calcular(regras, {
      competencia: '2026-11',
      colaboradores: [colab(BIA, 'Bia', false)],
      competenciaReferencia: '2026-11',
    })
    ok(
      'F-C',
      'Desativação não apaga comissões históricas (regra vigente permanece paga)',
      r.linhas.length === 1 && r.linhas[0].integraTotal && r.linhas[0].valorConfirmado === 60,
      `nov/2026 com ativo=false hoje: ${resumoLinha(r, 'Bia')}`,
    )
  }

  // F-D — Reativação em competência posterior: volta a pagar.
  {
    const regras = [
      regra('r1', BIA, 20, '2026-11', { fim: '2026-12' }),
      regra('r2', BIA, 20, '2027-02'),
    ]
    const r = calcular(regras, {
      competencia: '2027-02',
      colaboradores: [colab(BIA, 'Bia', true)],
      competenciaReferencia: '2027-02',
    })
    ok(
      'F-D',
      'Reativação em competência posterior volta a pagar pela nova regra',
      r.linhas.length === 1 && r.linhas[0].valorConfirmado === 60,
      `fev/2027: ${resumoLinha(r, 'Bia')}`,
    )
  }

  // F-E — Modalidade fixa integra sempre o total.
  {
    const r = calcular([regra('r1', BIA, 20, '2026-11', { modalidade: 'fixa' })], {
      situacaoMeta: 'nao atingida',
    })
    ok(
      'F-E',
      'Modalidade fixa integra o total mesmo com meta não atingida',
      r.linhas[0]?.integraTotal === true && r.totalConfirmado === 60 && r.totalPotencial === 60,
      `meta não atingida, total confirmado: ${r.totalConfirmado}`,
    )
  }

  // F-F — Condicionada à meta atingida: integra.
  {
    const r = calcular([regra('r1', BIA, 20, '2026-11', { modalidade: 'condicionada_meta' })], {
      situacaoMeta: 'atingida',
    })
    ok(
      'F-F',
      'Condicionada à meta ATINGIDA integra o total confirmado',
      r.linhas[0]?.integraTotal === true && r.totalConfirmado === 60,
      `total confirmado: ${r.totalConfirmado}`,
    )
  }

  // F-G — Condicionada à meta não atingida: fica só potencial.
  {
    const r = calcular([regra('r1', BIA, 20, '2026-11', { modalidade: 'condicionada_meta' })], {
      situacaoMeta: 'nao atingida',
    })
    ok(
      'F-G',
      'Condicionada à meta NÃO atingida não integra o confirmado (fica potencial)',
      r.linhas[0]?.integraTotal === false && r.totalConfirmado === 0 && r.totalPotencial === 60,
      `confirmado: ${r.totalConfirmado}; potencial: ${r.totalPotencial}`,
    )
  }

  // F-H — Meta não definida: condicionada também não integra.
  {
    const r = calcular([regra('r1', BIA, 20, '2026-11', { modalidade: 'condicionada_meta' })], {
      situacaoMeta: 'nao definida',
    })
    ok(
      'F-H',
      'Condicionada com meta NÃO DEFINIDA não integra o confirmado',
      r.linhas[0]?.integraTotal === false && r.totalConfirmado === 0 && r.totalPotencial === 60,
      `confirmado: ${r.totalConfirmado}; potencial: ${r.totalPotencial}`,
    )
  }

  // F-I — Regras consecutivas SEM sobreposição: ambas resolvem.
  {
    const regras = [
      regra('r1', BIA, 20, '2026-11', { fim: '2026-12' }),
      regra('r2', BIA, 25, '2027-01', { fim: '2027-03' }),
      regra('r3', BIA, 30, '2027-04'),
    ]
    const nov = calcular(regras, { competencia: '2026-11' })
    const mar = calcular(regras, { competencia: '2027-03' })
    const abr = calcular(regras, { competencia: '2027-04' })
    ok(
      'F-I',
      'Regras consecutivas sem sobreposição resolvem cada competência',
      nov.linhas[0]?.valorUnitario === 20 &&
        mar.linhas[0]?.valorUnitario === 25 &&
        abr.linhas[0]?.valorUnitario === 30,
      `nov: ${nov.linhas[0]?.valorUnitario}; mar: ${mar.linhas[0]?.valorUnitario}; abr: ${abr.linhas[0]?.valorUnitario}`,
    )
  }

  // F-J — Tentativa de regras SOBREPOSTAS é recusada (validação, espelho do pb_hook).
  {
    // Regra anterior já FECHADA (2026-11 a 2026-12) — caso do fluxo real do
    // gestor: nova regra só entra depois de encerrar a anterior. Com vigência
    // ABERTA, qualquer regra futura sobrepõe (recusada — é o esperado).
    const existentes = [regra('r1', BIA, 20, '2026-11', { fim: '2026-12' })]
    const sobreAberta = validarRegra(
      [regra('r0', BIA, 20, '2026-11')],
      regra('r5', BIA, 25, '2027-01'),
    )
    const tentativa1 = validarRegra(existentes, regra('r2', BIA, 25, '2026-12'))
    const tentativa2 = validarRegra(existentes, regra('r3', BIA, 25, '2026-10', { fim: '2026-12' }))
    const ok1 = validarRegra(existentes, regra('r4', BIA, 25, '2027-01'))
    ok(
      'F-J',
      'Regras sobrepostas do mesmo colaborador são RECUSADAS (sem sobreposição é aceita)',
      typeof tentativa1 === 'string' &&
        typeof tentativa2 === 'string' &&
        ok1 === null &&
        typeof sobreAberta === 'string',
      `início dentro: ${tentativa1 ? 'recusada' : 'ACEITA!'}; período englobando: ${
        tentativa2 ? 'recusada' : 'ACEITA!'
      }; sequencial: ${ok1 === null ? 'aceita' : 'recusada!'}; futura sobre ABERTA: ${
        sobreAberta ? 'recusada' : 'ACEITA!'
      }`,
    )
  }

  // F-K — Vigência SEM data final: permanece em vigor indefinidamente.
  {
    const regras = [regra('r1', BIA, 20, '2026-11')]
    const r2027 = calcular(regras, { competencia: '2027-06' })
    const r2028 = calcular(regras, { competencia: '2028-01' })
    ok(
      'F-K',
      'Vigência sem data final permanece em vigor em qualquer competência futura',
      r2027.linhas[0]?.valorUnitario === 20 && r2028.linhas[0]?.valorUnitario === 20,
      `jun/2027: ${resumoLinha(r2027, 'Bia')}; jan/2028: ${resumoLinha(r2028, 'Bia')}`,
    )
  }

  // F-L — Competência ANTERIOR ao início da participação: não paga.
  {
    const regras = [regra('r1', BIA, 20, '2027-01')]
    const r = calcular(regras, { competencia: '2026-12' })
    ok(
      'F-L',
      'Competência anterior ao início da participação não paga',
      r.linhas.length === 0 && r.totalConfirmado === 0,
      `dez/2026 com regra iniciando 2027-01: ${r.linhas.length} linha(s)`,
    )
  }

  // F-M — Independência do campo Responsável: a entrada é casosElegiveis,
  //       nunca um responsável de protocolo.
  {
    // Duas "responsáveis" diferentes geram o mesmo resultado — o cálculo não
    // recebe responsável algum; quem deduplica é apurarComissoes.
    const r = calcular([regra('r1', BIA, 20, '2026-11')], { casos: 4 })
    ok(
      'F-M',
      'Distribuição independente do campo Responsável (só casos elegíveis × valor)',
      r.linhas.length === 1 && r.linhas[0].casos === 4 && r.linhas[0].valorPotencial === 80,
      `4 casos → ${r.linhas[0]?.valorPotencial} (sem uso de responsável)`,
    )
  }

  // F-N — Colaborador atualmente INATIVO com regra vigente em período histórico.
  {
    const regras = [regra('r1', BIA, 20, '2026-11')]
    const rHist = calcular(regras, {
      competencia: '2026-12',
      colaboradores: [colab(BIA, 'Bia', false)],
      competenciaReferencia: '2027-03',
    })
    ok(
      'F-N',
      'Inativo HOJE mantém comissão válida em competência histórica com regra vigente',
      rHist.linhas[0]?.integraTotal === true && rHist.linhas[0].valorConfirmado === 60,
      `dez/2026 (hoje mar/2027, inativo): ${resumoLinha(rHist, 'Bia')}`,
    )
  }

  // F-O — Competência anterior a nov/2026: fora do novo controle (recusada).
  {
    const r = calcular([regra('r1', BIA, 20, '2026-10')], { competencia: '2026-10' })
    const validacao = validarRegra([], regra('r1', BIA, 20, '2026-10'))
    ok(
      'F-O',
      `Competência anterior a ${COMPETENCIA_INICIO_CONTROLE} está fora do novo controle`,
      r.linhas.length === 0 && typeof validacao === 'string',
      `out/2026: ${r.linhas.length} linha(s); validação: ${validacao ?? 'aceita!'}`,
    )
  }

  // F-P — Preservação da comissão ÚNICA por caso: a entrada é a quantidade de
  //       casos JÁ deduplicados (apurarComissoes); regras não multiplicam.
  {
    const regras = [regra('r1', BIA, 20, '2026-11'), regra('r2', NAYARA, 20, '2026-11')]
    const r = calcular(regras, { casos: 2 })
    const somaConfirmada = r.linhas.reduce((s, l) => s + l.valorConfirmado, 0)
    ok(
      'F-P',
      'Comissão única por caso preservada (2 casos × 2 colaboradores, sem duplicar caso)',
      r.linhas.every((l) => l.casos === 2) && somaConfirmada === 80,
      `2 casos → Bia ${r.linhas[0]?.valorPotencial} + Nayara ${r.linhas[1]?.valorPotencial} = ${somaConfirmada}`,
    )
  }

  // Complementos de resolverRegrasVigentes e helpers (baratos, cobrem bordas).
  {
    const regras = [
      regra('r1', BIA, 20, '2026-11', { fim: '2026-12' }),
      regra('r2', BIA, 25, '2027-01'),
    ]
    const jan = resolverRegrasVigentes(regras, '2027-01')
    const dez = resolverRegrasVigentes(regras, '2026-12')
    ok(
      'F-R1',
      'resolverRegrasVigentes: empate resolvido pela regra de MAIOR início vigente',
      jan.get(BIA)?.id === 'r2' && dez.get(BIA)?.id === 'r1',
      `jan/2027 → ${jan.get(BIA)?.id}; dez/2026 → ${dez.get(BIA)?.id}`,
    )
    ok(
      'F-R2',
      'Helpers de competência: anterior/seguinte corretos na virada do ano',
      competenciaAnterior('2027-01') === '2026-12' &&
        competenciaSeguinte('2026-12') === '2027-01' &&
        competenciaAnterior('2026-11') === '2026-10',
      '2027-01←2026-12→2027-01 ok',
    )
  }

  return cenarios
}
