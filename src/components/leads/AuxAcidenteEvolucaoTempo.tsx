import { useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { LeadAuxAcidente } from '@/services/leadsAuxAcidente'
import { isContratoValidoAuxAcidente } from '@/services/leadsAuxAcidente'
import { cn } from '@/lib/utils'

/**
 * EVOLUÇÃO POR PERÍODO (Item 20).
 *
 * Seção RECOLHÍVEL, recolhida por padrão, com um ÚNICO gráfico de linhas:
 * Leads, Qualificados e Convertidos por data de entrada do lead.
 *
 * Fonte de verdade: EXCLUSIVAMENTE a lista já filtrada da página (props) —
 * a MESMA que alimenta os cards, o funil, o comparativo por origem e a tabela.
 * Nenhuma consulta extra, nenhum polling: o realtime existente da página
 * (leads_aux_acidente + contratos_fechados via useRealtime) recarrega o
 * conjunto e a agregação recalcula em memória (useMemo).
 *
 * DEFINIÇÕES (idênticas às dos cards/funil e do Item 19):
 *  - Leads        — cada lead do conjunto filtrado, agregado por data de entrada.
 *  - Qualificados — status_funil = 'qualificado' (mesma definição dos cards).
 *  - Convertidos  — leads com ≥ 1 contrato VÁLIDO, contados UMA VEZ por lead
 *                   (regra do Item 17: isContratoValidoAuxAcidente — Aux.
 *                   Acidente, não arquivado via isArchived(), não invalidante;
 *                   órfãos ignorados; reativação volta a contar).
 *
 * Eixo X: somente as datas de entrada presentes no conjunto filtrado, ordenadas.
 * SEM granularidade, SEM metas, SEM rankings, SEM séries extras.
 */

interface AuxAcidenteEvolucaoTempoProps {
  /** Lista JÁ FILTRADA pela página — mesma dos cards, funil e tabela. */
  leads: LeadAuxAcidente[]
  loading?: boolean
}

/** Cor discreta de cada série (legenda + linha). */
const SERIES = {
  leads: { key: 'leads', label: 'Leads', color: '#3B82F6' },
  qualificados: { key: 'qualificados', label: 'Qualificados', color: '#22A559' },
  convertidos: { key: 'convertidos', label: 'Convertidos', color: '#E8A93D' },
} as const

/** 'dd/mm' a partir de 'YYYY-MM-DD' (tolerante a hora) — rótulo do eixo X. */
function formatDia(dataPart: string): string {
  const [y, m, d] = dataPart.split('-')
  if (!y || !m || !d) return dataPart
  return `${d}/${m}`
}

interface PontoSerie {
  /** Data de entrada normalizada 'YYYY-MM-DD'. */
  data: string
  /** Rótulo do eixo X ('dd/mm'). */
  label: string
  leads: number
  qualificados: number
  convertidos: number
}

export function AuxAcidenteEvolucaoTempo({ leads, loading }: AuxAcidenteEvolucaoTempoProps) {
  const [expandido, setExpandido] = useState(false)

  /** Agregação por data de entrada — derivada 100% em memória da lista filtrada. */
  const pontos = useMemo<PontoSerie[]>(() => {
    const porData = new Map<string, PontoSerie>()

    for (const l of leads) {
      const data = String(l.data_entrada || '')
        .split(' ')[0]
        .split('T')[0]
      if (!data) continue

      let ponto = porData.get(data)
      if (!ponto) {
        ponto = { data, label: formatDia(data), leads: 0, qualificados: 0, convertidos: 0 }
        porData.set(data, ponto)
      }
      ponto.leads++

      if (l.status_funil === 'qualificado') ponto.qualificados++

      if (!ponto.convertidos) {
        const contratos = Array.isArray(l.expand?.contratos) ? l.expand!.contratos! : []
        for (const c of contratos) {
          if (c && isContratoValidoAuxAcidente(c)) {
            ponto.convertidos++
            break // convertido conta UMA VEZ por lead, mesmo com vários contratos
          }
        }
      }
    }

    return Array.from(porData.values()).sort((a, b) => (a.data < b.data ? -1 : 1))
  }, [leads])

  const totalLeads = pontos.reduce((acc, p) => acc + p.leads, 0)
  const totalQualificados = pontos.reduce((acc, p) => acc + p.qualificados, 0)
  const totalConvertidos = pontos.reduce((acc, p) => acc + p.convertidos, 0)

  return (
    <div className="rounded-[10px] border border-[#E4E7EB] dark:border-border bg-white dark:bg-card shadow-sm">
      {/* Cabeçalho clicável — compacto e discreto quando recolhido (padrão) */}
      <button
        type="button"
        onClick={() => setExpandido((v) => !v)}
        className="w-full px-4 py-3 flex items-center justify-between gap-2 text-left hover:bg-[#FAF8F2] dark:hover:bg-muted/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9922A]/40 rounded-[10px]"
        aria-expanded={expandido}
        aria-controls="evolucao-periodo-conteudo"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="h-2 w-2 rounded-full shrink-0 bg-[#C9922A]" />
          <h2 className="text-sm font-bold text-[#252B34] dark:text-foreground">
            Evolução por período
          </h2>
          <span className="hidden sm:inline text-[11px] text-[#78818E] dark:text-muted-foreground font-normal truncate">
            Leads, Qualificados e Convertidos por data de entrada.
          </span>
          {!expandido && (
            <span className="hidden md:inline-flex items-center gap-1.5 ml-2 text-[10px] font-semibold text-[#78818E] dark:text-muted-foreground">
              <span className="tabular-nums">{totalLeads} leads</span>
              <span className="text-[#78818E]/50">·</span>
              <span className="tabular-nums">{totalQualificados} qualificados</span>
              <span className="text-[#78818E]/50">·</span>
              <span className="tabular-nums">{totalConvertidos} convertidos</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {loading && (
            <span className="text-[11px] text-[#78818E] dark:text-muted-foreground">
              Atualizando...
            </span>
          )}
          <ChevronDown
            className={cn(
              'h-4 w-4 text-[#78818E] transition-transform duration-200',
              expandido && 'rotate-180',
            )}
          />
        </div>
      </button>

      {expandido && (
        <div
          id="evolucao-periodo-conteudo"
          className="px-4 pt-1 pb-4 border-t border-[#E4E7EB] dark:border-border"
        >
          {pontos.length === 0 ? (
            <p className="py-8 text-center text-xs text-[#78818E] dark:text-muted-foreground">
              Nenhum lead no período filtrado.
            </p>
          ) : (
            <div className="h-[260px] w-full pt-3">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={pontos} margin={{ top: 8, right: 12, left: -18, bottom: 4 }}>
                  <CartesianGrid
                    vertical={false}
                    stroke="#E4E7EB"
                    strokeDasharray="3 3"
                    opacity={0.6}
                  />
                  <XAxis
                    dataKey="label"
                    axisLine={{ stroke: '#E4E7EB', strokeWidth: 1 }}
                    tickLine={false}
                    tick={{ fill: '#78818E', fontSize: 10 }}
                    interval="preserveStartEnd"
                    minTickGap={24}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#78818E', fontSize: 10 }}
                    allowDecimals={false}
                    domain={[0, (dataMax: number) => Math.max(2, dataMax + 1)]}
                  />
                  <Tooltip
                    cursor={{ stroke: '#C9922A', strokeWidth: 1, strokeDasharray: '3 3' }}
                    formatter={(value: number) => String(value)}
                    labelFormatter={(label: string) =>
                      `${label}${pontos.find((p) => p.label === label)?.data ? `/${pontos.find((p) => p.label === label)!.data.slice(0, 4)}` : ''}`
                    }
                    contentStyle={{
                      borderRadius: 8,
                      border: '1px solid #E4E7EB',
                      fontSize: 11,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey={SERIES.leads.key}
                    name={SERIES.leads.label}
                    stroke={SERIES.leads.color}
                    strokeWidth={2}
                    dot={{ r: 2.5, fill: SERIES.leads.color, strokeWidth: 0 }}
                    activeDot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="qualificados"
                    name={SERIES.qualificados.label}
                    stroke={SERIES.qualificados.color}
                    strokeWidth={2}
                    dot={{ r: 2.5, fill: SERIES.qualificados.color, strokeWidth: 0 }}
                    activeDot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="convertidos"
                    name={SERIES.convertidos.label}
                    stroke={SERIES.convertidos.color}
                    strokeWidth={2}
                    dot={{ r: 2.5, fill: SERIES.convertidos.color, strokeWidth: 0 }}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>

              {/* Legenda discreta abaixo do gráfico (padrão do sistema) */}
              <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
                {Object.values(SERIES).map((s) => (
                  <span key={s.key} className="inline-flex items-center gap-1.5">
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: s.color }}
                    />
                    <span className="text-[11px] font-semibold text-[#78818E] dark:text-muted-foreground">
                      {s.label}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
