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
      if (p.status === 'Protocolado' && p.decisao !== 'Improcedente' && p.dprotocolo) {
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
      if (p.status === 'Protocolado' && p.decisao !== 'Improcedente' && p.dprotocolo) {
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
    <div className="flex flex-col gap-8 w-full">
      {/* Chart Section */}
      <section className="bg-white border border-border rounded-[6px] p-[20px_24px] shadow-sm">
        <div className="flex items-start justify-between mb-6">
          <div className="space-y-1">
            <h2 className="text-[15px] font-bold text-foreground">Ações Distribuídas por Mês</h2>
            <p className="text-[12px] text-muted-foreground">
              {filteredYear === 'all' ? 'Todos os anos' : filteredYear} · baseado em lançamentos da
              aba Protocolo
            </p>
          </div>
          <div className="w-[160px]">
            <Select value={anoSelecionado} onValueChange={setAnoSelecionado}>
              <SelectTrigger className="h-9">
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

        <div className="h-[160px] w-full relative">
          <ChartContainer config={{ acoes: { color: '#C9922A' } }} className="h-[160px] w-full">
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 24 }}>
              <CartesianGrid vertical={false} horizontal={false} />
              <XAxis
                dataKey="name"
                axisLine={{ stroke: '#E8E4D4', strokeWidth: 1 }}
                tickLine={false}
                interval={0}
                tick={(props: any) => {
                  const { x, y, payload } = props
                  const monthIndex = chartMonthNames.indexOf(payload.value)
                  const value = chartData[monthIndex]?.acoes || 0
                  return (
                    <g transform={`translate(${x},${y})`}>
                      <text x={0} y={12} textAnchor="middle" fill="#6B7280" fontSize={11}>
                        {payload.value}
                      </text>
                      <text
                        x={0}
                        y={28}
                        textAnchor="middle"
                        fill={value > 0 ? '#C9922A' : '#9CA3AF'}
                        fontSize={11}
                        fontWeight={value > 0 ? 'bold' : 'normal'}
                      >
                        {value > 0 ? value : '—'}
                      </text>
                    </g>
                  )
                }}
              />
              <Tooltip
                cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                content={<ChartTooltipContent hideLabel />}
              />
              <YAxis hide domain={[0, 'dataMax * 1.33']} />
              <Bar dataKey="acoes" fill="#C9922A" radius={[4, 4, 0, 0]} maxBarSize={48}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.acoes > 0 ? '#C9922A' : 'transparent'} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </div>
      </section>

      {/* Table Section */}
      <section className="bg-white border border-border rounded-[6px] p-[20px_24px] shadow-sm overflow-hidden">
        <div className="mb-6 space-y-1">
          <h2 className="text-[15px] font-bold text-foreground">Histórico Anual</h2>
          <p className="text-[12px] text-muted-foreground">
            Ações distribuídas e honorários por ano · dados da aba Protocolo
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-[#F5F1E4] h-[36px] border-b border-border">
                <th className="pl-4 pr-2 text-left font-semibold text-[10px] tracking-[0.6px] text-muted-foreground uppercase">
                  ANO
                </th>
                {tableMonthNames.map((m) => (
                  <th
                    key={m}
                    className="px-2 text-center font-semibold text-[10px] tracking-[0.6px] text-muted-foreground uppercase"
                  >
                    {m}
                  </th>
                ))}
                <th className="px-4 text-center font-semibold text-[10px] tracking-[0.6px] text-muted-foreground uppercase">
                  TOTAL AÇÕES
                </th>
                <th className="pr-4 pl-2 text-right font-semibold text-[10px] tracking-[0.6px] text-muted-foreground uppercase">
                  TOTAL HONORÁRIOS
                </th>
              </tr>
            </thead>
            <tbody>
              {tableData.length === 0 ? (
                <tr>
                  <td
                    colSpan={15}
                    className="h-[44px] text-center text-[13px] text-muted-foreground border-b border-border"
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
                        'h-[44px] transition-colors border-b border-border hover:bg-accent/50',
                        isCurrentYear ? 'bg-[#FDFAF4]' : 'bg-transparent',
                      )}
                    >
                      <td className="pl-4 pr-2">
                        <span
                          className={cn(
                            'px-2.5 py-0.5 rounded-full text-[11px]',
                            isCurrentYear
                              ? 'bg-[#F5EED8] text-[#C9922A] font-bold'
                              : 'bg-[#E8E4D4] text-[#9A9070] font-medium',
                          )}
                        >
                          {row.year}
                        </span>
                      </td>
                      {row.months.map((m, i) => (
                        <td
                          key={i}
                          className={cn(
                            'px-2 text-center text-[13px]',
                            m > 0 ? 'text-foreground' : 'text-muted-foreground',
                          )}
                        >
                          {m > 0 ? m : '—'}
                        </td>
                      ))}
                      <td
                        className={cn(
                          'px-4 text-center text-[13px]',
                          isCurrentYear ? 'font-bold text-foreground' : 'text-foreground',
                        )}
                      >
                        {row.acoes > 0 ? row.acoes : '—'}
                      </td>
                      <td
                        className={cn(
                          'pr-4 pl-2 text-right text-[13px]',
                          isCurrentYear ? 'font-bold text-foreground' : 'text-foreground',
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
