import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { deleteContrato } from '@/services/contratos'
import { toast } from 'sonner'
import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'

export function DeleteModal({
  isOpen,
  onClose,
  contract,
}: {
  isOpen: boolean
  onClose: () => void
  contract: any
}) {
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    if (!contract) return
    try {
      setLoading(true)
      await deleteContrato(contract.id)
      toast.success('Contrato excluído permanentemente.')
      onClose()
    } catch (err: any) {
      toast.error('Erro ao excluir: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md rounded-[10px] border border-[#E4E7EB] dark:border-border p-5 sm:p-6 shadow-lg bg-white dark:bg-card">
        <DialogHeader className="pb-2">
          <div className="flex items-center gap-2.5 text-[#B4453C] mb-1">
            <div className="h-8 w-8 rounded-lg bg-[#B4453C]/10 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-4 w-4 text-[#B4453C]" />
            </div>
            <DialogTitle className="text-base sm:text-lg font-bold text-[#252B34] dark:text-foreground">
              Confirmar Exclusão
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs sm:text-sm text-[#78818E] dark:text-muted-foreground pt-1">
            Tem certeza que deseja excluir o contrato de{' '}
            <strong className="text-[#252B34] dark:text-foreground font-semibold">
              {contract?.nome}
            </strong>
            ?
          </DialogDescription>
        </DialogHeader>

        <div className="text-xs text-[#78818E] dark:text-muted-foreground bg-[#B4453C]/[0.05] border border-[#B4453C]/20 p-3 rounded-md mt-2">
          Esta ação é irreversível. O registro e seu histórico serão removidos do sistema.
        </div>

        <DialogFooter className="mt-5 flex gap-2 justify-end pt-3 border-t border-[#E4E7EB]/80 dark:border-border/80">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="h-8 px-3 text-xs border-[#E4E7EB] dark:border-border rounded-md text-[#78818E] hover:text-[#252B34]"
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
            className="h-8 px-4 text-xs font-semibold bg-[#B4453C] hover:bg-[#9c3a32] text-white rounded-md shadow-sm"
          >
            {loading ? 'Excluindo...' : 'Excluir permanentemente'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
