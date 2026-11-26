/**
 * FUNÇÃO PURA — META MENSAL DE COMISSÕES (Build E1)
 * ==================================================
 * Calcula, para UMA competência (mes/ano), a situação da meta comercial de
 * contratos fechados e o efeito dela sobre a parte condicionada da Nataly.
 * Sem efeitos colaterais: não acessa o banco, não grava nada — testável em
 * memória (cenários A–J em src/lib/comissoes.cenarios.ts).
 *
 * CONTAGEM DA META (mesmo padrão do RDocsDashboard):
 *   c.dcontrato.startsWith('YYYY-MM') && !isArchived(c.status)
 *   - Data do Contrato (dcontrato) define a competência da meta;
 *   - contratos ARQUIVADOS não contam;
 *   - R. Docs do PROTOCOLO NÃO exclui o contrato da meta comercial — contrato
 *     fechado e ativo conta mesmo com o protocolo aguardando documentos
 *     (regras separadas: a comissão individual do caso continua suspensa).
 *
 * COMISSÃO (independente da meta):
 *   Bia = casos × 20 | Nayara = casos × 20 | Kaique = casos × 10
 *   Total básico = casos × 50 | Nataly potencial = casos × 20
 *   Nataly entra no total SOMENTE quando a meta está atingida. Sem meta
 *   cadastrada, a situação é "não definida" e NÃO se presume meta atingida.
 *
 * COMPETÊNCIA DAS COMISSÕES: exclusivamente por dcalculo (Data do Cálculo do
 * protocolo) — a Data do Protocolo (dprotocolo) não determina competência.
 * A quantidade de casos elegíveis à comissão é ENTRADA desta função: quem a
 * produz é `apurarComissoes`/`acumuladoComissoes` (src/lib/comissoes.ts), que
 * este build não altera.
 */
import { isArchived } from '@/lib/archivedStatuses'

/** Contrato mínimo necessário à contagem da meta (mesmo mini-tipo do RDocs). */
export interface ContratoMetaInput {
  id: string
  status?: string
  dcontrato?: string
  [key: string]: any
}

/** Situação da meta na competência. */
export type SituacaoMeta = 'atingida' | 'nao atingida' | 'nao definida'

export interface ResultadoMetaComissoes {
  /** Quantidade de contratos fechados e ATIVOS na competência (dcontrato). */
  contratosAtivos: number
  /** Meta configurada para a competência (null = "Meta não definida"). */
  metaConfigurada: number | null
  /** atingida | nao atingida | nao definida. */
  situacaoMeta: SituacaoMeta
  /** Nataly potencial: casos × 20 (independe da meta). */
  natalyPotencial: number
  /** Parte da Nataly incluída no total: casos × 20 só se meta atingida. */
  natalyIncluida: number
  /** Total básico: casos × 50 (Bia 20 + Nayara 20 + Kaique 10). */
  totalBasico: number
  /** Total da competência: total básico + Nataly somente se meta atingida. */
  totalCompetencia: number
  /** Competência em formato YYYY-MM (derivada de mes/ano). */
  competencia: string
}

export function calcularMetaComissoes(params: {
  contratos: ContratoMetaInput[]
  mes: number
  ano: number
  /** Meta cadastrada da competência ou null/undefined quando ausente. */
  meta?: number | null
  /** Casos elegíveis à comissão na competência (saída de apurarComissoes). */
  casosElegiveis: number
}): ResultadoMetaComissoes {
  const { contratos, mes, ano } = params
  const prefixo = `${ano}-${String(mes).padStart(2, '0')}`

  const contratosAtivos = contratos.filter(
    (c) => !!c.dcontrato && c.dcontrato.startsWith(prefixo) && !isArchived(c.status),
  ).length

  const metaConfigurada =
    params.meta === undefined || params.meta === null || !Number.isFinite(params.meta)
      ? null
      : params.meta

  const casos = Math.max(0, Math.floor(params.casosElegiveis || 0))
  const natalyPotencial = casos * 20
  const totalBasico = casos * 50

  let situacaoMeta: SituacaoMeta
  let natalyIncluida = 0
  if (metaConfigurada === null) {
    situacaoMeta = 'nao definida'
  } else if (contratosAtivos >= metaConfigurada) {
    situacaoMeta = 'atingida'
    natalyIncluida = natalyPotencial
  } else {
    situacaoMeta = 'nao atingida'
  }

  return {
    contratosAtivos,
    metaConfigurada,
    situacaoMeta,
    natalyPotencial,
    natalyIncluida,
    totalBasico,
    totalCompetencia: totalBasico + natalyIncluida,
    competencia: prefixo,
  }
}
