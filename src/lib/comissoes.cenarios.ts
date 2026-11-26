/**
 * CENÁRIOS DE LÓGICA DA APURAÇÃO DE COMISSÕES — dados simulados em memória.
 * Função pura: não acessa o banco, não grava nada. Pode ser chamada por um
 * teste manual ou por um runner futuro: `runCenariosComissoes()` devolve o
 * resultado de cada cenário (ok / detalhe).
 * Nenhum dado real é usado; todos os nomes, fones e IDs são fictícios.
 */
import {
  apurarComissoes,
  ROTULO_CONTINUACAO_SEM_COMISSAO,
  type ContratoComissoesInput,
  type ProtocoloComissoesInput,
} from '@/lib/comissoes'

/** ok: true/false = resultado executado; null = verificação manual (não exercitável em lógica pura). */
export interface ResultadoCenario {
  cenario: string
  ok: boolean | null
  detalhe: string
}

const MESES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]
const TIPO = { id: 'tipo1', nome: 'Aux. Fictício' }
const RESP = 'resp-fict-1'

const contrato = (
  id: string,
  status = 'Ativo',
  fone = '(00) 90000-0001',
): ContratoComissoesInput => ({
  id,
  nome: `Contrato ${id}`,
  status,
  fone,
  beneficio: TIPO.nome,
})

const prot = (
  id: string,
  dcalculo: string,
  extra: Partial<ProtocoloComissoesInput> = {},
): ProtocoloComissoesInput => ({
  id,
  nome: `Cliente ${id}`,
  fone: '(00) 90000-0001',
  status: 'Prov. Inicial',
  dcalculo,
  tipo_acao: TIPO.id,
  contratos: ['c1'],
  responsavel: RESP,
  created: '2026-01-01 00:00:00.000Z',
  caso_origem: null,
  protocolo_anterior: null,
  caso_continuacoes: [],
  ...extra,
})

const ap = (
  protocolos: ProtocoloComissoesInput[],
  contratos: ContratoComissoesInput[],
  mes: number,
  ano: number,
) => apurarComissoes(protocolos, contratos, mes, ano, MESES, new Map([[TIPO.id, TIPO]]))

const check = (cenario: string, cond: boolean, detalhe: string): ResultadoCenario => ({
  cenario,
  ok: cond,
  detalhe,
})

export function runCenariosComissoes(): ResultadoCenario[] {
  const c1 = contrato('c1')
  const out: ResultadoCenario[] = []

  // A — caso único, uma liberação elegível → 1 comissão.
  const a = ap([prot('p1', '2026-11-10 12:00:00.000Z')], [c1], 11, 2026)
  out.push(
    check(
      'A caso único gera 1 comissão',
      a.quantidadeElegivel === 1 && a.totalBasico === 50,
      `elegíveis=${a.quantidadeElegivel}`,
    ),
  )

  // B — continuação em outro mês → sem nova comissão.
  const pB = [
    prot('p1', '2026-11-10 12:00:00.000Z'),
    prot('p2', '2026-12-05 12:00:00.000Z', { caso_origem: 'p1', caso_continuacoes: [] }),
  ]
  const bNov = ap(pB, [c1], 11, 2026)
  const bDez = ap(pB, [c1], 12, 2026)
  out.push(
    check(
      'B continuação em outro mês não gera nova',
      bNov.quantidadeElegivel === 1 &&
        bDez.quantidadeElegivel === 0 &&
        bDez.totalBasico === 0 &&
        bDez.casosDuplicados.length === 1 &&
        bDez.casosDuplicados[0].observacao.startsWith(ROTULO_CONTINUACAO_SEM_COMISSAO),
      `nov=${bNov.quantidadeElegivel} dez=${bDez.quantidadeElegivel} dup=${bDez.casosDuplicados.length}`,
    ),
  )

  // C — continuação em outro ano → sem nova comissão.
  const pC = [
    prot('p1', '2026-11-10 12:00:00.000Z'),
    prot('p2', '2027-02-03 12:00:00.000Z', { caso_origem: 'p1' }),
  ]
  const cAno = ap(pC, [c1], 2, 2027)
  out.push(
    check(
      'C continuação em outro ano não gera nova',
      cAno.quantidadeElegivel === 0 && cAno.casosDuplicados.length === 1,
      `elegíveis=${cAno.quantidadeElegivel}`,
    ),
  )

  // D — administrativo seguido de judicial (mesmo contrato) não duplica.
  const pD = [
    prot('p1', '2026-11-10 12:00:00.000Z', { status: 'Protocolado Administrativo' }),
    prot('p2', '2026-11-20 12:00:00.000Z', { status: 'Protocolado Judicial', caso_origem: 'p1' }),
  ]
  const d = ap(pD, [c1], 11, 2026)
  out.push(
    check(
      'D administrativo→judicial não duplica',
      d.quantidadeElegivel === 1 && d.totalBasico === 50,
      `elegíveis=${d.quantidadeElegivel}`,
    ),
  )

  // E — novo ajuizamento após extinção (via protocolo_anterior) não duplica.
  const pE = [
    prot('p1', '2026-10-01 12:00:00.000Z', { status: 'Protocolado Judicial' }),
    prot('p2', '2026-11-15 12:00:00.000Z', { protocolo_anterior: 'p1' }),
  ]
  const e = ap(pE, [c1], 11, 2026)
  out.push(
    check(
      'E novo ajuizamento após extinção não duplica',
      e.quantidadeElegivel === 0 && e.casosDuplicados.length === 1,
      `elegíveis=${e.quantidadeElegivel}`,
    ),
  )

  // F — contratos distintos do mesmo cliente são independentes.
  const c2 = contrato('c2')
  const pF = [
    prot('p1', '2026-11-10 12:00:00.000Z', { contratos: ['c1'] }),
    prot('p2', '2026-11-12 12:00:00.000Z', { contratos: ['c2'] }),
  ]
  const f = ap(pF, [c1, c2], 11, 2026)
  out.push(
    check(
      'F contratos distintos do mesmo cliente independentes',
      f.quantidadeElegivel === 2 && f.totalBasico === 100,
      `elegíveis=${f.quantidadeElegivel}`,
    ),
  )

  // G — R. Docs suspenso não conta; ao sair, disputa a primeira liberação.
  const pGsusp = [prot('p1', '2026-11-10 12:00:00.000Z', { status: 'R. Docs' })]
  const g1 = ap(pGsusp, [c1], 11, 2026)
  const pGsai = [
    prot('p1', '2026-11-10 12:00:00.000Z', { status: 'Prov. Inicial' }),
    prot('p2', '2026-12-02 12:00:00.000Z', { status: 'R. Docs', caso_origem: 'p1' }),
  ]
  const g2 = ap(pGsai, [c1], 11, 2026)
  out.push(
    check(
      'G R. Docs suspenso não conta como comissão',
      g1.quantidadeElegivel === 0 &&
        g1.casosSuspensos.length === 1 &&
        g1.totalBasico === 0 &&
        g2.quantidadeElegivel === 1,
      `suspenso-sozinho=${g1.quantidadeElegivel} suspensos=${g1.casosSuspensos.length} comR.Docs-com-p1=${g2.quantidadeElegivel}`,
    ),
  )
  const pGsem = [
    prot('p1', '2026-11-10 12:00:00.000Z', { status: 'R. Docs' }),
    prot('p2', '2026-12-02 12:00:00.000Z', { status: 'Prov. Inicial', caso_origem: 'p1' }),
  ]
  const g3 = ap(pGsem, [c1], 12, 2026)
  out.push(
    check(
      'G ao sair de R. Docs disputa a primeira liberação',
      g3.quantidadeElegivel === 1,
      `dez=${g3.quantidadeElegivel}`,
    ),
  )

  // H — formulário herda dcontrato: coberto por inspeção de código (ProtocoloDialogs.tsx);
  // não é exercitável por lógica pura.
  out.push({
    cenario: 'H formulário herda dcontrato',
    ok: null,
    detalhe: 'verificação manual — efeito de prefill em ProtocoloDialogs.tsx (linha ~230)',
  })

  // I — continuação sem dcalculo não entra na apuração nem gera comissão.
  const pI = [prot('p1', '2026-11-10 12:00:00.000Z'), prot('p2', '', { caso_origem: 'p1' })]
  const i = ap(pI, [c1], 11, 2026)
  out.push(
    check(
      'I dcalculo vazio na continuação não gera comissão',
      i.quantidadeElegivel === 1,
      `elegíveis=${i.quantidadeElegivel}`,
    ),
  )

  // J — indicadores financeiros: este build não altera apurarComissoes fora da dedup/rótulo;
  // a projeção (ProtocoloDashboard) não é tocada. Verificação por revisão de diff.
  out.push({
    cenario: 'J indicadores financeiros inalterados',
    ok: null,
    detalhe: 'verificação manual — este build não altera projeção/ticket/distribuição',
  })

  return out
}
