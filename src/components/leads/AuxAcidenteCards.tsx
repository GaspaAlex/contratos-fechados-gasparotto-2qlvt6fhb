import { useMemo } from 'react'
import type { LeadAuxAcidente } from '@/services/leadsAuxAcidente'
import { cn } from '@/lib/utils'

/**
 * CARDS PRINCIPAIS DO DASHBOARD — Central Auxílio-Acidente.
 *
 * Fonte de verdade: EXCLUSIVAMENTE a lista já filtrada da página
 * (leads_aux_acidente + relation `contratos`), derivada EM MEMÓRIA —
 * nenhuma consulta extra por card. Recebe o MESMO array `filteredLeads`
 * que alimenta a tabela, garantindo Total Leads === contador "Leads (X)".
 *
 * Sem gráficos, funil, metas, comparativos ou lógica de Leads Campanha.
 */

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
  /** classes de destaque do número (tons institucionais discretos) */
  valueCls?: string
  title?: string
}

function MetricCard({ label, value, valueCls, title }: Metric) {
  return (
    <div
      className="rounded-[10px] border border-[#E4E7EB] dark:border-border bg-white dark:bg-card shadow-sm px-3.5 py-3 flex flex-col justify-between min-h-[78px]"
      title={title}
    >
      <span className="text-[10px] font-bold tracking-wider uppercase text-[#78818E] dark:text-muted-foreground truncate">
        {label}
      </span>
      <span
        className={cn(
          'text-xl sm:text-2xl font-bold tracking-tight tabular-nums text-[#252B34] dark:text-foreground leading-tight',
          valueCls,
        )}
      >
        {value}
      </span>
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
    // Set de IDs distintos: lead com 2+ contratos conta 1 contratação,
    // e o mesmo contrato relacionado a 2 leads não é contado 2x.
    const contratoIds = new Set<string>()

    for (const l of leads) {
      const r = l.responsivo || ''
      if (r === 'sim') responsivos++
      else if (r === 'nao') naoResponsivos++

      if (l.status_funil === 'qualificado') qualificados++
      if (l.status_funil === 'desqualificado') desqualificados++

      const contratos = Array.isArray(l.contratos) ? l.contratos : []
      if (contratos.length > 0) {
        convertidos++
        for (const id of contratos) {
          if (id) contratoIds.add(id)
        }
      }
    }

    const total = leads.length
    const avaliados = responsivos + naoResponsivos

    return {
      total,
      responsivos,
      qualificados,
      desqualificados,
      convertidos,
      contratos: contratoIds.size,
      // G) Responsivos ÷ (Responsivos + Não Responsivos) × 100 — vazio fora do denominador
      taxaResposta: avaliados > 0 ? (responsivos / avaliados) * 100 : null,
      // H) Qualificados ÷ Total Leads × 100
      taxaQualificacao: total > 0 ? (qualificados / total) * 100 : null,
      // I) Leads Convertidos ÷ Total Leads × 100
      conversaoGeral: total > 0 ? (convertidos / total) * 100 : null,
      // J) Leads Convertidos ÷ Qualificados × 100
      convQualificados: qualificados > 0 ? (convertidos / qualificados) * 100 : null,
    }
  }, [leads])

  const volumeCards: Metric[] = [
    { label: 'Total Leads', value: String(m.total) },
    {
      label: 'Responsivos',
      value: String(m.responsivos),
      valueCls: 'text-[#3E8E5A] dark:text-[#52B86E]',
      title: "Leads com responsivo = 'sim'",
    },
    {
      label: 'Qualificados',
      value: String(m.qualificados),
      valueCls: 'text-[#3E8E5A] dark:text-[#52B86E]',
      title: "Leads com status_funil = 'qualificado'",
    },
    {
      label: 'Desqualificados',
      value: String(m.desqualificados),
      valueCls: 'text-[#B4453C] dark:text-[#D97A72]',
      title: "Leads com status_funil = 'desqualificado'",
    },
    {
      label: 'Leads Convertidos',
      value: String(m.convertidos),
      valueCls: 'text-[#C9922A]',
      title: 'Leads com pelo menos 1 contrato relacionado (conta o lead 1x)',
    },
    {
      label: 'Contratos',
      value: String(m.contratos),
      valueCls: 'text-[#C9922A]',
      title: 'Total de contratos distintos vinculados aos leads filtrados',
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
      title: 'Leads Convertidos ÷ Total Leads × 100',
    },
    {
      label: 'Conv. Qualificados',
      value: fmtPct1(m.convQualificados),
      title: 'Leads Convertidos ÷ Qualificados × 100',
    },
  ]

  const groupCls =
    'text-[10px] font-bold tracking-[1.5px] uppercase text-[#78818E] dark:text-muted-foreground'

  return (
    <div className="space-y-2.5">
      {/* GRUPO 1 — VOLUME */}
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
          {volumeCards.map((c) => (
            <MetricCard key={c.label} {...c} />
          ))}
        </div>
      </div>

      {/* GRUPO 2 — TAXAS */}
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
