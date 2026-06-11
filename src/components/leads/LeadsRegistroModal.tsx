import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'

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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'

import pb from '@/lib/pocketbase/client'

const schema = z.object({
  data: z.date({ required_error: 'A data é obrigatória.' }),
  campanha: z.string().min(1, 'A campanha é obrigatória.'),
  telefone: z.string().min(1, 'O telefone é obrigatório.'),
  responsavel: z.string().min(1, 'O responsável é obrigatório.'),
  classificacao: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

const DER_OPTIONS = [
  'Qualificado',
  'Contrato Fechado',
  'Prazo Decadencial',
  'Fora do prazo',
  'Revisão em pensão',
  'Revisão',
  'Queria RVT',
  'Outros',
]

const AUX_ACIDENTE_OPTIONS = [
  'Qualificado',
  'Contrato Fechado',
  'Sem qualidade',
  'Aposentado',
  'Carnê',
  'Sem interesse',
  'Engano',
]

interface LeadsRegistroModalProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
}

export function LeadsRegistroModal({ open, onClose, onSaved }: LeadsRegistroModalProps) {
  const [loading, setLoading] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      data: new Date(),
      campanha: '',
      telefone: '',
      responsavel: '',
      classificacao: 'none',
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        data: new Date(),
        campanha: '',
        telefone: '',
        responsavel: '',
        classificacao: 'none',
      })
    }
  }, [open, form])

  const watchedCampanha = form.watch('campanha')

  useEffect(() => {
    if (open) {
      form.setValue('classificacao', 'none')
    }
  }, [watchedCampanha, form, open])

  const onSubmit = async (values: FormValues) => {
    setLoading(true)
    try {
      await pb.collection('leads_registro').create({
        data: format(values.data, 'yyyy-MM-dd'),
        campanha: values.campanha,
        telefone: values.telefone,
        responsavel: values.responsavel,
        classificacao: values.classificacao === 'none' ? '' : values.classificacao,
      })
      onSaved()
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const classificacaoOptions =
    watchedCampanha === 'DER'
      ? DER_OPTIONS
      : watchedCampanha === 'AUX. ACIDENTE'
        ? AUX_ACIDENTE_OPTIONS
        : []

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[425px] bg-[#FAF8F2] font-sans">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Novo Lead</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="data"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data</FormLabel>
                  <Popover>
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
                        onSelect={field.onChange}
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
              name="campanha"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Campanha</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || undefined}>
                    <FormControl>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Selecione a campanha" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="DER">DER</SelectItem>
                      <SelectItem value="AUX. ACIDENTE">AUX. ACIDENTE</SelectItem>
                    </SelectContent>
                  </Select>
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
                    <Input placeholder="Ex: (00) 00000-0000" className="bg-white" {...field} />
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
                      <SelectItem value="Giulianna">Giulianna</SelectItem>
                      <SelectItem value="Nataly">Nataly</SelectItem>
                      <SelectItem value="Kaique">Kaique</SelectItem>
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
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={!watchedCampanha}
                  >
                    <FormControl>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Selecione (opcional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Qualificando</SelectItem>
                      {classificacaoOptions.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

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
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
