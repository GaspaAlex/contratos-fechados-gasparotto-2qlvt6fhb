import { useMemo } from 'react'
import type { LeadAuxAcidente } from '@/services/leadsAuxAcidente'
import { isContratoValidoAuxAcidente } from '@/services/leadsAuxAcidente'
import { cn } from '@/lib/utils'

/**
 * FUNIL COMERCIAL — Central Auxílio-Acidente (Item 18).
 *
 * Fonte de verdade: EXCLUSIVAMENTE a lista já filtrada da página (props),
 * a MESMA que alimenta os cards e a tabela — nenhuma consulta extra, nenhum
 * polling. Realtime sai naturalmente: a página recarrega `leads_aux_acidente`
 * e `contratos_fechados` via useRealtime e o funil deriva do mesmo estado.
 *
 * ETAPAS (fórmulas próprias do funil — INTENCIONALMENTE distintas dos cards):
 *  - Leads:       total do conjunto filtrado.
 *  - Responsivos: responsivo = 'sim'.
 *  - Qualificados: status_funil = 'qualificado'.
 *  - Convertidos: leads com ≥ 1 contrato VÁLIDO (isContratoValidoAuxAcidente,
 *    regra do Item 17) — conta o LEAD 1x, nunca a quantidade de contratos.
 *
 * TAXAS: percentual da etapa em relação à etapa ANTERIOR (a primeira não tem
 * taxa). Denominador 0 → '—' (nunca NaN/Infinity/0%). Números reais SEMPRE:
 * se Qualificados > Responsivos, mostra 110% — nada é "corrigido".
 * Cards (AuxAcidenteCards) permanecem com suas fórmulas originais.
 */

interface AuxAcidenteFunilProps {
  /** Lista JÁ FILTRADA pela página — mesma dos cards e da tabela. */
  leads: LeadAuxAcidente[]
  loading?: boolean
}

/** Percentual com no máximo 1 casa decimal, vírgula brasileira. Denominador zero → '—'. */
function fmtPct1(numerator: number, denominator: number): string {
  if (!Number.isFinite(denominator) || denominator <= 0) return '—'
  const pct = (numerator / denominator) * 100
  if (!Number.isFinite(pct)) return '—'
  return `${pct.toFixed(1).replace('.', ',')}%`
}

interface Etapa {
  key: string
  label: string
  /** Descrição da contagem (title/tooltip). */
  desc: string
  count: number
  /** Taxa em relação à etapa anterior ('' = primeira etapa, sem %). */
  taxa: string
  /** Taxa em texto puro para o tooltip ("Responsivos ÷ Leads × 100"). */
  taxaFormula: string
  /** Cores da barra/bloco da etapa. */
  barCls: string
  textCls: string
}

export function AuxAcidenteFunil({ leads, loading }: AuxAcidenteFunilProps) {
  const etapas = useMemo<Etapa[]>(() => {
    let responsivos = 0
    let qualificados = 0
    let convertidos = 0

    for (const l of leads) {
      if ((l.responsivo || '') === 'sim') responsivos++
      if (l.status_funil === 'qualificado') qualificados++

      // Lead convertido ⇔ pelo menos 1 contrato VÁLIDO (conta o lead 1x).
      const contratos = Array.isArray(l.expand?.contratos) ? l.expand!.contratos! : []
      for (const c of contratos) {
        if (c && isContratoValidoAuxAcidente(c)) {
          convertidos++
          break
        }
      }
    }

    const total = leads.length

    const base: Omit<Etapa, 'taxa' | 'taxaFormula'>[] = [
      {
        key: 'leads',
        label: 'Leads',
        desc: 'Total de leads no filtro atual — igual ao contador Leads (X) da tabela',
        count: total,
        barCls: 'bg-[#3B4252] dark:bg-[#3B4252]',
        textCls: 'text-[#252B34] dark:text-foreground',
      },
      {
        key: 'responsivos',
        label: 'Responsivos',
        desc: "Leads com responsivo = 'sim'",
        count: responsivos,
        barCls: 'bg-[#4A7FB5] dark:bg-[#4A7FB5]',
        textCls: 'text-[#33557A] dark:text-[#7FA9D4]',
      },
      {
        key: 'qualificados',
        label: 'Qualificados',
        desc: "Leads com status_funil = 'qualificado'",
        count: qualificados,
        barCls: 'bg-[#3E8E5A] dark:bg-[#3E8E5A]',
        textCls: 'text-[#3E8E5A] dark:text-[#52B86E]',
      },
      {
        key: 'convertidos',
        label: 'Convertidos',
        desc: 'Leads com pelo menos 1 contrato VÁLIDO (Aux. Acidente, não arquivado, não invalidante) — conta o lead 1x',
        count: convertidos,
        barCls: 'bg-[#C9922A] dark:bg-[#C9922A]',
        textCls: 'text-[#C9922A]',
      },
    ]

    return base.map((e, i) => {
      if (i === 0) return { ...e, taxa: '', taxaFormula: '' }
      const prev = base[i - 1].count
      return {
        ...e,
        taxa: fmtPct1(e.count, prev),
        taxaFormula: `${e.label} ÷ ${base[i - 1].label} × 100`,
      }
    })
  }, [leads])

  const max = etapas[0]?.count || 0

  return (
    <div className="rounded-[10px] border border-[#E4E7EB] dark:border-border bg-white dark:bg-card shadow-sm">
      <div className="px-4 py-3 border-b border-[#E4E7EB] dark:border-border flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-[#252B34] dark:text-foreground">Funil Comercial</h2>
        {loading && (
          <span className="text-[11px] text-[#78818E] dark:text-muted-foreground">
            Atualizando...
          </span>
        )}
      </div>

      <div className="p-4">
        <ol className="flex flex-col gap-2.5">
          {etapas.map((e, i) => {
            const widthPct = max > 0 ? Math.min(100, (e.count / max) * 100) : 0
            return (
              <li
                key={e.key}
                className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3"
              >
                {/* Rótulo da etapa — largura fixa no desktop para barras alinhadas */}
                <div className="flex items-baseline justify-between sm:justify-start sm:w-[130px] sm:shrink-0 gap-2">
                  <span
                    className={cn(
                      'text-[11px] font-bold tracking-wider uppercase text-[#78818E] dark:text-muted-foreground',
                    )}
                  >
                    {e.label}
                  </span>
                  <span
                    className={cn('text-sm font-bold tabular-nums sm:order-first', e.textCls)}
                    title={e.desc}
                  >
                    {e.count}
                  </span>
                </div>

                {/* Barra proporcional à etapa Leads */}
                <div className="flex-1 min-w-0">
                  <div className="h-6 w-full rounded-md bg-[#F5F6F8] dark:bg-muted/40 overflow-hidden">
                    {e.count > 0 ? (
                      <div
                        className={cn(
                          'h-full rounded-md transition-[width] duration-300',
                          e.barCls,
                        )}
                        style={{ width: `${widthPct}%` }}
                        title={e.desc}
                      />
                    ) : null}
                  </div>
                </div>

                {/* Taxa em relação à etapa anterior */}
                <div className="sm:w-[170px] sm:shrink-0 sm:text-right">
                  {e.taxa ? (
                    <span
                      className="text-[11px] font-semibold text-[#78818E] dark:text-muted-foreground tabular-nums whitespace-nowrap"
                      title={`${e.taxaFormula} — etapa anterior = ${etapas[i - 1].count}`}
                    >
                      {e.taxa} dos{' '}
                      {i === 1
                        ? 'Leads'
                        : etapas[i - 1].label.charAt(0).toUpperCase() +
                          etapas[i - 1].label.slice(1).toLowerCase()}
                    </span>
                  ) : (
                    <span
                      className="text-[11px] text-[#78818E] dark:text-muted-foreground/70 whitespace-nowrap"
                      title="Etapa inicial do funil"
                    >
                      etapa inicial
                    </span>
                  )}
                </div>
              </li>
            )
          })}
        </ol>

        <p className="mt-3 text-[10px] text-[#78818E] dark:text-muted-foreground/80 leading-relaxed">
          Taxa de cada etapa em relação à etapa anterior. Os cards acima usam fórmulas próprias
          (ex.: Taxa de Qualificação = Qualificados ÷ Total Leads); aqui Qualificados é medido sobre
          Responsivos. Números reais — etapas podem não ser estritamente decrescentes.
        </p>
      </div>
    </div>
  )
}
