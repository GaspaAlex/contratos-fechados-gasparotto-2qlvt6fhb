import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { consultarProtocolosDoContrato, formatDateBR } from '@/lib/abrirEmProtocolo'
import { useState } from 'react'
import { toast } from 'sonner'

/**
 * Passo de decisão da ação "Abrir em Protocolo" (linha de Contratos Fechados).
 * Recebe o resultado da consulta já feita pelo pai (ContractsTable):
 *  - 0 protocolos → nunca renderiza (o pai navega direto com prefill);
 *  - 1 protocolo → nunca renderiza (o pai navega direto para o registro);
 *  - >1 → lista os registros para o usuário escolher qual abrir,
 *    preservando todos os vínculos atuais.
 */
export function AbrirEmProtocoloDialog({
  contrato,
  open,
  protocolos,
  loading,
  onOpenChange,
  onAbrir,
}: {
  contrato: any
  open: boolean
  protocolos: any[]
  loading: boolean
  onOpenChange: (o: boolean) => void
  onAbrir: (p: any) => void
}) {
  const [recarregando, setRecarregando] = useState(false)

  const recarregar = async () => {
    if (!contrato) return
    setRecarregando(true)
    try {
      const novos = await consultarProtocolosDoContrato(contrato.id)
      if (novos.length === 1) onAbrir(novos[0])
    } catch (e: any) {
      toast.error('Erro ao reconsultar protocolos: ' + (e?.message || 'erro desconhecido'))
    } finally {
      setRecarregando(false)
    }
  }

  if (!contrato) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-[#C9922A]">
            Protocolos vinculados — {contrato.nome || 'Contrato'}
          </DialogTitle>
          <DialogDescription className="text-xs text-[#78818E] dark:text-muted-foreground">
            Mais de um protocolo está vinculado a este contrato. Escolha qual deseja abrir — os
            vínculos atuais são preservados.
          </DialogDescription>
        </DialogHeader>
        {loading || recarregando ? (
          <p className="text-sm text-[#78818E] dark:text-muted-foreground">Consultando...</p>
        ) : (
          <div className="rounded-[10px] border border-[#E4E7EB] dark:border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[10px] uppercase tracking-wider">STATUS</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider">
                    D. PROTOCOLO
                  </TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider">AÇÃO</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {protocolos.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-xs font-medium">{p.status || '—'}</TableCell>
                    <TableCell className="text-xs tabular-nums">
                      {formatDateBR(p.dprotocolo) || '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        className="h-7 text-xs bg-[#C9922A] hover:bg-[#C9922A]/90 text-white font-bold"
                        onClick={() => onAbrir(p)}
                      >
                        Abrir
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={recarregar} disabled={recarregando}>
            Reconsultar
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
