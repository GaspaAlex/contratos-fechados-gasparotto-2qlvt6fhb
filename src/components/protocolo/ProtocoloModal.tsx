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
import { AlertTriangle } from 'lucide-react'
import { createProtocolo, updateProtocolo } from '@/services/protocolo'
import {
  toPBDate,
  toYMD,
  getTiposAcao,
  createTipoAcao,
  updateTipoAcao,
  deleteTipoAcao,
  getResponsaveis,
  createResponsavel,
  deleteResponsavel,
} from '@/services/contratos'
import { toast } from 'sonner'
import { DynamicSelect } from '@/components/dashboard/DynamicSelect'
import pb from '@/lib/pocketbase/client'

const normalizeText = (text: string) => {
  if (!text) return ''
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

export function ProtocoloModal({ isOpen, onClose, protocolo, onSave }: any) {
  const isEdit = !!protocolo
  const [loading, setLoading] = useState(false)
  const [beneficios, setBeneficios] = useState<any[]>([])
  const [responsaveis, setResponsaveis] = useState<any[]>([])
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    nome: '',
    fone: '',
    tipo_acao: '',
    responsavel: '',
    status: 'Protocolado Judicial',
    dcalculo: '',
    dprotocolo: '',
    prazo: 15,
    nautos: '',
    valor: 0,
    decisao: 'Aguardando',
  })

  useEffect(() => {
    if (isOpen) {
      loadDependencies()
      const today = new Date().toISOString().split('T')[0]
      if (protocolo) {
        setFormData({
          nome: protocolo.nome || '',
          fone: protocolo.fone || '',
          tipo_acao: protocolo.expand?.tipo_acao?.nome || '',
          responsavel: protocolo.expand?.responsavel?.nome || '',
          status: protocolo.status || 'Protocolado Judicial',
          dcalculo: toYMD(protocolo.dcalculo) || '',
          dprotocolo: toYMD(protocolo.dprotocolo) || '',
          prazo: protocolo.prazo || 15,
          nautos: protocolo.nautos || '',
          valor: protocolo.valor || 0,
          decisao: protocolo.decisao || 'Aguardando',
        })
      } else {
        setFormData({
          nome: '',
          fone: '',
          tipo_acao: '',
          responsavel: '',
          status: 'Protocolado Judicial',
          dcalculo: today,
          dprotocolo: today,
          prazo: 15,
          nautos: '',
          valor: 0,
          decisao: 'Aguardando',
        })
      }
      setDuplicateWarning(null)
    }
  }, [isOpen, protocolo])

  const loadDependencies = async () => {
    try {
      const [bRes, rRes] = await Promise.all([getTiposAcao(), getResponsaveis()])
      setBeneficios(bRes.map((x) => ({ id: x.id, nome: x.nome, is_default: x.is_default })))
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
      setFormData((f) => ({ ...f, tipo_acao: nome }))
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
        await pb.collection('contratos_fechados').update(c.id, { beneficio: newName })
      }
      await updateTipoAcao(id, { nome: newName })
      await loadDependencies()
      if (formData.tipo_acao === oldName) setFormData((f) => ({ ...f, tipo_acao: newName }))
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
      if (formData.tipo_acao === nome) setFormData((f) => ({ ...f, tipo_acao: '' }))
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
      const linkedContratos = await pb.collection('contratos_fechados').getFullList({
        filter: pb.filter('responsavel = {:oldName}', { oldName }),
      })
      for (const c of linkedContratos) {
        await pb.collection('contratos_fechados').update(c.id, { responsavel: newName })
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
      const tipo_acao_id = beneficios.find((b) => b.nome === formData.tipo_acao)?.id || ''
      const responsavel_id = responsaveis.find((r) => r.nome === formData.responsavel)?.id || ''

      const payload = {
        ...formData,
        tipo_acao: tipo_acao_id,
        responsavel: responsavel_id,
        dcalculo: formData.dcalculo ? toPBDate(formData.dcalculo) : '',
        dprotocolo: formData.dprotocolo ? toPBDate(formData.dprotocolo) : '',
      }
      if (isEdit) await updateProtocolo(protocolo.id, payload)
      else await createProtocolo(payload)
      toast.success(isEdit ? 'Atualizado!' : 'Adicionado!')
      if (onSave) onSave()
      onClose()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!formData.nome) return toast.error('Preencha o Nome.')

    try {
      setLoading(true)
      const normalizedName = normalizeText(formData.nome)
      const existing = await pb.collection('protocolo').getFullList({ fields: 'id,nome' })
      const duplicate = existing.find(
        (c: any) => c.id !== protocolo?.id && normalizeText(c.nome) === normalizedName,
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-[#C9922A]">
            {isEdit ? 'Editar Protocolo' : 'Adicionar Protocolo'}
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
              <Label>Tipo de Ação</Label>
              <DynamicSelect
                value={formData.tipo_acao}
                onChange={(v) => setFormData({ ...formData, tipo_acao: v })}
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
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(v) => setFormData({ ...formData, status: v })}
              >
                <SelectTrigger className="border-[#C9922A]/30 focus:ring-[#C9922A]">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent className="bg-white text-gray-900 dark:bg-[#1b1f17] dark:text-[#eceee8]">
                  <SelectItem value="Protocolado Judicial">Protocolado Judicial</SelectItem>
                  <SelectItem value="Requerimento Adm.">Requerimento Adm.</SelectItem>
                  <SelectItem value="Prov. Inicial">Prov. Inicial</SelectItem>
                  <SelectItem value="R. Docs">R. Docs</SelectItem>
                </SelectContent>
              </Select>
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
              <Label>Nº Autos</Label>
              <Input
                value={formData.nautos}
                onChange={(e) => setFormData({ ...formData, nautos: e.target.value })}
                className="focus-visible:ring-[#C9922A]"
              />
            </div>

            <div className="space-y-2">
              <Label>Valor</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.valor || ''}
                onChange={(e) =>
                  setFormData({ ...formData, valor: parseFloat(e.target.value) || 0 })
                }
                className="focus-visible:ring-[#C9922A]"
              />
            </div>

            <div className="space-y-2">
              <Label>Decisão</Label>
              <Select
                value={formData.decisao}
                onValueChange={(v) => setFormData({ ...formData, decisao: v })}
              >
                <SelectTrigger className="border-[#C9922A]/30 focus:ring-[#C9922A]">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Aguardando">Aguardando</SelectItem>
                  <SelectItem value="Procedente">Procedente</SelectItem>
                  <SelectItem value="Improcedente">Improcedente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {duplicateWarning && (
            <div className="p-4 bg-amber-100 border border-amber-300 rounded-lg space-y-3">
              <div className="flex gap-3 text-amber-800">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <p className="text-sm font-semibold">
                  Atenção: já existe um protocolo cadastrado para{' '}
                  <strong>{duplicateWarning}</strong>. Deseja continuar mesmo assim?
                </p>
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 text-xs border border-amber-400 text-amber-800 hover:bg-amber-200"
                  onClick={() => setDuplicateWarning(null)}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  className="h-8 text-xs bg-amber-500 text-white hover:bg-amber-600"
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
