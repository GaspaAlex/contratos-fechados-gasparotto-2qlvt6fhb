import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { aggregateLeads, calculateLeadRow, fmtMon, fmtPct, MONTHS } from '@/lib/leads-calc'
import { cn } from '@/lib/utils'

export function MonthlyCards({ leads, selectedMonth, onSelectMonth }: any) {
  const anoLeads = aggregateLeads(leads)
  const calcAno = calculateLeadRow(anoLeads)

  return (
    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 mb-6">
      <Card className="bg-[#C9922A] text-white border-none cursor-default shadow-sm">
        <div className="p-3 text-center">
          <div className="text-sm font-semibold opacity-90">Ano Todo</div>
          <div className="text-2xl font-bold">{calcAno.total_leads}</div>
          <div className="text-[10px] opacity-80">Leads Totais</div>
        </div>
      </Card>
      {MONTHS.map((m) => {
        const mLeads = leads.filter((l: any) => l.mes.startsWith(m))
        const mAgg = aggregateLeads(mLeads)
        const calc = calculateLeadRow(mAgg)
        const isActive = selectedMonth === m
        return (
          <Card
            key={m}
            onClick={() => onSelectMonth(m)}
            className={cn(
              'cursor-pointer transition-all border shadow-sm',
              isActive ? 'border-amber-500 bg-amber-500/10' : 'hover:bg-muted/60',
            )}
          >
            <div className="p-3 text-center">
              <div
                className={cn(
                  'text-sm font-semibold',
                  isActive ? 'text-amber-700 dark:text-amber-500' : '',
                )}
              >
                {m.slice(0, 3)}
              </div>
              <div className="text-2xl font-bold">{calc.total_leads}</div>
              <div className="text-[10px] text-muted-foreground">Leads</div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}

export function DisqualificationTable({ leads }: any) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3 border-b">
        <CardTitle className="text-base font-bold text-red-700 dark:text-red-400">
          Análise de Desqualificação
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table className="text-xs">
          <TableHeader>
            <TableRow>
              <TableHead>Mês</TableHead>
              <TableHead className="text-right">Sem Qualid.</TableHead>
              <TableHead className="text-right">Aposentado</TableHead>
              <TableHead className="text-right">Carne</TableHead>
              <TableHead className="text-right">Outros</TableHead>
              <TableHead className="text-right font-bold">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {MONTHS.map((m) => {
              const mLeads = leads.filter((l: any) => l.mes.startsWith(m))
              if (mLeads.length === 0) return null
              const agg = calculateLeadRow(aggregateLeads(mLeads))
              return (
                <TableRow key={m}>
                  <TableCell className="font-medium">{m}</TableCell>
                  <TableCell className="text-right">{agg.sem_qualidade}</TableCell>
                  <TableCell className="text-right">{agg.aposentado}</TableCell>
                  <TableCell className="text-right">{agg.contribuinte_carne}</TableCell>
                  <TableCell className="text-right">{agg.outros}</TableCell>
                  <TableCell className="text-right font-bold text-red-600">
                    {agg.total_desq}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

export function ChannelPerformance({ leads }: any) {
  const agg = calculateLeadRow(aggregateLeads(leads))
  const googlePct = agg.total_leads > 0 ? agg.google / agg.total_leads : 0
  const partPct = agg.total_leads > 0 ? agg.particular / agg.total_leads : 0

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3 border-b">
        <CardTitle className="text-base font-bold text-blue-700 dark:text-blue-400">
          Canais & Investimento Anual
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-50/50 dark:bg-blue-900/10 p-3 rounded-md border text-center">
            <div className="text-xs text-muted-foreground mb-1">Google Ads</div>
            <div className="text-xl font-bold">{agg.google}</div>
            <div className="text-[10px] text-blue-600 mt-1">{fmtPct(googlePct)}</div>
          </div>
          <div className="bg-indigo-50/50 dark:bg-indigo-900/10 p-3 rounded-md border text-center">
            <div className="text-xs text-muted-foreground mb-1">Particular</div>
            <div className="text-xl font-bold">{agg.particular}</div>
            <div className="text-[10px] text-indigo-600 mt-1">{fmtPct(partPct)}</div>
          </div>
        </div>
        <div className="flex justify-between items-center p-3 border rounded-md bg-muted/20">
          <div>
            <div className="text-xs text-muted-foreground">Investimento Total</div>
            <div className="text-lg font-bold">{fmtMon(agg.investimento)}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">CPL Médio</div>
            <div className="text-lg font-bold text-purple-600">{fmtMon(agg.cpl)}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
