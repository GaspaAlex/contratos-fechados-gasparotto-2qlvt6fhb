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
import { AlertTriangle } from 'lucide-react'
import {
  createContrato,
  updateContrato,
  toPBDate,
  toYMD,
  getTiposAcao,
  createTipoAcao,
  updateTipoAcao,
  deleteTipoAcao,
  getStatusContrato,
  createStatusContrato,
  deleteStatusContrato,
  getResponsaveis,
  createResponsavel,
  deleteResponsavel,
  getContratosByStatus,
} from '@/services/contratos'
import { toast } from 'sonner'
import { DynamicSelect } from './DynamicSelect'
import pb from '@/lib/pocketbase/client'

const ARCHIVED_STATUSES = ['Sem Qualidade de Segurado', 'Tem Advogado', 'Litispendência']

const normalizeText = (text: string) => {
  if (!text) return ''
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

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
  const [beneficios, setBeneficios] = useState<any[]>([])
  const [statusList, setStatusList] = useState<any[]>([])
  const [responsaveis, setResponsaveis] = useState<any[]>([])
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null)

  const [formData, setFormData] = useState<{
    nome: string
    fone: string
    beneficio: string
    responsavel: string
    fup: boolean
    status: string
    dcontrato: string
    dcalculo: string
    dprotocolo: string
    parceria: boolean
    parceiro_nome: string
    parceiro_comissao: number
    origem: string
  }>({
    nome: '',
    fone: '',
    beneficio: '',
    responsavel: '',
    fup: false,
    status: 'R. Docs',
    dcontrato: '',
    dcalculo: '',
    dprotocolo: '',
    parceria: false,
    parceiro_nome: '',
    parceiro_comissao: 0,
    origem: '',
  })

  useEffect(() => {
    if (isOpen) {
      loadDependencies()
      const today = new Date().toISOString().split('T')[0]
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
          dprotocolo: toYMD(contract.dprotocolo) || '',
          parceria: contract.parceria || false,
          parceiro_nome: contract.parceiro_nome || '',
          parceiro_comissao: contract.parceiro_comissao || 0,
          origem: contract.origem || 'Não classificado',
        })
      } else {
        setFormData({
          nome: '',
          fone: '',
          beneficio: '',
          responsavel: '',
          fup: false,
          status: 'R. Docs',
          dcontrato: today,
          dcalculo: '',
          dprotocolo: '',
          parceria: false,
          parceiro_nome: '',
          parceiro_comissao: 0,
          origem: '',
        })
      }
      setDuplicateWarning(null)
    }
  }, [isOpen, contract])

  const loadDependencies = async () => {
    try {
      const [bRes, sRes, rRes] = await Promise.all([
        getTiposAcao(),
        getStatusContrato(),
        getResponsaveis(),
      ])
      setBeneficios(bRes.map((x) => ({ id: x.id, nome: x.nome, is_default: x.is_default })))
      setStatusList(sRes.map((x) => ({ id: x.id, nome: x.nome, is_default: x.is_default })))
      setResponsaveis(rRes)
    } catch (e) {
      console.error(e)
    }
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, '')
    if (v.length > 11) v = v.slice(0, 11)
    let formatted = v
    if (v.length > 10) formatted = v.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3')
    else if (v.length > 5) formatted = v.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3')
    else if (v.length > 2) formatted = v.replace(/^(\d{2})(\d{0,5})/, '($1) $2')
    else if (v.length > 0) formatted = v.replace(/^(\d{0,2})/, '($1')
    setFormData({ ...formData, fone: formatted })
  }

  const handleAddBeneficio = async (nome: string) => {
    try {
      await createTipoAcao({ nome })
      await loadDependencies()
      setFormData((f) => ({ ...f, beneficio: nome }))
    } catch (e) {
      toast.error('Erro ao adicionar')
    }
  }

  const handleEditBeneficio = async (id: string, oldName: string, newName: string) => {
    try {
      const linked = await pb.collection('contratos_fechados').getFullList({
        filter: pb.filter('beneficio = {:oldName}', { oldName }),
      })
      for (const c of linked) {
        await updateContrato(c.id, { beneficio: newName })
      }
      await updateTipoAcao(id, { nome: newName })
      await loadDependencies()
      if (formData.beneficio === oldName) setFormData((f) => ({ ...f, beneficio: newName }))
    } catch (e) {
      toast.error('Erro ao editar benefício')
    }
  }

  const handleDelBeneficio = async (id: string, nome: string) => {
    try {
      if (!window.confirm(`Excluir o benefício '${nome}'? Esta ação não pode ser desfeita.`)) return
      await deleteTipoAcao(id)

      const linkedContratos = await pb.collection('contratos_fechados').getFullList({
        filter: pb.filter('beneficio = {:nome}', { nome }),
      })
      for (const c of linkedContratos) {
        await pb.collection('contratos_fechados').update(c.id, { beneficio: '' })
      }

      await loadDependencies()
      if (formData.beneficio === nome) setFormData((f) => ({ ...f, beneficio: '' }))
    } catch (e) {
      toast.error('Erro ao deletar')
    }
  }

  const handleAddStatus = async (nome: string) => {
    try {
      await createStatusContrato({ nome })
      await loadDependencies()
      setFormData((f) => ({ ...f, status: nome }))
    } catch (e) {
      toast.error('Erro ao adicionar')
    }
  }

  const handleEditStatus = async (id: string, oldName: string, newName: string) => {
    try {
      const linked = await getContratosByStatus(oldName)
      for (const c of linked) {
        await updateContrato(c.id, { status: newName })
      }
      const linkedProtocolos = await pb.collection('protocolo').getFullList({
        filter: pb.filter('status = {:oldName}', { oldName }),
      })
      for (const p of linkedProtocolos) {
        await pb.collection('protocolo').update(p.id, { status: newName })
      }
      await pb.collection('status_contrato').update(id, { nome: newName })
      await loadDependencies()
      if (formData.status === oldName) setFormData((f) => ({ ...f, status: newName }))
    } catch (e) {
      toast.error('Erro ao editar status')
    }
  }

  const handleDelStatus = async (id: string, nome: string) => {
    try {
      const linked = await getContratosByStatus(nome)
      const linkedProtocolos = await pb.collection('protocolo').getFullList({
        filter: pb.filter('status = {:nome}', { nome }),
      })
      const totalLinked = linked.length + linkedProtocolos.length

      if (totalLinked > 0) {
        if (
          !window.confirm(
            `Existem ${totalLinked} registros com este status. Ao excluir, serão alterados automaticamente para R. Docs. Confirmar?`,
          )
        )
          return
        for (const c of linked) {
          await updateContrato(c.id, { status: 'R. Docs' })
        }
        for (const p of linkedProtocolos) {
          await pb.collection('protocolo').update(p.id, { status: 'R. Docs' })
        }
      } else {
        if (!window.confirm(`Deseja excluir o status '${nome}'? Esta ação não pode ser desfeita.`))
          return
      }
      await deleteStatusContrato(id)
      await loadDependencies()
      if (formData.status === nome) setFormData((f) => ({ ...f, status: 'R. Docs' }))
    } catch (e) {
      toast.error('Erro ao deletar')
    }
  }

  const handleAddResp = async (nome: string) => {
    try {
      await createResponsavel({ nome })
      await loadDependencies()
      setFormData((f) => ({ ...f, responsavel: nome }))
    } catch (e) {
      toast.error('Erro ao adicionar')
    }
  }

  const handleEditResp = async (id: string, oldName: string, newName: string) => {
    try {
      const linked = await pb.collection('contratos_fechados').getFullList({
        filter: pb.filter('responsavel = {:oldName}', { oldName }),
      })
      for (const c of linked) {
        await updateContrato(c.id, { responsavel: newName })
      }
      await pb.collection('responsaveis').update(id, { nome: newName })
      await loadDependencies()
      if (formData.responsavel === oldName) setFormData((f) => ({ ...f, responsavel: newName }))
    } catch (e) {
      toast.error('Erro ao editar responsável')
    }
  }

  const handleDelResp = async (id: string, nome: string) => {
    try {
      if (
        !window.confirm(`Deseja excluir o responsável '${nome}'? Esta ação não pode ser desfeita.`)
      )
        return
      await deleteResponsavel(id)

      const linkedContratos = await pb.collection('contratos_fechados').getFullList({
        filter: pb.filter('responsavel = {:nome}', { nome }),
      })
      for (const c of linkedContratos) {
        await pb.collection('contratos_fechados').update(c.id, { responsavel: '' })
      }

      await loadDependencies()
      if (formData.responsavel === nome) setFormData((f) => ({ ...f, responsavel: '' }))
    } catch (e) {
      toast.error('Erro ao deletar')
    }
  }

  const executeSave = async () => {
    try {
      setLoading(true)
      const payload = {
        ...formData,
        dcontrato: toPBDate(formData.dcontrato),
        dcalculo: formData.dcalculo ? toPBDate(formData.dcalculo) : '',
        dprotocolo: formData.dprotocolo ? toPBDate(formData.dprotocolo) : '',
      }
      if (isEdit) await updateContrato(contract.id, payload)
      else await createContrato(payload)
      toast.success(isEdit ? 'Atualizado!' : 'Adicionado!')
      onClose()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!formData.nome || !formData.dcontrato)
      return toast.error('Preencha Nome e Data do Contrato.')
    if (!isEdit && !formData.origem) return toast.error('Selecione a origem do caso')

    try {
      setLoading(true)
      const normalizedName = normalizeText(formData.nome)
      const existing = await pb.collection('contratos_fechados').getFullList({ fields: 'id,nome' })
      const duplicate = existing.find(
        (c: any) => c.id !== contract?.id && normalizeText(c.nome) === normalizedName,
      )

      if (duplicate) {
        setDuplicateWarning(duplicate.nome)
        setLoading(false)
        return
      }

      await executeSave()
    } catch (err: any) {
      toast.error(err.message)
      setLoading(false)
    }
  }

  const isArchived = ARCHIVED_STATUSES.includes(formData.status)

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-[#C9922A]">
            {isEdit ? 'Editar Contrato' : 'Adicionar Contrato'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                Nome <span className="text-red-500">*</span>
              </Label>
              <Input
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                className="focus-visible:ring-[#C9922A]"
              />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input
                value={formData.fone}
                onChange={handlePhoneChange}
                placeholder="(00) 00000-0000"
                className="focus-visible:ring-[#C9922A]"
              />
            </div>

            <div className="space-y-2">
              <Label>Benefício</Label>
              <DynamicSelect
                value={formData.beneficio}
                onChange={(v) => setFormData({ ...formData, beneficio: v })}
                items={beneficios}
                onAdd={handleAddBeneficio}
                onEdit={handleEditBeneficio}
                onDelete={handleDelBeneficio}
                placeholder="Selecione..."
              />
            </div>

            <div className="space-y-2">
              <Label>Responsável</Label>
              <DynamicSelect
                value={formData.responsavel}
                onChange={(v) => setFormData({ ...formData, responsavel: v })}
                items={responsaveis}
                onAdd={handleAddResp}
                onEdit={handleEditResp}
                onDelete={handleDelResp}
                placeholder="Selecione..."
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[#C9922A] font-bold">
                ORIGEM {!isEdit && <span className="text-red-500">*</span>}
              </Label>
              <Select
                value={formData.origem || (isEdit ? 'Não classificado' : '')}
                onValueChange={(v) => setFormData({ ...formData, origem: v })}
              >
                <SelectTrigger className="border-[#C9922A]/30 focus:ring-[#C9922A]">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Campanha">Campanha</SelectItem>
                  <SelectItem value="Particular">Particular</SelectItem>
                  <SelectItem value="Não classificado">Não classificado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Acompanhamento (FUP)</Label>
              <Select
                value={formData.fup ? 'FUP' : 'empty'}
                onValueChange={(v) => setFormData({ ...formData, fup: v === 'FUP' })}
              >
                <SelectTrigger className="border-[#C9922A]/30 focus:ring-[#C9922A]">
                  <SelectValue placeholder="Sem FUP" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="empty">Sem FUP</SelectItem>
                  <SelectItem value="FUP">FUP</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <DynamicSelect
                value={formData.status}
                onChange={(v) => setFormData({ ...formData, status: v })}
                items={statusList}
                onAdd={handleAddStatus}
                onEdit={handleEditStatus}
                onDelete={handleDelStatus}
                placeholder="Status..."
              />
            </div>

            <div className="space-y-2">
              <Label>
                Data do Contrato <span className="text-red-500">*</span>
              </Label>
              <Input
                type="date"
                value={formData.dcontrato}
                onChange={(e) => setFormData({ ...formData, dcontrato: e.target.value })}
                className="focus-visible:ring-[#C9922A]"
              />
            </div>

            {isEdit && (
              <>
                <div className="space-y-2">
                  <Label>Data do Cálculo</Label>
                  <Input
                    type="date"
                    value={formData.dcalculo}
                    onChange={(e) => setFormData({ ...formData, dcalculo: e.target.value })}
                    className="focus-visible:ring-[#C9922A]"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data do Protocolo</Label>
                  <Input
                    type="date"
                    value={formData.dprotocolo}
                    onChange={(e) => setFormData({ ...formData, dprotocolo: e.target.value })}
                    className="focus-visible:ring-[#C9922A]"
                  />
                </div>
              </>
            )}
          </div>

          {isArchived && (
            <div className="p-4 bg-[#C9922A]/10 border border-[#C9922A]/30 rounded-lg flex gap-3 text-[#C9922A]">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <p className="text-sm font-bold">
                ⚠️ Este caso será arquivado. Não será contabilizado nos fechamentos ativos.
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
              <Label htmlFor="parceria" className="text-[#C9922A] font-bold cursor-pointer">
                Caso de Parceria
              </Label>
            </div>
            {formData.parceria && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome do Parceiro</Label>
                  <Input
                    value={formData.parceiro_nome}
                    onChange={(e) => setFormData({ ...formData, parceiro_nome: e.target.value })}
                    className="focus-visible:ring-[#C9922A]"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Comissão (R$)</Label>
                  <Input
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
                    className="focus-visible:ring-[#C9922A]"
                  />
                </div>
              </div>
            )}
          </div>

          {duplicateWarning && (
            <div className="p-4 bg-amber-100 border border-amber-300 rounded-lg space-y-3">
              <div className="flex gap-3 text-amber-800">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <p className="text-sm font-semibold">
                  Atenção: já existe um contrato cadastrado para <strong>{duplicateWarning}</strong>
                  . Deseja continuar mesmo assim?
                </p>
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 text-xs border-amber-300 text-amber-800 hover:bg-amber-200"
                  onClick={() => setDuplicateWarning(null)}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  className="h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white"
                  onClick={() => {
                    setDuplicateWarning(null)
                    executeSave()
                  }}
                >
                  Salvar mesmo assim
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            {!duplicateWarning && (
              <Button
                type="submit"
                disabled={loading}
                className="bg-[#C9922A] hover:bg-[#C9922A]/90 text-white font-bold"
              >
                {loading ? 'Salvando...' : 'Salvar'}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
