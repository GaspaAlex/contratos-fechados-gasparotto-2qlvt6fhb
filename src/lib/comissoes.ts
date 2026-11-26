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
 * Elegibilidade (por protocolo):
 *  - dcalculo preenchida + isProtocoloValido() (contratos relacionados
 *    arquivados excluem — fonte única src/lib/archivedStatuses.ts);
 *  - status "R. Docs" = SUSPENSO: não gera comissão e NÃO conta como comissão
 *    reconhecida; ao sair, volta a disputar a primeira liberação do caso;
 *  - responsável "IA" fica em conferência e NÃO integra os elegíveis;
 *  - NÃO exclui decisao === 'Improcedente' (comissão é pelo trabalho de
 *    liberação, não pelo resultado).
 *
 * Caso (cada caso gera comissão UMA única vez):
 *  - Os protocolos são agrupados em CASOS sobre TODOS os protocolos carregados
 *    (antes do recorte por competência), por vínculo inequívoco:
 *    (a) relation protocolo.contratos (mesmo contrato_fechado);
 *    (b) cadeia de continuidade: caso_origem (raiz), protocolo_anterior e
 *        caso_continuacoes;
 *  - Nome e telefone NUNCA unem casos: contratos distintos do mesmo cliente
 *    são casos independentes;
 *  - A comissão do caso é da PRIMEIRA liberação elegível (menor dcalculo;
 *    empate → menor created; depois id). Todas as demais movimentações do caso
 *    são "Continuação do mesmo caso — sem nova comissão", inclusive em outras
 *    competências. A competência é a da dcalculo dessa primeira liberação.
 *
 * Sem vínculo formal (relation vazia e sem cadeia), a correspondência por
 * telefone normalizado + tipo de ação NÃO funde: mesmo fone+tipo apontando para
 * 2+ contratos ou 2+ protocolos aptos vai para conferência.
 *
 * DISTRIBUIÇÃO FIXA APROVADA (Build D): cada caso elegível gera automaticamente
 * Bia R$ 20 | Nayara R$ 20 | Kaique R$ 10 | Nataly R$ 20 POTENCIAL (condicionada
 * à meta mensal — meta NÃO implementada; fora do total básico). O campo
 * Responsável NÃO interfere no cálculo nem na distribuição. Total básico
 * R$ 50,00/caso; potencial R$ 70,00/caso.
 */
import { isProtocoloValido, type ContratoFechadoMini } from '@/services/protocoloValidade'
import { ARCHIVED_STATUSES } from '@/lib/archivedStatuses'
import { formatDateBR, normalizePhoneDigits } from '@/services/leadsAuxAcidente'
import { normalizeText } from '@/lib/utils'

/** Responsável "IA": registros com esse responsável ficam fora dos elegíveis. */
export const RESPONSAVEL_IA_ID = '253awakhq5x1tyl'
export const RESPONSAVEL_IA_NOME = 'IA'

/** Rótulo de movimentação posterior de caso já contabilizado. */
export const ROTULO_CONTINUACAO_SEM_COMISSAO = 'Continuação do mesmo caso — sem nova comissão'

/** Valor BÁSICO por caso, por colaborador (nome EXIBIDO; distribuição fixa). */
export const VALOR_BASICO_POR_COLABORADOR: Record<string, number> = {
  Bia: 20,
  Nayara: 20,
  Kaique: 10,
  Nataly: 20,
}

/** Valor POTENCIAL por caso (inclui a parte condicionada à meta da Nataly). */
export const VALOR_POTENCIAL_POR_COLABORADOR: Record<string, number> = {
  Bia: 20,
  Nayara: 20,
  Kaique: 10,
  Nataly: 20,
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
  caso_origem?: string | null
  protocolo_anterior?: string | null
  caso_continuacoes?: string[] | null
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
  | 'duplicado' // movimentação posterior de caso já contabilizado
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
  /** Distribuição FIXA dos casos elegíveis da competência (independe do Responsável). */
  colaboradores: ColaboradorComissoes[]
}

/** Acumulado histórico de comissões (todas as competências, casos únicos). */
export interface AcumuladoComissoes {
  /** Quantidade acumulada de casos elegíveis (cada caso conta UMA vez). */
  casosElegiveis: number
  /** Total básico acumulado (NÃO inclui a parte potencial da Nataly). */
  totalBasico: number
  /** Total potencial acumulado (inclui a parte condicionada à meta da Nataly). */
  totalPotencial: number
  bia: number
  nayara: number
  kaique: number
  /** Parte da Nataly — potencial, condicionada à meta; fora do total básico. */
  natalyPotencial: number
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

function tipoNomeDoRegistro(
  p: ProtocoloComissoesInput,
  tiposAcaoPorId?: Map<string, { id: string; nome: string }>,
): string {
  const tipoId = p.expand?.tipo_acao?.id || p.tipo_acao || ''
  return p.expand?.tipo_acao?.nome || tiposAcaoPorId?.get(tipoId)?.nome || ''
}

function chaveFoneTipo(fone: string, tipoNome: string): string {
  const tel = normalizePhoneDigits(fone || '')
  const benef = normalizeText(tipoNome || '')
  if (!tel || !benef) return ''
  return `${tel}|${benef}`
}

/** Ordem de desempate da liberação comissionada: dcalculo → created → id. */
function chaveOrdem(p: ProtocoloComissoesInput): string {
  return `${String(p.dcalculo || '')}|${String(p.created || '')}|${p.id}`
}

/**
 * Protocolo apto a gerar comissão (liberação elegível), independentemente da
 * competência: dcalculo válida, contratos não arquivados, fora de IA e R. Docs.
 */
function elegivelParaComissao(
  p: ProtocoloComissoesInput,
  contratosPorId: Map<string, ContratoComissoesInput>,
): boolean {
  if (!competenciaDaDcalculo(p.dcalculo)) return false
  if (!isProtocoloValido(p, contratosPorId)) return false
  if (responsavelDoRegistro(p).id === RESPONSAVEL_IA_ID) return false
  if (p.status === STATUS_SUSPENSO) return false
  return true
}

/** União-busca mínima para agrupar nós (protocolos e contratos) em casos. */
function criarGruposDeCaso() {
  const pai = new Map<string, string>()
  const find = (x: string): string => {
    if (!pai.has(x)) pai.set(x, x)
    let raiz = x
    while (pai.get(raiz) !== raiz) raiz = pai.get(raiz) as string
    let atual = x
    while (atual !== raiz) {
      const prox = pai.get(atual) as string
      pai.set(atual, raiz)
      atual = prox
    }
    return raiz
  }
  const unir = (a: string, b: string) => {
    const ra = find(a)
    const rb = find(b)
    if (ra !== rb) pai.set(ra, rb)
  }
  return { find, unir }
}

const noProtocolo = (id: string) => `protocolo:${id}`
const noContrato = (id: string) => `contrato:${id}`

/**
 * Agrupamento GLOBAL de casos sobre TODOS os protocolos carregados (antes do
 * recorte por competência), por vínculo inequívoco: relation de contrato +
 * cadeia de continuidade (caso_origem, protocolo_anterior, caso_continuacoes).
 * Nome e telefone NUNCA unem casos. Reutilizado pela apuração mensal e pelo
 * acumulado histórico.
 */
function agruparCasosComissoes(protocolos: ProtocoloComissoesInput[]) {
  const grupos = criarGruposDeCaso()
  for (const p of protocolos) {
    grupos.find(noProtocolo(p.id))
    for (const cid of (p.contratos || []).filter(Boolean)) {
      grupos.unir(noProtocolo(p.id), noContrato(String(cid)))
    }
    if (p.caso_origem) grupos.unir(noProtocolo(p.id), noProtocolo(String(p.caso_origem)))
    if (p.protocolo_anterior) {
      grupos.unir(noProtocolo(p.id), noProtocolo(String(p.protocolo_anterior)))
    }
    if (Array.isArray(p.caso_continuacoes)) {
      for (const id of p.caso_continuacoes) {
        if (id) grupos.unir(noProtocolo(p.id), noProtocolo(String(id)))
      }
    }
  }
  return grupos
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

  // Agrupamento de CASOS — GLOBAL, sobre todos os protocolos (antes do recorte
  // por competência). Vínculos: contrato relacionado e cadeia de continuidade.
  const grupos = agruparCasosComissoes(protocolos)
  const grupoDe = (p: ProtocoloComissoesInput) => grupos.find(noProtocolo(p.id))

  // Liberação comissionada de cada caso: a 1ª elegível (entre TODAS as
  // competências), independentemente de qual competência está sendo apurada.
  const comissionadoPorCaso = new Map<string, ProtocoloComissoesInput>()
  for (const p of protocolos) {
    if (!elegivelParaComissao(p, contratosPorId)) continue
    const raiz = grupoDe(p)
    const atual = comissionadoPorCaso.get(raiz)
    if (!atual || chaveOrdem(p) < chaveOrdem(atual)) comissionadoPorCaso.set(raiz, p)
  }

  const naCompetencia: ProtocoloComissoesInput[] = []
  for (const p of protocolos) {
    const comp = competenciaDaDcalculo(p.dcalculo)
    if (!comp || comp.mes !== mes || comp.ano !== ano) continue
    naCompetencia.push(p)
  }

  // Índice fone+tipo → protocolos APTOS da competência (dedup só entre aptos;
  // R. Docs/IA/inválidos não participam da ambiguidade).
  const protocolosPorFoneTipo = new Map<string, ProtocoloComissoesInput[]>()
  for (const p of naCompetencia) {
    if (!isProtocoloValido(p, contratosPorId)) continue
    if (responsavelDoRegistro(p).id === RESPONSAVEL_IA_ID) continue
    if (p.status === STATUS_SUSPENSO) continue
    const key = chaveFoneTipo(p.fone || '', tipoNomeDoRegistro(p, tiposAcaoPorId))
    if (!key) continue
    const arr = protocolosPorFoneTipo.get(key)
    if (arr) arr.push(p)
    else protocolosPorFoneTipo.set(key, [p])
  }

  const casos: CasoComissoes[] = []
  const protocoloPorCaso = new Map<string, ProtocoloComissoesInput>()

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
          'Suspenso por Faltando Documentos — não conta como comissão reconhecida; ao sair de R. Docs, disputa a primeira liberação do caso',
      })
      continue
    }

    // Contrato de referência para exibição: o 1º contrato resolvível não arquivado
    // (fallback: o 1º resolvível).
    const idsRel = (p.contratos || []).filter(Boolean)
    let contratoRef: { id: string; nome: string } | null = null
    if (idsRel.length > 0) {
      const resolviveis = idsRel
        .map((id) => contratosPorId.get(id))
        .filter((c): c is ContratoComissoesInput => !!c)
      const validos = resolviveis.filter((c) => !STATUS_ARQUIVADO_SET.has(c.status || ''))
      const ref = (validos.length > 0 ? validos : resolviveis)[0]
      if (ref) contratoRef = { id: ref.id, nome: ref.nome || ref.id }
    }

    const comissionado = comissionadoPorCaso.get(grupoDe(p))
    if (comissionado && comissionado.id !== p.id) {
      casos.push({
        ...base,
        contratoId: contratoRef?.id ?? null,
        contratoNome: contratoRef?.nome ?? null,
        situacao: 'duplicado',
        observacao: `${ROTULO_CONTINUACAO_SEM_COMISSAO} — comissão já contabilizada na liberação de ${
          comissionado.dcalculo ? formatDateBR(comissionado.dcalculo) : '—'
        } (${comissionado.nome || comissionado.id})`,
      })
      continue
    }

    const caso: CasoComissoes = {
      ...base,
      contratoId: contratoRef?.id ?? null,
      contratoNome: contratoRef?.nome ?? null,
      situacao: 'elegivel', // provisório — passagem 2 avalia ambiguidade
      observacao: contratoRef
        ? `Vínculo inequívoco por relation: ${contratoRef.nome} — 1ª liberação do caso`
        : 'Sem vínculo formal a contrato (relation vazia) — correspondência avaliada por telefone+tipo',
    }
    casos.push(caso)
    protocoloPorCaso.set(caso.id, p)
  }

  // Passagem 2 — ambiguidade fone+tipo SEM vínculo formal: NÃO funde.
  for (const caso of casos) {
    if (caso.situacao !== 'elegivel') continue
    const protocolo = protocoloPorCaso.get(caso.id)
    if (!protocolo) continue
    if ((protocolo.contratos || []).filter(Boolean).length > 0) continue

    const key = chaveFoneTipo(protocolo.fone || '', tipoNomeDoRegistro(protocolo, tiposAcaoPorId))
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

  // DISTRIBUIÇÃO FIXA (Build D): cada caso elegível gera automaticamente Bia 20,
  // Nayara 20, Kaique 10 e Nataly 20 potencial. O campo Responsável NÃO interfere
  // no cálculo nem na distribuição — a lista por colaborador é informativa.
  const porColab = new Map<string, ColaboradorComissoes>()
  for (const [nomeExibido, valorBasico] of Object.entries(VALOR_BASICO_POR_COLABORADOR)) {
    porColab.set(nomeExibido, {
      nome: nomeExibido,
      casos: quantidadeElegivel,
      valorBasico: quantidadeElegivel * valorBasico,
      valorPotencial:
        quantidadeElegivel * (VALOR_POTENCIAL_POR_COLABORADOR[nomeExibido] ?? valorBasico),
      condicionadoMeta: normalizeText(nomeExibido) === COLABORADOR_CONDICIONADO_META,
    })
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
    colaboradores: Array.from(porColab.values()),
  }
}

/**
 * ACUMULADO HISTÓRICO (Build D) — função PURA: soma TODAS as competências sobre
 * o mesmo agrupamento global da apuração mensal. Cada caso entra UMA única vez
 * (a 1ª liberação elegível por dcalculo); continuações em outros meses/anos não
 * duplicam. Competência exclusivamente por dcalculo — nunca dprotocolo,
 * dcontrato ou created. R. Docs suspenso não contabiliza. Não usa a soma das
 * apurações mensais: soma direto sobre o mapa de casos, sem competências
 * duplicadas.
 */
export function acumuladoComissoes(
  protocolos: ProtocoloComissoesInput[],
  contratos: ContratoComissoesInput[],
): AcumuladoComissoes {
  const contratosPorId = new Map<string, ContratoComissoesInput>(contratos.map((c) => [c.id, c]))
  const grupos = agruparCasosComissoes(protocolos)
  const grupoDe = (p: ProtocoloComissoesInput) => grupos.find(noProtocolo(p.id))

  // 1ª liberação elegível de cada caso — a MESMA regra da apuração mensal.
  const comissionadoPorCaso = new Map<string, ProtocoloComissoesInput>()
  for (const p of protocolos) {
    if (!elegivelParaComissao(p, contratosPorId)) continue
    const raiz = grupoDe(p)
    const atual = comissionadoPorCaso.get(raiz)
    if (!atual || chaveOrdem(p) < chaveOrdem(atual)) comissionadoPorCaso.set(raiz, p)
  }

  const casos = comissionadoPorCaso.size
  return {
    casosElegiveis: casos,
    totalBasico: casos * TOTAL_BASICO_POR_CASO,
    totalPotencial: casos * TOTAL_POTENCIAL_POR_CASO,
    bia: casos * VALOR_BASICO_POR_COLABORADOR['Bia'],
    nayara: casos * VALOR_BASICO_POR_COLABORADOR['Nayara'],
    kaique: casos * VALOR_BASICO_POR_COLABORADOR['Kaique'],
    natalyPotencial: casos * VALOR_BASICO_POR_COLABORADOR['Nataly'],
  }
}
