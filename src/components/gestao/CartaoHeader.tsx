import { ArrowLeft, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getFuncionarioPhotoUrl } from '@/services/ponto'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useNavigate } from 'react-router-dom'

const MONTHS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

interface HeaderProps {
  funcionario: any
  month: number
  year: number
  setMonth: (m: number) => void
  setYear: (y: number) => void
  onExportClick?: () => void
}

export function CartaoHeader({
  funcionario,
  month,
  year,
  setMonth,
  setYear,
  onExportClick,
}: HeaderProps) {
  const navigate = useNavigate()
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i)

  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      {/* Informações do Colaborador com Eyebrow Corporativo */}
      <div className="flex items-center gap-4">
        <div className="relative shrink-0">
          <Avatar className="h-16 w-16 sm:h-18 sm:w-18 border border-[#E4E7EB] dark:border-border ring-2 ring-[#C9922A]/20 shadow-xs">
            <AvatarImage
              src={getFuncionarioPhotoUrl(funcionario)}
              alt={funcionario?.nome}
              className="object-cover"
            />
            <AvatarFallback className="text-lg font-bold bg-[#FAF8F2] dark:bg-muted text-[#C9922A]">
              {funcionario?.nome?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          {funcionario?.ativo && (
            <span
              className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-[#3E8E5A] ring-2 ring-white dark:ring-card"
              title="Ativo"
            />
          )}
        </div>

        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center text-[10px] font-bold tracking-[1.5px] uppercase text-[#C9922A] bg-[#C9922A]/10 px-2 py-0.5 rounded">
              CARTÃO INDIVIDUAL
            </span>
            <span className="inline-flex items-center text-[10px] font-medium tracking-wider uppercase text-[#78818E] dark:text-muted-foreground bg-[#F5F6F8] dark:bg-muted/50 px-1.5 py-0.5 rounded border border-[#E4E7EB]/70 dark:border-border/60">
              {funcionario?.perfil || 'Colaborador'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#252B34] dark:text-foreground truncate">
            {funcionario?.nome || 'Carregando...'}
          </h1>
          <p className="text-sm text-[#78818E] dark:text-muted-foreground flex items-center gap-1.5">
            <span>Período de referência:</span>
            <strong className="text-[#C9922A] font-semibold">
              {MONTHS[month - 1]} de {year}
            </strong>
          </p>
        </div>
      </div>

      {/* Controles de Período e Botões de Ação */}
      <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center">
        {/* Seletor de Mês */}
        <Select value={month.toString()} onValueChange={(v) => setMonth(Number(v))}>
          <SelectTrigger className="w-[140px] h-9 text-xs border-[#E4E7EB] dark:border-border bg-white dark:bg-card rounded-md focus:ring-[#C9922A]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((m, i) => (
              <SelectItem key={i} value={(i + 1).toString()} className="text-xs">
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Seletor de Ano */}
        <Select value={year.toString()} onValueChange={(v) => setYear(Number(v))}>
          <SelectTrigger className="w-[105px] h-9 text-xs border-[#E4E7EB] dark:border-border bg-white dark:bg-card rounded-md focus:ring-[#C9922A]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={y.toString()} className="text-xs">
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Botão Voltar */}
        <Button
          variant="outline"
          onClick={() => navigate('/gestao/ponto/dashboard')}
          className="h-9 px-3.5 text-xs font-medium border-[#E4E7EB] dark:border-border hover:bg-[#FAF8F2] dark:hover:bg-muted/40 text-[#78818E] hover:text-[#252B34] dark:hover:text-foreground rounded-md transition-colors"
        >
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
          <span>Voltar</span>
        </Button>

        {/* Botão Exportar */}
        <Button
          onClick={onExportClick}
          className="h-9 px-4 text-xs font-semibold bg-[#C9922A] hover:bg-[#b58324] text-white whitespace-nowrap rounded-md shadow-sm transition-colors"
        >
          <Download className="mr-1.5 h-3.5 w-3.5" />
          <span>Exportar</span>
        </Button>
      </div>
    </div>
  )
}
