import { useState, useMemo } from 'react'
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
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
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)
  const [selectedYear, setSelectedYear] = useState<number | 'all'>(currentYear)

  const chartData = useMemo(() => {
    const counts = Array(12).fill(0)
    protocolos.forEach((p) => {
      if (p.status === 'Protocolado' && p.dprotocolo) {
        const y = parseInt(p.dprotocolo.substring(0, 4), 10)
        const m = parseInt(p.dprotocolo.substring(5, 7), 10) - 1
        if (selectedYear === 'all' || y === selectedYear) {
          if (m >= 0 && m < 12) {
            counts[m]++
          }
        }
      }
    })
    return chartMonthNames.map((name, i) => ({ name, acoes: counts[i] }))
  }, [protocolos, selectedYear])

  const allTableData = useMemo(() => {
    const byYear: Record<
      number,
      { year: number; months: number[]; acoes: number; honorarios: number }
    > = {}
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
    return Object.values(byYear).sort((a, b) => a.year - b.year)
  }, [protocolos])

  const tableData = useMemo(() => {
    if (selectedYear === 'all') return allTableData
    return allTableData.filter((r) => r.year === selectedYear)
  }, [allTableData, selectedYear])

  return (
    <div className="flex flex-col gap-8 w-full">
      {/* Chart Section */}
      <section>
        <div className="flex items-start justify-between mb-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-foreground">Ações Distribuídas por Mês</h2>
            <p className="text-sm text-muted-foreground">
              {selectedYear === 'all' ? 'Todos os anos' : selectedYear} · baseado em lançamentos da
              aba Protocolo
            </p>
          </div>
          <select
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={selectedYear}
            onChange={(e) =>
              setSelectedYear(e.target.value === 'all' ? 'all' : Number(e.target.value))
            }
          >
            <option value="all">Todos os anos</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <div className="border rounded-xl bg-card p-6 pb-2 pt-8 shadow-sm">
          <ChartContainer config={{ acoes: { color: '#C9922A' } }} className="h-[280px] w-full">
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 40 }}>
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                interval={0}
                tick={(props: any) => {
                  const { x, y, payload } = props
                  const monthIndex = chartMonthNames.indexOf(payload.value)
                  const value = chartData[monthIndex]?.acoes || 0
                  return (
                    <g transform={`translate(${x},${y})`}>
                      <line
                        x1={-24}
                        y1={0}
                        x2={24}
                        y2={0}
                        stroke="#E5E7EB"
                        strokeWidth={2}
                        strokeLinecap="round"
                      />
                      <text x={0} y={0} dy={20} textAnchor="middle" fill="#888" fontSize={11}>
                        {payload.value}
                      </text>
                      <text
                        x={0}
                        y={0}
                        dy={40}
                        textAnchor="middle"
                        fill={value > 0 ? '#C9922A' : '#888'}
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
              <Bar
                dataKey="acoes"
                fill="var(--color-acoes)"
                radius={[4, 4, 0, 0]}
                maxBarSize={64}
              />
            </BarChart>
          </ChartContainer>
        </div>
      </section>

      {/* Table Section */}
      <section>
        <div className="mb-4 space-y-1">
          <h2 className="text-lg font-semibold text-foreground">Histórico Anual</h2>
          <p className="text-sm text-muted-foreground">
            Ações distribuídas e honorários por ano · dados da aba Protocolo
          </p>
        </div>

        <div className="border rounded-xl bg-card overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <Table className="text-sm whitespace-nowrap">
              <TableHeader className="bg-[#FAF8F5]">
                <TableRow className="hover:bg-[#FAF8F5] border-b">
                  <TableHead className="w-20 font-semibold text-[10px] tracking-[0.6px] text-muted-foreground uppercase pl-6 py-4">
                    ANO
                  </TableHead>
                  {tableMonthNames.map((m) => (
                    <TableHead
                      key={m}
                      className="px-2 text-center min-w-[40px] font-semibold text-[10px] tracking-[0.6px] text-muted-foreground uppercase"
                    >
                      {m}
                    </TableHead>
                  ))}
                  <TableHead className="text-center px-4 font-semibold text-[10px] tracking-[0.6px] text-muted-foreground uppercase">
                    TOTAL AÇÕES
                  </TableHead>
                  <TableHead className="text-left pr-6 font-semibold text-[10px] tracking-[0.6px] text-muted-foreground uppercase">
                    TOTAL HONORÁRIOS
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={15} className="h-24 text-center text-muted-foreground">
                      Nenhum dado encontrado para o período selecionado.
                    </TableCell>
                  </TableRow>
                ) : (
                  tableData.map((row) => {
                    const isCurrentYear = row.year === currentYear
                    return (
                      <TableRow
                        key={row.year}
                        className={cn(
                          'hover:bg-muted/30 transition-colors border-b',
                          isCurrentYear && 'bg-[#C9922A]/[0.05] hover:bg-[#C9922A]/[0.08]',
                        )}
                      >
                        <TableCell className="py-4 pl-6">
                          <span
                            className={cn(
                              'px-3 py-1 rounded-full text-[11px] font-semibold inline-flex items-center justify-center',
                              isCurrentYear
                                ? 'bg-[#C9922A]/15 text-[#C9922A]'
                                : 'bg-muted text-muted-foreground',
                            )}
                          >
                            {row.year}
                          </span>
                        </TableCell>
                        {row.months.map((m, i) => (
                          <TableCell
                            key={i}
                            className={cn(
                              'px-2 text-center py-4',
                              m > 0 ? 'text-foreground font-medium' : 'text-muted-foreground',
                            )}
                          >
                            {m > 0 ? m : '—'}
                          </TableCell>
                        ))}
                        <TableCell
                          className={cn(
                            'text-center px-4 py-4',
                            isCurrentYear
                              ? 'font-bold text-foreground'
                              : 'font-medium text-foreground',
                          )}
                        >
                          {row.acoes > 0 ? row.acoes : '—'}
                        </TableCell>
                        <TableCell
                          className={cn(
                            'text-left pr-6 py-4',
                            isCurrentYear
                              ? 'font-bold text-foreground'
                              : 'font-medium text-foreground',
                          )}
                        >
                          {row.honorarios > 0 ? formatCurrency(row.honorarios) : '—'}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </section>
    </div>
  )
}
