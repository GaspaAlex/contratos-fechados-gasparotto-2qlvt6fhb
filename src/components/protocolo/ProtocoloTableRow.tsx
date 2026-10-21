import { TableCell, TableRow } from '@/components/ui/table'
import { format, parseISO } from 'date-fns'
import {
  Edit,
  Trash,
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  FileText,
  StickyNote,
  UserCheck,
  CalendarClock,
  Clock,
  Calculator,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/formatters'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { getReviewStatus, normalizeDateCivil, isProtocoloOverdue } from '@/lib/date-utils'
import { cn } from '@/lib/utils'

export function ProtocoloTableRow({ item, index, onEdit, onDelete }: any) {
  // Highlight strictly if status is "Prov. Inicial" and it's overdue
  const overdue = isProtocoloOverdue(item)
  const faltaDocs = item.status === 'R. Docs'

  const reviewStatus = getReviewStatus(item.revisar_em)
  const reviewCivil = normalizeDateCivil(item.revisar_em)
  const formatReviewDate = (civilStr: string) => {
    const [y, m, d] = civilStr.split('-')
    if (!d) return civilStr
    return `${d}/${m}/${y}`
  }

  const STATUS_LABELS: Record<string, string> = {
    'R. Docs': 'Faltando Documentos',
  }

  const statusConfig: Record<string, { color: string; icon: any }> = {
    'Protocolado Judicial': {
      color: 'text-[#3E8E5A] bg-[#3E8E5A]/10 border border-[#3E8E5A]/25 dark:text-green-400',
      icon: CheckCircle2,
    },
    'Protocolado Administrativo': {
      color: 'text-[#2E7D5B] bg-[#2E7D5B]/10 border border-[#2E7D5B]/25 dark:text-emerald-400',
      icon: CheckCircle2,
    },
    'Requerimento Adm.': {
      color: 'text-[#4A7FA5] bg-[#4A7FA5]/10 border border-[#4A7FA5]/25 dark:text-sky-400',
      icon: ClipboardList,
    },
    'Prov. Inicial': {
      color: 'text-[#2B6CB0] bg-[#2B6CB0]/10 border border-[#2B6CB0]/25 dark:text-blue-400',
      icon: FileText,
    },
    Calculado: {
      color: 'text-[#8A56AC] bg-[#8A56AC]/10 border border-[#8A56AC]/25 dark:text-purple-400',
      icon: Calculator,
    },
    'R. Docs': {
      color: 'text-[#C77E1E] bg-[#C77E1E]/10 border border-[#C77E1E]/25 dark:text-amber-400',
      icon: AlertTriangle,
    },
  }

  const st = statusConfig[item.status] || {
    color: 'text-[#78818E] bg-[#F5F6F8] border border-[#E4E7EB]',
    icon: FileText,
  }
  const StatusIcon = st.icon

  const percentual = item.parceiro ? 0.15 : 0.3
  const honorarios =
    item.decisao === 'Improcedente' || !item.valor
      ? '—'
      : `${formatCurrency(item.valor * percentual)} (${Math.round(percentual * 100)}%)`

  return (
    <TableRow
      className={cn(
        'group transition-colors h-11 relative',
        overdue
          ? 'bg-[#B4453C]/[0.05] hover:bg-[#B4453C]/[0.09] dark:bg-[#B4453C]/10'
          : faltaDocs
            ? 'bg-[#C77E1E]/[0.05] hover:bg-[#C77E1E]/[0.09] dark:bg-[#C77E1E]/10'
            : 'hover:bg-[#F5F6F8]/70 dark:hover:bg-muted/30',
      )}
    >
      {/* Coluna # com marcação de borda lateral semântica */}
      <TableCell
        className={cn(
          'w-10 pl-4 text-xs font-medium tabular-nums relative',
          overdue && 'font-bold text-[#B4453C]',
          faltaDocs && !overdue && 'font-semibold text-[#C77E1E]',
        )}
      >
        {overdue ? (
          <span
            className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#B4453C]"
            aria-hidden="true"
          />
        ) : faltaDocs ? (
          <span
            className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#C77E1E]"
            aria-hidden="true"
          />
        ) : null}
        {index}
      </TableCell>

      {/* Nome + Tooltips */}
      <TableCell className="font-semibold text-xs whitespace-nowrap text-[#252B34] dark:text-foreground">
        <div className="flex items-center gap-2">
          <span className="truncate max-w-[220px]" title={item.nome}>
            {item.nome}
          </span>
          {item.observacoes && (
            <Tooltip>
              <TooltipTrigger asChild>
                <StickyNote className="h-3.5 w-3.5 text-[#C9922A] cursor-help shrink-0" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs md:max-w-sm">
                <p className="whitespace-pre-line break-words text-xs">{item.observacoes}</p>
              </TooltipContent>
            </Tooltip>
          )}
          {reviewStatus && reviewCivil && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex items-center cursor-help shrink-0">
                  <CalendarClock
                    className={cn(
                      'h-3.5 w-3.5',
                      reviewStatus === 'past' && 'text-[#B4453C]',
                      reviewStatus === 'today' && 'text-[#C77E1E] animate-pulse',
                      reviewStatus === 'future' && 'text-[#78818E]/80 hover:text-[#C9922A]',
                    )}
                  />
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">
                  Revisar em: {formatReviewDate(reviewCivil)}
                  {reviewStatus === 'past' && ' (Atrasada)'}
                  {reviewStatus === 'today' && ' (Hoje)'}
                </p>
              </TooltipContent>
            </Tooltip>
          )}
          {item.representante && (
            <Tooltip>
              <TooltipTrigger asChild>
                <UserCheck className="h-3.5 w-3.5 text-[#C9922A] cursor-help shrink-0" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">
                  Representante: {item.representante_nome || 'Não informado'}
                </p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </TableCell>

      {/* Benefício */}
      <TableCell className="whitespace-nowrap text-xs text-[#78818E] dark:text-muted-foreground">
        {item.expand?.tipo_acao?.nome || '—'}
      </TableCell>

      {/* Responsável */}
      <TableCell className="whitespace-nowrap text-xs text-[#78818E] dark:text-muted-foreground font-medium">
        {item.expand?.responsavel?.nome || item.responsavel || '—'}
      </TableCell>

      {/* Status */}
      <TableCell>
        <span
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap',
            st.color,
          )}
        >
          <StatusIcon className="h-3 w-3" />
          {STATUS_LABELS[item.status] || item.status}
        </span>
      </TableCell>

      {/* Origem */}
      <TableCell>
        {item.origem === 'Campanha Meta' || item.origem === 'Campanha' ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#3E8E5A]/10 text-[#3E8E5A] border border-[#3E8E5A]/25 whitespace-nowrap">
            Campanha Meta
          </span>
        ) : item.origem === 'Campanha Google' ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#4A7FA5]/10 text-[#4A7FA5] border border-[#4A7FA5]/25 whitespace-nowrap">
            Campanha Google
          </span>
        ) : item.origem === 'Canal YouTube' ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#B4453C]/10 text-[#B4453C] border border-[#B4453C]/25 whitespace-nowrap">
            Canal YouTube
          </span>
        ) : item.origem === 'Macohin' ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#8A56AC]/10 text-[#8A56AC] border border-[#8A56AC]/25 whitespace-nowrap">
            Macohin
          </span>
        ) : item.origem === 'Particular' ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#78818E]/10 text-[#252B34] dark:text-[#E4E7EB] border border-[#78818E]/25 whitespace-nowrap">
            Particular
          </span>
        ) : item.origem ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#F5F6F8] dark:bg-muted text-[#252B34] dark:text-foreground border border-[#E4E7EB] dark:border-border whitespace-nowrap">
            {item.origem}
          </span>
        ) : (
          <span className="text-xs text-[#A0A7B5]">—</span>
        )}
      </TableCell>

      {/* Parceiro */}
      <TableCell className="whitespace-nowrap text-xs text-[#78818E] dark:text-muted-foreground">
        {item.parceiro || '—'}
      </TableCell>

      {/* D. Contrato */}
      <TableCell className="whitespace-nowrap text-xs text-[#78818E] dark:text-muted-foreground tabular-nums">
        {item.dcontrato ? format(parseISO(item.dcontrato), 'dd/MM/yyyy') : '—'}
      </TableCell>

      {/* D. Cálculo */}
      <TableCell className="whitespace-nowrap text-xs text-[#78818E] dark:text-muted-foreground tabular-nums">
        {item.dcalculo ? format(parseISO(item.dcalculo), 'dd/MM/yyyy') : '—'}
      </TableCell>

      {/* D. Protocolo com destaque refinado de atraso */}
      <TableCell>
        <div className="flex items-center gap-1.5 whitespace-nowrap text-xs tabular-nums">
          {overdue && <Clock className="h-3.5 w-3.5 text-[#B4453C] shrink-0" />}
          <span
            className={cn(
              overdue
                ? 'text-[#B4453C] dark:text-red-400 font-bold'
                : 'text-[#78818E] dark:text-muted-foreground',
            )}
          >
            {item.dprotocolo ? format(parseISO(item.dprotocolo), 'dd/MM/yyyy') : '—'}
          </span>
        </div>
      </TableCell>

      {/* Nº Autos */}
      <TableCell className="whitespace-nowrap text-xs">
        {item.nautos ? (
          <span className="font-mono text-[11px] bg-[#F5F6F8] dark:bg-muted/50 text-[#252B34] dark:text-foreground px-2 py-0.5 rounded border border-[#E4E7EB] dark:border-border">
            {item.nautos}
          </span>
        ) : (
          <span className="text-xs text-[#A0A7B5]">—</span>
        )}
      </TableCell>

      {/* Valor Causa */}
      <TableCell className="text-right whitespace-nowrap text-xs font-medium text-[#252B34] dark:text-foreground tabular-nums">
        {item.valor ? (
          formatCurrency(item.valor)
        ) : (
          <span className="text-xs text-[#A0A7B5]">—</span>
        )}
      </TableCell>

      {/* Honorários Projetados */}
      <TableCell className="text-right font-bold text-xs whitespace-nowrap text-[#C9922A] tabular-nums">
        {honorarios}
      </TableCell>

      {/* Decisão */}
      <TableCell className="whitespace-nowrap text-xs">
        {item.decisao === 'Procedente' ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#3E8E5A]/10 text-[#3E8E5A] border border-[#3E8E5A]/25">
            Procedente
          </span>
        ) : item.decisao === 'Improcedente' ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#B4453C]/10 text-[#B4453C] border border-[#B4453C]/25">
            Improcedente
          </span>
        ) : (
          <span className="text-xs text-[#A0A7B5]">—</span>
        )}
      </TableCell>

      {/* Ações */}
      <TableCell className="pr-4">
        <div className="flex items-center justify-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-[#78818E] hover:text-[#252B34] hover:bg-[#F5F6F8] dark:hover:bg-muted/50 rounded-md transition-colors"
            onClick={onEdit}
            title="Editar protocolo"
          >
            <Edit className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-[#B4453C] hover:text-[#B4453C] hover:bg-[#B4453C]/10 rounded-md transition-colors"
            onClick={onDelete}
            title="Excluir protocolo"
          >
            <Trash className="h-3.5 w-3.5" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}
