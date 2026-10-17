import { useState, useEffect, useMemo, useCallback } from 'react'
import { getPericias, type Pericia } from '@/services/pericias'
import { useRealtime } from '@/hooks/use-realtime'
import { Dashboard } from './pericias/Dashboard'
import { Summary } from './pericias/Summary'
import { PericiasTable } from './pericias/Table'
import { FormModal } from './pericias/FormModal'
import { DeleteModal } from './pericias/DeleteModal'
import { Button } from '@/components/ui/button'
import { Plus, Printer } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { printReport, PrintReportColumn } from '@/lib/print-report'

export default function Pericias() {
  const [data, setData] = useState<Pericia[]>([])
  const [year, setYear] = useState(new Date().getFullYear())
  const [filteredPericias, setFilteredPericias] = useState<Pericia[]>([])
  const [tableSearch, setTableSearch] = useState('')
  const [tableStatus, setTableStatus] = useState('Todos')
  const [formModalOpen, setFormModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Pericia | null>(null)
  const [deletingItem, setDeletingItem] = useState<Pericia | null>(null)

  const loadData = async () => {
    try {
      const items = await getPericias()
      setData(items)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    loadData()
  }, [])
  useRealtime('pericias', loadData)

  const years = useMemo(() => {
    const allYears = data.map((d) => new Date(d.data).getFullYear())
    const unique = Array.from(new Set(allYears))
    const current = new Date().getFullYear()
    if (!unique.includes(current)) unique.push(current)
    return unique.sort((a, b) => b - a)
  }, [data])

  const yearData = useMemo(
    () => data.filter((d) => new Date(d.data).getFullYear() === year),
    [data, year],
  )

  const handleFilteredDataChange = useCallback((items: Pericia[]) => {
    setFilteredPericias(items)
  }, [])

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
    if (st === 'Agendado') return '<span class="badge badge-recebido">Agendado</span>'
    if (st === 'Pendente') return '<span class="badge badge-amber">Pendente</span>'
    if (st === 'Concluído') return '<span class="badge badge-aguardando">Concluído</span>'
    if (st === 'Cancelado') return '<span class="badge badge-red">Cancelado</span>'
    return `<span class="badge badge-gray">${st}</span>`
  }

  const getCompareceuBadgeHtml = (comp?: string) => {
    if (!comp || comp === 'Não realizada') {
      return '<span style="color: #9ca3af;">—</span>'
    }
    if (comp === 'Sim') {
      return '<strong style="color: #166534;">Sim</strong>'
    }
    return '<strong style="color: #b91c1c;">Não</strong>'
  }

  const getLaudoBadgeHtml = (laudo?: string) => {
    if (!laudo || laudo === 'Aguardando') {
      return '<span style="color: #9ca3af;">Aguardando</span>'
    }
    if (laudo === 'Favorável') {
      return '<span class="badge badge-recebido">Favorável</span>'
    }
    if (laudo === 'Parcialmente Favorável') {
      return '<span class="badge badge-gold">Parcialmente Favorável</span>'
    }
    if (laudo === 'Parcialmente Desfavorável') {
      return '<span class="badge badge-orange">Parcialmente Desfavorável</span>'
    }
    if (laudo === 'Desfavorável') {
      return '<span class="badge badge-red">Desfavorável</span>'
    }
    return laudo
  }

  const handlePrintReport = useCallback(() => {
    const recordsToPrint =
      filteredPericias.length > 0 || yearData.length === 0 ? filteredPericias : yearData

    const activeFiltersList: string[] = []
    activeFiltersList.push(`Ano: ${year}`)
    if (tableSearch.trim()) {
      activeFiltersList.push(`Busca: "${tableSearch.trim()}"`)
    }
    if (tableStatus && tableStatus !== 'Todos') {
      activeFiltersList.push(`Status: ${tableStatus}`)
    }

    const columns: PrintReportColumn<Pericia>[] = [
      {
        header: '#',
        accessor: (_item, idx) => String(idx + 1),
        align: 'center',
        width: '32px',
      },
      {
        header: 'Cliente / Processo',
        accessor: (item) => {
          const nome = item.nome || '-'
          const autos = item.nautos
            ? `<div style="font-family: monospace; font-size: 9.5px; color: #1d4ed8; margin-top: 2px;">${item.nautos}</div>`
            : ''
          return `<strong>${nome}</strong>${autos}`
        },
        align: 'left',
      },
      {
        header: 'Data / Hora',
        accessor: (item) => {
          const d = formatDateBR(item.data)
          const h = item.horario
            ? `<div style="color: #6b7280; font-size: 9.5px;">${item.horario}</div>`
            : ''
          return `<strong>${d}</strong>${h}`
        },
        align: 'center',
        width: '100px',
      },
      {
        header: 'Perito',
        accessor: (item) => item.perito || '-',
        align: 'left',
      },
      {
        header: 'Endereço / Local',
        accessor: (item) => item.endereco || '-',
        align: 'left',
      },
      {
        header: 'Status',
        accessor: (item) => getStatusBadgeHtml(item.status),
        align: 'center',
        width: '100px',
      },
      {
        header: 'Compareceu',
        accessor: (item) => getCompareceuBadgeHtml(item.compareceu),
        align: 'center',
        width: '90px',
      },
      {
        header: 'Laudo',
        accessor: (item) => getLaudoBadgeHtml(item.laudo),
        align: 'center',
        width: '140px',
      },
    ]

    printReport({
      title: 'Relatório de Perícias',
      subtitle: 'Advocacia Gasparotto',
      filters: activeFiltersList,
      columns,
      data: recordsToPrint,
      orientation: 'landscape',
      totalLabel: 'Total de perícias',
    })
  }, [filteredPericias, yearData, year, tableSearch, tableStatus])

  return (
    <div className="animate-fade-in-up space-y-6 pb-10">
      {/* Cabeçalho Corporativo Harmonizado (Grafite Premium 2.1) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center text-[10px] font-bold tracking-[1.5px] uppercase text-[#C9922A] bg-[#C9922A]/10 px-2 py-0.5 rounded">
              GESTÃO DE CASOS
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#252B34] dark:text-foreground">
            Perícias
          </h1>
          <p className="text-sm text-[#78818E] dark:text-muted-foreground">
            Acompanhamento de perícias ativas, agendamentos e taxas de laudo.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start lg:self-center">
          <Select value={year.toString()} onValueChange={(val) => setYear(Number(val))}>
            <SelectTrigger className="w-[125px] h-9 text-xs border-[#E4E7EB] dark:border-border bg-white dark:bg-card rounded-md focus:ring-[#C9922A]">
              <SelectValue placeholder="Ano" />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={y.toString()} className="text-xs">
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
                className="h-9 w-9 shrink-0 border-[#E4E7EB] dark:border-border hover:bg-[#FAF8F2] dark:hover:bg-muted/40 text-[#78818E] hover:text-[#C9922A] rounded-md transition-colors"
              >
                <Printer className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Exportar relatório PDF</p>
            </TooltipContent>
          </Tooltip>

          <Button
            onClick={() => {
              setEditingItem(null)
              setFormModalOpen(true)
            }}
            className="h-9 px-4 text-xs font-semibold bg-[#C9922A] hover:bg-[#b58324] text-white whitespace-nowrap rounded-md shadow-sm transition-colors"
          >
            <Plus className="mr-1.5 h-4 w-4" /> Nova Perícia
          </Button>
        </div>
      </div>

      <Dashboard data={yearData} year={year} />
      <Summary data={yearData} />
      <PericiasTable
        data={yearData}
        onEdit={(p) => {
          setEditingItem(p)
          setFormModalOpen(true)
        }}
        onDelete={(p) => setDeletingItem(p)}
        onPrint={handlePrintReport}
        onFilteredDataChange={handleFilteredDataChange}
        onSearchChange={setTableSearch}
        onStatusFilterChange={setTableStatus}
      />

      <FormModal open={formModalOpen} onOpenChange={setFormModalOpen} item={editingItem} />
      <DeleteModal item={deletingItem} onClose={() => setDeletingItem(null)} />
    </div>
  )
}
