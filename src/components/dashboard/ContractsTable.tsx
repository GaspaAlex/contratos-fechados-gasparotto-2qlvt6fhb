import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  CheckCircle2,
  FileText,
  Pencil,
  Trash2,
  Search,
  Plus,
  AlertTriangle,
  UserCheck,
  Printer,
  Copy,
  StickyNote,
  CalendarClock,
  Clock,
  Bell,
  ArrowRight,
} from 'lucide-react'
import { cn, removeAccents } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useToast } from '@/hooks/use-toast'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PartnershipsSummary } from './PartnershipsSummary'
import { ContractModal } from './ContractModal'
import { DeleteModal } from './DeleteModal'
import { RDocsDashboard } from './RDocsDashboard'
import { toYMD, getTiposAcao } from '@/services/contratos'
import { isArchived } from '@/lib/archivedStatuses'
import { getReviewStatus, isContractDueForReview, normalizeDateCivil } from '@/lib/date-utils'
import { printReport, PrintReportColumn } from '@/lib/print-report'

const BENEFICIOS_PADRAO = ['Aux. Acidente', 'Aposentadoria', 'BPC/LOAS', 'DER', 'Pensão por Morte']

const filters = [
  'Todos',
  'Ativos',
  'Revisar',
  'FUP',
  'R. Docs',
  'L. Cálculos',
  'Concluído',
  'Cadastrar Intranet',
  'Agendar Inicial',
  'Ag. Perícia',
  'Arquivados',
  'Parceria',
  'Campanha',
  'Particular',
  'Macohin',
]
const ATIVOS_STATUSES = [
  'R. Docs',
  'L. Cálculos',
  'Concluído',
  'Cadastrar Intranet',
  'Agendar Inicial',
  'Ag. Perícia',
  'Aguardando',
  'L. Análise',
]

const MONTHS = [
  'JANEIRO',
  'FEVEREIRO',
  'MARÇO',
  'ABRIL',
  'MAIO',
  'JUNHO',
  'JULHO',
  'AGOSTO',
  'SETEMBRO',
  'OUTUBRO',
  'NOVEMBRO',
  'DEZEMBRO',
]

export function ContractsTable({
  contratos = [],
  activeFilter,
  setActiveFilter,
  onMonthChange,
}: {
  contratos: any[]
  activeFilter: string
  setActiveFilter: (v: string) => void
  onMonthChange?: (month: string) => void
}) {
  const [search, setSearch] = useState('')
  const [tableYear, setTableYear] = useState<number | string>(new Date().getFullYear())
  const [tableMonth, setTableMonth] = useState<string>('Todos os meses')
  const [tableWeek, setTableWeek] = useState<string>('Todas as semanas')
  const [tableBeneficio, setTableBeneficio] = useState<string>('Todos os benefícios')
  const [tableResponsavel, setTableResponsavel] = useState<string>('Todos os responsáveis')
  const [tableCampanhaOrigem, setTableCampanhaOrigem] = useState<string>('Todas as campanhas')
  const [beneficiosList, setBeneficiosList] = useState<string[]>([])
  const { toast } = useToast()

  const copyToClipboard = (value: string, label: string) => {
    navigator.clipboard.writeText(value)
    toast({ description: label })
  }

  const responsaveisList = useMemo(() => {
    const resps = new Set<string>()
    contratos.forEach((c) => {
      if (c.responsavel && c.responsavel.trim()) {
        resps.add(c.responsavel.trim())
      }
    })
    return Array.from(resps).sort((a, b) => a.localeCompare(b))
  }, [contratos])

  React.useEffect(() => {
    const loadBeneficios = async () => {
      try {
        const bRes = await getTiposAcao()
        const loadedB = bRes.map((x: any) => x.nome)
        const contractBenefits = contratos.map((c) => c.beneficio).filter(Boolean)
        const combined = Array.from(
          new Set([...BENEFICIOS_PADRAO, ...loadedB, ...contractBenefits]),
        )
        setBeneficiosList(combined.sort((a, b) => a.localeCompare(b)))
      } catch (e) {
        console.error(e)
      }
    }
    loadBeneficios()
  }, [contratos])

  const availableYears = useMemo(() => {
    const years = new Set<number>()
    contratos.forEach((c) => {
      if (c.dcontrato) {
        const y = parseInt(c.dcontrato.split('-')[0], 10)
        if (!isNaN(y)) years.add(y)
      }
    })
    const sorted = Array.from(years).sort((a, b) => b - a)
    if (!sorted.includes(new Date().getFullYear())) {
      sorted.unshift(new Date().getFullYear())
    }
    return sorted
  }, [contratos])

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [selectedContract, setSelectedContract] = useState<any>(null)

  const handleEdit = (c: any) => {
    setSelectedContract(c)
    setIsModalOpen(true)
  }

  const handleDelete = (c: any) => {
    setSelectedContract(c)
    setIsDeleteModalOpen(true)
  }

  const handleAdd = () => {
    setSelectedContract(null)
    setIsModalOpen(true)
  }

  const currentWeeks = useMemo(() => {
    if (tableMonth === 'Todos os meses') return []
    const y = tableYear === 'Todos os anos' ? new Date().getFullYear() : (tableYear as number)
    const mIdx = MONTHS.indexOf(tableMonth)

    const firstDay = new Date(y, mIdx, 1)
    const lastDay = new Date(y, mIdx + 1, 0)

    const diffToMonday = firstDay.getDay() === 0 ? -6 : 1 - firstDay.getDay()
    const currentStart = new Date(y, mIdx, 1 + diffToMonday)

    const diffToSunday = lastDay.getDay() === 0 ? 0 : 7 - lastDay.getDay()
    const endDate = new Date(y, mIdx, lastDay.getDate() + diffToSunday)

    const weeks = []
    let weekNum = 1

    while (currentStart <= endDate) {
      const currentEnd = new Date(
        currentStart.getFullYear(),
        currentStart.getMonth(),
        currentStart.getDate() + 6,
      )

      const startStr = `${currentStart.getDate().toString().padStart(2, '0')}/${(currentStart.getMonth() + 1).toString().padStart(2, '0')}`
      const endStr = `${currentEnd.getDate().toString().padStart(2, '0')}/${(currentEnd.getMonth() + 1).toString().padStart(2, '0')}`

      weeks.push({
        id: weekNum.toString(),
        label: `Semana ${weekNum} (${startStr} - ${endStr})`,
        start: new Date(currentStart),
        end: new Date(currentEnd),
      })

      currentStart.setDate(currentStart.getDate() + 7)
      weekNum++
    }

    return weeks
  }, [tableMonth, tableYear])

  const filtered = useMemo(() => {
    let result = contratos.filter(
      (c) =>
        tableYear === 'Todos os anos' ||
        (c.dcontrato && c.dcontrato.startsWith(tableYear.toString())),
    )
    if (tableMonth !== 'Todos os meses') {
      const mIdx = MONTHS.indexOf(tableMonth)
      const mStr = (mIdx + 1).toString().padStart(2, '0')
      result = result.filter((c) => c.dcontrato.startsWith(`${tableYear}-${mStr}`))
    }

    if (tableWeek !== 'Todas as semanas') {
      const week = currentWeeks.find((w) => w.id === tableWeek)
      if (week) {
        result = result.filter((c) => {
          if (!c.dcontrato) return false
          const dateStr = c.dcontrato.split(' ')[0]
          if (!dateStr) return false
          const [yyyy, mm, dd] = dateStr.split('-').map(Number)
          if (!yyyy || !mm || !dd) return false
          const contractDate = new Date(yyyy, mm - 1, dd)
          return contractDate >= week.start && contractDate <= week.end
        })
      }
    }

    if (search.trim()) {
      const s = removeAccents(search.toLowerCase())
      result = result.filter(
        (c) =>
          removeAccents((c.nome || '').toLowerCase()).includes(s) ||
          removeAccents((c.fone || '').toLowerCase()).includes(s) ||
          removeAccents((c.beneficio || '').toLowerCase()).includes(s) ||
          removeAccents((c.responsavel || '').toLowerCase()).includes(s) ||
          removeAccents((c.parceiro_nome || '').toLowerCase()).includes(s),
      )
    }

    if (tableBeneficio !== 'Todos os benefícios') {
      result = result.filter(
        (c) => (c.beneficio || '').trim().toLowerCase() === tableBeneficio.trim().toLowerCase(),
      )
    }

    if (tableResponsavel !== 'Todos os responsáveis') {
      result = result.filter(
        (c) => (c.responsavel || '').trim().toLowerCase() === tableResponsavel.trim().toLowerCase(),
      )
    }

    if (tableCampanhaOrigem !== 'Todas as campanhas') {
      result = result.filter(
        (c) =>
          (c.campanha_origem || '').trim().toLowerCase() ===
          tableCampanhaOrigem.trim().toLowerCase(),
      )
    }

    if (activeFilter === 'Todos') {
      // no-op, include all
    } else if (activeFilter === 'Ativos') {
      result = result.filter(
        (c) =>
          ATIVOS_STATUSES.includes(c.status) ||
          (!isArchived(c.status) && Boolean(c.status && c.status.trim() !== '')),
      )
    } else if (activeFilter === 'Revisar') {
      result = result.filter((c) => isContractDueForReview(c, isArchived))
    } else if (activeFilter === 'FUP') {
      result = result.filter((c) => c.fup === true && !isArchived(c.status))
    } else if (activeFilter === 'R. Docs') {
      result = result.filter((c) => c.status === 'R. Docs')
    } else if (activeFilter === 'L. Cálculos') {
      result = result.filter((c) => c.status === 'L. Cálculos')
    } else if (activeFilter === 'Concluído') {
      result = result.filter((c) => c.status === 'Concluído')
    } else if (activeFilter === 'Cadastrar Intranet') {
      result = result.filter((c) => c.status === 'Cadastrar Intranet')
    } else if (activeFilter === 'Agendar Inicial') {
      result = result.filter((c) => c.status === 'Agendar Inicial')
    } else if (activeFilter === 'Ag. Perícia') {
      result = result.filter((c) => c.status === 'Ag. Perícia')
    } else if (activeFilter === 'Arquivados') {
      result = result.filter((c) => isArchived(c.status))
    } else if (activeFilter === 'Parceria') {
      result = result.filter((c) => c.parceria === true && !isArchived(c.status))
    } else if (activeFilter === 'Campanha') {
      result = result.filter((c) => c.origem === 'Campanha')
    } else if (activeFilter === 'Particular') {
      result = result.filter((c) => c.origem === 'Particular')
    } else if (activeFilter === 'Macohin') {
      result = result.filter((c) => c.origem === 'Macohin')
    }

    return result
  }, [
    contratos,
    activeFilter,
    search,
    tableYear,
    tableMonth,
    tableWeek,
    currentWeeks,
    tableBeneficio,
    tableResponsavel,
    tableCampanhaOrigem,
  ])

  const groupedFiltered = useMemo(() => {
    const groups = new Map<string, any[]>()
    filtered.forEach((c) => {
      const [y, mStr] = c.dcontrato.split(' ')[0].split('-')
      if (!y || !mStr) return
      const key = `${y}-${mStr}`
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(c)
    })

    const sortedKeys = Array.from(groups.keys()).sort((a, b) => a.localeCompare(b))

    return sortedKeys.map((k) => {
      const [y, mStr] = k.split('-')
      const mIdx = parseInt(mStr, 10) - 1
      const monthName = MONTHS[mIdx]
      const sortedItems = groups
        .get(k)!
        .sort((a, b) => new Date(a.dcontrato).getTime() - new Date(b.dcontrato).getTime())
      return {
        key: k,
        monthName,
        year: y,
        items: sortedItems,
      }
    })
  }, [filtered])

  const reviewStats = useMemo(() => {
    let todayCount = 0
    let pastCount = 0
    const pendingContracts: any[] = []

    contratos.forEach((c) => {
      if (!isContractDueForReview(c, isArchived)) return

      pendingContracts.push(c)
      const st = getReviewStatus(c.revisar_em)
      if (st === 'today') {
        todayCount++
      } else if (st === 'past') {
        pastCount++
      }
    })

    return {
      total: pendingContracts.length,
      today: todayCount,
      past: pastCount,
    }
  }, [contratos])

  const formatDate = (d: string) => {
    if (!d) return '-'
    const ymd = toYMD(d)
    const [y, m, day] = ymd.split('-')
    if (!day) return '-'
    return `${day}/${m}/${y}`
  }

  const getStatusBadgeHtml = (st?: string) => {
    if (!st) return '-'
    const archived = isArchived(st)
    if (st === 'Concluído') {
      return '<span class="badge badge-recebido">Concluído</span>'
    }
    if (st === 'Cadastrar Intranet') {
      return '<span class="badge badge-indigo">Cadastrar Intranet</span>'
    }
    if (st === 'Agendar Inicial') {
      return '<span class="badge badge-cyan">Agendar Inicial</span>'
    }
    if (st === 'R. Docs') {
      return '<span class="badge badge-gold">Falt. Docs</span>'
    }
    if (st === 'Aguardando') {
      return '<span class="badge badge-amber">Aguardando</span>'
    }
    if (st === 'L. Cálculos') {
      return '<span class="badge badge-aguardando">L. Cálculos</span>'
    }
    if (st === 'Ag. Perícia') {
      return '<span class="badge badge-purple">Ag. Perícia</span>'
    }
    if (archived) {
      return `<span class="badge badge-gray">${st}</span>`
    }
    return `<span class="badge badge-gold">${st}</span>`
  }

  const getOrigemBadgeHtml = (origem?: string) => {
    if (!origem) return '-'
    if (origem === 'Campanha') {
      return '<span class="badge badge-recebido">Campanha</span>'
    }
    if (origem === 'Particular') {
      return '<span class="badge badge-aguardando">Particular</span>'
    }
    if (origem === 'Macohin') {
      return '<span class="badge badge-purple">Macohin</span>'
    }
    return `<span class="badge badge-gray">${origem}</span>`
  }

  const handlePrintReport = () => {
    const activeFiltersList: string[] = []

    if (search.trim()) {
      activeFiltersList.push(`Busca: "${search.trim()}"`)
    }
    if (tableBeneficio !== 'Todos os benefícios') {
      activeFiltersList.push(`Benefício: ${tableBeneficio}`)
    }
    if (tableResponsavel !== 'Todos os responsáveis') {
      activeFiltersList.push(`Responsável: ${tableResponsavel}`)
    }
    if (tableCampanhaOrigem !== 'Todas as campanhas') {
      activeFiltersList.push(`Campanha de Origem: ${tableCampanhaOrigem}`)
    }
    if (tableMonth !== 'Todos os meses') {
      activeFiltersList.push(`Mês: ${tableMonth}`)
    }
    if (tableYear !== 'Todos os anos') {
      activeFiltersList.push(`Ano: ${tableYear}`)
    }
    if (tableWeek !== 'Todas as semanas') {
      const weekLabel = currentWeeks.find((w) => w.id === tableWeek)?.label || tableWeek
      activeFiltersList.push(`Semana: ${weekLabel}`)
    }
    if (activeFilter !== 'Todos') {
      const filterLabel =
        activeFilter === 'Revisar'
          ? 'Revisar'
          : activeFilter === 'R. Docs'
            ? 'Falt. Docs'
            : activeFilter
      activeFiltersList.push(`Filtro: ${filterLabel}`)
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
        header: 'Telefone',
        accessor: (item) => item.fone || '-',
        align: 'left',
        width: '95px',
      },
      {
        header: 'Benefício',
        accessor: (item) => item.beneficio || '-',
        align: 'left',
      },
      {
        header: 'Responsável',
        accessor: (item) => item.responsavel || '-',
        align: 'left',
      },
      {
        header: 'Status',
        accessor: (item) => getStatusBadgeHtml(item.status),
        align: 'center',
      },
      {
        header: 'Origem',
        accessor: (item) => getOrigemBadgeHtml(item.origem),
        align: 'center',
      },
      {
        header: 'Camp. Origem',
        accessor: (item) => (item.campanha_origem && item.campanha_origem.trim()) || '—',
        align: 'center',
      },
      {
        header: 'D. Contrato',
        accessor: (item) => formatDate(item.dcontrato),
        align: 'center',
        width: '80px',
      },
      {
        header: 'D. Cálculo',
        accessor: (item) => formatDate(item.dcalculo),
        align: 'center',
        width: '80px',
      },
      {
        header: 'D. Protocolo',
        accessor: (item) => formatDate(item.dprotocolo),
        align: 'center',
        width: '80px',
      },
      {
        header: 'Acompanhamento',
        accessor: (item) => {
          const parts: string[] = []
          const reviewCivil = normalizeDateCivil(item.revisar_em)
          if (reviewCivil) {
            const dateStr = formatDate(reviewCivil)
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
      title: 'RELATÓRIO DE CONTRATOS FECHADOS',
      subtitle: 'ADVOCACIA GASPAROTTO',
      filters: activeFiltersList,
      columns,
      data: filtered,
      orientation: 'landscape',
      totalLabel: 'Total de registros',
    })
  }

  return (
    <>
      {activeFilter === 'Parceria' && <PartnershipsSummary contratos={filtered} />}

      {/* ALERTA DE REVISÃO — Harmonizado com Protocolo (Paleta #C77E1E e #B4453C) */}
      {reviewStats.total > 0 && (
        <div
          role="alert"
          aria-live="polite"
          className="mt-6 relative overflow-hidden rounded-[10px] border border-[#C77E1E]/30 bg-[#C77E1E]/[0.05] dark:bg-[#C77E1E]/10 p-4 sm:p-5 shadow-sm animate-fade-in-up"
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
                    {reviewStats.total === 1
                      ? '1 contrato precisa de acompanhamento'
                      : `${reviewStats.total} contratos precisam de acompanhamento`}
                  </span>
                </div>
                <div className="text-xs text-[#78818E] dark:text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  {reviewStats.today > 0 && (
                    <span className="font-semibold text-[#C77E1E] dark:text-amber-400">
                      {reviewStats.today === 1
                        ? '1 para revisar hoje'
                        : `${reviewStats.today} para revisar hoje`}
                    </span>
                  )}
                  {reviewStats.today > 0 && reviewStats.past > 0 && (
                    <span className="text-[#A0A7B5]">&bull;</span>
                  )}
                  {reviewStats.past > 0 && (
                    <span className="font-semibold text-[#B4453C] dark:text-red-400">
                      {reviewStats.past === 1
                        ? '1 revisão atrasada'
                        : `${reviewStats.past} revisões atrasadas`}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <Button
              type="button"
              onClick={() => setActiveFilter(activeFilter === 'Revisar' ? 'Todos' : 'Revisar')}
              variant="outline"
              size="sm"
              className={cn(
                'self-start sm:self-center shrink-0 h-9 font-semibold text-xs gap-1.5 transition-colors border shadow-xs',
                activeFilter === 'Revisar'
                  ? 'bg-[#161920] border-[#161920] text-white hover:bg-[#202532] hover:text-white dark:bg-[#D9A94A] dark:text-[#161920]'
                  : 'border-[#C77E1E]/40 bg-white dark:bg-card text-[#C77E1E] hover:bg-[#C77E1E]/10 hover:text-[#C77E1E]',
              )}
            >
              {activeFilter === 'Revisar' ? 'Ver todos os contratos' : 'Ver casos para revisão'}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* CARD REGISTRO DE CONTRATOS — Toolbar e Filtros Harmonizados */}
      <div
        className="mt-6 space-y-4 rounded-[10px] border border-[#E4E7EB] dark:border-border bg-white dark:bg-card p-4 sm:p-5 shadow-sm animate-fade-in-up"
        style={{ animationDelay: '200ms' }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 gap-2 border-b border-[#E4E7EB]/70 dark:border-border/70">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-[#C9922A]" />
            <h2 className="text-base sm:text-lg font-bold text-[#252B34] dark:text-foreground">
              Registro de Contratos
            </h2>
          </div>
          <span className="text-xs text-[#78818E] dark:text-muted-foreground tabular-nums">
            Exibindo{' '}
            <strong className="text-[#252B34] dark:text-foreground">{filtered.length}</strong> de{' '}
            {contratos.length} contratos
          </span>
        </div>

        {/* Linha 1: Controles e Ações */}
        <div className="flex flex-col lg:flex-row gap-2.5 items-stretch lg:items-center justify-between">
          <div className="flex flex-wrap gap-2 items-center flex-1">
            {/* Busca */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#78818E]" />
              <Input
                placeholder="Buscar cliente, benefício, resp..."
                className="pl-9 h-9 text-xs border-[#E4E7EB] dark:border-border bg-white dark:bg-card rounded-md focus-visible:ring-[#C9922A]"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Select Benefício */}
            <Select value={tableBeneficio} onValueChange={setTableBeneficio}>
              <SelectTrigger className="w-full sm:w-44 h-9 text-xs border-[#E4E7EB] dark:border-border bg-white dark:bg-card rounded-md focus:ring-[#C9922A]">
                <SelectValue placeholder="Todos os benefícios" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos os benefícios" className="text-xs">
                  Todos os benefícios
                </SelectItem>
                {beneficiosList.map((b) => (
                  <SelectItem key={b} value={b} className="text-xs">
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Select Responsável */}
            <Select value={tableResponsavel} onValueChange={setTableResponsavel}>
              <SelectTrigger className="w-full sm:w-44 h-9 text-xs border-[#E4E7EB] dark:border-border bg-white dark:bg-card rounded-md focus:ring-[#C9922A]">
                <SelectValue placeholder="Todos os responsáveis" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos os responsáveis" className="text-xs">
                  Todos os responsáveis
                </SelectItem>
                {responsaveisList.map((r) => (
                  <SelectItem key={r} value={r} className="text-xs">
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Select Campanha de Origem */}
            <Select value={tableCampanhaOrigem} onValueChange={setTableCampanhaOrigem}>
              <SelectTrigger className="w-full sm:w-48 h-9 text-xs border-[#E4E7EB] dark:border-border bg-white dark:bg-card rounded-md focus:ring-[#C9922A]">
                <SelectValue placeholder="Todas as campanhas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todas as campanhas" className="text-xs">
                  Todas as campanhas
                </SelectItem>
                <SelectItem value="Aux. Acidente META" className="text-xs">
                  Aux. Acidente META (Campanha)
                </SelectItem>
                <SelectItem value="Aux. Acidente Google" className="text-xs">
                  Aux. Acidente Google (Campanha)
                </SelectItem>
                <SelectItem value="DER Google" className="text-xs">
                  DER Google (Campanha)
                </SelectItem>
                <SelectItem value="DER Canal" className="text-xs">
                  DER Canal (Campanha)
                </SelectItem>
                <SelectItem value="Baú de Ouro" className="text-xs">
                  Baú de Ouro (Macohin)
                </SelectItem>
                <SelectItem value="Diligências" className="text-xs">
                  Diligências (Macohin)
                </SelectItem>
                <SelectItem value="Indicação" className="text-xs">
                  Indicação (Macohin)
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Select Mês */}
            <Select
              value={tableMonth}
              onValueChange={(v) => {
                setTableMonth(v)
                setTableWeek('Todas as semanas')
                onMonthChange?.(v)
              }}
            >
              <SelectTrigger className="w-full sm:w-36 h-9 text-xs border-[#E4E7EB] dark:border-border bg-white dark:bg-card rounded-md focus:ring-[#C9922A]">
                <SelectValue placeholder="Todos os meses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos os meses" className="text-xs">
                  Todos os meses
                </SelectItem>
                {MONTHS.map((m) => (
                  <SelectItem key={m} value={m} className="text-xs">
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Select Semana */}
            <Select
              value={tableWeek}
              onValueChange={setTableWeek}
              disabled={tableMonth === 'Todos os meses'}
            >
              <SelectTrigger className="w-full sm:w-52 h-9 text-xs border-[#E4E7EB] dark:border-border bg-white dark:bg-card rounded-md focus:ring-[#C9922A] disabled:opacity-50">
                <SelectValue placeholder="Todas as semanas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todas as semanas" className="text-xs">
                  Todas as semanas
                </SelectItem>
                {currentWeeks.map((w) => (
                  <SelectItem key={w.id} value={w.id} className="text-xs">
                    {w.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Select Ano */}
            <Select
              value={tableYear.toString()}
              onValueChange={(v) => {
                setTableYear(v === 'Todos os anos' ? v : parseInt(v, 10))
                setTableWeek('Todas as semanas')
              }}
            >
              <SelectTrigger className="w-full sm:w-32 h-9 text-xs border-[#E4E7EB] dark:border-border bg-white dark:bg-card rounded-md focus:ring-[#C9922A]">
                <SelectValue placeholder="Todos os anos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos os anos" className="text-xs">
                  Todos os anos
                </SelectItem>
                {availableYears.map((y) => (
                  <SelectItem key={y} value={y.toString()} className="text-xs">
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
              onClick={handleAdd}
              className="bg-[#C9922A] hover:bg-[#b58324] text-white h-9 px-4 text-xs font-semibold rounded-md gap-1.5 shadow-sm"
            >
              <Plus className="h-4 w-4" /> Adicionar Contrato
            </Button>
          </div>
        </div>

        {/* Linha 2: Pills Sóbrias Corporativas (Harmonizadas com Protocolo) */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#E4E7EB]/80 dark:border-border/80">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[#78818E] dark:text-muted-foreground mr-1">
            FILTROS:
          </span>
          {(() => {
            const reviewDueCount = reviewStats.total

            return filters.map((status) => {
              const label =
                status === 'Revisar'
                  ? `Revisar (${reviewDueCount})`
                  : status === 'R. Docs'
                    ? 'Falt. Docs'
                    : status

              const isActive = activeFilter === status
              const isRevisar = status === 'Revisar'

              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => setActiveFilter(status)}
                  className={cn(
                    'h-7 px-2.5 text-xs rounded-md transition-all font-medium cursor-pointer select-none inline-flex items-center gap-1.5 border',
                    isActive
                      ? isRevisar
                        ? 'bg-[#C77E1E] text-white border-[#C77E1E] font-semibold shadow-xs'
                        : 'bg-[#161920] dark:bg-[#D9A94A] text-white dark:text-[#161920] border-[#161920] dark:border-[#D9A94A] font-semibold shadow-xs'
                      : isRevisar
                        ? 'border-[#C77E1E]/40 text-[#C77E1E] bg-[#C77E1E]/5 hover:bg-[#C77E1E]/15'
                        : 'border-[#E4E7EB] dark:border-border text-[#78818E] dark:text-muted-foreground bg-white dark:bg-card hover:bg-[#F5F6F8] dark:hover:bg-muted/40 hover:text-[#252B34] dark:hover:text-foreground',
                  )}
                >
                  {label}
                </button>
              )
            })
          })()}
        </div>

        {/* TABELA DE CONTRATOS — Padrão Corporativo Contemporâneo */}
        <div className="rounded-[10px] border border-[#E4E7EB] dark:border-border overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-[#F5F6F8] dark:bg-muted/40 border-b border-[#E4E7EB] dark:border-border">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[10px] uppercase tracking-wider text-[#78818E] dark:text-muted-foreground font-semibold whitespace-nowrap pl-4">
                    NOME
                  </TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-[#78818E] dark:text-muted-foreground font-semibold whitespace-nowrap">
                    FONE
                  </TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-[#78818E] dark:text-muted-foreground font-semibold whitespace-nowrap">
                    BENEFÍCIO
                  </TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-[#78818E] dark:text-muted-foreground font-semibold whitespace-nowrap">
                    RESP.
                  </TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-[#78818E] dark:text-muted-foreground font-semibold whitespace-nowrap">
                    FUP
                  </TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-[#78818E] dark:text-muted-foreground font-semibold whitespace-nowrap">
                    STATUS
                  </TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-[#78818E] dark:text-muted-foreground font-semibold whitespace-nowrap">
                    ORIGEM
                  </TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-[#78818E] dark:text-muted-foreground font-semibold whitespace-nowrap">
                    CAMP. ORIGEM
                  </TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-[#78818E] dark:text-muted-foreground font-semibold whitespace-nowrap">
                    D. CONTRATO
                  </TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-[#78818E] dark:text-muted-foreground font-semibold whitespace-nowrap">
                    D. CÁLCULO
                  </TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-[#78818E] dark:text-muted-foreground font-semibold whitespace-nowrap">
                    D. PROTOCOLO
                  </TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-[#78818E] dark:text-muted-foreground font-semibold whitespace-nowrap">
                    PARCERIA
                  </TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-[#78818E] dark:text-muted-foreground font-semibold whitespace-nowrap text-right pr-4">
                    AÇÕES
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-[#E4E7EB] dark:divide-border">
                {groupedFiltered.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={13}
                      className="text-center py-12 text-xs text-[#78818E] dark:text-muted-foreground"
                    >
                      Nenhum contrato encontrado para os filtros selecionados.
                    </TableCell>
                  </TableRow>
                ) : (
                  groupedFiltered.map((group) => {
                    return (
                      <React.Fragment key={group.key}>
                        <TableRow className="bg-[#F5F6F8]/80 dark:bg-muted/30 hover:bg-[#F5F6F8]/80 border-y border-[#E4E7EB] dark:border-border">
                          <TableCell
                            colSpan={13}
                            className="py-2.5 px-4 font-semibold text-[10px] tracking-wider uppercase text-[#78818E] dark:text-muted-foreground"
                          >
                            <span className="font-bold text-[#252B34] dark:text-foreground">
                              {group.monthName} {group.year}
                            </span>{' '}
                            •{' '}
                            <span className="text-[#C9922A] font-semibold tabular-nums">
                              {group.items.length}{' '}
                              {group.items.length === 1
                                ? 'contrato contabilizado'
                                : 'contratos contabilizados'}
                            </span>
                          </TableCell>
                        </TableRow>
                        {group.items.map((contract: any) => {
                          const contractArchived = isArchived(contract.status)
                          const isRDocs = contract.status === 'R. Docs'
                          const isAguardando = contract.status === 'Aguardando'
                          const reviewStatus = getReviewStatus(contract.revisar_em)
                          const reviewCivil = normalizeDateCivil(contract.revisar_em)
                          return (
                            <TableRow
                              key={contract.id}
                              className={cn(
                                'group transition-colors h-11 relative',
                                contractArchived &&
                                  'text-[#78818E] line-through opacity-65 hover:bg-[#F5F6F8]/50 dark:hover:bg-muted/20',
                                !contractArchived &&
                                  isRDocs &&
                                  'bg-[#B4453C]/[0.05] hover:bg-[#B4453C]/[0.09] dark:bg-[#B4453C]/10',
                                !contractArchived &&
                                  !isRDocs &&
                                  isAguardando &&
                                  'bg-[#C77E1E]/[0.05] hover:bg-[#C77E1E]/[0.09] dark:bg-[#C77E1E]/10',
                                !contractArchived &&
                                  !isRDocs &&
                                  !isAguardando &&
                                  'hover:bg-[#F5F6F8]/70 dark:hover:bg-muted/30',
                              )}
                            >
                              <TableCell className="font-semibold text-xs whitespace-nowrap pl-4 text-[#252B34] dark:text-foreground relative">
                                {!contractArchived && isRDocs && (
                                  <span
                                    className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#B4453C]"
                                    aria-hidden="true"
                                  />
                                )}
                                {!contractArchived && !isRDocs && isAguardando && (
                                  <span
                                    className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#C77E1E]"
                                    aria-hidden="true"
                                  />
                                )}
                                <div className="flex items-center gap-1.5">
                                  <span className="truncate max-w-[200px]" title={contract.nome}>
                                    {contract.nome}
                                  </span>
                                  {contract.observacoes && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <StickyNote className="h-3.5 w-3.5 text-[#C9922A] cursor-help shrink-0" />
                                      </TooltipTrigger>
                                      <TooltipContent className="max-w-xs md:max-w-sm">
                                        <p className="whitespace-pre-line text-xs">
                                          {contract.observacoes}
                                        </p>
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                  {reviewStatus && reviewCivil && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="inline-flex items-center cursor-help shrink-0">
                                          <CalendarClock
                                            className={cn(
                                              'h-3.5 w-3.5',
                                              reviewStatus === 'past' && 'text-[#B4453C]',
                                              reviewStatus === 'today' &&
                                                'text-[#C77E1E] animate-pulse',
                                              reviewStatus === 'future' &&
                                                'text-[#78818E]/80 hover:text-[#C9922A]',
                                            )}
                                          />
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p className="text-xs">
                                          Revisar em: {formatDate(reviewCivil)}
                                          {reviewStatus === 'past' && ' (Atrasada)'}
                                          {reviewStatus === 'today' && ' (Hoje)'}
                                        </p>
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                  {contract.representante && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <UserCheck className="h-3.5 w-3.5 text-[#C9922A] cursor-help shrink-0" />
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p className="text-xs">
                                          Representante:{' '}
                                          {contract.representante_nome || 'Não informado'}
                                        </p>
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 shrink-0 text-[#78818E] hover:text-[#252B34] hover:bg-[#F5F6F8] dark:hover:bg-muted/50 rounded"
                                    onClick={() => copyToClipboard(contract.nome, 'Nome copiado!')}
                                    title="Copiar nome"
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </div>
                              </TableCell>
                              <TableCell className="text-[#78818E] dark:text-muted-foreground whitespace-nowrap text-xs tabular-nums">
                                {contract.fone ? (
                                  <span className="inline-flex items-center gap-1">
                                    {contract.fone}
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 shrink-0 text-[#78818E] hover:text-[#252B34] hover:bg-[#F5F6F8] dark:hover:bg-muted/50 rounded"
                                      onClick={() =>
                                        copyToClipboard(contract.fone, 'Telefone copiado!')
                                      }
                                      title="Copiar telefone"
                                    >
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                  </span>
                                ) : (
                                  <span className="text-[#A0A7B5]">—</span>
                                )}
                              </TableCell>
                              <TableCell className="whitespace-nowrap text-xs text-[#78818E] dark:text-muted-foreground">
                                {contract.beneficio || '—'}
                              </TableCell>
                              <TableCell className="whitespace-nowrap text-xs text-[#78818E] dark:text-muted-foreground font-medium">
                                {contract.responsavel || '—'}
                              </TableCell>
                              <TableCell className="whitespace-nowrap text-xs">
                                {contract.fup ? (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold text-[#C9922A] bg-[#C9922A]/10 border border-[#C9922A]/25">
                                    FUP
                                  </span>
                                ) : (
                                  <span className="text-[#A0A7B5]">—</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {contract.status === 'Concluído' ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#3E8E5A]/10 text-[#3E8E5A] border border-[#3E8E5A]/25 whitespace-nowrap">
                                    <CheckCircle2 className="h-3 w-3" /> Concluído
                                  </span>
                                ) : contract.status === 'Cadastrar Intranet' ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#4A7FA5]/10 text-[#4A7FA5] border border-[#4A7FA5]/25 whitespace-nowrap">
                                    <Clock className="h-3 w-3" /> Cadastrar Intranet
                                  </span>
                                ) : contract.status === 'Agendar Inicial' ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#7C6F93]/10 text-[#7C6F93] border border-[#7C6F93]/25 whitespace-nowrap">
                                    <CalendarClock className="h-3 w-3" /> Agendar Inicial
                                  </span>
                                ) : contract.status === 'R. Docs' ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#B4453C]/10 text-[#B4453C] border border-[#B4453C]/25 whitespace-nowrap">
                                    <FileText className="h-3 w-3" /> Faltando Documentos
                                  </span>
                                ) : contract.status === 'Aguardando' ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#C77E1E]/10 text-[#C77E1E] border border-[#C77E1E]/25 whitespace-nowrap">
                                    <Clock className="h-3 w-3" /> Aguardando
                                  </span>
                                ) : contractArchived ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#F5F6F8] text-[#78818E] border border-[#E4E7EB] dark:bg-muted dark:text-muted-foreground dark:border-border whitespace-nowrap">
                                    <AlertTriangle className="h-3 w-3" /> {contract.status}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border border-[#C9922A]/30 text-[#C9922A] bg-[#C9922A]/10 whitespace-nowrap">
                                    {contract.status || '—'}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                {contract.origem === 'Campanha' ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#3E8E5A]/10 text-[#3E8E5A] border border-[#3E8E5A]/25 whitespace-nowrap">
                                    Campanha
                                  </span>
                                ) : contract.origem === 'Particular' ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#4A7FA5]/10 text-[#4A7FA5] border border-[#4A7FA5]/25 whitespace-nowrap">
                                    Particular
                                  </span>
                                ) : contract.origem === 'Macohin' ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#8A56AC]/10 text-[#8A56AC] border border-[#8A56AC]/25 whitespace-nowrap">
                                    Macohin
                                  </span>
                                ) : (
                                  <span className="text-xs text-[#A0A7B5]">—</span>
                                )}
                              </TableCell>
                              <TableCell className="whitespace-nowrap text-xs text-[#78818E] dark:text-muted-foreground">
                                {contract.campanha_origem && contract.campanha_origem.trim() ? (
                                  <span>{contract.campanha_origem}</span>
                                ) : (
                                  <span className="text-[#A0A7B5]">—</span>
                                )}
                              </TableCell>
                              <TableCell
                                className={cn(
                                  'whitespace-nowrap text-xs tabular-nums',
                                  contractArchived
                                    ? 'text-[#78818E]'
                                    : 'text-[#78818E] dark:text-muted-foreground',
                                )}
                              >
                                {formatDate(contract.dcontrato)}
                              </TableCell>
                              <TableCell
                                className={cn(
                                  'whitespace-nowrap text-xs tabular-nums',
                                  contractArchived
                                    ? 'text-[#78818E]'
                                    : 'text-[#78818E] dark:text-muted-foreground',
                                )}
                              >
                                {formatDate(contract.dcalculo)}
                              </TableCell>
                              <TableCell
                                className={cn(
                                  'whitespace-nowrap text-xs tabular-nums',
                                  contractArchived
                                    ? 'text-[#78818E]'
                                    : 'text-[#78818E] dark:text-muted-foreground',
                                )}
                              >
                                {formatDate(contract.dprotocolo)}
                              </TableCell>
                              <TableCell className="whitespace-nowrap text-xs">
                                {contract.parceria && contract.parceiro_nome ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#C9922A]/15 text-[#C9922A] border border-[#C9922A]/30">
                                    {contract.parceiro_nome}
                                  </span>
                                ) : (
                                  <span className="text-[#A0A7B5]">—</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right pr-4">
                                <div className="flex justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-[#78818E] hover:text-[#252B34] hover:bg-[#F5F6F8] dark:hover:bg-muted/50 rounded-md transition-colors"
                                    onClick={() => handleEdit(contract)}
                                    title="Editar contrato"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-[#B4453C] hover:text-[#B4453C] hover:bg-[#B4453C]/10 rounded-md transition-colors"
                                    onClick={() => handleDelete(contract)}
                                    title="Excluir contrato"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </React.Fragment>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <ContractModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        contract={selectedContract}
      />
      <DeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        contract={selectedContract}
      />
    </>
  )
}
