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
}

export function CartaoHeader({ funcionario, month, year, setMonth, setYear }: HeaderProps) {
  const navigate = useNavigate()
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i)

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl shadow-sm">
      <div className="flex items-center gap-4">
        <Avatar className="h-20 w-20 border-2 border-[#C8922A]/20">
          <AvatarImage src={getFuncionarioPhotoUrl(funcionario)} />
          <AvatarFallback className="text-xl bg-gray-100">
            {funcionario?.nome?.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            {funcionario?.nome || 'Carregando...'}
          </h2>
          <p className="text-gray-500 capitalize">{funcionario?.perfil || 'Funcionário'}</p>
          <p className="text-[#C8922A] font-medium mt-1">
            {MONTHS[month - 1]} de {year}
          </p>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="flex gap-2">
          <Select value={month.toString()} onValueChange={(v) => setMonth(Number(v))}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => (
                <SelectItem key={i} value={(i + 1).toString()}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={year.toString()} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={y.toString()}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={() => navigate('/gestao/ponto/dashboard')}
            className="flex-1 sm:flex-none"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
          </Button>
          <Button
            variant="outline"
            className="flex-1 sm:flex-none text-[#C8922A] border-[#C8922A] hover:bg-[#C8922A]/10"
          >
            <Download className="mr-2 h-4 w-4" /> Exportar
          </Button>
        </div>
      </div>
    </div>
  )
}
