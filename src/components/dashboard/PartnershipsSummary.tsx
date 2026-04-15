import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { FileText, Printer } from 'lucide-react'

const partnerships = [
  { id: 1, parceiro: 'Juliana', casos: 1, total: 100 },
  { id: 2, parceiro: 'João', casos: 1, total: 100 },
]

export function PartnershipsSummary() {
  return (
    <Card
      className="mt-8 mb-12 border-border/60 shadow-sm animate-fade-in-up"
      style={{ animationDelay: '300ms' }}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-xl font-bold">Resumo de Parcerias</CardTitle>
        <Button variant="outline" size="sm" className="font-semibold bg-background">
          <FileText className="mr-2 h-4 w-4" /> Relatório geral
        </Button>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-semibold">PARCEIRO</TableHead>
                <TableHead className="text-right font-semibold">CASOS</TableHead>
                <TableHead className="text-right font-semibold">TOTAL POR PARCEIRO (R$)</TableHead>
                <TableHead className="text-center font-semibold w-32">RELATÓRIO</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {partnerships.map((p) => (
                <TableRow key={p.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-semibold">{p.parceiro}</TableCell>
                  <TableCell className="text-right font-medium">{p.casos}</TableCell>
                  <TableCell className="text-right font-medium text-emerald-600 dark:text-emerald-400">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                      p.total,
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 hover:bg-primary/10 hover:text-primary"
                    >
                      <Printer className="mr-2 h-4 w-4" /> Imprimir
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter className="bg-primary/5 text-foreground font-bold border-t-2">
              <TableRow>
                <TableCell className="text-lg uppercase tracking-wide">TOTAL GERAL</TableCell>
                <TableCell className="text-right text-lg">2</TableCell>
                <TableCell className="text-right text-lg text-emerald-600 dark:text-emerald-400">
                  R$ 200,00
                </TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
