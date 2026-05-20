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
import { MONTHS, fmtMon } from '@/lib/leads-calc'
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
        const mLeads = leads.filter((l) => {
          return l.mes === `${m} ${year}` || l.mes === m
        })
        const filteredLeads =
          day === 'Todos' ? mLeads : mLeads.filter((l) => l.dia.toString() === day)

        const sumLeads = filteredLeads.reduce(
          (acc, l) =>
            acc + (Number(l.google) || 0) + (Number(l.meta_ads) || 0) + (Number(l.particular) || 0),
          0,
        )
        const sumInvestimento = filteredLeads.reduce(
          (acc, l) => acc + (Number(l.investimento) || 0),
          0,
        )
        const sumFechamentos = filteredLeads.reduce(
          (acc, l) => acc + (Number(l.fechado_direto) || 0) + (Number(l.fechado_fup) || 0),
          0,
        )

        const cpl = sumLeads > 0 ? sumInvestimento / sumLeads : null
        const cac = sumFechamentos > 0 ? sumInvestimento / sumFechamentos : null

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

        const cap = protocolosCount > 0 ? sumInvestimento / protocolosCount : null

        return {
          month: m,
          leads: sumLeads,
          fechamentos: sumFechamentos,
          descartes: descartesCount,
          protocolos: protocolosCount,
          investimento: sumInvestimento,
          cpl: cpl,
          cac: cac,
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
      <Card className="bg-card dark:bg-gray-800 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">CAC & CPL por Mês</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground py-4 text-center">
            Nenhum dado encontrado para o período.
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-card dark:bg-gray-800 shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">CAC & CPL por Mês</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-muted/50">
                <TableHead className="text-xs font-semibold uppercase">MÊS</TableHead>
                <TableHead className="text-right text-xs font-semibold uppercase">LEADS</TableHead>
                <TableHead className="text-right text-xs font-semibold uppercase">
                  FECHAMENTOS
                </TableHead>
                <TableHead className="text-right text-xs font-semibold uppercase">
                  DESCARTES
                </TableHead>
                <TableHead className="text-right text-xs font-semibold uppercase">
                  PROTOCOLOS
                </TableHead>
                <TableHead className="text-right text-xs font-semibold uppercase">
                  INVESTIMENTO
                </TableHead>
                <TableHead className="text-right text-xs font-semibold uppercase">CPL</TableHead>
                <TableHead className="text-right text-xs font-semibold uppercase">CAC</TableHead>
                <TableHead className="text-right whitespace-nowrap text-xs font-semibold uppercase">
                  CAP
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableData.map((row) => (
                <TableRow key={row.month} className="hover:bg-muted/50 text-base">
                  <TableCell className="font-medium">{row.month}</TableCell>
                  <TableCell className="text-right text-[#5A9FD4]">{row.leads}</TableCell>
                  <TableCell className="text-right text-[#52B86E]">{row.fechamentos}</TableCell>
                  <TableCell className="text-right text-[#E84040]">{row.descartes}</TableCell>
                  <TableCell className="text-right text-[#B07FD4]">{row.protocolos}</TableCell>
                  <TableCell className="text-right">{fmtMon(row.investimento)}</TableCell>
                  <TableCell className="text-right text-[#C9922A]">{fmtMon(row.cpl)}</TableCell>
                  <TableCell className="text-right text-[#C9922A]">{fmtMon(row.cac)}</TableCell>
                  <TableCell className="text-right text-[#C9922A]">{fmtMon(row.cap)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow className="hover:bg-transparent bg-amber-50 dark:bg-amber-900/20 border-t-2 border-[#C9922A] text-base">
                <TableCell className="font-bold">TOTAL</TableCell>
                <TableCell className="text-right font-bold text-[#5A9FD4]">
                  {totals.leads}
                </TableCell>
                <TableCell className="text-right font-bold text-[#52B86E]">
                  {totals.fechamentos}
                </TableCell>
                <TableCell className="text-right font-bold text-[#E84040]">
                  {totals.descartes}
                </TableCell>
                <TableCell className="text-right font-bold text-[#B07FD4]">
                  {totals.protocolos}
                </TableCell>
                <TableCell className="text-right font-bold">
                  {fmtMon(totals.investimento)}
                </TableCell>
                <TableCell className="text-right font-bold text-[#C9922A]">
                  {fmtMon(totals.cpl)}
                </TableCell>
                <TableCell className="text-right font-bold text-[#C9922A]">
                  {fmtMon(totals.cac)}
                </TableCell>
                <TableCell className="text-right font-bold text-[#C9922A]">
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
