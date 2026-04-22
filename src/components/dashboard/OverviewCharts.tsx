import { useState, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

const monthNames = [
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
        const d = new Date(p.dprotocolo)
        if (selectedYear === 'all' || d.getFullYear() === selectedYear) {
          counts[d.getMonth()]++
        }
      }
    })
    return monthNames.map((name, i) => ({ name, acoes: counts[i] }))
  }, [protocolos, selectedYear])

  const allTableData = useMemo(() => {
    const byYear: Record<
      number,
      { year: number; months: number[]; acoes: number; honorarios: number }
    > = {}
    protocolos.forEach((p) => {
      if (p.status === 'Protocolado' && p.decisao !== 'Improcedente' && p.dprotocolo) {
        const d = new Date(p.dprotocolo)
        const y = d.getFullYear()
        const m = d.getMonth()
        if (!byYear[y]) {
          byYear[y] = { year: y, months: Array(12).fill(0), acoes: 0, honorarios: 0 }
        }
        byYear[y].months[m]++
        byYear[y].acoes++
        byYear[y].honorarios += (p.valor || 0) * 0.3
      }
    })
    return Object.values(byYear).sort((a, b) => b.year - a.year)
  }, [protocolos])

  const tableData = useMemo(() => {
    if (selectedYear === 'all') return allTableData
    return allTableData.filter((r) => r.year === selectedYear)
  }, [allTableData, selectedYear])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Produtividade e Histórico</h2>
        <select
          className="h-8 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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

      <Card className="shadow-sm border rounded-md">
        <CardHeader className="pb-3 border-b bg-muted/20">
          <CardTitle className="text-base font-semibold text-foreground/80 uppercase text-[11px] tracking-wider">
            Histórico Anual
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <Table className="text-xs whitespace-nowrap">
              <TableHeader className="bg-muted/50">
                <TableRow className="hover:bg-transparent border-b">
                  <TableHead className="w-16 font-semibold text-[10px] tracking-[0.6px] text-muted-foreground uppercase">
                    ANO
                  </TableHead>
                  {monthNames.map((m) => (
                    <TableHead
                      key={m}
                      className="px-1 text-center min-w-[32px] font-semibold text-[10px] tracking-[0.6px] text-muted-foreground uppercase"
                    >
                      {m}
                    </TableHead>
                  ))}
                  <TableHead className="text-right font-semibold text-[10px] tracking-[0.6px] text-muted-foreground uppercase">
                    TOTAL AÇÕES
                  </TableHead>
                  <TableHead className="text-right font-semibold text-[10px] tracking-[0.6px] text-muted-foreground uppercase">
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
                          'hover:bg-muted/50 transition-colors border-b',
                          isCurrentYear && 'bg-[#C9922A]/[0.05] hover:bg-[#C9922A]/10',
                        )}
                      >
                        <TableCell className="py-3">
                          <span
                            className={cn(
                              'px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center justify-center',
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
                            className="px-1 text-center text-muted-foreground py-3"
                          >
                            {m > 0 ? m : <span className="opacity-40">—</span>}
                          </TableCell>
                        ))}
                        <TableCell
                          className={cn(
                            'text-right py-3',
                            isCurrentYear
                              ? 'font-bold text-foreground'
                              : 'font-medium text-muted-foreground',
                          )}
                        >
                          {row.acoes > 0 ? row.acoes : <span className="opacity-40">—</span>}
                        </TableCell>
                        <TableCell
                          className={cn(
                            'text-right py-3',
                            isCurrentYear
                              ? 'font-bold text-foreground'
                              : 'font-medium text-muted-foreground',
                          )}
                        >
                          {row.honorarios > 0 ? (
                            formatCurrency(row.honorarios)
                          ) : (
                            <span className="opacity-40">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border rounded-md flex flex-col">
        <CardHeader className="pb-4 border-b bg-muted/20">
          <CardTitle className="text-base font-semibold text-foreground/80 uppercase text-[11px] tracking-wider">
            Ações Distribuídas por Mês
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 pt-6 pb-2">
          <ChartContainer config={{ acoes: { color: '#C9922A' } }} className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 20 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                  tick={(props: any) => {
                    const { x, y, payload } = props
                    const monthIndex = monthNames.indexOf(payload.value)
                    const value = chartData[monthIndex]?.acoes || 0
                    return (
                      <g transform={`translate(${x},${y})`}>
                        <text x={0} y={0} dy={16} textAnchor="middle" fill="#888" fontSize={11}>
                          {payload.value}
                        </text>
                        <text
                          x={0}
                          y={0}
                          dy={34}
                          textAnchor="middle"
                          fill={value > 0 ? '#C9922A' : '#888'}
                          fontSize={11}
                          fontWeight={value > 0 ? 'bold' : 'normal'}
                          opacity={value > 0 ? 1 : 0.5}
                        >
                          {value > 0 ? value : '—'}
                        </text>
                      </g>
                    )
                  }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11 }}
                  domain={[0, (max: number) => (max === 0 ? 10 : Math.ceil(max * 1.3))]}
                />
                <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} content={<ChartTooltipContent />} />
                <Bar
                  dataKey="acoes"
                  fill="var(--color-acoes)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={48}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}
