import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { format } from 'date-fns'
import { AlertTriangle, CalendarIcon } from 'lucide-react'
import { toast } from 'sonner'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'

import {
  createLeadAuxAcidente,
  updateLeadAuxAcidente,
  findByTelefoneNormalized,
  ORIGEM_LABELS,
  STATUS_FUNIL_LABELS,
  MOTIVO_DESQUALIFICACAO_OPTIONS,
  formatDateBR,
  formatPhoneMask,
  responsavelId,
} from '@/services/leadsAuxAcidente'
import { getResponsaveisAtivos } from '@/services/responsaveis'
import type {
  LeadAuxAcidente,
  LeadAuxPayload,
  OrigemLead,
  Responsivo,
  StatusFunil,
} from '@/services/leadsAuxAcidente'

interface AuxAcidenteModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
  lead?: LeadAuxAcidente | null
}

interface FormValues {
  data_entrada: Date
  telefone: string
  origem_lead: string
  nome: string
  responsavel: string
  responsivo: string
  status_funil: string
  motivo_desqualificacao: string
  motivo_desqualificacao_outro: string
  observacoes: string
}

export function formatPhoneBR(value: string) {
  if (!value) return ''
  const d = value.replace(/\D/g, '').slice(0, 11)
  if (d.length === 0) return ''
  if (d.length <= 2) return `(${d}`
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

const emptyValues = (): FormValues => ({
  data_entrada: new Date(),
  telefone: '',
  origem_lead: 'enlead',
  nome: '',
  responsavel: '',
  responsivo: '',
  status_funil: 'qualificando',
  motivo_desqualificacao: '',
  motivo_desqualificacao_outro: '',
  observacoes: '',
})

export function AuxAcidenteModal({ open, onOpenChange, onSaved, lead }: AuxAcidenteModalProps) {
  const isEdit = Boolean(lead)
  const [loading, setLoading] = useState(false)
  const [responsaveis, setResponsaveis] = useState<{ id: string; nome: string }[]>([])
  const [dupOpen, setDupOpen] = useState(false)
  const [duplicados, setDuplicados] = useState<LeadAuxAcidente[]>([])

  const form = useForm<FormValues>({ defaultValues: emptyValues() })

  const statusWatch = form.watch('status_funil')
  const motivoWatch = form.watch('motivo_desqualificacao')

  const showMotivo = statusWatch === 'desqualificado'
  const showOutro = showMotivo && motivoWatch === 'outros'

  useEffect(() => {
    if (!open) return
    getResponsaveisAtivos()
      .then((res) => setResponsaveis(res.map((r) => ({ id: r.id, nome: r.nome }))))
      .catch((err) => console.error('Erro ao buscar responsáveis', err))
  }, [open])

  useEffect(() => {
    if (!open) return
    if (lead) {
      const raw = typeof lead.data_entrada === 'string' ? lead.data_entrada : ''
      const datePart = raw.split(' ')[0] || raw.slice(0, 10)
      form.reset({
        data_entrada: datePart ? new Date(`${datePart}T12:00:00`) : new Date(),
        telefone: lead.telefone || '',
        origem_lead: lead.origem_lead || 'enlead',
        nome: lead.nome || '',
        responsavel: responsavelId(lead),
        responsivo: lead.responsivo || '',
        status_funil: lead.status_funil || 'qualificando',
        motivo_desqualificacao: lead.motivo_desqualificacao || '',
        motivo_desqualificacao_outro: lead.motivo_desqualificacao_outro || '',
        observacoes: lead.observacoes || '',
      })
    } else {
      form.reset(emptyValues())
    }
  }, [open, lead, form])

  const onSubmit = async (values: FormValues) => {
    setLoading(true)
    try {
      const d = values.data_entrada
      const dataStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

      const telefoneLimpo = values.telefone.replace(/\D/g, '')
      if (!telefoneLimpo) {
        toast.error('O telefone é obrigatório.')
        setLoading(false)
        return
      }

      const payload: LeadAuxPayload = {
        data_entrada: dataStr,
        telefone: telefoneLimpo,
        origem_lead: (values.origem_lead || 'enlead') as OrigemLead,
        nome: values.nome.trim(),
        responsavel: values.responsavel || '',
        responsivo: (values.responsivo.trim() || '') as Responsivo,
        status_funil: (values.status_funil || 'qualificando') as StatusFunil,
        motivo_desqualificacao:
          values.status_funil === 'desqualificado' ? values.motivo_desqualificacao : '',
        motivo_desqualificacao_outro:
          values.status_funil === 'desqualificado' && values.motivo_desqualificacao === 'outros'
            ? values.motivo_desqualificacao_outro.trim()
            : '',
        observacoes: values.observacoes.trim(),
      }

      if (isEdit && lead) {
        await updateLeadAuxAcidente(lead.id!, payload)
        toast.success('Lead atualizado')
      } else {
        // Impede cadastro duplicado por telefone (comparação por dígitos,
        // ignorando variações de máscara armazenadas na collection)
        const duplicadosExistentes = await findByTelefoneNormalized(telefoneLimpo)
        if (duplicadosExistentes.length > 0) {
          setLoading(false)
          setDuplicados(duplicadosExistentes)
          setDupOpen(true)
          return
        }
        await createLeadAuxAcidente(payload)
        toast.success('Lead cadastrado')
      }
      onOpenChange(false)
      onSaved()
    } catch (error) {
      console.error(error)
      toast.error(isEdit ? 'Erro ao atualizar lead' : 'Erro ao salvar lead')
    } finally {
      setLoading(false)
    }
  }

  const labelCls =
    'text-[10px] font-bold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground'
  const controlCls =
    'h-9 text-xs bg-white dark:bg-card border-[#E4E7EB] dark:border-border rounded-md focus-visible:ring-[#C9922A]'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[520px] rounded-[10px] border border-[#E4E7EB] dark:border-border p-0 gap-0 bg-white dark:bg-card shadow-xl">
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-[#E4E7EB] dark:border-border space-y-1">
          <span className="inline-flex w-fit items-center text-[10px] font-bold tracking-[1.5px] uppercase text-[#C9922A] bg-[#C9922A]/10 px-2 py-0.5 rounded">
            CENTRAL AUXÍLIO-ACIDENTE
          </span>
          <DialogTitle className="text-xl font-bold tracking-tight text-[#252B34] dark:text-foreground">
            {isEdit ? 'Editar Lead' : 'Novo Lead'}
          </DialogTitle>
          <DialogDescription className="text-xs text-[#78818E] dark:text-muted-foreground">
            {isEdit
              ? 'Atualize as informações do atendimento.'
              : 'Preencha o que já souber — os demais campos podem ficar em branco.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="px-6 py-4 space-y-4">
          {/* Linha 1: Data de entrada + Origem */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className={labelCls}>Data de entrada *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      'w-full h-9 pl-3 text-left font-normal bg-white dark:bg-card border-[#E4E7EB] dark:border-border rounded-md text-xs focus-visible:ring-[#C9922A]',
                      !form.watch('data_entrada') && 'text-[#78818E] dark:text-muted-foreground',
                    )}
                  >
                    {form.watch('data_entrada')
                      ? format(form.watch('data_entrada'), 'dd/MM/yyyy')
                      : 'Selecione uma data'}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50 text-[#78818E]" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto p-0 border border-[#E4E7EB] dark:border-border shadow-lg"
                  align="start"
                >
                  <Calendar
                    mode="single"
                    selected={form.watch('data_entrada')}
                    onSelect={(date) => {
                      if (date) form.setValue('data_entrada', date)
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {form.formState.errors.data_entrada && (
                <p className="text-xs text-[#B4453C]">A data é obrigatória.</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className={labelCls}>Origem do lead *</Label>
              <Controller
                control={form.control}
                name="origem_lead"
                rules={{ required: 'A origem do lead é obrigatória.' }}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value || undefined}>
                    <SelectTrigger className={controlCls}>
                      <SelectValue placeholder="Selecione a origem" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ORIGEM_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value} className="text-xs">
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.origem_lead && (
                <p className="text-xs text-[#B4453C]">A origem do lead é obrigatória.</p>
              )}
            </div>
          </div>

          {/* Linha 2: Telefone */}
          <div className="space-y-1.5">
            <Label className={labelCls}>Telefone *</Label>
            <Input
              inputMode="tel"
              placeholder="Ex: (00) 00000-0000"
              className={controlCls}
              value={formatPhoneBR(form.watch('telefone'))}
              onChange={(e) => {
                form.setValue('telefone', e.target.value.replace(/\D/g, ''), {
                  shouldValidate: true,
                })
              }}
            />
            {form.formState.errors.telefone && (
              <p className="text-xs text-[#B4453C]">O telefone é obrigatório.</p>
            )}
          </div>

          {/* Linha 3: Nome + Responsável */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className={labelCls}>Nome</Label>
              <Input
                placeholder="Nome do lead (opcional)"
                className={controlCls}
                {...form.register('nome')}
              />
            </div>

            <div className="space-y-1.5">
              <Label className={labelCls}>Responsável</Label>
              <Controller
                control={form.control}
                name="responsavel"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value || undefined}>
                    <SelectTrigger className={controlCls}>
                      <SelectValue placeholder="Selecione (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {responsaveis.map((r) => (
                        <SelectItem key={r.id} value={r.id} className="text-xs">
                          {r.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          {/* Linha 4: Responsivo + Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className={labelCls}>Responsivo</Label>
              <Controller
                control={form.control}
                name="responsivo"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                    <SelectTrigger className={controlCls}>
                      <SelectValue placeholder="Ainda não avaliado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value=" " className="text-xs">
                        Ainda não avaliado
                      </SelectItem>
                      <SelectItem value="sim" className="text-xs">
                        Sim
                      </SelectItem>
                      <SelectItem value="nao" className="text-xs">
                        Não
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-1.5">
              <Label className={labelCls}>Status</Label>
              <Controller
                control={form.control}
                name="status_funil"
                rules={{ required: 'O status é obrigatório.' }}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value || undefined}>
                    <SelectTrigger className={controlCls}>
                      <SelectValue placeholder="Qualificando" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_FUNIL_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value} className="text-xs">
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          {/* Motivo da desqualificação — somente quando status = desqualificado */}
          {showMotivo && (
            <div className="space-y-1.5">
              <Label className={labelCls}>Motivo da desqualificação</Label>
              <Controller
                control={form.control}
                name="motivo_desqualificacao"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value || undefined}>
                    <SelectTrigger className={controlCls}>
                      <SelectValue placeholder="Selecione o motivo (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {MOTIVO_DESQUALIFICACAO_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value} className="text-xs">
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          )}

          {/* Outro motivo — somente quando motivo = outros */}
          {showOutro && (
            <div className="space-y-1.5">
              <Label className={labelCls}>Outro motivo</Label>
              <Input
                placeholder="Descreva o motivo"
                className={controlCls}
                {...form.register('motivo_desqualificacao_outro')}
              />
            </div>
          )}

          {/* Observações */}
          <div className="space-y-1.5">
            <Label className={labelCls}>Observações</Label>
            <Textarea
              placeholder="Observações (opcional)"
              className="min-h-[64px] text-xs bg-white dark:bg-card border-[#E4E7EB] dark:border-border rounded-md focus-visible:ring-[#C9922A]"
              {...form.register('observacoes')}
            />
          </div>

          <DialogFooter className="pt-2 border-t border-[#E4E7EB] dark:border-border flex gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="h-9 px-4 text-xs border-[#E4E7EB] dark:border-border hover:bg-[#FAF8F2] dark:hover:bg-muted/40 text-[#78818E] rounded-md transition-colors"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading}
              className="h-9 px-4 text-xs font-semibold bg-[#C9922A] hover:bg-[#b07d22] text-white rounded-md shadow-sm transition-colors"
            >
              {loading ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Salvar Lead'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      {/* Alerta de telefone duplicado */}
      <AlertDialog open={dupOpen} onOpenChange={setDupOpen}>
        <AlertDialogContent className="rounded-[10px] border border-[#E4E7EB] dark:border-border bg-white dark:bg-card sm:max-w-[460px] p-6">
          <AlertDialogHeader className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center text-[#C9922A] shrink-0">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold tracking-[1.5px] uppercase text-[#C9922A] block">
                  TELEFONE JÁ CADASTRADO
                </span>
                <AlertDialogTitle className="text-lg font-bold text-[#252B34] dark:text-foreground">
                  Não foi possível salvar o lead
                </AlertDialogTitle>
              </div>
            </div>
            <AlertDialogDescription className="pt-1 text-sm text-[#78818E] dark:text-muted-foreground leading-relaxed">
              Este telefone já está cadastrado na Central de Leads. Consulte ou edite o registro
              existente antes de criar um novo atendimento.
            </AlertDialogDescription>
            {duplicados.length > 0 && (
              <div className="mt-2 rounded-md border border-[#E4E7EB] dark:border-border overflow-hidden">
                <div className="grid grid-cols-[1fr_80px_1fr] sm:grid-cols-[1fr_90px_110px_1fr] gap-2 px-3 py-2 bg-[#FAF8F2] dark:bg-muted/40 text-[9px] font-bold uppercase tracking-wider text-[#78818E]">
                  <span>Nome</span>
                  <span className="hidden sm:block">Telefone</span>
                  <span>Entrada</span>
                  <span>Status</span>
                </div>
                <div className="max-h-[160px] overflow-y-auto divide-y divide-[#E4E7EB] dark:divide-border">
                  {duplicados.map((dup) => (
                    <div
                      key={dup.id}
                      className="grid grid-cols-[1fr_80px_1fr] sm:grid-cols-[1fr_90px_110px_1fr] gap-2 px-3 py-2 text-xs text-[#252B34] dark:text-foreground items-center"
                    >
                      <span className="truncate">{dup.nome || '—'}</span>
                      <span className="hidden sm:block whitespace-nowrap text-[11px] text-[#78818E] dark:text-muted-foreground">
                        {formatPhoneMask(dup.telefone)}
                      </span>
                      <span className="whitespace-nowrap">{formatDateBR(dup.data_entrada)}</span>
                      <span className="truncate text-[11px] text-[#78818E] dark:text-muted-foreground">
                        {STATUS_FUNIL_LABELS[dup.status_funil] || dup.status_funil}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 flex gap-2 sm:justify-end">
            <AlertDialogCancel
              className="h-9 px-4 text-xs border-[#E4E7EB] dark:border-border hover:bg-[#FAF8F2] dark:hover:bg-muted/40 text-[#78818E] rounded-md"
              onClick={() => setDupOpen(false)}
            >
              Voltar
            </AlertDialogCancel>
            <AlertDialogAction
              className="h-9 px-4 text-xs font-semibold bg-[#C9922A] hover:bg-[#b07d22] text-white rounded-md shadow-sm"
              onClick={() => setDupOpen(false)}
            >
              Fechar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  )
}
