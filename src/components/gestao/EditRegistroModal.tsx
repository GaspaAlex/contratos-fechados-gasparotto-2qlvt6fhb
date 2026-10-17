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
        funcionario.horario_entrada,
        funcionario.horario_saida,
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
      <DialogContent className="sm:max-w-[500px] rounded-[10px] border border-[#E4E7EB] dark:border-border bg-white dark:bg-card p-6 shadow-lg">
        <DialogHeader className="space-y-1.5 pb-2 border-b border-[#E4E7EB]/80 dark:border-border/80">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center text-[10px] font-bold tracking-[1.5px] uppercase text-[#C9922A] bg-[#C9922A]/10 px-2 py-0.5 rounded">
              AJUSTE DE MARCAÇÃO
            </span>
          </div>
          <DialogTitle className="text-xl font-bold text-[#252B34] dark:text-foreground">
            Editar Registro — {format(rowData.date, 'dd/MM/yyyy')}
          </DialogTitle>
          <p className="text-xs text-[#78818E] dark:text-muted-foreground">
            Colaborador(a):{' '}
            <strong className="text-[#252B34] dark:text-foreground">{funcionario?.nome}</strong>
          </p>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#252B34] dark:text-foreground">
                Entrada 1
              </Label>
              <Input
                type="time"
                value={formData.entrada1}
                onChange={(e) => setFormData({ ...formData, entrada1: e.target.value })}
                className="h-9 text-xs border-[#E4E7EB] dark:border-border focus-visible:ring-[#C9922A] rounded-md font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#252B34] dark:text-foreground">
                Saída 1
              </Label>
              <Input
                type="time"
                value={formData.saida1}
                onChange={(e) => setFormData({ ...formData, saida1: e.target.value })}
                className="h-9 text-xs border-[#E4E7EB] dark:border-border focus-visible:ring-[#C9922A] rounded-md font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#252B34] dark:text-foreground">
                Entrada 2
              </Label>
              <Input
                type="time"
                value={formData.entrada2}
                onChange={(e) => setFormData({ ...formData, entrada2: e.target.value })}
                className="h-9 text-xs border-[#E4E7EB] dark:border-border focus-visible:ring-[#C9922A] rounded-md font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#252B34] dark:text-foreground">
                Saída 2
              </Label>
              <Input
                type="time"
                value={formData.saida2}
                onChange={(e) => setFormData({ ...formData, saida2: e.target.value })}
                className="h-9 text-xs border-[#E4E7EB] dark:border-border focus-visible:ring-[#C9922A] rounded-md font-mono"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[#252B34] dark:text-foreground">
              Tipo do Dia
            </Label>
            <Select
              value={formData.tipo_dia}
              onValueChange={(v) => setFormData({ ...formData, tipo_dia: v })}
            >
              <SelectTrigger className="h-9 text-xs border-[#E4E7EB] dark:border-border bg-white dark:bg-card rounded-md focus:ring-[#C9922A]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal" className="text-xs">
                  Normal
                </SelectItem>
                <SelectItem value="falta" className="text-xs">
                  Falta
                </SelectItem>
                <SelectItem value="feriado" className="text-xs">
                  Feriado
                </SelectItem>
                <SelectItem value="atestado" className="text-xs">
                  Atestado
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.tipo_dia === 'atestado' && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#252B34] dark:text-foreground">
                Horas cobertas pelo atestado
              </Label>
              <Input
                type="number"
                step="0.5"
                value={formData.horas_atestado}
                onChange={(e) => setFormData({ ...formData, horas_atestado: e.target.value })}
                className="h-9 text-xs border-[#E4E7EB] dark:border-border focus-visible:ring-[#C9922A] rounded-md font-mono"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[#252B34] dark:text-foreground">
              Justificativa
            </Label>
            <Textarea
              value={formData.justificativa}
              onChange={(e) => setFormData({ ...formData, justificativa: e.target.value })}
              placeholder="Motivo da alteração, número de atestado médico, etc."
              className="min-h-[80px] text-xs border-[#E4E7EB] dark:border-border focus-visible:ring-[#C9922A] rounded-md"
            />
          </div>
        </div>

        <DialogFooter className="pt-2 border-t border-[#E4E7EB]/80 dark:border-border/80 gap-2 sm:justify-end">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
            className="h-9 px-4 text-xs font-medium border-[#E4E7EB] dark:border-border hover:bg-[#FAF8F2] dark:hover:bg-muted/40 text-[#78818E] rounded-md"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="h-9 px-4 text-xs font-semibold bg-[#C9922A] hover:bg-[#b58324] text-white rounded-md shadow-sm transition-colors"
          >
            {isSaving ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
