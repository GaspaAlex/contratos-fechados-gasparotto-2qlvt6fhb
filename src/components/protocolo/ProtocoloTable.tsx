import React, { useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Search,
  Plus,
  Bell,
  ArrowRight,
  Printer,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { printReport, PrintReportColumn } from '@/lib/print-report'
import { formatCurrency } from '@/lib/formatters'
import { normalizeDateCivil } from '@/lib/date-utils'
import { ProtocoloTableRow } from './ProtocoloTableRow'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

import { monthsArray } from '@/lib/months'
import {
  getProtocoloFollowUpStats,
  isProtocoloDueForFollowUp,
  isProtocoloOverdue,
} from '@/lib/date-utils'
import { cn } from '@/lib/utils'

const normalizeText = (text: string) => {
  if (!text) return ''
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

export function ProtocoloTable({
  data,
  tipos,
  search,
  setSearch,
  status,
  setStatus,
  origem,
  setOrigem,
  parceiro = 'Todos',
  setParceiro,
  tipo,
  setTipo,
  responsavel,
  setResponsavel,
  month,
  setMonth,
  year,
  setYear,
  monthStart,
  setMonthStart,
  monthEnd,
  setMonthEnd,
  onAdd,
  onEdit,
  onDelete,
}: any) {
  const availableYears = useMemo(() => {
    const years = new Set(
      data.map((d: any) => {
        if (d.dprotocolo) return d.dprotocolo.substring(0, 4)
        if (d.dcalculo) return d.dcalculo.substring(0, 4)
        return ''
      }),
    )
    years.delete('')
    const currentYear = new Date().getFullYear().toString()
    years.add(currentYear)
    return Array.from(years).sort().reverse()
  }, [data])

  const responsaveisList = useMemo(() => {
    const list = new Set(
      data.map((d: any) => d.expand?.responsavel?.nome || d.responsavel).filter(Boolean),
    )
    return Array.from(list).sort()
  }, [data])

  const followUpStats = useMemo(() => {
    return getProtocoloFollowUpStats(data)
  }, [data])

  // Filters
  const filtered = data.filter((d: any) => {
    if (origem !== 'Todos' && d.origem !== origem) {
      return false
    }
    if (parceiro !== 'Todos' && d.parceiro !== parceiro) {
      return false
    }
    const searchNormalized = normalizeText(search)
    if (searchNormalized) {
      const nNome = normalizeText(d.nome)
      const nResp = normalizeText(d.expand?.responsavel?.nome)
      const nTipo = normalizeText(d.expand?.tipo_acao?.nome)
      const nAutos = normalizeText(d.nautos)

      if (
        !nNome.includes(searchNormalized) &&
        !nResp.includes(searchNormalized) &&
        !nTipo.includes(searchNormalized) &&
        !nAutos.includes(searchNormalized)
      ) {
        return false
      }
    }
    if (status === 'Acompanhar') {
      if (!isProtocoloDueForFollowUp(d)) return false
    } else if (status !== 'Todos' && d.status !== status) {
      return false
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

  // Chronological Sorting: ascending
  const sortedFiltered = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const dateAStr = a.dprotocolo || a.dcalculo
      const dateBStr = b.dprotocolo || b.dcalculo
      const dateA = dateAStr ? new Date(dateAStr).getTime() : 0
      const dateB = dateBStr ? new Date(dateBStr).getTime() : 0
      return dateA - dateB
    })
  }, [filtered])

  // Analytics - Decisions
  const procedentes = filtered.filter((d: any) => d.decisao === 'Procedente').length
  const improcedentes = filtered.filter((d: any) => d.decisao === 'Improcedente').length
  const totalDecisoes = procedentes + improcedentes
  const percProc = totalDecisoes ? Math.round((procedentes / totalDecisoes) * 100) : 0
  const percImp = totalDecisoes ? Math.round((improcedentes / totalDecisoes) * 100) : 0

  // Grouping
  const grouped = useMemo(() => {
    const groups: Record<string, any[]> = {}
    sortedFiltered.forEach((d: any) => {
      const recDate = d.dprotocolo || d.dcalculo
      const m = recDate ? recDate.substring(0, 7) : '0000-00'
      if (!groups[m]) groups[m] = []
      groups[m].push(d)
    })
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]))
  }, [sortedFiltered])

  const headerClass =
    'text-[10px] uppercase tracking-wider text-[#78818E] dark:text-muted-foreground font-semibold whitespace-nowrap'

  const formatDateBR = (val?: string) => {
    if (!val) return '-'
    const onlyDate = val.split(' ')[0].split('T')[0]
    const parts = onlyDate.split('-')
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`
    }
    return val
  }

  const getStatusBadgeHtml = (st: string) => {
    if (!st) return '-'
    let badgeClass = 'badge-gray'
    if (st === 'Protocolado Judicial') badgeClass = 'badge-recebido'
    else if (st === 'Protocolado Administrativo') badgeClass = 'badge-recebido'
    else if (st === 'Requerimento Adm.') badgeClass = 'badge-purple'
    else if (st === 'Prov. Inicial') badgeClass = 'badge-aguardando'
    else if (st === 'R. Docs') badgeClass = 'badge-gold'
    else if (st === 'Calculado') badgeClass = 'badge-amber'

    const label = st === 'R. Docs' ? 'Faltando Documentos' : st
    return `<span class="badge ${badgeClass}">${label}</span>`
  }

  const handlePrintReport = () => {
    const activeFiltersList: string[] = []

    if (search.trim()) {
      activeFiltersList.push(`Busca: "${search.trim()}"`)
    }
    if (tipo !== 'Todos') {
      activeFiltersList.push(`Benefício: ${tipo}`)
    }
    if (responsavel !== 'Todos') {
      activeFiltersList.push(`Responsável: ${responsavel}`)
    }
    if (status !== 'Todos') {
      if (status === 'Acompanhar') {
        activeFiltersList.push('Acompanhar (Atrasados e Revisões)')
      } else {
        activeFiltersList.push(`Status: ${status === 'R. Docs' ? 'Faltando Documentos' : status}`)
      }
    }
    if (origem !== 'Todos') {
      activeFiltersList.push(`Origem: ${origem}`)
    }
    if (parceiro !== 'Todos') {
      activeFiltersList.push(`Parceiro: ${parceiro}`)
    }
    if (monthStart !== 'Todos' && monthEnd !== 'Todos') {
      const startIdx = parseInt(monthStart, 10)
      const endIdx = parseInt(monthEnd, 10)
      const startLabel = monthsArray[startIdx] || monthStart
      const endLabel = monthsArray[endIdx] || monthEnd
      activeFiltersList.push(`Período: ${startLabel} até ${endLabel}`)
    } else if (month !== 'Todos') {
      const monthIdx = parseInt(month, 10)
      const monthLabel = monthsArray[monthIdx] || month
      activeFiltersList.push(`Mês: ${monthLabel}`)
    }
    if (year !== 'Todos') {
      activeFiltersList.push(`Ano: ${year}`)
    }

    const columns: PrintReportColumn[] = [
      {
        header: '#',
        accessor: (_item, idx) => String(idx + 1),
        align: 'center',
        width: '28px',
      },
      {
        header: 'Nome',
        accessor: (item) => {
          const nome = item.nome || '-'
          const rep = item.representante
            ? `<div style="font-size: 8.5px; color: #78716c; margin-top: 1px;">Rep: ${item.representante_nome || 'Informado'}</div>`
            : ''
          return `<strong>${nome}</strong>${rep}`
        },
        align: 'left',
      },
      {
        header: 'Benefício',
        accessor: (item) => item.expand?.tipo_acao?.nome || '-',
        align: 'left',
      },
      {
        header: 'Responsável',
        accessor: (item) => item.expand?.responsavel?.nome || item.responsavel || '-',
        align: 'left',
      },
      {
        header: 'Status',
        accessor: (item) => getStatusBadgeHtml(item.status),
        align: 'center',
      },
      {
        header: 'Origem',
        accessor: (item) => {
          if (!item.origem) return '-'
          if (item.origem === 'Campanha Meta' || item.origem === 'Campanha') {
            return '<span class="badge badge-recebido">Campanha Meta</span>'
          }
          if (item.origem === 'Campanha Google') {
            return '<span class="badge badge-aguardando">Campanha Google</span>'
          }
          if (item.origem === 'Canal YouTube') {
            return '<span class="badge badge-red">Canal YouTube</span>'
          }
          if (item.origem === 'Macohin') {
            return '<span class="badge badge-purple">Macohin</span>'
          }
          if (item.origem === 'Particular') {
            return '<span class="badge badge-gray">Particular</span>'
          }
          return item.origem
        },
        align: 'center',
      },
      {
        header: 'Parceiro',
        accessor: (item) => item.parceiro || '-',
        align: 'left',
      },
      {
        header: 'D. Contrato',
        accessor: (item) => formatDateBR(item.dcontrato),
        align: 'center',
      },
      {
        header: 'D. Cálculo',
        accessor: (item) => formatDateBR(item.dcalculo),
        align: 'center',
      },
      {
        header: 'D. Protocolo',
        accessor: (item) => {
          const dateStr = formatDateBR(item.dprotocolo)
          if (dateStr === '-') return '-'
          if (isProtocoloOverdue(item)) {
            return `<span style="display: inline-flex; align-items: center; justify-content: center; gap: 3px; color: #dc2626; font-weight: 700; white-space: nowrap;"><span style="font-size: 11px; line-height: 1;">⚠</span><span>${dateStr}</span></span>`
          }
          return dateStr
        },
        align: 'center',
      },
      {
        header: 'Nº Autos',
        accessor: (item) =>
          item.nautos
            ? `<span style="font-family: monospace; font-size: 9.5px;">${item.nautos}</span>`
            : '-',
        align: 'left',
      },
      {
        header: 'Valor',
        accessor: (item) => (item.valor ? formatCurrency(item.valor) : '-'),
        align: 'right',
      },
      {
        header: 'Honorários',
        accessor: (item) => {
          if (item.decisao === 'Improcedente' || !item.valor) return '-'
          const percentual = item.parceiro ? 0.15 : 0.3
          return `<strong style="color: #C9922A;">${formatCurrency(item.valor * percentual)}</strong>`
        },
        align: 'right',
      },
      {
        header: 'Decisão',
        accessor: (item) => {
          if (!item.decisao || item.decisao === 'Aguardando') return '-'
          if (item.decisao === 'Procedente') {
            return '<span class="badge badge-recebido">Procedente</span>'
          }
          if (item.decisao === 'Improcedente') {
            return '<span class="badge badge-red">Improcedente</span>'
          }
          return item.decisao
        },
        align: 'center',
      },
      {
        header: 'Acompanhamento',
        accessor: (item) => {
          const parts: string[] = []
          const reviewCivil = normalizeDateCivil(item.revisar_em)
          if (reviewCivil) {
            const [y, m, d] = reviewCivil.split('-')
            const dateStr = d ? `${d}/${m}/${y}` : reviewCivil
            parts.push(`<div><strong style="color: #C9922A;">Revisar em:</strong> ${dateStr}</div>`)
          }
          if (item.observacoes && item.observacoes.trim()) {
            const safeObs = item.observacoes
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/\n/g, '<br/>')
            parts.push(
              `<div><strong style="color: #4b5563;">Observações:</strong> ${safeObs}</div>`,
            )
          }
          if (parts.length === 0) return '-'
          return `<div style="font-size: 9.5px; line-height: 1.3;">${parts.join('<div style="margin-top: 3px;"></div>')}</div>`
        },
        align: 'left',
      },
    ]

    printReport({
      title: 'Relatório de Protocolos',
      subtitle: 'Advocacia Gasparotto',
      filters: activeFiltersList,
      columns,
      data: sortedFiltered,
      orientation: 'landscape',
      totalLabel: 'Total de registros',
    })
  }

  const statusPills = [
    { value: 'Todos', label: 'Todos' },
    {
      value: 'Acompanhar',
      label: `Acompanhar (${followUpStats.total})`,
      isAcompanhar: true,
    },
    { value: 'Calculado', label: 'Calculado' },
    { value: 'Protocolado Judicial', label: 'Judicial' },
    { value: 'Protocolado Administrativo', label: 'Prot. Adm.' },
    { value: 'Requerimento Adm.', label: 'Administrativo' },
    { value: 'Prov. Inicial', label: 'Inicial' },
    { value: 'R. Docs', label: 'Falt. Docs' },
  ]

  const origemPills = ['Campanha Meta', 'Campanha Google', 'Canal YouTube', 'Macohin', 'Particular']

  const parceiroPills = ['Previdenciarista', 'Carnevale', 'Macohin']

  return (
    <div className="space-y-4">
      {/* ALERTA DE ACOMPANHAMENTO — Refinado e Sofisticado (Paleta #C77E1E e #B4453C) */}
      {followUpStats.total > 0 && (
        <div
          role="alert"
          aria-live="polite"
          className="relative overflow-hidden rounded-[10px] border border-[#C77E1E]/30 bg-[#C77E1E]/[0.05] dark:bg-[#C77E1E]/10 p-4 sm:p-5 shadow-sm"
        >
          {/* Barra lateral de acento */}
          <span
            className="absolute left-0 top-0 bottom-0 w-[4px] bg-[#C77E1E]"
            aria-hidden="true"
          />

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pl-1">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#C77E1E]/15 text-[#C77E1E] border border-[#C77E1E]/25">
                <Bell className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-bold text-[#252B34] dark:text-foreground text-sm sm:text-base tracking-tight">
                  <span className="text-[10px] font-bold tracking-[1.2px] uppercase text-[#C77E1E] bg-[#C77E1E]/15 px-2 py-0.5 rounded">
                    ATENÇÃO
                  </span>
                  <span>
                    {followUpStats.total === 1
                      ? '1 caso requer acompanhamento imediato'
                      : `${followUpStats.total} casos requerem acompanhamento imediato`}
                  </span>
                </div>
                <div className="text-xs text-[#78818E] dark:text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  {(() => {
                    const parts: React.ReactNode[] = []

                    if (followUpStats.atrasados > 0) {
                      parts.push(
                        <span
                          key="atrasados"
                          className="font-semibold text-[#B4453C] dark:text-red-400"
                        >
                          {followUpStats.atrasados === 1
                            ? '1 protocolo em atraso'
                            : `${followUpStats.atrasados} protocolos em atraso`}
                        </span>,
                      )
                    }

                    if (followUpStats.revisarHoje > 0) {
                      parts.push(
                        <span
                          key="hoje"
                          className="font-semibold text-[#C77E1E] dark:text-amber-400"
                        >
                          {followUpStats.revisarHoje === 1
                            ? '1 para revisar hoje'
                            : `${followUpStats.revisarHoje} para revisar hoje`}
                        </span>,
                      )
                    }

                    if (followUpStats.revisarAtrasadas > 0) {
                      parts.push(
                        <span
                          key="revisar-atrasadas"
                          className="font-semibold text-[#B4453C] dark:text-red-400"
                        >
                          {followUpStats.revisarAtrasadas === 1
                            ? '1 revisão pendente'
                            : `${followUpStats.revisarAtrasadas} revisões pendentes`}
                        </span>,
                      )
                    }

                    return parts.map((part, index) => (
                      <React.Fragment key={index}>
                        {index > 0 && <span className="text-[#A0A7B5]">&bull;</span>}
                        {part}
                      </React.Fragment>
                    ))
                  })()}
                </div>
              </div>
            </div>

            <Button
              type="button"
              onClick={() => setStatus(status === 'Acompanhar' ? 'Todos' : 'Acompanhar')}
              variant="outline"
              size="sm"
              className={cn(
                'self-start sm:self-center shrink-0 h-9 font-semibold text-xs gap-1.5 transition-colors border shadow-xs',
                status === 'Acompanhar'
                  ? 'bg-[#161920] border-[#161920] text-white hover:bg-[#202532] hover:text-white dark:bg-[#D9A94A] dark:text-[#161920]'
                  : 'border-[#C77E1E]/40 bg-white dark:bg-card text-[#C77E1E] hover:bg-[#C77E1E]/10 hover:text-[#C77E1E]',
              )}
            >
              {status === 'Acompanhar'
                ? 'Ver todos os protocolos'
                : 'Filtrar casos de acompanhamento'}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Decisions Mini-Dashboard — Padrão Corporativo Contemporâneo */}
      <Card className="rounded-[10px] border border-[#E4E7EB] dark:border-border bg-white dark:bg-card shadow-sm">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <h3 className="text-[11px] font-semibold text-[#78818E] dark:text-muted-foreground uppercase tracking-wider">
              Decisões Judiciais dos Processos Listados
            </h3>
            <span className="text-xs text-[#78818E] dark:text-muted-foreground tabular-nums">
              {totalDecisoes} {totalDecisoes === 1 ? 'decisão registrada' : 'decisões registradas'}
            </span>
          </div>

          {totalDecisoes > 0 ? (
            <div className="space-y-3">
              <div className="h-2.5 w-full rounded-full overflow-hidden flex bg-[#F5F6F8] dark:bg-muted/50 border border-[#E4E7EB]/50">
                <div
                  className="h-full bg-[#3E8E5A] transition-all duration-500"
                  style={{ width: `${percProc}%` }}
                  title={`Procedentes: ${percProc}%`}
                />
                <div
                  className="h-full bg-[#B4453C] transition-all duration-500"
                  style={{ width: `${percImp}%` }}
                  title={`Improcedentes: ${percImp}%`}
                />
              </div>

              <div className="flex flex-wrap items-center gap-6 text-xs">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded-md bg-[#3E8E5A]/10 text-[#3E8E5A] flex items-center justify-center">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-[#252B34] dark:text-foreground font-semibold tabular-nums">
                    {procedentes} Procedentes
                  </span>
                  <span className="text-[#3E8E5A] font-semibold tabular-nums">({percProc}%)</span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded-md bg-[#B4453C]/10 text-[#B4453C] flex items-center justify-center">
                    <XCircle className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-[#252B34] dark:text-foreground font-semibold tabular-nums">
                    {improcedentes} Improcedentes
                  </span>
                  <span className="text-[#B4453C] font-semibold tabular-nums">({percImp}%)</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-[#78818E] dark:text-muted-foreground py-1">
              Nenhuma decisão registrada para os filtros selecionados.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Toolbar Principal com Filtros Sóbrios no Padrão shadcn */}
      <div className="space-y-3 rounded-[10px] border border-[#E4E7EB] dark:border-border bg-white dark:bg-card p-4 shadow-sm">
        {/* Linha 1: Busca, Selects shadcn e Ações */}
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          <div className="flex flex-wrap gap-2.5 items-center flex-1">
            {/* Campo de Busca */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#78818E]" />
              <Input
                placeholder="Buscar cliente, resp. ou autos..."
                className="pl-9 h-9 text-xs border-[#E4E7EB] dark:border-border bg-white dark:bg-card rounded-md focus-visible:ring-[#C9922A]"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Select Benefício */}
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger className="w-full sm:w-[170px] h-9 text-xs border-[#E4E7EB] dark:border-border bg-white dark:bg-card rounded-md">
                <SelectValue placeholder="Todos os Benefícios" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos" className="text-xs">
                  Todos os Benefícios
                </SelectItem>
                {tipos.map((t: any) => (
                  <SelectItem key={t.id} value={t.nome} className="text-xs">
                    {t.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Select Responsável */}
            <Select value={responsavel} onValueChange={setResponsavel}>
              <SelectTrigger className="w-full sm:w-[170px] h-9 text-xs border-[#E4E7EB] dark:border-border bg-white dark:bg-card rounded-md">
                <SelectValue placeholder="Todos os Responsáveis" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos" className="text-xs">
                  Todos os Responsáveis
                </SelectItem>
                {responsaveisList.map((r: any) => (
                  <SelectItem key={r} value={r} className="text-xs">
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Select Mês */}
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="w-full sm:w-[140px] h-9 text-xs border-[#E4E7EB] dark:border-border bg-white dark:bg-card rounded-md">
                <SelectValue placeholder="Todos os meses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos" className="text-xs">
                  Todos os meses
                </SelectItem>
                {monthsArray.map((m, i) => (
                  <SelectItem key={i} value={i.toString()} className="text-xs">
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Select Ano */}
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="w-full sm:w-[130px] h-9 text-xs border-[#E4E7EB] dark:border-border bg-white dark:bg-card rounded-md">
                <SelectValue placeholder="Todos os anos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos" className="text-xs">
                  Todos os anos
                </SelectItem>
                {availableYears.map((y: any) => (
                  <SelectItem key={y} value={y} className="text-xs">
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handlePrintReport}
                  className="h-9 w-9 border-[#E4E7EB] dark:border-border text-[#78818E] hover:text-[#C9922A] hover:border-[#C9922A]/40 rounded-md"
                >
                  <Printer className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Exportar relatório PDF</p>
              </TooltipContent>
            </Tooltip>

            <Button
              onClick={onAdd}
              className="bg-[#C9922A] hover:bg-[#b58324] text-white h-9 px-4 text-xs font-semibold rounded-md gap-1.5 shadow-sm"
            >
              <Plus className="h-4 w-4" /> Novo Protocolo
            </Button>
          </div>
        </div>

        {/* Linha 2: Abas / Filtros Rápidos (Pills Sóbrias e Elegantes) */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-[#E4E7EB]/80 dark:border-border/80">
          {/* Status Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#78818E] dark:text-muted-foreground mr-1">
              STATUS:
            </span>
            {statusPills.map((s) => {
              const isActive = status === s.value
              return (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => {
                    if (s.value === 'Acompanhar') {
                      setStatus(status === 'Acompanhar' ? 'Todos' : 'Acompanhar')
                    } else {
                      setStatus(s.value)
                    }
                  }}
                  className={cn(
                    'h-7 px-2.5 text-xs rounded-md transition-all font-medium cursor-pointer select-none inline-flex items-center gap-1.5 border',
                    isActive
                      ? s.isAcompanhar
                        ? 'bg-[#C77E1E] text-white border-[#C77E1E] font-semibold shadow-xs'
                        : 'bg-[#161920] dark:bg-[#D9A94A] text-white dark:text-[#161920] border-[#161920] dark:border-[#D9A94A] font-semibold shadow-xs'
                      : s.isAcompanhar
                        ? 'border-[#C77E1E]/40 text-[#C77E1E] bg-[#C77E1E]/5 hover:bg-[#C77E1E]/15'
                        : 'border-[#E4E7EB] dark:border-border text-[#78818E] dark:text-muted-foreground bg-white dark:bg-card hover:bg-[#F5F6F8] dark:hover:bg-muted/40 hover:text-[#252B34] dark:hover:text-foreground',
                  )}
                >
                  {s.label}
                </button>
              )
            })}
          </div>

          {/* Origem Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#78818E] dark:text-muted-foreground mr-1">
              ORIGEM:
            </span>
            {origemPills.map((o) => {
              const isActive = origem === o
              return (
                <button
                  key={o}
                  type="button"
                  onClick={() => setOrigem(origem === o ? 'Todos' : o)}
                  className={cn(
                    'h-7 px-2.5 text-xs rounded-md transition-all font-medium cursor-pointer select-none border',
                    isActive
                      ? 'bg-[#2B2927] text-[#F1C078] border-[#2B2927] font-semibold shadow-xs'
                      : 'border-[#E4E7EB] dark:border-border text-[#78818E] dark:text-muted-foreground bg-white dark:bg-card hover:bg-[#F5F6F8] dark:hover:bg-muted/40 hover:text-[#252B34] dark:hover:text-foreground',
                  )}
                >
                  {o}
                </button>
              )
            })}
          </div>

          {/* Parceiro Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#78818E] dark:text-muted-foreground mr-1">
              PARCEIRO:
            </span>
            {parceiroPills.map((p) => {
              const isActive = parceiro === p
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setParceiro && setParceiro(parceiro === p ? 'Todos' : p)}
                  className={cn(
                    'h-7 px-2.5 text-xs rounded-md transition-all font-medium cursor-pointer select-none border',
                    isActive
                      ? 'bg-[#161920] dark:bg-[#D9A94A] text-white dark:text-[#161920] border-[#161920] dark:border-[#D9A94A] font-semibold shadow-xs'
                      : 'border-[#E4E7EB] dark:border-border text-[#78818E] dark:text-muted-foreground bg-white dark:bg-card hover:bg-[#F5F6F8] dark:hover:bg-muted/40 hover:text-[#252B34] dark:hover:text-foreground',
                  )}
                >
                  {p}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Resumo Quantitativo da Filtragem Atual */}
      <div className="flex items-center justify-between text-xs text-[#78818E] dark:text-muted-foreground px-1">
        <span>
          Exibindo{' '}
          <strong className="text-[#252B34] dark:text-foreground font-semibold tabular-nums">
            {filtered.length}
          </strong>{' '}
          {filtered.length === 1 ? 'processo' : 'processos'}
        </span>
        {status === 'Acompanhar' && (
          <span className="text-[#C77E1E] font-semibold flex items-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5" />
            Filtrando apenas casos para acompanhamento
          </span>
        )}
      </div>

      {/* TABELA PRINCIPAL — Refinada, Elegante e com Rolagem Segura */}
      <div className="rounded-[10px] border border-[#E4E7EB] dark:border-border bg-white dark:bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-[#F5F6F8] dark:bg-muted/40 border-b border-[#E4E7EB] dark:border-border">
              <TableRow className="hover:bg-transparent">
                <TableHead className={`w-10 pl-4 ${headerClass}`}>#</TableHead>
                <TableHead className={headerClass}>NOME</TableHead>
                <TableHead className={headerClass}>BENEFÍCIO</TableHead>
                <TableHead className={headerClass}>RESP.</TableHead>
                <TableHead className={headerClass}>STATUS</TableHead>
                <TableHead className={headerClass}>ORIGEM</TableHead>
                <TableHead className={headerClass}>PARCEIRO</TableHead>
                <TableHead className={headerClass}>D. CONTRATO</TableHead>
                <TableHead className={headerClass}>D. CÁLCULO</TableHead>
                <TableHead className={headerClass}>D. PROTOCOLO</TableHead>
                <TableHead className={headerClass}>Nº AUTOS</TableHead>
                <TableHead className={`text-right ${headerClass}`}>VALOR</TableHead>
                <TableHead className={`text-right ${headerClass}`}>HONORÁRIOS</TableHead>
                <TableHead className={headerClass}>DECISÃO</TableHead>
                <TableHead className={`w-20 text-center pr-4 ${headerClass}`}>AÇÕES</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-[#E4E7EB] dark:divide-border">
              {grouped.map(([monthStr, items]) => {
                const projCount = items.filter(
                  (i) =>
                    [
                      'Protocolado Judicial',
                      'Protocolado Administrativo',
                      'Requerimento Adm.',
                      'Prov. Inicial',
                      'Calculado',
                    ].includes(i.status) && i.decisao !== 'Improcedente',
                ).length
                const label =
                  monthStr !== '0000-00'
                    ? format(parseISO(`${monthStr}-01T12:00:00Z`), 'MMMM yyyy', { locale: ptBR })
                    : 'SEM DATA'
                return (
                  <React.Fragment key={monthStr}>
                    <TableRow className="bg-[#F5F6F8]/80 dark:bg-muted/30 hover:bg-[#F5F6F8]/80 border-y border-[#E4E7EB] dark:border-border">
                      <TableCell
                        colSpan={15}
                        className="text-[10px] uppercase tracking-wider text-[#78818E] dark:text-muted-foreground py-2.5 px-4 font-semibold"
                      >
                        <span className="font-bold text-[#252B34] dark:text-foreground">
                          {label}
                        </span>{' '}
                        •{' '}
                        <span className="text-[#C9922A] font-semibold tabular-nums">
                          {projCount} {projCount === 1 ? 'caso na projeção' : 'casos na projeção'}
                        </span>
                      </TableCell>
                    </TableRow>
                    {items.map((item, idx) => (
                      <ProtocoloTableRow
                        key={item.id}
                        item={item}
                        index={idx + 1}
                        onEdit={() => onEdit(item)}
                        onDelete={() => onDelete(item)}
                      />
                    ))}
                  </React.Fragment>
                )
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={15}
                    className="text-center py-12 text-xs text-[#78818E] dark:text-muted-foreground"
                  >
                    Nenhum protocolo encontrado com os filtros selecionados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
