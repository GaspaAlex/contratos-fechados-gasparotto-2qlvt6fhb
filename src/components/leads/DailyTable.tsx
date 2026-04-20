import React, { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Pencil, Trash2, Search } from 'lucide-react'
import {
  aggregateLeads,
  calculateLeadRow,
  colorConvGeral,
  colorConvQualif,
  colorDesq,
  colorFechFup,
  fmtPct,
  useDraggableScroll,
  MONTHS,
} from '@/lib/leads-calc'
import { cn } from '@/lib/utils'

export function DailyTable({ leads, onEdit, onAdd, onDelete }: any) {
  const { ref, onMouseDown, onMouseLeave, onMouseUp, onMouseMove, style } = useDraggableScroll()
  const [searchTerm, setSearchTerm] = useState('')
  const [monthFilter, setMonthFilter] = useState('Todos')

  let filtered = leads || []
  if (monthFilter !== 'Todos') {
    filtered = filtered.filter((l: any) => l.mes.startsWith(monthFilter))
  }
  if (searchTerm) {
    const s = searchTerm.toLowerCase()
    filtered = filtered.filter(
      (l: any) => l.observacoes?.toLowerCase().includes(s) || l.mes.toLowerCase().includes(s),
    )
  }

  const groups: Record<string, any[]> = {}
  filtered.forEach((l: any) => {
    const m = l.mes
    if (!groups[m]) groups[m] = []
    groups[m].push(l)
  })

  const sortedMonths = Object.keys(groups).sort((a, b) => {
    const m1 = MONTHS.indexOf(a.split(' ')[0])
    const m2 = MONTHS.indexOf(b.split(' ')[0])
    return m1 - m2
  })

  const renderRow = (row: any, isTotal: boolean = false, groupLeads?: any[]) => {
    const calc = isTotal ? calculateLeadRow(aggregateLeads(groupLeads!)) : calculateLeadRow(row)
    const baseClass = isTotal
      ? 'bg-muted/80 font-bold hover:bg-muted/80'
      : 'hover:bg-muted/50 transition-colors bg-background'
    const c = (v: any) => v

    return (
      <TableRow key={isTotal ? 'total' : row.id} className={baseClass}>
        <TableCell className="text-center font-bold border-r">
          {isTotal ? 'TOTAL MÊS' : row.dia}
        </TableCell>
        <TableCell className="text-center bg-blue-50/30">{c(calc.google)}</TableCell>
        <TableCell className="text-center bg-blue-50/30">{c(calc.meta_ads)}</TableCell>
        <TableCell className="text-center bg-blue-50/30">{c(calc.particular)}</TableCell>
        <TableCell className="text-center font-bold bg-blue-100/40 border-r">
          {c(calc.total_leads)}
        </TableCell>

        <TableCell className="text-center bg-amber-50/30 border-r font-medium">
          {c(calc.em_qualif)}
        </TableCell>

        <TableCell className="text-center bg-red-50/30">{c(calc.sem_qualidade)}</TableCell>
        <TableCell className="text-center bg-red-50/30">{c(calc.aposentado)}</TableCell>
        <TableCell className="text-center bg-red-50/30">{c(calc.contribuinte_carne)}</TableCell>
        <TableCell className="text-center bg-red-50/30">{c(calc.outros)}</TableCell>
        <TableCell className="text-center font-bold bg-red-100/40 border-r">
          {c(calc.total_desq)}
        </TableCell>

        <TableCell className="text-center font-bold bg-green-100/40 border-r text-green-800">
          {c(calc.qualificados)}
        </TableCell>

        <TableCell className="text-center bg-amber-50/30">{c(calc.fechado_direto)}</TableCell>
        <TableCell className="text-center bg-amber-50/30">{c(calc.fechado_fup)}</TableCell>
        <TableCell className="text-center bg-amber-50/30">{c(calc.fup_ativo)}</TableCell>
        <TableCell className="text-center font-bold bg-amber-100/40 border-r">
          {c(calc.total_fechados)}
        </TableCell>

        <TableCell
          className={cn('text-center font-bold bg-purple-50/30', colorConvGeral(calc.conv_geral))}
        >
          {fmtPct(calc.conv_geral)}
        </TableCell>
        <TableCell
          className={cn('text-center font-bold bg-purple-50/30', colorConvQualif(calc.conv_qualif))}
        >
          {fmtPct(calc.conv_qualif)}
        </TableCell>
        <TableCell
          className={cn('text-center font-bold bg-purple-50/30', colorDesq(calc.desqual_pct))}
        >
          {fmtPct(calc.desqual_pct)}
        </TableCell>
        <TableCell
          className={cn(
            'text-center font-bold bg-purple-50/30 border-r',
            colorFechFup(calc.pct_fech_via_fup),
          )}
        >
          {fmtPct(calc.pct_fech_via_fup)}
        </TableCell>

        <TableCell
          className="text-center bg-muted/10 truncate max-w-[150px]"
          title={calc.observacoes}
        >
          {calc.observacoes}
        </TableCell>

        <TableCell className="text-center whitespace-nowrap bg-muted/10">
          {!isTotal ? (
            <div className="flex items-center justify-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-blue-600 hover:bg-blue-50"
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit(row)
                }}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-red-600 hover:bg-red-50"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(row)
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : null}
        </TableCell>
      </TableRow>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar registros..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-background h-9"
            />
          </div>
          <Select value={monthFilter} onValueChange={setMonthFilter}>
            <SelectTrigger className="w-full sm:w-[180px] bg-background h-9">
              <SelectValue placeholder="Filtrar por Mês" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Todos os meses</SelectItem>
              {MONTHS.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={onAdd}
          className="bg-[#C9922A] hover:bg-[#a67721] text-white shadow-sm h-9"
        >
          <Plus className="mr-2 h-4 w-4" /> Registrar Dia
        </Button>
      </div>

      <div className="border rounded-lg shadow-sm bg-card overflow-hidden">
        <div
          ref={ref}
          onMouseDown={onMouseDown}
          onMouseLeave={onMouseLeave}
          onMouseUp={onMouseUp}
          onMouseMove={onMouseMove}
          style={style}
          className="overflow-x-auto select-none"
        >
          <Table className="w-[2400px] text-xs relative">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-center border-r bg-muted/30 w-16">BASE</TableHead>
                <TableHead
                  colSpan={4}
                  className="text-center border-r bg-blue-100/50 text-blue-800 font-bold"
                >
                  LEADS RECEBIDOS
                </TableHead>
                <TableHead
                  colSpan={1}
                  className="text-center border-r bg-amber-100/50 text-amber-800 font-bold"
                >
                  EM QUALIF.
                </TableHead>
                <TableHead
                  colSpan={5}
                  className="text-center border-r bg-red-100/50 text-red-800 font-bold"
                >
                  DESQUALIFICADOS
                </TableHead>
                <TableHead
                  colSpan={1}
                  className="text-center border-r bg-green-100/50 text-green-800 font-bold"
                >
                  QUALIFICADOS
                </TableHead>
                <TableHead
                  colSpan={4}
                  className="text-center border-r bg-amber-100/50 text-amber-800 font-bold"
                >
                  CONTRATOS
                </TableHead>
                <TableHead
                  colSpan={6}
                  className="text-center bg-purple-100/50 text-purple-800 font-bold"
                >
                  INDICADORES
                </TableHead>
              </TableRow>
              <TableRow className="bg-muted/10 hover:bg-muted/10">
                <TableHead className="text-center border-r w-16">Dia</TableHead>

                <TableHead className="text-center w-20">Google Ads</TableHead>
                <TableHead className="text-center w-20">Meta Ads</TableHead>
                <TableHead className="text-center w-20">Partic.</TableHead>
                <TableHead className="text-center border-r w-20 font-bold">Total</TableHead>

                <TableHead className="text-center border-r w-24">Em Qualif</TableHead>

                <TableHead className="text-center w-24">S/ Qual Seg.</TableHead>
                <TableHead className="text-center w-24">Aposentado</TableHead>
                <TableHead className="text-center w-24">Carnê</TableHead>
                <TableHead className="text-center w-20">Outros</TableHead>
                <TableHead className="text-center border-r w-24 font-bold">Total Desq.</TableHead>

                <TableHead className="text-center border-r w-24 font-bold">Qualificados</TableHead>

                <TableHead className="text-center w-24">Direto</TableHead>
                <TableHead className="text-center w-24">FUP</TableHead>
                <TableHead className="text-center w-24">FUP Ativo</TableHead>
                <TableHead className="text-center border-r w-24 font-bold">Total</TableHead>

                <TableHead className="text-center w-24">Conv. Geral %</TableHead>
                <TableHead className="text-center w-24">Conv. Qualif. %</TableHead>
                <TableHead className="text-center w-24">Desqual. %</TableHead>
                <TableHead className="text-center border-r w-24">Fech. FUP %</TableHead>

                <TableHead className="text-center w-32">Obs.</TableHead>
                <TableHead className="text-center w-24">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedMonths.map((m) => (
                <React.Fragment key={m}>
                  <TableRow className="bg-muted/60 hover:bg-muted/60">
                    <TableCell
                      colSpan={25}
                      className="py-2 px-4 font-bold text-muted-foreground uppercase text-sm tracking-wider"
                    >
                      {m}
                    </TableCell>
                  </TableRow>
                  {groups[m].map((row: any) => renderRow(row, false))}
                  {groups[m].length > 0 && renderRow(null, true, groups[m])}
                </React.Fragment>
              ))}
              {sortedMonths.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={25}
                    className="text-center py-12 text-muted-foreground bg-muted/5"
                  >
                    Nenhum registro encontrado.
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
