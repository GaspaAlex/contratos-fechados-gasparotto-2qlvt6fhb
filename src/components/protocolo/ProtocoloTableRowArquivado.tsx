import { TableCell, TableRow } from '@/components/ui/table'
import { format, parseISO } from 'date-fns'
import { Edit, Trash, Archive } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/formatters'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

/**
 * Linha de protocolo com contrato(s) relacionado(s) ARQUIVADO(S).
 * Permanece visível e editável, mas com aparência inativa (padrão
 * Contratos Fechados): linha acinzentada, textos tachados onde coerente e
 * indicação discreta do status real do contrato. NÃO altera protocolo.status.
 */
export function ProtocoloTableRowArquivado({ item, index, statusContrato, onEdit, onDelete }: any) {
  const STATUS_LABELS: Record<string, string> = {
    'R. Docs': 'Faltando Documentos',
  }

  const muted = 'text-[#A0A7B5] dark:text-muted-foreground/60'

  return (
    <TableRow className="group transition-colors h-11 relative bg-[#F5F6F8]/50 hover:bg-[#F5F6F8]/80 dark:bg-muted/20 dark:hover:bg-muted/30 opacity-80">
      <TableCell className="w-10 pl-4 text-xs font-medium tabular-nums text-[#A0A7B5] dark:text-muted-foreground/60">
        {index}
      </TableCell>

      {/* Nome tachado + indicação discreta do status do contrato */}
      <TableCell className="font-semibold text-xs whitespace-nowrap">
        <div className="flex items-center gap-2">
          <span className={cn('truncate max-w-[200px] line-through', muted)} title={item.nome}>
            {item.nome}
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-[#78818E]/10 text-[#78818E] dark:text-muted-foreground border border-[#78818E]/20 cursor-help shrink-0">
                <Archive className="h-3 w-3" />
                Contrato: {statusContrato}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs max-w-xs">
                Fora da projeção: contrato relacionado com status “{statusContrato}”. O protocolo
                continua visível e editável.
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
      </TableCell>

      {/* Benefício */}
      <TableCell className={cn('whitespace-nowrap text-xs', muted)}>
        {item.expand?.tipo_acao?.nome || '—'}
      </TableCell>

      {/* Responsável */}
      <TableCell className={cn('whitespace-nowrap text-xs', muted)}>
        {item.expand?.responsavel?.nome || item.responsavel || '—'}
      </TableCell>

      {/* Status (protocolo.status NÃO é alterado) */}
      <TableCell>
        <span
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap line-through bg-[#F5F6F8] dark:bg-muted/50 border border-[#E4E7EB] dark:border-border',
            muted,
          )}
        >
          {STATUS_LABELS[item.status] || item.status}
        </span>
      </TableCell>

      {/* Origem */}
      <TableCell className={cn('whitespace-nowrap text-xs', muted)}>{item.origem || '—'}</TableCell>

      {/* Parceiro */}
      <TableCell className={cn('whitespace-nowrap text-xs', muted)}>
        {item.parceiro || '—'}
      </TableCell>

      {/* D. Contrato */}
      <TableCell className={cn('whitespace-nowrap text-xs tabular-nums', muted)}>
        {item.dcontrato ? format(parseISO(item.dcontrato), 'dd/MM/yyyy') : '—'}
      </TableCell>

      {/* D. Cálculo */}
      <TableCell className={cn('whitespace-nowrap text-xs tabular-nums', muted)}>
        {item.dcalculo ? format(parseISO(item.dcalculo), 'dd/MM/yyyy') : '—'}
      </TableCell>

      {/* D. Protocolo */}
      <TableCell className={cn('whitespace-nowrap text-xs tabular-nums', muted)}>
        {item.dprotocolo ? format(parseISO(item.dprotocolo), 'dd/MM/yyyy') : '—'}
      </TableCell>

      {/* Nº Autos */}
      <TableCell className={cn('whitespace-nowrap text-xs', muted)}>{item.nautos || '—'}</TableCell>

      {/* Valor */}
      <TableCell className={cn('text-right whitespace-nowrap text-xs tabular-nums', muted)}>
        {item.valor ? <span className="line-through">{formatCurrency(item.valor)}</span> : '—'}
      </TableCell>

      {/* Honorários */}
      <TableCell className={cn('text-right whitespace-nowrap text-xs tabular-nums', muted)}>
        {item.decisao === 'Improcedente' || !item.valor ? (
          '—'
        ) : (
          <span className="line-through">
            {formatCurrency(item.valor * (item.parceiro ? 0.15 : 0.3))}
          </span>
        )}
      </TableCell>

      {/* Decisão */}
      <TableCell className={cn('whitespace-nowrap text-xs', muted)}>
        {item.decisao === 'Procedente' || item.decisao === 'Improcedente' ? (
          <span className="line-through">{item.decisao}</span>
        ) : (
          '—'
        )}
      </TableCell>

      {/* Ações — permanece editável */}
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
