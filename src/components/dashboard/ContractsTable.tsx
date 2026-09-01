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

const BENEFICIOS_PADRAO = ['Aux. Acidente', 'Aposentadoria', 'BPC/LOAS', 'DER', 'Pensão por Morte']

const filters = [
  'Todos',
  'Ativos',
  'FUP',
  'R. Docs',
  'L. Cálculos',
  'OK',
  'Ag. Perícia',
  'Arquivados',
  'Parceria',
  'Campanha',
  'Particular',
]
const ARCHIVED_STATUSES = ['Sem Qualidade de Segurado', 'Tem Advogado', 'Litispendência']
const ATIVOS_STATUSES = ['R. Docs', 'L. Cálculos', 'OK', 'Ag. Perícia']

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

    if (activeFilter === 'Todos') {
      // no-op, include all
    } else if (activeFilter === 'Ativos') {
      result = result.filter(
        (c) =>
          ATIVOS_STATUSES.includes(c.status) ||
          (!ARCHIVED_STATUSES.includes(c.status) && c.status !== ''),
      )
    } else if (activeFilter === 'FUP') {
      result = result.filter((c) => c.fup === true && !ARCHIVED_STATUSES.includes(c.status))
    } else if (activeFilter === 'R. Docs') {
      result = result.filter((c) => c.status === 'R. Docs')
    } else if (activeFilter === 'L. Cálculos') {
      result = result.filter((c) => c.status === 'L. Cálculos')
    } else if (activeFilter === 'OK') {
      result = result.filter((c) => c.status === 'OK')
    } else if (activeFilter === 'Ag. Perícia') {
      result = result.filter((c) => c.status === 'Ag. Perícia')
    } else if (activeFilter === 'Arquivados') {
      result = result.filter((c) => ARCHIVED_STATUSES.includes(c.status))
    } else if (activeFilter === 'Parceria') {
      result = result.filter((c) => c.parceria === true && !ARCHIVED_STATUSES.includes(c.status))
    } else if (activeFilter === 'Campanha') {
      result = result.filter((c) => c.origem === 'Campanha')
    } else if (activeFilter === 'Particular') {
      result = result.filter((c) => c.origem === 'Particular')
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

  const formatDate = (d: string) => {
    if (!d) return '-'
    const ymd = toYMD(d)
    const [y, m, day] = ymd.split('-')
    if (!day) return '-'
    return `${day}/${m}/${y}`
  }

  const handlePrintReport = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const filtersText = [
      activeFilter !== 'Todos' ? `Status: ${activeFilter}` : '',
      search ? `Busca: "${search}"` : '',
      tableBeneficio !== 'Todos os benefícios' ? `Benefício: ${tableBeneficio}` : '',
      tableResponsavel !== 'Todos os responsáveis' ? `Responsável: ${tableResponsavel}` : '',
      tableMonth !== 'Todos os meses' ? `Mês: ${tableMonth}` : '',
      tableYear !== 'Todos os anos' ? `Ano: ${tableYear}` : '',
      tableWeek !== 'Todas as semanas'
        ? `Semana: ${currentWeeks.find((w) => w.id === tableWeek)?.label || tableWeek}`
        : '',
    ]
      .filter(Boolean)
      .join(' | ')

    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Relatório de Contratos Fechados</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
        h1 { text-align: center; color: #111; margin-bottom: 5px; font-size: 20px; text-transform: uppercase; }
        .filters { text-align: center; font-size: 12px; color: #555; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px solid #eee; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
        th { background-color: #f4f4f4; font-weight: bold; text-transform: uppercase; }
        tr:nth-child(even) { background-color: #fafafa; }
        .footer { margin-top: 20px; font-size: 12px; font-weight: bold; border-top: 1px solid #eee; padding-top: 10px; text-align: right; }
        @media print {
            body { margin: 0; }
            @page { margin: 1cm; }
        }
    </style>
</head>
<body>
    <h1>Advocacia Gasparotto &mdash; Contratos Fechados</h1>
    <div class="filters">${filtersText ? `<strong>Filtros aplicados:</strong> ${filtersText}` : 'Nenhum filtro aplicado (mostrando todos os registros)'}</div>
    
    <table>
        <thead>
            <tr>
                <th>Nome</th>
                <th>Telefone</th>
                <th>Benefício</th>
                <th>Responsável</th>
                <th>Status</th>
                <th>Origem</th>
                <th>D. Contrato</th>
            </tr>
        </thead>
        <tbody>
            ${filtered
              .map((c) => {
                const dateStr = c.dcontrato ? c.dcontrato.split(' ')[0] : ''
                const formattedDate = dateStr
                  ? `${dateStr.split('-')[2]}/${dateStr.split('-')[1]}/${dateStr.split('-')[0]}`
                  : '-'

                return `
                <tr>
                    <td>${c.nome || '-'}</td>
                    <td>${c.fone || '-'}</td>
                    <td>${c.beneficio || '-'}</td>
                    <td>${c.responsavel || '-'}</td>
                    <td>${c.status || '-'}</td>
                    <td>${c.origem || '-'}</td>
                    <td>${formattedDate}</td>
                </tr>
            `
              })
              .join('')}
        </tbody>
    </table>

    <div class="footer">
        Total de registros: ${filtered.length}
    </div>

    <script>
        window.onload = () => {
            window.print();
        };
    </script>
</body>
</html>
    `

    printWindow.document.write(html)
    printWindow.document.close()
  }

  return (
    <>
      {activeFilter === 'Parceria' && <PartnershipsSummary contratos={filtered} />}

      <Card
        className="mt-8 border-border/60 shadow-sm animate-fade-in-up"
        style={{ animationDelay: '200ms' }}
      >
        <CardHeader>
          <CardTitle className="text-xl font-bold">Registro de Contratos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col xl:flex-row justify-between gap-4 mb-6">
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 w-full xl:flex-1">
              <div className="relative w-full sm:w-80 shrink-0">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar cliente, benefício, resp..."
                  className="pl-9 bg-background focus-visible:ring-amber-500"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={tableBeneficio} onValueChange={setTableBeneficio}>
                <SelectTrigger className="w-full sm:w-48 shrink-0 border-[#C9922A]/30 focus:ring-[#C9922A]">
                  <SelectValue placeholder="Todos os benefícios" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos os benefícios">Todos os benefícios</SelectItem>
                  {beneficiosList.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={tableResponsavel} onValueChange={setTableResponsavel}>
                <SelectTrigger className="w-full sm:w-48 shrink-0 border-[#C9922A]/30 focus:ring-[#C9922A]">
                  <SelectValue placeholder="Todos os responsáveis" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos os responsáveis">Todos os responsáveis</SelectItem>
                  {responsaveisList.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={tableMonth}
                onValueChange={(v) => {
                  setTableMonth(v)
                  setTableWeek('Todas as semanas')
                  onMonthChange?.(v)
                }}
              >
                <SelectTrigger className="w-full sm:w-40 shrink-0 border-[#C9922A]/30 focus:ring-[#C9922A]">
                  <SelectValue placeholder="Todos os meses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos os meses">Todos os meses</SelectItem>
                  {MONTHS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={tableWeek}
                onValueChange={setTableWeek}
                disabled={tableMonth === 'Todos os meses'}
              >
                <SelectTrigger className="w-full sm:w-56 shrink-0 border-[#C9922A]/30 focus:ring-[#C9922A] disabled:opacity-50">
                  <SelectValue placeholder="Todas as semanas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todas as semanas">Todas as semanas</SelectItem>
                  {currentWeeks.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={tableYear.toString()}
                onValueChange={(v) => {
                  setTableYear(v === 'Todos os anos' ? v : parseInt(v, 10))
                  setTableWeek('Todas as semanas')
                }}
              >
                <SelectTrigger className="w-full sm:w-32 shrink-0 border-[#C9922A]/30 focus:ring-[#C9922A]">
                  <SelectValue placeholder="Todos os anos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos os anos">Todos os anos</SelectItem>
                  {availableYears.map((y) => (
                    <SelectItem key={y} value={y.toString()}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handlePrintReport}
                    className="shrink-0 border-[#C9922A]/30 text-[#C9922A] hover:bg-[#C9922A]/10 hover:text-[#C9922A]"
                  >
                    <Printer className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Exportar relatório PDF</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Button
              onClick={handleAdd}
              className="w-full xl:w-auto bg-[#C9922A] hover:bg-[#C9922A]/90 text-white font-semibold shadow-sm shrink-0"
            >
              <Plus className="mr-2 h-4 w-4" /> Adicionar
            </Button>
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            {filters.map((status) => (
              <Button
                key={status}
                onClick={() => setActiveFilter(status)}
                variant={activeFilter === status ? 'default' : 'outline'}
                size="sm"
                className={cn(
                  'rounded-full font-medium transition-colors',
                  activeFilter === status
                    ? 'bg-[#C9922A]/15 text-[#C9922A] border border-[#C9922A] hover:bg-[#C9922A]/25 shadow-none font-bold'
                    : 'text-muted-foreground',
                )}
              >
                {status === 'R. Docs' ? 'Falt. Docs' : status}
              </Button>
            ))}
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="whitespace-nowrap">NOME</TableHead>
                  <TableHead className="whitespace-nowrap">FONE</TableHead>
                  <TableHead className="whitespace-nowrap">BENEFÍCIO</TableHead>
                  <TableHead className="whitespace-nowrap">RESP.</TableHead>
                  <TableHead className="whitespace-nowrap">FUP</TableHead>
                  <TableHead className="whitespace-nowrap">STATUS</TableHead>
                  <TableHead className="whitespace-nowrap">ORIGEM</TableHead>
                  <TableHead className="whitespace-nowrap">D. CONTRATO</TableHead>
                  <TableHead className="whitespace-nowrap">D. CÁLCULO</TableHead>
                  <TableHead className="whitespace-nowrap">D. PROTOCOLO</TableHead>
                  <TableHead className="whitespace-nowrap">PARCERIA</TableHead>
                  <TableHead className="whitespace-nowrap text-right">AÇÕES</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupedFiltered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={13} className="text-center py-8 text-muted-foreground">
                      Nenhum contrato encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  groupedFiltered.map((group) => {
                    return (
                      <React.Fragment key={group.key}>
                        <TableRow className="bg-secondary/50 hover:bg-secondary/50">
                          <TableCell
                            colSpan={13}
                            className="py-2 px-4 font-bold text-xs text-muted-foreground tracking-wider uppercase"
                          >
                            {group.monthName} {group.year} &mdash; {group.items.length} CONTRATOS
                            FECHADOS CONTABILIZADOS
                          </TableCell>
                        </TableRow>
                        {group.items.map((contract: any) => {
                          const isArchived = ARCHIVED_STATUSES.includes(contract.status)
                          const isRDocs = contract.status === 'R. Docs'
                          return (
                            <TableRow
                              key={contract.id}
                              className={cn(
                                'transition-colors',
                                isArchived &&
                                  'text-muted-foreground line-through opacity-70 hover:bg-muted/30',
                                !isArchived && isRDocs && 'bg-[#E84040]/10 hover:bg-[#E84040]/20',
                                !isArchived && !isRDocs && 'hover:bg-muted/30',
                              )}
                            >
                              <TableCell className="font-semibold">
                                <div className="flex items-center gap-2">
                                  {contract.nome}
                                  {contract.representante && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <UserCheck className="h-4 w-4 text-[#C9922A] cursor-help shrink-0" />
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>
                                          Representante:{' '}
                                          {contract.representante_nome || 'Não informado'}
                                        </p>
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 shrink-0"
                                    onClick={() => copyToClipboard(contract.nome, 'Nome copiado!')}
                                  >
                                    <Copy className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </TableCell>
                              <TableCell className="text-muted-foreground whitespace-nowrap">
                                {contract.fone ? (
                                  <span className="inline-flex items-center gap-1.5">
                                    {contract.fone}
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 shrink-0"
                                      onClick={() =>
                                        copyToClipboard(contract.fone, 'Telefone copiado!')
                                      }
                                    >
                                      <Copy className="h-3.5 w-3.5" />
                                    </Button>
                                  </span>
                                ) : (
                                  '-'
                                )}
                              </TableCell>
                              <TableCell className="whitespace-nowrap">
                                {contract.beneficio || '-'}
                              </TableCell>
                              <TableCell>{contract.responsavel || '-'}</TableCell>
                              <TableCell>
                                {contract.fup ? (
                                  <span className="font-bold text-[#C9922A]">FUP</span>
                                ) : (
                                  '-'
                                )}
                              </TableCell>
                              <TableCell>
                                {contract.status === 'OK' ? (
                                  <Badge
                                    variant="outline"
                                    className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 gap-1.5 whitespace-nowrap px-2 py-0.5"
                                  >
                                    <CheckCircle2 className="h-3 w-3" /> OK
                                  </Badge>
                                ) : contract.status === 'R. Docs' ? (
                                  <Badge
                                    variant="outline"
                                    className="bg-[#C9922A]/10 text-[#C9922A] border-[#C9922A]/30 gap-1.5 whitespace-nowrap px-2 py-0.5"
                                  >
                                    <FileText className="h-3 w-3" /> Faltando Documentos
                                  </Badge>
                                ) : ARCHIVED_STATUSES.includes(contract.status) ? (
                                  <Badge
                                    variant="outline"
                                    className="bg-stone-100 text-stone-600 border-stone-300 dark:bg-stone-900/50 dark:text-stone-400 dark:border-stone-800 gap-1.5 whitespace-nowrap px-2 py-0.5"
                                  >
                                    <AlertTriangle className="h-3 w-3" /> {contract.status}
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className="whitespace-nowrap px-2 py-0.5 border-[#C9922A]/30 text-[#C9922A] bg-[#C9922A]/10 font-bold"
                                  >
                                    {contract.status || '-'}
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                {contract.origem === 'Campanha' ? (
                                  <span className="inline-flex items-center rounded-full px-2 py-0.5 font-semibold text-[#52B86E] bg-[#52B86E]/[0.13] text-xs whitespace-nowrap">
                                    Campanha
                                  </span>
                                ) : contract.origem === 'Particular' ? (
                                  <span className="inline-flex items-center rounded-full px-2 py-0.5 font-semibold text-[#5A9FD4] bg-[#5A9FD4]/[0.13] text-xs whitespace-nowrap">
                                    Particular
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-muted-foreground bg-gray-500/[0.08] text-[10px] italic whitespace-nowrap">
                                    Não classificado
                                  </span>
                                )}
                              </TableCell>
                              <TableCell
                                className={cn(
                                  'whitespace-nowrap',
                                  isArchived ? 'text-muted-foreground' : 'text-foreground',
                                )}
                              >
                                {formatDate(contract.dcontrato)}
                              </TableCell>
                              <TableCell
                                className={cn(
                                  'whitespace-nowrap',
                                  isArchived ? 'text-muted-foreground' : 'text-foreground',
                                )}
                              >
                                {formatDate(contract.dcalculo)}
                              </TableCell>
                              <TableCell
                                className={cn(
                                  'whitespace-nowrap',
                                  isArchived ? 'text-muted-foreground' : 'text-foreground',
                                )}
                              >
                                {formatDate(contract.dprotocolo)}
                              </TableCell>
                              <TableCell className="text-muted-foreground whitespace-nowrap">
                                {contract.parceria && contract.parceiro_nome ? (
                                  <Badge
                                    variant="secondary"
                                    className="bg-[#C9922A]/15 text-[#C9922A] font-bold border border-[#C9922A]/30"
                                  >
                                    {contract.parceiro_nome}
                                  </Badge>
                                ) : (
                                  '-'
                                )}
                              </TableCell>
                              <TableCell className="text-right no-underline">
                                <div className="flex justify-end gap-1 no-underline">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 hover:bg-[#C9922A]/10 hover:text-[#C9922A] no-underline"
                                    onClick={() => handleEdit(contract)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:bg-destructive/10 no-underline"
                                    onClick={() => handleDelete(contract)}
                                  >
                                    <Trash2 className="h-4 w-4" />
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
        </CardContent>
      </Card>

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
