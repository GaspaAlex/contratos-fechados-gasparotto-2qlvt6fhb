import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Pericia, deletePericia } from '@/services/pericias'
import { AlertTriangle } from 'lucide-react'

export function DeleteModal({ item, onClose }: { item: Pericia | null; onClose: () => void }) {
  const handleDelete = async () => {
    if (item) {
      await deletePericia(item.id)
      onClose()
    }
  }

  return (
    <Dialog open={!!item} onOpenChange={(val) => !val && onClose()}>
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
          <div className="text-xs sm:text-sm text-[#78818E] dark:text-muted-foreground pt-1">
            Deseja excluir a perícia de{' '}
            <strong className="text-[#252B34] dark:text-foreground font-semibold">
              {item?.nome}
            </strong>
            ?
          </div>
        </DialogHeader>

        <div className="text-xs text-[#78818E] dark:text-muted-foreground bg-[#B4453C]/[0.05] border border-[#B4453C]/20 p-3 rounded-md mt-2">
          Esta ação é irreversível. O registro será removido do sistema.
        </div>

        <DialogFooter className="mt-5 flex gap-2 justify-end pt-3 border-t border-[#E4E7EB]/80 dark:border-border/80 w-full">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="h-8 px-3 text-xs border-[#E4E7EB] dark:border-border rounded-md text-[#78818E] hover:text-[#252B34] dark:hover:text-foreground"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="h-8 px-4 text-xs font-semibold bg-[#B4453C] hover:bg-[#9c3a32] text-white rounded-md shadow-sm"
            onClick={handleDelete}
          >
            Excluir permanentemente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
