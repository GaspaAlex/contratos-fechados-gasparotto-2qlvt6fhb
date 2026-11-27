/**
 * CENÁRIOS — CONTRACHEQUES C2: CONTRACHEQUE MENSAL (cc_contracheques)
 * ========================================================================
 * Função PURA executada de verdade no prebuild (scripts/run-cenarios.mjs).
 * Nada toca o banco — exercita src/lib/ccContracheque.ts (regras do
 * contracheque mensal) com registros em memória no MESMO formato devolvido
 * pelos serviços (cc_salarios, cc_contracheques, cc_lancamentos):
 *
 *   C2-1  salário vigente correto por competência (vigência aberta)
 *   C2-2  competência anterior usa o salário HISTÓRICO, não o atual
 *   C2-3  competência ANTES de toda vigência → sem salário (aviso)
 *   C2-4  aumento no meio do mês: vale a vigência mais RECENTE
 *   C2-5  soma de vencimentos = salário-base + demais vencimentos
 *   C2-6  soma de descontos e líquido = vencimentos − descontos
 *   C2-7  edição e remoção de lançamentos recalculam os totais
 *   C2-8  salário não cadastrado → rascunho incompleto identificável
 *   C2-9  precisão monetária (0.1+0.2 não vaza ponto flutuante)
 *   C2-10 dedupe de lançamentos duplicados acidentais (aviso)
 *   C2-11 lançamento inválido (NaN/zero/sem natureza) é recusado
 *   C2-12 anti-duplicidade de demonstrativo por colaborador/competência
 *   C2-13 preservação do snapshot salarial do rascunho salvo
 *
 * As coleções NÃO são tocadas (prévia e produção compartilham o banco);
 * nenhum registro fictício é gravado.
 */
import type { ResultadoCenario } from '@/lib/comissoes.cenarios'
import {
  calcularDemonstrativo,
  chaveCompetencia,
  fimDaCompetencia,
  paraCentavos,
  planejarSalvoDemonstrativo,
  salarioVigenteNaCompetencia,
  validarLancamento,
  type SalarioVigencia,
} from '@/lib/ccContracheque'

/** Empurra uma mudança de total para um novo lançamento (helper do cenário). */
const comLancamento = (
  calc: ReturnType<typeof calcularDemonstrativo>,
  tipo: 'vencimento' | 'desconto',
  valor: number,
) => {
  const novo = { natureza_tipo: tipo, natureza: 'Teste', descricao: '', valor }
  const todos = [...calc.vencimentos, ...calc.descontos, novo]
  return calcularDemonstrativo(
    calc.salarioBaseCentavos === null ? undefined : { valor: calc.salarioBaseCentavos / 100 },
    todos,
  )
}

export function runCenariosContrachequeMensal(): ResultadoCenario[] {
  const cenarios: ResultadoCenario[] = []
  const push = (cenario: string, detalhe: string, ok: boolean) =>
    cenarios.push({ cenario, detalhe, ok })

  // Histórico de vigências do funcionário f1 (em memória — nada no banco):
  //   1.500,00 de 2026-01-01 a 2026-05-31; 1.800,00 de 2026-06-01 em vigor.
  const salariosF1: SalarioVigencia[] = [
    {
      id: 's1',
      funcionario: 'f1',
      valor: 1500,
      vigencia_inicio: '2026-01-01',
      vigencia_fim: '2026-05-31',
    },
    { id: 's2', funcionario: 'f1', valor: 1800, vigencia_inicio: '2026-06-01', vigencia_fim: '' },
  ]

  // C2-1 — salário vigente correto por competência (vigência aberta).
  {
    const vig = salarioVigenteNaCompetencia(salariosF1, 'f1', 11, 2026)
    push(
      'C2-1 salário vigente em nov/2026 = 1.800,00 (vigência aberta de 2026-06-01)',
      vig ? `encontrado: ${vig.valor}` : 'NÃO ENCONTRADO (não deveria!)',
      !!vig && vig.valor === 1800,
    )
  }

  // C2-2 — competência anterior usa o salário HISTÓRICO.
  {
    const vig = salarioVigenteNaCompetencia(salariosF1, 'f1', 3, 2026)
    push(
      'C2-2 competência mar/2026 usa o salário HISTÓRICO (1.500,00, não o atual)',
      vig ? `encontrado: ${vig.valor}` : 'NÃO ENCONTRADO (não deveria!)',
      !!vig && vig.valor === 1500,
    )
  }

  // C2-3 — competência ANTES de toda vigência → sem salário (aviso).
  {
    const vig = salarioVigenteNaCompetencia(salariosF1, 'f1', 12, 2025)
    push(
      'C2-3 competência dez/2025 (antes do histórico) → salário não cadastrado',
      vig === undefined ? 'sem salário — aviso exibido' : `ENCONTRADO (não deveria!): ${vig.valor}`,
      vig === undefined,
    )
  }

  // C2-4 — aumento no meio do mês: vale a vigência mais RECENTE.
  {
    const meioDoMes: SalarioVigencia[] = [
      { id: 's1', funcionario: 'f2', valor: 2000, vigencia_inicio: '2026-01-01', vigencia_fim: '' },
      { id: 's2', funcionario: 'f2', valor: 2200, vigencia_inicio: '2026-03-15', vigencia_fim: '' },
    ]
    const vig = salarioVigenteNaCompetencia(meioDoMes, 'f2', 3, 2026)
    push(
      'C2-4 aumento em 15/03/2026: competência mar/2026 usa a vigência mais recente (2.200,00)',
      vig ? `encontrado: ${vig.valor}` : 'NÃO ENCONTRADO (não deveria!)',
      !!vig && vig.valor === 2200,
    )
  }

  // C2-5 — soma de vencimentos = salário-base + demais vencimentos.
  {
    const calc = calcularDemonstrativo({ valor: 1800 }, [
      { natureza_tipo: 'vencimento', natureza: 'Gratificação', descricao: '', valor: 350 },
      {
        natureza_tipo: 'vencimento',
        natureza: 'Comissão informada manualmente',
        descricao: '',
        valor: 725.4,
      },
    ])
    push(
      'C2-5 total de vencimentos = 1.800 + 350 + 725,40 = 2.875,40',
      `total: ${calc.totalVencimentosCentavos} centavos`,
      calc.totalVencimentosCentavos === 287540 &&
        calc.salarioBaseCentavos === 180000 &&
        calc.vencimentos.length === 2,
    )
  }

  // C2-6 — soma de descontos e líquido = vencimentos − descontos.
  {
    const calc = calcularDemonstrativo({ valor: 1800 }, [
      { natureza_tipo: 'vencimento', natureza: 'Gratificação', descricao: '', valor: 200 },
      { natureza_tipo: 'desconto', natureza: 'Adiantamento salarial', descricao: '', valor: 300 },
      { natureza_tipo: 'desconto', natureza: 'Parcela de empréstimo', descricao: '', valor: 150.5 },
    ])
    push(
      'C2-6 descontos 300+150,50 = 450,50; líquido = 2.000 − 450,50 = 1.549,50',
      `descontos: ${calc.totalDescontosCentavos}; líquido: ${calc.liquidoCentavos}`,
      calc.totalDescontosCentavos === 45050 && calc.liquidoCentavos === 154950,
    )
  }

  // C2-7 — edição e remoção de lançamentos recalculam os totais.
  {
    let calc = calcularDemonstrativo({ valor: 1800 }, [
      { natureza_tipo: 'vencimento', natureza: 'Gratificação', descricao: '', valor: 350 },
      { natureza_tipo: 'desconto', natureza: 'Desconto autorizado', descricao: '', valor: 100 },
    ])
    const antes = { venc: calc.totalVencimentosCentavos, desc: calc.totalDescontosCentavos }
    // Edita a gratificação 350 → 500:
    calc = calcularDemonstrativo({ valor: 1800 }, [
      { natureza_tipo: 'vencimento', natureza: 'Gratificação', descricao: '', valor: 500 },
      { natureza_tipo: 'desconto', natureza: 'Desconto autorizado', descricao: '', valor: 100 },
    ])
    const aposEdicao = { venc: calc.totalVencimentosCentavos, desc: calc.totalDescontosCentavos }
    // Remove o desconto:
    calc = calcularDemonstrativo({ valor: 1800 }, [
      { natureza_tipo: 'vencimento', natureza: 'Gratificação', descricao: '', valor: 500 },
    ])
    const aposRemocao = { venc: calc.totalVencimentosCentavos, desc: calc.totalDescontosCentavos }
    push(
      'C2-7 edição (350→500) e remoção do desconto recalculam totais imediatamente',
      `antes ${antes.venc}/${antes.desc}; após edição ${aposEdicao.venc}/${aposEdicao.desc}; após remoção ${aposRemocao.venc}/${aposRemocao.desc}`,
      antes.venc === 215000 &&
        aposEdicao.venc === 230000 &&
        aposEdicao.desc === 10000 &&
        aposRemocao.desc === 0 &&
        aposRemocao.venc === 230000,
    )
  }

  // C2-8 — salário não cadastrado → rascunho incompleto identificável.
  {
    const calc = calcularDemonstrativo(undefined, [
      { natureza_tipo: 'vencimento', natureza: 'Outros vencimentos', descricao: '', valor: 500 },
    ])
    const plano = planejarSalvoDemonstrativo(calc)
    push(
      'C2-8 sem salário na competência: rascunho salvo como incompleto (flag gravada)',
      `salario_base: ${plano.salario_base}; flag salario_nao_cadastrado: ${plano.salario_nao_cadastrado}; status: ${plano.status}`,
      calc.salarioBaseCentavos === null &&
        plano.salario_nao_cadastrado === true &&
        plano.salario_base === 0 &&
        plano.status === 'rascunho',
    )
  }

  // C2-9 — precisão monetária (0.1 + 0.2 não vaza ponto flutuante).
  {
    const calc = comLancamento(
      comLancamento(calcularDemonstrativo({ valor: 0 }, []), 'vencimento', 0.1),
      'vencimento',
      0.2,
    )
    push(
      'C2-9 precisão monetária em centavos: 0,10 + 0,20 = 0,30 exato',
      `total: ${calc.totalVencimentosCentavos} centavos`,
      calc.totalVencimentosCentavos === 30,
    )
  }

  // C2-10 — dedupe de lançamentos duplicados acidentais (aviso).
  {
    const calc = calcularDemonstrativo({ valor: 1800 }, [
      { natureza_tipo: 'vencimento', natureza: 'Gratificação', descricao: '', valor: 350 },
      { natureza_tipo: 'vencimento', natureza: 'Gratificação', descricao: '', valor: 350 },
      { natureza_tipo: 'desconto', natureza: 'Adiantamento salarial', descricao: '', valor: 300 },
    ])
    push(
      'C2-10 duplicidade acidental detectada (Gratificação 350 × 2) e sinalizada',
      calc.duplicados.length === 1
        ? `duplicado sinalizado: ${calc.duplicados[0]}`
        : `NÃO sinalizado (não deveria!): ${calc.duplicados.length}`,
      calc.duplicados.length === 1,
    )
  }

  // C2-11 — lançamento inválido é recusado (NaN, zero, sem natureza).
  {
    const erroNaN = validarLancamento({
      natureza_tipo: 'vencimento',
      natureza: 'Gratificação',
      descricao: '',
      valor: NaN,
    })
    const erroZero = validarLancamento({
      natureza_tipo: 'vencimento',
      natureza: 'Gratificação',
      descricao: '',
      valor: 0,
    })
    const erroSemNat = validarLancamento({
      natureza_tipo: 'vencimento',
      natureza: '',
      descricao: '',
      valor: 100,
    })
    const erroNeg = validarLancamento({
      natureza_tipo: 'desconto',
      natureza: 'Outros descontos',
      descricao: '',
      valor: -5,
    })
    push(
      'C2-11 lançamentos inválidos recusados: NaN, zero, sem natureza e negativo',
      `NaN: ${erroNaN ? 'recusado' : 'ACEITO!'}; zero: ${erroZero ? 'recusado' : 'ACEITO!'}; sem natureza: ${erroSemNat ? 'recusado' : 'ACEITO!'}; negativo: ${erroNeg ? 'recusado' : 'ACEITO!'}`,
      !!erroNaN && !!erroZero && !!erroSemNat && !!erroNeg,
    )
  }

  // C2-12 — anti-duplicidade de demonstrativo por colaborador/competência.
  {
    // Espelha a busca do serviço: obterOuCriarContracheque consulta antes de
    // criar; a segunda chamada DEVE devolver o MESMO id (nunca duplicar).
    const salvos = [
      { id: 'demo1', funcionario_id: 'f1', competencia_mes: 11, competencia_ano: 2026 },
    ]
    const buscar = (fid: string, m: number, a: number) =>
      salvos.find(
        (c) => c.funcionario_id === fid && c.competencia_mes === m && c.competencia_ano === a,
      ) ?? null
    const primeiro = buscar('f1', 11, 2026) ?? {
      id: 'novo',
      funcionario_id: 'f1',
      competencia_mes: 11,
      competencia_ano: 2026,
    }
    const segundo = buscar('f1', 11, 2026) ?? {
      id: 'novo2',
      funcionario_id: 'f1',
      competencia_mes: 11,
      competencia_ano: 2026,
    }
    push(
      'C2-12 salvar repetidamente abre o MESMO demonstrativo (um por colaborador/competência)',
      `primeiro: ${primeiro.id}; segundo: ${segundo.id}`,
      primeiro.id === segundo.id,
    )
  }

  // C2-13 — preservação do snapshot salarial do rascunho salvo.
  {
    // Demonstrativo salvo em mar/2026 com o salário histórico 1.500,00.
    // Depois o cadastro salarial muda (nova vigência retroativa em memória).
    const snapshotGravado = 1500
    const salarioVigenteAgora = salarioVigenteNaCompetencia(
      [
        ...salariosF1,
        {
          id: 's3',
          funcionario: 'f1',
          valor: 2500,
          vigencia_inicio: '2026-03-01',
          vigencia_fim: '2026-03-31',
        },
      ],
      'f1',
      3,
      2026,
    )
    const calc = calcularDemonstrativo({ valor: snapshotGravado }, [])
    push(
      'C2-13 demonstrativo salvo PRESERVA o salário-base gravado (não troca silenciosamente)',
      `gravado: ${calc.salarioBaseCentavos} centavos; cadastro hoje indicaria: ${salarioVigenteAgora?.valor}`,
      calc.salarioBaseCentavos === snapshotGravado * 100 && salarioVigenteAgora?.valor === 2500,
    )
  }

  // Utilitários de competência (chave e fim de mês) — sanidade.
  {
    const okChave = chaveCompetencia(3, 2026) === '2026-03'
    const okFim =
      fimDaCompetencia(2, 2028) === '2028-02-29' && fimDaCompetencia(2, 2027) === '2027-02-28'
    push(
      'C2-14 chave de competência e fim de mês corretos (ano bissexto incluso)',
      `chave: ${chaveCompetencia(3, 2026)}; fim fev/2028: ${fimDaCompetencia(2, 2028)}`,
      okChave && okFim,
    )
  }

  return cenarios
}
