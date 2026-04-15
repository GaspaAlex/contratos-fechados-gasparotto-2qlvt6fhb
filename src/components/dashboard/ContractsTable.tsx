import { useState, useMemo } from 'react'
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
import { CheckCircle2, FileText, Pencil, Trash2, Search, Plus, AlertTriangle } from 'lucide-react'
import { cn, removeAccents } from '@/lib/utils'
import { PartnershipsSummary } from './PartnershipsSummary'
import { ContractModal } from './ContractModal'
import { DeleteModal } from './DeleteModal'
import { toYMD } from '@/services/contratos'

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
const ARCHIVED_STATUSES = ['Sem Qualidade de Segurado', 'Tem Advogado', 'Litispendência']
const ATIVOS_STATUSES = ['R. Docs', 'L. Cálculos', 'OK', 'Ag. Perícia']

export function ContractsTable({ contratos = [] }: { contratos: any[] }) {
  const [activeFilter, setActiveFilter] = useState('Todos')
  const [search, setSearch] = useState('')

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

  const filtered = useMemo(() => {
    let result = contratos

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

    if (activeFilter === 'Ativos') {
      result = result.filter(
        (c) =>
          ATIVOS_STATUSES.includes(c.status) ||
          (!ARCHIVED_STATUSES.includes(c.status) && c.status !== ''),
      )
    } else if (activeFilter === 'FUP') {
      result = result.filter((c) => c.fup === true)
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
      result = result.filter((c) => c.parceria === true)
    }

    return result
  }, [contratos, activeFilter, search])

  const formatDate = (d: string) => {
    if (!d) return '-'
    const ymd = toYMD(d)
    const [y, m, day] = ymd.split('-')
    if (!day) return '-'
    return `${day}/${m}/${y}`
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
          <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar cliente, benefício, resp..."
                  className="pl-9 bg-background focus-visible:ring-amber-500"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <Button
              onClick={handleAdd}
              className="w-full md:w-auto bg-amber-500 hover:bg-amber-600 text-white font-semibold shadow-sm"
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
                    ? 'bg-amber-500/15 text-amber-700 border border-amber-400 hover:bg-amber-500/25 shadow-none dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/50'
                    : '',
                )}
              >
                {status}
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
                  <TableHead className="whitespace-nowrap">D. CONTRATO</TableHead>
                  <TableHead className="whitespace-nowrap">D. CÁLCULO</TableHead>
                  <TableHead className="whitespace-nowrap">PRAZO</TableHead>
                  <TableHead className="whitespace-nowrap">D. PROTOCOLO</TableHead>
                  <TableHead className="whitespace-nowrap">PARCERIA</TableHead>
                  <TableHead className="whitespace-nowrap text-right">AÇÕES</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                      Nenhum contrato encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((contract) => (
                    <TableRow key={contract.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-semibold">{contract.nome}</TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {contract.fone || '-'}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {contract.beneficio || '-'}
                      </TableCell>
                      <TableCell>{contract.responsavel || '-'}</TableCell>
                      <TableCell>
                        {contract.fup ? (
                          <span className="font-semibold text-amber-600">FUP</span>
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
                            className="bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 gap-1.5 whitespace-nowrap px-2 py-0.5"
                          >
                            <FileText className="h-3 w-3" /> R. Docs
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
                            className="whitespace-nowrap px-2 py-0.5 border-amber-200 text-amber-700 bg-amber-50/50"
                          >
                            {contract.status || '-'}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {formatDate(contract.dcontrato)}
                      </TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {formatDate(contract.dcalculo)}
                      </TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {contract.prazo ? `${contract.prazo} dias` : '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {formatDate(contract.dprotocolo)}
                      </TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {contract.parceria && contract.parceiro_nome ? (
                          <Badge
                            variant="secondary"
                            className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                          >
                            {contract.parceiro_nome}
                          </Badge>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-amber-500/10 hover:text-amber-600"
                            onClick={() => handleEdit(contract)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:bg-destructive/10"
                            onClick={() => handleDelete(contract)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
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
