import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createRpv, updateRpv } from '@/services/rpv'
import { toast } from 'sonner'
import { STATUS_OPTIONS } from './constants'

export function RpvFormModal({
  open,
  onOpenChange,
  record,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  record: any
}) {
  const [formData, setFormData] = useState<any>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      setFormData(
        record || {
          nome: '',
          cpf: '',
          numero_processo: '',
          tipo: 'RPV',
          valor_rpv: 0,
          sucumbencia: 0,
          status: 'Aguardando pagamento',
          tipo_parceria: 'Sem parceria',
          previsao_pagamento: '',
        },
      )
    }
  }, [open, record])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const dataToSave = {
        ...formData,
        valor_rpv: Number(formData.valor_rpv) || 0,
        sucumbencia: Number(formData.sucumbencia) || 0,
        recebido: formData.status === 'Recebido',
      }

      if (record?.id) {
        await updateRpv(record.id, dataToSave)
        toast.success('Registro atualizado com sucesso')
      } else {
        await createRpv(dataToSave)
        toast.success('Registro criado com sucesso')
      }
      onOpenChange(false)
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar o registro')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: string, val: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: val }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{record ? 'Editar Registro' : 'Novo Registro'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                required
                value={formData.nome || ''}
                onChange={(e) => handleChange('nome', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>CPF *</Label>
              <Input
                required
                value={formData.cpf || ''}
                onChange={(e) => handleChange('cpf', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Nº Processo</Label>
              <Input
                value={formData.numero_processo || ''}
                onChange={(e) => handleChange('numero_processo', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={formData.tipo} onValueChange={(v) => handleChange('tipo', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RPV">RPV</SelectItem>
                  <SelectItem value="Precatório">Precatório</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Valor (Honorários) R$</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.valor_rpv || ''}
                onChange={(e) => handleChange('valor_rpv', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Sucumbência R$</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.sucumbencia || ''}
                onChange={(e) => handleChange('sucumbencia', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => handleChange('status', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Parceria</Label>
              <Select
                value={formData.tipo_parceria}
                onValueChange={(v) => handleChange('tipo_parceria', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sem parceria">Sem parceria</SelectItem>
                  <SelectItem value="Macohin">Macohin</SelectItem>
                  <SelectItem value="Macohin + Rogério">Macohin + Rogério</SelectItem>
                  <SelectItem value="Macohin + Luciana">Macohin + Luciana</SelectItem>
                  <SelectItem value="Carnevale">Carnevale</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Previsão Pagamento (MM/YYYY)</Label>
              <Input
                placeholder="Ex: 06/2026"
                value={formData.previsao_pagamento || ''}
                onChange={(e) => handleChange('previsao_pagamento', e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-[#C9922A] hover:bg-[#b07d20] text-white"
            >
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
