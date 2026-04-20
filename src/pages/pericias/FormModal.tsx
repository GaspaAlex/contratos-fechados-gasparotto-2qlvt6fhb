import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Pericia, createPericia, updatePericia } from '@/services/pericias'
import { format, parseISO } from 'date-fns'

const schema = z.object({
  nome: z.string().min(1, 'Obrigatório'),
  nautos: z.string().min(1, 'Obrigatório'),
  data: z.string().min(1, 'Obrigatório'),
  horario: z.string().optional(),
  endereco: z.string().optional(),
  perito: z.string().optional(),
  status: z.enum(['Agendado', 'Pendente', 'Cancelado']),
  compareceu: z.enum(['Sim', 'Não', 'Não realizada']),
  laudo: z.enum(['Favorável', 'Desfavorável', 'Aguardando']),
})

export function FormModal({
  open,
  onOpenChange,
  item,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  item: Pericia | null
}) {
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      nome: '',
      nautos: '',
      data: format(new Date(), 'yyyy-MM-dd'),
      horario: '',
      endereco: '',
      perito: '',
      status: 'Agendado',
      compareceu: 'Não realizada',
      laudo: 'Aguardando',
    },
  })

  useEffect(() => {
    if (item) {
      const d = item.data ? parseISO(item.data) : new Date()
      form.reset({
        nome: item.nome || '',
        nautos: item.nautos || '',
        data: format(d, 'yyyy-MM-dd'),
        horario: item.horario || '',
        endereco: item.endereco || '',
        perito: item.perito || '',
        status: item.status || 'Agendado',
        compareceu: item.compareceu || 'Não realizada',
        laudo: item.laudo || 'Aguardando',
      })
    } else {
      form.reset({
        nome: '',
        nautos: '',
        data: format(new Date(), 'yyyy-MM-dd'),
        horario: '',
        endereco: '',
        perito: '',
        status: 'Agendado',
        compareceu: 'Não realizada',
        laudo: 'Aguardando',
      })
    }
  }, [item, open, form])

  const onSubmit = async (vals: z.infer<typeof schema>) => {
    const payload = {
      ...vals,
      data: new Date(vals.data + 'T12:00:00.000Z').toISOString(),
    }
    if (item) {
      await updatePericia(item.id, payload)
    } else {
      await createPericia(payload)
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="text-amber-600 dark:text-amber-500 text-xl">
            {item ? `Editar: ${item.nome}` : 'Adicionar Perícia'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 mt-2">
          <div className="grid grid-cols-2 gap-x-4 gap-y-4">
            <div className="space-y-2 col-span-2">
              <Label>Nome do Cliente *</Label>
              <Input {...form.register('nome')} placeholder="Ex: João da Silva" />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Nº do Processo *</Label>
              <Input {...form.register('nautos')} placeholder="Ex: 0001234-56.2026.8.16.0001" />
            </div>
            <div className="space-y-2">
              <Label>Data *</Label>
              <Input type="date" {...form.register('data')} />
            </div>
            <div className="space-y-2">
              <Label>Horário</Label>
              <Input type="time" {...form.register('horario')} />
            </div>
            <div className="space-y-2">
              <Label>Perito</Label>
              <Input {...form.register('perito')} placeholder="Nome do perito" />
            </div>
            <div className="space-y-2">
              <Label>Endereço</Label>
              <Input {...form.register('endereco')} placeholder="Local da perícia" />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                {...form.register('status')}
              >
                <option value="Agendado">Agendado</option>
                <option value="Pendente">Pendente</option>
                <option value="Cancelado">Cancelado</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Compareceu</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                {...form.register('compareceu')}
              >
                <option value="Não realizada">— Não realizada —</option>
                <option value="Sim">Sim</option>
                <option value="Não">Não</option>
              </select>
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Laudo</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                {...form.register('laudo')}
              >
                <option value="Aguardando">— Aguardando —</option>
                <option value="Favorável">Favorável</option>
                <option value="Desfavorável">Desfavorável</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white">
              Salvar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
