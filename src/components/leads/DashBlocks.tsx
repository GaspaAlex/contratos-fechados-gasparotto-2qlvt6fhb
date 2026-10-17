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
  leadsRegistro = [],
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

  const selectedCampaignRotulo = useMemo(() => {
    if (!campaign || campaign === 'Todas') return 'Todas'
    const found = configs?.find((c: any) => c && c.slug === campaign)
    return found?.rotulo || campaign || 'Todas'
  }, [campaign, configs])

  const totalLeadsCalculated = useMemo(() => {
    const targetRotulo = (selectedCampaignRotulo || 'Todas').trim().toUpperCase()
    let countRegistro = (leadsRegistro ?? []).filter((lead: any) => {
      if (!lead || !isDateInPeriod(lead.data, month, day, year, startMonth, endMonth)) return false
      if (campaign && campaign !== 'Todas') {
        const leadCamp = (lead.campanha || '').trim().toUpperCase()
        if (leadCamp !== targetRotulo && leadCamp !== (campaign || '').trim().toUpperCase()) {
          return false
        }
      }
      return true
    }).length

    if (campaign === 'Todas' || !campaign) {
      return countRegistro + (anoLeads?.google || 0)
    }
    return countRegistro
  }, [
    leadsRegistro,
    month,
    day,
    year,
    startMonth,
    endMonth,
    campaign,
    selectedCampaignRotulo,
    anoLeads,
  ])

  const agg = useMemo(
    () => calculateLeadRow(anoLeads, totalLeadsCalculated),
    [anoLeads, totalLeadsCalculated],
  )

  const filteredContratos = useMemo(() => {
    const targetRotulo = (selectedCampaignRotulo || 'Todas').trim().toUpperCase()
    const targetCampaign = (campaign || '').trim().toUpperCase()
    return (contratos || []).filter((c: any) => {
      if (!c) return false
      const excludedStatuses = ['Sem Qualidade de Segurado', 'Tem Advogado', 'Litispendência']
      if (excludedStatuses.includes(c.status)) return false
      if (c.origem !== 'Campanha') return false
      if (targetRotulo !== 'TODAS') {
        const campOrigem = (c.campanha_origem || 'Aux. Acidente').trim().toUpperCase()
        const cCampOrigemRaw = (c.campanha_origem || '').trim().toUpperCase()
        if (campOrigem !== targetRotulo && cCampOrigemRaw !== targetCampaign) {
          return false
        }
      }
      return isDateInPeriod(c.dcontrato, month, day, year, startMonth, endMonth)
    })
  }, [contratos, selectedCampaignRotulo, campaign, month, day, year, startMonth, endMonth])

  const total_fechados = filteredContratos.length
  const fechados_fup = useMemo(
    () => filteredContratos.filter((c: any) => c.fup === true).length,
    [filteredContratos],
  )

  const total_desq = useMemo(() => {
    const targetRotulo = (selectedCampaignRotulo || 'Todas').trim().toUpperCase()
    const targetCampaign = (campaign || '').trim().toUpperCase()
    return (leadsRegistro ?? []).filter((lead: any) => {
      if (!lead || !isDateInPeriod(lead.data, month, day, year, startMonth, endMonth)) return false
      if (campaign && campaign !== 'Todas') {
        const leadCamp = (lead.campanha || '').trim().toUpperCase()
        if (leadCamp !== targetRotulo && leadCamp !== targetCampaign) {
          return false
        }
      }

      const cls = lead.classificacao || ''
      const excluded = ['', 'Qualificando', 'Qualificado', 'Contrato Fechado']
      if (excluded.includes(cls)) return false

      return true
    }).length
  }, [leadsRegistro, month, day, year, startMonth, endMonth, campaign, selectedCampaignRotulo])

  const totalQualificados = useMemo(() => {
    const targetRotulo = (selectedCampaignRotulo || 'Todas').trim().toUpperCase()
    const targetCampaign = (campaign || '').trim().toUpperCase()
    return (leadsRegistro ?? []).filter((lead: any) => {
      if (!lead || !isDateInPeriod(lead.data, month, day, year, startMonth, endMonth)) return false
      if (campaign && campaign !== 'Todas') {
        const leadCamp = (lead.campanha || '').trim().toUpperCase()
        if (leadCamp !== targetRotulo && leadCamp !== targetCampaign) {
          return false
        }
      }

      return lead.classificacao === 'Qualificado'
    }).length
  }, [leadsRegistro, month, day, year, startMonth, endMonth, campaign, selectedCampaignRotulo])

  const desqual_pct = agg.total_leads > 0 ? total_desq / agg.total_leads : 0

  const conv_geral = agg.total_leads > 0 ? total_fechados / agg.total_leads : null
  const conv_qualif = totalQualificados > 0 ? total_fechados / totalQualificados : null
  const pct_fech_via_fup = total_fechados > 0 ? fechados_fup / total_fechados : null

  const getConvGeralStatus = (v: number | null) => {
    if (v === null || isNaN(v)) return null
    if (v > 0.08)
      return { text: 'Excelente', color: 'text-[#3E8E5A] bg-[#3E8E5A]/10 border-[#3E8E5A]/20' }
    if (v >= 0.06)
      return { text: 'Na meta', color: 'text-[#3E8E5A] bg-[#3E8E5A]/10 border-[#3E8E5A]/20' }
    return { text: 'Abaixo da meta', color: 'text-[#B4453C] bg-[#B4453C]/10 border-[#B4453C]/20' }
  }

  const getConvQualifStatus = (v: number | null) => {
    if (v === null || isNaN(v)) return null
    if (v > 0.12)
      return { text: 'Excelente', color: 'text-[#3E8E5A] bg-[#3E8E5A]/10 border-[#3E8E5A]/20' }
    if (v >= 0.1)
      return { text: 'Na meta', color: 'text-[#3E8E5A] bg-[#3E8E5A]/10 border-[#3E8E5A]/20' }
    return { text: 'Abaixo da meta', color: 'text-[#B4453C] bg-[#B4453C]/10 border-[#B4453C]/20' }
  }

  const getDesqStatus = (v: number | null) => {
    if (v === null || isNaN(v)) return null
    if (v <= 0.3)
      return { text: 'Na meta', color: 'text-[#3E8E5A] bg-[#3E8E5A]/10 border-[#3E8E5A]/20' }
    return { text: 'Acima do limite', color: 'text-[#B4453C] bg-[#B4453C]/10 border-[#B4453C]/20' }
  }

  const getFupStatus = (v: number | null) => {
    if (v === null || isNaN(v)) return null
    if (v >= 0.4)
      return { text: 'Na meta', color: 'text-[#3E8E5A] bg-[#3E8E5A]/10 border-[#3E8E5A]/20' }
    return { text: 'Abaixo da meta', color: 'text-[#B4453C] bg-[#B4453C]/10 border-[#B4453C]/20' }
  }

  const cGeral = getConvGeralStatus(conv_geral)
  const cQualif = getConvQualifStatus(conv_qualif)
  const cDesq = getDesqStatus(desqual_pct)
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
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-6">
      {/* 1. TOTAL LEADS — Card Executivo Grafite Premium #22262E */}
      <Card className="relative overflow-hidden rounded-[10px] border border-[#2E3440] bg-[#22262E] text-white shadow-sm flex flex-col justify-between min-h-[120px]">
        <CardContent className="p-4 sm:p-4.5 flex flex-col justify-between h-full">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold tracking-wider uppercase text-[#9EA7B6]">
              Total Leads
            </span>
            <div className="h-2 w-2 rounded-full bg-[#D9A94A]" />
          </div>
          <div className="my-1.5">
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-[#D9A94A] tabular-nums">
              {agg.total_leads}
            </div>
          </div>
          <div className="text-[11px] text-[#A5ADB9] font-medium truncate" title={monthLabel}>
            {monthLabel}
          </div>
        </CardContent>
      </Card>

      {/* 2. QUALIFICADOS */}
      <Card className="rounded-[10px] border border-[#E4E7EB] dark:border-border bg-white dark:bg-card shadow-sm flex flex-col justify-between min-h-[120px]">
        <CardContent className="p-4 sm:p-4.5 flex flex-col justify-between h-full">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold tracking-wider uppercase text-[#78818E] dark:text-muted-foreground">
              Qualificados
            </span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase text-[#3E8E5A] bg-[#3E8E5A]/10 border border-[#3E8E5A]/20">
              VÁLIDOS
            </span>
          </div>
          <div className="my-1.5">
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-[#3E8E5A] dark:text-[#52B86E] tabular-nums">
              {totalQualificados}
            </div>
          </div>
          <div className="text-[11px] text-[#78818E] dark:text-muted-foreground font-medium">
            leads com perfil atendido
          </div>
        </CardContent>
      </Card>

      {/* 3. DESQUALIFICADOS */}
      <Card className="rounded-[10px] border border-[#E4E7EB] dark:border-border bg-white dark:bg-card shadow-sm flex flex-col justify-between min-h-[120px]">
        <CardContent className="p-4 sm:p-4.5 flex flex-col justify-between h-full">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold tracking-wider uppercase text-[#78818E] dark:text-muted-foreground">
              Desqualificados
            </span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase text-[#B4453C] bg-[#B4453C]/10 border border-[#B4453C]/20">
              FILTRADOS
            </span>
          </div>
          <div className="my-1.5">
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-[#B4453C] dark:text-red-400 tabular-nums">
              {total_desq}
            </div>
          </div>
          <div className="text-[11px] text-[#78818E] dark:text-muted-foreground font-medium">
            fora do perfil de atendimento
          </div>
        </CardContent>
      </Card>

      {/* 4. TOTAL FECHAMENTOS */}
      <Card className="rounded-[10px] border border-[#E4E7EB] dark:border-border bg-white dark:bg-card shadow-sm flex flex-col justify-between min-h-[120px]">
        <CardContent className="p-4 sm:p-4.5 flex flex-col justify-between h-full">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold tracking-wider uppercase text-[#78818E] dark:text-muted-foreground">
              Total Fechamentos
            </span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase text-[#C9922A] bg-[#C9922A]/10 border border-[#C9922A]/20">
              CONTRATOS
            </span>
          </div>
          <div className="my-1.5">
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-[#C9922A] dark:text-[#D9A94A] tabular-nums">
              {total_fechados}
            </div>
          </div>
          <div className="text-[11px] text-[#78818E] dark:text-muted-foreground font-medium">
            fechamentos direto + FUP
          </div>
        </CardContent>
      </Card>

      {/* 5. CONVERSÃO GERAL */}
      <Card className="rounded-[10px] border border-[#E4E7EB] dark:border-border bg-white dark:bg-card shadow-sm flex flex-col justify-between min-h-[120px]">
        <CardContent className="p-4 sm:p-4.5 flex flex-col justify-between h-full">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold tracking-wider uppercase text-[#78818E] dark:text-muted-foreground">
              Conv. Geral
            </span>
            <span className="text-[10px] font-medium text-[#78818E] dark:text-muted-foreground">
              Meta ≥ 6%
            </span>
          </div>
          <div className="my-1.5">
            <div
              className={cn(
                'text-2xl sm:text-3xl font-bold tracking-tight tabular-nums',
                colorConvGeral(conv_geral),
              )}
            >
              {fmtPct(conv_geral)}
            </div>
          </div>
          <div className="flex justify-between items-center pt-1 border-t border-[#E4E7EB]/60 dark:border-border/60">
            <span className="text-[11px] text-[#78818E] dark:text-muted-foreground">Status</span>
            {cGeral && (
              <span
                className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded border', cGeral.color)}
              >
                {cGeral.text}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 6. CONVERSÃO QUALIFICADOS */}
      <Card className="rounded-[10px] border border-[#E4E7EB] dark:border-border bg-white dark:bg-card shadow-sm flex flex-col justify-between min-h-[120px]">
        <CardContent className="p-4 sm:p-4.5 flex flex-col justify-between h-full">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold tracking-wider uppercase text-[#78818E] dark:text-muted-foreground">
              Conv. Qualif.
            </span>
            <span className="text-[10px] font-medium text-[#78818E] dark:text-muted-foreground">
              Meta ≥ 10%
            </span>
          </div>
          <div className="my-1.5">
            <div
              className={cn(
                'text-2xl sm:text-3xl font-bold tracking-tight tabular-nums',
                colorConvQualif(conv_qualif),
              )}
            >
              {fmtPct(conv_qualif)}
            </div>
          </div>
          <div className="flex justify-between items-center pt-1 border-t border-[#E4E7EB]/60 dark:border-border/60">
            <span className="text-[11px] text-[#78818E] dark:text-muted-foreground">Status</span>
            {cQualif && (
              <span
                className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded border', cQualif.color)}
              >
                {cQualif.text}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 7. DESQUALIFICAÇÃO % */}
      <Card className="rounded-[10px] border border-[#E4E7EB] dark:border-border bg-white dark:bg-card shadow-sm flex flex-col justify-between min-h-[120px]">
        <CardContent className="p-4 sm:p-4.5 flex flex-col justify-between h-full">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold tracking-wider uppercase text-[#78818E] dark:text-muted-foreground">
              Desqualificação %
            </span>
            <span className="text-[10px] font-medium text-[#78818E] dark:text-muted-foreground">
              Limite ≤ 30%
            </span>
          </div>
          <div className="my-1.5">
            <div
              className={cn(
                'text-2xl sm:text-3xl font-bold tracking-tight tabular-nums',
                colorDesq(desqual_pct),
              )}
            >
              {fmtPct(desqual_pct)}
            </div>
          </div>
          <div className="flex justify-between items-center pt-1 border-t border-[#E4E7EB]/60 dark:border-border/60">
            <span className="text-[11px] text-[#78818E] dark:text-muted-foreground">Status</span>
            {cDesq && (
              <span
                className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded border', cDesq.color)}
              >
                {cDesq.text}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 8. FECH. FUP */}
      <Card className="rounded-[10px] border border-[#E4E7EB] dark:border-border bg-white dark:bg-card shadow-sm flex flex-col justify-between min-h-[120px]">
        <CardContent className="p-4 sm:p-4.5 flex flex-col justify-between h-full">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold tracking-wider uppercase text-[#78818E] dark:text-muted-foreground">
              Fech. FUP
            </span>
            <span className="text-[10px] font-medium text-[#78818E] dark:text-muted-foreground">
              Meta ≥ 40%
            </span>
          </div>
          <div className="my-1.5">
            <div
              className={cn(
                'text-2xl sm:text-3xl font-bold tracking-tight tabular-nums',
                cFup
                  ? cFup.text === 'Na meta'
                    ? 'text-[#3E8E5A] dark:text-[#52B86E]'
                    : 'text-[#B4453C] dark:text-red-400'
                  : 'text-[#C9922A] dark:text-[#D9A94A]',
              )}
            >
              {fmtPct(pct_fech_via_fup)}
            </div>
          </div>
          <div className="flex justify-between items-center pt-1 border-t border-[#E4E7EB]/60 dark:border-border/60">
            <span className="text-[11px] text-[#78818E] dark:text-muted-foreground">Status</span>
            {cFup && (
              <span
                className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded border', cFup.color)}
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
    return { text: '-', color: 'text-[#78818E] border-transparent bg-transparent' }
  if (v <= 250)
    return {
      text: '✓ Meta atingida',
      color:
        'text-[#3E8E5A] bg-[#3E8E5A]/10 border-[#3E8E5A]/20 dark:text-[#52B86E] dark:bg-[#3E8E5A]/20 dark:border-[#3E8E5A]/40',
    }
  return {
    text: '✗ Acima do ideal',
    color:
      'text-[#B4453C] bg-[#B4453C]/10 border-[#B4453C]/20 dark:text-red-400 dark:bg-[#B4453C]/20 dark:border-[#B4453C]/40',
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

  const selectedCampaignRotulo = useMemo(() => {
    if (!campaign || campaign === 'Todas') return 'Todas'
    const found = configs?.find((c: any) => c && c.slug === campaign)
    return found?.rotulo || campaign || 'Todas'
  }, [campaign, configs])

  const getFechamentosCount = useCallback(
    (mLeads: any[], m: string | null = null, d: string | null = null) => {
      const targetRotulo = (selectedCampaignRotulo || 'Todas').trim().toUpperCase()
      const targetCampaign = (campaign || '').trim().toUpperCase()
      return (contratos || []).filter((c: any) => {
        if (!c) return false
        const excludedStatuses = ['Sem Qualidade de Segurado', 'Tem Advogado', 'Litispendência']
        if (excludedStatuses.includes(c.status)) return false
        if (c.origem !== 'Campanha') return false
        if (targetRotulo !== 'TODAS') {
          const campOrigem = (c.campanha_origem || 'Aux. Acidente').trim().toUpperCase()
          const cCampOrigemRaw = (c.campanha_origem || '').trim().toUpperCase()
          if (campOrigem !== targetRotulo && cCampOrigemRaw !== targetCampaign) {
            return false
          }
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
    <Card className="rounded-[10px] border border-[#E4E7EB] dark:border-border bg-white dark:bg-card shadow-sm h-full flex flex-col overflow-hidden">
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
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1 overflow-x-auto">
        <Table className="text-xs min-w-[650px]">
          <TableHeader className="bg-[#F5F6F8] dark:bg-muted/30">
            <TableRow className="border-b border-[#E4E7EB] dark:border-border hover:bg-transparent">
              <TableHead className="w-24 text-[10px] font-bold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground py-2.5 px-4">
                MÊS
              </TableHead>
              <TableHead className="text-right text-[10px] font-bold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground py-2.5 px-3">
                INVESTIMENTO
              </TableHead>
              <TableHead className="text-right text-[10px] font-bold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground py-2.5 px-3">
                TOTAL LEADS
              </TableHead>
              <TableHead className="text-right text-[10px] font-bold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground py-2.5 px-3">
                FECHAMENTOS
              </TableHead>
              <TableHead className="text-right text-[10px] font-bold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground py-2.5 px-3">
                CPL (R$)
              </TableHead>
              <TableHead className="text-right text-[10px] font-bold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground py-2.5 px-3">
                CAC (R$)
              </TableHead>
              <TableHead className="text-center w-36 text-[10px] font-bold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground py-2.5 px-3">
                STATUS CAC
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-[#E4E7EB] dark:divide-border">
            {isMultiMonth
              ? displayMonths.map((m) => {
                  const mLeads = filteredLeads.filter(
                    (l: any) => l?.mes && String(l.mes).startsWith(m),
                  )
                  if (mLeads.length === 0) return null
                  const agg = calculateLeadRow(aggregateLeads(mLeads, year, campaign))
                  agg.total_fechados = getFechamentosCount(mLeads, m)
                  agg.cac = agg.total_fechados > 0 ? agg.investimento / agg.total_fechados : null
                  const cacSt = getLocalCacStatus(agg.cac)
                  return (
                    <TableRow
                      key={m}
                      className="hover:bg-[#F5F6F8]/60 dark:hover:bg-muted/40 transition-colors"
                    >
                      <TableCell className="font-semibold text-xs uppercase text-[#252B34] dark:text-foreground py-2.5 px-4">
                        {(m || '').substring(0, 3)}
                      </TableCell>
                      <TableCell className="text-right font-medium text-[#252B34] dark:text-foreground tabular-nums py-2.5 px-3">
                        {fmtMon(agg.investimento)}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-[#4A7FA5] tabular-nums py-2.5 px-3">
                        {agg.total_leads}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-[#3E8E5A] dark:text-[#52B86E] tabular-nums py-2.5 px-3">
                        {agg.total_fechados}
                      </TableCell>
                      <TableCell className="text-right text-[#78818E] dark:text-muted-foreground tabular-nums py-2.5 px-3">
                        {fmtMon(agg.cpl)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-[#C9922A] dark:text-[#D9A94A] tabular-nums py-2.5 px-3">
                        {fmtMon(agg.cac)}
                      </TableCell>
                      <TableCell className="text-center py-2.5 px-3">
                        {agg.cac !== null && (
                          <div
                            className={cn(
                              'inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded border whitespace-nowrap',
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
                      <TableRow className="hover:bg-[#F5F6F8]/60 dark:hover:bg-muted/40 transition-colors">
                        <TableCell className="font-semibold text-xs uppercase text-[#252B34] dark:text-foreground py-2.5 px-4">
                          {(month || '').substring(0, 3)}
                        </TableCell>
                        <TableCell className="text-right font-medium text-[#252B34] dark:text-foreground tabular-nums py-2.5 px-3">
                          {fmtMon(aggAno.investimento)}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-[#4A7FA5] tabular-nums py-2.5 px-3">
                          {aggAno.total_leads}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-[#3E8E5A] dark:text-[#52B86E] tabular-nums py-2.5 px-3">
                          {aggAno.total_fechados}
                        </TableCell>
                        <TableCell className="text-right text-[#78818E] dark:text-muted-foreground tabular-nums py-2.5 px-3">
                          {fmtMon(aggAno.cpl)}
                        </TableCell>
                        <TableCell className="text-right font-bold text-[#C9922A] dark:text-[#D9A94A] tabular-nums py-2.5 px-3">
                          {fmtMon(aggAno.cac)}
                        </TableCell>
                        <TableCell className="text-center py-2.5 px-3">
                          {aggAno.cac !== null && (
                            <div
                              className={cn(
                                'inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded border whitespace-nowrap',
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
                      <TableRow className="hover:bg-[#F5F6F8]/60 dark:hover:bg-muted/40 transition-colors">
                        <TableCell className="font-semibold text-xs uppercase text-[#252B34] dark:text-foreground py-2.5 px-4">
                          Dia {day} de {(month || '').substring(0, 3)} {year}
                        </TableCell>
                        <TableCell className="text-right font-medium text-[#252B34] dark:text-foreground tabular-nums py-2.5 px-3">
                          {fmtMon(aggAno.investimento)}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-[#4A7FA5] tabular-nums py-2.5 px-3">
                          {aggAno.total_leads}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-[#3E8E5A] dark:text-[#52B86E] tabular-nums py-2.5 px-3">
                          {aggAno.total_fechados}
                        </TableCell>
                        <TableCell className="text-right text-[#78818E] dark:text-muted-foreground tabular-nums py-2.5 px-3">
                          {fmtMon(aggAno.cpl)}
                        </TableCell>
                        <TableCell className="text-right font-bold text-[#C9922A] dark:text-[#D9A94A] tabular-nums py-2.5 px-3">
                          {fmtMon(aggAno.cac)}
                        </TableCell>
                        <TableCell className="text-center py-2.5 px-3">
                          {aggAno.cac !== null && (
                            <div
                              className={cn(
                                'inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded border whitespace-nowrap',
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
                  <TableRow className="bg-[#FAF8F2] dark:bg-[#C9922A]/10 hover:bg-[#FAF8F2] dark:hover:bg-[#C9922A]/15 font-bold border-t-2 border-[#C9922A]/30 dark:border-[#C9922A]/50">
                    <TableCell className="text-xs uppercase text-[#C9922A] font-bold py-3 px-4">
                      TOTAL
                    </TableCell>
                    <TableCell className="text-right font-bold text-[#252B34] dark:text-foreground tabular-nums py-3 px-3">
                      {fmtMon(aggAno.investimento)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-[#4A7FA5] tabular-nums py-3 px-3">
                      {aggAno.total_leads}
                    </TableCell>
                    <TableCell className="text-right font-bold text-[#3E8E5A] dark:text-[#52B86E] tabular-nums py-3 px-3">
                      {aggAno.total_fechados}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-[#78818E] dark:text-muted-foreground tabular-nums py-3 px-3">
                      {fmtMon(aggAno.cpl)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-[#C9922A] dark:text-[#D9A94A] tabular-nums py-3 px-3">
                      {fmtMon(aggAno.cac)}
                    </TableCell>
                    <TableCell className="text-center py-3 px-3">
                      {aggAno.cac !== null && (
                        <div
                          className={cn(
                            'inline-flex items-center px-2.5 py-0.5 text-[10px] rounded border whitespace-nowrap font-bold',
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
                <TableCell
                  colSpan={7}
                  className="text-center py-8 text-xs text-[#78818E] dark:text-muted-foreground"
                >
                  Nenhum dado encontrado para o período selecionado.
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
    <Card className="rounded-[10px] border border-[#E4E7EB] dark:border-border bg-white dark:bg-card shadow-sm h-full flex flex-col overflow-hidden">
      <CardHeader className="py-4 px-5 border-b border-[#E4E7EB] dark:border-border bg-white dark:bg-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div>
            <span className="text-[10px] font-bold tracking-[1.5px] uppercase text-[#B4453C]">
              CONTROLE DE QUALIDADE
            </span>
            <CardTitle className="text-base sm:text-lg font-bold text-[#252B34] dark:text-foreground">
              Motivos de Desqualificação
            </CardTitle>
          </div>
          <div className="text-[11px] text-[#78818E] dark:text-muted-foreground font-medium">
            Análise de proporção e distribuição mensal por motivo
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1 flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-[#E4E7EB] dark:divide-border">
        {/* Painel Esquerdo: Barras de proporção */}
        <div className="p-5 lg:w-[38%] flex flex-col justify-between space-y-4 bg-white dark:bg-card">
          <div className="space-y-3.5">
            {reasons.map((r) => {
              const pct = aggAno.total_desq > 0 ? (r.value / aggAno.total_desq) * 100 : 0
              return (
                <div key={r.label} className="space-y-1.5">
                  <div className="flex justify-between items-baseline text-xs">
                    <span className="font-semibold text-[#252B34] dark:text-foreground text-[11px] uppercase tracking-wider">
                      {r.label}
                    </span>
                    <span className="text-xs font-bold text-[#252B34] dark:text-foreground tabular-nums">
                      {r.value}{' '}
                      <span className="text-[#78818E] dark:text-muted-foreground font-medium text-[11px] ml-1">
                        ({pct.toFixed(1)}%)
                      </span>
                    </span>
                  </div>
                  <div className="h-2 w-full bg-[#F5F6F8] dark:bg-muted/40 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#C9922A] rounded-full transition-all duration-500"
                      style={{ width: `${(r.value / maxReason) * 100}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          <div className="pt-4 border-t border-[#E4E7EB] dark:border-border mt-4 flex justify-between items-center bg-[#FAF8F2] dark:bg-[#C9922A]/10 p-3 rounded-lg border border-[#E8DFCE] dark:border-[#C9922A]/20">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground block">
                TOTAL DESQUALIFICADOS
              </span>
              <span className="text-[11px] text-[#78818E] dark:text-muted-foreground">
                Soma de todos os motivos
              </span>
            </div>
            <span className="text-2xl font-bold text-[#B4453C] dark:text-red-400 tabular-nums">
              {aggAno.total_desq}
            </span>
          </div>
        </div>

        {/* Painel Direito: Tabela por Mês */}
        <div className="p-0 flex-1 overflow-x-auto bg-white dark:bg-card">
          <Table className="text-xs min-w-[560px]">
            <TableHeader className="bg-[#F5F6F8] dark:bg-muted/30">
              <TableRow className="border-b border-[#E4E7EB] dark:border-border hover:bg-transparent">
                <TableHead className="w-20 text-[10px] font-bold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground py-2.5 px-3">
                  MÊS
                </TableHead>
                <TableHead className="text-right text-[10px] font-bold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground py-2.5 px-2">
                  S/QUAL
                </TableHead>
                <TableHead className="text-right text-[10px] font-bold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground py-2.5 px-2">
                  APOSEN.
                </TableHead>
                <TableHead className="text-right text-[10px] font-bold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground py-2.5 px-2">
                  CARNÊ
                </TableHead>
                <TableHead className="text-right text-[10px] font-bold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground py-2.5 px-2">
                  OUTROS
                </TableHead>
                <TableHead className="text-right text-[10px] font-bold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground py-2.5 px-2">
                  SEM INT.
                </TableHead>
                <TableHead className="text-right text-[10px] font-bold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground py-2.5 px-2">
                  ENGANO
                </TableHead>
                <TableHead className="text-right text-[10px] font-bold uppercase tracking-wider text-[#B4453C] dark:text-red-400 py-2.5 px-3">
                  TOTAL
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-[#E4E7EB] dark:divide-border">
              {isMultiMonth
                ? displayMonths.map((m) => {
                    const mLeads = filteredLeads.filter(
                      (l: any) => l?.mes && String(l.mes).startsWith(m),
                    )
                    if (mLeads.length === 0) return null
                    const agg = calculateLeadRow(aggregateLeads(mLeads, year, campaign))
                    return (
                      <TableRow
                        key={m}
                        className="hover:bg-[#F5F6F8]/60 dark:hover:bg-muted/40 transition-colors"
                      >
                        <TableCell className="font-semibold text-xs uppercase text-[#252B34] dark:text-foreground py-2.5 px-3">
                          {(m || '').substring(0, 3)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-[#252B34] dark:text-foreground py-2.5 px-2">
                          {agg.sem_qualidade}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-[#252B34] dark:text-foreground py-2.5 px-2">
                          {agg.aposentado}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-[#252B34] dark:text-foreground py-2.5 px-2">
                          {agg.contribuinte_carne}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-[#252B34] dark:text-foreground py-2.5 px-2">
                          {agg.outros}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-[#252B34] dark:text-foreground py-2.5 px-2">
                          {agg.sem_interesse}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-[#252B34] dark:text-foreground py-2.5 px-2">
                          {agg.engano}
                        </TableCell>
                        <TableCell className="text-right font-bold text-[#B4453C] dark:text-red-400 tabular-nums py-2.5 px-3">
                          {agg.total_desq}
                        </TableCell>
                      </TableRow>
                    )
                  })
                : day === 'Todos'
                  ? filteredLeads.length > 0 && (
                      <TableRow className="hover:bg-[#F5F6F8]/60 dark:hover:bg-muted/40 transition-colors">
                        <TableCell className="font-semibold text-xs uppercase text-[#252B34] dark:text-foreground py-2.5 px-3">
                          {(month || '').substring(0, 3)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-[#252B34] dark:text-foreground py-2.5 px-2">
                          {aggAno.sem_qualidade}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-[#252B34] dark:text-foreground py-2.5 px-2">
                          {aggAno.aposentado}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-[#252B34] dark:text-foreground py-2.5 px-2">
                          {aggAno.contribuinte_carne}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-[#252B34] dark:text-foreground py-2.5 px-2">
                          {aggAno.outros}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-[#252B34] dark:text-foreground py-2.5 px-2">
                          {aggAno.sem_interesse}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-[#252B34] dark:text-foreground py-2.5 px-2">
                          {aggAno.engano}
                        </TableCell>
                        <TableCell className="text-right font-bold text-[#B4453C] dark:text-red-400 tabular-nums py-2.5 px-3">
                          {aggAno.total_desq}
                        </TableCell>
                      </TableRow>
                    )
                  : filteredLeads.length > 0 && (
                      <TableRow className="hover:bg-[#F5F6F8]/60 dark:hover:bg-muted/40 transition-colors">
                        <TableCell className="font-semibold text-xs uppercase text-[#252B34] dark:text-foreground py-2.5 px-3">
                          Dia {day}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-[#252B34] dark:text-foreground py-2.5 px-2">
                          {aggAno.sem_qualidade}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-[#252B34] dark:text-foreground py-2.5 px-2">
                          {aggAno.aposentado}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-[#252B34] dark:text-foreground py-2.5 px-2">
                          {aggAno.contribuinte_carne}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-[#252B34] dark:text-foreground py-2.5 px-2">
                          {aggAno.outros}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-[#252B34] dark:text-foreground py-2.5 px-2">
                          {aggAno.sem_interesse}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-[#252B34] dark:text-foreground py-2.5 px-2">
                          {aggAno.engano}
                        </TableCell>
                        <TableCell className="text-right font-bold text-[#B4453C] dark:text-red-400 tabular-nums py-2.5 px-3">
                          {aggAno.total_desq}
                        </TableCell>
                      </TableRow>
                    )}
              {isMultiMonth && filteredLeads.length > 0 && (
                <TableRow className="bg-[#FAF8F2] dark:bg-[#C9922A]/10 hover:bg-[#FAF8F2] dark:hover:bg-[#C9922A]/15 font-bold border-t-2 border-[#C9922A]/30 dark:border-[#C9922A]/50">
                  <TableCell className="text-xs uppercase text-[#C9922A] font-bold py-3 px-3">
                    TOTAL
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-[#252B34] dark:text-foreground font-bold py-3 px-2">
                    {aggAno.sem_qualidade}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-[#252B34] dark:text-foreground font-bold py-3 px-2">
                    {aggAno.aposentado}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-[#252B34] dark:text-foreground font-bold py-3 px-2">
                    {aggAno.contribuinte_carne}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-[#252B34] dark:text-foreground font-bold py-3 px-2">
                    {aggAno.outros}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-[#252B34] dark:text-foreground font-bold py-3 px-2">
                    {aggAno.sem_interesse}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-[#252B34] dark:text-foreground font-bold py-3 px-2">
                    {aggAno.engano}
                  </TableCell>
                  <TableCell className="text-right text-xs font-bold text-[#B4453C] dark:text-red-400 tabular-nums py-3 px-3">
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
