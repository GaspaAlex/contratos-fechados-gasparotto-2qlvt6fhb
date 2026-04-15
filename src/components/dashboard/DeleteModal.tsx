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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir Contrato</DialogTitle>
          <DialogDescription className="py-4 text-base">
            Tem certeza que deseja excluir o contrato de{' '}
            <strong className="text-foreground">{contract?.nome}</strong>? Esta ação é permanente e
            não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            Excluir permanentemente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
