import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Plus, Search } from 'lucide-react'
import { STATUS_OPTIONS, MONTHS, YEARS } from './constants'
import { cn } from '@/lib/utils'

export function RpvFilters({
  search,
  setSearch,
  tipo,
  setTipo,
  status,
  setStatus,
  month,
  setMonth,
  year,
  setYear,
  quickFilter = 'Todos',
  setQuickFilter = () => {},
  parceriaFilter = 'Todos os parceiros',
  setParceriaFilter = () => {},
  onAdd,
}: any) {
  const QUICK_FILTERS = ['Todos', 'A Receber', 'Recebido', 'RPV', 'Precatório', 'Por Parceria']

  const PARCERIA_OPTIONS = [
    'Todos os parceiros',
    'Sem parceria',
    'Macohin',
    'Macohin + Rogério',
    'Macohin + Luciana',
    'Carnevale',
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col xl:flex-row gap-4 items-start xl:items-center justify-between bg-white p-4 rounded-xl border shadow-sm">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar nome ou processo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={tipo} onValueChange={setTipo}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Todos os Tipos</SelectItem>
              <SelectItem value="RPV">RPV</SelectItem>
              <SelectItem value="Precatório">Precatório</SelectItem>
            </SelectContent>
          </Select>

          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Todos os Status</SelectItem>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Mês" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Todos os meses</SelectItem>
              {MONTHS.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Ano" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Todos os Anos</SelectItem>
              {YEARS.map((y) => (
                <SelectItem key={y} value={y}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={onAdd}
          className="bg-[#C9922A] hover:bg-[#b07d20] text-white whitespace-nowrap self-end xl:self-auto shadow-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Adicionar
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2 px-1">
        {QUICK_FILTERS.map((pill) => {
          const isActive = quickFilter === pill
          return (
            <button
              key={pill}
              onClick={() => setQuickFilter(pill)}
              className={cn(
                'px-4 py-1.5 rounded-full text-sm font-medium transition-all border duration-200 ease-in-out',
                isActive
                  ? 'bg-[#C9922A] text-white border-[#C9922A] shadow-sm'
                  : 'bg-transparent text-gray-500 border-gray-200 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-700',
              )}
            >
              {pill}
            </button>
          )
        })}

        {quickFilter === 'Por Parceria' && (
          <div className="ml-2 animate-fade-in">
            <Select value={parceriaFilter} onValueChange={setParceriaFilter}>
              <SelectTrigger className="w-[200px] h-[34px] bg-white border-gray-200 focus:ring-[#C9922A] text-sm rounded-full">
                <SelectValue placeholder="Selecione a parceria" />
              </SelectTrigger>
              <SelectContent>
                {PARCERIA_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  )
}
