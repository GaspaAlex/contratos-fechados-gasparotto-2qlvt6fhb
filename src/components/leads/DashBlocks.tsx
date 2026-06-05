import { useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  aggregateLeads,
  calculateLeadRow,
  fmtMon,
  fmtPct,
  MONTHS,
  colorConvGeral,
  colorConvQualif,
  colorDesq,
  filterLeadsByPeriod,
  getDisplayMonths,
  getMonthsInRange,
  isDateInPeriod,
} from '@/lib/leads-calc'
import { cn } from '@/lib/utils'

export function SummaryCards({
  leads,
  contratos,
  configs,
  month,
  year,
  day,
  startMonth,
  endMonth,
  campaign = 'Todas',
}: any) {
  const filteredLeads = useMemo(
    () => filterLeadsByPeriod(leads, month, day, startMonth, endMonth),
    [leads, month, day, startMonth, endMonth],
  )

  const anoLeads = useMemo(() => {
    return aggregateLeads(filteredLeads, year, campaign)
  }, [filteredLeads, year, campaign])

  const agg = useMemo(() => calculateLeadRow(anoLeads), [anoLeads])

  const selectedCampaignRotulo = useMemo(
    () =>
      campaign === 'Todas'
        ? 'Todas'
        : configs?.find((c: any) => c.slug === campaign)?.rotulo || 'Todas',
    [campaign, configs],
  )

  const filteredContratos = useMemo(() => {
    return (contratos || []).filter((c: any) => {
      const excludedStatuses = ['Sem Qualidade de Segurado', 'Tem Advogado', 'Litispendência']
      if (excludedStatuses.includes(c.status)) return false
      if (c.origem !== 'Campanha') return false
      if (selectedCampaignRotulo !== 'Todas') {
        const campOrigem = c.campanha_origem || 'Aux. Acidente'
        if (campOrigem !== selectedCampaignRotulo && c.campanha_origem !== campaign) return false
      }
      return isDateInPeriod(c.dcontrato, month, day, year, startMonth, endMonth)
    })
  }, [contratos, selectedCampaignRotulo, campaign, month, day, year, startMonth, endMonth])

  const total_fechados = filteredContratos.length
  const fechados_fup = useMemo(
    () => filteredContratos.filter((c: any) => c.fup === true).length,
    [filteredContratos],
  )

  const conv_geral = agg.total_leads > 0 ? total_fechados / agg.total_leads : null
  const conv_qualif = agg.qualificados > 0 ? total_fechados / agg.qualificados : null
  const pct_fech_via_fup = total_fechados > 0 ? fechados_fup / total_fechados : null

  const getConvGeralStatus = (v: number | null) => {
    if (v === null || isNaN(v)) return null
    if (v > 0.08) return { text: 'Excelente', color: 'text-green-600 dark:text-green-500' }
    if (v >= 0.06) return { text: 'Na meta', color: 'text-green-600 dark:text-green-500' }
    return { text: 'Abaixo da meta', color: 'text-red-600 dark:text-red-500' }
  }

  const getConvQualifStatus = (v: number | null) => {
    if (v === null || isNaN(v)) return null
    if (v > 0.12) return { text: 'Excelente', color: 'text-green-600 dark:text-green-500' }
    if (v >= 0.1) return { text: 'Na meta', color: 'text-green-600 dark:text-green-500' }
    return { text: 'Abaixo da meta', color: 'text-red-600 dark:text-red-500' }
  }

  const getDesqStatus = (v: number | null) => {
    if (v === null || isNaN(v)) return null
    if (v <= 0.3) return { text: 'Na meta', color: 'text-green-600 dark:text-green-500' }
    return { text: 'Acima do limite', color: 'text-red-600 dark:text-red-500' }
  }

  const getFupStatus = (v: number | null) => {
    if (v === null || isNaN(v)) return null
    if (v >= 0.4) return { text: 'Na meta', color: 'text-green-600 dark:text-green-500' }
    return { text: 'Abaixo da meta', color: 'text-red-600 dark:text-red-500' }
  }

  const cGeral = getConvGeralStatus(conv_geral)
  const cQualif = getConvQualifStatus(conv_qualif)
  const cDesq = getDesqStatus(agg.desqual_pct)
  const cFup = getFupStatus(pct_fech_via_fup)

  let monthLabel =
    month === 'Todos'
      ? `Ano ${year}`
      : day === 'Todos'
        ? `${month} ${year}`
        : `Dia ${day} de ${month} ${year}`

  if (startMonth && endMonth) {
    const range = getMonthsInRange(startMonth, endMonth)
    if (range.length > 0) {
      monthLabel = `${range[0]} a ${range[range.length - 1]} ${year}`
    }
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <Card className="border-t-4 border-t-blue-500 shadow-sm">
        <CardContent className="p-4 flex flex-col justify-between h-full min-h-[110px]">
          <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Total Leads
          </div>
          <div className="text-3xl font-black mt-1 mb-1">{agg.total_leads}</div>
          <div className="text-[11px] text-muted-foreground font-medium">{monthLabel}</div>
        </CardContent>
      </Card>
      <Card className="border-t-4 border-t-green-500 shadow-sm">
        <CardContent className="p-4 flex flex-col justify-between h-full min-h-[110px]">
          <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Qualificados
          </div>
          <div className="text-3xl font-black mt-1 mb-1">{agg.qualificados}</div>
          <div className="text-[11px] text-muted-foreground font-medium">leads válidos</div>
        </CardContent>
      </Card>
      <Card className="border-t-4 border-t-red-500 shadow-sm">
        <CardContent className="p-4 flex flex-col justify-between h-full min-h-[110px]">
          <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Desqualificados
          </div>
          <div className="text-3xl font-black mt-1 mb-1 text-red-600 dark:text-red-500">
            {agg.total_desq}
          </div>
          <div className="text-[11px] text-muted-foreground font-medium">fora do perfil</div>
        </CardContent>
      </Card>
      <Card className="border-t-4 border-t-amber-500 shadow-sm">
        <CardContent className="p-4 flex flex-col justify-between h-full min-h-[110px]">
          <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Total Fechamentos
          </div>
          <div className="text-3xl font-black mt-1 mb-1 text-amber-600 dark:text-amber-500">
            {total_fechados}
          </div>
          <div className="text-[11px] text-muted-foreground font-medium">direto + FUP</div>
        </CardContent>
      </Card>

      <Card className="border-t-2 border-t-purple-500 shadow-sm">
        <CardContent className="p-4 flex flex-col justify-between h-full min-h-[110px]">
          <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Conv. Geral
          </div>
          <div className={cn('text-2xl font-black mt-1 mb-1', colorConvGeral(conv_geral))}>
            {fmtPct(conv_geral)}
          </div>
          <div className="flex justify-between items-center mt-auto">
            <span className="text-[11px] text-muted-foreground font-medium">Meta ≥ 6%</span>
            {cGeral && (
              <span
                className={cn(
                  'text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted/50',
                  cGeral.color,
                )}
              >
                {cGeral.text}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
      <Card className="border-t-2 border-t-purple-500 shadow-sm">
        <CardContent className="p-4 flex flex-col justify-between h-full min-h-[110px]">
          <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Conv. Qualif.
          </div>
          <div className={cn('text-2xl font-black mt-1 mb-1', colorConvQualif(conv_qualif))}>
            {fmtPct(conv_qualif)}
          </div>
          <div className="flex justify-between items-center mt-auto">
            <span className="text-[11px] text-muted-foreground font-medium">Meta ≥ 10%</span>
            {cQualif && (
              <span
                className={cn(
                  'text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted/50',
                  cQualif.color,
                )}
              >
                {cQualif.text}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
      <Card className="border-t-2 border-t-red-500 shadow-sm">
        <CardContent className="p-4 flex flex-col justify-between h-full min-h-[110px]">
          <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Desqualificação %
          </div>
          <div className={cn('text-2xl font-black mt-1 mb-1', colorDesq(agg.desqual_pct))}>
            {fmtPct(agg.desqual_pct)}
          </div>
          <div className="flex justify-between items-center mt-auto">
            <span className="text-[11px] text-muted-foreground font-medium">Limite ≤ 30%</span>
            {cDesq && (
              <span
                className={cn(
                  'text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted/50',
                  cDesq.color,
                )}
              >
                {cDesq.text}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
      <Card className="border-t-2 border-t-amber-500 shadow-sm">
        <CardContent className="p-4 flex flex-col justify-between h-full min-h-[110px]">
          <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            FECH. FUP
          </div>
          <div
            className={cn(
              'text-2xl font-black mt-1 mb-1',
              cFup ? cFup.color : 'text-amber-600 dark:text-amber-500',
            )}
          >
            {fmtPct(pct_fech_via_fup)}
          </div>
          <div className="flex justify-between items-center mt-auto">
            <span className="text-[11px] text-muted-foreground font-medium">Meta ≥ 40%</span>
            {cFup && (
              <span
                className={cn(
                  'text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted/50',
                  cFup.color,
                )}
              >
                {cFup.text}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

const getLocalCacStatus = (v: number | null) => {
  if (v === null || isNaN(v))
    return { text: '-', color: 'text-muted-foreground border-transparent' }
  if (v <= 250)
    return {
      text: '✓ Meta atingida',
      color:
        'text-green-700 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-900/30 dark:border-green-800/50',
    }
  return {
    text: '✗ Acima do ideal',
    color:
      'text-red-700 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-900/30 dark:border-red-800/50',
  }
}

export function CACCPLTable({
  leads,
  contratos,
  configs,
  month,
  day,
  year,
  startMonth,
  endMonth,
  campaign = 'Todas',
}: any) {
  const filteredLeads = useMemo(
    () => filterLeadsByPeriod(leads, month, day, startMonth, endMonth),
    [leads, month, day, startMonth, endMonth],
  )
  const anoLeads = useMemo(
    () => aggregateLeads(filteredLeads, year, campaign),
    [filteredLeads, year, campaign],
  )

  const selectedCampaignRotulo = useMemo(
    () =>
      campaign === 'Todas'
        ? 'Todas'
        : configs?.find((c: any) => c.slug === campaign)?.rotulo || 'Todas',
    [campaign, configs],
  )

  const getFechamentosCount = useCallback(
    (mLeads: any[], m: string | null = null, d: string | null = null) => {
      return (contratos || []).filter((c: any) => {
        const excludedStatuses = ['Sem Qualidade de Segurado', 'Tem Advogado', 'Litispendência']
        if (excludedStatuses.includes(c.status)) return false
        if (c.origem !== 'Campanha') return false
        if (selectedCampaignRotulo !== 'Todas') {
          const campOrigem = c.campanha_origem || 'Aux. Acidente'
          if (campOrigem !== selectedCampaignRotulo && c.campanha_origem !== campaign) return false
        }
        if (m && d) return isDateInPeriod(c.dcontrato, m, d, year, '', '')
        if (m) return isDateInPeriod(c.dcontrato, m, 'Todos', year, '', '')
        return isDateInPeriod(c.dcontrato, month, day, year, startMonth, endMonth)
      }).length
    },
    [contratos, selectedCampaignRotulo, campaign, month, day, year, startMonth, endMonth],
  )

  const aggAno = useMemo(() => calculateLeadRow(anoLeads), [anoLeads])
  aggAno.total_fechados = getFechamentosCount(filteredLeads)
  aggAno.cac = aggAno.total_fechados > 0 ? aggAno.investimento / aggAno.total_fechados : null

  const displayMonths = getDisplayMonths(month, startMonth, endMonth)
  const isMultiMonth = (startMonth && endMonth) || month === 'Todos'

  return (
    <Card className="shadow-sm h-full flex flex-col">
      <CardHeader className="pb-3 border-b">
        <CardTitle className="text-base font-bold text-foreground">CAC & CPL por Mês</CardTitle>
        <div className="text-xs text-muted-foreground mt-1">
          CPL = Investimento / Total Leads | CAC = Investimento / Fechamentos
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1 overflow-x-auto">
        <Table className="text-sm min-w-[600px]">
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="w-24">MÊS</TableHead>
              <TableHead className="text-right">INVESTIMENTO</TableHead>
              <TableHead className="text-right">TOTAL LEADS</TableHead>
              <TableHead className="text-right">FECHAMENTOS</TableHead>
              <TableHead className="text-right">CPL (R$)</TableHead>
              <TableHead className="text-right">CAC (R$)</TableHead>
              <TableHead className="text-center w-36">STATUS CAC</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isMultiMonth
              ? displayMonths.map((m) => {
                  const mLeads = filteredLeads.filter((l: any) => l.mes.startsWith(m))
                  if (mLeads.length === 0) return null
                  const agg = calculateLeadRow(aggregateLeads(mLeads, year, campaign))
                  agg.total_fechados = getFechamentosCount(mLeads, m)
                  agg.cac = agg.total_fechados > 0 ? agg.investimento / agg.total_fechados : null
                  const cacSt = getLocalCacStatus(agg.cac)
                  return (
                    <TableRow key={m}>
                      <TableCell className="font-medium text-xs uppercase text-muted-foreground">
                        {m.substring(0, 3)}
                      </TableCell>
                      <TableCell className="text-right">{fmtMon(agg.investimento)}</TableCell>
                      <TableCell className="text-right">{agg.total_leads}</TableCell>
                      <TableCell className="text-right">{agg.total_fechados}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {fmtMon(agg.cpl)}
                      </TableCell>
                      <TableCell className="text-right font-semibold">{fmtMon(agg.cac)}</TableCell>
                      <TableCell className="text-center">
                        {agg.cac !== null && (
                          <div
                            className={cn(
                              'px-2 py-0.5 text-[10px] rounded-sm border whitespace-nowrap',
                              cacSt.color,
                            )}
                          >
                            {cacSt.text}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              : day === 'Todos'
                ? filteredLeads.length > 0 &&
                  (() => {
                    const cacSt = getLocalCacStatus(aggAno.cac)
                    return (
                      <TableRow>
                        <TableCell className="font-medium text-xs uppercase text-muted-foreground">
                          {month.substring(0, 3)}
                        </TableCell>
                        <TableCell className="text-right">{fmtMon(aggAno.investimento)}</TableCell>
                        <TableCell className="text-right">{aggAno.total_leads}</TableCell>
                        <TableCell className="text-right">{aggAno.total_fechados}</TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {fmtMon(aggAno.cpl)}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {fmtMon(aggAno.cac)}
                        </TableCell>
                        <TableCell className="text-center">
                          {aggAno.cac !== null && (
                            <div
                              className={cn(
                                'px-2 py-0.5 text-[10px] rounded-sm border whitespace-nowrap',
                                cacSt.color,
                              )}
                            >
                              {cacSt.text}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })()
                : filteredLeads.length > 0 &&
                  (() => {
                    const cacSt = getLocalCacStatus(aggAno.cac)
                    return (
                      <TableRow>
                        <TableCell className="font-medium text-xs uppercase text-muted-foreground">
                          Dia {day} de {month.substring(0, 3)} {year}
                        </TableCell>
                        <TableCell className="text-right">{fmtMon(aggAno.investimento)}</TableCell>
                        <TableCell className="text-right">{aggAno.total_leads}</TableCell>
                        <TableCell className="text-right">{aggAno.total_fechados}</TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {fmtMon(aggAno.cpl)}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {fmtMon(aggAno.cac)}
                        </TableCell>
                        <TableCell className="text-center">
                          {aggAno.cac !== null && (
                            <div
                              className={cn(
                                'px-2 py-0.5 text-[10px] rounded-sm border whitespace-nowrap',
                                cacSt.color,
                              )}
                            >
                              {cacSt.text}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })()}
            {isMultiMonth &&
              filteredLeads.length > 0 &&
              (() => {
                const cacSt = getLocalCacStatus(aggAno.cac)
                return (
                  <TableRow className="bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-50/80 dark:hover:bg-amber-900/30 font-bold border-t-2 border-t-amber-200 dark:border-t-amber-800/50">
                    <TableCell>TOTAL</TableCell>
                    <TableCell className="text-right">{fmtMon(aggAno.investimento)}</TableCell>
                    <TableCell className="text-right">{aggAno.total_leads}</TableCell>
                    <TableCell className="text-right">{aggAno.total_fechados}</TableCell>
                    <TableCell className="text-right">{fmtMon(aggAno.cpl)}</TableCell>
                    <TableCell className="text-right">{fmtMon(aggAno.cac)}</TableCell>
                    <TableCell className="text-center">
                      {aggAno.cac !== null && (
                        <div
                          className={cn(
                            'px-2 py-0.5 text-[10px] rounded-sm border whitespace-nowrap font-bold',
                            cacSt.color,
                          )}
                        >
                          {cacSt.text}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })()}
            {filteredLeads.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                  Nenhum dado encontrado
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

export function DisqualificationAnalysis({
  leads,
  month,
  day,
  year,
  startMonth,
  endMonth,
  campaign = 'Todas',
}: any) {
  const filteredLeads = useMemo(
    () => filterLeadsByPeriod(leads, month, day, startMonth, endMonth),
    [leads, month, day, startMonth, endMonth],
  )
  const anoLeads = useMemo(
    () => aggregateLeads(filteredLeads, year, campaign),
    [filteredLeads, year, campaign],
  )
  const aggAno = useMemo(() => calculateLeadRow(anoLeads), [anoLeads])
  const displayMonths = useMemo(
    () => getDisplayMonths(month, startMonth, endMonth),
    [month, startMonth, endMonth],
  )
  const isMultiMonth = (startMonth && endMonth) || month === 'Todos'

  const reasons = [
    { label: 'Sem Qualidade', value: aggAno.sem_qualidade },
    { label: 'Aposentado', value: aggAno.aposentado },
    { label: 'Contrib. Carnê', value: aggAno.contribuinte_carne },
    { label: 'Outros', value: aggAno.outros },
    { label: 'Sem Interesse', value: aggAno.sem_interesse },
    { label: 'Engano', value: aggAno.engano },
  ]
  const maxReason = Math.max(...reasons.map((r) => r.value), 1)

  return (
    <Card className="shadow-sm h-full flex flex-col">
      <CardHeader className="pb-3 border-b">
        <CardTitle className="text-base font-bold text-foreground">
          Motivos de Desqualificação
        </CardTitle>
        <div className="text-xs text-muted-foreground mt-1">
          Análise de proporção e quebra mensal
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1 flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x">
        <div className="p-4 space-y-5 md:w-1/3 flex flex-col justify-center">
          {reasons.map((r) => (
            <div key={r.label}>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="font-semibold text-muted-foreground uppercase tracking-wider">
                  {r.label}
                </span>
                <span className="font-bold">
                  {r.value}{' '}
                  <span className="text-muted-foreground font-normal ml-1">
                    ({aggAno.total_desq > 0 ? ((r.value / aggAno.total_desq) * 100).toFixed(1) : 0}
                    %)
                  </span>
                </span>
              </div>
              <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all duration-500"
                  style={{ width: `${(r.value / maxReason) * 100}%` }}
                />
              </div>
            </div>
          ))}
          <div className="pt-4 border-t mt-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold uppercase text-muted-foreground">
                TOTAL DESQUALIFICADOS
              </span>
              <span className="text-xl font-black text-red-600 dark:text-red-500">
                {aggAno.total_desq}
              </span>
            </div>
          </div>
        </div>
        <div className="p-0 flex-1 overflow-x-auto">
          <Table className="text-xs min-w-[600px]">
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="w-20">MÊS</TableHead>
                <TableHead className="text-right">S/QUAL</TableHead>
                <TableHead className="text-right">APOSEN.</TableHead>
                <TableHead className="text-right">CARNÊ</TableHead>
                <TableHead className="text-right">OUTROS</TableHead>
                <TableHead className="text-right">SEM INT.</TableHead>
                <TableHead className="text-right">ENGANO</TableHead>
                <TableHead className="text-right font-bold">TOTAL</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isMultiMonth
                ? displayMonths.map((m) => {
                    const mLeads = filteredLeads.filter((l: any) => l.mes.startsWith(m))
                    if (mLeads.length === 0) return null
                    const agg = calculateLeadRow(aggregateLeads(mLeads, year, campaign))
                    return (
                      <TableRow key={m}>
                        <TableCell className="font-medium text-[10px] uppercase text-muted-foreground">
                          {m.substring(0, 3)}
                        </TableCell>
                        <TableCell className="text-right">{agg.sem_qualidade}</TableCell>
                        <TableCell className="text-right">{agg.aposentado}</TableCell>
                        <TableCell className="text-right">{agg.contribuinte_carne}</TableCell>
                        <TableCell className="text-right">{agg.outros}</TableCell>
                        <TableCell className="text-right">{agg.sem_interesse}</TableCell>
                        <TableCell className="text-right">{agg.engano}</TableCell>
                        <TableCell className="text-right font-bold text-red-600 dark:text-red-500">
                          {agg.total_desq}
                        </TableCell>
                      </TableRow>
                    )
                  })
                : day === 'Todos'
                  ? filteredLeads.length > 0 && (
                      <TableRow>
                        <TableCell className="font-medium text-[10px] uppercase text-muted-foreground">
                          {month.substring(0, 3)}
                        </TableCell>
                        <TableCell className="text-right">{aggAno.sem_qualidade}</TableCell>
                        <TableCell className="text-right">{aggAno.aposentado}</TableCell>
                        <TableCell className="text-right">{aggAno.contribuinte_carne}</TableCell>
                        <TableCell className="text-right">{aggAno.outros}</TableCell>
                        <TableCell className="text-right">{aggAno.sem_interesse}</TableCell>
                        <TableCell className="text-right">{aggAno.engano}</TableCell>
                        <TableCell className="text-right font-bold text-red-600 dark:text-red-500">
                          {aggAno.total_desq}
                        </TableCell>
                      </TableRow>
                    )
                  : filteredLeads.length > 0 && (
                      <TableRow>
                        <TableCell className="font-medium text-[10px] uppercase text-muted-foreground">
                          Dia {day}
                        </TableCell>
                        <TableCell className="text-right">{aggAno.sem_qualidade}</TableCell>
                        <TableCell className="text-right">{aggAno.aposentado}</TableCell>
                        <TableCell className="text-right">{aggAno.contribuinte_carne}</TableCell>
                        <TableCell className="text-right">{aggAno.outros}</TableCell>
                        <TableCell className="text-right">{aggAno.sem_interesse}</TableCell>
                        <TableCell className="text-right">{aggAno.engano}</TableCell>
                        <TableCell className="text-right font-bold text-red-600 dark:text-red-500">
                          {aggAno.total_desq}
                        </TableCell>
                      </TableRow>
                    )}
              {isMultiMonth && filteredLeads.length > 0 && (
                <TableRow className="bg-muted/50 font-bold border-t">
                  <TableCell>TOTAL</TableCell>
                  <TableCell className="text-right">{aggAno.sem_qualidade}</TableCell>
                  <TableCell className="text-right">{aggAno.aposentado}</TableCell>
                  <TableCell className="text-right">{aggAno.contribuinte_carne}</TableCell>
                  <TableCell className="text-right">{aggAno.outros}</TableCell>
                  <TableCell className="text-right">{aggAno.sem_interesse}</TableCell>
                  <TableCell className="text-right">{aggAno.engano}</TableCell>
                  <TableCell className="text-right text-red-600 dark:text-red-500">
                    {aggAno.total_desq}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
