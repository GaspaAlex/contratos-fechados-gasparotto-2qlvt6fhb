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
      <DialogContent className="sm:max-w-[400px] rounded-[10px]">
        <DialogHeader className="flex flex-col items-center text-center pt-2">
          <div className="h-14 w-14 rounded-full bg-rose-100 flex items-center justify-center mb-4 dark:bg-rose-500/20">
            <AlertTriangle className="h-7 w-7 text-rose-600 dark:text-rose-500" />
          </div>
          <DialogTitle className="text-xl text-rose-600 dark:text-rose-500">
            Excluir Perícia
          </DialogTitle>
        </DialogHeader>
        <div className="text-center py-2 text-muted-foreground">
          Deseja excluir a perícia de <strong className="text-foreground">{item?.nome}</strong>?
          <br /> Esta ação não pode ser desfeita.
        </div>
        <DialogFooter className="flex gap-2 sm:justify-center w-full mt-4 pb-2">
          <Button type="button" variant="ghost" className="w-full sm:w-auto" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="w-full sm:w-auto bg-rose-600 hover:bg-rose-700"
            onClick={handleDelete}
          >
            Excluir permanentemente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
