import { useMemo } from 'react'
import type { LeadAuxAcidente } from '@/services/leadsAuxAcidente'
import { ORIGEM_LABELS, isContratoValidoAuxAcidente } from '@/services/leadsAuxAcidente'
import { cn } from '@/lib/utils'

/**
 * COMPARATIVO POR ORIGEM — Enlead × Campanha (Item 19).
 *
 * Fonte de verdade: EXCLUSIVAMENTE a lista já filtrada da página (props) —
 * a MESMA que alimenta os cards, o funil e a tabela. Nenhuma consulta extra,
 * nenhum polling: o realtime existente da página (leads_aux_acidente +
 * contratos_fechados via useRealtime) recarrega o conjunto e o comparativo
 * recalcula em memória.
 *
 * MÉTRICAS POR ORIGEM:
 *  A) Total Leads                — leads da origem.
 *  B) Responsivos                — responsivo = 'sim'.
 *  C) Não Responsivos            — responsivo = 'nao'.
 *  D) Qualificados               — status_funil = 'qualificado'.
 *  E) Desqualificados            — status_funil = 'desqualificado'.
 *  F) Leads Convertidos          — leads com ≥ 1 contrato VÁLIDO (conta o LEAD,
 *                                  nunca a quantidade de contratos).
 *  G) Contratos Válidos          — total de contratos válidos da origem.
 *
 * Contrato válido = regra consolidada do Item 17 (isContratoValidoAuxAcidente):
 * beneficio 'Aux. Acidente', NÃO arquivado (Arquivar, Litispendência, Sem
 * Qualidade de Segurado, Tem Advogado — via isArchived()/invalidantes) e não
 * órfão. Reativado para status válido volta a contar automaticamente.
 *
 * TAXAS (fórmulas exatas):
 *  - Taxa de Resposta = Responsivos ÷ (Responsivos + Não Responsivos) × 100
 *    (não avaliados fora do denominador; denominador 0 → '—').
 *  - Taxa de Qualificação = Qualificados ÷ Total Leads × 100 (Total 0 → '—').
 *  - Taxa de Desqualificação = Desqualificados ÷ Total Leads × 100 (Total 0 → '—').
 *  - Conversão Geral = Leads Convertidos ÷ Total Leads × 100 (Total 0 → '—').
 *  - Conversão dos Qualificados = Leads Convertidos ÷ Qualificados × 100 (0 → '—').
 *
 * SEM VENCEDOR: nenhum ranking, troféu ou "melhor origem" — apenas os dados,
 * objetivamente, com destaque maior para Total Leads, Taxa de Qualificação e
 * Conversão Geral.
 *
 * FILTRO ORIGEM (recebido via prop): 'Todas' → dois painéis; 'Enlead' → apenas
 * o painel Enlead; 'Campanha' → apenas o painel Campanha. Nunca se compara
 * origens quando o próprio filtro excluiu uma delas.
 */

type Origem = 'enlead' | 'campanha'

interface AuxAcidenteComparativoOrigensProps {
  /** Lista JÁ FILTRADA pela página — mesma dos cards, funil e tabela. */
  leads: LeadAuxAcidente[]
  /** Filtro de origem atual da página ('' = Todas). */
  origemFiltro: string
  loading?: boolean
}

interface MetricasOrigem {
  totalLeads: number
  responsivos: number
  naoResponsivos: number
  qualificados: number
  desqualificados: number
  leadsConvertidos: number
  contratosValidos: number
}

const ZERO: MetricasOrigem = {
  totalLeads: 0,
  responsivos: 0,
  naoResponsivos: 0,
  qualificados: 0,
  desqualificados: 0,
  leadsConvertidos: 0,
  contratosValidos: 0,
}

function computeMetricas(leads: LeadAuxAcidente[], origem: Origem): MetricasOrigem {
  const m: MetricasOrigem = { ...ZERO }
  for (const l of leads) {
    if (l.origem_lead !== origem) continue
    m.totalLeads++
    if ((l.responsivo || '') === 'sim') m.responsivos++
    if ((l.responsivo || '') === 'nao') m.naoResponsivos++
    if (l.status_funil === 'qualificado') m.qualificados++
    if (l.status_funil === 'desqualificado') m.desqualificados++

    const contratos = Array.isArray(l.expand?.contratos) ? l.expand!.contratos! : []
    for (const c of contratos) {
      if (c && isContratoValidoAuxAcidente(c)) {
        m.contratosValidos++
        m.leadsConvertidos++
        break // lead convertido conta 1x, mesmo com vários contratos válidos
      }
    }
  }
  return m
}

/** Percentual com no máximo 1 casa decimal, vírgula brasileira. Denominador 0 → '—'. */
function pct(numerator: number, denominator: number): string {
  if (!Number.isFinite(denominator) || denominator <= 0) return '—'
  const v = (numerator / denominator) * 100
  if (!Number.isFinite(v)) return '—'
  return `${v.toFixed(1).replace('.', ',')}%`
}

interface Painel {
  origem: Origem
  label: string
  /** Cor discreta de identificação (borda superior + rótulo). */
  dotCls: string
  textCls: string
  m: MetricasOrigem
}

const ORIGEM_STYLE: Record<Origem, { dotCls: string; textCls: string }> = {
  enlead: {
    dotCls: 'bg-blue-500',
    textCls: 'text-[#33557A] dark:text-[#7FA9D4]',
  },
  campanha: {
    dotCls: 'bg-violet-500',
    textCls: 'text-[#5B21B6] dark:text-[#C4B5FD]',
  },
}

/** Bloco de taxa da hierarquia secundária. */
function TaxaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1.5 border-b border-[#F0F1F3] dark:border-border/60 last:border-0">
      <span className="text-[11px] text-[#78818E] dark:text-muted-foreground">{label}</span>
      <span
        className="text-[11px] font-semibold tabular-nums text-[#252B34] dark:text-foreground"
        title={value === '—' ? 'Sem base para calcular (denominador zero)' : undefined}
      >
        {value}
      </span>
    </div>
  )
}

function PainelOrigem({ painel }: { painel: Painel }) {
  const { m } = painel
  const taxaResposta = pct(m.responsivos, m.responsivos + m.naoResponsivos)
  const taxaQualificacao = pct(m.qualificados, m.totalLeads)
  const taxaDesqualificacao = pct(m.desqualificados, m.totalLeads)
  const conversaoGeral = pct(m.leadsConvertidos, m.totalLeads)
  const conversaoQualificados = pct(m.leadsConvertidos, m.qualificados)

  return (
    <div className="rounded-[10px] border border-[#E4E7EB] dark:border-border bg-white dark:bg-card shadow-sm overflow-hidden">
      {/* Faixa superior discreta de identificação da origem */}
      <div className={cn('h-1 w-full', painel.dotCls)} />

      <div className="px-4 pt-3 pb-4">
        {/* Cabeçalho do painel — nome da origem + Total Leads (destaque) */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className={cn('h-2 w-2 rounded-full shrink-0', painel.dotCls)} />
            <span className={cn('text-sm font-bold tracking-wide truncate', painel.textCls)}>
              {painel.label}
            </span>
          </div>
          <div className="text-right shrink-0" title="Total de leads da origem no filtro atual">
            <span className="text-xl font-bold tabular-nums text-[#252B34] dark:text-foreground leading-none">
              {m.totalLeads}
            </span>
            <span className="block text-[9px] font-bold tracking-wider uppercase text-[#78818E] dark:text-muted-foreground mt-0.5">
              Total Leads
            </span>
          </div>
        </div>

        {/* Destaques principais: Taxa de Qualificação e Conversão Geral */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="rounded-md bg-[#FAF8F2] dark:bg-muted/40 px-2.5 py-2 text-center">
            <span
              className="block text-lg font-bold tabular-nums text-[#252B34] dark:text-foreground leading-tight"
              title="Qualificados ÷ Total Leads × 100"
            >
              {taxaQualificacao}
            </span>
            <span className="block text-[9px] font-bold tracking-wider uppercase text-[#78818E] dark:text-muted-foreground mt-0.5">
              Taxa de Qualificação
            </span>
          </div>
          <div className="rounded-md bg-[#FAF8F2] dark:bg-muted/40 px-2.5 py-2 text-center">
            <span
              className="block text-lg font-bold tabular-nums text-[#C9922A] leading-tight"
              title="Leads Convertidos ÷ Total Leads × 100"
            >
              {conversaoGeral}
            </span>
            <span className="block text-[9px] font-bold tracking-wider uppercase text-[#78818E] dark:text-muted-foreground mt-0.5">
              Conversão Geral
            </span>
          </div>
        </div>

        {/* Métricas absolutas — hierarquia secundária */}
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1 mb-3 text-[11px]">
          <div className="flex items-center justify-between gap-2">
            <dt className="text-[#78818E] dark:text-muted-foreground">Responsivos</dt>
            <dd
              className="font-semibold tabular-nums text-[#252B34] dark:text-foreground"
              title="responsivo = 'sim'"
            >
              {m.responsivos}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt className="text-[#78818E] dark:text-muted-foreground">Não Responsivos</dt>
            <dd
              className="font-semibold tabular-nums text-[#252B34] dark:text-foreground"
              title="responsivo = 'nao'"
            >
              {m.naoResponsivos}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt className="text-[#78818E] dark:text-muted-foreground">Qualificados</dt>
            <dd
              className="font-semibold tabular-nums text-[#252B34] dark:text-foreground"
              title="status_funil = 'qualificado'"
            >
              {m.qualificados}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt className="text-[#78818E] dark:text-muted-foreground">Desqualificados</dt>
            <dd
              className="font-semibold tabular-nums text-[#252B34] dark:text-foreground"
              title="status_funil = 'desqualificado'"
            >
              {m.desqualificados}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt className="text-[#78818E] dark:text-muted-foreground">Convertidos</dt>
            <dd
              className="font-semibold tabular-nums text-[#252B34] dark:text-foreground"
              title="Leads com ≥ 1 contrato válido (regra do Item 17) — conta o lead, não o contrato"
            >
              {m.leadsConvertidos}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt className="text-[#78818E] dark:text-muted-foreground">Contratos Válidos</dt>
            <dd
              className="font-semibold tabular-nums text-[#252B34] dark:text-foreground"
              title="Contratos Aux. Acidente não arquivados/invalidantes — regra do Item 17"
            >
              {m.contratosValidos}
            </dd>
          </div>
        </dl>

        {/* Taxas — hierarquia secundária */}
        <div>
          <TaxaItem label="Taxa de Resposta" value={taxaResposta} />
          <TaxaItem label="Taxa de Desqualificação" value={taxaDesqualificacao} />
          <TaxaItem label="Conversão dos Qualificados" value={conversaoQualificados} />
        </div>
      </div>
    </div>
  )
}

export function AuxAcidenteComparativoOrigens({
  leads,
  origemFiltro,
  loading,
}: AuxAcidenteComparativoOrigensProps) {
  const origensVisiveis = useMemo<Origem[]>(() => {
    // Origem=Todas → comparação Enlead × Campanha; filtro numa origem específica
    // → apenas ela (nunca comparar com uma origem que o filtro excluiu).
    if (origemFiltro === 'enlead') return ['enlead']
    if (origemFiltro === 'campanha') return ['campanha']
    return ['enlead', 'campanha']
  }, [origemFiltro])

  const metricas = useMemo(() => {
    const enlead = computeMetricas(leads, 'enlead')
    const campanha = computeMetricas(leads, 'campanha')
    return { enlead, campanha }
  }, [leads])

  const paineis: Painel[] = origensVisiveis.map((o) => ({
    origem: o,
    label: ORIGEM_LABELS[o] || o,
    ...ORIGEM_STYLE[o],
    m: metricas[o],
  }))

  // Com um único painel, o rótulo do card é o nome da origem (nada de "×").
  const titulo =
    paineis.length === 2 ? 'Comparativo por Origem' : `Comparativo por Origem — ${paineis[0].label}`

  return (
    <div className="rounded-[10px] border border-[#E4E7EB] dark:border-border bg-white dark:bg-card shadow-sm">
      <div className="px-4 py-3 border-b border-[#E4E7EB] dark:border-border flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-[#252B34] dark:text-foreground">{titulo}</h2>
        <div className="flex items-center gap-3">
          {loading && (
            <span className="text-[11px] text-[#78818E] dark:text-muted-foreground">
              Atualizando...
            </span>
          )}
          {paineis.length === 2 && (
            <div className="hidden sm:flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              <span className="text-[10px] font-semibold text-[#78818E] dark:text-muted-foreground">
                Enlead
              </span>
              <span className="text-[10px] text-[#78818E]/60 mx-0.5">×</span>
              <span className="h-2 w-2 rounded-full bg-violet-500" />
              <span className="text-[10px] font-semibold text-[#78818E] dark:text-muted-foreground">
                Campanha
              </span>
            </div>
          )}
        </div>
      </div>

      <div
        className={cn(
          'p-4 grid gap-3',
          paineis.length === 2 ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1',
        )}
      >
        {paineis.map((p) => (
          <PainelOrigem key={p.origem} painel={p} />
        ))}
      </div>

      <div className="px-4 pb-3">
        <p className="text-[10px] text-[#78818E] dark:text-muted-foreground/80 leading-relaxed">
          Convertidos = leads com pelo menos 1 contrato VÁLIDO (Aux. Acidente, não arquivado —
          Arquivar, Litispendência, Sem Qualidade de Segurado e Tem Advogado não contam; reativado
          volta a contar). Taxa de Resposta considera apenas leads avaliados (Sim ÷ (Sim + Não)).
          Origens têm papéis distintos: uma pode ter mais volume, outra mais qualidade/conversão.
        </p>
      </div>
    </div>
  )
}
