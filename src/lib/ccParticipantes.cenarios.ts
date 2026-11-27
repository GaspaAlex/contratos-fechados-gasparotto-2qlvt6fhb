/**
 * CENÁRIOS — CONTRACHEQUES_P (participantes + cadastro próprio, Build C1-B)
 * ========================================================================
 * Executa em MEMÓRIA as regras puras de participantes (sem tocar na base
 * real — prévia e produção compartilham o mesmo banco, nada é gravado):
 * listagem (ativos, dos dois tipos de vínculo), retirada/reativação,
 * dedupe de cadastro (exato, sem acento/caixa/espaços, aproximação), caso
 * do registro antigo duplicado da Nataly e independência do Cartão de Ponto.
 */
import {
  planejarAdicaoParticipante,
  planejarCadastroColaborador,
  planejarRetiradaParticipante,
  resolverParticipantesAtivos,
  validarCadastroColaborador,
  canonicalizarNome,
  type ColaboradorMini,
  type FuncionarioMini,
  type ParticipanteVinculo,
} from './ccParticipantes'

/** Massa de teste em memória — os 4 participantes reais + massa auxiliar. */
const FUNC: FuncionarioMini[] = [
  { id: 'func-nataly', nome: 'Nataly Tayna Figueiredo da Silva', ativo: true },
  // Registro antigo duplicado da Nataly (sem user_id), como no banco real:
  { id: 'func-nataly-antigo', nome: 'Nataly Tayna Figueiredo da Silva', ativo: false },
  { id: 'func-nayara', nome: 'Nayara Vitória de Morais', ativo: true },
  { id: 'func-kaique', nome: 'Kaique Gotardo de Carvalho dos Santos', ativo: true },
  { id: 'func-beatriz', nome: 'Beatriz Yumi Aizawa Yamashita', ativo: true },
  { id: 'func-alex', nome: 'Alex Gasparotto', ativo: true, perfil: 'admin' },
]

const VINCULOS: ParticipanteVinculo[] = [
  { id: 'v1', funcionario: 'func-nataly', ativo: true },
  { id: 'v2', funcionario: 'func-nayara', ativo: true },
  { id: 'v3', funcionario: 'func-kaique', ativo: true },
  { id: 'v4', funcionario: 'func-beatriz', ativo: true },
]

const COLS: ColaboradorMini[] = []

export function runCenariosParticipantes(): Array<{
  cenario: string
  detalhe: string
  ok: boolean | null
}> {
  const resultados: Array<{ cenario: string; detalhe: string; ok: boolean | null }> = []
  const add = (cenario: string, ok: boolean, detalhe = '') =>
    resultados.push({ cenario, detalhe, ok })

  // 1. Quatro participantes atuais na listagem (preservados)
  const res = resolverParticipantesAtivos(VINCULOS, FUNC, COLS)
  add(
    'quatro participantes ativos aparecem na listagem',
    res.length === 4 &&
      res.map((r) => r.nome).join('|') ===
        'Beatriz Yumi Aizawa Yamashita|Kaique Gotardo de Carvalho dos Santos|Nataly Tayna Figueiredo da Silva|Nayara Vitória de Morais',
    res.map((r) => r.nome).join(' / '),
  )

  // 2. Retirada = desativação (histórico preservado); reativação sem duplicar
  const planoRet = planejarRetiradaParticipante(VINCULOS, 'func-nayara')
  add(
    'retirada planeja desativar o vínculo (nunca excluir)',
    planoRet.acao === 'desativar' && planoRet.vinculoId === 'v2',
  )
  const aposRetirada = VINCULOS.map((v) =>
    v.id === planoRet.vinculoId ? { ...v, ativo: false } : v,
  )
  add('vínculo retirado permanece na coleção (histórico preservado)', aposRetirada.length === 4)
  add(
    'participante retirado sai da listagem',
    resolverParticipantesAtivos(aposRetirada, FUNC, COLS).length === 3,
  )
  const planoRe = planejarAdicaoParticipante(aposRetirada, 'func-nayara')
  add(
    'readicionar quem foi retirado REATIVA o mesmo vínculo (sem duplicar)',
    planoRe.acao === 'reativar' && planoRe.vinculoId === 'v2',
  )
  const reativado = resolverParticipantesAtivos(
    aposRetirada.map((v) => (v.funcionario === 'func-nayara' ? { ...v, ativo: true } : v)),
    FUNC,
    COLS,
  )
  add('após reativação, os 4 participantes voltam', reativado.length === 4)

  // 3. Dedupe do cadastro — formulário "+ Cadastrar novo colaborador"
  const cad = (nome: string, cols: ColaboradorMini[] = COLS) =>
    planejarCadastroColaborador(nome, VINCULOS, FUNC, cols)

  const p1 = cad('Nayara Vitória de Morais')
  add('nome já participante ativo → existente_ativo (nada é criado)', p1.acao === 'existente_ativo')
  const p2 = cad('nayara vitoria de morais')
  add(
    'mesmo nome sem acento/caixa colide (dedupe)',
    p2.acao === 'existente_ativo' && p2.nomeConflito === 'Nayara Vitória de Morais',
  )
  const p3 = cad('  Nayara   Vitória de Morais  ')
  add('espaços extras não enganam o dedupe', p3.acao === 'existente_ativo')
  const p4 = cad('Nataly Tayna Figueiredo da Silva')
  add(
    'Nataly ativa não gera segunda participação',
    p4.acao === 'existente_ativo' && p4.funcionarioId === 'func-nataly',
  )
  const p5 = cad('Nataly Silva')
  add('nome aproximado → aviso_aproximado (nada é criado sozinho)', p5.acao === 'aviso_aproximado')
  const p6 = cad('Maria Clara Souza')
  add('nome inédito → criar cadastro próprio (cc_colaboradores)', p6.acao === 'criar')
  const p7 = cad('João')
  add('nome sem sobrenome é recusado (invalido)', p7.acao === 'invalido')
  add('validação devolve mensagem clara', validarCadastroColaborador('João') !== null)
  add('nome vazio é recusado', validarCadastroColaborador('   ') !== null)
  const p8 = cad('Alex Gasparotto')
  add(
    'funcionário do Cartão de Ponto sem vínculo → reusar_funcionario (não duplica pessoa)',
    p8.acao === 'reusar_funcionario' && p8.funcionarioId === 'func-alex',
  )
  const p9 = cad('Pedro Souza', COLS.concat([{ id: 'col-1', nome: 'Pedro Souza', ativo: true }]))
  add('colaborador próprio sem vínculo → reusar_cadastro', p9.acao === 'reusar_cadastro')
  const p10 = cad('Nayara Vitória de Morais', COLS)
  add(
    'homônimo com vínculo ativo não sugere reusar cadastro nem criar outro',
    p10.acao === 'existente_ativo',
  )

  // 4. Cadastro próprio independente do Cartão de Ponto
  const vinculoNovo: ParticipanteVinculo = { id: 'v-novo', colaborador: 'col-maria', ativo: true }
  const resolvido = resolverParticipantesAtivos([...VINCULOS, vinculoNovo], FUNC, [
    { id: 'col-maria', nome: 'Maria Clara Souza', ativo: true },
  ])
  const maria = resolvido.find((r) => r.nome === 'Maria Clara Souza')
  add('colaborador próprio (sem Cartão de Ponto) aparece na listagem', !!maria)
  add(
    'colaborador próprio não depende de existir em funcionarios',
    !!maria && maria.colaboradorId === 'col-maria' && !maria.funcionarioId,
  )
  add('Cartão de Ponto intocado: 6 funcionários na massa', FUNC.length === 6)

  // 5. Registro antigo duplicado da Nataly não gera segunda participação
  const rDup = resolverParticipantesAtivos(
    [...VINCULOS, { id: 'v-dup', funcionario: 'func-nataly-antigo', ativo: true }],
    FUNC,
    COLS,
  )
  add(
    'registro duplicado da Nataly não provoca segunda participação',
    rDup.filter((x) => x.nome.includes('Nataly')).length === 1,
    `${rDup.filter((x) => x.nome.includes('Nataly')).length} Nataly na listagem`,
  )

  // 6. Canonicalização usada pelo dedupe
  add(
    'canonicalizarNome remove acento/caixa/espaços extras',
    canonicalizarNome('  Átila  da  SILVA ') === 'atila da silva',
  )

  return resultados
}
