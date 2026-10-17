import { useMemo, useEffect } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Edit2, Trash2, StickyNote } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
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

export function RpvTable({
  data,
  onEdit,
  onFilteredDataChange,
}: {
  data: any[]
  onEdit: (r: any) => void
  onFilteredDataChange?: (filtered: any[]) => void
}) {
  const { quickFilter, parceriaFilter, search, tipoFilter, statusFilter, mesFilter, anoFilter } =
    useRpvFilters()

  const finalFilteredData = useMemo(() => {
    return data.filter((item) => {
      if (search && search.trim()) {
        const s = removeAccents(search.trim().toLowerCase())
        const matchName = removeAccents((item.nome || '').toLowerCase()).includes(s)
        const matchProc = removeAccents((item.numero_processo || '').toLowerCase()).includes(s)
        if (!matchName && !matchProc) return false
      }

      if (quickFilter === 'A Receber' && item.status === 'Recebido') return false
      if (quickFilter === 'Recebido' && item.status !== 'Recebido') return false
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
  }, [data, quickFilter, parceriaFilter, search, tipoFilter, statusFilter, mesFilter, anoFilter])

  const groupedData = useMemo(() => {
    const groups: Record<string, any[]> = {}
    finalFilteredData.forEach((item) => {
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

    return sortedKeys.map((key) => {
      const items = groups[key].sort((a, b) => {
        const getDate = (item: any) => {
          if (item.status === 'Recebido' && item.data_recebimento) {
            const d = new Date(item.data_recebimento.replace(' ', 'T'))
            if (!isNaN(d.getTime())) return d.getTime()
          }
          if (item.previsao_pagamento) {
            const parts = item.previsao_pagamento.split('/')
            if (parts.length === 2) {
              return new Date(Number(parts[1]), Number(parts[0]) - 1, 1).getTime()
            }
            if (parts.length === 3) {
              return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0])).getTime()
            }
          }
          return 0
        }
        return getDate(a) - getDate(b)
      })

      return {
        key,
        items,
      }
    })
  }, [finalFilteredData])

  // Flat sorted items representing exactly what's rendered in order across groups
  const displayedItems = useMemo(() => {
    return groupedData.flatMap((g) => g.items)
  }, [groupedData])

  useEffect(() => {
    if (onFilteredDataChange) {
      onFilteredDataChange(displayedItems)
    }
  }, [displayedItems, onFilteredDataChange])

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
    <div className="w-full overflow-x-auto">
      {groupedData.length === 0 ? (
        <div className="p-12 text-center text-sm text-[#78818E] dark:text-muted-foreground">
          Nenhum registro encontrado para os filtros selecionados.
        </div>
      ) : (
        groupedData.map((group) => (
          <div
            key={group.key}
            className="border-b last:border-b-0 border-[#E4E7EB] dark:border-border"
          >
            {/* Header de Agrupamento estilo Grafite Premium */}
            <div className="bg-[#F8F9FA] dark:bg-muted/40 px-4 py-2.5 font-bold text-[11px] tracking-wider text-[#5F6775] dark:text-muted-foreground border-b border-[#E4E7EB] dark:border-border flex items-center justify-between">
              <span className="uppercase">{formatGroupHeader(group.key, group.items.length)}</span>
              <span className="text-[10px] font-normal text-[#9299A9] dark:text-muted-foreground">
                Total do grupo: {group.items.length}{' '}
                {group.items.length === 1 ? 'registro' : 'registros'}
              </span>
            </div>

            <Table>
              <TableHeader>
                <TableRow className="border-b border-[#E4E7EB] dark:border-border hover:bg-transparent bg-white dark:bg-card">
                  <TableHead className="w-12 text-[11px] font-bold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground">
                    #
                  </TableHead>
                  <TableHead className="min-w-[220px] text-[11px] font-bold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground">
                    NOME / CPF
                  </TableHead>
                  <TableHead className="min-w-[170px] text-[11px] font-bold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground">
                    Nº PROCESSO
                  </TableHead>
                  <TableHead className="w-24 text-[11px] font-bold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground">
                    TIPO
                  </TableHead>
                  <TableHead className="w-28 text-[11px] font-bold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground">
                    {quickFilter === 'Recebido' ? 'RECEBIDO EM' : 'PREVISÃO'}
                  </TableHead>
                  <TableHead className="w-32 text-right text-[11px] font-bold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground">
                    VALOR RPV/PREC.
                  </TableHead>
                  <TableHead className="w-28 text-right text-[11px] font-bold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground">
                    SUCUMBÊNCIA
                  </TableHead>
                  <TableHead className="w-36 text-right text-[11px] font-bold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground">
                    {quickFilter === 'Recebido' ? 'RECEBIDO' : 'HON. ESCRITÓRIO'}
                  </TableHead>
                  <TableHead className="w-44 text-[11px] font-bold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground">
                    STATUS
                  </TableHead>
                  <TableHead className="w-20 text-right text-[11px] font-bold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground">
                    AÇÕES
                  </TableHead>
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

                  const isRecebido = item.status === 'Recebido'

                  return (
                    <TableRow
                      key={item.id}
                      className={cn(
                        'border-b border-[#E4E7EB]/80 dark:border-border/80 transition-colors hover:bg-[#F5F6F8]/60 dark:hover:bg-muted/30',
                        isRecebido &&
                          'bg-[#3E8E5A]/[0.04] dark:bg-[#3E8E5A]/[0.08] hover:bg-[#3E8E5A]/[0.08] dark:hover:bg-[#3E8E5A]/[0.12]',
                      )}
                    >
                      {/* Numeração */}
                      <TableCell className="text-xs text-[#78818E] dark:text-muted-foreground font-medium py-3">
                        {idx + 1}
                      </TableCell>

                      {/* Nome / CPF */}
                      <TableCell className="py-3">
                        <div className="flex items-center gap-1.5 font-semibold text-xs text-[#252B34] dark:text-foreground">
                          <span
                            className="truncate max-w-[260px] sm:max-w-[340px]"
                            title={item.nome}
                          >
                            {item.nome}
                          </span>
                          {item.observacoes && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <StickyNote className="h-3.5 w-3.5 text-[#C9922A] cursor-help shrink-0" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs text-xs">
                                <p className="whitespace-pre-line">{item.observacoes}</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                        {item.cpf && (
                          <div className="text-[11px] text-[#78818E] dark:text-muted-foreground font-mono mt-0.5">
                            {item.cpf}
                          </div>
                        )}
                        {item.tipo_parceria && item.tipo_parceria !== 'Sem parceria' && (
                          <div className="mt-1">
                            <span className="inline-flex items-center text-[10px] font-medium text-[#C9922A] bg-[#C9922A]/10 border border-[#C9922A]/20 px-1.5 py-0.2 rounded">
                              {item.tipo_parceria}
                            </span>
                          </div>
                        )}
                      </TableCell>

                      {/* Nº Processo */}
                      <TableCell className="py-3 font-mono text-xs text-[#252B34] dark:text-foreground">
                        {item.numero_processo || (
                          <span className="text-[#78818E] dark:text-muted-foreground font-sans text-xs">
                            —
                          </span>
                        )}
                      </TableCell>

                      {/* Tipo: RPV ou Precatório */}
                      <TableCell className="py-3">
                        <span
                          className={cn(
                            'inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border',
                            item.tipo === 'Precatório'
                              ? 'bg-[#58335E]/10 text-[#58335E] border-[#58335E]/20 dark:bg-[#58335E]/20 dark:text-purple-300 dark:border-[#58335E]/40'
                              : 'bg-[#2B6CB0]/10 text-[#2B6CB0] border-[#2B6CB0]/20 dark:bg-[#2B6CB0]/20 dark:text-sky-300 dark:border-[#2B6CB0]/40',
                          )}
                        >
                          {item.tipo || 'RPV'}
                        </span>
                      </TableCell>

                      {/* Previsão / Recebido Em */}
                      <TableCell className="py-3 text-xs text-[#252B34] dark:text-foreground font-medium">
                        {isRecebido
                          ? formatDateRecebimento(item.data_recebimento)
                          : item.previsao_pagamento || '—'}
                      </TableCell>

                      {/* Valor RPV/Prec. */}
                      <TableCell className="py-3 text-right font-semibold text-xs text-[#252B34] dark:text-foreground tabular-nums">
                        {formatCurrency(item.valor_rpv)}
                      </TableCell>

                      {/* Sucumbência */}
                      <TableCell className="py-3 text-right text-xs text-[#78818E] dark:text-muted-foreground tabular-nums">
                        {formatCurrency(item.sucumbencia)}
                      </TableCell>

                      {/* Honorários Escritório ou Valor Recebido */}
                      <TableCell className="py-3 text-right text-xs font-bold tabular-nums">
                        {isRecebido ? (
                          <span className="text-[#3E8E5A]">
                            {formatCurrency(Number(item.valor_recebido) || 0)}
                          </span>
                        ) : (
                          <span className="text-[#C9922A]">
                            {formatCurrency(honorariosEscritorio)}
                          </span>
                        )}
                      </TableCell>

                      {/* Status */}
                      <TableCell className="py-3">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] font-medium border px-2 py-0.5 whitespace-nowrap',
                            STATUS_COLORS[item.status] ||
                              'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
                          )}
                        >
                          {item.status || 'Sem status'}
                        </Badge>
                      </TableCell>

                      {/* Ações */}
                      <TableCell className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onEdit(item)}
                            className="h-7 w-7 text-[#78818E] hover:text-[#C9922A] hover:bg-[#FAF8F2] dark:hover:bg-muted/40 rounded-md transition-colors"
                            title="Editar registro"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-[#78818E] hover:text-[#B4453C] hover:bg-[#B4453C]/10 rounded-md transition-colors"
                                title="Excluir registro"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="max-w-md rounded-[10px] border border-[#E4E7EB] dark:border-border p-5 sm:p-6 shadow-lg bg-white dark:bg-card">
                              <AlertDialogHeader className="pb-2">
                                <div className="flex items-center gap-2.5 text-[#B4453C] mb-1">
                                  <div className="h-8 w-8 rounded-lg bg-[#B4453C]/10 flex items-center justify-center shrink-0">
                                    <Trash2 className="h-4 w-4 text-[#B4453C]" />
                                  </div>
                                  <AlertDialogTitle className="text-base sm:text-lg font-bold text-[#252B34] dark:text-foreground">
                                    Excluir Registro
                                  </AlertDialogTitle>
                                </div>
                                <AlertDialogDescription className="text-xs sm:text-sm text-[#78818E] dark:text-muted-foreground pt-1">
                                  Tem certeza que deseja excluir o registro de{' '}
                                  <strong className="text-[#252B34] dark:text-foreground font-semibold">
                                    {item.nome}
                                  </strong>
                                  ?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <div className="text-xs text-[#78818E] dark:text-muted-foreground bg-[#B4453C]/[0.05] border border-[#B4453C]/20 p-3 rounded-md mt-2">
                                Esta ação é irreversível. O registro e seus valores serão removidos
                                do sistema.
                              </div>
                              <AlertDialogFooter className="mt-5 flex gap-2 justify-end pt-3 border-t border-[#E4E7EB]/80 dark:border-border/80">
                                <AlertDialogCancel className="h-8 px-3 text-xs border-[#E4E7EB] dark:border-border rounded-md text-[#78818E] hover:text-[#252B34]">
                                  Cancelar
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(item.id)}
                                  className="h-8 px-4 text-xs font-semibold bg-[#B4453C] hover:bg-[#9c3a32] text-white rounded-md shadow-sm"
                                >
                                  Excluir permanentemente
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
