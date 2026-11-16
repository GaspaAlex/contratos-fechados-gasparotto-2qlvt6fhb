import { useMemo } from 'react'
import type { LeadAuxAcidente } from '@/services/leadsAuxAcidente'
import { isContratoValidoAuxAcidente } from '@/services/leadsAuxAcidente'
import { cn } from '@/lib/utils'

/**
 * CARDS PRINCIPAIS DO DASHBOARD — Central Auxílio-Acidente.
 *
 * Fonte de verdade: EXCLUSIVAMENTE a lista já filtrada da página
 * (leads_aux_acidente + relation `contratos` EXPANDIDA), derivada EM MEMÓRIA —
 * nenhuma consulta extra por card. Recebe o MESMO array `filteredLeads`
 * que alimenta a tabela, garantindo Total Leads === contador "Leads (X)".
 *
 * CONTRATO VÁLIDO: relation + beneficio === 'Aux. Acidente' + status NÃO
 * arquivado (isArchived() de src/lib/archivedStatuses.ts). A relation é
 * HISTÓRICO — arquivar/excluir contrato NUNCA remove o vínculo, só o retira
 * dos indicadores. status_funil nunca é revertido por queda de contrato.
 *
 * Sem gráficos, funil, metas, comparativos ou lógica de Leads Campanha
 * (apenas o FORMATO visual dos cards é emprestado de DashBlocks.tsx).
 */

/**
 * TOTAL LEADS — card executivo grafite (formato DashBlocks): fundo/borda
 * grafite, texto branco, bolinha dourada e número principal dourado.
 */
function TotalLeadsCard({ value, title }: { value: string; title?: string }) {
  return (
    <div
      className="relative overflow-hidden rounded-[10px] border border-[#2E3440] bg-[#22262E] text-white shadow-sm px-3.5 py-3 flex flex-col justify-between min-h-[86px]"
      title={title}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold tracking-wider uppercase text-[#9EA7B6] truncate">
          Total Leads
        </span>
        <div className="h-2 w-2 rounded-full bg-[#D9A94A] shrink-0" />
      </div>
      <div className="text-2xl sm:text-[27px] font-bold tracking-tight tabular-nums leading-tight text-[#D9A94A]">
        {value}
      </div>
    </div>
  )
}

interface AuxAcidenteCardsProps {
  /** Lista JÁ FILTRADA pela página — mesma da tabela. */
  leads: LeadAuxAcidente[]
  loading?: boolean
}

/** Percentual com no máximo 1 casa decimal, vírgula brasileira. Denominador zero → '—'. */
function fmtPct1(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—'
  return `${value.toFixed(1).replace('.', ',')}%`
}

interface Metric {
  label: string
  value: string
  /** classes de destaque do número */
  valueCls?: string
  /** badge discreto no canto superior direito (estilo Leads Campanha) */
  badge?: string
  badgeCls?: string
  title?: string
}

function MetricCard({ label, value, valueCls, badge, badgeCls, title }: Metric) {
  return (
    <div
      className="rounded-[10px] border border-[#E4E7EB] dark:border-border bg-white dark:bg-card shadow-sm px-3.5 py-3 flex flex-col justify-between min-h-[86px]"
      title={title}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold tracking-wider uppercase text-[#78818E] dark:text-muted-foreground truncate">
          {label}
        </span>
        {badge && (
          <span
            className={cn(
              'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase shrink-0',
              badgeCls,
            )}
          >
            {badge}
          </span>
        )}
      </div>
      <div className="my-1">
        <div
          className={cn(
            'text-2xl sm:text-[27px] font-bold tracking-tight tabular-nums leading-tight text-[#252B34] dark:text-foreground',
            valueCls,
          )}
        >
          {value}
        </div>
      </div>
      {/* divisória inferior padrão DashBlocks (taxas mantêm a linha; volume fecha compacto) */}
      <div className="border-t border-[#E4E7EB]/60 dark:border-border/60" />
    </div>
  )
}

export function AuxAcidenteCards({ leads, loading }: AuxAcidenteCardsProps) {
  const m = useMemo(() => {
    let responsivos = 0
    let naoResponsivos = 0
    let qualificados = 0
    let desqualificados = 0
    let convertidos = 0
    // Set de IDs distintos — SOMENTE contratos VÁLIDOS (Aux. Acidente + não arquivado).
    // Órfãos (ID sem registro) e duplicidades não contam.
    const contratoValidoIds = new Set<string>()

    for (const l of leads) {
      const r = l.responsivo || ''
      if (r === 'sim') responsivos++
      else if (r === 'nao') naoResponsivos++

      if (l.status_funil === 'qualificado') qualificados++
      if (l.status_funil === 'desqualificado') desqualificados++

      // Relation = histórico: itera os contratos EXPANDIDOS (dados reais).
      // Lead convertido ⇔ pelo menos 1 contrato VÁLIDO (conta o lead 1x).
      const expandContratos = l.expand?.contratos
      const contratos = Array.isArray(expandContratos) ? expandContratos : []
      let temValido = false
      for (const c of contratos) {
        if (!c) continue
        if (isContratoValidoAuxAcidente(c)) {
          temValido = true
          contratoValidoIds.add(c.id)
        }
      }
      if (temValido) convertidos++
    }

    const total = leads.length
    const avaliados = responsivos + naoResponsivos

    return {
      total,
      responsivos,
      qualificados,
      desqualificados,
      convertidos,
      contratosValidos: contratoValidoIds.size,
      // Responsivos ÷ (Responsivos + Não Responsivos) × 100 — vazio fora do denominador
      taxaResposta: avaliados > 0 ? (responsivos / avaliados) * 100 : null,
      // Qualificados ÷ Total Leads × 100
      taxaQualificacao: total > 0 ? (qualificados / total) * 100 : null,
      // Leads Convertidos (só contratos válidos) ÷ Total Leads × 100
      conversaoGeral: total > 0 ? (convertidos / total) * 100 : null,
      // Leads Convertidos (só válidos) ÷ Qualificados × 100
      convQualificados: qualificados > 0 ? (convertidos / qualificados) * 100 : null,
    }
  }, [leads])

  const volumeCards: Metric[] = [
    {
      label: 'Responsivos',
      value: String(m.responsivos),
      valueCls: 'text-[#3E8E5A] dark:text-[#52B86E]',
      badge: 'RESPONSIVO',
      badgeCls: 'text-[#3E8E5A] bg-[#3E8E5A]/10 border border-[#3E8E5A]/20',
      title: "Leads com responsivo = 'sim'",
    },
    {
      label: 'Qualificados',
      value: String(m.qualificados),
      valueCls: 'text-[#3E8E5A] dark:text-[#52B86E]',
      badge: 'VÁLIDOS',
      badgeCls: 'text-[#3E8E5A] bg-[#3E8E5A]/10 border border-[#3E8E5A]/20',
      title: "Leads com status_funil = 'qualificado'",
    },
    {
      label: 'Desqualificados',
      value: String(m.desqualificados),
      valueCls: 'text-[#B4453C] dark:text-[#D97A72]',
      badge: 'FILTRADOS',
      badgeCls: 'text-[#B4453C] bg-[#B4453C]/10 border border-[#B4453C]/20',
      title: "Leads com status_funil = 'desqualificado'",
    },
    {
      label: 'Leads Convertidos',
      value: String(m.convertidos),
      valueCls: 'text-[#C9922A]',
      badge: 'CONVERSÃO',
      badgeCls: 'text-[#C9922A] bg-[#C9922A]/10 border border-[#C9922A]/20',
      title:
        'Leads com pelo menos 1 contrato VÁLIDO (Aux. Acidente, não arquivado) — conta o lead 1x',
    },
    {
      label: 'Contratos',
      value: String(m.contratosValidos),
      valueCls: 'text-[#C9922A]',
      badge: 'VÁLIDOS',
      badgeCls: 'text-[#C9922A] bg-[#C9922A]/10 border border-[#C9922A]/20',
      title:
        'Contratos válidos distintos (Aux. Acidente + status não arquivado) vinculados aos leads filtrados',
    },
  ]

  const taxaCards: Metric[] = [
    {
      label: 'Taxa de Resposta',
      value: fmtPct1(m.taxaResposta),
      title: 'Responsivos ÷ (Responsivos + Não Responsivos) × 100 — não avaliados fora do cálculo',
    },
    {
      label: 'Taxa de Qualificação',
      value: fmtPct1(m.taxaQualificacao),
      title: 'Qualificados ÷ Total Leads × 100',
    },
    {
      label: 'Conversão Geral',
      value: fmtPct1(m.conversaoGeral),
      title: 'Leads Convertidos (contratos válidos) ÷ Total Leads × 100',
    },
    {
      label: 'Conv. Qualificados',
      value: fmtPct1(m.convQualificados),
      title: 'Leads Convertidos (contratos válidos) ÷ Qualificados × 100',
    },
  ]

  const groupCls =
    'text-[10px] font-bold tracking-[1.5px] uppercase text-[#78818E] dark:text-muted-foreground'

  return (
    <div className="space-y-2.5">
      {/* GRUPO 1 — VOLUME (6 cards, formato DashBlocks) */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className={groupCls}>Volume</span>
          {loading && (
            <span className="text-[10px] text-[#78818E] dark:text-muted-foreground">
              Atualizando...
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
          <TotalLeadsCard
            value={String(m.total)}
            title="Total de leads no filtro atual — igual ao contador Leads (X) da tabela"
          />
          {volumeCards.map((c) => (
            <VolumeCard key={c.label} {...c} />
          ))}
        </div>
      </div>

      {/* GRUPO 2 — TAXAS (4 cards, formato DashBlocks: número em destaque + divisória) */}
      <div>
        <div className="mb-2">
          <span className={groupCls}>Taxas</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-4 gap-3">
          {taxaCards.map((c) => (
            <MetricCard key={c.label} {...c} />
          ))}
        </div>
      </div>
    </div>
  )
}

/** Card de volume — compacto, sem divisória inferior. */
function VolumeCard({ label, value, valueCls, badge, badgeCls, title }: Metric) {
  return (
    <div
      className="rounded-[10px] border border-[#E4E7EB] dark:border-border bg-white dark:bg-card shadow-sm px-3.5 py-3 flex flex-col justify-between min-h-[86px]"
      title={title}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold tracking-wider uppercase text-[#78818E] dark:text-muted-foreground truncate">
          {label}
        </span>
        {badge && (
          <span
            className={cn(
              'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase shrink-0',
              badgeCls,
            )}
          >
            {badge}
          </span>
        )}
      </div>
      <div
        className={cn(
          'text-2xl sm:text-[27px] font-bold tracking-tight tabular-nums leading-tight text-[#252B34] dark:text-foreground',
          valueCls,
        )}
      >
        {value}
      </div>
    </div>
  )
}
