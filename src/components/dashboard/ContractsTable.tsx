import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { CheckCircle2, FileText, Pencil, Trash2, Search, Plus } from 'lucide-react'
import { useState } from 'react'

const initialContracts = [
  {
    id: 1,
    nome: 'Hércules Lacerda',
    fone: '(11) 99999-9999',
    tipo: 'Aposentadoria',
    resp: 'João',
    fup: 'Sim',
    status: 'OK',
    dContrato: '01/03/2026',
    dCalculo: '05/03/2026',
    prazo: '10 dias',
    dProtocolo: '15/03/2026',
    parceria: 'Não',
  },
  {
    id: 2,
    nome: 'Ana Livia',
    fone: '(11) 99999-9999',
    tipo: 'Pensão',
    resp: 'Maria',
    fup: 'Não',
    status: 'OK',
    dContrato: '02/03/2026',
    dCalculo: '06/03/2026',
    prazo: '10 dias',
    dProtocolo: '16/03/2026',
    parceria: 'Juliana',
  },
  {
    id: 3,
    nome: 'Felipe Narciso',
    fone: '(11) 99999-9999',
    tipo: 'Auxílio Doença',
    resp: 'João',
    fup: 'Sim',
    status: 'OK',
    dContrato: '03/03/2026',
    dCalculo: '07/03/2026',
    prazo: '10 dias',
    dProtocolo: '17/03/2026',
    parceria: 'Não',
  },
  {
    id: 4,
    nome: 'Gilton dos Santos',
    fone: '(11) 99999-9999',
    tipo: 'Aposentadoria',
    resp: 'Pedro',
    fup: 'Não',
    status: 'R. Docs',
    dContrato: '04/03/2026',
    dCalculo: '-',
    prazo: '10 dias',
    dProtocolo: '-',
    parceria: 'João',
  },
  {
    id: 5,
    nome: 'Larissa Veruska',
    fone: '(11) 99999-9999',
    tipo: 'BPC',
    resp: 'Maria',
    fup: 'Sim',
    status: 'OK',
    dContrato: '05/03/2026',
    dCalculo: '09/03/2026',
    prazo: '10 dias',
    dProtocolo: '19/03/2026',
    parceria: 'Não',
  },
]

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
]

export function ContractsTable() {
  const [activeFilter, setActiveFilter] = useState('Todos')

  return (
    <Card
      className="mt-8 border-border/60 shadow-sm animate-fade-in-up"
      style={{ animationDelay: '200ms' }}
    >
      <CardHeader>
        <CardTitle className="text-xl font-bold">Contratos Fechados</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar cliente" className="pl-9 bg-background" />
            </div>
            <Select defaultValue="todas">
              <SelectTrigger className="w-full sm:w-[180px] bg-background">
                <SelectValue placeholder="Semana" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as semanas</SelectItem>
                <SelectItem value="semana1">Semana 1</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button className="w-full md:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm">
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
              className="rounded-full font-medium"
            >
              {status}
            </Button>
          ))}
        </div>

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead className="whitespace-nowrap">NOME</TableHead>
                <TableHead className="whitespace-nowrap">FONE</TableHead>
                <TableHead className="whitespace-nowrap">TIPO DE BENEFÍCIO</TableHead>
                <TableHead className="whitespace-nowrap">RESP.</TableHead>
                <TableHead className="whitespace-nowrap">FUP</TableHead>
                <TableHead className="whitespace-nowrap">STATUS</TableHead>
                <TableHead className="whitespace-nowrap">D. CONTRATO</TableHead>
                <TableHead className="whitespace-nowrap">D. CÁLCULO</TableHead>
                <TableHead className="whitespace-nowrap">PRAZO</TableHead>
                <TableHead className="whitespace-nowrap">D. PROTOCOLO</TableHead>
                <TableHead className="whitespace-nowrap">PARCERIA</TableHead>
                <TableHead className="whitespace-nowrap text-right">AÇÕES</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialContracts.map((contract, i) => (
                <TableRow key={contract.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-medium text-muted-foreground">{i + 1}</TableCell>
                  <TableCell className="font-semibold">{contract.nome}</TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {contract.fone}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{contract.tipo}</TableCell>
                  <TableCell>{contract.resp}</TableCell>
                  <TableCell>{contract.fup}</TableCell>
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
                        className="bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 gap-1.5 whitespace-nowrap px-2 py-0.5"
                      >
                        <FileText className="h-3 w-3" /> R. Docs
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="whitespace-nowrap px-2 py-0.5">
                        {contract.status}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {contract.dContrato}
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {contract.dCalculo}
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {contract.prazo}
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {contract.dProtocolo}
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {contract.parceria}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
