import { useMemo } from 'react'
import { DollarSign, TrendingUp, FileCheck2, Calculator, AlertCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/formatters'
import { monthsArray } from '@/lib/months'

interface Props {
  data: any[]
  tipo: string
  responsavel: string
  origem: string
  parceiro?: string
  month: string
  year: string
  monthStart: string
  monthEnd: string
  status: string
}

export function ProtocoloDashboard({
  data,
  tipo,
  responsavel,
  origem,
  parceiro = 'Todos',
  month,
  year,
  monthStart,
  monthEnd,
  status,
}: Props) {
  const filteredData = useMemo(() => {
    return data.filter((d) => {
      if (origem !== 'Todos' && d.origem !== origem) return false
      if (parceiro !== 'Todos' && d.parceiro !== parceiro) return false
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
  }, [data, tipo, responsavel, origem, parceiro, year, month, monthStart, monthEnd])

  const filteredByStatus = useMemo(() => {
    return filteredData.filter((d) => {
      if (status === 'Todos') {
        return [
          'Protocolado Judicial',
          'Protocolado Administrativo',
          'Requerimento Adm.',
          'Prov. Inicial',
          'Calculado',
        ].includes(d.status)
      }
      return d.status === status
    })
  }, [filteredData, status])

  const totalAcoes = filteredByStatus.filter((d) =>
    [
      'Protocolado Judicial',
      'Protocolado Administrativo',
      'Requerimento Adm.',
      'Prov. Inicial',
      'Calculado',
    ].includes(d.status),
  ).length

  const projHonorariosTicketMedio = filteredByStatus
    .filter(
      (d) =>
        [
          'Protocolado Judicial',
          'Protocolado Administrativo',
          'Requerimento Adm.',
          'Prov. Inicial',
          'Calculado',
        ].includes(d.status) && d.decisao !== 'Improcedente',
    )
    .reduce((sum, d) => sum + (d.valor || 0) * (d.parceiro ? 0.15 : 0.3), 0)

  const ticketMedio = totalAcoes > 0 ? projHonorariosTicketMedio / totalAcoes : null

  const cProtJud = filteredData.filter((d) => d.status === 'Protocolado Judicial').length
  const cProtAdm = filteredData.filter((d) => d.status === 'Protocolado Administrativo').length
  const cReqAdm = filteredData.filter((d) => d.status === 'Requerimento Adm.').length
  const cProv = filteredData.filter((d) => d.status === 'Prov. Inicial').length
  const cDocs = filteredData.filter((d) => d.status === 'R. Docs').length
  const cCalc = filteredData.filter((d) => d.status === 'Calculado').length

  const periodoLabel = useMemo(() => {
    if (month !== 'Todos') {
      const idx = parseInt(month, 10)
      return monthsArray[idx] ? `${monthsArray[idx]} ${year !== 'Todos' ? year : ''}`.trim() : null
    }
    if (monthStart !== 'Todos' && monthEnd !== 'Todos') {
      const s = monthsArray[parseInt(monthStart, 10)]
      const e = monthsArray[parseInt(monthEnd, 10)]
      return `${s} — ${e} ${year !== 'Todos' ? year : ''}`.trim()
    }
    if (year !== 'Todos') {
      return `Ano ${year}`
    }
    return 'Todos os períodos'
  }, [month, monthStart, monthEnd, year])

  return (
    <div className="space-y-4">
      {/* Grid de Cards Superiores — Linguagem Grafite Premium 2.1 */}
      <div className="grid gap-3.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {/* CARD 1 — PROJEÇÃO DE HONORÁRIOS (Card de Destaque Executivo Grafite #22262E) */}
        <Card className="relative overflow-hidden rounded-[10px] border border-[#2E3440] bg-[#22262E] text-white shadow-sm flex flex-col justify-between">
          <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[11px] font-semibold tracking-wider uppercase text-[#9EA7B6]">
                  Projeção de Honorários
                </span>
                <div className="h-7 w-7 rounded-md bg-[#2B303C] flex items-center justify-center text-[#D9A94A]">
                  <DollarSign className="h-4 w-4" />
                </div>
              </div>
              <p className="text-[11px] text-[#7C8596] mb-3 truncate" title={periodoLabel}>
                {periodoLabel}
              </p>
            </div>

            <div>
              <div
                className="text-xl sm:text-2xl font-bold tracking-tight text-[#D9A94A] tabular-nums"
                title={formatCurrency(projHonorariosTicketMedio)}
              >
                {formatCurrency(projHonorariosTicketMedio)}
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-[#A5ADB9]">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#3E8E5A]" />
                <span>30% escritório (15% parceiro)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CARD 2 — TOTAL DE AÇÕES CONSIDERADAS */}
        <Card className="rounded-[10px] border border-[#E4E7EB] dark:border-border bg-white dark:bg-card shadow-sm flex flex-col justify-between">
          <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[11px] font-semibold tracking-wider uppercase text-[#78818E] dark:text-muted-foreground">
                  Ações na Projeção
                </span>
                <div className="h-7 w-7 rounded-md bg-[#F5F6F8] dark:bg-muted/50 flex items-center justify-center text-[#4A7FA5]">
                  <FileCheck2 className="h-4 w-4" />
                </div>
              </div>
              <p className="text-[11px] text-[#78818E] dark:text-muted-foreground mb-3 truncate">
                Status ativos na projeção
              </p>
            </div>

            <div>
              <div className="text-xl sm:text-2xl font-bold tracking-tight text-[#252B34] dark:text-foreground tabular-nums">
                {totalAcoes}
              </div>
              <p className="mt-2 text-[11px] text-[#78818E] dark:text-muted-foreground">
                Judicial, Prot. Adm., Req. Adm., Inicial e Calculado
              </p>
            </div>
          </CardContent>
        </Card>

        {/* CARD 3 — TICKET MÉDIO POR AÇÃO */}
        <Card className="rounded-[10px] border border-[#E4E7EB] dark:border-border bg-white dark:bg-card shadow-sm flex flex-col justify-between">
          <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[11px] font-semibold tracking-wider uppercase text-[#78818E] dark:text-muted-foreground">
                  Ticket Médio por Ação
                </span>
                <div className="h-7 w-7 rounded-md bg-[#F5F6F8] dark:bg-muted/50 flex items-center justify-center text-[#C9922A]">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </div>
              <p className="text-[11px] text-[#78818E] dark:text-muted-foreground mb-3 truncate">
                Média projetada por processo
              </p>
            </div>

            <div>
              <div
                className="text-xl sm:text-2xl font-bold tracking-tight text-[#252B34] dark:text-foreground tabular-nums"
                title={ticketMedio !== null ? formatCurrency(ticketMedio) : '—'}
              >
                {ticketMedio !== null ? formatCurrency(ticketMedio) : '—'}
              </div>
              <p className="mt-2 text-[11px] text-[#78818E] dark:text-muted-foreground">
                {totalAcoes > 0 ? `${totalAcoes} ações calculadas` : 'Sem registros ativos'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* CARD 4 — PENDÊNCIAS & DOCUMENTOS */}
        <Card className="rounded-[10px] border border-[#E4E7EB] dark:border-border bg-white dark:bg-card shadow-sm flex flex-col justify-between">
          <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[11px] font-semibold tracking-wider uppercase text-[#78818E] dark:text-muted-foreground">
                  Faltando Documentos
                </span>
                <div className="h-7 w-7 rounded-md bg-[#F5F6F8] dark:bg-muted/50 flex items-center justify-center text-[#C77E1E]">
                  <AlertCircle className="h-4 w-4" />
                </div>
              </div>
              <p className="text-[11px] text-[#78818E] dark:text-muted-foreground mb-3 truncate">
                Casos com pendência documental
              </p>
            </div>

            <div>
              <div className="text-xl sm:text-2xl font-bold tracking-tight text-[#C77E1E] tabular-nums">
                {cDocs}
              </div>
              <p className="mt-2 text-[11px] text-[#78818E] dark:text-muted-foreground">
                Aguardando envio pelo cliente
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Faixa Sóbria de Contadores por Status do Filtro Atual */}
      <div className="rounded-[10px] border border-[#E4E7EB] dark:border-border bg-white dark:bg-card px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 font-semibold text-[#252B34] dark:text-foreground">
            <Calculator className="h-4 w-4 text-[#C9922A]" />
            <span className="uppercase tracking-wider text-[11px] text-[#78818E] dark:text-muted-foreground">
              Distribuição por Status:
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#8A56AC]" />
              <span className="text-[#78818E] dark:text-muted-foreground">Calculado:</span>
              <strong className="font-semibold text-[#252B34] dark:text-foreground tabular-nums">
                {cCalc}
              </strong>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#3E8E5A]" />
              <span className="text-[#78818E] dark:text-muted-foreground">Prot. Judicial:</span>
              <strong className="font-semibold text-[#252B34] dark:text-foreground tabular-nums">
                {cProtJud}
              </strong>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#2E7D5B]" />
              <span className="text-[#78818E] dark:text-muted-foreground">Prot. Adm.:</span>
              <strong className="font-semibold text-[#252B34] dark:text-foreground tabular-nums">
                {cProtAdm}
              </strong>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#4A7FA5]" />
              <span className="text-[#78818E] dark:text-muted-foreground">Req. Adm.:</span>
              <strong className="font-semibold text-[#252B34] dark:text-foreground tabular-nums">
                {cReqAdm}
              </strong>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#2B6CB0]" />
              <span className="text-[#78818E] dark:text-muted-foreground">Prov. Inicial:</span>
              <strong className="font-semibold text-[#252B34] dark:text-foreground tabular-nums">
                {cProv}
              </strong>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#C77E1E]" />
              <span className="text-[#78818E] dark:text-muted-foreground">Falt. Docs:</span>
              <strong className="font-semibold text-[#C77E1E] tabular-nums">{cDocs}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
