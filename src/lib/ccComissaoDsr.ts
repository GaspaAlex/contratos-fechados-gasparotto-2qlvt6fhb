/**
 * FUNÇÕES PURAS — COMISSÃO MANUAL E DSR AUTOMÁTICO (Build C3)
 * ===========================================================
 * Motor de cálculo da aba Contracheques. Sem acesso a banco — I/O fica em
 * src/services/ccFeriados.ts / ccContracheques.ts; é o módulo executado de
 * verdade pelo runner de cenários (scripts/run-cenarios.mjs).
 *
 * PRECISÃO: toda a matemática é feita em CENTAVOS INTEIROS (padrão do módulo,
 * ver ccContracheque.ts) — nada de ponto flutuante nas contas.
 *
 * MODELO:
 *   - Comissão tem DUAS modalidades, mutuamente exclusivas:
 *       'casos'        → quantidade de casos × valor por caso (44 × R$ 20 = 880)
 *       'valor_direto' → valor total informado direto
 *   - DSR = (Comissões ÷ dias úteis) × dias de repouso — CLT, art. 7º, §2º.
 *   - Dias úteis/repouso vêm de um CALENDÁRIO da competência (mês/ano):
 *       • sábado é dia ÚTIL (critério do escritório — configurável);
 *       • domingo NUNCA é dia útil;
 *       • feriado nacional/estadual/municipal não é dia útil; quando cai em
 *         dia útil remove 1 dia útil, quando cai em sábado/domingo NÃO conta
 *         duas vezes (15/11/2026 = domingo + feriado → 1 dia só);
 *       • dias de repouso = sábados + domingos não feriados (critério atual).
 *   - Ajuste manual dos dias SEMPRE exige motivo — nunca mexe no calendário
 *     global; o motivo e os dias ajustados são gravados no snapshot do
 *     contracheque (reabrir preserva exatamente o que foi salvo).
 */

// ---------------------------------------------------------------------------
// Feriados NACIONAIS embutidos (2023–2028) — sem collection, sem I/O.
// Datas fixas + móveis. Não inclui pontos facultativos (confraternização
// universal 01/01 é feriado nacional; carnaval/quarta-feira de cinzas NÃO são
// feriados nacionais — ficam de fora do cálculo automático).
// Formato 'MM-DD' (recorrente todo ano) ou 'YYYY-MM-DD' (só naquele ano).
// ---------------------------------------------------------------------------
const FERIADOS_NACIONAIS_RECORRENTES: string[] = [
  '01-01', // Confraternização Universal
  '04-21', // Tiradentes
  '05-01', // Dia do Trabalho
  '09-07', // Independência
  '10-12', // N. Sra. Aparecida
  '11-02', // Finados
  '11-15', // Proclamação da República
  '11-20', // Consciência Negra (lei 14.759/2023 — vigora a partir de 2024;
  //          mantido também em 2023 por decisão conservadora de não descontar
  //          o dia do DSR — impacto: nenhum mês-exemplo é afetado)
  '12-25', // Natal
]

/** Feriados nacionais MÓVEIS por ano — Páscoa pelo algoritmo de
 * Meeus/Jones/Butcher (verificado contra 2024=31/03, 2025=20/04, 2026=05/04,
 * 2027=28/03, 2028=16/04). */
function feriadosMoveisNacionais(ano: number): string[] {
  const A = ano % 19
  const B = Math.floor(ano / 100)
  const C = ano % 100
  const D = Math.floor(B / 4)
  const E = B % 4
  const F = Math.floor((B + 8) / 25)
  const G = Math.floor((B - F + 1) / 3)
  const H = (19 * A + B - G - F + 15) % 30
  const I = Math.floor(C / 4)
  const K = C % 4
  const L = 32 + 2 * E + 2 * I - H - K
  const MES_PASCOA = Math.floor((H + Math.floor(H / 11)) / 32) // 3 ou 4
  const DIA_PASCOA = L - 31 * MES_PASCOA // 1..31 dentro do mês

  const paraYMD = (mes: number, dia: number) =>
    `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`

  const pascoa = paraYMD(MES_PASCOA, DIA_PASCOA)
  const pascoaDate = new Date(Date.UTC(ano, MES_PASCOA - 1, DIA_PASCOA))
  const sextafeiraSanta = new Date(pascoaDate.getTime() - 2 * 86400000)
  const corpusChristi = new Date(pascoaDate.getTime() + 60 * 86400000)

  const fmt = (d: Date) =>
    `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`

  return [pascoa, fmt(sextafeiraSanta), fmt(corpusChristi)]
}

/** Todos os feriados nacionais de um ano, como 'YYYY-MM-DD'. */
export function feriadosNacionaisDoAno(ano: number): string[] {
  const fixos = FERIADOS_NACIONAIS_RECORRENTES.map((md) => `${ano}-${md}`)
  return [...fixos, ...feriadosMoveisNacionais(ano)].sort()
}

// ---------------------------------------------------------------------------
// Calendário de competência (dias úteis × repouso)
// ---------------------------------------------------------------------------

/** Feriado cadastrado pelo usuário (collection cc_feriados) — forma pura. */
export interface FeriadoCadastrado {
  id: string
  nome: string
  dia: number
  mes: number
  /** 0 = recorrente (cai todo ano); >0 = só naquele ano. */
  ano: number
  escopo?: string
}

/** Configuração do cálculo de dias da competência. */
export interface ConfigDiasCompetencia {
  /** Sábado conta como dia útil? (critério ATUAL do escritório: true) */
  sabadoUtil: boolean
  /** Feriados estaduais/municipais/avulsos cadastrados (cc_feriados). */
  feriadosCadastrados: FeriadoCadastrado[]
}

export const CONFIG_PADRAO_DIAS: ConfigDiasCompetencia = {
  sabadoUtil: true,
  feriadosCadastrados: [],
}

/** 'YYYY-MM-DD' local (sem UTC) para dia/mês/ano — nunca new Date(yyyy, m, d) serializado errado. */
export function paraYMD(ano: number, mes: number, dia: number): string {
  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
}

/** Dia da semana civil (0=domingo … 6=sábado) de um 'YYYY-MM-DD' LOCAL. */
export function diaSemanaDeYMD(ymd: string): number {
  const [a, m, d] = ymd.split('-').map(Number)
  // Date local: construído com números → sem deslocamento de fuso.
  const dt = new Date(a, m - 1, d)
  return dt.getDay()
}

export function diasNoMes(ano: number, mes: number): number {
  return new Date(ano, mes, 0).getDate()
}

/** Resolve as datas (YYYY-MM-DD) dos feriados cadastrados que caem no mês. */
export function datasFeriadosCadastradosNoMes(
  ano: number,
  mes: number,
  feriados: FeriadoCadastrado[],
): string[] {
  const datas: string[] = []
  for (const f of feriados) {
    if (f.ano !== 0 && f.ano !== ano) continue
    if (f.mes !== mes) continue
    const ultimoDia = diasNoMes(ano, mes)
    if (f.dia < 1 || f.dia > ultimoDia) continue
    datas.push(paraYMD(ano, mes, f.dia))
  }
  return datas
}

/** Mapa de datas ('YYYY-MM-DD') → nome de TODOS os feriados do mês (nacionais + cadastrados). */
export function feriadosDoMes(
  ano: number,
  mes: number,
  config: ConfigDiasCompetencia = CONFIG_PADRAO_DIAS,
): Map<string, string> {
  const mapa = new Map<string, string>()
  for (const ymd of feriadosNacionaisDoAno(ano)) {
    const [, m] = ymd.split('-').map(Number)
    if (m === mes) mapa.set(ymd, 'Feriado nacional')
  }
  for (const ymd of datasFeriadosCadastradosNoMes(ano, mes, config.feriadosCadastrados)) {
    if (!mapa.has(ymd)) mapa.set(ymd, 'Feriado cadastrado')
  }
  return mapa
}

export interface CalendarioCompetencia {
  /** Dias úteis (sábado útil incluído, quando ativo) sem feriado. */
  diasUteis: number
  /** Dias de repouso (domingos + sábados não úteis, sem feriado contado neles). */
  diasRepouso: number
  /** Detalhamento por dia — para conferência na tela. */
  detalhe: Array<{
    ymd: string
    diaSemana: number
    util: boolean
    repouso: boolean
    feriado?: string
  }>
}

/**
 * Calendário puro da competência: dias úteis e de repouso, com o critério do
 * escritório (sábado útil; domingo não; feriado nunca é útil e NUNCA é contado
 * duas vezes — quando cai em sábado/domingo já é repouso/nao-util).
 */
export function calcularCalendarioCompetencia(
  ano: number,
  mes: number,
  config: ConfigDiasCompetencia = CONFIG_PADRAO_DIAS,
): CalendarioCompetencia {
  const feriados = feriadosDoMes(ano, mes, config)
  const total = diasNoMes(ano, mes)
  let diasUteis = 0
  let diasRepouso = 0
  const detalhe: CalendarioCompetencia['detalhe'] = []
  for (let d = 1; d <= total; d++) {
    const ymd = paraYMD(ano, mes, d)
    const ds = diaSemanaDeYMD(ymd)
    const feriado = feriados.get(ymd)
    const domingo = ds === 0
    const sabado = ds === 6
    const utilBase = domingo ? false : sabado ? config.sabadoUtil : true
    const util = utilBase && !feriado
    const repouso = !util
    if (util) diasUteis++
    else diasRepouso++
    detalhe.push({ ymd, diaSemana: ds, util, repouso, feriado })
  }
  return { diasUteis, diasRepouso, detalhe }
}

// ---------------------------------------------------------------------------
// Comissão (duas modalidades mutuamente exclusivas) — em centavos
// ---------------------------------------------------------------------------

export type ModalidadeComissaoCC = 'casos' | 'valor_direto'

export interface EntradaComissao {
  modalidade: ModalidadeComissaoCC
  /** 'casos': quantidade de casos (≥ 0). */
  qtdCasos?: number
  /** 'casos': valor por caso, em REAIS (aceita decimais — convertido p/ centavos). */
  valorCaso?: number
  /** 'valor_direto': valor total, em REAIS. */
  valorDireto?: number
}

export interface ResultadoComissao {
  ok: boolean
  erro?: string
  /** Comissão total, em CENTAVOS. */
  totalCentavos: number
  /** Espelhos para exibição/conferência. */
  qtdCasos?: number
  valorCasoCentavos?: number
  valorDiretoCentavos?: number
}

/** Arredonda para o centavo mais próximo a partir de reais (float) — só na borda de I/O. */
export function reaisParaCentavos(reais: number): number {
  return Math.round(reais * 100)
}

/** Converte centavos → reais (float) somente para persistência/exibição. */
export function centavosParaReais(centavos: number): number {
  return centavos / 100
}

/** Calcula a comissão (centavos) — validando modalidade e valores. */
export function calcularComissao(entrada: EntradaComissao): ResultadoComissao {
  if (entrada.modalidade === 'casos') {
    const qtd = entrada.qtdCasos ?? 0
    const valorCaso = entrada.valorCaso ?? 0
    if (!Number.isFinite(qtd) || qtd < 0) {
      return { ok: false, erro: 'Quantidade de casos inválida.', totalCentavos: 0 }
    }
    if (!Number.isInteger(qtd)) {
      return {
        ok: false,
        erro: 'A quantidade de casos deve ser um número inteiro.',
        totalCentavos: 0,
      }
    }
    if (!Number.isFinite(valorCaso) || valorCaso < 0) {
      return { ok: false, erro: 'Valor por caso inválido.', totalCentavos: 0 }
    }
    const valorCasoCentavos = reaisParaCentavos(valorCaso)
    const totalCentavos = qtd * valorCasoCentavos
    return {
      ok: true,
      totalCentavos,
      qtdCasos: qtd,
      valorCasoCentavos,
      valorDiretoCentavos: undefined,
    }
  }
  if (entrada.modalidade === 'valor_direto') {
    const valor = entrada.valorDireto ?? 0
    if (!Number.isFinite(valor) || valor < 0) {
      return { ok: false, erro: 'Valor da comissão inválido.', totalCentavos: 0 }
    }
    const totalCentavos = reaisParaCentavos(valor)
    return {
      ok: true,
      totalCentavos,
      qtdCasos: undefined,
      valorCasoCentavos: undefined,
      valorDiretoCentavos: totalCentavos,
    }
  }
  return { ok: false, erro: 'Modalidade de comissão inválida.', totalCentavos: 0 }
}

// ---------------------------------------------------------------------------
// DSR — (Comissões ÷ dias úteis) × dias de repouso, em centavos
// ---------------------------------------------------------------------------

export interface EntradaDSR {
  /** Comissão total do período, em CENTAVOS. */
  comissaoCentavos: number
  /** Dias úteis efetivamente usados (calendário ou ajustado). */
  diasUteis: number
  /** Dias de repouso efetivamente usados (calendário ou ajustado). */
  diasRepouso: number
}

export interface ResultadoDSR {
  ok: boolean
  erro?: string
  /** DSR, em CENTAVOS. */
  dsrCentavos: number
  /** Fração repouso/úteis (para exibição, ex. 5/26). */
  fracao: string
}

/**
 * DSR em centavos: round(comissao × repouso ÷ úteis). Toda a divisão acontece
 * UMA vez, em inteiros, com arredondamento bancário simples (half-up) —
 * 88000 × 5 ÷ 26 = 16923,0769… → 16923 (R$ 169,23).
 */
export function calcularDSR(entrada: EntradaDSR): ResultadoDSR {
  const { comissaoCentavos, diasUteis, diasRepouso } = entrada
  if (!Number.isInteger(comissaoCentavos) || comissaoCentavos < 0) {
    return { ok: false, erro: 'Comissão inválida.', dsrCentavos: 0, fracao: '—' }
  }
  if (
    !Number.isInteger(diasUteis) ||
    !Number.isInteger(diasRepouso) ||
    diasUteis < 0 ||
    diasRepouso < 0
  ) {
    return { ok: false, erro: 'Dias de úteis/repouso inválidos.', dsrCentavos: 0, fracao: '—' }
  }
  if (comissaoCentavos === 0) {
    return { ok: true, dsrCentavos: 0, fracao: diasUteis > 0 ? `${diasRepouso}/${diasUteis}` : '—' }
  }
  if (diasUteis === 0) {
    return {
      ok: false,
      erro: 'Não é possível calcular o DSR sem dias úteis no período.',
      dsrCentavos: 0,
      fracao: '—',
    }
  }
  // round(comissao * repouso / uteis) — tudo em inteiros, half-up:
  const numerador = comissaoCentavos * diasRepouso
  const dsr = Math.floor(numerador / diasUteis + 0.5)
  return { ok: true, dsrCentavos: dsr, fracao: `${diasRepouso}/${diasUteis}` }
}

// ---------------------------------------------------------------------------
// Snapshot completo — comissão + calendário + DSR (o que é gravado no banco)
// ---------------------------------------------------------------------------

export interface SnapshotComissaoDsr {
  comissaoAtiva: boolean
  modalidade?: ModalidadeComissaoCC
  qtdCasos?: number
  /** Valor por caso, em REAIS (float) — forma de persistência no banco. */
  valorCaso?: number
  /** Valor direto, em REAIS (float) — forma de persistência no banco. */
  valorDireto?: number
  /** Comissão total, em CENTAVOS. */
  comissaoTotalCentavos: number
  /** Dias usados no cálculo (calendário OU ajustados). */
  diasUteis: number
  diasRepouso: number
  /** Dias que o CALENDÁRIO puro indicava (antes de ajuste manual). */
  calendarioDiasUteis: number
  calendarioDiasRepouso: number
  ajustado: boolean
  motivoAjuste?: string
  /** DSR, em CENTAVOS. */
  dsrCentavos: number
  fracaoDsr: string
}

export interface EntradaSnapshot {
  ano: number
  mes: number
  comissao?: EntradaComissao | null // null/undefined = sem comissão
  configDias?: ConfigDiasCompetencia
  /** Ajuste manual dos dias — EXIGE motivo. */
  ajusteDias?: { diasUteis: number; diasRepouso: number; motivo: string } | null
}

/**
 * Snapshot completo e DETERMINÍSTICO do mês: dada a mesma entrada (comissão +
 * calendário + ajuste), produz exatamente o mesmo resultado — é o que permite
 * reabrir o rascunho com os valores que foram salvos (o snapshot é gravado no
 * contracheque e a reabertura lê o snapshot, nunca recalcula silenciosamente).
 */
export function calcularSnapshotComissaoDsr(entrada: EntradaSnapshot): {
  ok: boolean
  erro?: string
  snapshot?: SnapshotComissaoDsr
} {
  const { ano, mes } = entrada
  if (!Number.isInteger(ano) || ano < 2000 || ano > 2100) {
    return { ok: false, erro: 'Ano da competência inválido.' }
  }
  if (!Number.isInteger(mes) || mes < 1 || mes > 12) {
    return { ok: false, erro: 'Mês da competência inválido.' }
  }

  const config = entrada.configDias ?? CONFIG_PADRAO_DIAS
  const cal = calcularCalendarioCompetencia(ano, mes, config)

  let diasUteis = cal.diasUteis
  let diasRepouso = cal.diasRepouso
  let ajustado = false
  let motivoAjuste: string | undefined

  if (entrada.ajusteDias) {
    const { diasUteis: au, diasRepouso: ar, motivo } = entrada.ajusteDias
    if (!Number.isInteger(au) || au < 0 || !Number.isInteger(ar) || ar < 0) {
      return { ok: false, erro: 'Dias ajustados inválidos.' }
    }
    const motivoLimpo = (motivo ?? '').trim()
    if (motivoLimpo.length < 3) {
      return { ok: false, erro: 'O ajuste manual dos dias exige um motivo (mín. 3 caracteres).' }
    }
    if (au !== cal.diasUteis || ar !== cal.diasRepouso) {
      diasUteis = au
      diasRepouso = ar
      ajustado = true
      motivoAjuste = motivoLimpo
    }
  }

  // Comissão
  let comissaoAtiva = false
  let modalidade: ModalidadeComissaoCC | undefined
  let qtdCasos: number | undefined
  let valorCaso: number | undefined
  let valorDireto: number | undefined
  let comissaoTotalCentavos = 0

  if (entrada.comissao) {
    const rc = calcularComissao(entrada.comissao)
    if (!rc.ok) return { ok: false, erro: rc.erro }
    comissaoAtiva = true
    modalidade = entrada.comissao.modalidade
    qtdCasos = rc.qtdCasos
    valorCaso =
      rc.valorCasoCentavos !== undefined ? centavosParaReais(rc.valorCasoCentavos) : undefined
    valorDireto =
      rc.valorDiretoCentavos !== undefined ? centavosParaReais(rc.valorDiretoCentavos) : undefined
    comissaoTotalCentavos = rc.totalCentavos
  }

  // DSR — só existe quando há comissão
  let dsrCentavos = 0
  let fracaoDsr = '—'
  if (comissaoAtiva && comissaoTotalCentavos > 0) {
    const rd = calcularDSR({ comissaoCentavos: comissaoTotalCentavos, diasUteis, diasRepouso })
    if (!rd.ok) return { ok: false, erro: rd.erro }
    dsrCentavos = rd.dsrCentavos
    fracaoDsr = rd.fracao
  }

  return {
    ok: true,
    snapshot: {
      comissaoAtiva,
      modalidade,
      qtdCasos,
      valorCaso,
      valorDireto,
      comissaoTotalCentavos,
      diasUteis,
      diasRepouso,
      calendarioDiasUteis: cal.diasUteis,
      calendarioDiasRepouso: cal.diasRepouso,
      ajustado,
      motivoAjuste,
      dsrCentavos,
      fracaoDsr,
    },
  }
}

// ---------------------------------------------------------------------------
// Integração ao demonstrativo (cc_lancamentos de origem 'comissao'/'dsr')
// ---------------------------------------------------------------------------

/** Rotulagem padronizada das duas rubricas calculadas. */
export const RUBRICA_COMISSAO = 'Comissões'
export const RUBRICA_DSR = 'DSR sobre comissões'

export type OrigemLancamento = 'manual' | 'comissao' | 'dsr_comissao'

export interface LancamentoExistente {
  id?: string
  origem?: OrigemLancamento | string
  natureza_tipo: 'vencimento' | 'desconto'
  descricao: string
  /** Valor em CENTAVOS (entrada convertida pela UI). */
  valorCentavos: number
}

/**
 * Detecta comissões manuais já lançadas na competência (origem 'manual',
 * natureza vencimento, descrição canônica contendo "comiss"). Nunca altera,
 * converte ou apaga nada — só DETECTA; a decisão é do usuário.
 */
export function detectarComissaoManual(
  lancamentos: LancamentoExistente[],
): LancamentoExistente | null {
  for (const l of lancamentos) {
    if (l.origem && l.origem !== 'manual') continue
    if (l.natureza_tipo !== 'vencimento') continue
    if (l.valorCentavos <= 0) continue
    const desc = (l.descricao || '').toLowerCase()
    if (desc.includes('comiss')) return l
  }
  return null
}

/**
 * Plano de integração ao demonstrativo: dado o snapshot e os lançamentos
 * existentes, decide CRIAR/ATUALIZAR/NADA por rubrica — sem nunca apagar nem
 * converter lançamento manual sem ação explícita (o dialog "conferir ou
 * substituir" chama 'substituirManual' ANTES de gravar, com ação do usuário).
 */
export function planejarLancamentosComissaoDsr(
  snapshot: SnapshotComissaoDsr,
  existentes: LancamentoExistente[],
): {
  precisaDecisao: boolean
  manualExistente?: LancamentoExistente
  comissao: { acao: 'criar' | 'atualizar' | 'nada'; id?: string; valorCentavos: number }
  dsr: { acao: 'criar' | 'atualizar' | 'nada'; id?: string; valorCentavos: number }
} {
  const manual = detectarComissaoManual(existentes)
  const precisaDecisao =
    manual !== null && snapshot.comissaoAtiva && snapshot.comissaoTotalCentavos > 0

  const achComissao = existentes.find((l) => l.origem === 'comissao')
  const achDsr = existentes.find((l) => l.origem === 'dsr_comissao')

  const valorComissao = snapshot.comissaoAtiva ? snapshot.comissaoTotalCentavos : 0
  const valorDsr = snapshot.comissaoAtiva ? snapshot.dsrCentavos : 0

  const comissao = (() => {
    if (!snapshot.comissaoAtiva || valorComissao <= 0) {
      return achComissao
        ? { acao: 'atualizar' as const, id: achComissao.id, valorCentavos: 0 }
        : { acao: 'nada' as const, valorCentavos: 0 }
    }
    if (precisaDecisao) return { acao: 'nada' as const, valorCentavos: valorComissao }
    if (achComissao)
      return { acao: 'atualizar' as const, id: achComissao.id, valorCentavos: valorComissao }
    return { acao: 'criar' as const, valorCentavos: valorComissao }
  })()

  const dsr = (() => {
    if (!snapshot.comissaoAtiva || valorDsr <= 0) {
      return achDsr
        ? { acao: 'atualizar' as const, id: achDsr.id, valorCentavos: 0 }
        : { acao: 'nada' as const, valorCentavos: 0 }
    }
    if (precisaDecisao) return { acao: 'nada' as const, valorCentavos: valorDsr }
    if (achDsr) return { acao: 'atualizar' as const, id: achDsr.id, valorCentavos: valorDsr }
    return { acao: 'criar' as const, valorCentavos: valorDsr }
  })()

  return { precisaDecisao, manualExistente: manual ?? undefined, comissao, dsr }
}
