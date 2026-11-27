/**
 * CENÁRIOS — PARTICIPANTES DO MÓDULO CONTRACHEQUES (Build C1-A)
 * ========================================================================
 * Executados DE VERDADE pelo runner (scripts/run-cenarios.mjs, suíte
 * CONTRACHEQUES_P), sobre as funções puras de src/lib/ccParticipantes.ts —
 * sem banco, sem rede, determinísticos.
 *
 * Cobre os requisitos do usuário:
 * 1. A listagem mostra SOMENTE os participantes com vínculo ativo (os demais
 *    funcionários do Cartão de Ponto não aparecem).
 * 2. "Adicionar" é idempotente: reativa vínculo inativo, nunca duplica.
 * 3. RETIRAR participante = desativação — nunca sugere delete; histórico
 *    salarial preservado por construção (nada aqui apaga salário).
 */
import {
  planejarAdicaoParticipante,
  planejarRetiradaParticipante,
  resolverParticipantesAtivos,
  type FuncionarioMini,
  type ParticipanteVinculo,
} from '@/lib/ccParticipantes'

export interface ResultadoCenario {
  suite: string
  cenario: string
  ok: boolean | null
  detalhe: string
}

const AUTORIZADOS: FuncionarioMini[] = [
  { id: 'g58j7rgfn66kw18', nome: 'Nataly Tayna Figueiredo da Silva', ativo: true },
  { id: '61n9us4w9eu8j11', nome: 'Nayara Vitória de Morais', ativo: true },
  { id: 'ds27l78xotgofm1', nome: 'Kaique Gotardo de Carvalho dos Santos', ativo: true },
  { id: '8fg62tcjfnds7kv', nome: 'Beatriz Yumi Aizawa Yamashita', ativo: true },
]

// Outros funcionários do Cartão de Ponto (existem no banco real) — têm que
// ficar FORA da listagem da aba e INTACTOS no Cartão de Ponto.
const OUTROS: FuncionarioMini[] = [
  { id: 'out1', nome: 'Outro Funcionário A', ativo: true },
  { id: 'out2', nome: 'Outro Funcionário B', ativo: true },
]

const baseVinculos = (): ParticipanteVinculo[] =>
  AUTORIZADOS.map((f, i) => ({ id: 'v' + i, funcionario: f.id, ativo: true }))

const res = (cenario: string, ok: boolean, detalhe: string): ResultadoCenario => ({
  suite: 'CONTRACHEQUES_P',
  cenario,
  ok,
  detalhe,
})

export function runCenariosParticipantes(): ResultadoCenario[] {
  const resultados: ResultadoCenario[] = []
  const check = (cenario: string, cond: boolean, detalhe: string) =>
    resultados.push(res(cenario, cond, detalhe))

  // 1) Listagem mostra somente os 4 autorizados, ordenados por nome
  const listagem = resolverParticipantesAtivos(baseVinculos(), [...AUTORIZADOS, ...OUTROS])
  check(
    'Listagem exclusiva dos 4 participantes',
    listagem.length === 4 &&
      listagem.every((p) => AUTORIZADOS.some((f) => f.id === p.funcionarioId)) &&
      listagem.every((p) => !OUTROS.some((o) => o.id === p.funcionarioId)),
    'listagem=' + listagem.map((p) => p.nome).join(' | '),
  )

  // 2) Ordenação alfabética pt-BR
  check(
    'Ordenação por nome',
    listagem[0].nome.startsWith('Beatriz') &&
      listagem[2].nome.startsWith('Nataly') &&
      listagem[3].nome.startsWith('Nayara'),
    'primeiro=' + listagem[0]?.nome + ' · último=' + listagem[3]?.nome,
  )

  // 3) Vínculo inativo não aparece, mas não é apagado
  const comInativo: ParticipanteVinculo[] = [
    ...baseVinculos(),
    { id: 'vx', funcionario: 'out1', ativo: false },
  ]
  const listagem2 = resolverParticipantesAtivos(comInativo, [...AUTORIZADOS, ...OUTROS])
  check(
    'Vínculo inativo fica fora da listagem',
    listagem2.length === 4 && !listagem2.some((p) => p.funcionarioId === 'out1'),
    'count=' + listagem2.length,
  )

  // 4) Adicionar é idempotente em cada estado
  const p1 = planejarAdicaoParticipante(baseVinculos(), 'out1')
  check('Adicionar sem vínculo sugere criar', p1.acao === 'criar', JSON.stringify(p1))

  const comInativoOut1: ParticipanteVinculo[] = [
    ...baseVinculos(),
    { id: 'vx1', funcionario: 'out1', ativo: false },
  ]
  const p2 = planejarAdicaoParticipante(comInativoOut1, 'out1')
  check(
    'Adicionar funcionário retirado sugere REATIVAR (sem duplicar)',
    p2.acao === 'reativar' && p2.vinculoId === 'vx1',
    JSON.stringify(p2),
  )

  const p3 = planejarAdicaoParticipante(baseVinculos(), '61n9us4w9eu8j11')
  check(
    'Adicionar já ativo é "nada" (idempotente)',
    p3.acao === 'nada' && p3.vinculoId === 'v1',
    JSON.stringify(p3),
  )

  // 5) Retirada é desativação — nunca delete; histórico preservado
  const r1 = planejarRetiradaParticipante(baseVinculos(), '8fg62tcjfnds7kv')
  check(
    'Retirar participante ativo sugere DESATIVAR vínculo',
    r1.acao === 'desativar' && r1.vinculoId === 'v3',
    JSON.stringify(r1),
  )
  const r2 = planejarRetiradaParticipante(comInativoOut1, 'out1')
  check(
    'Retirar já inativo é "nada" (idempotente)',
    r2.acao === 'nada' && r2.vinculoId === 'vx1',
    JSON.stringify(r2),
  )
  const r3 = planejarRetiradaParticipante([], 'out2')
  check('Retirar sem vínculo é "nada"', r3.acao === 'nada' && !r3.vinculoId, JSON.stringify(r3))

  // 6) Funcionário inativo no Cartão de Ponto continua aparecendo se tem
  //    vínculo ativo (a seleção é independente da situação do Cartão)
  const funcInativoCartao: FuncionarioMini[] = [
    { id: '61n9us4w9eu8j11', nome: 'Nayara Vitória de Morais', ativo: false },
  ]
  const listagem3 = resolverParticipantesAtivos(baseVinculos(), funcInativoCartao)
  check(
    'Vínculo ativo mantém funcionário na listagem mesmo se inativo no Cartão',
    listagem3.length === 1 && listagem3[0].ativoNoCartao === false,
    'ativoNoCartao=' + listagem3[0]?.ativoNoCartao,
  )

  return resultados
}
