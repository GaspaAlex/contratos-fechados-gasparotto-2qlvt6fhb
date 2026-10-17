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
import { MONTHS, fmtMon, getDisplayMonths } from '@/lib/leads-calc'
import { getContratos } from '@/services/contratos'
import { getProtocolos } from '@/services/protocolo'
import { useRealtime } from '@/hooks/use-realtime'

interface Props {
  leads: any[]
  contratos?: any[]
  configs?: any[]
  month: string
  day: string
  year: string
  startMonth?: string
  endMonth?: string
  campaign?: string
}

export function CACCPLTable({
  leads,
  month,
  day,
  year,
  startMonth,
  endMonth,
  campaign = 'Todas',
  configs,
}: Props) {
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
    const monthsToProcess = getDisplayMonths(month, startMonth || '', endMonth || '')
    const isRange = Boolean(startMonth && endMonth)
    const selectedRotulo =
      campaign && campaign !== 'Todas'
        ? configs?.find((c) => c?.slug === campaign)?.rotulo || campaign
        : 'Todas'
    const targetRotulo = (selectedRotulo || 'Todas').trim().toUpperCase()
    const targetCampaign = (campaign || '').trim().toUpperCase()
    const isSpecificCampaign = Boolean(campaign && campaign !== 'Todas')
    const campaignKey = isSpecificCampaign ? campaign.replace(/^meta_/, '') : campaign

    const data = monthsToProcess
      .map((m) => {
        const monthIndex = MONTHS.indexOf(m)
        const monthNum = String(monthIndex + 1).padStart(2, '0')

        const mLeads = (leads || []).filter((l) => {
          if (!l || !l.mes) return false
          return l.mes === `${m} ${year}` || l.mes === m || String(l.mes).startsWith(m)
        })
        const filteredLeads =
          day === 'Todos' || isRange
            ? mLeads
            : mLeads.filter((l) => l && String(l.dia) === String(day))

        let sumLeads = 0
        if (isSpecificCampaign) {
          sumLeads = filteredLeads.reduce(
            (acc, l) =>
              acc +
              (Number(l?.[`meta_${campaignKey}`]) ||
                Number(l?.[`meta_${campaign}`]) ||
                Number(l?.[campaign]) ||
                0),
            0,
          )
        } else {
          sumLeads = filteredLeads.reduce(
            (acc, l) =>
              acc +
              (Number(l?.google) || 0) +
              (Number(l?.meta_ads) || 0) +
              (Number(l?.particular) || 0),
            0,
          )
        }

        const sumInvestimento = filteredLeads.reduce(
          (acc, l) => acc + (Number(l?.investimento) || 0),
          0,
        )

        let sumFechamentos = 0
        if (isSpecificCampaign) {
          sumFechamentos = (contratos || []).filter((c) => {
            if (!c?.dcontrato) return false
            const [cYear, cMonth] = c.dcontrato.split('-')
            if (cYear !== year || cMonth !== monthNum) return false
            if (['Sem Qualidade de Segurado', 'Tem Advogado', 'Litispendência'].includes(c.status))
              return false
            if (c.origem !== 'Campanha') return false
            const campOrigem = (c.campanha_origem || 'Aux. Acidente').trim().toUpperCase()
            const cCampOrigemRaw = (c.campanha_origem || '').trim().toUpperCase()
            return campOrigem === targetRotulo || cCampOrigemRaw === targetCampaign
          }).length
        } else {
          sumFechamentos = filteredLeads.reduce(
            (acc, l) => acc + (Number(l?.fechado_direto) || 0) + (Number(l?.fechado_fup) || 0),
            0,
          )
        }

        const cpl = sumLeads > 0 ? sumInvestimento / sumLeads : null
        const cac = sumFechamentos > 0 ? sumInvestimento / sumFechamentos : null

        const descartesCount = (contratos || []).filter((c) => {
          if (!c?.dcontrato) return false
          const [cYear, cMonth] = c.dcontrato.split('-')
          if (cYear !== year || cMonth !== monthNum) return false
          if (!['Sem Qualidade de Segurado', 'Tem Advogado', 'Litispendência'].includes(c.status))
            return false
          if (isSpecificCampaign) {
            if (c.origem !== 'Campanha') return false
            const campOrigem = (c.campanha_origem || 'Aux. Acidente').trim().toUpperCase()
            const cCampOrigemRaw = (c.campanha_origem || '').trim().toUpperCase()
            if (campOrigem !== targetRotulo && cCampOrigemRaw !== targetCampaign) return false
          }
          return true
        }).length

        const protocolosCount = (protocolos || []).filter((p) => {
          if (!p?.dprotocolo) return false
          if (p.origem !== 'Campanha') return false
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
  }, [leads, month, day, year, startMonth, endMonth, contratos, protocolos, campaign, configs])

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
      <Card className="rounded-[10px] border border-[#E4E7EB] dark:border-border bg-white dark:bg-card shadow-sm overflow-hidden">
        <CardHeader className="py-4 px-5 border-b border-[#E4E7EB] dark:border-border bg-white dark:bg-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <div>
              <span className="text-[10px] font-bold tracking-[1.5px] uppercase text-[#C9922A]">
                ANÁLISE DE EFICIÊNCIA
              </span>
              <CardTitle className="text-base sm:text-lg font-bold text-[#252B34] dark:text-foreground">
                CAC & CPL por Mês
              </CardTitle>
            </div>
            <div className="text-[11px] text-[#78818E] dark:text-muted-foreground font-medium">
              CPL = Investimento / Leads &nbsp;|&nbsp; CAC = Investimento / Fechamentos
              &nbsp;|&nbsp; CAP = Investimento / Protocolos
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-xs text-[#78818E] dark:text-muted-foreground py-4 text-center">
            Nenhum dado encontrado para o período selecionado.
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="rounded-[10px] border border-[#E4E7EB] dark:border-border bg-white dark:bg-card shadow-sm overflow-hidden">
      <CardHeader className="py-4 px-5 border-b border-[#E4E7EB] dark:border-border bg-white dark:bg-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div>
            <span className="text-[10px] font-bold tracking-[1.5px] uppercase text-[#C9922A]">
              ANÁLISE DE EFICIÊNCIA
            </span>
            <CardTitle className="text-base sm:text-lg font-bold text-[#252B34] dark:text-foreground">
              CAC & CPL por Mês
            </CardTitle>
          </div>
          <div className="text-[11px] text-[#78818E] dark:text-muted-foreground font-medium">
            CPL = Investimento / Leads &nbsp;|&nbsp; CAC = Investimento / Fechamentos &nbsp;|&nbsp;
            CAP = Investimento / Protocolos
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table className="text-xs min-w-[700px]">
            <TableHeader className="bg-[#F5F6F8] dark:bg-muted/30">
              <TableRow className="border-b border-[#E4E7EB] dark:border-border hover:bg-transparent">
                <TableHead className="text-[10px] font-bold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground py-2.5 px-4">
                  MÊS
                </TableHead>
                <TableHead className="text-right text-[10px] font-bold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground py-2.5 px-3">
                  LEADS
                </TableHead>
                <TableHead className="text-right text-[10px] font-bold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground py-2.5 px-3">
                  FECHAMENTOS
                </TableHead>
                <TableHead className="text-right text-[10px] font-bold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground py-2.5 px-3">
                  DESCARTES
                </TableHead>
                <TableHead className="text-right text-[10px] font-bold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground py-2.5 px-3">
                  PROTOCOLOS
                </TableHead>
                <TableHead className="text-right text-[10px] font-bold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground py-2.5 px-3">
                  INVESTIMENTO
                </TableHead>
                <TableHead className="text-right text-[10px] font-bold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground py-2.5 px-3">
                  CPL
                </TableHead>
                <TableHead className="text-right text-[10px] font-bold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground py-2.5 px-3">
                  CAC
                </TableHead>
                <TableHead className="text-right whitespace-nowrap text-[10px] font-bold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground py-2.5 px-4">
                  CAP
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-[#E4E7EB] dark:divide-border">
              {tableData.map((row) => (
                <TableRow
                  key={row.month}
                  className="hover:bg-[#F5F6F8]/60 dark:hover:bg-muted/40 transition-colors"
                >
                  <TableCell className="font-semibold text-xs uppercase text-[#252B34] dark:text-foreground py-2.5 px-4">
                    {row.month}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-[#4A7FA5] tabular-nums py-2.5 px-3">
                    {row.leads}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-[#3E8E5A] dark:text-[#52B86E] tabular-nums py-2.5 px-3">
                    {row.fechamentos}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-[#B4453C] dark:text-red-400 tabular-nums py-2.5 px-3">
                    {row.descartes}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-[#7C5CBF] dark:text-purple-400 tabular-nums py-2.5 px-3">
                    {row.protocolos}
                  </TableCell>
                  <TableCell className="text-right font-medium text-[#78818E] dark:text-muted-foreground tabular-nums py-2.5 px-3">
                    {fmtMon(row.investimento)}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-[#252B34] dark:text-foreground tabular-nums py-2.5 px-3">
                    {fmtMon(row.cpl)}
                  </TableCell>
                  <TableCell className="text-right font-bold text-[#C9922A] dark:text-[#D9A94A] tabular-nums py-2.5 px-3">
                    {fmtMon(row.cac)}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-[#252B34] dark:text-foreground tabular-nums py-2.5 px-4">
                    {fmtMon(row.cap)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter className="border-none bg-transparent">
              <TableRow className="bg-[#FAF8F2] dark:bg-[#C9922A]/10 hover:bg-[#FAF8F2] dark:hover:bg-[#C9922A]/15 font-bold border-t-2 border-[#C9922A]/30 dark:border-[#C9922A]/50">
                <TableCell className="text-xs uppercase text-[#C9922A] font-bold py-3 px-4">
                  TOTAL
                </TableCell>
                <TableCell className="text-right font-bold text-[#4A7FA5] tabular-nums py-3 px-3">
                  {totals.leads}
                </TableCell>
                <TableCell className="text-right font-bold text-[#3E8E5A] dark:text-[#52B86E] tabular-nums py-3 px-3">
                  {totals.fechamentos}
                </TableCell>
                <TableCell className="text-right font-bold text-[#B4453C] dark:text-red-400 tabular-nums py-3 px-3">
                  {totals.descartes}
                </TableCell>
                <TableCell className="text-right font-bold text-[#7C5CBF] dark:text-purple-400 tabular-nums py-3 px-3">
                  {totals.protocolos}
                </TableCell>
                <TableCell className="text-right font-medium text-[#78818E] dark:text-muted-foreground tabular-nums py-3 px-3">
                  {fmtMon(totals.investimento)}
                </TableCell>
                <TableCell className="text-right font-bold text-[#252B34] dark:text-foreground tabular-nums py-3 px-3">
                  {fmtMon(totals.cpl)}
                </TableCell>
                <TableCell className="text-right font-bold text-[#C9922A] dark:text-[#D9A94A] tabular-nums py-3 px-3">
                  {fmtMon(totals.cac)}
                </TableCell>
                <TableCell className="text-right font-bold text-[#252B34] dark:text-foreground tabular-nums py-3 px-4">
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
