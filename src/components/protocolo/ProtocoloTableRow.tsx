import { TableCell, TableRow } from '@/components/ui/table'
import { format, parseISO } from 'date-fns'
import { Edit, Trash, AlertTriangle, CheckCircle2, ClipboardList, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/formatters'

const isOverdue = (dateStr: string) => {
  if (!dateStr) return false
  const dStr = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.split(' ')[0]
  const [y, m, d] = dStr.split('-').map(Number)
  const itemDate = new Date(y, m - 1, d)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return itemDate.getTime() < today.getTime()
}

export function ProtocoloTableRow({ item, index, onEdit, onDelete }: any) {
  // Highlight strictly if status is "Prov. Inicial" and it's overdue
  const overdue = item.status === 'Prov. Inicial' && isOverdue(item.dprotocolo)

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
      className={`group transition-colors ${overdue ? 'bg-rose-50/60 hover:bg-rose-50/80 dark:bg-rose-950/20 dark:hover:bg-rose-950/30' : ''}`}
    >
      <TableCell className={`w-10 font-medium ${overdue ? 'border-l-2 border-l-rose-500' : ''}`}>
        {index}
      </TableCell>
      <TableCell className="font-semibold whitespace-nowrap">{item.nome}</TableCell>
      <TableCell className="whitespace-nowrap text-muted-foreground">
        {item.expand?.tipo_acao?.nome || '—'}
      </TableCell>
      <TableCell className="whitespace-nowrap text-muted-foreground">
        {item.expand?.responsavel?.nome || '—'}
      </TableCell>
      <TableCell>
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap ${st.color}`}
        >
          <StatusIcon className="h-3 w-3" />
          {item.status}
        </span>
      </TableCell>
      <TableCell className="whitespace-nowrap text-muted-foreground">
        {item.dcalculo ? format(parseISO(item.dcalculo), 'dd/MM/yy') : '—'}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          {overdue && <AlertTriangle className="h-4 w-4 text-rose-500" />}
          <span className={overdue ? 'text-rose-600 font-bold' : 'text-muted-foreground'}>
            {item.dprotocolo ? format(parseISO(item.dprotocolo), 'dd/MM/yy') : '—'}
          </span>
        </div>
      </TableCell>
      <TableCell className="whitespace-nowrap">
        {item.nautos ? (
          <span className="font-mono text-xs bg-muted text-muted-foreground px-2 py-1 rounded border">
            {item.nautos}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="text-right whitespace-nowrap font-medium">
        {item.valor ? formatCurrency(item.valor) : <span className="text-muted-foreground">—</span>}
      </TableCell>
      <TableCell className="text-right font-bold whitespace-nowrap text-muted-foreground">
        {honorarios}
      </TableCell>
      <TableCell className={`${decColor} whitespace-nowrap`}>
        {item.decisao === 'Aguardando' ? '—' : item.decisao}
      </TableCell>
      <TableCell>
        <div className="flex items-center justify-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
            onClick={onEdit}
            title="Editar"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-[#E84040] hover:text-[#d63838] hover:bg-rose-50 dark:hover:bg-rose-950/30"
            onClick={onDelete}
            title="Excluir"
          >
            <Trash className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}
