import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { calculateDailyBalance } from '@/lib/ponto-utils'
import { useAuth } from '@/hooks/use-auth'

interface EditModalProps {
  isOpen: boolean
  onClose: () => void
  rowData: any
  funcionario: any
  onSave: (data: any) => Promise<void>
}

export function EditRegistroModal({
  isOpen,
  onClose,
  rowData,
  funcionario,
  onSave,
}: EditModalProps) {
  const { user } = useAuth()
  const [formData, setFormData] = useState<any>({})
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (isOpen && rowData) {
      setFormData({
        entrada1: rowData.entrada1 || '',
        saida1: rowData.saida1 || '',
        entrada2: rowData.entrada2 || '',
        saida2: rowData.saida2 || '',
        tipo_dia: rowData.tipo_dia || 'normal',
        justificativa: rowData.justificativa || '',
        horas_atestado: rowData.horas_atestado || 0,
      })
    }
  }, [isOpen, rowData])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const cargaMins = funcionario.carga_diaria || 480
      const hAtestado = formData.tipo_dia === 'atestado' ? Number(formData.horas_atestado) || 0 : 0

      const {
        horas_trabalhadas: hTrab,
        saldo_dia: saldo,
        tipo_dia_sugerido,
      } = calculateDailyBalance(
        formData.entrada1,
        formData.saida1,
        formData.entrada2,
        formData.saida2,
        cargaMins,
        formData.tipo_dia,
        hAtestado * 60,
        rowData.date,
      )

      const dataToSave = {
        funcionario_id: funcionario.id,
        data: new Date(
          rowData.date.getFullYear(),
          rowData.date.getMonth(),
          rowData.date.getDate(),
          12,
        ).toISOString(),
        dia_semana: format(rowData.date, 'EEEE', { locale: ptBR }),
        entrada1: formData.entrada1,
        saida1: formData.saida1,
        entrada2: formData.entrada2,
        saida2: formData.saida2,
        horas_trabalhadas: hTrab,
        saldo_dia: saldo,
        tipo_dia: tipo_dia_sugerido || formData.tipo_dia,
        justificativa: formData.justificativa,
        horas_atestado: hAtestado,
        editado_por: user?.name || 'Admin',
      }

      await onSave({ id: rowData.id, ...dataToSave })
      onClose()
    } finally {
      setIsSaving(false)
    }
  }

  if (!rowData) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Registro — {format(rowData.date, 'dd/MM/yyyy')}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Entrada 1</Label>
              <Input
                type="time"
                value={formData.entrada1}
                onChange={(e) => setFormData({ ...formData, entrada1: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Saída 1</Label>
              <Input
                type="time"
                value={formData.saida1}
                onChange={(e) => setFormData({ ...formData, saida1: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Entrada 2</Label>
              <Input
                type="time"
                value={formData.entrada2}
                onChange={(e) => setFormData({ ...formData, entrada2: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Saída 2</Label>
              <Input
                type="time"
                value={formData.saida2}
                onChange={(e) => setFormData({ ...formData, saida2: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Tipo do Dia</Label>
            <Select
              value={formData.tipo_dia}
              onValueChange={(v) => setFormData({ ...formData, tipo_dia: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="falta">Falta</SelectItem>
                <SelectItem value="feriado">Feriado</SelectItem>
                <SelectItem value="atestado">Atestado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {formData.tipo_dia === 'atestado' && (
            <div className="space-y-2">
              <Label>Horas cobertas pelo atestado</Label>
              <Input
                type="number"
                step="0.5"
                value={formData.horas_atestado}
                onChange={(e) => setFormData({ ...formData, horas_atestado: e.target.value })}
              />
            </div>
          )}
          <div className="space-y-2">
            <Label>Justificativa</Label>
            <Textarea
              value={formData.justificativa}
              onChange={(e) => setFormData({ ...formData, justificativa: e.target.value })}
              placeholder="Motivo da alteração, atestado, etc."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-[#C8922A] hover:bg-[#C8922A]/90"
          >
            {isSaving ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
