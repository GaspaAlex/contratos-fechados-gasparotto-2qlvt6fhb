import { useState, useMemo, useEffect, Fragment } from 'react'
import { Pericia } from '@/services/pericias'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, Edit2, Trash2, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export interface PericiasTableProps {
  data: Pericia[]
  onEdit: (p: Pericia) => void
  onDelete: (p: Pericia) => void
  onPrint?: () => void
  onFilteredDataChange?: (items: Pericia[]) => void
  onSearchChange?: (search: string) => void
  onStatusFilterChange?: (status: string) => void
}

export function PericiasTable({
  data,
  onEdit,
  onDelete,
  onPrint,
  onFilteredDataChange,
  onSearchChange,
  onStatusFilterChange,
}: PericiasTableProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('Todos')

  const filterOptions = useMemo(() => {
    const s = new Set(['Agendado', 'Pendente', 'Cancelado', 'Concluído'])
    data.forEach((d) => s.add(d.status))
    return Array.from(s)
  }, [data])

  const filtered = useMemo(() => {
    return data.filter((d) => {
      const matchSearch =
        d.nome.toLowerCase().includes(search.toLowerCase()) ||
        (d.nautos && d.nautos.includes(search))
      const matchStatus = statusFilter === 'Todos' || d.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [data, search, statusFilter])

  // Inform parent about filtered items whenever they change
  useEffect(() => {
    onFilteredDataChange?.(filtered)
  }, [filtered, onFilteredDataChange])

  const grouped = useMemo(() => {
    const groups: Record<string, Pericia[]> = {}
    filtered.forEach((d) => {
      const date = parseISO(d.data)
      const key = format(date, 'MMM yyyy', { locale: ptBR }).toUpperCase()
      if (!groups[key]) groups[key] = []
      groups[key].push(d)
    })
    Object.keys(groups).forEach((k) => {
      groups[k].sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())
    })
    const sortedGroups: Record<string, Pericia[]> = {}
    Object.keys(groups)
      .sort((a, b) => new Date(groups[a][0].data).getTime() - new Date(groups[b][0].data).getTime())
      .forEach((k) => {
        sortedGroups[k] = groups[k]
      })
    return sortedGroups
  }, [filtered])

  const renderStatus = (status: string) => {
    if (status === 'Agendado')
      return (
        <span className="px-2 py-0.5 rounded-full bg-[#3E8E5A]/10 text-[#3E8E5A] text-[11px] font-semibold uppercase tracking-wide border border-[#3E8E5A]/25 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30">
          {status}
        </span>
      )
    if (status === 'Pendente')
      return (
        <span className="px-2 py-0.5 rounded-full bg-[#C77E1E]/10 text-[#C77E1E] text-[11px] font-semibold uppercase tracking-wide border border-[#C77E1E]/25 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30">
          {status}
        </span>
      )
    if (status === 'Concluído')
      return (
        <span className="px-2 py-0.5 rounded-full bg-[#4A7FA5]/10 text-[#4A7FA5] text-[11px] font-semibold uppercase tracking-wide border border-[#4A7FA5]/25 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/30">
          {status}
        </span>
      )
    if (status === 'Cancelado')
      return (
        <span className="px-2 py-0.5 rounded-full bg-[#B4453C]/10 text-[#B4453C] text-[11px] font-semibold uppercase tracking-wide border border-[#B4453C]/25 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30">
          {status}
        </span>
      )
    return (
      <span className="px-2 py-0.5 rounded-full bg-[#F2F4F7] text-[#78818E] text-[11px] font-semibold uppercase tracking-wide border border-[#E4E7EB] dark:bg-muted dark:text-muted-foreground dark:border-border">
        {status}
      </span>
    )
  }

  const renderCompareceu = (comp?: string) => {
    if (!comp || comp === 'Não realizada')
      return <span className="text-muted-foreground font-medium">—</span>
    if (comp === 'Sim')
      return <span className="text-[#3E8E5A] font-semibold dark:text-emerald-400">{comp}</span>
    return <span className="text-[#B4453C] font-semibold dark:text-rose-400">{comp}</span>
  }

  const renderLaudo = (laudo?: string) => {
    if (!laudo || laudo === 'Aguardando')
      return <span className="text-muted-foreground font-medium">Aguardando</span>
    if (laudo === 'Favorável')
      return (
        <span className="px-2 py-0.5 rounded-full bg-[#3E8E5A]/10 text-[#3E8E5A] text-[11px] font-semibold uppercase tracking-wide border border-[#3E8E5A]/25 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30">
          {laudo}
        </span>
      )
    if (laudo === 'Parcialmente Favorável')
      return (
        <span className="px-2 py-0.5 rounded-full bg-[#C9922A]/10 text-[#C9922A] text-[11px] font-semibold uppercase tracking-wide border border-[#C9922A]/25 dark:bg-[#D9A94A]/15 dark:text-[#D9A94A] dark:border-[#D9A94A]/30">
          {laudo}
        </span>
      )
    if (laudo === 'Parcialmente Desfavorável')
      return (
        <span className="px-2 py-0.5 rounded-full bg-[#C77E1E]/10 text-[#C77E1E] text-[11px] font-semibold uppercase tracking-wide border border-[#C77E1E]/25 dark:bg-orange-500/15 dark:text-orange-400 dark:border-orange-500/30">
          {laudo}
        </span>
      )
    if (laudo === 'Desfavorável')
      return (
        <span className="px-2 py-0.5 rounded-full bg-[#B4453C]/10 text-[#B4453C] text-[11px] font-semibold uppercase tracking-wide border border-[#B4453C]/25 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30">
          {laudo}
        </span>
      )
    return <span className="text-muted-foreground font-medium">—</span>
  }

  return (
    <div className="space-y-3.5">
      {/* Barra de Filtros — Padrão Corporativo (Grafite Premium 2.1) */}
      <div className="flex flex-col xl:flex-row gap-3 items-stretch xl:items-center justify-between rounded-[10px] border border-[#E4E7EB] dark:border-border bg-white dark:bg-card p-3.5 sm:p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row gap-2.5 flex-1 sm:max-w-xl">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[#78818E] dark:text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou nº processo..."
              className="pl-9 h-9 text-xs border-[#E4E7EB] dark:border-border rounded-md focus-visible:ring-[#C9922A] bg-white dark:bg-card"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                onSearchChange?.(e.target.value)
              }}
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(val) => {
              setStatusFilter(val)
              onStatusFilterChange?.(val)
            }}
          >
            <SelectTrigger className="w-full sm:w-[170px] h-9 text-xs border-[#E4E7EB] dark:border-border bg-white dark:bg-card rounded-md focus:ring-[#C9922A]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos" className="text-xs">
                Todos os Status
              </SelectItem>
              {filterOptions.map((opt) => (
                <SelectItem key={opt} value={opt} className="text-xs">
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {onPrint && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={onPrint}
                className="h-9 w-9 shrink-0 border-[#E4E7EB] dark:border-border hover:bg-[#FAF8F2] dark:hover:bg-muted/40 text-[#78818E] hover:text-[#C9922A] rounded-md transition-colors"
              >
                <Printer className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Exportar relatório PDF</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Tabela de Listagem */}
      <div className="rounded-[10px] border border-[#E4E7EB] dark:border-border bg-white dark:bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="min-w-[900px]">
            <TableHeader>
              <TableRow className="bg-[#F7F8FA] dark:bg-muted/50 border-b border-[#E4E7EB] dark:border-border hover:bg-[#F7F8FA] dark:hover:bg-muted/50">
                <TableHead className="text-[10px] font-bold tracking-wider uppercase text-[#78818E] dark:text-muted-foreground py-3">
                  Cliente / Processo
                </TableHead>
                <TableHead className="text-[10px] font-bold tracking-wider uppercase text-[#78818E] dark:text-muted-foreground py-3">
                  Data / Hora
                </TableHead>
                <TableHead className="text-[10px] font-bold tracking-wider uppercase text-[#78818E] dark:text-muted-foreground py-3">
                  Perito / Endereço
                </TableHead>
                <TableHead className="text-[10px] font-bold tracking-wider uppercase text-[#78818E] dark:text-muted-foreground py-3">
                  Status
                </TableHead>
                <TableHead className="text-[10px] font-bold tracking-wider uppercase text-[#78818E] dark:text-muted-foreground py-3">
                  Compareceu
                </TableHead>
                <TableHead className="text-[10px] font-bold tracking-wider uppercase text-[#78818E] dark:text-muted-foreground py-3">
                  Laudo
                </TableHead>
                <TableHead className="w-[80px] text-right text-[10px] font-bold tracking-wider uppercase text-[#78818E] dark:text-muted-foreground py-3">
                  Ações
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(grouped).map(([groupName, items]) => (
                <Fragment key={groupName}>
                  <TableRow className="bg-[#FAF8F2] dark:bg-muted/40 hover:bg-[#FAF8F2] dark:hover:bg-muted/40 border-y border-[#E4E7EB]/80 dark:border-border/80">
                    <TableCell colSpan={7} className="py-2 px-4">
                      <div className="flex items-center gap-2.5">
                        <span className="text-[11px] font-bold text-[#C9922A] tracking-wider uppercase">
                          {groupName}
                        </span>
                        <span className="h-px flex-1 bg-[#C9922A]/20" />
                        <span className="text-[10px] font-semibold text-[#78818E] dark:text-muted-foreground tracking-wider uppercase tabular-nums">
                          {items.length} {items.length === 1 ? 'PERÍCIA' : 'PERÍCIAS'}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                  {items.map((item) => (
                    <TableRow
                      key={item.id}
                      className="group hover:bg-[#FAF8F2]/60 dark:hover:bg-muted/30 transition-colors"
                    >
                      <TableCell className="align-top py-3.5 px-4">
                        <div className="font-semibold text-sm text-[#252B34] dark:text-foreground">
                          {item.nome}
                        </div>
                        <div className="mt-1.5 bg-[#4A7FA5]/10 text-[#4A7FA5] dark:text-blue-400 font-mono text-xs px-2 py-1 rounded-md w-fit max-w-full break-all border border-[#4A7FA5]/15 dark:border-blue-500/20">
                          {item.nautos}
                        </div>
                      </TableCell>
                      <TableCell className="align-top py-3.5 px-4">
                        <div className="text-sm font-semibold text-[#252B34] dark:text-foreground tabular-nums">
                          {format(parseISO(item.data), 'dd/MM/yyyy')}
                        </div>
                        <div className="text-xs text-[#78818E] dark:text-muted-foreground mt-1 tabular-nums">
                          {item.horario || '—'}
                        </div>
                      </TableCell>
                      <TableCell className="align-top py-3.5 px-4">
                        <div className="text-sm font-medium text-[#252B34] dark:text-foreground">
                          {item.perito || '—'}
                        </div>
                        <div
                          className="text-xs text-[#78818E] dark:text-muted-foreground mt-1 truncate max-w-[220px]"
                          title={item.endereco}
                        >
                          {item.endereco || '—'}
                        </div>
                      </TableCell>
                      <TableCell className="align-top py-3.5 px-4">
                        {renderStatus(item.status)}
                      </TableCell>
                      <TableCell className="align-top py-3.5 px-4">
                        {renderCompareceu(item.compareceu)}
                      </TableCell>
                      <TableCell className="align-top py-3.5 px-4">
                        {renderLaudo(item.laudo)}
                      </TableCell>
                      <TableCell className="align-top py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onEdit(item)}
                            className="p-2 text-[#78818E] hover:bg-[#4A7FA5]/10 hover:text-[#4A7FA5] rounded-md transition-colors"
                            title="Editar perícia"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onDelete(item)}
                            className="p-2 text-[#B4453C] hover:bg-[#B4453C]/10 hover:text-[#9c3a32] rounded-md transition-colors dark:hover:text-rose-400"
                            title="Excluir perícia"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </Fragment>
              ))}
              {Object.keys(grouped).length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-12 text-[#78818E] dark:text-muted-foreground text-sm"
                  >
                    Nenhuma perícia encontrada para os filtros selecionados.
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
