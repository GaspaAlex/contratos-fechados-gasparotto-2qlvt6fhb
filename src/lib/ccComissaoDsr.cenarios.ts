/**
 * CENÁRIOS — COMISSÕES MANUAIS E DSR AUTOMÁTICO (Build C3-A)
 * ==========================================================
 * Função PURA executada de verdade no prebuild (scripts/run-cenarios.mjs).
 * Nada toca o banco — exercita o motor src/lib/ccComissaoDsr.ts com dados em
 * memória. Todos os valores de entrada/saída de comissão/DSR estão em
 * CENTAVOS inteiros; valores de calendário em dias inteiros.
 *
 *   C3-1  OUTUBRO/2026 — calendário real: 26 úteis, 5 repouso → 880,00 → DSR 169,23
 *   C3-2  NOVEMBRO/2026 — calendário real: 23 úteis, 7 repouso → 880,00 → DSR 267,83
 *   C3-3  15/11/2026 (domingo + feriado nacional) contado UMA única vez
 *   C3-4  comissão zero → DSR zero
 *   C3-5  modalidade valor_direto = modalidade casos (880,00 nos dois)
 *   C3-6  feriado cadastrado em DIA ÚTIL remove 1 dia útil
 *   C3-7  feriado cadastrado em DIA DUPLICADO não reduz os úteis duas vezes
 *   C3-8  feriado cadastrado em DOMINGO não duplica o repouso
 *   C3-9  alterar a QUANTIDADE de casos muda comissão e DSR em cadeia
 *   C3-10 alterar o VALOR UNITÁRIO muda comissão e DSR em cadeia
 *   C3-11 valores inválidos recusados (NaN, negativo, qtd fracionária, modalidade)
 *   C3-12 arredondamento half-up verificado em centavos
 *   C3-13 competências de meses diferentes não se contaminam
 *   C3-14 ajuste manual justificado sobrescreve os dias (calendário preservado)
 *   C3-15 ajuste manual SEM motivo é recusado
 *   C3-16 snapshot sem comissão: DSR zero e rubrica não planejada
 *   C3-17 planejamento de lançamentos: criar/atualizar/substituir manual
 *
 * As coleções NÃO são tocadas (prévia e produção compartilham o banco);
 * nenhum registro fictício é gravado.
 */
import type { ResultadoCenario } from '@/lib/comissoes.cenarios'
import {
  CONFIG_PADRAO_DIAS,
  RUBRICA_COMISSAO,
  RUBRICA_DSR,
  calcularCalendarioCompetencia,
  calcularComissao,
  calcularDSR,
  calcularSnapshotComissaoDsr,
  reaisParaCentavos,
  diaSemanaDeYMD,
  feriadosDoMes,
  paraYMD,
  planejarLancamentosComissaoDsr,
  type EntradaComissao,
  type FeriadoCadastrado,
  type LancamentoExistente,
  type SnapshotComissaoDsr,
} from '@/lib/ccComissaoDsr'

const formatar = (centavos: number) => `R$ ${(centavos / 100).toFixed(2).replace('.', ',')}`

export function runCenariosComissaoDsr(): ResultadoCenario[] {
  const cenarios: ResultadoCenario[] = []
  const push = (cenario: string, detalhe: string, ok: boolean) =>
    cenarios.push({ cenario, detalhe, ok })

  // ---------------------------------------------------------------------
  // C3-1 — OUTUBRO/2026 com o calendário REAL (sem feriado cadastrado).
  // Out/2026: 31 dias, 4 domingos (04/11/18/25), 5 sábados, 12/10 (Aparecida)
  // cai em SEGUNDA → 26 úteis / 5 repouso. DSR = 880,00 × 5/26 = 169,2307…
  // → 16923 centavos (R$ 169,23), half-up.
  // ---------------------------------------------------------------------
  {
    const cal = calcularCalendarioCompetencia(2026, 10, CONFIG_PADRAO_DIAS)
    const rc = calcularComissao({ modalidade: 'casos', qtdCasos: 44, valorCaso: 20 })
    const rd = calcularDSR({
      comissaoCentavos: rc.totalCentavos,
      diasUteis: cal.diasUteis,
      diasRepouso: cal.diasRepouso,
    })
    push(
      'C3-1 OUTUBRO/2026 (calendário real: 26 úteis, 5 repouso): 44 × R$ 20 = R$ 880,00 → DSR R$ 169,23',
      `úteis: ${cal.diasUteis}; repouso: ${cal.diasRepouso}; comissão: ${formatar(rc.totalCentavos)}; DSR: ${formatar(rd.dsrCentavos)}`,
      cal.diasUteis === 26 &&
        cal.diasRepouso === 5 &&
        rc.ok &&
        rc.totalCentavos === 88000 &&
        rd.ok &&
        rd.dsrCentavos === 16923,
    )
  }

  // ---------------------------------------------------------------------
  // C3-2 — NOVEMBRO/2026 com o calendário REAL (sem feriado cadastrado).
  // Nov/2026: 30 dias, 5 domingos (01/08/15/22/29), 4 sábados, 02/11 (Finados)
  // e 20/11 (Consciência Negra) caem em dias úteis; 15/11 (República) cai em
  // DOMINGO → conta 1× só (repouso). Total: 23 úteis / 7 repouso.
  // DSR = 880,00 × 7/23 = 267,826… → 26783 centavos (R$ 267,83).
  // ---------------------------------------------------------------------
  {
    const cal = calcularCalendarioCompetencia(2026, 11, CONFIG_PADRAO_DIAS)
    const rc = calcularComissao({ modalidade: 'casos', qtdCasos: 44, valorCaso: 20 })
    const rd = calcularDSR({
      comissaoCentavos: rc.totalCentavos,
      diasUteis: cal.diasUteis,
      diasRepouso: cal.diasRepouso,
    })
    const detalhe15 = cal.detalhe[14]
    push(
      'C3-2 NOVEMBRO/2026 (calendário real: 23 úteis, 7 repouso; 15/11 domingo+feriado 1×): 44 × R$ 20 → DSR R$ 267,83',
      `úteis: ${cal.diasUteis}; repouso: ${cal.diasRepouso}; comissão: ${formatar(rc.totalCentavos)}; DSR: ${formatar(rd.dsrCentavos)}`,
      cal.diasUteis === 23 &&
        cal.diasRepouso === 7 &&
        rc.ok &&
        rc.totalCentavos === 88000 &&
        rd.ok &&
        rd.dsrCentavos === 26783,
    )
    // Sub-verificação explícita do dia 15 (fica no mesmo cenário, mesmo critério):
    push(
      'C3-2b 15/11/2026 é domingo E feriado nacional, marcado repouso (não duplicado)',
      `diaSemana: ${detalhe15?.diaSemana} (0=domingo); feriado: ${detalhe15?.feriado ?? '—'}; util: ${detalhe15?.util}; repouso: ${detalhe15?.repouso}`,
      !!detalhe15 &&
        detalhe15.diaSemana === 0 &&
        !!detalhe15.feriado &&
        detalhe15.repouso &&
        !detalhe15.util,
    )
  }

  // ---------------------------------------------------------------------
  // C3-3 — cenário do usuário com dias INFORMADOS (não calendário): 26/5.
  // ---------------------------------------------------------------------
  {
    const rd = calcularDSR({ comissaoCentavos: 88000, diasUteis: 26, diasRepouso: 5 })
    push(
      'C3-3 DSR sobre dias informados (26 úteis / 5 repouso): R$ 880,00 → R$ 169,23',
      `fração: ${rd.fracao}; DSR: ${formatar(rd.dsrCentavos)}`,
      rd.ok && rd.dsrCentavos === 16923 && rd.fracao === '5/26',
    )
  }

  // ---------------------------------------------------------------------
  // C3-4 — comissão zero → DSR zero (nunca erro).
  // ---------------------------------------------------------------------
  {
    const rd = calcularDSR({ comissaoCentavos: 0, diasUteis: 26, diasRepouso: 5 })
    const snap = calcularSnapshotComissaoDsr({
      ano: 2026,
      mes: 10,
      comissao: { modalidade: 'casos', qtdCasos: 0, valorCaso: 20 },
    })
    push(
      'C3-4 comissão zero → DSR zero (inclui 0 casos × valor)',
      `DSR direto: ${rd.dsrCentavos}; snapshot (0 casos): ${snap.snapshot?.dsrCentavos}`,
      rd.ok &&
        rd.dsrCentavos === 0 &&
        snap.ok === true &&
        snap.snapshot?.comissaoAtiva === true &&
        snap.snapshot.dsrCentavos === 0,
    )
  }

  // ---------------------------------------------------------------------
  // C3-5 — valor direto e casos×valor produzem o MESMO total.
  // ---------------------------------------------------------------------
  {
    const porCasos = calcularComissao({ modalidade: 'casos', qtdCasos: 44, valorCaso: 20 })
    const direto = calcularComissao({ modalidade: 'valor_direto', valorDireto: 880 })
    push(
      'C3-5 modalidade valor_direto (R$ 880,00) = modalidade casos (44 × R$ 20,00)',
      `casos: ${porCasos.totalCentavos}; direto: ${direto.totalCentavos}`,
      porCasos.ok && direto.ok && porCasos.totalCentavos === direto.totalCentavos,
    )
  }

  // ---------------------------------------------------------------------
  // C3-6 — feriado cadastrado em dia ÚTIL remove 1 dia útil.
  // ---------------------------------------------------------------------
  {
    const feriado: FeriadoCadastrado = {
      id: 'f-estadual',
      nome: 'Aniversário da cidade',
      dia: 7,
      mes: 10,
      ano: 2026,
      escopo: 'municipal',
    }
    const com = calcularCalendarioCompetencia(2026, 10, {
      ...CONFIG_PADRAO_DIAS,
      feriadosCadastrados: [feriado],
    })
    const sem = calcularCalendarioCompetencia(2026, 10, CONFIG_PADRAO_DIAS)
    push(
      'C3-6 feriado cadastrado em dia útil (07/10/2026) remove 1 dia útil',
      `sem cadastro: ${sem.diasUteis} úteis; com cadastro: ${com.diasUteis} úteis / ${com.diasRepouso} repouso`,
      sem.diasUteis === 26 && com.diasUteis === 25 && com.diasRepouso === 6,
    )
  }

  // ---------------------------------------------------------------------
  // C3-7 — feriado CADASTRADO DUPLICADO não reduz duas vezes.
  // ---------------------------------------------------------------------
  {
    const f1: FeriadoCadastrado = {
      id: 'a',
      nome: 'Feriado municipal',
      dia: 7,
      mes: 10,
      ano: 2026,
      escopo: 'municipal',
    }
    const f2: FeriadoCadastrado = {
      id: 'b',
      nome: 'Feriado municipal (cadastro repetido)',
      dia: 7,
      mes: 10,
      ano: 2026,
      escopo: 'municipal',
    }
    const com = calcularCalendarioCompetencia(2026, 10, {
      ...CONFIG_PADRAO_DIAS,
      feriadosCadastrados: [f1, f2],
    })
    push(
      'C3-7 feriado duplicado no cadastro (07/10 duas vezes) remove só 1 dia útil',
      `úteis: ${com.diasUteis}; repouso: ${com.diasRepouso}`,
      com.diasUteis === 25 && com.diasRepouso === 6,
    )
  }

  // ---------------------------------------------------------------------
  // C3-8 — feriado cadastrado em DOMINGO não duplica o repouso.
  // ---------------------------------------------------------------------
  {
    // 04/10/2026 é domingo; 01/11/2026 é domingo (sem feriado nacional nesse dia).
    const feriado: FeriadoCadastrado = {
      id: 'f-dom',
      nome: 'Feriado que cai em domingo',
      dia: 4,
      mes: 10,
      ano: 2026,
      escopo: 'avulso',
    }
    const com = calcularCalendarioCompetencia(2026, 10, {
      ...CONFIG_PADRAO_DIAS,
      feriadosCadastrados: [feriado],
    })
    const sem = calcularCalendarioCompetencia(2026, 10, CONFIG_PADRAO_DIAS)
    push(
      'C3-8 feriado cadastrado em domingo (04/10/2026) NÃO duplica o repouso',
      `sem cadastro: ${sem.diasUteis}/${sem.diasRepouso}; com cadastro: ${com.diasUteis}/${com.diasRepouso}`,
      com.diasUteis === sem.diasUteis && com.diasRepouso === sem.diasRepouso,
    )
  }

  // ---------------------------------------------------------------------
  // C3-9 — alteração de QUANTIDADE muda comissão e DSR em cadeia.
  // ---------------------------------------------------------------------
  {
    const antes = calcularSnapshotComissaoDsr({
      ano: 2026,
      mes: 10,
      comissao: { modalidade: 'casos', qtdCasos: 44, valorCaso: 20 },
    })
    const depois = calcularSnapshotComissaoDsr({
      ano: 2026,
      mes: 10,
      comissao: { modalidade: 'casos', qtdCasos: 50, valorCaso: 20 },
    })
    push(
      'C3-9 mudar a quantidade (44→50 casos) recalcula comissão e DSR em cadeia',
      `antes: ${formatar(antes.snapshot!.comissaoTotalCentavos)} / DSR ${formatar(antes.snapshot!.dsrCentavos)}; depois: ${formatar(depois.snapshot!.comissaoTotalCentavos)} / DSR ${formatar(depois.snapshot!.dsrCentavos)}`,
      antes.snapshot?.comissaoTotalCentavos === 88000 &&
        antes.snapshot?.dsrCentavos === 16923 &&
        depois.snapshot?.comissaoTotalCentavos === 100000 &&
        depois.snapshot?.dsrCentavos === Math.floor((100000 * 5) / 26 + 0.5),
    )
  }

  // ---------------------------------------------------------------------
  // C3-10 — alteração do VALOR UNITÁRIO muda comissão e DSR em cadeia.
  // ---------------------------------------------------------------------
  {
    const antes = calcularSnapshotComissaoDsr({
      ano: 2026,
      mes: 10,
      comissao: { modalidade: 'casos', qtdCasos: 44, valorCaso: 20 },
    })
    const depois = calcularSnapshotComissaoDsr({
      ano: 2026,
      mes: 10,
      comissao: { modalidade: 'casos', qtdCasos: 44, valorCaso: 25.5 },
    })
    push(
      'C3-10 mudar o valor unitário (R$ 20,00→25,50) recalcula comissão e DSR em cadeia',
      `antes: ${formatar(antes.snapshot!.comissaoTotalCentavos)}; depois: ${formatar(depois.snapshot!.comissaoTotalCentavos)} / DSR ${formatar(depois.snapshot!.dsrCentavos)}`,
      depois.snapshot?.comissaoTotalCentavos === 44 * 2550 &&
        depois.snapshot?.dsrCentavos === Math.floor((44 * 2550 * 5) / 26 + 0.5),
    )
  }

  // ---------------------------------------------------------------------
  // C3-11 — valores inválidos são recusados.
  // ---------------------------------------------------------------------
  {
    const casos: Array<[string, EntradaComissao]> = [
      ['quantidade NaN', { modalidade: 'casos', qtdCasos: NaN, valorCaso: 20 }],
      ['quantidade negativa', { modalidade: 'casos', qtdCasos: -1, valorCaso: 20 }],
      ['quantidade fracionária', { modalidade: 'casos', qtdCasos: 10.5, valorCaso: 20 }],
      ['valor por caso NaN', { modalidade: 'casos', qtdCasos: 10, valorCaso: NaN }],
      ['valor por caso negativo', { modalidade: 'casos', qtdCasos: 10, valorCaso: -0.01 }],
      ['valor direto negativo', { modalidade: 'valor_direto', valorDireto: -100 }],
    ]
    const recusados = casos.filter(([_, e]) => !calcularComissao(e).ok)
    const modalidadeRuim = calcularComissao({ modalidade: 'x' as never })
    push(
      'C3-11 entradas inválidas recusadas (NaN, negativos, qtd fracionária, modalidade desconhecida)',
      `${recusados.length}/${casos.length} recusadas; modalidade inválida: ${modalidadeRuim.ok ? 'ACEITA (não deveria!)' : 'recusada'}`,
      recusados.length === casos.length && !modalidadeRuim.ok,
    )
  }

  // ---------------------------------------------------------------------
  // C3-12 — arredondamento monetário (half-up) em centavos.
  // ---------------------------------------------------------------------
  {
    // 10000 × 1/3 = 3333,33… → 3333 (half-down do fracionário)
    const a = calcularDSR({ comissaoCentavos: 10000, diasUteis: 3, diasRepouso: 1 })
    // 10000 × 2/3 = 6666,66… → 6667 (half-up do fracionário)
    const b = calcularDSR({ comissaoCentavos: 10000, diasUteis: 3, diasRepouso: 2 })
    // meio exato: 1 centavo × 1/2 → 0,5 → 1 (half-up)
    const c = calcularDSR({ comissaoCentavos: 1, diasUteis: 2, diasRepouso: 1 })
    // conversão reais→centavos na borda de I/O: 20,005 → 2001 (half-up)
    const conv = reaisParaCentavos(20.005)
    push(
      'C3-12 arredondamento half-up em centavos (3333 / 6667 / 1 / conversão 2001)',
      `1/3: ${a.dsrCentavos}; 2/3: ${b.dsrCentavos}; meio centavo: ${c.dsrCentavos}; reaisParaCentavos(20,005): ${conv}`,
      a.dsrCentavos === 3333 && b.dsrCentavos === 6667 && c.dsrCentavos === 1 && conv === 2001,
    )
  }

  // ---------------------------------------------------------------------
  // C3-13 — competências de meses diferentes não se contaminam.
  // ---------------------------------------------------------------------
  {
    const out = calcularSnapshotComissaoDsr({
      ano: 2026,
      mes: 10,
      comissao: { modalidade: 'casos', qtdCasos: 44, valorCaso: 20 },
    })
    const nov = calcularSnapshotComissaoDsr({
      ano: 2026,
      mes: 11,
      comissao: { modalidade: 'casos', qtdCasos: 44, valorCaso: 20 },
    })
    const mesmaComissao =
      out.snapshot?.comissaoTotalCentavos === nov.snapshot?.comissaoTotalCentavos
    push(
      'C3-13 mesma comissão em meses diferentes → DSRs diferentes (calendários independentes)',
      `out: ${out.snapshot?.diasUteis}/${out.snapshot?.diasRepouso} → ${formatar(out.snapshot!.dsrCentavos)}; nov: ${nov.snapshot?.diasUteis}/${nov.snapshot?.diasRepouso} → ${formatar(nov.snapshot!.dsrCentavos)}`,
      mesmaComissao &&
        out.snapshot?.diasUteis === 26 &&
        out.snapshot?.diasRepouso === 5 &&
        nov.snapshot?.diasUteis === 23 &&
        nov.snapshot?.diasRepouso === 7 &&
        out.snapshot?.dsrCentavos === 16923 &&
        nov.snapshot?.dsrCentavos === 26783,
    )
  }

  // ---------------------------------------------------------------------
  // C3-14 — ajuste manual JUSTIFICADO sobrescreve os dias do calendário.
  // ---------------------------------------------------------------------
  {
    const snap = calcularSnapshotComissaoDsr({
      ano: 2026,
      mes: 10,
      comissao: { modalidade: 'casos', qtdCasos: 44, valorCaso: 20 },
      ajusteDias: {
        diasUteis: 24,
        diasRepouso: 7,
        motivo: 'Fechado na quinta pelo recesso do escritório',
      },
    })
    push(
      'C3-14 ajuste manual justificado (24/7) sobrescreve o calendário (26/5) e grava o motivo',
      `úteis: ${snap.snapshot?.diasUteis} (calendário: ${snap.snapshot?.calendarioDiasUteis}); repouso: ${snap.snapshot?.diasRepouso} (calendário: ${snap.snapshot?.calendarioDiasRepouso}); motivo: ${snap.snapshot?.motivoAjuste}`,
      snap.ok === true &&
        snap.snapshot?.ajustado === true &&
        snap.snapshot?.diasUteis === 24 &&
        snap.snapshot?.diasRepouso === 7 &&
        snap.snapshot?.calendarioDiasUteis === 26 &&
        snap.snapshot?.calendarioDiasRepouso === 5 &&
        snap.snapshot?.dsrCentavos === Math.floor((88000 * 7) / 24 + 0.5) &&
        !!snap.snapshot?.motivoAjuste,
    )
  }

  // ---------------------------------------------------------------------
  // C3-15 — ajuste manual SEM motivo é recusado.
  // ---------------------------------------------------------------------
  {
    const semMotivo = calcularSnapshotComissaoDsr({
      ano: 2026,
      mes: 10,
      comissao: { modalidade: 'casos', qtdCasos: 44, valorCaso: 20 },
      ajusteDias: { diasUteis: 24, diasRepouso: 7, motivo: '   ' },
    })
    const motivoCurto = calcularSnapshotComissaoDsr({
      ano: 2026,
      mes: 10,
      comissao: { modalidade: 'casos', qtdCasos: 44, valorCaso: 20 },
      ajusteDias: { diasUteis: 24, diasRepouso: 7, motivo: 'ok' },
    })
    push(
      'C3-15 ajuste manual sem motivo (ou motivo < 3 caracteres) é recusado',
      `sem motivo: ${semMotivo.ok ? 'ACEITO (não deveria!)' : 'recusado — ' + semMotivo.erro}; motivo curto: ${motivoCurto.ok ? 'ACEITO (não deveria!)' : 'recusado'}`,
      semMotivo.ok === false && !!semMotivo.erro && motivoCurto.ok === false,
    )
  }

  // ---------------------------------------------------------------------
  // C3-16 — snapshot sem comissão: DSR zero e nada planejado.
  // ---------------------------------------------------------------------
  {
    const snap = calcularSnapshotComissaoDsr({ ano: 2026, mes: 10 })
    const plano = planejarLancamentosComissaoDsr(snap.snapshot!, [])
    push(
      'C3-16 sem comissão informada: snapshot ok, DSR zero, nenhuma rubrica planejada',
      `comissaoAtiva: ${snap.snapshot?.comissaoAtiva}; DSR: ${snap.snapshot?.dsrCentavos}; comissao.acao: ${plano.comissao.acao}; dsr.acao: ${plano.dsr.acao}`,
      snap.ok === true &&
        snap.snapshot?.comissaoAtiva === false &&
        snap.snapshot?.dsrCentavos === 0 &&
        plano.comissao.acao === 'nada' &&
        plano.dsr.acao === 'nada',
    )
  }

  // ---------------------------------------------------------------------
  // C3-17 — planejamento dos lançamentos (criar/atualizar/substituir manual).
  // ---------------------------------------------------------------------
  {
    const snap = calcularSnapshotComissaoDsr({
      ano: 2026,
      mes: 10,
      comissao: { modalidade: 'casos', qtdCasos: 44, valorCaso: 20 },
    })
    const s = snap.snapshot!

    // (a) sem nada → cria as duas rubricas com os rótulos padrão:
    const a = planejarLancamentosComissaoDsr(s, [])
    // (b) já existem as rubricas calculadas → ATUALIZA (nunca duplica):
    const existentes: LancamentoExistente[] = [
      {
        id: 'l1',
        origem: 'comissao',
        natureza_tipo: 'vencimento',
        descricao: RUBRICA_COMISSAO,
        valorCentavos: 1,
      },
      {
        id: 'l2',
        origem: 'dsr_comissao',
        natureza_tipo: 'vencimento',
        descricao: RUBRICA_DSR,
        valorCentavos: 2,
      },
    ]
    const b = planejarLancamentosComissaoDsr(s, existentes)
    // (c) comissão manual antiga detectada → pede decisão (nada é apagado):
    const c = planejarLancamentosComissaoDsr(s, [
      {
        origem: 'manual',
        natureza_tipo: 'vencimento',
        descricao: 'Comissão informada manualmente',
        valorCentavos: 50000,
      },
    ])

    push(
      'C3-17 plano de lançamentos: cria quando vazio, atualiza quando já existe, detecta manual e pede decisão',
      `a: criar/${a.comissao.acao === 'criar' && a.dsr.acao === 'criar'}; b: atualizar (ids ${b.comissao.id}/${b.dsr.id}); c: precisaDecisao=${c.precisaDecisao}, acoes ${c.comissao.acao}/${c.dsr.acao}`,
      a.comissao.acao === 'criar' &&
        a.comissao.valorCentavos === 88000 &&
        a.dsr.acao === 'criar' &&
        a.dsr.valorCentavos === 16923 &&
        b.comissao.acao === 'atualizar' &&
        b.comissao.id === 'l1' &&
        b.dsr.acao === 'atualizar' &&
        b.dsr.id === 'l2' &&
        c.precisaDecisao === true &&
        c.comissao.acao === 'nada' &&
        c.dsr.acao === 'nada',
    )
  }

  // ---------------------------------------------------------------------
  // C3-18 — sanidade dos utilitários de data/calendário.
  // ---------------------------------------------------------------------
  {
    const mapa = feriadosDoMes(2026, 11, CONFIG_PADRAO_DIAS)
    const ok15 = mapa.has('2026-11-15') && mapa.has('2026-11-02') && mapa.has('2026-11-20')
    const okDiaSemana = diaSemanaDeYMD(paraYMD(2026, 11, 15)) === 0
    const okSemDuplicidade = [...mapa.keys()].filter((k) => k === '2026-11-15').length === 1
    push(
      'C3-18 mapa de feriados de nov/2026 completo (02, 15, 20) sem duplicidade; 15/11 = domingo',
      `feriados: ${[...mapa.keys()].sort().join(', ')}; diaSemana(15/11): ${diaSemanaDeYMD(paraYMD(2026, 11, 15))}`,
      ok15 && okDiaSemana && okSemDuplicidade,
    )
  }

  return cenarios
}
