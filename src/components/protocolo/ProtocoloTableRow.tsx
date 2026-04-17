import { TableCell, TableRow } from '@/components/ui/table'
import { format, parseISO } from 'date-fns'
import {
  MoreHorizontal,
  Edit,
  Trash,
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  FileText,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/formatters'
import { isOverdue } from '@/lib/date-utils'

export function ProtocoloTableRow({ item, index, onEdit, onDelete }: any) {
  const overdue = isOverdue(item.dprotocolo, item.prazo)

  const statusConfig: any = {
    Protocolado: {
      color: 'text-emerald-700 bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-400',
      icon: CheckCircle2,
    },
    'Prov. Inicial': {
      color: 'text-blue-700 bg-blue-100 dark:bg-blue-950 dark:text-blue-400',
      icon: FileText,
    },
    'R. Docs': {
      color: 'text-amber-700 bg-amber-100 dark:bg-amber-950 dark:text-amber-400',
      icon: ClipboardList,
    },
  }
  const st = statusConfig[item.status] || { color: 'text-gray-700 bg-gray-100', icon: FileText }
  const StatusIcon = st.icon

  const decColor =
    item.decisao === 'Procedente'
      ? 'text-emerald-600 font-medium'
      : item.decisao === 'Improcedente'
        ? 'text-rose-600 font-medium'
        : 'text-muted-foreground'
  const honorarios =
    item.decisao === 'Improcedente' || !item.valor ? '—' : formatCurrency(item.valor * 0.3)

  return (
    <TableRow
      className={`group ${overdue ? 'bg-rose-50/50 hover:bg-rose-50 dark:bg-rose-950/10 dark:hover:bg-rose-950/20' : ''}`}
    >
      <TableCell className={`w-10 ${overdue ? 'border-l-2 border-l-rose-500' : ''}`}>
        {index}
      </TableCell>
      <TableCell className="font-medium whitespace-nowrap">{item.nome}</TableCell>
      <TableCell className="whitespace-nowrap">{item.expand?.tipo_acao?.nome || '—'}</TableCell>
      <TableCell className="whitespace-nowrap">{item.expand?.responsavel?.nome || '—'}</TableCell>
      <TableCell>
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${st.color}`}
        >
          <StatusIcon className="h-3.5 w-3.5" />
          {item.status}
        </span>
      </TableCell>
      <TableCell className="whitespace-nowrap">
        {item.dcalculo ? format(parseISO(item.dcalculo), 'dd/MM/yy') : '—'}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          {overdue && <AlertTriangle className="h-4 w-4 text-rose-500" />}
          <span className={overdue ? 'text-rose-600 font-medium' : ''}>
            {item.dprotocolo ? format(parseISO(item.dprotocolo), 'dd/MM/yy') : '—'}
          </span>
        </div>
      </TableCell>
      <TableCell className="whitespace-nowrap">{item.prazo || 15} d</TableCell>
      <TableCell className="whitespace-nowrap">
        {item.nautos ? (
          <span className="font-mono text-xs bg-blue-500/10 text-blue-700 dark:text-blue-400 px-2 py-1 rounded">
            {item.nautos}
          </span>
        ) : (
          '—'
        )}
      </TableCell>
      <TableCell className="text-right whitespace-nowrap">
        {item.valor ? formatCurrency(item.valor) : '—'}
      </TableCell>
      <TableCell className="text-right font-medium whitespace-nowrap">{honorarios}</TableCell>
      <TableCell className={`${decColor} whitespace-nowrap`}>
        {item.decisao === 'Aguardando' ? '—' : item.decisao}
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <Edit className="mr-2 h-4 w-4" /> Editar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} className="text-rose-600 focus:text-rose-600">
              <Trash className="mr-2 h-4 w-4" /> Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}
