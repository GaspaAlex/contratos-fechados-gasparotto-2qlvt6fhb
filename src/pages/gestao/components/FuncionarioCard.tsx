import { Edit2, Power, PowerOff } from 'lucide-react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getFuncionarioPhotoUrl } from '@/services/ponto'
import { toast } from 'sonner'

export function FuncionarioCard({ func, onEdit, onToggleStatus, onDelete }: any) {
  const formatCarga = (mins: number) => {
    if (!mins) return '0h00'
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return `${h}h${m.toString().padStart(2, '0')}`
  }

  const getProfileBadgeStyle = (perfil: string) => {
    switch (perfil) {
      case 'admin':
        return 'bg-[#FFF8E1] text-[#C8922A] hover:bg-[#FFF8E1]'
      case 'lider':
        return 'bg-[#E3F2FD] text-[#1565C0] hover:bg-[#E3F2FD]'
      default:
        return 'bg-[#F5F5F5] text-[#616161] hover:bg-[#F5F5F5]'
    }
  }

  const getProfileLabel = (perfil: string) => {
    switch (perfil) {
      case 'admin':
        return 'Admin'
      case 'lider':
        return 'Líder'
      default:
        return 'Funcionária'
    }
  }

  return (
    <Card className="overflow-hidden border-none shadow-md transition-shadow hover:shadow-lg">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <Avatar className="h-20 w-20 border-2 border-white shadow-sm">
            <AvatarImage
              src={getFuncionarioPhotoUrl(func)}
              alt={func.nome}
              className="object-cover"
            />
            <AvatarFallback className="bg-[#C8922A] text-2xl font-semibold text-white">
              {func.nome.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <Badge
            variant="outline"
            className={`border-none ${func.ativo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
          >
            {func.ativo ? 'Ativo' : 'Inativo'}
          </Badge>
        </div>
        <div className="mt-4">
          <CardTitle className="text-xl line-clamp-1">{func.nome}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pb-6">
        <div className="flex items-center gap-2">
          <Badge className={`border-none ${getProfileBadgeStyle(func.perfil)}`}>
            {getProfileLabel(func.perfil)}
          </Badge>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
          <div>
            <p className="font-medium text-gray-900">Horário</p>
            <p>
              {func.horario_entrada || '--'} às {func.horario_saida || '--'}
            </p>
          </div>
          <div>
            <p className="font-medium text-gray-900">Carga Diária</p>
            <p>{formatCarga(func.carga_diaria)}</p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-2 border-t bg-gray-50/50 p-4">
        <div className="flex w-full gap-2">
          <Button variant="outline" className="flex-1 bg-white" onClick={() => onEdit(func)}>
            <Edit2 className="mr-2 h-4 w-4" />
            Editar
          </Button>
          <Button
            variant={func.ativo ? 'destructive' : 'default'}
            className={!func.ativo ? 'flex-1 bg-green-600 hover:bg-green-700 text-white' : 'flex-1'}
            onClick={() => {
              if (func.perfil === 'admin' && func.ativo) {
                toast.error('Não é possível desativar um perfil de administrador.')
                return
              }
              onToggleStatus(func)
            }}
          >
            {func.ativo ? (
              <PowerOff className="mr-2 h-4 w-4" />
            ) : (
              <Power className="mr-2 h-4 w-4" />
            )}
            {func.ativo ? 'Desativar' : 'Ativar'}
          </Button>
        </div>
        <Button
          className="w-full bg-[#C62828] text-white hover:bg-[#b71c1c]"
          onClick={() => onDelete(func)}
        >
          Excluir
        </Button>
      </CardFooter>
    </Card>
  )
}
