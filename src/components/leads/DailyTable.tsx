import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import {
  aggregateLeads,
  calculateLeadRow,
  colorCac,
  colorConvGeral,
  colorConvQualif,
  colorDesq,
  fmtMon,
  fmtPct,
  useDraggableScroll,
} from '@/lib/leads-calc'
import { cn } from '@/lib/utils'

export function DailyTable({ monthLeads, onEdit, onAdd }: any) {
  const { ref, onMouseDown, onMouseLeave, onMouseUp, onMouseMove, style } = useDraggableScroll()
  const totalCalc = calculateLeadRow(aggregateLeads(monthLeads))

  const renderRow = (row: any, isTotal: boolean = false) => {
    const calc = isTotal ? totalCalc : calculateLeadRow(row)
    const baseClass = isTotal
      ? 'bg-muted/80 font-bold hover:bg-muted/80'
      : 'cursor-pointer hover:bg-muted/50 transition-colors'
    const c = (v: any) => v

    return (
      <TableRow
        key={isTotal ? 'total' : row.id}
        onClick={() => !isTotal && onEdit(row)}
        className={baseClass}
      >
        <TableCell className="text-center font-bold">{isTotal ? 'TOTAL' : row.dia}</TableCell>
        <TableCell className="text-center">{c(calc.meta)}</TableCell>
        <TableCell className="text-center text-blue-700 bg-blue-50/30">{c(calc.google)}</TableCell>
        <TableCell className="text-center text-blue-700 bg-blue-50/30">
          {c(calc.particular)}
        </TableCell>
        <TableCell className="text-center font-bold text-blue-800 bg-blue-100/30">
          {c(calc.total_leads)}
        </TableCell>
        <TableCell className="text-center text-amber-700 bg-amber-50/30">
          {c(calc.em_qualif)}
        </TableCell>
        <TableCell className="text-center text-red-700 bg-red-50/30">
          {c(calc.sem_qualidade)}
        </TableCell>
        <TableCell className="text-center text-red-700 bg-red-50/30">
          {c(calc.aposentado)}
        </TableCell>
        <TableCell className="text-center text-red-700 bg-red-50/30">
          {c(calc.contribuinte_carne)}
        </TableCell>
        <TableCell className="text-center text-red-700 bg-red-50/30">{c(calc.outros)}</TableCell>
        <TableCell className="text-center font-bold text-red-800 bg-red-100/30">
          {c(calc.total_desq)}
        </TableCell>
        <TableCell
          className={cn('text-center font-bold bg-red-50/30', colorDesq(calc.desqual_pct))}
        >
          {fmtPct(calc.desqual_pct)}
        </TableCell>
        <TableCell className="text-center font-bold text-green-700 bg-green-50/30">
          {c(calc.qualificados)}
        </TableCell>
        <TableCell className="text-center text-orange-700 bg-orange-50/30">
          {c(calc.fechado_direto)}
        </TableCell>
        <TableCell className="text-center text-orange-700 bg-orange-50/30">
          {c(calc.fechado_fup)}
        </TableCell>
        <TableCell className="text-center text-orange-700 bg-orange-50/30">
          {c(calc.fup_ativo)}
        </TableCell>
        <TableCell className="text-center font-bold text-orange-800 bg-orange-100/30">
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
        <TableCell className="text-center font-bold text-purple-700 bg-purple-50/30">
          {fmtPct(calc.conv_fup_pct)}
        </TableCell>
        <TableCell className={cn('text-center font-bold bg-purple-50/30', colorCac(calc.cac))}>
          {fmtMon(calc.cac)}
        </TableCell>
        <TableCell className="text-center font-bold bg-purple-50/30">
          {fmtMon(calc.investimento)}
        </TableCell>
      </TableRow>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold">Registros Diários</h3>
        <Button
          onClick={onAdd}
          className="bg-[#C9922A] hover:bg-[#a67721] text-white h-9 shadow-sm"
        >
          <Plus className="mr-2 h-4 w-4" /> Registrar Dia
        </Button>
      </div>
      <div className="border rounded-md shadow-sm bg-card">
        <div
          ref={ref}
          onMouseDown={onMouseDown}
          onMouseLeave={onMouseLeave}
          onMouseUp={onMouseUp}
          onMouseMove={onMouseMove}
          style={style}
          className="overflow-x-auto select-none"
        >
          <Table className="w-[1800px] text-xs">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead colSpan={2} className="text-center border-r bg-muted/30">
                  BASE
                </TableHead>
                <TableHead
                  colSpan={3}
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
                  colSpan={6}
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
                  className="text-center border-r bg-orange-100/50 text-orange-800 font-bold"
                >
                  CONTRATOS
                </TableHead>
                <TableHead
                  colSpan={5}
                  className="text-center bg-purple-100/50 text-purple-800 font-bold"
                >
                  INDICADORES E $
                </TableHead>
              </TableRow>
              <TableRow className="bg-muted/10 hover:bg-muted/10">
                <TableHead className="text-center w-12">Dia</TableHead>
                <TableHead className="text-center border-r w-16">Meta</TableHead>
                <TableHead className="text-center w-16">Google</TableHead>
                <TableHead className="text-center w-16">Partic.</TableHead>
                <TableHead className="text-center border-r w-16 font-bold">Total</TableHead>
                <TableHead className="text-center border-r w-20">Em Qualif</TableHead>
                <TableHead className="text-center w-20">S/ Qualid</TableHead>
                <TableHead className="text-center w-20">Aposent.</TableHead>
                <TableHead className="text-center w-20">Carnê</TableHead>
                <TableHead className="text-center w-16">Outros</TableHead>
                <TableHead className="text-center w-16 font-bold">Total</TableHead>
                <TableHead className="text-center border-r w-20 font-bold">Desq %</TableHead>
                <TableHead className="text-center border-r w-20 font-bold">Qualificados</TableHead>
                <TableHead className="text-center w-20">Direto</TableHead>
                <TableHead className="text-center w-20">FUP</TableHead>
                <TableHead className="text-center w-20">FUP Ativo</TableHead>
                <TableHead className="text-center border-r w-20 font-bold">Total</TableHead>
                <TableHead className="text-center w-20">Conv Geral</TableHead>
                <TableHead className="text-center w-20">Conv Qualif</TableHead>
                <TableHead className="text-center w-20">Conv FUP</TableHead>
                <TableHead className="text-center w-20">CAC</TableHead>
                <TableHead className="text-center w-24">Investimento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {monthLeads.map((row: any) => renderRow(row))}
              {monthLeads.length > 0 && renderRow(null, true)}
              {monthLeads.length === 0 && (
                <TableRow>
                  <TableCell colSpan={22} className="text-center py-8 text-muted-foreground">
                    Nenhum registro encontrado para este mês.
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
