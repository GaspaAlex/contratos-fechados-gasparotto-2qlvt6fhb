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
  const [chartYear, setChartYear] = useState(currentYear)

  const chartData = useMemo(() => {
    const counts = Array(12).fill(0)
    protocolos.forEach((p) => {
      if (p.status === 'Protocolado' && p.decisao !== 'Improcedente' && p.dprotocolo) {
        const d = new Date(p.dprotocolo)
        if (d.getFullYear() === chartYear) {
          counts[d.getMonth()]++
        }
      }
    })
    return monthNames.map((name, i) => ({ name, acoes: counts[i] }))
  }, [protocolos, chartYear])

  const tableData = useMemo(() => {
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
    return Object.values(byYear).sort((a, b) => a.year - b.year)
  }, [protocolos])

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="shadow-sm flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-semibold">Ações Distribuídas por Mês</CardTitle>
          <select
            className="h-7 rounded-md border border-input bg-transparent px-2 py-0.5 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={chartYear}
            onChange={(e) => setChartYear(Number(e.target.value))}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </CardHeader>
        <CardContent className="flex-1 pb-4">
          <ChartContainer config={{ acoes: { color: '#C9922A' } }} className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11 }}
                  domain={[0, (max: number) => max * 1.3]}
                />
                <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} content={<ChartTooltipContent />} />
                <Bar
                  dataKey="acoes"
                  fill="var(--color-acoes)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card className="shadow-sm flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Histórico Anual</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <Table className="text-xs">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-16">ANO</TableHead>
                  {monthNames.map((m) => (
                    <TableHead key={m} className="px-1 text-center min-w-[28px]">
                      {m[0]}
                    </TableHead>
                  ))}
                  <TableHead className="text-right">AÇÕES</TableHead>
                  <TableHead className="text-right">HONORÁRIOS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={15} className="h-24 text-center text-muted-foreground">
                      Nenhum dado encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  tableData.map((row) => (
                    <TableRow
                      key={row.year}
                      className={cn(row.year === currentYear && 'bg-[#C9922A]/5')}
                    >
                      <TableCell>
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded-full font-bold',
                            row.year === currentYear
                              ? 'bg-[#C9922A] text-white'
                              : 'bg-muted text-muted-foreground',
                          )}
                        >
                          {row.year}
                        </span>
                      </TableCell>
                      {row.months.map((m, i) => (
                        <TableCell key={i} className="px-1 text-center text-muted-foreground">
                          {m > 0 ? m : '-'}
                        </TableCell>
                      ))}
                      <TableCell className="text-right font-semibold">{row.acoes}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(row.honorarios)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
