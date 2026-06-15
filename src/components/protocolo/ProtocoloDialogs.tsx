import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import pb from '@/lib/pocketbase/client'
import { removeAccents } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createProtocolo, updateProtocolo, deleteProtocolo } from '@/services/protocolo'
import { toast } from 'sonner'

const baseSchema = z.object({
  nome: z.string().min(1, 'Obrigatório'),
  fone: z.string().optional(),
  tipo_acao: z.string().optional(),
  responsavel: z.string().optional(),
  status: z.string().min(1, 'Obrigatório'),
  dcontrato: z.string().optional(),
  dcalculo: z.string().optional(),
  dprotocolo: z.string().optional(),
  nautos: z.string().optional(),
  valor: z.coerce.number().optional(),
  decisao: z.string().default('Aguardando'),
  origem: z.string().optional(),
  parceiro: z.string().optional(),
  representante: z.boolean().default(false).optional(),
  representante_nome: z.string().optional(),
  representante_cpf: z.string().optional(),
  representante_vinculo: z.string().optional(),
  representante_telefone: z.string().optional(),
})

const schema = baseSchema.refine(
  (data) => {
    if (data.representante && (!data.representante_nome || data.representante_nome.trim() === '')) {
      return false
    }
    return true
  },
  {
    message: 'Obrigatório',
    path: ['representante_nome'],
  },
)

const applyCpfMask = (value: string) => {
  let v = value.replace(/\D/g, '')
  if (v.length > 11) v = v.substring(0, 11)
  if (v.length > 9) return v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  if (v.length > 6) return v.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3')
  if (v.length > 3) return v.replace(/(\d{3})(\d{1,3})/, '$1.$2')
  return v
}

const applyPhoneMask = (value: string) => {
  let v = value.replace(/\D/g, '')
  if (v.length > 11) v = v.slice(0, 11)
  let formatted = v
  if (v.length > 10) formatted = v.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3')
  else if (v.length > 5) formatted = v.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3')
  else if (v.length > 2) formatted = v.replace(/^(\d{2})(\d{0,5})/, '($1) $2')
  else if (v.length > 0) formatted = v.replace(/^(\d{0,2})/, '($1')
  return formatted
}

const formatCurrencyForInput = (num?: number) => {
  if (num === undefined || num === null) return ''
  let v = num.toFixed(2)
  v = v.replace('.', ',')
  v = v.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.')
  return v
}

export function ProtocoloDialog({ open, onOpenChange, item, tipos, responsaveis, onSaved }: any) {
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null)

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      nome: '',
      fone: '',
      tipo_acao: '',
      responsavel: '',
      status: 'Protocolado',
      dcontrato: '',
      dcalculo: '',
      dprotocolo: '',
      nautos: '',
      valor: undefined as unknown as number,
      decisao: 'Aguardando',
      origem: '',
      parceiro: '',
      representante: false,
      representante_nome: '',
      representante_cpf: '',
      representante_vinculo: '',
      representante_telefone: '',
    },
  })

  useEffect(() => {
    if (open) {
      setDuplicateWarning(null)
      if (item) {
        const { prazo: _prazo, ...restItem } = item
        form.reset({
          ...restItem,
          valor: item.valor === 0 ? undefined : item.valor,
          dcontrato: item.dcontrato ? item.dcontrato.substring(0, 10) : '',
          dcalculo: item.dcalculo ? item.dcalculo.substring(0, 10) : '',
          dprotocolo: item.dprotocolo ? item.dprotocolo.substring(0, 10) : '',
          origem: item.origem || '',
          parceiro: item.parceiro || '',
          representante: item.representante || false,
          representante_nome: item.representante_nome || '',
          representante_cpf: item.representante_cpf || '',
          representante_vinculo: item.representante_vinculo || '',
          representante_telefone: item.representante_telefone || '',
        })
      } else {
        form.reset({
          nome: '',
          fone: '',
          tipo_acao: '',
          responsavel: '',
          status: 'Protocolado',
          dcontrato: '',
          dcalculo: '',
          dprotocolo: '',
          nautos: '',
          valor: undefined as unknown as number,
          decisao: 'Aguardando',
          origem: '',
          parceiro: '',
          representante: false,
          representante_nome: '',
          representante_cpf: '',
          representante_vinculo: '',
          representante_telefone: '',
        })
      }
    }
  }, [open, item, form])

  const onSubmit = async (values: any, forceSave = false) => {
    if (forceSave !== true) {
      try {
        const normalizedInput = removeAccents(values['nome'].toLowerCase().trim())
        const existing = await pb.collection('protocolo').getFullList({ fields: 'id,nome' })

        const duplicate = existing.find((c: any) => {
          if (item && c['id'] === item['id']) return false
          const normalizedExisting = removeAccents(c['nome'].toLowerCase().trim())
          return normalizedExisting === normalizedInput
        })

        if (duplicate) {
          setDuplicateWarning(duplicate['nome'])
          return
        }
      } catch (err) {
        console.error(err)
      }
    }

    try {
      const payload = { ...values }
      if (payload.dcontrato)
        payload.dcontrato = new Date(payload.dcontrato + 'T12:00:00Z').toISOString()
      else payload.dcontrato = null
      if (payload.dcalculo)
        payload.dcalculo = new Date(payload.dcalculo + 'T12:00:00Z').toISOString()
      else payload.dcalculo = null
      if (payload.dprotocolo)
        payload.dprotocolo = new Date(payload.dprotocolo + 'T12:00:00Z').toISOString()
      else payload.dprotocolo = null

      if (!payload.representante) {
        payload.representante_nome = ''
        payload.representante_cpf = ''
        payload.representante_vinculo = ''
        payload.representante_telefone = ''
      }

      if (item) await updateProtocolo(item.id, payload)
      else await createProtocolo(payload)

      toast.success(item ? 'Protocolo atualizado' : 'Protocolo criado')
      onOpenChange(false)
      onSaved()
    } catch (e) {
      toast.error('Erro ao salvar')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-[#C9922A]">
            {item ? `Editar: ${item.nome}` : 'Adicionar ao Protocolo'}
          </DialogTitle>
          <DialogDescription className="sr-only">Preencha os dados do protocolo.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem className="lg:col-span-2">
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="(00) 00000-0000"
                        onChange={(e) => field.onChange(applyPhoneMask(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tipo_acao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Ação</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {tipos.map((t: any) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="responsavel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Responsável</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {responsaveis.map((r: any) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Protocolado Judicial">Protocolado Judicial</SelectItem>
                        <SelectItem value="Requerimento Adm.">Requerimento Adm.</SelectItem>
                        <SelectItem value="Prov. Inicial">Prov. Inicial</SelectItem>
                        <SelectItem value="R. Docs">R. Docs</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="origem"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Origem</FormLabel>
                    <Select
                      onValueChange={(val) => field.onChange(val === 'none' ? '' : val)}
                      value={field.value || 'none'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Não informado</SelectItem>
                        <SelectItem value="Campanha">Campanha</SelectItem>
                        <SelectItem value="Particular">Particular</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="parceiro"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parceiro</FormLabel>
                    <Select
                      onValueChange={(val) => field.onChange(val === 'none' ? '' : val)}
                      value={field.value || 'none'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        <SelectItem value="Previdenciarista">Previdenciarista</SelectItem>
                        <SelectItem value="Carnevale">Carnevale</SelectItem>
                        <SelectItem value="Macohin">Macohin</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dcontrato"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data do Contrato</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dcalculo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data do Cálculo</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dprotocolo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data do Protocolo</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nautos"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nº do Processo</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="0000000-00.0000.0.00.0000" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="valor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor da Causa</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="0,00"
                        value={
                          field.value !== undefined && field.value !== null
                            ? formatCurrencyForInput(field.value)
                            : ''
                        }
                        onChange={(e) => {
                          const v = e.target.value.replace(/\D/g, '')
                          if (v === '') {
                            field.onChange(undefined)
                          } else {
                            const numericValue = parseInt(v, 10) / 100
                            field.onChange(numericValue)
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="decisao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Decisão</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Aguardando">— Aguardando —</SelectItem>
                        <SelectItem value="Procedente">Procedente</SelectItem>
                        <SelectItem value="Improcedente">Improcedente</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <div className="col-span-1 sm:col-span-2 lg:col-span-3 space-y-4 mt-2">
                <FormField
                  control={form.control}
                  name="representante"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="data-[state=checked]:bg-[#C9922A] data-[state=checked]:border-[#C9922A]"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Representante Legal</FormLabel>
                        <DialogDescription>
                          Marque se este caso envolve um tutor, curador ou representante legal.
                        </DialogDescription>
                      </div>
                    </FormItem>
                  )}
                />

                {form.watch('representante') && (
                  <div className="animate-in fade-in slide-in-from-top-4 duration-300 rounded-lg border border-[#C9922A]/20 bg-[#C9922A]/5 p-4 space-y-4">
                    <h4 className="font-medium text-[#C9922A] text-sm">Dados do Representante</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="representante_nome"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome do Representante</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="representante_cpf"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CPF do Representante</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="000.000.000-00"
                                onChange={(e) => field.onChange(applyCpfMask(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="representante_vinculo"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Parentesco/Vínculo</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Pai/Mãe">Pai/Mãe</SelectItem>
                                <SelectItem value="Tutor(a)">Tutor(a)</SelectItem>
                                <SelectItem value="Curador(a)">Curador(a)</SelectItem>
                                <SelectItem value="Cônjuge">Cônjuge</SelectItem>
                                <SelectItem value="Outro">Outro</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="representante_telefone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Telefone do Representante</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="(00) 00000-0000"
                                onChange={(e) => field.onChange(applyPhoneMask(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {duplicateWarning && (
              <div className="bg-amber-100 border border-amber-300 rounded-md p-4 mt-4 text-sm text-amber-900">
                <p className="mb-3">
                  Atenção: já existe um protocolo cadastrado para{' '}
                  <strong>{duplicateWarning}</strong>. Deseja continuar mesmo assim?
                </p>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="border-amber-300 text-amber-800 hover:bg-amber-200"
                    onClick={() => setDuplicateWarning(null)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    className="bg-amber-600 hover:bg-amber-700 text-white"
                    onClick={() => {
                      setDuplicateWarning(null)
                      onSubmit(form.getValues(), true)
                    }}
                  >
                    Salvar mesmo assim
                  </Button>
                </div>
              </div>
            )}

            {!duplicateWarning && (
              <DialogFooter className="pt-4">
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-[#C9922A] hover:bg-[#C9922A]/90 text-white">
                  {item ? 'Salvar alterações' : 'Salvar'}
                </Button>
              </DialogFooter>
            )}
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export function ProtocoloDeleteDialog({ open, onOpenChange, item, onDeleted }: any) {
  const onConfirm = async () => {
    if (!item) return
    try {
      await deleteProtocolo(item.id)
      toast.success('Excluído com sucesso')
      onOpenChange(false)
      onDeleted()
    } catch (e) {
      toast.error('Erro ao excluir')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir Protocolo</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja excluir <strong>{item?.nome}</strong>? Esta ação não pode ser
            desfeita.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            className="bg-[#E84040] hover:bg-[#d63838]"
            onClick={onConfirm}
          >
            Excluir permanentemente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
