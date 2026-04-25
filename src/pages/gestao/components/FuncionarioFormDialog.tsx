import { useRef, useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Upload, User as UserIcon } from 'lucide-react'
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getFuncionarioPhotoUrl } from '@/services/ponto'

const formSchema = z
  .object({
    nome: z.string().min(1, 'Nome é obrigatório'),
    perfil: z.enum(['admin', 'lider', 'funcionaria']),
    pin: z
      .string()
      .length(4, 'PIN deve ter exatos 4 dígitos')
      .regex(/^\d+$/, 'Apenas números permitidos'),
    confirmPin: z.string().min(1, 'Confirmação de PIN é obrigatória'),
    horario_entrada: z.string().min(1, 'Obrigatório'),
    horario_saida: z.string().min(1, 'Obrigatório'),
  })
  .refine((data) => data.pin === data.confirmPin, {
    message: 'Os PINs não coincidem',
    path: ['confirmPin'],
  })

type FormValues = z.infer<typeof formSchema>

export function FuncionarioFormDialog({ isOpen, onOpenChange, funcionario, onSubmit }: any) {
  const [fotoFile, setFotoFile] = useState<File | null>(null)
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: '',
      perfil: 'funcionaria',
      pin: '',
      confirmPin: '',
      horario_entrada: '08:00',
      horario_saida: '17:30',
    },
  })

  useEffect(() => {
    if (funcionario) {
      form.reset({
        nome: funcionario.nome,
        perfil: funcionario.perfil,
        pin: funcionario.pin,
        confirmPin: funcionario.pin,
        horario_entrada: funcionario.horario_entrada || '08:00',
        horario_saida: funcionario.horario_saida || '17:30',
      })
      setFotoPreview(getFuncionarioPhotoUrl(funcionario))
    } else {
      form.reset({
        nome: '',
        perfil: 'funcionaria',
        pin: '',
        confirmPin: '',
        horario_entrada: '08:00',
        horario_saida: '17:30',
      })
      setFotoPreview(null)
    }
    setFotoFile(null)
  }, [funcionario, isOpen, form])

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFotoFile(file)
      setFotoPreview(URL.createObjectURL(file))
    }
  }

  const handleSubmit = async (data: FormValues) => {
    const success = await onSubmit(data, fotoFile)
    if (success === false) {
      form.setError('pin', { message: 'Este PIN já está em uso. Escolha outro.' })
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{funcionario ? 'Editar Funcionário' : 'Novo Funcionário'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 pt-4">
          <div className="flex flex-col items-center gap-4">
            <Avatar className="h-24 w-24 border-2 border-gray-200">
              <AvatarImage src={fotoPreview || ''} className="object-cover" />
              <AvatarFallback className="bg-gray-100 text-gray-400">
                <UserIcon className="h-10 w-10" />
              </AvatarFallback>
            </Avatar>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFotoChange}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mr-2 h-4 w-4" /> Alterar Foto
            </Button>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome Completo</Label>
              <Input id="nome" {...form.register('nome')} placeholder="Ex: Maria Silva" />
              {form.formState.errors.nome && (
                <p className="text-xs text-red-500">{form.formState.errors.nome.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="perfil">Perfil de Acesso</Label>
              <select
                id="perfil"
                {...form.register('perfil')}
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="funcionaria">Funcionária</option>
                <option value="lider">Líder</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pin">PIN (4 dígitos)</Label>
                <Input id="pin" type="password" maxLength={4} {...form.register('pin')} />
                {form.formState.errors.pin && (
                  <p className="text-xs text-red-500">{form.formState.errors.pin.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPin">Confirmar PIN</Label>
                <Input
                  id="confirmPin"
                  type="password"
                  maxLength={4}
                  {...form.register('confirmPin')}
                />
                {form.formState.errors.confirmPin && (
                  <p className="text-xs text-red-500">{form.formState.errors.confirmPin.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="horario_entrada">Entrada</Label>
                <Input id="horario_entrada" type="time" {...form.register('horario_entrada')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="horario_saida">Saída</Label>
                <Input id="horario_saida" type="time" {...form.register('horario_saida')} />
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Carga diária: calculada automaticamente abatendo 1h de intervalo.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-[#C8922A] text-white hover:bg-[#b07d20]">
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
