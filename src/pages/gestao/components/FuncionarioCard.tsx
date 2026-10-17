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

  const getProfileBadge = (perfil: string) => {
    switch (perfil) {
      case 'admin':
        return (
          <span className="inline-flex items-center text-[10px] font-semibold tracking-wider uppercase text-[#C9922A] bg-[#C9922A]/10 dark:bg-[#C9922A]/20 px-2 py-0.5 rounded border border-[#C9922A]/30">
            Administrador
          </span>
        )
      case 'lider':
        return (
          <span className="inline-flex items-center text-[10px] font-semibold tracking-wider uppercase text-[#1E5F8A] dark:text-[#64B5F6] bg-[#1E5F8A]/10 dark:bg-[#1E5F8A]/20 px-2 py-0.5 rounded border border-[#1E5F8A]/25">
            Líder
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center text-[10px] font-semibold tracking-wider uppercase text-[#78818E] dark:text-muted-foreground bg-[#F5F6F8] dark:bg-muted/50 px-2 py-0.5 rounded border border-[#E4E7EB]/80 dark:border-border/70">
            Funcionária
          </span>
        )
    }
  }

  const photoUrl = getFuncionarioPhotoUrl(func)

  return (
    <div className="group relative flex flex-col justify-between rounded-[10px] border border-[#E4E7EB] dark:border-border bg-white dark:bg-card hover:border-[#C9922A]/40 hover:shadow-md transition-all duration-200">
      {/* 1. CABEÇALHO DO CARD: Avatar com anel dourado + Indicador de atividade + Nome sem corte + Badges */}
      <div className="p-4 sm:p-5 pb-3">
        <div className="flex items-start gap-3.5">
          {/* Avatar com anel dourado e indicador de atividade verde */}
          <div className="relative shrink-0">
            <Avatar className="w-14 h-14 rounded-full border border-[#E4E7EB] dark:border-border ring-2 ring-[#C9922A]/20 shadow-xs">
              <AvatarImage src={photoUrl} alt={func.nome} className="object-cover" />
              <AvatarFallback className="bg-[#FAF8F2] dark:bg-muted text-sm font-bold text-[#C9922A]">
                {func.nome ? func.nome.substring(0, 2).toUpperCase() : 'CO'}
              </AvatarFallback>
            </Avatar>
            {func.ativo ? (
              <span
                className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-[#3E8E5A] ring-2 ring-white dark:ring-card"
                title="Colaborador ativo"
              />
            ) : (
              <span
                className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-[#B4453C] ring-2 ring-white dark:ring-card"
                title="Colaborador inativo"
              />
            )}
          </div>

          {/* Nome e Badges */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1.5 flex-wrap">
              {getProfileBadge(func.perfil)}
              <Badge
                variant="outline"
                className={`text-[10px] font-semibold border-none px-2 py-0.5 rounded-full ${
                  func.ativo
                    ? 'bg-[#3E8E5A]/10 text-[#3E8E5A] dark:bg-[#3E8E5A]/20'
                    : 'bg-[#B4453C]/10 text-[#B4453C] dark:bg-[#B4453C]/20'
                }`}
              >
                {func.ativo ? 'Ativo' : 'Inativo'}
              </Badge>
            </div>
            {/* Nome Completo: quebra naturalmente em duas ou mais linhas sem cortes */}
            <h3 className="mt-2 text-sm sm:text-base font-bold text-[#252B34] dark:text-foreground leading-snug break-words group-hover:text-[#C9922A] transition-colors">
              {func.nome}
            </h3>
          </div>
        </div>
      </div>

      {/* 2. INFORMAÇÕES OPERACIONAIS: Horário de Trabalho e Carga Diária */}
      <div className="px-4 sm:px-5 py-3 border-t border-[#E4E7EB]/70 dark:border-border/60 bg-[#F5F6F8]/40 dark:bg-muted/10">
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="space-y-0.5 min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground block truncate">
              Horário
            </span>
            <p className="font-semibold text-[#252B34] dark:text-foreground tabular-nums truncate">
              {func.horario_entrada && func.horario_saida
                ? `${func.horario_entrada} às ${func.horario_saida}`
                : func.perfil === 'admin'
                  ? 'Flexível / Admin'
                  : '--'}
            </p>
          </div>
          <div className="space-y-0.5 min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground block truncate">
              Carga Diária
            </span>
            <p className="font-semibold text-[#252B34] dark:text-foreground tabular-nums truncate">
              {func.perfil === 'admin' ? 'Integral' : formatCarga(func.carga_diaria)}
            </p>
          </div>
        </div>
      </div>

      {/* 3. ÁREA DE AÇÕES: Editar | Ativar/Desativar | Excluir */}
      <div className="p-3 sm:p-4 pt-3 border-t border-[#E4E7EB]/70 dark:border-border/60 space-y-2 bg-white dark:bg-card rounded-b-[10px]">
        <div className="grid grid-cols-2 gap-2">
          {/* Botão Editar: Neutro corporativo */}
          <Button
            variant="outline"
            className="h-8 text-xs font-semibold rounded-md border-[#E4E7EB] dark:border-border hover:border-[#C9922A]/50 text-[#252B34] dark:text-foreground hover:text-[#C9922A] hover:bg-[#FAF8F2] dark:hover:bg-muted/40 transition-colors"
            onClick={() => onEdit(func)}
          >
            <Edit2 className="mr-1.5 h-3.5 w-3.5 text-[#78818E]" />
            Editar
          </Button>

          {/* Botão Ativar/Desativar */}
          {func.ativo ? (
            <Button
              variant="outline"
              className="h-8 text-xs font-semibold rounded-md border-red-200 dark:border-red-950/60 text-[#B4453C] hover:bg-red-50 dark:hover:bg-red-950/30 hover:border-red-300 transition-colors"
              onClick={() => {
                if (func.perfil === 'admin' && func.ativo) {
                  toast.error('Não é possível desativar um perfil de administrador.')
                  return
                }
                onToggleStatus(func)
              }}
            >
              <PowerOff className="mr-1.5 h-3.5 w-3.5 text-[#B4453C]" />
              Desativar
            </Button>
          ) : (
            <Button
              variant="outline"
              className="h-8 text-xs font-semibold rounded-md border-green-200 dark:border-green-950/60 text-[#3E8E5A] hover:bg-green-50 dark:hover:bg-green-950/30 hover:border-green-300 transition-colors"
              onClick={() => onToggleStatus(func)}
            >
              <Power className="mr-1.5 h-3.5 w-3.5 text-[#3E8E5A]" />
              Ativar
            </Button>
          )}
        </div>

        {/* Botão Excluir: aparência proporcional e equilibrada sem dominar visualmente */}
        <Button
          variant="ghost"
          className="w-full h-7.5 text-xs font-medium text-[#78818E] hover:text-[#B4453C] hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-colors"
          onClick={() => onDelete(func)}
        >
          Excluir
        </Button>
      </div>
    </div>
  )
}
