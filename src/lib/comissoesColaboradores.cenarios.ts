/**
 * CENÁRIOS — COLABORADORES COMISSIONADOS (F1 regressão) + F2 (card/gestão)
 * ========================================================================
 * Função PURA executada de verdade no prebuild (scripts/run-cenarios.mjs).
 * Nada toca o banco; tudo em memória.
 *
 * Suites:
 *   COMISSOES_F (F1) — resolverRegrasVigentes, vigências, ativo/inativo.
 *   F2               — card completo via apurarCardComissoes + equipe padrão.
 */
import { resolverRegrasVigentes, validarRegra } from '@/lib/comissoesColaboradores'
import { apurarCardComissoes } from '@/lib/apuracaoCard'
import { planejarEquipePadrao, EQUIPE_PADRAO } from '@/lib/equipePadrao'
import type { RegraComissaoRecord } from '@/services/comissoesColaboradores'
import type { ComissoesMeta } from '@/services/comissoesMetas'
import type {
  ProtocoloComissoesInput,
  ContratoComissoesInput,
} from '@/lib/comissoes'
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
  { id: 'r4', colaborador: 'cnataly', valor: 20, modalidade: 'condicionada_meta', vigencia_inicio: '2026-11' },
]

/** 25 protocolos elegíveis em nov/2026 (um caso cada, sem cadeia). */
const protocolosNov25 = (): ProtocoloComissoesInput[] =>
  Array.from({ length: 25 }, (_, i) => ({
    id: `p${i + 1}`,
    nome: `Cliente ${i + 1}`,
    status: 'Pago',
    dcalculo: `2026-11-${String((i % 28) + 1).padStart(2, '0')} 10:00:00.000Z`,
    contratos: [`ct${i + 1}`],
    responsavel: 'resp1',
    created: `2026-11-${String((i % 28) + 1).padStart(2, '0')} 09:00:00.000Z`,
  }))

const contratosNov25 = (): ContratoComissoesInput[] =>
  Array.from({ length: 25 }, (_, i) => ({
    id: `ct${i + 1}`,
    cliente: `Cliente ${i + 1}`,
    dcontrato: `2026-11-${String((i % 28) + 1).padStart(2, '0')}`,
    status: 'Concluído',
  }))

const BASE = {
  meses: MESES,
  mes: 11,
  ano: 2026,
  protocolos: protocolosNov25(),
  contratos: contratosNov25(),
  metaCadastrada: 50,
  colaboradores: COLABORADORES_PADRAO(),
  regras: REGRAS_PADRAO(),
} as const

/** Helper genérico: cenário F2 roda o card completo em memória. */
function card(overrides: Partial<typeof BASE> = {}) {
  const p = { ...BASE, ...overrides }
  return apurarCardComissoes({
    protocolos: p.protocolos as ProtocoloComissoesInput[],
    contratos: p.contratos as ContratoComissoesInput[],
    meses: p.meses,
    mes: p.mes,
    ano: p.ano,
    metaCadastrada: p.metaCadastrada,
    colaboradores: p.colaboradores as never,
    regras: p.regras,
    competenciaReferencia: '2026-11',
  })
}

// ---------------------------------------------------------------------------
// Suite COMISSOES_F (regressão F1)
// ---------------------------------------------------------------------------

export function runCenariosColaboradores(): ResultadoCenario[] {
  const cenarios: ResultadoCenario[] = []
  const push = (cenario: string, detalhe: string, ok: boolean) =>
    cenarios.push({ cenario, detalhe, ok })

  // F-A — vigência futura não paga em competências anteriores.
  {
    const regras = [{ id: 'r1', colaborador: 'c1', valor: 20, modalidade: 'fixa' as const, vigencia_inicio: '2026-12' }]
    const dez = resolverRegrasVigentes(regras, '2026-12')
    const jan = resolverRegrasVigentes(regras, '2027-01')
    const nov0 = apurarCardComissoes({
      protocolos: [], contratos: [], meses: MESES, mes: 11, ano: 2026, metaCadastrada: null,
      colaboradores: [{ id: 'c1', nome: 'X', ordem: 1, ativo: true, created: '2026-12-01' }],
      regras, competenciaReferencia: '2026-11',
    })
    push(
      'F-A Novo colaborador com vigência futura não paga em competências anteriores',
      `2026-12: ${dez.length} linha(s); 2027-01: ${jan.map((r) => r.valor + '/caso')}; nov/2026: ${nov0.linhas.length} linha(s)`,
      dez.length === 1 && jan.length === 1 && nov0.linhas.length === 0,
    )
  }

  // F-B — alteração de valor sem retroatividade.
  {
    const regras: RegraComissaoRecord[] = [
      { id: 'r1', colaborador: 'c1', valor: 20, modalidade: 'fixa', vigencia_inicio: '2026-11' },
      { id: 'r2', colaborador: 'c1', valor: 25, modalidade: 'fixa', vigencia_inicio: '2027-01' },
    ]
    const casos3 = () => ({
      protocolos: protocolosNov25().slice(0, 3),
      contratos: contratosNov25().slice(0, 3),
    })
    const nov = apurarCardComissoes({ ...casos3(), meses: MESES, mes: 11, ano: 2026, metaCadastrada: null, colaboradores: [], regras, competenciaReferencia: '2026-11' })
    const dez = apurarCardComissoes({ ...casos3(), meses: MESES, mes: 12, ano: 2026, metaCadastrada: null, colaboradores: [], regras, competenciaReferencia: '2026-11' })
    const jan = apurarCardComissoes({ ...casos3(), meses: MESES, mes: 1, ano: 2027, metaCadastrada: null, colaboradores: [], regras, competenciaReferencia: '2026-11' })
    push(
      'F-B R$20→R$25: nov/dez continuam R$20 e jan usa R$25 (sem recálculo retroativo)',
      `nov: ${nov.linhas[0]?.valorIncluido} (60 confirmado); dez: ${dez.linhas[0]?.valorIncluido} (60 confirmado); jan: ${jan.linhas[0]?.valorIncluido} (75 confirmado)`,
      nov.linhas[0]?.valorIncluido === 60 && dez.linhas[0]?.valorIncluido === 60 && jan.linhas[0]?.valorIncluido === 75,
    )
  }
