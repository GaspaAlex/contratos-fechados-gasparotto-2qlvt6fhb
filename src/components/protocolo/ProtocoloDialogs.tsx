import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
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

const schema = z.object({
  nome: z.string().min(1, 'Obrigatório'),
  fone: z.string().optional(),
  tipo_acao: z.string().optional(),
  responsavel: z.string().optional(),
  status: z.string().min(1, 'Obrigatório'),
  dcalculo: z.string().optional(),
  dprotocolo: z.string().optional(),
  prazo: z.coerce.number().min(1).default(15),
  nautos: z.string().optional(),
  valor: z.coerce.number().optional(),
  decisao: z.string().default('Aguardando'),
})

export function ProtocoloDialog({ open, onOpenChange, item, tipos, responsaveis, onSaved }: any) {
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      nome: '',
      fone: '',
      tipo_acao: '',
      responsavel: '',
      status: 'Protocolado',
      dcalculo: '',
      dprotocolo: '',
      prazo: 15,
      nautos: '',
      valor: 0,
      decisao: 'Aguardando',
    },
  })

  useEffect(() => {
    if (open) {
      if (item) {
        form.reset({
          ...item,
          dcalculo: item.dcalculo ? item.dcalculo.substring(0, 10) : '',
          dprotocolo: item.dprotocolo ? item.dprotocolo.substring(0, 10) : '',
        })
      } else {
        form.reset({
          nome: '',
          fone: '',
          tipo_acao: '',
          responsavel: '',
          status: 'Protocolado',
          dcalculo: '',
          dprotocolo: '',
          prazo: 15,
          nautos: '',
          valor: 0,
          decisao: 'Aguardando',
        })
      }
    }
  }, [open, item, form])

  const onSubmit = async (values: any) => {
    try {
      const payload = { ...values }
      if (payload.dcalculo)
        payload.dcalculo = new Date(payload.dcalculo + 'T12:00:00Z').toISOString()
      else payload.dcalculo = null
      if (payload.dprotocolo)
        payload.dprotocolo = new Date(payload.dprotocolo + 'T12:00:00Z').toISOString()
      else payload.dprotocolo = null

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
      <DialogContent className="max-w-3xl">
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
                      <Input {...field} placeholder="(00) 00000-0000" />
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
                        <SelectItem value="Protocolado">Protocolado</SelectItem>
                        <SelectItem value="Prov. Inicial">Prov. Inicial</SelectItem>
                        <SelectItem value="R. Docs">R. Docs</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dcalculo"
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
                name="prazo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prazo (dias úteis)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
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
                      <Input type="number" step="0.01" {...field} />
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
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-[#C9922A] hover:bg-[#C9922A]/90 text-white">
                {item ? 'Salvar alterações' : 'Salvar'}
              </Button>
            </DialogFooter>
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
          <Button variant="destructive" onClick={onConfirm}>
            Excluir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
