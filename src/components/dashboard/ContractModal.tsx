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
import { Textarea } from '@/components/ui/textarea'
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
  createResponsavel,
  deleteResponsavel,
  getContratosByStatus,
} from '@/services/contratos'
import { getResponsaveisAtivos } from '@/services/responsaveis'
import { toast } from 'sonner'
import { DynamicSelect } from './DynamicSelect'
import pb from '@/lib/pocketbase/client'
import { getCampaignConfigs } from '@/services/campaign_config'
import { isArchived } from '@/lib/archivedStatuses'

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
  const [campanhas, setCampanhas] = useState<any[]>([])
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
    revisar_em: string
    parceria: boolean
    parceiro_nome: string
    parceiro_comissao: number
    origem: string
    campanha_origem: string
    representante: boolean
    representante_nome: string
    representante_cpf: string
    representante_vinculo: string
    representante_telefone: string
    observacoes: string
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
    revisar_em: '',
    parceria: false,
    parceiro_nome: '',
    parceiro_comissao: 0,
    origem: '',
    campanha_origem: '',
    representante: false,
    representante_nome: '',
    representante_cpf: '',
    representante_vinculo: '',
    representante_telefone: '',
    observacoes: '',
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
          revisar_em: toYMD(contract.revisar_em) || '',
          parceria: contract.parceria || false,
          parceiro_nome: contract.parceiro_nome || '',
          parceiro_comissao: contract.parceiro_comissao || 0,
          origem: contract.origem === 'Não classificado' ? '' : contract.origem || '',
          campanha_origem: contract.campanha_origem || '',
          representante: contract.representante || false,
          representante_nome: contract.representante_nome || '',
          representante_cpf: contract.representante_cpf || '',
          representante_vinculo: contract.representante_vinculo || '',
          representante_telefone: contract.representante_telefone || '',
          observacoes: contract.observacoes || '',
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
          revisar_em: '',
          parceria: false,
          parceiro_nome: '',
          parceiro_comissao: 0,
          origem: '',
          campanha_origem: '',
          representante: false,
          representante_nome: '',
          representante_cpf: '',
          representante_vinculo: '',
          representante_telefone: '',
          observacoes: '',
        })
      }
      setDuplicateWarning(null)
    }
  }, [isOpen, contract])

  const loadDependencies = async () => {
    try {
      const [bRes, sRes, rRes, cRes] = await Promise.all([
        getTiposAcao(),
        getStatusContrato(),
        getResponsaveisAtivos(),
        getCampaignConfigs(),
      ])
      setBeneficios(bRes.map((x) => ({ id: x.id, nome: x.nome, is_default: x.is_default })))
      setStatusList(sRes.map((x) => ({ id: x.id, nome: x.nome, is_default: x.is_default })))
      setResponsaveis(rRes)
      setCampanhas(cRes.filter((c: any) => c.ativo))
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

  const handleRepPhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, '')
    if (v.length > 11) v = v.slice(0, 11)
    let formatted = v
    if (v.length > 10) formatted = v.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3')
    else if (v.length > 5) formatted = v.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3')
    else if (v.length > 2) formatted = v.replace(/^(\d{2})(\d{0,5})/, '($1) $2')
    else if (v.length > 0) formatted = v.replace(/^(\d{0,2})/, '($1')
    setFormData({ ...formData, representante_telefone: formatted })
  }

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, '')
    if (v.length > 11) v = v.slice(0, 11)
    let formatted = v
    if (v.length > 9) formatted = v.replace(/^(\d{3})(\d{3})(\d{3})(\d{2}).*/, '$1.$2.$3-$4')
    else if (v.length > 6) formatted = v.replace(/^(\d{3})(\d{3})(\d{0,3}).*/, '$1.$2.$3')
    else if (v.length > 3) formatted = v.replace(/^(\d{3})(\d{0,3})/, '$1.$2')
    setFormData({ ...formData, representante_cpf: formatted })
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
            `Existem ${totalLinked} registros com este status. Ao excluir, serão alterados automaticamente para Faltando Documentos. Confirmar?`,
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
        revisar_em: formData.revisar_em ? toPBDate(formData.revisar_em) : '',
        representante_nome: formData.representante ? formData.representante_nome : '',
        representante_cpf: formData.representante ? formData.representante_cpf : '',
        representante_vinculo: formData.representante ? formData.representante_vinculo : '',
        representante_telefone: formData.representante ? formData.representante_telefone : '',
        observacoes: formData.observacoes || '',
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
    const validOrigins = ['Campanha', 'Particular', 'Macohin', 'Indicação Macohin']
    if (!formData.nome || !formData.dcontrato)
      return toast.error('Preencha Nome e Data do Contrato.')
    if (!formData.origem || !validOrigins.includes(formData.origem))
      return toast.error('Selecione a origem do caso')
    if (formData.origem === 'Campanha' && !formData.campanha_origem)
      return toast.error('Selecione a campanha de origem.')
    if (formData.representante && !formData.representante_nome)
      return toast.error('Preencha o Nome do Representante Legal.')

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

  const isCurrentArchived = isArchived(formData.status)

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-[10px] border border-[#E4E7EB] dark:border-border p-5 sm:p-6 shadow-lg bg-white dark:bg-card">
        <DialogHeader className="pb-3 border-b border-[#E4E7EB]/80 dark:border-border/80">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center text-[10px] font-bold tracking-[1.2px] uppercase text-[#C9922A] bg-[#C9922A]/10 px-2 py-0.5 rounded">
              {isEdit ? 'EDIÇÃO' : 'NOVO CADASTRO'}
            </span>
          </div>
          <DialogTitle className="text-xl font-bold tracking-tight text-[#252B34] dark:text-foreground">
            {isEdit ? 'Editar Contrato Fechado' : 'Adicionar Contrato Fechado'}
          </DialogTitle>
          <p className="text-xs text-[#78818E] dark:text-muted-foreground">
            Preencha os dados do cliente, benefício, datas e acompanhamento de revisão.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#252B34] dark:text-foreground">
                Nome do Cliente <span className="text-[#B4453C]">*</span>
              </Label>
              <Input
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Nome completo do segurado"
                className="h-9 text-xs border-[#E4E7EB] dark:border-border rounded-md focus-visible:ring-[#C9922A]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#252B34] dark:text-foreground">
                Telefone
              </Label>
              <Input
                value={formData.fone}
                onChange={handlePhoneChange}
                placeholder="(00) 00000-0000"
                className="h-9 text-xs border-[#E4E7EB] dark:border-border rounded-md focus-visible:ring-[#C9922A]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#252B34] dark:text-foreground">
                Benefício
              </Label>
              <DynamicSelect
                value={formData.beneficio}
                onChange={(v) => setFormData({ ...formData, beneficio: v })}
                items={beneficios}
                onAdd={handleAddBeneficio}
                onEdit={handleEditBeneficio}
                onDelete={handleDelBeneficio}
                placeholder="Selecione o benefício..."
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#252B34] dark:text-foreground">
                Responsável
              </Label>
              <DynamicSelect
                value={formData.responsavel}
                onChange={(v) => setFormData({ ...formData, responsavel: v })}
                items={responsaveis}
                onAdd={handleAddResp}
                onEdit={handleEditResp}
                onDelete={handleDelResp}
                placeholder="Selecione o responsável..."
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#C9922A] uppercase tracking-wider">
                Origem <span className="text-[#B4453C]">*</span>
              </Label>
              <Select
                value={formData.origem || ''}
                onValueChange={(v) =>
                  setFormData({
                    ...formData,
                    origem: v,
                    campanha_origem: v !== 'Campanha' ? '' : formData.campanha_origem,
                  })
                }
              >
                <SelectTrigger className="h-9 text-xs border-[#E4E7EB] dark:border-border rounded-md focus:ring-[#C9922A]">
                  <SelectValue placeholder="Selecione a origem..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Campanha" className="text-xs">
                    Campanha
                  </SelectItem>
                  <SelectItem value="Particular" className="text-xs">
                    Particular
                  </SelectItem>
                  <SelectItem value="Macohin" className="text-xs">
                    Macohin
                  </SelectItem>
                  <SelectItem value="Indicação Macohin" className="text-xs">
                    Indicação Macohin
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.origem === 'Campanha' && (
              <div className="space-y-1.5 animate-fade-in">
                <Label className="text-xs font-semibold text-[#C9922A] uppercase tracking-wider">
                  Campanha de Origem <span className="text-[#B4453C]">*</span>
                </Label>
                <Select
                  value={formData.campanha_origem || ''}
                  onValueChange={(v) => setFormData({ ...formData, campanha_origem: v })}
                >
                  <SelectTrigger className="h-9 text-xs border-[#E4E7EB] dark:border-border rounded-md focus:ring-[#C9922A]">
                    <SelectValue placeholder="Selecione a campanha..." />
                  </SelectTrigger>
                  <SelectContent>
                    {campanhas.map((c) => (
                      <SelectItem key={c.id} value={c.rotulo} className="text-xs">
                        {c.rotulo}
                      </SelectItem>
                    ))}
                    {campanhas.length === 0 && (
                      <>
                        <SelectItem value="Aux. Acidente" className="text-xs">
                          Aux. Acidente
                        </SelectItem>
                        <SelectItem value="DER" className="text-xs">
                          DER
                        </SelectItem>
                        <SelectItem value="Ben. Análise" className="text-xs">
                          Ben. Análise
                        </SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#252B34] dark:text-foreground">
                Acompanhamento (FUP)
              </Label>
              <Select
                value={formData.fup ? 'FUP' : 'empty'}
                onValueChange={(v) => setFormData({ ...formData, fup: v === 'FUP' })}
              >
                <SelectTrigger className="h-9 text-xs border-[#E4E7EB] dark:border-border rounded-md focus:ring-[#C9922A]">
                  <SelectValue placeholder="Sem FUP" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="empty" className="text-xs">
                    Sem FUP
                  </SelectItem>
                  <SelectItem value="FUP" className="text-xs">
                    FUP (Follow Up Ativo)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#252B34] dark:text-foreground">
                Status
              </Label>
              <DynamicSelect
                value={formData.status}
                onChange={(v) => setFormData({ ...formData, status: v })}
                items={statusList}
                onAdd={handleAddStatus}
                onEdit={handleEditStatus}
                onDelete={handleDelStatus}
                placeholder="Selecione o status..."
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#252B34] dark:text-foreground">
                Data do Contrato <span className="text-[#B4453C]">*</span>
              </Label>
              <Input
                type="date"
                value={formData.dcontrato}
                onChange={(e) => setFormData({ ...formData, dcontrato: e.target.value })}
                className="h-9 text-xs border-[#E4E7EB] dark:border-border rounded-md focus-visible:ring-[#C9922A]"
              />
            </div>

            {isEdit && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-[#252B34] dark:text-foreground">
                    Data do Cálculo
                  </Label>
                  <Input
                    type="date"
                    value={formData.dcalculo}
                    onChange={(e) => setFormData({ ...formData, dcalculo: e.target.value })}
                    className="h-9 text-xs border-[#E4E7EB] dark:border-border rounded-md focus-visible:ring-[#C9922A]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-[#252B34] dark:text-foreground">
                    Data do Protocolo
                  </Label>
                  <Input
                    type="date"
                    value={formData.dprotocolo}
                    onChange={(e) => setFormData({ ...formData, dprotocolo: e.target.value })}
                    className="h-9 text-xs border-[#E4E7EB] dark:border-border rounded-md focus-visible:ring-[#C9922A]"
                  />
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#252B34] dark:text-foreground">
                Revisar em
              </Label>
              <Input
                type="date"
                value={formData.revisar_em}
                onChange={(e) => setFormData({ ...formData, revisar_em: e.target.value })}
                className="h-9 text-xs border-[#E4E7EB] dark:border-border rounded-md focus-visible:ring-[#C9922A]"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs font-semibold text-[#252B34] dark:text-foreground">
                Pendência Protocolo / Observações
              </Label>
              <Textarea
                rows={3}
                value={formData.observacoes || ''}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                placeholder="Detalhes adicionais, pendências com cliente, documentos faltantes..."
                className="text-xs border-[#E4E7EB] dark:border-border rounded-md focus-visible:ring-[#C9922A]"
              />
            </div>
          </div>

          {isCurrentArchived && (
            <div className="p-3.5 bg-[#C77E1E]/10 border border-[#C77E1E]/30 rounded-[10px] flex items-center gap-3 text-[#C77E1E]">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <p className="text-xs font-semibold">
                Este caso possui status de arquivamento e não será contabilizado nos fechamentos
                ativos.
              </p>
            </div>
          )}

          {/* Seção Parceria */}
          <div className="p-3.5 border border-[#E4E7EB] dark:border-border rounded-[10px] bg-[#F5F6F8]/60 dark:bg-muted/20 space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="parceria"
                checked={formData.parceria}
                onCheckedChange={(c) => setFormData({ ...formData, parceria: !!c })}
              />
              <Label htmlFor="parceria" className="text-xs font-bold text-[#C9922A] cursor-pointer">
                Caso com Parceiro
              </Label>
            </div>
            {formData.parceria && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 animate-fade-in">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-[#252B34] dark:text-foreground">
                    Nome do Parceiro
                  </Label>
                  <Input
                    value={formData.parceiro_nome}
                    onChange={(e) => setFormData({ ...formData, parceiro_nome: e.target.value })}
                    placeholder="Ex: Dr. Roberto / Previdenciarista"
                    className="h-9 text-xs border-[#E4E7EB] dark:border-border rounded-md focus-visible:ring-[#C9922A]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-[#252B34] dark:text-foreground">
                    Comissão Prevista (R$)
                  </Label>
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
                    placeholder="0,00"
                    className="h-9 text-xs border-[#E4E7EB] dark:border-border rounded-md focus-visible:ring-[#C9922A]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Seção Representante Legal */}
          <div className="p-3.5 border border-[#E4E7EB] dark:border-border rounded-[10px] bg-[#F5F6F8]/60 dark:bg-muted/20 space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="representante"
                checked={formData.representante}
                onCheckedChange={(c) => setFormData({ ...formData, representante: !!c })}
              />
              <Label
                htmlFor="representante"
                className="text-xs font-bold text-[#C9922A] cursor-pointer"
              >
                Representante Legal
              </Label>
            </div>
            {formData.representante && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 animate-fade-in">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-[#252B34] dark:text-foreground">
                    Nome do Representante <span className="text-[#B4453C]">*</span>
                  </Label>
                  <Input
                    value={formData.representante_nome}
                    onChange={(e) =>
                      setFormData({ ...formData, representante_nome: e.target.value })
                    }
                    placeholder="Nome completo do representante"
                    className="h-9 text-xs border-[#E4E7EB] dark:border-border rounded-md focus-visible:ring-[#C9922A]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-[#252B34] dark:text-foreground">
                    CPF do Representante
                  </Label>
                  <Input
                    value={formData.representante_cpf}
                    onChange={handleCpfChange}
                    placeholder="000.000.000-00"
                    className="h-9 text-xs border-[#E4E7EB] dark:border-border rounded-md focus-visible:ring-[#C9922A]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-[#252B34] dark:text-foreground">
                    Parentesco / Vínculo
                  </Label>
                  <Select
                    value={formData.representante_vinculo || 'empty'}
                    onValueChange={(v) =>
                      setFormData({ ...formData, representante_vinculo: v === 'empty' ? '' : v })
                    }
                  >
                    <SelectTrigger className="h-9 text-xs border-[#E4E7EB] dark:border-border rounded-md focus:ring-[#C9922A]">
                      <SelectValue placeholder="Selecione o vínculo..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="empty" className="text-xs">
                        Selecione...
                      </SelectItem>
                      <SelectItem value="Pai/Mãe" className="text-xs">
                        Pai/Mãe
                      </SelectItem>
                      <SelectItem value="Tutor(a)" className="text-xs">
                        Tutor(a)
                      </SelectItem>
                      <SelectItem value="Curador(a)" className="text-xs">
                        Curador(a)
                      </SelectItem>
                      <SelectItem value="Cônjuge" className="text-xs">
                        Cônjuge
                      </SelectItem>
                      <SelectItem value="Outro" className="text-xs">
                        Outro
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-[#252B34] dark:text-foreground">
                    Telefone do Representante
                  </Label>
                  <Input
                    value={formData.representante_telefone}
                    onChange={handleRepPhoneChange}
                    placeholder="(00) 00000-0000"
                    className="h-9 text-xs border-[#E4E7EB] dark:border-border rounded-md focus-visible:ring-[#C9922A]"
                  />
                </div>
              </div>
            )}
          </div>

          {duplicateWarning && (
            <div className="p-3.5 bg-[#C77E1E]/10 border border-[#C77E1E]/30 rounded-[10px] space-y-2.5">
              <div className="flex gap-2.5 text-[#C77E1E]">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <p className="text-xs font-semibold">
                  Atenção: já existe um contrato cadastrado com o nome{' '}
                  <strong>{duplicateWarning}</strong>. Deseja continuar mesmo assim?
                </p>
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 text-xs border-[#E4E7EB] dark:border-border rounded-md"
                  onClick={() => setDuplicateWarning(null)}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  className="h-8 text-xs bg-[#C77E1E] hover:bg-[#b06f18] text-white rounded-md font-semibold"
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

          <DialogFooter className="pt-3 border-t border-[#E4E7EB]/80 dark:border-border/80 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="h-9 text-xs border-[#E4E7EB] dark:border-border rounded-md text-[#78818E] hover:text-[#252B34]"
            >
              Cancelar
            </Button>
            {!duplicateWarning && (
              <Button
                type="submit"
                disabled={loading}
                className="h-9 px-5 text-xs bg-[#C9922A] hover:bg-[#b58324] text-white font-semibold rounded-md shadow-sm"
              >
                {loading ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Cadastrar Contrato'}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
