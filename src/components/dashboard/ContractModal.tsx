import { useState, useEffect } from 'react'
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
import { Checkbox } from '@/components/ui/checkbox'
import { AlertTriangle, Plus } from 'lucide-react'
import { createContrato, updateContrato, toPBDate, toYMD } from '@/services/contratos'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const BENEFICIOS = ['Aux. Acidente', 'Aposentadoria', 'BPC/LOAS', 'DER', 'Pensão por Morte']
const RESPONSAVEIS = ['João', 'Maria', 'Pedro', 'Juliana', 'Ana', 'Carlos', 'Paulo']
const STATUSES = [
  'R. Docs',
  'L. Cálculos',
  'OK',
  'Ag. Perícia',
  'Sem Qualidade de Segurado',
  'Tem Advogado',
  'Litispendência',
]
const ARCHIVED_STATUSES = ['Sem Qualidade de Segurado', 'Tem Advogado', 'Litispendência']

export function ContractModal({
  isOpen,
  onClose,
  contract,
}: {
  isOpen: boolean
  onClose: () => void
  contract: any
}) {
  const isEdit = !!contract
  const [loading, setLoading] = useState(false)
  const [customBeneficio, setCustomBeneficio] = useState(false)

  const [formData, setFormData] = useState({
    nome: '',
    fone: '',
    beneficio: '',
    responsavel: '',
    fup: false,
    status: 'R. Docs',
    dcontrato: '',
    dcalculo: '',
    prazo: 15,
    dprotocolo: '',
    parceria: false,
    parceiro_nome: '',
    parceiro_comissao: 0,
  })

  useEffect(() => {
    if (isOpen) {
      if (contract) {
        setFormData({
          nome: contract.nome || '',
          fone: contract.fone || '',
          beneficio: contract.beneficio || '',
          responsavel: contract.responsavel || '',
          fup: contract.fup || false,
          status: contract.status || 'R. Docs',
          dcontrato: toYMD(contract.dcontrato) || '',
          dcalculo: toYMD(contract.dcalculo) || '',
          prazo: contract.prazo || 15,
          dprotocolo: toYMD(contract.dprotocolo) || '',
          parceria: contract.parceria || false,
          parceiro_nome: contract.parceiro_nome || '',
          parceiro_comissao: contract.parceiro_comissao || 0,
        })
        setCustomBeneficio(!BENEFICIOS.includes(contract.beneficio || '') && !!contract.beneficio)
      } else {
        setFormData({
          nome: '',
          fone: '',
          beneficio: '',
          responsavel: '',
          fup: false,
          status: 'R. Docs',
          dcontrato: new Date().toISOString().split('T')[0],
          dcalculo: '',
          prazo: 15,
          dprotocolo: '',
          parceria: false,
          parceiro_nome: '',
          parceiro_comissao: 0,
        })
        setCustomBeneficio(false)
      }
    }
  }, [isOpen, contract])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.nome || !formData.dcontrato) {
      toast.error('Preencha os campos obrigatórios (Nome e Data do Contrato).')
      return
    }

    try {
      setLoading(true)
      const payload = {
        ...formData,
        dcontrato: toPBDate(formData.dcontrato),
        dcalculo: formData.dcalculo ? toPBDate(formData.dcalculo) : '',
        dprotocolo: formData.dprotocolo ? toPBDate(formData.dprotocolo) : '',
      }

      if (isEdit) {
        await updateContrato(contract.id, payload)
        toast.success('Contrato atualizado com sucesso!')
      } else {
        await createContrato(payload)
        toast.success('Contrato adicionado com sucesso!')
      }
      onClose()
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar contrato')
    } finally {
      setLoading(false)
    }
  }

  const isArchived = ARCHIVED_STATUSES.includes(formData.status)

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            {isEdit ? 'Editar Contrato' : 'Adicionar Contrato'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nome">
                Nome <span className="text-red-500">*</span>
              </Label>
              <Input
                id="nome"
                placeholder="Nome completo do cliente"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fone">Telefone</Label>
              <Input
                id="fone"
                placeholder="(00) 00000-0000"
                value={formData.fone}
                onChange={(e) => setFormData({ ...formData, fone: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Benefício</Label>
              <div className="flex gap-2">
                {customBeneficio ? (
                  <Input
                    placeholder="Digite o benefício"
                    value={formData.beneficio}
                    onChange={(e) => setFormData({ ...formData, beneficio: e.target.value })}
                    className="flex-1"
                  />
                ) : (
                  <Select
                    value={formData.beneficio}
                    onValueChange={(v) => setFormData({ ...formData, beneficio: v })}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {BENEFICIOS.map((b) => (
                        <SelectItem key={b} value={b}>
                          {b}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setCustomBeneficio(!customBeneficio)}
                >
                  <Plus
                    className={cn('h-4 w-4 transition-transform', customBeneficio && 'rotate-45')}
                  />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Responsável</Label>
              <Select
                value={formData.responsavel}
                onValueChange={(v) => setFormData({ ...formData, responsavel: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {RESPONSAVEIS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Acompanhamento (FUP)</Label>
              <Select
                value={formData.fup ? 'FUP' : 'empty'}
                onValueChange={(v) => setFormData({ ...formData, fup: v === 'FUP' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sem FUP" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="empty">Sem FUP</SelectItem>
                  <SelectItem value="FUP">FUP</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status inicial</Label>
              <Select
                disabled={!isEdit}
                value={formData.status}
                onValueChange={(v) => setFormData({ ...formData, status: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dcontrato">
                Data do Contrato <span className="text-red-500">*</span>
              </Label>
              <Input
                id="dcontrato"
                type="date"
                value={formData.dcontrato}
                onChange={(e) => setFormData({ ...formData, dcontrato: e.target.value })}
              />
            </div>

            {isEdit && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="dcalculo">Data do Cálculo</Label>
                  <Input
                    id="dcalculo"
                    type="date"
                    value={formData.dcalculo}
                    onChange={(e) => setFormData({ ...formData, dcalculo: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prazo">Prazo (dias)</Label>
                  <Input
                    id="prazo"
                    type="number"
                    min="0"
                    value={formData.prazo}
                    onChange={(e) =>
                      setFormData({ ...formData, prazo: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dprotocolo">Data do Protocolo</Label>
                  <Input
                    id="dprotocolo"
                    type="date"
                    value={formData.dprotocolo}
                    onChange={(e) => setFormData({ ...formData, dprotocolo: e.target.value })}
                  />
                </div>
              </>
            )}
          </div>

          {isArchived && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg flex gap-3 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <p className="text-sm font-medium leading-relaxed">
                ⚠️ Este caso será arquivado. Não será contabilizado nos fechamentos ativos. O
                registro permanece para consulta histórica.
              </p>
            </div>
          )}

          <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="parceria"
                checked={formData.parceria}
                onCheckedChange={(c) => setFormData({ ...formData, parceria: !!c })}
              />
              <Label
                htmlFor="parceria"
                className="text-amber-600 dark:text-amber-500 font-bold cursor-pointer"
              >
                Caso de Parceria
              </Label>
            </div>

            {formData.parceria && (
              <div
                className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in-down"
                style={{ animationDuration: '200ms' }}
              >
                <div className="space-y-2">
                  <Label htmlFor="parceiro_nome">Nome do Parceiro</Label>
                  <Input
                    id="parceiro_nome"
                    value={formData.parceiro_nome}
                    onChange={(e) => setFormData({ ...formData, parceiro_nome: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="parceiro_comissao">Comissão (R$)</Label>
                  <Input
                    id="parceiro_comissao"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.parceiro_comissao || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        parceiro_comissao: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-amber-500 hover:bg-amber-600 text-white font-semibold"
            >
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
