import { useMemo } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { formatCurrency } from '@/lib/formatters'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export function ProtocoloDashboard({
  data,
  tipo,
  month,
  year,
}: {
  data: any[]
  tipo: string
  month: string
  year: string
}) {
  const filteredData = useMemo(() => {
    return data.filter((d) => {
      if (tipo !== 'Todos' && d.expand?.tipo_acao?.nome !== tipo) return false
      if (year !== 'Todos') {
        if (!d.dprotocolo || d.dprotocolo.substring(0, 4) !== year) return false
      }
      if (month !== 'Todos') {
        const dMonth = d.dprotocolo
          ? (parseInt(d.dprotocolo.substring(5, 7), 10) - 1).toString()
          : ''
        if (dMonth !== month) return false
      }
      return true
    })
  }, [data, tipo, year, month])

  const totalAcoes = filteredData.filter((d) =>
    ['Protocolado Judicial', 'Requerimento Adm.', 'Prov. Inicial'].includes(d.status),
  ).length

  const projHonorarios = filteredData
    .filter(
      (d) =>
        ['Protocolado Judicial', 'Requerimento Adm.', 'Prov. Inicial'].includes(d.status) &&
        d.decisao !== 'Improcedente',
    )
    .reduce((sum, d) => sum + (d.valor || 0) * 0.3, 0)

  const cProtJud = filteredData.filter((d) => d.status === 'Protocolado Judicial').length
  const cReqAdm = filteredData.filter((d) => d.status === 'Requerimento Adm.').length
  const cProv = filteredData.filter((d) => d.status === 'Prov. Inicial').length
  const cDocs = filteredData.filter((d) => d.status === 'R. Docs').length

  const monthlyData = useMemo(() => {
    const groups: Record<string, { count: number; val: number }> = {}

    filteredData.forEach((d) => {
      if (!d.dprotocolo) return
      if (!['Protocolado Judicial', 'Requerimento Adm.', 'Prov. Inicial'].includes(d.status)) return

      const ym = d.dprotocolo.substring(0, 7) // "YYYY-MM"
      if (!groups[ym]) {
        groups[ym] = { count: 0, val: 0 }
      }
      groups[ym].count += 1
      if (d.decisao !== 'Improcedente') {
        groups[ym].val += (d.valor || 0) * 0.3
      }
    })

    return Object.entries(groups)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([ym, item]) => {
        const [yStr, mStr] = ym.split('-')
        return {
          month: parseInt(mStr, 10) - 1,
          year: parseInt(yStr, 10),
          count: item.count,
          val: item.val,
        }
      })
  }, [filteredData])

  const tCount = monthlyData.reduce((s, m) => s + m.count, 0)
  const tVal = monthlyData.reduce((s, m) => s + m.val, 0)

  return (
    <div className="grid gap-6 md:grid-cols-2 mb-8">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xl font-bold">Dashboard — Protocolo</CardTitle>
          <CardDescription>
            Casos com status Protocolado Judicial, Req. Adm. ou Prov. Inicial · R. Docs excluído
          </CardDescription>
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
            <span className="font-medium text-emerald-600">Prot. Judicial: {cProtJud}</span>
            <span className="font-medium text-teal-600">Req. Adm.: {cReqAdm}</span>
            <span className="font-medium text-blue-600">Prov. Inicial: {cProv}</span>
            <span className="font-medium text-red-600">R. Docs: {cDocs}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xl font-bold">Projeção de Ações e Honorários</CardTitle>
          <CardDescription>
            Protocolado Judicial, Req. Adm. + Prov. Inicial · R. Docs excluído
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50 border-b">
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                  MÊS/ANO
                </TableHead>
                <TableHead className="text-right text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                  QUANTIDADE DE AÇÕES
                </TableHead>
                <TableHead className="text-right text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                  HONORÁRIOS (30%)
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {monthlyData.map((r, i) => (
                <TableRow key={i}>
                  <TableCell className="capitalize">
                    {format(new Date(r.year, r.month, 1), 'MMMM/yy', { locale: ptBR })}
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
