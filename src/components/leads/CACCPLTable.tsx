import { useMemo, useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  TableFooter,
} from '@/components/ui/table'
import { aggregateLeads, calculateLeadRow, MONTHS, fmtMon } from '@/lib/leads-calc'
import { getContratos } from '@/services/contratos'
import { getProtocolos } from '@/services/protocolo'
import { useRealtime } from '@/hooks/use-realtime'

interface Props {
  leads: any[]
  month: string
  day: string
  year: string
}

export function CACCPLTable({ leads, month, day, year }: Props) {
  const [contratos, setContratos] = useState<any[]>([])
  const [protocolos, setProtocolos] = useState<any[]>([])

  const loadData = async () => {
    try {
      const [c, p] = await Promise.all([getContratos(), getProtocolos()])
      setContratos(c)
      setProtocolos(p)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('contratos_fechados', loadData)
  useRealtime('protocolo', loadData)

  const tableData = useMemo(() => {
    const monthsToProcess = month === 'Todos' ? MONTHS : [month]

    const data = monthsToProcess
      .map((m) => {
        const mLeads = leads.filter((l) => l.mes === m)
        const filteredLeads =
          day === 'Todos' ? mLeads : mLeads.filter((l) => l.dia.toString() === day)

        const agg = aggregateLeads(filteredLeads)
        const calc = calculateLeadRow(agg)

        const monthNum = String(MONTHS.indexOf(m) + 1).padStart(2, '0')

        const descartesCount = contratos.filter((c) => {
          if (!c.dcontrato) return false
          const [cYear, cMonth] = c.dcontrato.split('-')
          if (cYear !== year || cMonth !== monthNum) return false
          return ['Sem Qualidade de Segurado', 'Tem Advogado', 'Litispendência'].includes(c.status)
        }).length

        const protocolosCount = protocolos.filter((p) => {
          if (!p.dprotocolo) return false
          const [pYear, pMonth] = p.dprotocolo.split('-')
          return pYear === year && pMonth === monthNum
        }).length

        const cap = protocolosCount > 0 ? calc.investimento / protocolosCount : null

        return {
          month: m,
          leads: calc.total_leads,
          fechamentos: calc.total_fechados,
          descartes: descartesCount,
          protocolos: protocolosCount,
          investimento: calc.investimento,
          cpl: calc.cpl,
          cac: calc.cac,
          cap: cap,
        }
      })
      .filter(
        (row) =>
          row.leads > 0 ||
          row.investimento > 0 ||
          row.fechamentos > 0 ||
          row.descartes > 0 ||
          row.protocolos > 0,
      )

    return data
  }, [leads, month, day, year, contratos, protocolos])

  const totals = useMemo(() => {
    const sumLeads = tableData.reduce((acc, r) => acc + r.leads, 0)
    const sumFechamentos = tableData.reduce((acc, r) => acc + r.fechamentos, 0)
    const sumDescartes = tableData.reduce((acc, r) => acc + r.descartes, 0)
    const sumProtocolos = tableData.reduce((acc, r) => acc + r.protocolos, 0)
    const sumInvestimento = tableData.reduce((acc, r) => acc + r.investimento, 0)

    const avgCpl = sumLeads > 0 ? sumInvestimento / sumLeads : null
    const avgCac = sumFechamentos > 0 ? sumInvestimento / sumFechamentos : null
    const avgCap = sumProtocolos > 0 ? sumInvestimento / sumProtocolos : null

    return {
      leads: sumLeads,
      fechamentos: sumFechamentos,
      descartes: sumDescartes,
      protocolos: sumProtocolos,
      investimento: sumInvestimento,
      cpl: avgCpl,
      cac: avgCac,
      cap: avgCap,
    }
  }, [tableData])

  if (tableData.length === 0) {
    return (
      <Card className="bg-zinc-900 border-zinc-800 text-zinc-100 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold text-zinc-100">CAC & CPL por Mês</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-zinc-400 py-4 text-center">
            Nenhum dado encontrado para o período.
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800 text-zinc-100 shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold text-zinc-100">CAC & CPL por Mês</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800 hover:bg-zinc-800/50">
                <TableHead className="text-zinc-400">Mês</TableHead>
                <TableHead className="text-zinc-400 text-right">Leads</TableHead>
                <TableHead className="text-zinc-400 text-right">Fechamentos</TableHead>
                <TableHead className="text-zinc-400 text-right">Descartes</TableHead>
                <TableHead className="text-zinc-400 text-right">Protocolos</TableHead>
                <TableHead className="text-zinc-400 text-right">Investimento</TableHead>
                <TableHead className="text-zinc-400 text-right">CPL</TableHead>
                <TableHead className="text-zinc-400 text-right">CAC</TableHead>
                <TableHead className="text-zinc-400 text-right whitespace-nowrap">CAP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableData.map((row) => (
                <TableRow key={row.month} className="border-zinc-800 hover:bg-zinc-800/50">
                  <TableCell className="font-medium text-zinc-200">{row.month}</TableCell>
                  <TableCell className="text-right text-zinc-300">{row.leads}</TableCell>
                  <TableCell className="text-right text-zinc-300">{row.fechamentos}</TableCell>
                  <TableCell className="text-right text-zinc-300">{row.descartes}</TableCell>
                  <TableCell className="text-right text-zinc-300">{row.protocolos}</TableCell>
                  <TableCell className="text-right text-zinc-300">
                    {fmtMon(row.investimento)}
                  </TableCell>
                  <TableCell className="text-right text-zinc-300">{fmtMon(row.cpl)}</TableCell>
                  <TableCell className="text-right text-zinc-300">{fmtMon(row.cac)}</TableCell>
                  <TableCell className="text-right text-zinc-300">{fmtMon(row.cap)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter className="bg-zinc-950 border-t border-zinc-800 hover:bg-zinc-950">
              <TableRow className="hover:bg-transparent border-none">
                <TableCell className="font-bold text-zinc-100">TOTAL</TableCell>
                <TableCell className="text-right font-bold text-zinc-100">{totals.leads}</TableCell>
                <TableCell className="text-right font-bold text-zinc-100">
                  {totals.fechamentos}
                </TableCell>
                <TableCell className="text-right font-bold text-zinc-100">
                  {totals.descartes}
                </TableCell>
                <TableCell className="text-right font-bold text-zinc-100">
                  {totals.protocolos}
                </TableCell>
                <TableCell className="text-right font-bold text-zinc-100">
                  {fmtMon(totals.investimento)}
                </TableCell>
                <TableCell className="text-right font-bold text-zinc-100">
                  {fmtMon(totals.cpl)}
                </TableCell>
                <TableCell className="text-right font-bold text-zinc-100">
                  {fmtMon(totals.cac)}
                </TableCell>
                <TableCell className="text-right font-bold text-zinc-100">
                  {fmtMon(totals.cap)}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
