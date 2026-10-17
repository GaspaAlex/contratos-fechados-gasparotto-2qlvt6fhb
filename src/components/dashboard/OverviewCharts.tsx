import { useState, useMemo } from 'react'
import { BarChart, Bar, XAxis, Tooltip, YAxis, CartesianGrid, Cell } from 'recharts'
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { DashboardProtocolo } from '@/hooks/use-dashboard-data'

interface Props {
  protocolos: DashboardProtocolo[]
}

const chartMonthNames = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
]
const tableMonthNames = [
  'JAN',
  'FEV',
  'MAR',
  'ABR',
  'MAI',
  'JUN',
  'JUL',
  'AGO',
  'SET',
  'OUT',
  'NOV',
  'DEZ',
]

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

export function OverviewCharts({ protocolos }: Props) {
  const [anoSelecionado, setAnoSelecionado] = useState<string>('2026')

  const availableYears = useMemo(() => {
    const years = new Set<number>()
    protocolos.forEach((p) => {
      if (p.dprotocolo) {
        const y = parseInt(p.dprotocolo.substring(0, 4), 10)
        if (!isNaN(y)) years.add(y)
      }
    })
    years.add(2026) // specifically including 2026
    const currentYear = new Date().getFullYear()
    years.add(currentYear)
    return Array.from(years).sort((a, b) => b - a)
  }, [protocolos])

  const filteredYear = anoSelecionado === 'all' ? 'all' : parseInt(anoSelecionado, 10)

  // Chart data
  const chartData = useMemo(() => {
    const counts = Array(12).fill(0)
    protocolos.forEach((p) => {
      const isProtocolado =
        p.status === 'Protocolado' ||
        p.status === 'Protocolado Judicial' ||
        p.status === 'Requerimento Adm.'
      if (isProtocolado && p.decisao !== 'Improcedente' && p.dprotocolo) {
        const y = parseInt(p.dprotocolo.substring(0, 4), 10)
        const m = parseInt(p.dprotocolo.substring(5, 7), 10) - 1
        if (filteredYear === 'all' || y === filteredYear) {
          if (m >= 0 && m < 12) {
            counts[m]++
          }
        }
      }
    })

    return chartMonthNames.map((name, i) => ({
      name,
      acoes: counts[i],
    }))
  }, [protocolos, filteredYear])

  // Table data
  const allTableData = useMemo(() => {
    const byYear: Record<
      number,
      { year: number; months: number[]; acoes: number; honorarios: number }
    > = {}

    availableYears.forEach((y) => {
      byYear[y] = { year: y, months: Array(12).fill(0), acoes: 0, honorarios: 0 }
    })

    protocolos.forEach((p) => {
      const isProtocolado =
        p.status === 'Protocolado' ||
        p.status === 'Protocolado Judicial' ||
        p.status === 'Requerimento Adm.'
      if (isProtocolado && p.decisao !== 'Improcedente' && p.dprotocolo) {
        const y = parseInt(p.dprotocolo.substring(0, 4), 10)
        const m = parseInt(p.dprotocolo.substring(5, 7), 10) - 1
        if (m >= 0 && m < 12) {
          if (!byYear[y]) {
            byYear[y] = { year: y, months: Array(12).fill(0), acoes: 0, honorarios: 0 }
          }
          byYear[y].months[m]++
          byYear[y].acoes++
          byYear[y].honorarios += (p.valor || 0) * 0.3
        }
      }
    })

    return Object.values(byYear)
      .filter((r) => r.acoes > 0 || r.year === 2026 || r.year === new Date().getFullYear())
      .sort((a, b) => a.year - b.year)
  }, [protocolos, availableYears])

  const tableData = useMemo(() => {
    if (filteredYear === 'all') return allTableData
    return allTableData.filter((r) => r.year === filteredYear)
  }, [allTableData, filteredYear])

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Chart Section — Card Corporativo com Recharts aumentado de 160px para ~240px */}
      <section className="bg-white dark:bg-card border border-[#E4E7EB] dark:border-border rounded-[10px] p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-[#252B34] dark:text-foreground">
              Ações Distribuídas por Mês
            </h2>
            <p className="text-xs text-[#78818E] dark:text-muted-foreground">
              {filteredYear === 'all' ? 'Todos os anos' : filteredYear} · baseado em lançamentos da
              aba Protocolo
            </p>
          </div>
          <div className="w-[180px]">
            <Select value={anoSelecionado} onValueChange={setAnoSelecionado}>
              <SelectTrigger className="h-9 text-xs border-[#E4E7EB] dark:border-border bg-white dark:bg-card">
                <SelectValue placeholder="Selecione o ano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os anos</SelectItem>
                {availableYears.map((y) => (
                  <SelectItem key={y} value={y.toString()}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="h-[240px] w-full relative">
          <ChartContainer config={{ acoes: { color: '#C9922A' } }} className="h-[240px] w-full">
            <BarChart data={chartData} margin={{ top: 12, right: 8, left: -20, bottom: 28 }}>
              <CartesianGrid
                vertical={false}
                horizontal={true}
                stroke="#E4E7EB"
                strokeDasharray="3 3"
                opacity={0.6}
              />
              <XAxis
                dataKey="name"
                axisLine={{ stroke: '#E4E7EB', strokeWidth: 1 }}
                tickLine={false}
                interval={0}
                tick={(props: any) => {
                  const { x, y, payload } = props
                  const monthIndex = chartMonthNames.indexOf(payload.value)
                  const value = chartData[monthIndex]?.acoes || 0
                  return (
                    <g transform={`translate(${x},${y})`}>
                      <text
                        x={0}
                        y={14}
                        textAnchor="middle"
                        fill="#78818E"
                        fontSize={11}
                        fontWeight={500}
                      >
                        {payload.value}
                      </text>
                      <text
                        x={0}
                        y={28}
                        textAnchor="middle"
                        fill={value > 0 ? '#C9922A' : '#A0A7B5'}
                        fontSize={11}
                        fontWeight={value > 0 ? 700 : 400}
                      >
                        {value > 0 ? value : '—'}
                      </text>
                    </g>
                  )
                }}
              />
              <Tooltip
                cursor={{ fill: 'rgba(201, 146, 42, 0.06)' }}
                content={<ChartTooltipContent hideLabel />}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#78818E', fontSize: 10 }}
                domain={[0, 'dataMax + 2']}
                allowDecimals={false}
              />
              <Bar dataKey="acoes" fill="#C9922A" radius={[4, 4, 0, 0]} maxBarSize={44}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.acoes > 0 ? '#C9922A' : 'transparent'} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </div>
      </section>

      {/* Table Section — Histórico Anual */}
      <section className="bg-white dark:bg-card border border-[#E4E7EB] dark:border-border rounded-[10px] p-5 sm:p-6 shadow-sm overflow-hidden">
        <div className="mb-5 space-y-1">
          <h2 className="text-base font-bold text-[#252B34] dark:text-foreground">
            Histórico Anual
          </h2>
          <p className="text-xs text-[#78818E] dark:text-muted-foreground">
            Ações distribuídas e honorários por ano · dados da aba Protocolo
          </p>
        </div>

        <div className="overflow-x-auto rounded-[8px] border border-[#E4E7EB] dark:border-border">
          <table className="w-full text-left border-collapse whitespace-nowrap text-sm">
            <thead>
              <tr className="bg-[#F5F6F8] dark:bg-muted/40 h-10 border-b border-[#E4E7EB] dark:border-border">
                <th className="pl-4 pr-3 text-left font-semibold text-[10px] tracking-wider text-[#78818E] dark:text-muted-foreground uppercase">
                  ANO
                </th>
                {tableMonthNames.map((m) => (
                  <th
                    key={m}
                    className="px-2.5 text-center font-semibold text-[10px] tracking-wider text-[#78818E] dark:text-muted-foreground uppercase"
                  >
                    {m}
                  </th>
                ))}
                <th className="px-4 text-center font-semibold text-[10px] tracking-wider text-[#78818E] dark:text-muted-foreground uppercase">
                  TOTAL AÇÕES
                </th>
                <th className="pr-4 pl-3 text-right font-semibold text-[10px] tracking-wider text-[#78818E] dark:text-muted-foreground uppercase">
                  TOTAL HONORÁRIOS
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E7EB] dark:divide-border">
              {tableData.length === 0 ? (
                <tr>
                  <td
                    colSpan={15}
                    className="h-12 text-center text-xs text-[#78818E] dark:text-muted-foreground"
                  >
                    Nenhum dado encontrado.
                  </td>
                </tr>
              ) : (
                tableData.map((row) => {
                  const isCurrentYear = row.year === 2026
                  return (
                    <tr
                      key={row.year}
                      className={cn(
                        'h-11 transition-colors hover:bg-[#F5F6F8]/60 dark:hover:bg-muted/20 relative',
                        isCurrentYear
                          ? 'bg-[#C9922A]/[0.04] dark:bg-[#C9922A]/10 font-medium'
                          : 'bg-transparent',
                      )}
                    >
                      <td className="pl-4 pr-3 relative">
                        {/* Linha vertical dourada discreta para o ano corrente */}
                        {isCurrentYear && (
                          <span
                            className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#C9922A]"
                            aria-hidden="true"
                          />
                        )}
                        <span
                          className={cn(
                            'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tabular-nums',
                            isCurrentYear
                              ? 'bg-[#C9922A]/15 text-[#C9922A]'
                              : 'bg-[#E4E7EB] dark:bg-muted text-[#78818E] dark:text-muted-foreground',
                          )}
                        >
                          {row.year}
                        </span>
                      </td>
                      {row.months.map((m, i) => (
                        <td
                          key={i}
                          className={cn(
                            'px-2.5 text-center text-xs tabular-nums',
                            m > 0
                              ? 'text-[#252B34] dark:text-foreground font-semibold'
                              : 'text-[#A0A7B5] dark:text-muted-foreground/60',
                          )}
                        >
                          {m > 0 ? m : '—'}
                        </td>
                      ))}
                      <td
                        className={cn(
                          'px-4 text-center text-xs tabular-nums',
                          isCurrentYear
                            ? 'font-bold text-[#252B34] dark:text-foreground'
                            : 'text-[#252B34] dark:text-foreground font-medium',
                        )}
                      >
                        {row.acoes > 0 ? row.acoes : '—'}
                      </td>
                      <td
                        className={cn(
                          'pr-4 pl-3 text-right text-xs tabular-nums',
                          isCurrentYear
                            ? 'font-bold text-[#C9922A]'
                            : 'text-[#252B34] dark:text-foreground font-medium',
                        )}
                      >
                        {row.honorarios > 0 ? formatCurrency(row.honorarios) : '—'}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
