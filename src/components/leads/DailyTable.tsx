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
  filterLeadsByPeriod,
} from '@/lib/leads-calc'
import { cn } from '@/lib/utils'

export function DailyTable({
  leads,
  contratos,
  month,
  day,
  startMonth,
  endMonth,
  onEdit,
  onAdd,
  onDelete,
}: any) {
  const { ref, onMouseDown, onMouseLeave, onMouseUp, onMouseMove, style } = useDraggableScroll()
  const [searchTerm, setSearchTerm] = useState('')

  let filtered = leads || []
  filtered = filterLeadsByPeriod(filtered, month, day, startMonth, endMonth)

  if (searchTerm) {
    const s = searchTerm.toLowerCase().trim()
    filtered = filtered.filter(
      (l: any) =>
        (l?.observacoes || '').toLowerCase().includes(s) ||
        (l?.mes || '').toLowerCase().includes(s),
    )
  }

  const groups: Record<string, any[]> = {}
  filtered.forEach((l: any) => {
    if (!l) return
    const m = l.mes || ''
    if (!groups[m]) groups[m] = []
    groups[m].push(l)
  })

  const sortedMonths = Object.keys(groups).sort((a, b) => {
    const m1 = MONTHS.indexOf((a || '').split(' ')[0])
    const m2 = MONTHS.indexOf((b || '').split(' ')[0])
    return m1 - m2
  })

  const renderRow = (row: any, isTotal: boolean = false, groupLeads?: any[]) => {
    const calc = isTotal ? calculateLeadRow(aggregateLeads(groupLeads!)) : calculateLeadRow(row)
    const baseClass = isTotal
      ? 'bg-[#FAF8F2] dark:bg-[#C9922A]/10 font-bold hover:bg-[#FAF8F2] dark:hover:bg-[#C9922A]/15 border-t-2 border-[#C9922A]/30 dark:border-[#C9922A]/50'
      : 'hover:bg-[#F5F6F8]/70 dark:hover:bg-muted/40 transition-colors bg-white dark:bg-card'
    const c = (v: any) => v

    const getContratosStats = (leadsList: any[], isTotalGroup: boolean) => {
      let aux = 0
      let der = 0
      let ben = 0
      let direto = 0
      let fup = 0

      if (isTotalGroup && leadsList.length > 0) {
        const rowMonthStr = leadsList[0]?.mes
        const monthContratos = (contratos || []).filter((ct: any) => {
          if (!ct || ct.origem !== 'Campanha') return false
          if (!ct.dcontrato) return false
          const d = new Date(ct.dcontrato)
          if (isNaN(d.getTime())) return false
          const m = MONTHS[d.getUTCMonth()] + ' ' + d.getUTCFullYear()
          return m === rowMonthStr
        })
        aux = monthContratos.filter((ct: any) => ct?.beneficio === 'Aux. Acidente').length
        der = monthContratos.filter((ct: any) => ct?.beneficio === 'DER').length
        ben = monthContratos.filter((ct: any) => ct?.beneficio === 'Ben. Análise').length
        direto = monthContratos.filter((ct: any) => ct?.fup === false).length
        fup = monthContratos.filter((ct: any) => ct?.fup === true).length
        return { aux, der, ben, direto, fup, total: aux + der + ben }
      }

      leadsList.forEach((l) => {
        if (!l) return
        const rowMonthStr = l.mes
        const rowDay = l.dia
        const dayContratos = (contratos || []).filter((ct: any) => {
          if (!ct || ct.origem !== 'Campanha') return false
          if (!ct.dcontrato) return false
          const d = new Date(ct.dcontrato)
          if (isNaN(d.getTime())) return false
          const m = MONTHS[d.getUTCMonth()] + ' ' + d.getUTCFullYear()
          return m === rowMonthStr && d.getUTCDate() === rowDay
        })
        aux += dayContratos.filter((ct: any) => ct?.beneficio === 'Aux. Acidente').length
        der += dayContratos.filter((ct: any) => ct?.beneficio === 'DER').length
        ben += dayContratos.filter((ct: any) => ct?.beneficio === 'Ben. Análise').length
        direto += dayContratos.filter((ct: any) => ct?.fup === false).length
        fup += dayContratos.filter((ct: any) => ct?.fup === true).length
      })
      return { aux, der, ben, direto, fup, total: aux + der + ben }
    }

    const cStats = getContratosStats(isTotal ? groupLeads! : [row], isTotal)

    return (
      <TableRow
        key={isTotal ? 'total' : row.id}
        className={cn(baseClass, 'border-b border-[#E4E7EB] dark:border-border')}
      >
        <TableCell
          className={cn(
            'text-center font-bold border-r border-[#E4E7EB] dark:border-border tabular-nums py-2.5',
            isTotal ? 'text-[#C9922A] uppercase text-xs' : 'text-[#252B34] dark:text-foreground',
          )}
        >
          {isTotal ? 'TOTAL MÊS' : row.dia}
        </TableCell>
        <TableCell className="text-center bg-[#4A7FA5]/5 dark:bg-[#4A7FA5]/10 tabular-nums py-2.5">
          {c(calc.google)}
        </TableCell>
        <TableCell className="text-center bg-[#4A7FA5]/5 dark:bg-[#4A7FA5]/10 tabular-nums py-2.5">
          {c(calc.meta_ads)}
        </TableCell>
        <TableCell className="text-center bg-[#4A7FA5]/5 dark:bg-[#4A7FA5]/10 tabular-nums py-2.5">
          {c(calc.particular)}
        </TableCell>
        <TableCell className="text-center font-bold bg-[#4A7FA5]/10 dark:bg-[#4A7FA5]/20 text-[#4A7FA5] dark:text-sky-400 border-r border-[#E4E7EB] dark:border-border tabular-nums py-2.5">
          {c(calc.total_leads)}
        </TableCell>

        <TableCell className="text-center bg-[#C77E1E]/5 dark:bg-[#C77E1E]/10 border-r border-[#E4E7EB] dark:border-border font-medium text-[#C77E1E] dark:text-amber-400 tabular-nums py-2.5">
          {c(calc.em_qualif)}
        </TableCell>

        <TableCell className="text-center bg-[#B4453C]/5 dark:bg-[#B4453C]/10 tabular-nums py-2.5">
          {c(calc.sem_qualidade)}
        </TableCell>
        <TableCell className="text-center bg-[#B4453C]/5 dark:bg-[#B4453C]/10 tabular-nums py-2.5">
          {c(calc.aposentado)}
        </TableCell>
        <TableCell className="text-center bg-[#B4453C]/5 dark:bg-[#B4453C]/10 tabular-nums py-2.5">
          {c(calc.contribuinte_carne)}
        </TableCell>
        <TableCell className="text-center bg-[#B4453C]/5 dark:bg-[#B4453C]/10 tabular-nums py-2.5">
          {c(calc.outros)}
        </TableCell>
        <TableCell className="text-center bg-[#B4453C]/5 dark:bg-[#B4453C]/10 tabular-nums py-2.5">
          {c(calc.sem_interesse)}
        </TableCell>
        <TableCell className="text-center bg-[#B4453C]/5 dark:bg-[#B4453C]/10 tabular-nums py-2.5">
          {c(calc.engano)}
        </TableCell>
        <TableCell className="text-center font-bold bg-[#B4453C]/10 dark:bg-[#B4453C]/20 border-r border-[#E4E7EB] dark:border-border text-[#B4453C] dark:text-red-400 tabular-nums py-2.5">
          {c(calc.total_desq)}
        </TableCell>

        <TableCell className="text-center font-bold bg-[#3E8E5A]/10 dark:bg-[#3E8E5A]/20 border-r border-[#E4E7EB] dark:border-border text-[#3E8E5A] dark:text-[#52B86E] tabular-nums py-2.5">
          {c(calc.qualificados)}
        </TableCell>

        <TableCell className="text-center bg-[#2B9A8C]/5 dark:bg-[#2B9A8C]/10 text-[#2B9A8C] dark:text-teal-400 font-medium tabular-nums py-2.5">
          {cStats.aux}
        </TableCell>
        <TableCell className="text-center bg-[#2B9A8C]/5 dark:bg-[#2B9A8C]/10 text-[#2B9A8C] dark:text-teal-400 font-medium tabular-nums py-2.5">
          {cStats.der}
        </TableCell>
        <TableCell className="text-center bg-[#2B9A8C]/5 dark:bg-[#2B9A8C]/10 text-[#2B9A8C] dark:text-teal-400 font-medium tabular-nums py-2.5">
          {cStats.ben}
        </TableCell>
        <TableCell className="text-center font-bold bg-[#2B9A8C]/15 dark:bg-[#2B9A8C]/25 text-[#1b7167] dark:text-teal-300 tabular-nums py-2.5">
          {cStats.total}
        </TableCell>
        <TableCell className="text-center bg-[#2B9A8C]/5 dark:bg-[#2B9A8C]/10 text-[#2B9A8C] dark:text-teal-400 font-medium tabular-nums py-2.5">
          {cStats.direto}
        </TableCell>
        <TableCell className="text-center bg-[#2B9A8C]/5 dark:bg-[#2B9A8C]/10 text-[#2B9A8C] dark:text-teal-400 font-medium border-r border-[#E4E7EB] dark:border-border tabular-nums py-2.5">
          {cStats.fup}
        </TableCell>

        <TableCell
          className={cn(
            'text-center font-bold tabular-nums py-2.5',
            colorConvGeral(calc.conv_geral),
          )}
        >
          {fmtPct(calc.conv_geral)}
        </TableCell>
        <TableCell
          className={cn(
            'text-center font-bold tabular-nums py-2.5',
            colorConvQualif(calc.conv_qualif),
          )}
        >
          {fmtPct(calc.conv_qualif)}
        </TableCell>
        <TableCell
          className={cn('text-center font-bold tabular-nums py-2.5', colorDesq(calc.desqual_pct))}
        >
          {fmtPct(calc.desqual_pct)}
        </TableCell>
        <TableCell
          className={cn(
            'text-center font-bold border-r border-[#E4E7EB] dark:border-border tabular-nums py-2.5',
            colorFechFup(calc.pct_fech_via_fup),
          )}
        >
          {fmtPct(calc.pct_fech_via_fup)}
        </TableCell>

        <TableCell
          className="text-center text-[#78818E] dark:text-muted-foreground truncate max-w-[150px] py-2.5 px-3"
          title={calc.observacoes}
        >
          {calc.observacoes || '—'}
        </TableCell>

        <TableCell className="text-center whitespace-nowrap py-2.5 px-2">
          {!isTotal ? (
            <div className="flex items-center justify-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-[#78818E] hover:text-[#C9922A] hover:bg-[#FAF8F2] dark:hover:bg-muted/40 transition-colors"
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
                className="h-7 w-7 text-[#78818E] hover:text-[#B4453C] hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
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
    <div className="space-y-3.5">
      {/* Barra de Ações: Busca + Botão Registrar Dia no Padrão Grafite Premium 2.1 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-[10px] border border-[#E4E7EB] dark:border-border bg-white dark:bg-card p-3 sm:p-3.5 shadow-sm">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[#78818E] dark:text-muted-foreground" />
          <Input
            placeholder="Buscar registros por observação ou mês..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-white dark:bg-card border-[#E4E7EB] dark:border-border rounded-md focus-visible:ring-[#C9922A] h-9 text-xs"
          />
        </div>
        <Button
          onClick={onAdd}
          className="bg-[#C9922A] hover:bg-[#b58324] text-white shadow-sm h-9 px-4 text-xs font-semibold rounded-md transition-colors shrink-0"
        >
          <Plus className="mr-1.5 h-4 w-4" /> Registrar Dia
        </Button>
      </div>

      <div className="rounded-[10px] border border-[#E4E7EB] dark:border-border shadow-sm bg-white dark:bg-card overflow-hidden">
        <div
          ref={ref}
          onMouseDown={onMouseDown}
          onMouseLeave={onMouseLeave}
          onMouseUp={onMouseUp}
          onMouseMove={onMouseMove}
          style={style}
          className="overflow-x-auto select-none"
        >
          <Table className="w-[3000px] text-xs relative">
            <TableHeader className="bg-[#F5F6F8] dark:bg-muted/30">
              {/* Linha Superior com Grupos de Colunas */}
              <TableRow className="border-b border-[#E4E7EB] dark:border-border hover:bg-transparent">
                <TableHead className="text-center border-r border-[#E4E7EB] dark:border-border bg-[#F5F6F8] dark:bg-muted/30 w-16 text-[10px] font-bold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground py-2.5">
                  BASE
                </TableHead>
                <TableHead
                  colSpan={4}
                  className="text-center border-r border-[#E4E7EB] dark:border-border bg-[#4A7FA5]/10 dark:bg-[#4A7FA5]/20 text-[#4A7FA5] dark:text-sky-300 font-bold text-[10px] uppercase tracking-wider py-2.5"
                >
                  LEADS RECEBIDOS
                </TableHead>
                <TableHead
                  colSpan={1}
                  className="text-center border-r border-[#E4E7EB] dark:border-border bg-[#C77E1E]/10 dark:bg-[#C77E1E]/20 text-[#C77E1E] dark:text-amber-300 font-bold text-[10px] uppercase tracking-wider py-2.5"
                >
                  EM QUALIF.
                </TableHead>
                <TableHead
                  colSpan={7}
                  className="text-center border-r border-[#E4E7EB] dark:border-border bg-[#B4453C]/10 dark:bg-[#B4453C]/20 text-[#B4453C] dark:text-red-300 font-bold text-[10px] uppercase tracking-wider py-2.5"
                >
                  DESQUALIFICADOS
                </TableHead>
                <TableHead
                  colSpan={1}
                  className="text-center border-r border-[#E4E7EB] dark:border-border bg-[#3E8E5A]/10 dark:bg-[#3E8E5A]/20 text-[#3E8E5A] dark:text-green-300 font-bold text-[10px] uppercase tracking-wider py-2.5"
                >
                  QUALIFICADOS
                </TableHead>
                <TableHead
                  colSpan={6}
                  className="text-center border-r border-[#E4E7EB] dark:border-border bg-[#2B9A8C]/10 dark:bg-[#2B9A8C]/20 text-[#1b7167] dark:text-teal-300 font-bold text-[10px] uppercase tracking-wider py-2.5"
                >
                  CONTRATOS
                </TableHead>
                <TableHead
                  colSpan={6}
                  className="text-center bg-[#7C5CBF]/10 dark:bg-[#7C5CBF]/20 text-[#7C5CBF] dark:text-purple-300 font-bold text-[10px] uppercase tracking-wider py-2.5"
                >
                  INDICADORES
                </TableHead>
              </TableRow>

              {/* Linha Inferior com Nomes de Coluna */}
              <TableRow className="border-b border-[#E4E7EB] dark:border-border hover:bg-transparent bg-[#FAF8F2]/60 dark:bg-muted/20">
                <TableHead className="text-center border-r border-[#E4E7EB] dark:border-border w-16 text-[10px] font-bold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground py-2">
                  Dia
                </TableHead>

                <TableHead className="text-center w-20 text-[10px] font-bold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground py-2">
                  Google Ads
                </TableHead>
                <TableHead className="text-center w-20 text-[10px] font-bold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground py-2">
                  Meta Ads
                </TableHead>
                <TableHead className="text-center w-20 text-[10px] font-bold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground py-2">
                  Partic.
                </TableHead>
                <TableHead className="text-center border-r border-[#E4E7EB] dark:border-border w-20 font-bold text-[10px] uppercase tracking-wider text-[#4A7FA5] dark:text-sky-300 py-2">
                  Total
                </TableHead>

                <TableHead className="text-center border-r border-[#E4E7EB] dark:border-border w-24 text-[10px] font-bold uppercase tracking-wider text-[#C77E1E] dark:text-amber-300 py-2">
                  Em Qualif
                </TableHead>

                <TableHead className="text-center w-24 text-[10px] font-bold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground py-2">
                  S/ Qual Seg.
                </TableHead>
                <TableHead className="text-center w-24 text-[10px] font-bold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground py-2">
                  Aposentado
                </TableHead>
                <TableHead className="text-center w-24 text-[10px] font-bold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground py-2">
                  Carnê
                </TableHead>
                <TableHead className="text-center w-20 text-[10px] font-bold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground py-2">
                  Outros
                </TableHead>
                <TableHead className="text-center w-24 text-[10px] font-bold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground py-2">
                  Sem Int.
                </TableHead>
                <TableHead className="text-center w-24 text-[10px] font-bold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground py-2">
                  Engano
                </TableHead>
                <TableHead className="text-center border-r border-[#E4E7EB] dark:border-border w-24 font-bold text-[10px] uppercase tracking-wider text-[#B4453C] dark:text-red-300 py-2">
                  Total Desq.
                </TableHead>

                <TableHead className="text-center border-r border-[#E4E7EB] dark:border-border w-24 font-bold text-[10px] uppercase tracking-wider text-[#3E8E5A] dark:text-green-300 py-2">
                  Qualificados
                </TableHead>

                <TableHead className="text-center w-24 text-[10px] font-bold uppercase tracking-wider text-[#2B9A8C] dark:text-teal-300 py-2">
                  Aux. Acid.
                </TableHead>
                <TableHead className="text-center w-24 text-[10px] font-bold uppercase tracking-wider text-[#2B9A8C] dark:text-teal-300 py-2">
                  DER
                </TableHead>
                <TableHead className="text-center w-24 text-[10px] font-bold uppercase tracking-wider text-[#2B9A8C] dark:text-teal-300 py-2">
                  Ben. Análise
                </TableHead>
                <TableHead className="text-center w-24 font-bold text-[10px] uppercase tracking-wider text-[#1b7167] dark:text-teal-200 py-2">
                  Total
                </TableHead>
                <TableHead className="text-center w-24 text-[10px] font-bold uppercase tracking-wider text-[#2B9A8C] dark:text-teal-300 py-2">
                  DIRETO
                </TableHead>
                <TableHead className="text-center border-r border-[#E4E7EB] dark:border-border w-24 text-[10px] font-bold uppercase tracking-wider text-[#2B9A8C] dark:text-teal-300 py-2">
                  FUP
                </TableHead>

                <TableHead className="text-center w-24 text-[10px] font-bold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground py-2">
                  Conv. Geral %
                </TableHead>
                <TableHead className="text-center w-24 text-[10px] font-bold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground py-2">
                  Conv. Qualif. %
                </TableHead>
                <TableHead className="text-center w-24 text-[10px] font-bold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground py-2">
                  Desqual. %
                </TableHead>
                <TableHead className="text-center border-r border-[#E4E7EB] dark:border-border w-24 text-[10px] font-bold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground py-2">
                  Fech. FUP %
                </TableHead>

                <TableHead className="text-center w-32 text-[10px] font-bold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground py-2">
                  Obs.
                </TableHead>
                <TableHead className="text-center w-24 text-[10px] font-bold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground py-2">
                  Ações
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-[#E4E7EB] dark:divide-border">
              {sortedMonths.map((m) => (
                <React.Fragment key={m}>
                  {((startMonth && endMonth) || month === 'Todos') && (
                    <TableRow className="bg-[#22262E] text-white hover:bg-[#22262E]">
                      <TableCell
                        colSpan={27}
                        className="py-2.5 px-4 font-bold text-[#D9A94A] uppercase text-xs tracking-wider"
                      >
                        {m}
                      </TableCell>
                    </TableRow>
                  )}
                  {groups[m].map((row: any) => renderRow(row, false))}
                  {groups[m].length > 0 &&
                    ((startMonth && endMonth) || day === 'Todos') &&
                    renderRow(null, true, groups[m])}
                </React.Fragment>
              ))}
              {sortedMonths.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={27}
                    className="text-center py-12 text-xs text-[#78818E] dark:text-muted-foreground bg-[#F5F6F8]/30 dark:bg-card/40"
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
