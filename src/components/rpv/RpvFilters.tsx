import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { useEffect } from 'react'
import { Plus, Search, Printer } from 'lucide-react'
import { STATUS_OPTIONS, MONTHS, YEARS } from './constants'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useRpvFilters, rpvFilterStore } from './store'

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
  onAdd,
  onPrint,
}: any) {
  const { quickFilter, parceriaFilter } = useRpvFilters()

  const setQuickFilter = rpvFilterStore.setQuickFilter
  const setParceriaFilter = rpvFilterStore.setParceriaFilter

  useEffect(() => {
    if (search !== undefined) {
      rpvFilterStore.setSearch(search)
    }
  }, [search])

  useEffect(() => {
    if (tipo !== undefined) rpvFilterStore.setTipoFilter(tipo)
  }, [tipo])

  useEffect(() => {
    if (status !== undefined) rpvFilterStore.setStatusFilter(status)
  }, [status])

  useEffect(() => {
    if (month !== undefined) rpvFilterStore.setMesFilter(month)
  }, [month])

  useEffect(() => {
    if (year !== undefined) rpvFilterStore.setAnoFilter(year)
  }, [year])

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
    <div className="space-y-3.5">
      {/* Barra de Filtros e Ações — Grafite Premium 2.1 */}
      <div className="flex flex-col xl:flex-row gap-3 items-stretch xl:items-center justify-between rounded-[10px] border border-[#E4E7EB] dark:border-border bg-white dark:bg-card p-3.5 sm:p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Busca */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[#78818E] dark:text-muted-foreground" />
            <Input
              placeholder="Buscar nome ou processo..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                rpvFilterStore.setSearch(e.target.value)
              }}
              className="h-9 pl-9 text-xs border-[#E4E7EB] dark:border-border rounded-md focus-visible:ring-[#C9922A] bg-white dark:bg-card"
            />
          </div>

          {/* Tipo */}
          <Select
            value={tipo}
            onValueChange={(val) => {
              setTipo(val)
              rpvFilterStore.setTipoFilter(val)
            }}
          >
            <SelectTrigger className="w-full sm:w-[130px] h-9 text-xs border-[#E4E7EB] dark:border-border bg-white dark:bg-card rounded-md focus:ring-[#C9922A]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos" className="text-xs">
                Todos os Tipos
              </SelectItem>
              <SelectItem value="RPV" className="text-xs">
                RPV
              </SelectItem>
              <SelectItem value="Precatório" className="text-xs">
                Precatório
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Status */}
          <Select
            value={status}
            onValueChange={(val) => {
              setStatus(val)
              rpvFilterStore.setStatusFilter(val)
            }}
          >
            <SelectTrigger className="w-full sm:w-[190px] h-9 text-xs border-[#E4E7EB] dark:border-border bg-white dark:bg-card rounded-md focus:ring-[#C9922A]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos" className="text-xs">
                Todos os Status
              </SelectItem>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s} className="text-xs">
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Mês */}
          <Select
            value={month}
            onValueChange={(val) => {
              setMonth(val)
              rpvFilterStore.setMesFilter(val)
            }}
          >
            <SelectTrigger className="w-full sm:w-[145px] h-9 text-xs border-[#E4E7EB] dark:border-border bg-white dark:bg-card rounded-md focus:ring-[#C9922A]">
              <SelectValue placeholder="Mês" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos" className="text-xs">
                Todos os meses
              </SelectItem>
              {MONTHS.map((m) => (
                <SelectItem key={m.value} value={m.value} className="text-xs">
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Ano */}
          <Select
            value={year}
            onValueChange={(val) => {
              setYear(val)
              rpvFilterStore.setAnoFilter(val)
            }}
          >
            <SelectTrigger className="w-full sm:w-[115px] h-9 text-xs border-[#E4E7EB] dark:border-border bg-white dark:bg-card rounded-md focus:ring-[#C9922A]">
              <SelectValue placeholder="Ano" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos" className="text-xs">
                Todos os Anos
              </SelectItem>
              {YEARS.map((y) => (
                <SelectItem key={y} value={y} className="text-xs">
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Ações: Imprimir e Novo Cadastro */}
        <div className="flex items-center gap-2 self-end xl:self-auto shrink-0">
          {onPrint && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={onPrint}
                  className="h-9 w-9 shrink-0 border-[#E4E7EB] dark:border-border hover:bg-[#FAF8F2] dark:hover:bg-muted/40 text-[#78818E] hover:text-[#C9922A] rounded-md transition-colors"
                >
                  <Printer className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Exportar relatório PDF</p>
              </TooltipContent>
            </Tooltip>
          )}

          <Button
            onClick={onAdd}
            className="h-9 px-4 text-xs font-semibold bg-[#C9922A] hover:bg-[#b58324] text-white whitespace-nowrap rounded-md shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Adicionar Registro
          </Button>
        </div>
      </div>

      {/* Filtros Rápidos (Pills Sóbrias estilo Grafite/Dourado) */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground mr-1">
          Filtro Rápido:
        </span>
        {QUICK_FILTERS.map((pill) => {
          const isActive = quickFilter === pill
          return (
            <button
              key={pill}
              type="button"
              onClick={() => setQuickFilter(pill)}
              className={cn(
                'px-3.5 py-1 rounded-full text-xs font-medium transition-all duration-150 border cursor-pointer select-none',
                isActive
                  ? 'bg-[#22262E] text-[#D9A94A] border-[#22262E] shadow-xs dark:bg-[#D9A94A]/20 dark:text-[#D9A94A] dark:border-[#D9A94A]/40'
                  : 'bg-white dark:bg-card text-[#78818E] dark:text-muted-foreground border-[#E4E7EB] dark:border-border hover:border-[#D0D5DD] dark:hover:border-gray-700 hover:text-[#252B34] dark:hover:text-foreground',
              )}
            >
              {pill}
            </button>
          )
        })}

        {quickFilter === 'Por Parceria' && (
          <div className="ml-1 animate-fade-in inline-flex items-center">
            <Select value={parceriaFilter} onValueChange={setParceriaFilter}>
              <SelectTrigger className="w-[190px] h-8 text-xs bg-white dark:bg-card border-[#E4E7EB] dark:border-border rounded-full focus:ring-[#C9922A]">
                <SelectValue placeholder="Selecione a parceria" />
              </SelectTrigger>
              <SelectContent>
                {PARCERIA_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt} className="text-xs">
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
