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
  responsavel,
  origem,
  month,
  year,
  monthStart,
  monthEnd,
  status,
}: {
  data: any[]
  tipo: string
  responsavel: string
  origem: string
  month: string
  year: string
  monthStart: string
  monthEnd: string
  status: string
}) {
  const filteredData = useMemo(() => {
    return data.filter((d) => {
      if (origem !== 'Todos') {
        if (['Previdenciarista', 'Carnevale', 'Macohin'].includes(origem)) {
          if (d.parceiro !== origem) return false
        } else if (d.origem !== origem) {
          return false
        }
      }
      if (tipo !== 'Todos' && d.expand?.tipo_acao?.nome !== tipo) return false
      const respName = d.expand?.responsavel?.nome || d.responsavel || ''
      if (responsavel !== 'Todos' && respName !== responsavel) return false
      if (year !== 'Todos') {
        const recYear = d.dprotocolo
          ? d.dprotocolo.substring(0, 4)
          : d.dcalculo
            ? d.dcalculo.substring(0, 4)
            : null
        if (recYear !== year) return false
      }

      const hasRange = monthStart !== 'Todos' && monthEnd !== 'Todos'

      if (hasRange) {
        const dMonthStr = d.dprotocolo
          ? d.dprotocolo.substring(5, 7)
          : d.dcalculo
            ? d.dcalculo.substring(5, 7)
            : null
        const dMonth = dMonthStr ? parseInt(dMonthStr, 10) - 1 : -1
        const start = parseInt(monthStart, 10)
        const end = parseInt(monthEnd, 10)
        if (dMonth < start || dMonth > end) return false
      } else if (month !== 'Todos') {
        const dMonthStr = d.dprotocolo
          ? d.dprotocolo.substring(5, 7)
          : d.dcalculo
            ? d.dcalculo.substring(5, 7)
            : null
        const dMonth = dMonthStr ? (parseInt(dMonthStr, 10) - 1).toString() : ''
        if (dMonth !== month) return false
      }
      return true
    })
  }, [data, tipo, responsavel, origem, year, month, monthStart, monthEnd])

  const filteredByStatus = useMemo(() => {
    return filteredData.filter((d) => {
      if (status === 'Todos') {
        return ['Protocolado Judicial', 'Requerimento Adm.', 'Prov. Inicial', 'Calculado'].includes(
          d.status,
        )
      }
      return d.status === status
    })
  }, [filteredData, status])

  const totalAcoes = filteredData.filter((d) =>
    ['Protocolado Judicial', 'Requerimento Adm.', 'Prov. Inicial', 'Calculado'].includes(d.status),
  ).length

  const projHonorarios = filteredByStatus
    .filter((d) => d.decisao !== 'Improcedente')
    .reduce((sum, d) => sum + (d.valor || 0) * (d.parceiro ? 0.15 : 0.3), 0)

  const projHonorariosTicketMedio = filteredData
    .filter(
      (d) =>
        ['Protocolado Judicial', 'Requerimento Adm.', 'Prov. Inicial', 'Calculado'].includes(
          d.status,
        ) && d.decisao !== 'Improcedente',
    )
    .reduce((sum, d) => sum + (d.valor || 0) * (d.parceiro ? 0.15 : 0.3), 0)

  const cProtJud = filteredData.filter((d) => d.status === 'Protocolado Judicial').length
  const cReqAdm = filteredData.filter((d) => d.status === 'Requerimento Adm.').length
  const cProv = filteredData.filter((d) => d.status === 'Prov. Inicial').length
  const cDocs = filteredData.filter((d) => d.status === 'R. Docs').length
  const cCalc = filteredData.filter((d) => d.status === 'Calculado').length

  const monthlyData = useMemo(() => {
    const groups: Record<string, { count: number; val: number }> = {}

    filteredByStatus.forEach((d) => {
      const recordDate = d.dprotocolo || d.dcalculo
      if (!recordDate) return

      const ym = recordDate.substring(0, 7) // "YYYY-MM"
      if (!groups[ym]) {
        groups[ym] = { count: 0, val: 0 }
      }
      groups[ym].count += 1
      if (d.decisao !== 'Improcedente') {
        groups[ym].val += (d.valor || 0) * (d.parceiro ? 0.15 : 0.3)
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
  }, [filteredByStatus])

  const tCount = monthlyData.reduce((s, m) => s + m.count, 0)
  const tVal = monthlyData.reduce((s, m) => s + m.val, 0)

  const filteredByCalculoData = useMemo(() => {
    return data.filter((d) => {
      if (!d.dcalculo) return false

      if (origem !== 'Todos') {
        if (['Previdenciarista', 'Carnevale', 'Macohin'].includes(origem)) {
          if (d.parceiro !== origem) return false
        } else if (d.origem !== origem) {
          return false
        }
      }
      if (tipo !== 'Todos' && d.expand?.tipo_acao?.nome !== tipo) return false
      const respName = d.expand?.responsavel?.nome || d.responsavel || ''
      if (responsavel !== 'Todos' && respName !== responsavel) return false
      if (year !== 'Todos') {
        if (!d.dcalculo || d.dcalculo.substring(0, 4) !== year) return false
      }

      const hasRange = monthStart !== 'Todos' && monthEnd !== 'Todos'

      if (hasRange) {
        const dMonth = d.dcalculo ? parseInt(d.dcalculo.substring(5, 7), 10) - 1 : -1
        const start = parseInt(monthStart, 10)
        const end = parseInt(monthEnd, 10)
        if (dMonth < start || dMonth > end) return false
      } else if (month !== 'Todos') {
        const dMonth = d.dcalculo ? (parseInt(d.dcalculo.substring(5, 7), 10) - 1).toString() : ''
        if (dMonth !== month) return false
      }
      return true
    })
  }, [data, tipo, responsavel, origem, year, month, monthStart, monthEnd])

  const teamPerformanceData = useMemo(() => {
    const groups: Record<string, number> = {}
    const exclusions = ['IA', 'Dr. Caio', 'Dr. Alex']

    filteredByCalculoData.forEach((d) => {
      if (!['Protocolado Judicial', 'Requerimento Adm.'].includes(d.status)) return

      const respName = d.expand?.responsavel?.nome || d.responsavel || 'Sem responsável'
      if (exclusions.includes(respName)) return
      groups[respName] = (groups[respName] || 0) + 1
    })

    return Object.entries(groups)
      .filter(([_, count]) => count > 0)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  }, [filteredByCalculoData])

  return (
    <div className="grid gap-6 grid-cols-1 md:grid-cols-3 mb-8">
      <Card className="md:col-span-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl font-bold">Dashboard — Protocolo</CardTitle>
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
            <span className="font-medium text-purple-600">Calculado: {cCalc}</span>
            <span className="font-medium text-emerald-600">Prot. Judicial: {cProtJud}</span>
            <span className="font-medium text-teal-600">Req. Adm.: {cReqAdm}</span>
            <span className="font-medium text-blue-600">Prov. Inicial: {cProv}</span>
            <span className="font-medium text-red-600">R. Docs: {cDocs}</span>
          </div>
        </CardContent>
      </Card>

      <Card className="md:col-span-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl font-bold">Ticket Médio por Ação</CardTitle>
          <CardDescription>Média de honorários projetados por processo</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-8 mt-4">
            <div>
              <p className="text-4xl font-bold text-[#C9922A]">
                {totalAcoes > 0 ? formatCurrency(projHonorariosTicketMedio / totalAcoes) : '—'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="md:col-span-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl font-bold">Desempenho da Equipe</CardTitle>
          <CardDescription>
            Casos liberados para protocolo por responsável (por data do cálculo)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {teamPerformanceData.length > 0 ? (
            <div className="flex flex-col">
              {teamPerformanceData.map((item, idx) => {
                const COMISSAO_POR_CASO = 15
                const colors = ['#5A9FD4', '#C9922A', '#52B86E', '#B07FD4', '#E84040']
                const color = colors[idx % colors.length]
                const comissaoTotal = item.count * COMISSAO_POR_CASO
                return (
                  <div
                    key={item.name}
                    className="flex items-center justify-between gap-2 py-2 border-b border-border last:border-0 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span className="font-medium text-sm truncate">{item.name}</span>
                    </div>
                    <div className="text-sm text-muted-foreground shrink-0">
                      <span className="font-bold text-foreground">{item.count}</span>{' '}
                      {item.count === 1 ? 'caso' : 'casos'} (
                      <span className="font-semibold text-[#52B86E]">
                        {comissaoTotal.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })}
                      </span>
                      )
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex h-[120px] items-center justify-center text-sm text-muted-foreground">
              Nenhum dado encontrado.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="md:col-span-3">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl font-bold">Projeção de Ações e Honorários</CardTitle>
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
                  HONORÁRIOS PROJETADOS
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
