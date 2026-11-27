/**
 * FUNÇÕES PURAS — CONTRACHEQUE MENSAL (Build C2)
 * ========================================================================
 * Sem acesso a banco (o I/O fica em src/services/ccContracheques.ts) — é o
 * módulo que o runner de cenários executa de verdade (CONTRACHEQUES_C2).
 *
 * Regras implementadas AQUI (e em nenhum outro lugar):
 *  - Salário vigente PARA A COMPETÊNCIA escolhida, lendo o histórico de
 *    vigências (datas inclusivas; vigência sem fim = aberta). Competência
 *    anterior usa o salário HISTÓRICO, nunca o de hoje.
 *  - Toda a matemática é em CENTAVOS inteiros (sem ponto flutuante); a
 *    conversão reais→centavos arredonda a 2 casas e recusa lixo (NaN).
 *  - Totais: vencimentos = salário-base + demais vencimentos; descontos =
 *    soma dos descontos; líquido = vencimentos − descontos.
 *  - Lançamentos manuais têm NATUREZA (texto, ex.: "Gratificação") +
 *    descrição opcional; dedupe exato (mesma natureza+descrição canônica
 *    + tipo + valor) marca duplicidade acidental.
 *  - O salário-base NUNCA entra como lançamento manual.
 *  - Anti-duplicidade de demonstrativo: no máximo um do tipo 'folha' por
 *    colaborador por competência (índice único no banco + busca antes de salvar).
 */

/** Registro de cc_salarios no formato devolvido pelo SDK (mínimo necessário). */
export interface SalarioVigencia {
  id: string
  funcionario: string
  valor: number
  vigencia_inicio: string
  vigencia_fim: string
}

/** Lançamento manual em edição (valor em reais, number). */
export interface LancamentoInput {
  id?: string
  natureza_tipo: 'vencimento' | 'desconto'
  natureza: string
  descricao: string
  valor: number
}

/** Reais → centavos inteiros (arredonda a 2 casas; recusa NaN/negativo). */
export function paraCentavos(valor: number): number | null {
  if (typeof valor !== 'number' || !isFinite(valor)) return null
  const centavos = Math.round(valor * 100)
  if (centavos < 0) return null
  return centavos
}

/** Centavos → reais (number) para gravação nos campos number do PocketBase. */
export function deCentavos(centavos: number): number {
  return centavos / 100
}

/** Formata centavos como moeda pt-BR (2 casas — precisão monetária). */
export function formatarCentavos(centavos: number): string {
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

/** Chave de competência "YYYY-MM" (mês 1..12). */
export function chaveCompetencia(mes: number, ano: number): string {
  return `${ano}-${String(mes).padStart(2, '0')}`
}

/** Último dia civil do mês da competência (YYYY-MM-DD). */
export function fimDaCompetencia(mes: number, ano: number): string {
  const ultimoDia = new Date(ano, mes, 0).getDate()
  return `${chaveCompetencia(mes, ano)}-${String(ultimoDia).padStart(2, '0')}`
}

/**
 * Salário vigente PARA A COMPETÊNCIA (não para hoje): a vigência precisa
 * COBRIR a competência — iniciada até o último dia do mês e (se encerrada)
 * terminada a partir do dia 1º. Quando duas vigências cobrem a competência
 * (ex.: aumento no meio do mês), vale a mais RECENTE (maior início).
 */
export function salarioVigenteNaCompetencia(
  salarios: SalarioVigencia[],
  funcionarioId: string,
  mes: number,
  ano: number,
): SalarioVigencia | undefined {
  const fimComp = fimDaCompetencia(mes, ano)
  const inicioComp = `${chaveCompetencia(mes, ano)}-01`
  const coberturas = salarios.filter((s) => {
    if (s.funcionario !== funcionarioId) return false
    const ini = String(s.vigencia_inicio || '').slice(0, 10)
    const fim = String(s.vigencia_fim || '').slice(0, 10)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ini)) return false
    const fimEfetivo = fim === '' ? '9999-12-31' : fim
    return ini <= fimComp && fimEfetivo >= inicioComp
  })
  if (coberturas.length === 0) return undefined
  coberturas.sort((a, b) =>
    String(b.vigencia_inicio).slice(0, 10).localeCompare(String(a.vigencia_inicio).slice(0, 10)),
  )
  return coberturas[0]
}

/** Normaliza descrição para o dedupe (sem acento, caixa, espaços extras). */
export function canonicalizarDescricao(descricao: string): string {
  return descricao
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

/** Lançamento consolidado (centavos) pronto para a tela. */
export interface LancamentoConsolidado extends LancamentoInput {
  valorCentavos: number
}

/** Resultado do cálculo do demonstrativo (centavos). */
export interface DemonstrativoCalculado {
  salarioBaseCentavos: number | null // null = salário não cadastrado na competência
  vencimentos: LancamentoConsolidado[]
  descontos: LancamentoConsolidado[]
  totalVencimentosCentavos: number
  totalDescontosCentavos: number
  liquidoCentavos: number
  duplicados: string[] // natureza+descrição duplicadas (aviso, não bloqueio)
}

/** Valida um lançamento manual (mensagem de erro ou null). */
export function validarLancamento(l: LancamentoInput): string | null {
  if (!l.natureza || !l.natureza.trim()) {
    return 'Informe a natureza do lançamento.'
  }
  if (l.descricao && l.descricao.trim().length > 120) {
    return 'A descrição não pode passar de 120 caracteres.'
  }
  const centavos = paraCentavos(l.valor)
  if (centavos === null) {
    return 'Valor inválido: informe um número maior ou igual a zero.'
  }
  if (centavos === 0) {
    return 'O valor deve ser maior que zero.'
  }
  if (centavos > 9999999999) {
    return 'Valor acima do limite aceitável.'
  }
  return null
}

/**
 * Calcula o demonstrativo completo a partir do salário-base da competência
 * (undefined = não cadastrado) e dos lançamentos manuais. Recalcula tudo a
 * cada mudança (live). Ignora lançamentos com valor inválido (nunca propaga
 * NaN) e nunca considera o salário-base como lançamento manual.
 */
export function calcularDemonstrativo(
  salario: { valor: number } | undefined,
  lancamentos: LancamentoInput[],
): DemonstrativoCalculado {
  const salarioBaseCentavos =
    salario === undefined ? null : (paraCentavos(Number(salario.valor)) ?? 0)

  const vencimentos: LancamentoConsolidado[] = []
  const descontos: LancamentoConsolidado[] = []
  const contagem = new Map<string, { n: number; rotulo: string }>()
  const duplicados: string[] = []

  for (const l of lancamentos) {
    const centavos = paraCentavos(Number(l.valor))
    if (centavos === null) continue // lança lixo fora — nunca NaN nos totais
    const item: LancamentoConsolidado = {
      id: l.id,
      natureza_tipo: l.natureza_tipo,
      natureza: l.natureza,
      descricao: l.descricao,
      valor: deCentavos(centavos),
      valorCentavos: centavos,
    }
    if (l.natureza_tipo === 'desconto') descontos.push(item)
    else vencimentos.push(item)
    const rotulo = [l.natureza, l.descricao].filter(Boolean).join(' — ')
    const chave = `${l.natureza_tipo}|${canonicalizarDescricao(l.natureza)}|${canonicalizarDescricao(l.descricao)}|${centavos}`
    const prev = contagem.get(chave)
    if (prev) prev.n += 1
    else contagem.set(chave, { n: 1, rotulo })
  }
  for (const { n, rotulo } of contagem.values()) {
    if (n > 1) duplicados.push(rotulo)
  }

  const totalVencimentosCentavos =
    (salarioBaseCentavos ?? 0) + vencimentos.reduce((acc, v) => acc + v.valorCentavos, 0)
  const totalDescontosCentavos = descontos.reduce((acc, d) => acc + d.valorCentavos, 0)
  const liquidoCentavos = totalVencimentosCentavos - totalDescontosCentavos

  return {
    salarioBaseCentavos,
    vencimentos,
    descontos,
    totalVencimentosCentavos,
    totalDescontosCentavos,
    liquidoCentavos,
    duplicados,
  }
}

/**
 * Prepara a gravação do demonstrativo: snapshot do salário-base (nunca
 * substituído depois), flag de salário não cadastrado e status 'rascunho'.
 * (Fechamento/pagamento NÃO são implementados neste build.)
 */
export function planejarSalvoDemonstrativo(calculo: DemonstrativoCalculado): {
  salario_base: number
  salario_nao_cadastrado: boolean
  status: 'rascunho'
} {
  return {
    salario_base: deCentavos(calculo.salarioBaseCentavos ?? 0),
    salario_nao_cadastrado: calculo.salarioBaseCentavos === null,
    status: 'rascunho',
  }
}
