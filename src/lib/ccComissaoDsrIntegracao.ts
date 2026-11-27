/**
 * INTEGRAÇÃO — COMISSÃO/DSR ↔ CONTRACHEQUE (Build C3-B)
 * ========================================================================
 * Cola o motor puro (ccComissaoDsr.ts) ao serviço ccContracheques.ts, sem
 * alterar NENHUMA fórmula validada. Responsabilidades:
 *   1. Mapear o snapshot do motor ↔ campos da migration 0117
 *      (cc_contracheques.comissao_* / dsr_*), em centavos ↔ reais.
 *   2. Detecção AMPLIADA de comissão manual: o motor olha só a descrição;
 *      no rascunho real (out/2026) a comissão está na NATUREZA ("Comissão
 *      informada manualmente"). Aqui detectamos natureza OU descrição.
 *   3. Planejar a sincronização das rubricas calculadas origem='comissao'/
 *      'dsr_comissao' (criar/atualizar — nunca duplicar; nada é apagado
 *      sem decisão do usuário).
 */
import {
  RUBRICA_COMISSAO,
  RUBRICA_DSR,
  centavosParaReais,
  reaisParaCentavos,
  type ModalidadeComissaoCC,
  type SnapshotComissaoDsr,
} from '@/lib/ccComissaoDsr'
import { paraCentavos } from '@/lib/ccContracheque'
import type { LancamentoRecord, ContrachequeRecord } from '@/services/ccContracheques'

/** Campos do snapshot gravados no cc_contracheques (migration 0117). */
export interface ComissaoDsrSnapshotCampos {
  comissao_ativa: boolean
  comissao_modalidade: string // '' | 'casos' | 'valor_direto'
  comissao_qtd_casos: number
  comissao_valor_caso: number
  comissao_valor_direto: number
  comissao_total: number
  dsr_dias_uteis: number
  dsr_dias_repouso: number
  dsr_ajustado: boolean
  dsr_motivo_ajuste: string
  dsr_calendario_dias_uteis: number
  dsr_calendario_dias_repouso: number
  dsr_total: number
}

/** Estado de formulário da seção Comissões e DSR (valores em reais/unidades). */
export interface EstadoComissaoUI {
  ativa: boolean
  modalidade: ModalidadeComissaoCC
  qtdCasos: string // '' ou inteiro ≥ 0
  valorCaso: string // texto pt-BR ("20" ou "20,50")
  valorDireto: string
  ajusteAtivo: boolean
  ajusteUteis: string
  ajusteRepouso: string
  ajusteMotivo: string
}

export const ESTADO_COMISSAO_INICIAL: EstadoComissaoUI = {
  ativa: false,
  modalidade: 'casos',
  qtdCasos: '',
  valorCaso: '',
  valorDireto: '',
  ajusteAtivo: false,
  ajusteUteis: '',
  ajusteRepouso: '',
  ajusteMotivo: '',
}

export const ESTADO_COMISSAO_RESET = ESTADO_COMISSAO_INICIAL

/** Converte texto pt-BR/decimal em número (NaN se inválido). */
export function parseNumeroUI(texto: string): number {
  const limpo = (texto || '').trim().replace(/\s/g, '').replace(/R\$/i, '')
  if (!limpo) return NaN
  return Number(limpo.replace(/\./g, '').replace(',', '.'))
}

/** Monta a entrada de comissão do motor a partir do estado da UI. */
export function entradaComissaoDaUI(estado: EstadoComissaoUI) {
  if (!estado.ativa) return null
  if (estado.modalidade === 'casos') {
    const qtd = parseNumeroUI(estado.qtdCasos)
    const valor = parseNumeroUI(estado.valorCaso)
    if (!Number.isInteger(qtd) || qtd < 0 || !Number.isFinite(valor) || valor < 0) return null
    return { modalidade: 'casos' as const, qtdCasos: qtd, valorCaso: valor }
  }
  const v = parseNumeroUI(estado.valorDireto)
  if (!Number.isFinite(v) || v < 0) return null
  return { modalidade: 'valor_direto' as const, valorDireto: v }
}

/** Monta o ajuste de dias (ou null) a partir do estado da UI. */
export function ajusteDiasDaUI(estado: EstadoComissaoUI) {
  if (!estado.ajusteAtivo) return null
  const u = parseNumeroUI(estado.ajusteUteis)
  const r = parseNumeroUI(estado.ajusteRepouso)
  if (!Number.isInteger(u) || u < 0 || !Number.isInteger(r) || r < 0) return null
  return { diasUteis: u, diasRepouso: r, motivo: estado.ajusteMotivo }
}

/** Snapshot do motor → campos da migration 0117 (reais no banco). */
export function camposDoSnapshot(s: SnapshotComissaoDsr): ComissaoDsrSnapshotCampos {
  return {
    comissao_ativa: s.comissaoAtiva,
    comissao_modalidade: s.comissaoAtiva ? (s.modalidade ?? '') : '',
    comissao_qtd_casos: s.comissaoAtiva && s.qtdCasos !== undefined ? s.qtdCasos : 0,
    comissao_valor_caso: s.valorCaso !== undefined ? s.valorCaso : 0,
    comissao_valor_direto: s.valorDireto !== undefined ? s.valorDireto : 0,
    comissao_total: s.comissaoAtiva ? centavosParaReais(s.comissaoTotalCentavos) : 0,
    dsr_dias_uteis: s.diasUteis,
    dsr_dias_repouso: s.diasRepouso,
    dsr_ajustado: s.ajustado,
    dsr_motivo_ajuste: s.motivoAjuste ?? '',
    dsr_calendario_dias_uteis: s.calendarioDiasUteis,
    dsr_calendario_dias_repouso: s.calendarioDiasRepouso,
    dsr_total: s.comissaoAtiva ? centavosParaReais(s.dsrCentavos) : 0,
  }
}

/**
 * Recupera o estado de UI a partir do snapshot GRAVADO (campos 0117). É a
 * única fonte ao reabrir um rascunho — nunca recalcula do calendário.
 */
export function estadoUIDoRecord(rec: ContrachequeRecord): EstadoComissaoUI {
  const ativa = !!rec.comissao_ativa
  if (!ativa) return { ...ESTADO_COMISSAO_INICIAL }
  const modalidade: ModalidadeComissaoCC =
    rec.comissao_modalidade === 'valor_direto' ? 'valor_direto' : 'casos'
  const ajustado = !!rec.dsr_ajustado
  const fmt = (v: number) => (Number.isFinite(v) ? String(v).replace('.', ',') : '')
  return {
    ativa: true,
    modalidade,
    qtdCasos: rec.comissao_qtd_casos > 0 ? String(rec.comissao_qtd_casos) : '',
    valorCaso: rec.comissao_valor_caso > 0 ? fmt(rec.comissao_valor_caso) : '',
    valorDireto: rec.comissao_valor_direto > 0 ? fmt(rec.comissao_valor_direto) : '',
    ajusteAtivo: ajustado,
    ajusteUteis: ajustado && rec.dsr_dias_uteis > 0 ? String(rec.dsr_dias_uteis) : '',
    ajusteRepouso: ajustado && rec.dsr_dias_repouso > 0 ? String(rec.dsr_dias_repouso) : '',
    ajusteMotivo: rec.dsr_motivo_ajuste || '',
  }
}

/**
 * Snapshot gravado (campos 0117) → forma do motor, para EXIBIR os valores
 * salvos (recuperação sem recálculo). null = sem comissão gravada.
 */
export function snapshotDoRecord(rec: ContrachequeRecord): SnapshotComissaoDsr | null {
  if (!rec.comissao_ativa) return null
  const modalidade: ModalidadeComissaoCC =
    rec.comissao_modalidade === 'valor_direto' ? 'valor_direto' : 'casos'
  const total = reaisParaCentavos(Number(rec.comissao_total ?? 0))
  const ajustado = !!rec.dsr_ajustado
  const uteis = Number(rec.dsr_dias_uteis ?? 0)
  const repouso = Number(rec.dsr_dias_repouso ?? 0)
  return {
    comissaoAtiva: true,
    modalidade,
    qtdCasos: modalidade === 'casos' ? Number(rec.comissao_qtd_casos ?? 0) : undefined,
    valorCaso:
      modalidade === 'casos' && Number(rec.comissao_valor_caso ?? 0) > 0
        ? Number(rec.comissao_valor_caso)
        : undefined,
    valorDireto:
      modalidade === 'valor_direto' && Number(rec.comissao_valor_direto ?? 0) > 0
        ? Number(rec.comissao_valor_direto)
        : undefined,
    comissaoTotalCentavos: total,
    diasUteis: uteis,
    diasRepouso: repouso,
    calendarioDiasUteis: Number(rec.dsr_calendario_dias_uteis ?? uteis),
    calendarioDiasRepouso: Number(rec.dsr_calendario_dias_repouso ?? repouso),
    ajustado,
    motivoAjuste: ajustado ? rec.dsr_motivo_ajuste || undefined : undefined,
    dsrCentavos: reaisParaCentavos(Number(rec.dsr_total ?? 0)),
    fracaoDsr: uteis > 0 ? `${repouso}/${uteis}` : '—',
  }
}

// ---------------------------------------------------------------------------
// Detecção AMPLIADA de comissão manual (natureza OU descrição)
// ---------------------------------------------------------------------------

const COMISSAO_RE = /comiss/i

export interface LancamentoExistenteCC {
  id?: string
  origem?: string
  natureza_tipo: 'vencimento' | 'desconto'
  natureza: string
  descricao: string
  valorCentavos: number
}

/** Converte os registros do banco na forma usada pelo plano do motor. */
export function lancamentosDoRecord(
  recs: LancamentoRecord[],
): (LancamentoExistenteCC & { valor: number })[] {
  return recs.map((r) => ({
    id: r.id,
    origem: r.origem || 'manual',
    natureza_tipo: r.natureza_tipo,
    natureza: r.natureza || '',
    descricao: r.descricao || '',
    valorCentavos: paraCentavos(Number(r.valor)) ?? 0,
    valor: Number(r.valor),
  }))
}

/**
 * Comissão manual já lançada na competência: origem 'manual', vencimento com
 * valor > 0 e "comiss" na NATUREZA ou na DESCRIÇÃO (caso do rascunho real da
 * out/2026). Detecta — nunca altera.
 */
export function detectarComissaoManualAmpliada(
  recs: LancamentoRecord[],
): LancamentoExistenteCC | null {
  for (const r of recs) {
    const origem = r.origem || 'manual'
    if (origem !== 'manual') continue
    if (r.natureza_tipo !== 'vencimento') continue
    if ((paraCentavos(Number(r.valor)) ?? 0) <= 0) continue
    if (COMISSAO_RE.test(r.natureza || '') || COMISSAO_RE.test(r.descricao || '')) {
      return {
        id: r.id,
        origem: 'manual',
        natureza_tipo: r.natureza_tipo,
        natureza: r.natureza || '',
        descricao: r.descricao || '',
        valorCentavos: paraCentavos(Number(r.valor)) ?? 0,
      }
    }
  }
  return null
}

/** Outros lançamentos manuais que PARECEM comissão/DSR — só aviso de conferência. */
export function detectarParecidosComissaoDsr(
  recs: LancamentoRecord[],
  ignorarId?: string,
): LancamentoRecord[] {
  return recs.filter((r) => {
    if ((r.origem || 'manual') !== 'manual') return false
    if (r.id && ignorarId && r.id === ignorarId) return false
    const texto = `${r.natureza || ''} ${r.descricao || ''}`
    return /\bdsr\b/i.test(texto) || /repouso/i.test(texto) || /comiss/i.test(texto)
  })
}

// ---------------------------------------------------------------------------
// Plano de sincronização das rubricas calculadas
// ---------------------------------------------------------------------------

export interface PlanoRubrica {
  acao: 'criar' | 'atualizar' | 'nada'
  id?: string
  valorCentavos: number
}

export interface PlanoSincronizacao {
  /** Existe comissão manual → precisa de decisão (manter/substituir). */
  precisaDecisao: boolean
  manualExistente: LancamentoExistenteCC | null
  comissao: PlanoRubrica
  dsr: PlanoRubrica
}

/**
 * Plano a partir do snapshot ATUAL do formulário e dos lançamentos do banco:
 *   - comissão/DSR ativos → criar (se ausentes) ou atualizar (origem própria —
 *     nunca criar segunda rubrica);
 *   - comissão/DSR desligados → zerar a rubrica calculada se existir (aqui o
 *     usuário já desligou o recurso, e a rubrica calculada é nossa);
 *   - comissão manual detectada → acao 'nada' e precisaDecisao=true (nada é
 *     escrito/apagado antes da escolha).
 */
export function planejarSincronizacao(
  snapshot: SnapshotComissaoDsr | null,
  recs: LancamentoRecord[],
): PlanoSincronizacao {
  const manual = detectarComissaoManualAmpliada(recs)
  const precisaDecisao =
    manual !== null && !!snapshot?.comissaoAtiva && snapshot.comissaoTotalCentavos > 0
  const recComissao = recs.find((r) => (r.origem || '') === 'comissao')
  const recDsr = recs.find((r) => (r.origem || '') === 'dsr_comissao')

  const valorComissao = snapshot?.comissaoAtiva ? snapshot.comissaoTotalCentavos : 0
  const valorDsr = snapshot?.comissaoAtiva ? snapshot.dsrCentavos : 0

  const comissao: PlanoRubrica = (() => {
    if (precisaDecisao) return { acao: 'nada', valorCentavos: valorComissao }
    if (!snapshot?.comissaoAtiva || valorComissao <= 0) {
      return recComissao
        ? { acao: 'atualizar', id: recComissao.id, valorCentavos: 0 }
        : { acao: 'nada', valorCentavos: 0 }
    }
    return recComissao
      ? { acao: 'atualizar', id: recComissao.id, valorCentavos: valorComissao }
      : { acao: 'criar', valorCentavos: valorComissao }
  })()

  const dsr: PlanoRubrica = (() => {
    if (precisaDecisao) return { acao: 'nada', valorCentavos: valorDsr }
    if (!snapshot?.comissaoAtiva || valorDsr <= 0) {
      return recDsr
        ? { acao: 'atualizar', id: recDsr.id, valorCentavos: 0 }
        : { acao: 'nada', valorCentavos: 0 }
    }
    return recDsr
      ? { acao: 'atualizar', id: recDsr.id, valorCentavos: valorDsr }
      : { acao: 'criar', valorCentavos: valorDsr }
  })()

  return { precisaDecisao, manualExistente: manual, comissao, dsr }
}

/** Rótulos das rubricas calculadas (fonte: motor). Reexportados por conveniência. */
export const ROTULOS_RUBRICAS = { comissao: RUBRICA_COMISSAO, dsr: RUBRICA_DSR }
