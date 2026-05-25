import { useMemo } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Edit2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { deleteRpv } from '@/services/rpv'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { STATUS_COLORS, MONTHS } from './constants'
import { useRpvFilters } from './store'
import { removeAccents } from '@/lib/utils'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

export function RpvTable({ data, onEdit }: { data: any[]; onEdit: (r: any) => void }) {
  const { quickFilter, parceriaFilter, search, tipoFilter, statusFilter, mesFilter, anoFilter } =
    useRpvFilters()

  const groupedData = useMemo(() => {
    const filteredData = data.filter((item) => {
      if (search.trim()) {
        const s = removeAccents(search.trim().toLowerCase())
        return (
          removeAccents((item.nome || '').toLowerCase()).includes(s) ||
          removeAccents((item.numero_processo || '').toLowerCase()).includes(s)
        )
      }

      if (quickFilter === 'A Receber' && item.recebido) return false
      if (quickFilter === 'Recebido' && !item.recebido) return false
      if (quickFilter === 'RPV' && item.tipo !== 'RPV') return false
      if (quickFilter === 'Precatório' && item.tipo !== 'Precatório') return false
      if (quickFilter === 'Por Parceria') {
        if (parceriaFilter !== 'Todos os parceiros' && item.tipo_parceria !== parceriaFilter)
          return false
      }

      if (tipoFilter && tipoFilter !== 'Todos' && item.tipo !== tipoFilter) return false
      if (statusFilter && statusFilter !== 'Todos' && item.status !== statusFilter) return false

      if (mesFilter && mesFilter !== 'Todos') {
        const previsao = item.previsao_pagamento || ''
        const [m] = previsao.split('/')
        if (m !== mesFilter) return false
      }

      if (anoFilter && anoFilter !== 'Todos') {
        const previsao = item.previsao_pagamento || ''
        const [, y] = previsao.split('/')
        if (y !== anoFilter) return false
      }

      return true
    })

    const groups: Record<string, any[]> = {}
    filteredData.forEach((item) => {
      const key = item.previsao_pagamento || 'Sem previsão'
      if (!groups[key]) groups[key] = []
      groups[key].push(item)
    })

    const sortedKeys = Object.keys(groups).sort((a, b) => {
      if (a === 'Sem previsão') return 1
      if (b === 'Sem previsão') return -1
      const [mA, yA] = a.split('/')
      const [mB, yB] = b.split('/')
      if (yA !== yB) return (yA || '').localeCompare(yB || '')
      return (mA || '').localeCompare(mB || '')
    })

    return sortedKeys.map((key) => ({
      key,
      items: groups[key],
    }))
  }, [data, quickFilter, parceriaFilter, search, tipoFilter, statusFilter, mesFilter, anoFilter])

  const handleDelete = async (id: string) => {
    try {
      await deleteRpv(id)
      toast.success('Registro excluído com sucesso')
    } catch (e: any) {
      toast.error('Erro ao excluir: ' + e.message)
    }
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0)
  }

  const formatGroupHeader = (key: string, count: number) => {
    if (key === 'Sem previsão') return `SEM PREVISÃO • ${count} CASO(S)`
    const [m, y] = key.split('/')
    const monthName = MONTHS.find((x) => x.value === m)?.label.toUpperCase() || m
    return `${monthName}/${y} • ${count} CASO(S)`
  }

  const formatDateRecebimento = (dateStr?: string) => {
    if (!dateStr) return '-'
    const onlyDate = dateStr.split(' ')[0].split('T')[0]
    const parts = onlyDate.split('-')
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`
    }
    return dateStr
  }

  return (
    <div className="w-full">
      {groupedData.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">Nenhum registro encontrado.</div>
      ) : (
        groupedData.map((group) => (
          <div key={group.key} className="mb-0">
            <div className="bg-muted/40 dark:bg-gray-800/50 px-4 py-3 font-semibold text-xs tracking-wider text-muted-foreground dark:text-gray-300 border-b dark:border-gray-700 uppercase">
              {formatGroupHeader(group.key, group.items.length)}
            </div>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-12 text-xs dark:text-gray-300">#</TableHead>
                  <TableHead className="text-xs dark:text-gray-300">NOME / CPF</TableHead>
                  <TableHead className="text-xs dark:text-gray-300">Nº PROCESSO</TableHead>
                  <TableHead className="text-xs dark:text-gray-300">TIPO</TableHead>
                  <TableHead className="text-xs dark:text-gray-300">
                    {quickFilter === 'Recebido' ? 'RECEBIDO EM' : 'PREVISÃO'}
                  </TableHead>
                  <TableHead className="text-xs dark:text-gray-300">VALOR RPV/PREC.</TableHead>
                  <TableHead className="text-xs dark:text-gray-300">SUCUMBÊNCIA</TableHead>
                  <TableHead className="text-xs dark:text-gray-300">
                    HONORÁRIOS ESCRITÓRIO
                  </TableHead>
                  <TableHead className="text-xs dark:text-gray-300">STATUS</TableHead>
                  <TableHead className="text-right text-xs dark:text-gray-300">AÇÕES</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {group.items.map((item, idx) => {
                  const honorarios30 = (item.valor_rpv || 0) * 0.3
                  const totalHonorarios = honorarios30 + (item.sucumbencia || 0)

                  let honorariosEscritorio = totalHonorarios
                  if (item.tipo_parceria === 'Carnevale') {
                    honorariosEscritorio = totalHonorarios * 0.5
                  } else if (item.tipo_parceria?.startsWith('Macohin')) {
                    const step1 = totalHonorarios * 0.857
                    const step2 = step1 * 0.8334
                    const macohinBase = step2 / 2
                    if (item.tipo_parceria === 'Macohin') {
                      honorariosEscritorio = macohinBase
                    } else if (item.tipo_parceria === 'Macohin + Rogério') {
                      honorariosEscritorio = macohinBase * 0.4
                    } else if (item.tipo_parceria === 'Macohin + Luciana') {
                      honorariosEscritorio = macohinBase * 0.5
                    }
                  }

                  return (
                    <TableRow
                      key={item.id}
                      className={cn(
                        'hover:bg-muted/30 dark:hover:bg-gray-800/50 transition-colors border-b dark:border-gray-700',
                        item.status === 'Recebido' &&
                          'bg-green-50 dark:bg-green-900/20 hover:bg-green-50/80 dark:hover:bg-green-900/30',
                      )}
                    >
                      <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell>
                        <div className="font-bold">{item.nome}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{item.cpf}</div>
                      </TableCell>
                      <TableCell
                        className="text-sm"
                        style={{ fontFamily: '"JetBrains Mono", monospace' }}
                      >
                        {item.numero_processo || '-'}
                      </TableCell>
                      <TableCell>{item.tipo || '-'}</TableCell>
                      <TableCell>
                        {item.status === 'Recebido'
                          ? formatDateRecebimento(item.data_recebimento)
                          : item.previsao_pagamento || '-'}
                      </TableCell>
                      <TableCell className="font-bold">{formatCurrency(item.valor_rpv)}</TableCell>
                      <TableCell>{formatCurrency(item.sucumbencia)}</TableCell>
                      <TableCell>{formatCurrency(honorariosEscritorio)}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            'font-normal border-transparent',
                            STATUS_COLORS[item.status] || 'bg-muted text-muted-foreground',
                          )}
                        >
                          {item.status || 'Sem status'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => onEdit(item)}>
                            <Edit2 className="h-4 w-4 text-[#C9922A]" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir registro</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir este registro? Esta ação não pode
                                  ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(item.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        ))
      )}
    </div>
  )
}
