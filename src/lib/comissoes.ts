/**
 * APURAÇÃO PRELIMINAR DE COMISSÕES — ABA PROTOCOLO (Build 1)
 * ==========================================================
 * Função PURA, centralizada e sem efeitos: avalia a apuração preliminar de
 * comissões de liberação de protocolo para qualquer competência (mês/ano),
 * a partir dos dados já carregados na página (protocolo + contratos_fechados).
 *
 * NÃO grava, NÃO altera registros, NÃO implementa pagamento — leitura apenas.
 * Competência: exclusivamente protocolo.dcalculo ("2026-11-24 12:00:00.000Z")
 * — NUNCA dprotocolo, dcontrato ou created.
 *
 * Elegibilidade (por caso, na competência selecionada):
 *  - dcalculo preenchida e dentro do mês/ano + isProtocoloValido()
 *    (contratos relacionados arquivados excluem — fonte única
 *    src/lib/archivedStatuses.ts);
 *  - status "R. Docs" = SUSPENSO: fora dos valores elegíveis, exibido como
 *    "Faltando Documentos"; ao sair, volta a integrar a competência ORIGINAL
 *    da dcalculo (a apuração nunca usa a data de reclassificação);
 *  - NÃO exclui decisao === 'Improcedente' (comissão é pelo trabalho de
 *    liberação, não pelo resultado);
 *  - NÃO exige protocolo efetivado — "Prov. Inicial" gera comissão se apto.
 *
 * Responsáveis:
 *  - quantidade de casos é CONJUNTA (não individualizada por responsável);
 *  - EXCEÇÃO provisória: responsável "IA" (relation → responsaveis,
 *    registro '253awakhq5x1tyl') fica em "Conferência necessária" e NÃO
 *    integra os elegíveis. Nenhum campo responsavel é alterado aqui.
 *
 * Duplicidade ("cada caso gera comissão uma única vez"):
 *  - Dedup por relation protocolo.contratos: para o MESMO contrato, apenas a
 *    PRIMEIRA liberação conta (menor dcalculo; empate → menor created);
 *  - Correspondência POSSÍVEL por telefone normalizado + tipo de ação (sem
 *    vínculo formal) NÃO funde automaticamente quando ambígua (mesmo fone+tipo
 *    apontando para 2+ contratos ou 2+ protocolos): vai para conferência;
 *  - Nome do cliente NUNCA é chave de deduplicação.
 *
 * Valores por caso elegível: Bia 20 | Nayara 20 | Kaique 10 | Nataly 20
 * POTENCIAL (condicionado à meta mensal — meta NÃO implementada nesta versão;
 * fora do total estimado). Total básico R$ 50,00/caso; potencial R$ 70,00/caso.
 */
import { isProtocoloValido, type ContratoFechadoMini } from '@/services/protocoloValidade'
import { ARCHIVED_STATUSES } from '@/lib/archivedStatuses'
import { normalizePhoneDigits } from '@/services/leadsAuxAcidente'
import { normalizeText } from '@/lib/utils'

/** Responsável "IA": registros com esse responsável ficam fora dos elegíveis. */
export const RESPONSAVEL_IA_ID = '253awakhq5x1tyl'
export const RESPONSAVEL_IA_NOME = 'IA'

/** Valor BÁSICO por caso, por colaborador (nome normalizado). */
export const VALOR_BASICO_POR_COLABORADOR: Record<string, number> = {
  bia: 20,
  nayara: 20,
  kaique: 10,
  nataly: 20,
}

/** Valor POTENCIAL por caso (inclui a parte condicionada à meta da Nataly). */
export const VALOR_POTENCIAL_POR_COLABORADOR: Record<string, number> = {
  bia: 20,
  nayara: 20,
  kaique: 10,
  nataly: 20,
}

/** Colaborador cujo valor é condicionado à meta mensal (não implementada). */
export const COLABORADOR_CONDICIONADO_META = 'nataly'

export const TOTAL_BASICO_POR_CASO = 50
export const TOTAL_POTENCIAL_POR_CASO = 70

/** Status que suspende o caso (exibido como "Faltando Documentos"). */
export const STATUS_SUSPENSO = 'R. Docs'

const STATUS_ARQUIVADO_SET = new Set<string>(ARCHIVED_STATUSES)

export interface ProtocoloComissoesInput {
  id: string
  nome?: string
  fone?: string
  status?: string
  dcalculo?: string
  tipo_acao?: string
  contratos?: string[] | null
  responsavel?: string
  created?: string
  expand?: {
    responsavel?: { id: string; nome: string } | null
    tipo_acao?: { id: string; nome: string } | null
    [key: string]: any
  } | null
  [key: string]: any
}

export interface ContratoComissoesInput extends ContratoFechadoMini {
  fone?: string
  beneficio?: string
  [key: string]: any
}

/** Situação de um caso na apuração. */
export type SituacaoComissao =
  | 'elegivel'
  | 'suspenso' // R. Docs — Faltando Documentos
  | 'ia' // responsável IA — conferência necessária
  | 'ambiguo' // possível duplicidade fone+tipo — não funde
  | 'duplicado' // 2ª+ liberação do mesmo contrato (relation)
  | 'invalido' // isProtocoloValido = false (contratos arquivados)

export interface CasoComissoes {
  id: string
  nome: string
  dcalculo: string | null
  status: string
  responsavelNome: string
  situacao: SituacaoComissao
  contratoId: string | null
  contratoNome: string | null
  observacao: string
}

export interface ColaboradorComissoes {
  nome: string
  casos: number
  valorBasico: number
  valorPotencial: number
  condicionadoMeta: boolean
}

export interface ApuracaoComissoes {
  competencia: string
  casosElegiveis: CasoComissoes[]
  casosSuspensos: CasoComissoes[]
  casosIA: CasoComissoes[]
  casosAmbiguos: CasoComissoes[]
  casosDuplicados: CasoComissoes[]
  quantidadeElegivel: number
  totalBasico: number
  totalPotencial: number
  colaboradores: ColaboradorComissoes[]
}

/** "2026-11-24 12:00:00.000Z" → { ano: 2026, mes: 11 } (competência da dcalculo). */
export function competenciaDaDcalculo(dcalculo?: string): { ano: number; mes: number } | null {
  if (!dcalculo) return null
  const m = /^(\d{4})-(\d{2})/.exec(String(dcalculo))
  if (!m) return null
  const ano = parseInt(m[1], 10)
  const mes = parseInt(m[2], 10)
  if (!ano || mes < 1 || mes > 12) return null
  return { ano, mes }
}

function responsavelDoRegistro(p: ProtocoloComissoesInput): { id: string; nome: string } {
  const exp = p.expand?.responsavel
  if (exp?.id) return { id: exp.id, nome: exp.nome || '' }
  if (p.responsavel) return { id: p.responsavel, nome: '' }
  return { id: '', nome: '' }
}

function chaveFoneTipo(fone: string, tipoNome: string): string {
  const tel = normalizePhoneDigits(fone || '')
  const benef = normalizeText(tipoNome || '')
  if (!tel || !benef) return ''
  return `${tel}|${benef}`
}

/**
 * Apura a comissão PRELIMINAR de UMA competência (mes 1-12, ano).
 * `contratos` e `tiposAcaoPorId` alimentam a detecção de ambiguidade fone+tipo.
 * Função pura: nenhum dado é gravado ou alterado.
 */
export function apurarComissoes(
  protocolos: ProtocoloComissoesInput[],
  contratos: ContratoComissoesInput[],
  mes: number,
  ano: number,
  mesesNomes: string[],
  tiposAcaoPorId?: Map<string, { id: string; nome: string }>,
): ApuracaoComissoes {
  const competencia = `${mesesNomes[mes - 1] || String(mes)} ${ano}`
  const contratosPorId = new Map<string, ContratoComissoesInput>(contratos.map((c) => [c.id, c]))

  // Índice fone+tipo → contratos (detecção de ambiguidade do lado do contrato).
  const contratosPorFoneTipo = new Map<string, ContratoComissoesInput[]>()
  for (const c of contratos) {
    const key = chaveFoneTipo(c.fone || '', c.beneficio || '')
    if (!key) continue
    const arr = contratosPorFoneTipo.get(key)
    if (arr) arr.push(c)
    else contratosPorFoneTipo.set(key, [c])
  }

  const naCompetencia: ProtocoloComissoesInput[] = []
  for (const p of protocolos) {
    const comp = competenciaDaDcalculo(p.dcalculo)
    if (!comp || comp.mes !== mes || comp.ano !== ano) continue
    naCompetencia.push(p)
  }

  // Índice fone+tipo → protocolos APTOS da competência (dedup só entre aptos;
  // R. Docs/IA/inválidos não participam da contagem nem da ambiguidade).
  const protocolosPorFoneTipo = new Map<string, ProtocoloComissoesInput[]>()
  for (const p of naCompetencia) {
    if (!isProtocoloValido(p, contratosPorId)) continue
    if (responsavelDoRegistro(p).id === RESPONSAVEL_IA_ID) continue
    if (p.status === STATUS_SUSPENSO) continue
    const tipoId = p.expand?.tipo_acao?.id || p.tipo_acao || ''
    const tipoNome = p.expand?.tipo_acao?.nome || tiposAcaoPorId?.get(tipoId)?.nome || ''
    const key = chaveFoneTipo(p.fone || '', tipoNome)
    if (!key) continue
    const arr = protocolosPorFoneTipo.get(key)
    if (arr) arr.push(p)
    else protocolosPorFoneTipo.set(key, [p])
  }

  const casos: CasoComissoes[] = []
  const aptosTemp: { caso: CasoComissoes; protocolo: ProtocoloComissoesInput }[] = []

  // Passagem 1 — classifica cada protocolo da competência.
  for (const p of naCompetencia) {
    const resp = responsavelDoRegistro(p)
    const base: Omit<CasoComissoes, 'situacao' | 'observacao'> = {
      id: p.id,
      nome: p.nome || '—',
      dcalculo: p.dcalculo || null,
      status: p.status || '—',
      responsavelNome: resp.nome || '—',
      contratoId: null,
      contratoNome: null,
    }

    if (!isProtocoloValido(p, contratosPorId)) {
      casos.push({
        ...base,
        situacao: 'invalido',
        observacao: 'Fora da apuração: todos os contratos relacionados estão arquivados',
      })
      continue
    }

    if (resp.id === RESPONSAVEL_IA_ID) {
      casos.push({
        ...base,
        situacao: 'ia',
        observacao: `Responsável "${RESPONSAVEL_IA_NOME}" — conferência necessária; NÃO integra os elegíveis`,
      })
      continue
    }

    if (p.status === STATUS_SUSPENSO) {
      casos.push({
        ...base,
        situacao: 'suspenso',
        observacao:
          'Suspenso por Faltando Documentos — ao sair de R. Docs, volta a integrar a competência original da dcalculo',
      })
      continue
    }

    // Contrato de referência para dedup: o 1º contrato resolvível não arquivado
    // (mesma leitura de isProtocoloValido); fallback: o 1º resolvível.
    const idsRel = (p.contratos || []).filter(Boolean)
    let contratoDedup: { id: string; nome: string } | null = null
    if (idsRel.length > 0) {
      const resolviveis = idsRel
        .map((id) => contratosPorId.get(id))
        .filter((c): c is ContratoComissoesInput => !!c)
      const validos = resolviveis.filter((c) => !STATUS_ARQUIVADO_SET.has(c.status || ''))
      const ref = (validos.length > 0 ? validos : resolviveis)[0]
      if (ref) contratoDedup = { id: ref.id, nome: ref.nome || ref.id }
    }

    casos.push({
      ...base,
      contratoId: contratoDedup?.id ?? null,
      contratoNome: contratoDedup?.nome ?? null,
      situacao: 'elegivel', // provisório — passagem 2 decide dedup/ambiguidade
      observacao: contratoDedup
        ? `Vínculo inequívoco por relation: ${contratoDedup.nome}`
        : 'Sem vínculo formal a contrato (relation vazia) — correspondência avaliada por telefone+tipo',
    })
    aptosTemp.push({ caso: casos[casos.length - 1], protocolo: p })
  }

  // Passagem 2a — dedup por relation: 1ª liberação por contrato (menor
  // dcalculo; empate → menor created).
  const ordemDoCaso = new Map<string, string>()
  for (const { caso, protocolo } of aptosTemp) {
    if (!caso.contratoId) continue
    ordemDoCaso.set(
      caso.id,
      `${String(protocolo.dcalculo || '')}|${String(protocolo.created || '')}`,
    )
  }
  const primeiraPorContrato = new Map<string, { caso: CasoComissoes; quando: string }>()
  for (const { caso } of aptosTemp) {
    if (!caso.contratoId) continue
    const quando = ordemDoCaso.get(caso.id) || ''
    const atual = primeiraPorContrato.get(caso.contratoId)
    if (!atual || quando < atual.quando) {
      if (atual) {
        atual.caso.situacao = 'duplicado'
        atual.caso.observacao = `Duplicidade: 2ª+ liberação do contrato ${atual.caso.contratoNome} — comissão já gerada na 1ª liberação (desempate por dcalculo, created)`
      }
      primeiraPorContrato.set(caso.contratoId, { caso, quando })
      caso.situacao = 'elegivel'
      caso.observacao = `Vínculo inequívoco: ${caso.contratoNome} — 1ª liberação (dcalculo mais antiga)`
    } else {
      caso.situacao = 'duplicado'
      caso.observacao = `Duplicidade: 2ª+ liberação do contrato ${caso.contratoNome} — comissão já gerada na 1ª liberação (desempate por dcalculo, created)`
    }
  }

  // Passagem 2b — ambiguidade fone+tipo SEM vínculo formal: NÃO funde.
  for (const { caso, protocolo } of aptosTemp) {
    if (caso.situacao !== 'elegivel') continue
    if ((protocolo.contratos || []).filter(Boolean).length > 0) continue

    const tipoId = protocolo.expand?.tipo_acao?.id || protocolo.tipo_acao || ''
    const tipoNome = protocolo.expand?.tipo_acao?.nome || tiposAcaoPorId?.get(tipoId)?.nome || ''
    const key = chaveFoneTipo(protocolo.fone || '', tipoNome)
    if (!key) continue

    const contratosChave = contratosPorFoneTipo.get(key) || []
    const protocolosChave = protocolosPorFoneTipo.get(key) || []
    const ambContrato = contratosChave.length > 1
    const ambProtocolo = protocolosChave.length > 1

    if (ambContrato || ambProtocolo) {
      caso.situacao = 'ambiguo'
      const motivos: string[] = []
      if (ambContrato)
        motivos.push(
          `${contratosChave.length} contratos com o mesmo telefone+tipo (${contratosChave
            .map((c) => c.nome || c.id)
            .join(', ')})`,
        )
      if (ambProtocolo)
        motivos.push(
          `${protocolosChave.length} protocolos aptos da competência com o mesmo telefone+tipo`,
        )
      caso.observacao =
        'Possível duplicidade SEM fusão automática — conferência necessária: ' + motivos.join('; ')
    } else if (contratosChave.length === 1) {
      caso.observacao = `Correspondência possível por telefone+tipo: ${
        contratosChave[0].nome || contratosChave[0].id
      } (sem vínculo formal — nada fundido ou gravado)`
    }
  }

  const casosElegiveis = casos.filter((c) => c.situacao === 'elegivel')
  const quantidadeElegivel = casosElegiveis.length

  // Valores por colaborador — quantidade de casos é CONJUNTA; os valores por
  // colaborador são apenas informativos (total = 50 básico / 70 potencial por caso).
  const porColab = new Map<string, ColaboradorComissoes>()
  for (const c of casosElegiveis) {
    const key = normalizeText(c.responsavelNome)
    const atual = porColab.get(c.responsavelNome) || {
      nome: c.responsavelNome,
      casos: 0,
      valorBasico: 0,
      valorPotencial: 0,
      condicionadoMeta: false,
    }
    atual.casos += 1
    atual.valorBasico += VALOR_BASICO_POR_COLABORADOR[key] ?? 0
    atual.valorPotencial += VALOR_POTENCIAL_POR_COLABORADOR[key] ?? 0
    if (key === COLABORADOR_CONDICIONADO_META) atual.condicionadoMeta = true
    porColab.set(c.responsavelNome, atual)
  }

  return {
    competencia,
    casosElegiveis,
    casosSuspensos: casos.filter((c) => c.situacao === 'suspenso'),
    casosIA: casos.filter((c) => c.situacao === 'ia'),
    casosAmbiguos: casos.filter((c) => c.situacao === 'ambiguo'),
    casosDuplicados: casos.filter((c) => c.situacao === 'duplicado'),
    quantidadeElegivel,
    totalBasico: quantidadeElegivel * TOTAL_BASICO_POR_CASO,
    totalPotencial: quantidadeElegivel * TOTAL_POTENCIAL_POR_CASO,
    colaboradores: Array.from(porColab.values()).sort((a, b) => b.casos - a.casos),
  }
}
