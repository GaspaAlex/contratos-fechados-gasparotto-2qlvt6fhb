import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import { toast } from 'sonner'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { DynamicSelect } from '@/components/dashboard/DynamicSelect'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'

import pb from '@/lib/pocketbase/client'
import { getResponsaveisAtivos } from '@/services/responsaveis'

const schema = z.object({
  data: z.date({ error: 'A data é obrigatória.' }),
  telefone: z.string().min(1, 'O telefone é obrigatório.'),
  responsavel: z.string().min(1, 'O responsável é obrigatório.'),
  classificacao: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface LeadsRegistroModalProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  campanha: string
  lead?: any
  onClassificacaoAdded?: () => void
}

export function LeadsRegistroModal({
  open,
  onClose,
  onSaved,
  campanha,
  lead,
  onClassificacaoAdded,
}: LeadsRegistroModalProps) {
  const [loading, setLoading] = useState(false)
  const [dateOpen, setDateOpen] = useState(false)
  const [duplicateWarning, setDuplicateWarning] = useState(false)
  const [classificacaoItems, setClassificacaoItems] = useState<{ id: string; nome: string }[]>([])
  const [responsavelItems, setResponsavelItems] = useState<{ id: string; nome: string }[]>([])

  const activeCampanha = lead ? lead.campanha : campanha

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      data: new Date(),
      telefone: '',
      responsavel: '',
      classificacao: 'none',
    },
  })

  useEffect(() => {
    if (open) {
      if (lead) {
        let date = new Date()
        if (lead.data) {
          const [datePart] = lead.data.split(' ')
          date = new Date(`${datePart}T12:00:00`)
        }
        form.reset({
          data: date,
          telefone: lead.telefone,
          responsavel: lead.responsavel,
          classificacao: lead.classificacao || 'none',
        })
      } else {
        form.reset({
          data: new Date(),
          telefone: '',
          responsavel: '',
          classificacao: 'none',
        })
      }
      setDateOpen(false)
      setDuplicateWarning(false)
    }
  }, [open, form, lead])

  useEffect(() => {
    if (open && !lead) {
      form.setValue('classificacao', 'none')
    }
  }, [campanha, form, open, lead])

  useEffect(() => {
    const fetchResponsaveis = async () => {
      try {
        const res = await getResponsaveisAtivos()
        setResponsavelItems(res.map((r) => ({ id: r.id, nome: r.nome })))
      } catch (err) {
        console.error('Error fetching responsaveis', err)
      }
    }

    if (open) {
      fetchResponsaveis()
    }
  }, [open])

  useEffect(() => {
    const fetchClassificacoes = async () => {
      if (!activeCampanha) {
        setClassificacaoItems([])
        return
      }
      try {
        let records = await pb.collection('classificacoes_lead').getFullList({
          filter: `campanha = '${activeCampanha}'`,
          sort: 'created',
        })

        if (activeCampanha === 'AUX. ACIDENTE') {
          const renamingMap: Record<string, string> = {
            'Sem qualidade': 'Sem Qual.',
            Aposentado: 'Aposent.',
            'Sem interesse': 'Sem Inter.',
            'Recebendo aux doença': 'Rec. Aux. D.',
            'Não sofreu acidente': 'N. Sof. Ac.',
            'Servidor público': 'Serv. Públ.',
          }

          let needsRefetch = false

          for (const r of records) {
            if (renamingMap[r.nome]) {
              await pb.collection('classificacoes_lead').update(r.id, { nome: renamingMap[r.nome] })
              needsRefetch = true
            }
          }

          const currentNames = records.map((r) => renamingMap[r.nome] || r.nome)
          const requiredNames = ['Possui Adv', 'Rec. Aux. Acid.']

          for (const req of requiredNames) {
            if (!currentNames.includes(req)) {
              await pb.collection('classificacoes_lead').create({
                campanha: 'AUX. ACIDENTE',
                nome: req,
              })
              needsRefetch = true
            }
          }

          if (needsRefetch) {
            records = await pb.collection('classificacoes_lead').getFullList({
              filter: `campanha = '${activeCampanha}'`,
              sort: 'created',
            })
            if (onClassificacaoAdded) {
              onClassificacaoAdded()
            }
          }

          const currentVal = form.getValues('classificacao')
          if (currentVal && renamingMap[currentVal]) {
            form.setValue('classificacao', renamingMap[currentVal])
          }
        }

        setClassificacaoItems(records.map((r) => ({ id: r.id, nome: r.nome })))
      } catch (err) {
        console.error('Error fetching classificacoes', err)
      }
    }

    if (open) {
      fetchClassificacoes()
    }
  }, [activeCampanha, open, form, onClassificacaoAdded])

  const handleAddClassificacao = async (nome: string) => {
    try {
      const record = await pb.collection('classificacoes_lead').create({
        campanha: activeCampanha,
        nome,
      })
      setClassificacaoItems((prev) => [...prev, { id: record.id, nome: record.nome }])
      toast.success('Classificação adicionada')
      if (onClassificacaoAdded) {
        onClassificacaoAdded()
      }
    } catch (err) {
      console.error(err)
      toast.error('Erro ao adicionar classificação')
    }
  }

  const formatPhone = (value: string) => {
    if (!value) return ''
    const numbers = value.replace(/\D/g, '')
    const truncated = numbers.slice(0, 11)

    if (truncated.length === 0) return ''
    if (truncated.length <= 2) return `(${truncated}`
    if (truncated.length <= 7) return `(${truncated.slice(0, 2)}) ${truncated.slice(2)}`
    return `(${truncated.slice(0, 2)}) ${truncated.slice(2, 7)}-${truncated.slice(7)}`
  }

  const handleSave = async (values: FormValues, forceSave = false) => {
    setLoading(true)
    try {
      if (!forceSave && !lead) {
        const duplicates = await pb.collection('leads_registro').getFullList({
          filter: `telefone = '${values.telefone}' && campanha = '${campanha}'`,
        })

        if (duplicates.length > 0) {
          setDuplicateWarning(true)
          setLoading(false)
          return
        }
      }

      const d = values.data
      const dataStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

      const payload = {
        data: dataStr,
        campanha: lead ? lead.campanha : campanha,
        telefone: values.telefone,
        responsavel: values.responsavel,
        classificacao: values.classificacao === 'none' ? '' : values.classificacao,
      }

      if (lead) {
        await pb.collection('leads_registro').update(lead.id, payload)
      } else {
        await pb.collection('leads_registro').create(payload)
      }

      onSaved()
    } catch (error) {
      console.error(error)
      toast.error(lead ? 'Erro ao atualizar lead' : 'Erro ao salvar lead')
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = (values: FormValues) => handleSave(values, false)

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[425px] bg-[#FAF8F2] font-sans">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {lead ? 'Editar Lead' : 'Novo Lead'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="data"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data</FormLabel>
                  <Popover open={dateOpen} onOpenChange={setDateOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={'outline'}
                          className={cn(
                            'w-full pl-3 text-left font-normal bg-white',
                            !field.value && 'text-muted-foreground',
                          )}
                        >
                          {field.value ? (
                            format(field.value, 'dd/MM/yyyy')
                          ) : (
                            <span>Selecione uma data</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(date) => {
                          if (date) {
                            field.onChange(date)
                            setDateOpen(false)
                          }
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="telefone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: (00) 00000-0000"
                      className="bg-white"
                      {...field}
                      onChange={(e) => {
                        const formatted = formatPhone(e.target.value)
                        field.onChange(formatted)
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="responsavel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Responsável</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || undefined}>
                    <FormControl>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Selecione o responsável" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {responsavelItems.map((r) => (
                        <SelectItem key={r.id} value={r.nome}>
                          {r.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="classificacao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Classificação</FormLabel>
                  <FormControl>
                    <DynamicSelect
                      value={!field.value || field.value === 'none' ? '' : field.value}
                      onChange={(val: string) => {
                        if (!val || val === 'none') {
                          field.onChange('')
                        } else {
                          field.onChange(val)
                        }
                      }}
                      items={classificacaoItems}
                      onAdd={handleAddClassificacao}
                      placeholder="Qualificando"
                      disabled={!activeCampanha}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {duplicateWarning && (
              <div className="bg-amber-50 border border-amber-500 p-4 rounded-md mt-4 flex flex-col gap-3">
                <p className="text-sm text-amber-700 font-semibold">
                  Já existe um lead cadastrado com este telefone nesta campanha. Deseja continuar
                  mesmo assim?
                </p>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDuplicateWarning(false)}
                    className="border-amber-500 text-amber-700 hover:bg-amber-100 h-9"
                    disabled={loading}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    onClick={() => handleSave(form.getValues(), true)}
                    className="bg-amber-600 hover:bg-amber-700 text-white h-9"
                    disabled={loading}
                  >
                    {loading ? 'Salvando...' : 'Registrar mesmo assim'}
                  </Button>
                </div>
              </div>
            )}

            {!duplicateWarning && (
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-[#C9922A] hover:bg-[#b07d22] text-white"
                >
                  {loading ? 'Salvando...' : 'Salvar'}
                </Button>
              </DialogFooter>
            )}
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
