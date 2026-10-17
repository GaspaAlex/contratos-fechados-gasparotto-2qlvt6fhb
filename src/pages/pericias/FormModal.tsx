import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Pericia, createPericia, updatePericia } from '@/services/pericias'
import { format, parseISO } from 'date-fns'
import { Plus, Check, X } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'

const schema = z.object({
  nome: z.string().min(1, 'Obrigatório'),
  nautos: z.string().min(1, 'Obrigatório'),
  data: z.string().min(1, 'Obrigatório'),
  horario: z.string().optional(),
  endereco: z.string().optional(),
  perito: z.string().optional(),
  status: z.string().min(1, 'Obrigatório'),
  compareceu: z.enum(['Sim', 'Não', 'Não realizada']),
  laudo: z.enum([
    'Favorável',
    'Parcialmente Favorável',
    'Parcialmente Desfavorável',
    'Desfavorável',
    'Aguardando',
  ]),
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
  const [statusOptions, setStatusOptions] = useState<string[]>([
    'Agendado',
    'Pendente',
    'Cancelado',
    'Concluído',
  ])
  const [isAddingStatus, setIsAddingStatus] = useState(false)
  const [newStatus, setNewStatus] = useState('')

  useEffect(() => {
    const loadStatuses = async () => {
      try {
        const records = await pb.collection('status_pericia').getFullList({ sort: 'created' })
        setStatusOptions(records.map((r) => r.nome))
      } catch (e) {
        console.error(e)
      }
    }
    loadStatuses()
  }, [])

  useRealtime('status_pericia', (e) => {
    if (e.action === 'create') {
      setStatusOptions((prev) => {
        if (!prev.includes(e.record.nome)) {
          return [...prev, e.record.nome]
        }
        return prev
      })
    }
  })

  const handleAddStatus = async () => {
    if (!newStatus.trim()) return
    try {
      const created = await pb.collection('status_pericia').create({ nome: newStatus.trim() })
      form.setValue('status', created.nome)
      setIsAddingStatus(false)
      setNewStatus('')
    } catch (err) {
      console.error(err)
    }
  }

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
      <DialogContent className="sm:max-w-[550px] rounded-[10px] border border-[#E4E7EB] dark:border-border p-5 sm:p-6 bg-white dark:bg-card shadow-lg">
        <DialogHeader className="pb-3 border-b border-[#E4E7EB]/80 dark:border-border/80">
          <div className="flex flex-col gap-1">
            <span className="inline-flex items-center self-start text-[10px] font-bold tracking-[1.5px] uppercase text-[#C9922A] bg-[#C9922A]/10 px-2 py-0.5 rounded">
              GESTÃO DE CASOS
            </span>
            <DialogTitle className="text-lg sm:text-xl font-bold tracking-tight text-[#252B34] dark:text-foreground">
              {item ? `Editar: ${item.nome}` : 'Adicionar Perícia'}
            </DialogTitle>
          </div>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
            <div className="space-y-2 col-span-1 sm:col-span-2">
              <Label className="text-[11px] font-semibold text-[#78818E] dark:text-muted-foreground uppercase tracking-wide">
                Nome do Cliente *
              </Label>
              <Input
                {...form.register('nome')}
                placeholder="Ex: João da Silva"
                className="h-9 border-[#E4E7EB] dark:border-border rounded-md focus-visible:ring-[#C9922A] bg-white dark:bg-card"
              />
            </div>
            <div className="space-y-2 col-span-1 sm:col-span-2">
              <Label className="text-[11px] font-semibold text-[#78818E] dark:text-muted-foreground uppercase tracking-wide">
                Nº do Processo *
              </Label>
              <Input
                {...form.register('nautos')}
                placeholder="Ex: 0001234-56.2026.8.16.0001"
                className="h-9 font-mono text-xs border-[#E4E7EB] dark:border-border rounded-md focus-visible:ring-[#C9922A] bg-white dark:bg-card"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] font-semibold text-[#78818E] dark:text-muted-foreground uppercase tracking-wide">
                Data *
              </Label>
              <Input
                type="date"
                {...form.register('data')}
                className="h-9 border-[#E4E7EB] dark:border-border rounded-md focus-visible:ring-[#C9922A] bg-white dark:bg-card"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] font-semibold text-[#78818E] dark:text-muted-foreground uppercase tracking-wide">
                Horário
              </Label>
              <Input
                type="time"
                {...form.register('horario')}
                className="h-9 border-[#E4E7EB] dark:border-border rounded-md focus-visible:ring-[#C9922A] bg-white dark:bg-card"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] font-semibold text-[#78818E] dark:text-muted-foreground uppercase tracking-wide">
                Perito
              </Label>
              <Input
                {...form.register('perito')}
                placeholder="Nome do perito"
                className="h-9 border-[#E4E7EB] dark:border-border rounded-md focus-visible:ring-[#C9922A] bg-white dark:bg-card"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] font-semibold text-[#78818E] dark:text-muted-foreground uppercase tracking-wide">
                Endereço
              </Label>
              <Input
                {...form.register('endereco')}
                placeholder="Local da perícia"
                className="h-9 border-[#E4E7EB] dark:border-border rounded-md focus-visible:ring-[#C9922A] bg-white dark:bg-card"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] font-semibold text-[#78818E] dark:text-muted-foreground uppercase tracking-wide">
                Status
              </Label>{' '}
              {!isAddingStatus ? (
                <div className="flex items-center gap-2">
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    {...form.register('status')}
                  >
                    {statusOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setIsAddingStatus(true)}
                    className="shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Input
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    placeholder="Novo status"
                    autoFocus
                  />
                  <Button
                    type="button"
                    variant="default"
                    size="icon"
                    onClick={handleAddStatus}
                    className="shrink-0"
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      setIsAddingStatus(false)
                      setNewStatus('')
                    }}
                    className="shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] font-semibold text-[#78818E] dark:text-muted-foreground uppercase tracking-wide">
                Compareceu
              </Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                {...form.register('compareceu')}
              >
                <option value="Não realizada">— Não realizada —</option>
                <option value="Sim">Sim</option>
                <option value="Não">Não</option>
              </select>
            </div>
            <div className="space-y-2 col-span-1 sm:col-span-2">
              <Label className="text-[11px] font-semibold text-[#78818E] dark:text-muted-foreground uppercase tracking-wide">
                Laudo
              </Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                {...form.register('laudo')}
              >
                <option value="Aguardando">— Aguardando —</option>
                <option value="Favorável">Favorável</option>
                <option value="Parcialmente Favorável">Parcialmente Favorável</option>
                <option value="Parcialmente Desfavorável">Parcialmente Desfavorável</option>
                <option value="Desfavorável">Desfavorável</option>
              </select>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-3 mt-1 border-t border-[#E4E7EB]/80 dark:border-border/80">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-9 px-4 text-xs font-semibold border-[#E4E7EB] dark:border-border rounded-md text-[#78818E] hover:text-[#252B34] dark:hover:text-foreground"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="h-9 px-4 text-xs font-semibold bg-[#C9922A] hover:bg-[#b58324] text-white rounded-md shadow-sm"
            >
              Salvar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
