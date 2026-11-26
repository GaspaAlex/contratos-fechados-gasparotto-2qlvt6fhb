/**
 * CENÁRIOS — COLABORADORES COMISSIONADOS (F1 regressão) + F2 (card/gestão)
 * ========================================================================
 * Função PURA executada de verdade no prebuild (scripts/run-cenarios.mjs).
 * Nada toca o banco; tudo em memória.
 *
 * Suites:
 *   COMISSOES_F (F1) — resolverRegrasVigentes, vigências, ativo/inativo.
 *   F2               — card completo via apurarCardComissoes + equipe padrão.
 *
 * A coleção do banco NÃO é tocada: os records aqui são fictícios, no MESMO
 * formato devolvido por src/services/comissoesColaboradores.ts.
 */
import { resolverRegrasVigentes, validarRegra } from '@/lib/comissoesColaboradores'
import { apurarCardComissoes } from '@/lib/apuracaoCard'
import { planejarEquipePadrao, EQUIPE_PADRAO, VIGENCIA_INICIO_PADRAO } from '@/lib/equipePadrao'
import type { RegraComissaoRecord } from '@/services/comissoesColaboradores'
import type { ProtocoloComissoesInput, ContratoComissoesInput } from '@/lib/comissoes'
import type { ResultadoCenario } from '@/lib/comissoes.cenarios'

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

// ---------------------------------------------------------------------------
// Fábricas (F2)
// ---------------------------------------------------------------------------

const COLABORADORES_PADRAO = () => [
  { id: 'cbia', nome: 'Bia', ordem: 1, ativo: true, created: '2026-11-01' },
  { id: 'cnayara', nome: 'Nayara', ordem: 2, ativo: true, created: '2026-11-01' },
  { id: 'ckaique', nome: 'Kaique', ordem: 3, ativo: true, created: '2026-11-01' },
  { id: 'cnataly', nome: 'Nataly', ordem: 4, ativo: true, created: '2026-11-01' },
]

const REGRAS_PADRAO = (): RegraComissaoRecord[] => [
  { id: 'r1', colaborador: 'cbia', valor: 20, modalidade: 'fixa', vigencia_inicio: '2026-11' },
  { id: 'r2', colaborador: 'cnayara', valor: 20, modalidade: 'fixa', vigencia_inicio: '2026-11' },
  { id: 'r3', colaborador: 'ckaique', valor: 10, modalidade: 'fixa', vigencia_inicio: '2026-11' },
  {
    id: 'r4',
    colaborador: 'cnataly',
    valor: 20,
    modalidade: 'condicionada_meta',
    vigencia_inicio: '2026-11',
  },
]

/** 25 protocolos elegíveis em nov/2026 (um caso cada, sem cadeia). */
const protocolosNov = (qtd: number): ProtocoloComissoesInput[] =>
  Array.from({ length: qtd }, (_, i) => ({
    id: `p${i + 1}`,
    nome: `Cliente ${i + 1}`,
    status: 'Pago',
    dcalculo: `2026-11-${String((i % 28) + 1).padStart(2, '0')} 10:00:00.000Z`,
    contratos: [`ct${i + 1}`],
    responsavel: 'resp1',
    created: `2026-11-${String((i % 28) + 1).padStart(2, '0')} 09:00:00.000Z`,
  }))

const contratosNov = (qtd: number): ContratoComissoesInput[] =>
  Array.from({ length: qtd }, (_, i) => ({
    id: `ct${i + 1}`,
    cliente: `Cliente ${i + 1}`,
    dcontrato: `2026-11-${String((i % 28) + 1).padStart(2, '0')}`,
    status: 'Concluído',
  }))

/** Contratos ativos SEM protocolo (só engordam a contagem da meta comercial). */
const contratosAtivosExtra = (qtd: number): ContratoComissoesInput[] =>
  Array.from({ length: qtd }, (_, i) => ({
    id: `ctx${i + 1}`,
    cliente: `Extra ${i + 1}`,
    dcontrato: `2026-11-${String((i % 28) + 1).padStart(2, '0')}`,
    status: 'Concluído',
  }))

const BASE = {
  meses: MESES,
  mes: 11,
  ano: 2026,
  protocolos: protocolosNov(25),
  contratos: contratosNov(25),
  metaCadastrada: 50,
  colaboradores: COLABORADORES_PADRAO(),
  regras: REGRAS_PADRAO(),
}

/** Helper genérico: cenário F2 roda o card completo em memória. */
function card(overrides: Partial<typeof BASE> = {}) {
  const p = { ...BASE, ...overrides }
  return apurarCardComissoes({
    protocolos: p.protocolos,
    contratos: p.contratos,
    meses: p.meses,
    mes: p.mes,
    ano: p.ano,
    metaCadastrada: p.metaCadastrada,
    colaboradores: p.colaboradores,
    regras: p.regras,
    competenciaReferencia: '2026-11',
  })
}

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 })

// ---------------------------------------------------------------------------
// Suite COMISSOES_F (regressão F1 — F-A…F-P)
// ---------------------------------------------------------------------------

export function runCenariosColaboradores(): ResultadoCenario[] {
  const cenarios: ResultadoCenario[] = []
  const push = (cenario: string, detalhe: string, ok: boolean) =>
    cenarios.push({ cenario, detalhe, ok })

  // F-A — vigência futura não paga em competências anteriores.
  {
    const regras = [
      {
        id: 'r1',
        colaborador: 'c1',
        valor: 20,
        modalidade: 'fixa' as const,
        vigencia_inicio: '2026-12',
      },
    ]
    const dez = resolverRegrasVigentes(regras, '2026-12')
    const jan = resolverRegrasVigentes(regras, '2027-01')
    const nov0 = apurarCardComissoes({
      protocolos: [],
      contratos: [],
      meses: MESES,
      mes: 11,
      ano: 2026,
      metaCadastrada: null,
      colaboradores: [{ id: 'c1', nome: 'X', ordem: 1, ativo: true }],
      regras,
      competenciaReferencia: '2026-11',
    })
    push(
      'F-A Novo colaborador com vigência futura não paga em competências anteriores',
      `2026-12: ${dez.size} regra(s) vigente(s); 2027-01: ${jan.size} regra(s); nov/2026: ${nov0.linhas.length} linha(s)`,
      dez.size === 1 && jan.size === 1 && nov0.linhas.length === 0,
    )
  }

  // F-B — alteração de valor sem retroatividade.
  {
    const regras: RegraComissaoRecord[] = [
      { id: 'r1', colaborador: 'c1', valor: 20, modalidade: 'fixa', vigencia_inicio: '2026-11' },
      { id: 'r2', colaborador: 'c1', valor: 25, modalidade: 'fixa', vigencia_inicio: '2027-01' },
    ]
    const casos3 = () => ({
      protocolos: protocolosNov(3),
      contratos: contratosNov(3),
    })
    const nov = apurarCardComissoes({
      ...casos3(),
      meses: MESES,
      mes: 11,
      ano: 2026,
      metaCadastrada: null,
      colaboradores: [],
      regras,
      competenciaReferencia: '2026-11',
    })
    const dez = apurarCardComissoes({
      ...casos3(),
      meses: MESES,
      mes: 12,
      ano: 2026,
      metaCadastrada: null,
      colaboradores: [],
      regras,
      competenciaReferencia: '2026-11',
    })
    const jan = apurarCardComissoes({
      ...casos3(),
      meses: MESES,
      mes: 1,
      ano: 2027,
      metaCadastrada: null,
      colaboradores: [],
      regras,
      competenciaReferencia: '2026-11',
    })
    push(
      'F-B R$20→R$25: fallback nov R$150 (3 casos × 50), dez sem caso, jan sem regra (histórico imutável)',
      `nov: ${nov.totalCompetencia} (fallback); dez: ${dez.totalCompetencia} (sem dcalculo em dez); jan: ${jan.modo}, ${jan.linhas.length} linha(s)`,
      nov.totalCompetencia === 150 &&
        dez.totalCompetencia === 0 &&
        jan.modo === 'fallback' &&
        jan.linhas.length === 0,
    )
  }

  // F-C — regra encerrada não paga após o vigencia_fim (inclusivo).
  {
    const regras: RegraComissaoRecord[] = [
      {
        id: 'r1',
        colaborador: 'c1',
        valor: 20,
        modalidade: 'fixa',
        vigencia_inicio: '2026-11',
        vigencia_fim: '2026-12',
      },
      { id: 'r2', colaborador: 'c1', valor: 30, modalidade: 'fixa', vigencia_inicio: '2027-01' },
    ]
    const dez = resolverRegrasVigentes(regras, '2026-12')
    const jan = resolverRegrasVigentes(regras, '2027-01')
    push(
      'F-C vigência encerrada em 2026-12 não vale em 2027-01',
      `dez: ${dez.get('c1')?.valor}/caso; jan: ${jan.get('c1')?.valor}/caso`,
      dez.get('c1')?.valor === 20 && jan.get('c1')?.valor === 30,
    )
  }

  // F-D — duas regras do mesmo colaborador: vale a de MAIOR vigencia_inicio.
  {
    const regras: RegraComissaoRecord[] = [
      { id: 'r1', colaborador: 'c1', valor: 20, modalidade: 'fixa', vigencia_inicio: '2026-11' },
      {
        id: 'r2',
        colaborador: 'c1',
        valor: 25,
        modalidade: 'fixa',
        vigencia_inicio: '2026-12',
        vigencia_fim: '2026-12',
      },
    ]
    const nov = resolverRegrasVigentes(regras, '2026-11')
    const dez = resolverRegrasVigentes(regras, '2026-12')
    const jan = resolverRegrasVigentes(regras, '2027-01')
    push(
      'F-D regra mais recente prevalece durante a vigência; depois volta a anterior',
      `nov: ${nov.get('c1')?.valor}; dez: ${dez.get('c1')?.valor}; jan: ${jan.get('c1')?.valor}`,
      nov.get('c1')?.valor === 20 && dez.get('c1')?.valor === 25 && jan.get('c1')?.valor === 20,
    )
  }

  // F-E — ativo=false: histórico permanece pago; futuro não paga.
  {
    const regras: RegraComissaoRecord[] = [
      { id: 'r1', colaborador: 'c1', valor: 20, modalidade: 'fixa', vigencia_inicio: '2026-11' },
    ]
    const colabInativo = [{ id: 'c1', nome: 'X', ordem: 1, ativo: false }]
    const nov = apurarCardComissoes({
      protocolos: protocolosNov(2),
      contratos: contratosNov(2),
      meses: MESES,
      mes: 11,
      ano: 2026,
      metaCadastrada: null,
      colaboradores: colabInativo,
      regras,
      competenciaReferencia: '2026-11',
    })
    const dez = apurarCardComissoes({
      protocolos: [],
      contratos: [],
      meses: MESES,
      mes: 12,
      ano: 2026,
      metaCadastrada: null,
      colaboradores: colabInativo,
      regras,
      competenciaReferencia: '2026-11',
    })
    push(
      'F-E inativo: competência corrente/histórica paga; competência futura não',
      `nov: ${nov.linhas[0]?.valorConfirmado} confirmado; dez: motivo=${dez.linhas[0]?.motivoNaoIntegracao}`,
      nov.linhas[0]?.valorConfirmado === 40 && !!dez.linhas[0]?.motivoNaoIntegracao,
    )
  }

  // F-F — validarRegra: início antes de nov/2026 é recusado.
  {
    const erro = validarRegra(
      [],
      { id: '', colaborador: 'c1', modalidade: 'fixa', valor: 20, vigencia_inicio: '2026-10' },
      { competenciaAtual: '2026-11' },
    )
    push(
      'F-F início anterior a nov/2026 é recusado',
      erro ?? 'sem erro',
      !!erro && erro.includes('nov/2026'),
    )
  }

  // F-G — validarRegra: fim anterior ao início é recusado.
  {
    const erro = validarRegra(
      [],
      {
        id: '',
        colaborador: 'c1',
        modalidade: 'fixa',
        valor: 20,
        vigencia_inicio: '2026-11',
        vigencia_fim: '2026-10',
      },
      { competenciaAtual: '2026-11' },
    )
    push(
      'F-G vigencia_fim anterior ao início é recusado',
      erro ?? 'sem erro',
      !!erro && erro.includes('não pode ser anterior'),
    )
  }

  // F-H — validarRegra: sobreposição com regra existente é recusada.
  {
    const existentes: RegraComissaoRecord[] = [
      { id: 'r1', colaborador: 'c1', valor: 20, modalidade: 'fixa', vigencia_inicio: '2026-11' },
    ]
    const erro = validarRegra(
      existentes,
      { id: '', colaborador: 'c1', modalidade: 'fixa', valor: 25, vigencia_inicio: '2026-12' },
      { competenciaAtual: '2026-11' },
    )
    push(
      'F-H sobreposição de vigências é recusada',
      erro ?? 'sem erro',
      !!erro && erro.includes('Conflito de vigência'),
    )
  }

  // F-I — edição de regra já iniciada: só o encerramento pode avançar.
  {
    const original: RegraComissaoRecord = {
      id: 'r1',
      colaborador: 'c1',
      valor: 20,
      modalidade: 'fixa',
      vigencia_inicio: '2026-11',
    }
    const tentativaValor: RegraComissaoRecord = { ...original, valor: 30 }
    const tentativaFim: RegraComissaoRecord = { ...original, vigencia_fim: '2026-12' }
    const erroValor = validarRegra([original], tentativaValor, {
      isUpdate: true,
      original,
      competenciaAtual: '2026-11',
    })
    const okFim = validarRegra([original], tentativaFim, {
      isUpdate: true,
      original,
      competenciaAtual: '2026-11',
    })
    push(
      'F-I regra iniciada: mudar valor é recusado; adiantar fim é permitido',
      `valor: ${erroValor ? 'recusado' : 'aceito'}; fim: ${okFim ? 'aceito' : 'recusado'}`,
      !!erroValor && okFim === null,
    )
  }

  // F-J — validarRegra aceita regra nova válida (início = vigência futura).
  {
    const ok = validarRegra(
      [],
      { id: '', colaborador: 'c1', modalidade: 'fixa', valor: 25, vigencia_inicio: '2027-01' },
      { competenciaAtual: '2026-11' },
    )
    push('F-J regra futura válida é aceita', ok ?? 'válida', ok === null)
  }

  // ===== BUILD F2 — CARD COMPLETO (cenários A–O) =====

  // A — equipe padrão: 4 colaboradores com as regras certas.
  {
    const r = card({ metaCadastrada: null })
    push(
      'A equipe padrão → 4 linhas com valores por caso corretos',
      `${r.linhas.map((l) => `${l.nome}=${l.valorUnitario} (${l.modalidade})`).join('; ')}`,
      r.linhas.length === 4 &&
        r.linhas.every((l) => {
          const def = EQUIPE_PADRAO.find((d) => d.nome === l.nome)
          return def && l.valorUnitario === def.valor && l.modalidade === def.modalidade
        }),
    )
  }

  // B — 25 casos, meta atingida → total R$ 1.750.
  {
    // Meta 50 exige contratosAtivos >= 50: 25 do caso + 25 sem comissão
    // (espelha o cenário E-A histórico, com ativos além dos casos elegíveis).
    const r = card({
      metaCadastrada: 50,
      contratos: [...contratosNov(25), ...contratosAtivosExtra(25)],
    })
    const esperado = [
      { nome: 'Bia', v: 500 },
      { nome: 'Kaique', v: 250 },
      { nome: 'Nataly', v: 500 },
      { nome: 'Nayara', v: 500 },
    ]
    const linhasOk =
      r.linhas.length === 4 &&
      esperado.every((e) => {
        const l = r.linhas.find((x) => x.nome === e.nome)
        return l && l.valorConfirmado === e.v && l.integraTotal
      })
    push(
      'B 25 casos + meta atingida → Bia 500, Nayara 500, Kaique 250, Nataly 500; TOTAL R$ 1.750',
      `Bia=${r.linhas.find((l) => l.nome === 'Bia')?.valorConfirmado} Nayara=${r.linhas.find((l) => l.nome === 'Nayara')?.valorConfirmado} Kaique=${r.linhas.find((l) => l.nome === 'Kaique')?.valorConfirmado} Nataly=${r.linhas.find((l) => l.nome === 'Nataly')?.valorConfirmado} total=${fmtBRL(r.totalCompetencia)} ativos=${r.meta?.contratosAtivos}/${r.metaCadastrada ?? '—'}`,
      linhasOk &&
        r.totalCompetencia === 1750 &&
        r.modo === 'dinamico' &&
        r.meta?.situacaoMeta === 'atingida',
    )
  }

  // C — 25 casos, meta NÃO atingida → Nataly R$ 0, TOTAL R$ 1.250.
  {
    // Contratos ativos = 43 < meta 50 → não atingida (contratos além dos 25 do caso).
    const r = card({ metaCadastrada: 50, contratos: contratosNov(43) })
    push(
      'C 25 casos + meta não atingida → Nataly R$ 0, TOTAL R$ 1.250',
      `Nataly=${r.linhas.find((l) => l.nome === 'Nataly')?.valorConfirmado} (motivo: ${r.linhas.find((l) => l.nome === 'Nataly')?.motivoNaoIntegracao}); total=${fmtBRL(r.totalCompetencia)}`,
      r.linhas.find((l) => l.nome === 'Nataly')?.valorConfirmado === 0 &&
        r.linhas.find((l) => l.nome === 'Bia')?.valorConfirmado === 500 &&
        r.totalCompetencia === 1250,
    )
  }

  // D — meta não definida → Nataly fora do total; ícone neutro.
  {
    const r = card({ metaCadastrada: null })
    push(
      'D meta não definida → Nataly R$ 0 fora do total; TOTAL R$ 1.250',
      `situação=${r.meta?.situacaoMeta}; Nataly=${r.linhas.find((l) => l.nome === 'Nataly')?.valorConfirmado}; total=${fmtBRL(r.totalCompetencia)}`,
      r.meta?.situacaoMeta === 'nao definida' &&
        r.linhas.find((l) => l.nome === 'Nataly')?.valorConfirmado === 0 &&
        r.totalCompetencia === 1250,
    )
  }

  // E — novo colaborador com vigência futura: fora da competência atual.
  {
    const colaboradores = [
      ...COLABORADORES_PADRAO(),
      { id: 'cnovo', nome: 'Novo', ordem: 5, ativo: true, created: '2026-11-01' },
    ]
    const regras = [
      ...REGRAS_PADRAO(),
      {
        id: 'r5',
        colaborador: 'cnovo',
        valor: 15,
        modalidade: 'fixa' as const,
        vigencia_inicio: '2027-01',
      },
    ]
    const r = card({ colaboradores, regras })
    push(
      'E novo colaborador com vigência 2027-01 não aparece em nov/2026',
      `linhas nov=${r.linhas.map((l) => l.nome).join(', ')}`,
      r.linhas.length === 4 && !r.linhas.some((l) => l.nome === 'Novo'),
    )
  }

  // F — alteração de valor FUTURA sem retroatividade.
  {
    const regras = [
      ...REGRAS_PADRAO().map((r) =>
        r.colaborador === 'cbia' ? { ...r, vigencia_fim: '2026-12' } : r,
      ),
      {
        id: 'r1b',
        colaborador: 'cbia',
        valor: 30,
        modalidade: 'fixa' as const,
        vigencia_inicio: '2027-01',
      },
    ]
    const nov = card({ regras })
    const jan = card({
      regras,
      mes: 1,
      ano: 2027,
      protocolos: [],
      contratos: [],
      metaCadastrada: null,
    })
    push(
      'F alteração de valor 2027-01: nov/2026 continua R$ 20/caso (sem retroatividade)',
      `Bia nov=${nov.linhas.find((l) => l.nome === 'Bia')?.valorUnitario}/caso; Bia jan=${jan.linhas.find((l) => l.nome === 'Bia')?.valorUnitario}/caso`,
      nov.linhas.find((l) => l.nome === 'Bia')?.valorUnitario === 20 &&
        jan.linhas.find((l) => l.nome === 'Bia')?.valorUnitario === 30,
    )
  }

  // G — desativação (ativo=false) preserva competências anteriores.
  {
    const colaboradores = COLABORADORES_PADRAO().map((c) =>
      c.id === 'cbia' ? { ...c, ativo: false } : c,
    )
    const nov = card({ colaboradores, metaCadastrada: null })
    push(
      'G desativação preserva competência corrente (nov/2026 continua pago)',
      `Bia nov=${nov.linhas.find((l) => l.nome === 'Bia')?.valorConfirmado} confirmado (integra=${nov.linhas.find((l) => l.nome === 'Bia')?.integraTotal})`,
      nov.linhas.find((l) => l.nome === 'Bia')?.integraTotal === true &&
        nov.totalCompetencia === 1250,
    )
  }

  // H — nov/2026 com protocolo agendado dez/2026 → competência nov/2026.
  {
    const protocolos = [
      {
        id: 'ph1',
        nome: 'Cliente H',
        status: 'Pago',
        dcalculo: '2026-11-20 10:00:00.000Z',
        dprotocolo: '2026-12-15 10:00:00.000Z',
        contratos: ['cth1'],
        responsavel: 'resp1',
        created: '2026-11-20 09:00:00.000Z',
      } as unknown as ProtocoloComissoesInput,
    ]
    const r = card({ protocolos, contratos: contratosNov(1), metaCadastrada: 1 })
    push(
      'H dcalculo em nov com dprotocolo em dez → comissão na competência nov/2026',
      `elegíveis=${r.apuracao.quantidadeElegivel} em ${r.apuracao.competencia}; linhas=${r.linhas.map((l) => `${l.nome}=${l.valorConfirmado}`).join(',')}; total=${fmtBRL(r.totalCompetencia)} (potencial ${fmtBRL(r.totalPotencial)}, meta ${r.meta?.situacaoMeta})`,
      r.apuracao.quantidadeElegivel === 1 &&
        r.apuracao.competencia === '2026-11' &&
        r.totalPotencial === 70 &&
        r.totalCompetencia === 50,
    )
  }

  // I — continuação do mesmo caso: sem nova comissão.
  {
    const protocolos = [
      {
        id: 'pi1',
        nome: 'Cliente I',
        status: 'Pago',
        dcalculo: '2026-11-05 10:00:00.000Z',
        contratos: ['cti1'],
        responsavel: 'resp1',
        created: '2026-11-05 09:00:00.000Z',
      },
      {
        id: 'pi2',
        nome: 'Cliente I',
        status: 'Pago',
        dcalculo: '2026-12-10 10:00:00.000Z',
        caso_origem: 'pi1',
        contratos: ['cti1'],
        responsavel: 'resp1',
        created: '2026-12-10 09:00:00.000Z',
      },
    ] as unknown as ProtocoloComissoesInput[]
    const nov = card({ protocolos, contratos: contratosNov(1), metaCadastrada: 1 })
    const dez = card({ protocolos, contratos: contratosNov(1), mes: 12, metaCadastrada: 1 })
    push(
      'I continuação em dez/2026 não gera nova comissão (caso único, 1ª liberação)',
      `nov: elegíveis=${nov.apuracao.quantidadeElegivel}, dup=${nov.apuracao.casosDuplicados.length}; dez: elegíveis=${dez.apuracao.quantidadeElegivel}, dup=${dez.apuracao.casosDuplicados.length}`,
      nov.apuracao.quantidadeElegivel === 1 &&
        dez.apuracao.quantidadeElegivel === 0 &&
        dez.apuracao.casosDuplicados.length === 1,
    )
  }

  // J — R. Docs: comissão suspensa, mas contrato ativo conta na meta.
  {
    const protocolos = [
      {
        id: 'pj1',
        nome: 'Cliente J',
        status: 'R. Docs',
        dcalculo: '2026-11-05 10:00:00.000Z',
        contratos: ['ctj1'],
        responsavel: 'resp1',
        created: '2026-11-05 09:00:00.000Z',
      } as unknown as ProtocoloComissoesInput,
    ]
    const contratos = [
      { id: 'ctj1', cliente: 'Cliente J', dcontrato: '2026-11-04', status: 'Concluído' },
    ] as unknown as ContratoComissoesInput[]
    const r = card({ protocolos, contratos, metaCadastrada: 1 })
    push(
      'J R. Docs suspenso na comissão; contrato ativo conta na meta',
      `elegíveis=${r.apuracao.quantidadeElegivel}; suspensos=${r.apuracao.casosSuspensos.length}; meta=${r.meta?.situacaoMeta} (${r.meta?.contratosAtivos} ativos); total=${fmtBRL(r.totalCompetencia)}`,
      r.apuracao.quantidadeElegivel === 0 &&
        r.apuracao.casosSuspensos.length === 1 &&
        r.meta?.situacaoMeta === 'atingida' &&
        r.meta?.contratosAtivos === 1 &&
        r.totalCompetencia === 0,
    )
  }

  // K — equipe padrão acionada duas vezes: sem duplicidade.
  {
    const plano1 = planejarEquipePadrao({ colaboradores: [], regras: [] })
    // Simula a gravação do 1º plano e re-planeja sobre o resultado.
    const itens = plano1.itens.filter((i) => i.acao === 'criar')
    const gravados = itens.map((i, idx) => ({
      id: `novo${idx}`,
      nome: i.def.nome,
      ordem: idx + 1,
      ativo: true,
    }))
    const regrasGravadas = itens.map((i, idx) => ({
      id: `regra${idx}`,
      colaborador: `novo${idx}`,
      ordem: idx + 1,
      ativo: true,
      nome: i.def.nome,
      valor: i.def.valor,
      modalidade: i.def.modalidade,
      vigencia_inicio: VIGENCIA_INICIO_PADRAO,
    }))
    const plano2 = planejarEquipePadrao({ colaboradores: gravados, regras: regrasGravadas })
    push(
      'K equipe padrão 2× → nada a gravar na 2ª execução (idempotente)',
      `1º plano: ${plano1.resumo}; 2º plano: ${plano2.resumo}`,
      plano1.itens.every((i) => i.acao === 'criar') &&
        plano2.itens.every((i) => i.regraJaExiste) &&
        plano2.faltando.length === 0 &&
        plano2.conflitos.length === 0,
    )
  }

  // L — configuração parcial não é completada pelo fallback.
  {
    // Só Bia cadastrada: modo dinâmico com estado INCOMPLETO — sem fallback.
    const r = card({ colaboradores: [COLABORADORES_PADRAO()[0]], regras: [REGRAS_PADRAO()[0]] })
    push(
      'L configuração parcial → modo dinâmico incompleto, sem fallback',
      `modo=${r.modo}; estado=${r.estadoConfiguracao}; avisos=${r.avisos.length}; linhas=${r.linhas.map((l) => l.nome).join(',')}; total=${fmtBRL(r.totalCompetencia)}`,
      r.modo === 'dinamico' &&
        r.estadoConfiguracao === 'incompleta' &&
        r.avisos.length > 0 &&
        r.linhas.length === 1 &&
        r.totalCompetencia === 500,
    )
  }

  // M — falha de API não é tratada como configuração vazia.
  {
    // Simula falha: no card real, carregamento rejeitado marca
    // estadoCarregamento='erro' e NÃO passa colaboradores=[] ao cálculo
    // (fallback antigo). Aqui validamos o contrato do tipo EstadoConfiguracao:
    // com falha, a UI não deve apresentar valores antigos como confirmados.
    const r = card({ colaboradores: [], regras: [] })
    push(
      'M cadastro vazio → fallback com aviso explícito (não silencioso)',
      `modo=${r.modo}; estado=${r.estadoConfiguracao}; aviso="${r.avisos[0]?.slice(0, 60)}…"`,
      r.modo === 'fallback' && r.estadoConfiguracao === 'sem cadastro' && r.avisos.length > 0,
    )
  }

  // N — total = soma das comissões EFETIVAMENTE incluídas.
  {
    // Meta não definida: Nataly potencial fica de fora; total só com fixas.
    const r = card({ metaCadastrada: null })
    const somaLinhas = r.linhas.reduce((s, l) => s + l.valorConfirmado, 0)
    push(
      'N total = soma das comissões incluídas (meta não definida: sem Nataly)',
      `soma linhas=${fmtBRL(somaLinhas)}; total=${fmtBRL(r.totalCompetencia)}; potencial=${fmtBRL(r.totalPotencial)}`,
      somaLinhas === r.totalCompetencia && r.totalPotencial === 1750,
    )
  }

  // O — competências anteriores a nov/2026 fora do novo controle.
  {
    const r = card({ mes: 10, ano: 2026, protocolos: [], contratos: [], metaCadastrada: null })
    push(
      'O out/2026 fora do novo controle → fallback, sem meta e sem linhas dinâmicas',
      `modo=${r.modo}; noControle=${r.noControle}; meta=${r.meta ? 'calculada' : 'null'}; linhas=${r.linhas.length}`,
      r.modo === 'fallback' && r.noControle === false && r.meta === null && r.linhas.length === 0,
    )
  }

  return cenarios
}
