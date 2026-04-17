import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatCurrency } from '@/lib/formatters'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export function ProtocoloDashboard({ data }: { data: any[] }) {
  const currentYear = new Date().getFullYear().toString()
  const [year1, setYear1] = useState(currentYear)
  const [year2, setYear2] = useState(currentYear)

  const years = useMemo(() => {
    const y = new Set(
      data.map((d) => (d.dprotocolo ? new Date(d.dprotocolo).getFullYear().toString() : '')),
    )
    y.delete('')
    y.add(currentYear)
    return Array.from(y).sort().reverse()
  }, [data, currentYear])

  // Block 1 data
  const block1Data = useMemo(
    () =>
      data.filter((d) => d.dprotocolo && new Date(d.dprotocolo).getFullYear().toString() === year1),
    [data, year1],
  )
  const totalAcoes = block1Data.filter((d) =>
    ['Protocolado', 'Prov. Inicial'].includes(d.status),
  ).length
  const projHonorarios = block1Data
    .filter(
      (d) => ['Protocolado', 'Prov. Inicial'].includes(d.status) && d.decisao !== 'Improcedente',
    )
    .reduce((sum, d) => sum + (d.valor || 0) * 0.3, 0)
  const cProt = block1Data.filter((d) => d.status === 'Protocolado').length
  const cProv = block1Data.filter((d) => d.status === 'Prov. Inicial').length
  const cDocs = block1Data.filter((d) => d.status === 'R. Docs').length

  // Block 2 data
  const block2Data = useMemo(
    () =>
      data.filter((d) => d.dprotocolo && new Date(d.dprotocolo).getFullYear().toString() === year2),
    [data, year2],
  )
  const monthlyData = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => i)
    return months
      .map((m) => {
        const items = block2Data.filter(
          (d) =>
            new Date(d.dprotocolo).getMonth() === m &&
            ['Protocolado', 'Prov. Inicial'].includes(d.status),
        )
        const count = items.length
        const val = items
          .filter((d) => d.decisao !== 'Improcedente')
          .reduce((sum, d) => sum + (d.valor || 0) * 0.3, 0)
        return { month: m, count, val }
      })
      .filter((m) => m.count > 0 || m.val > 0)
  }, [block2Data])

  const tCount = monthlyData.reduce((s, m) => s + m.count, 0)
  const tVal = monthlyData.reduce((s, m) => s + m.val, 0)

  return (
    <div className="grid gap-6 md:grid-cols-2 mb-8">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between pb-2">
          <div>
            <CardTitle className="text-xl font-bold">Dashboard — Protocolo</CardTitle>
            <CardDescription>
              Casos com status Protocolado ou Prov. Inicial · R. Docs excluído
            </CardDescription>
          </div>
          <Select value={year1} onValueChange={setYear1}>
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={y}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <div className="flex gap-8 mt-4">
            <div>
              <p className="text-sm font-semibold text-muted-foreground">TOTAL AÇÕES</p>
              <p className="text-4xl font-bold">{totalAcoes}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-muted-foreground">PROJEÇÃO DE HONORÁRIOS</p>
              <p className="text-4xl font-bold text-[#C9922A]">{formatCurrency(projHonorarios)}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 mt-6 text-sm">
            <span className="font-medium text-emerald-600">Protocolados: {cProt}</span>
            <span className="font-medium text-blue-600">Prov. Inicial: {cProv}</span>
            <span className="font-medium text-red-600">R. Docs: {cDocs}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between pb-2">
          <div>
            <CardTitle className="text-xl font-bold">Projeção de Ações e Honorários</CardTitle>
            <CardDescription>
              Protocolado + Prov. Inicial · R. Docs excluído · ano corrente por padrão
            </CardDescription>
          </div>
          <Select value={year2} onValueChange={setYear2}>
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={y}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>MÊS/ANO</TableHead>
                <TableHead className="text-right">QUANTIDADE DE AÇÕES</TableHead>
                <TableHead className="text-right">HONORÁRIOS (30%)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {monthlyData.map((r) => (
                <TableRow key={r.month}>
                  <TableCell className="capitalize">
                    {format(new Date(2020, r.month, 1), 'MMMM/yy', { locale: ptBR })}
                  </TableCell>
                  <TableCell className="text-right">{r.count}</TableCell>
                  <TableCell className="text-right">{formatCurrency(r.val)}</TableCell>
                </TableRow>
              ))}
              {monthlyData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-4">
                    Nenhum dado encontrado.
                  </TableCell>
                </TableRow>
              )}
              <TableRow className="bg-amber-50 hover:bg-amber-50/80 font-bold dark:bg-amber-950/30">
                <TableCell>TOTAL</TableCell>
                <TableCell className="text-right">{tCount}</TableCell>
                <TableCell className="text-right">{formatCurrency(tVal)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
