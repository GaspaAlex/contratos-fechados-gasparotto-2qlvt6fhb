import { useState, useEffect, useMemo } from 'react'
import { getContratos } from '@/services/contratos'
import { ContractsTable } from '@/components/dashboard/ContractsTable'
import { useRealtime } from '@/hooks/use-realtime'
import { MonthlyGrid } from '@/components/dashboard/MonthlyGrid'
import { LayoutGrid } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const MONTHS = [
  'Todos os meses',
  'JANEIRO',
  'FEVEREIRO',
  'MARÇO',
  'ABRIL',
  'MAIO',
  'JUNHO',
  'JULHO',
  'AGOSTO',
  'SETEMBRO',
  'OUTUBRO',
  'NOVEMBRO',
  'DEZEMBRO',
]

export default function Dashboard() {
  const [contratos, setContratos] = useState<any[]>([])
  const [gridMonth, setGridMonth] = useState('Todos os meses')
  const [gridYear, setGridYear] = useState<number | string>(new Date().getFullYear())
  const [activeFilter, setActiveFilter] = useState('Todos')

  const gridContratos = useMemo(() => {
    let result = contratos
    if (activeFilter === 'Campanha') {
      result = result.filter((c) => c.origem === 'Campanha')
    } else if (activeFilter === 'Particular') {
      result = result.filter((c) => c.origem === 'Particular')
    } else if (activeFilter === 'Macohin') {
      result = result.filter((c) => c.origem === 'Macohin')
    }
    return result
  }, [contratos, activeFilter])

  const loadData = async () => {
    try {
      const data = await getContratos()
      setContratos(data)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('contratos_fechados', () => {
    loadData()
  })

  return (
    <div className="space-y-6 animate-fade-in-up pb-10">
      {/* Cabeçalho Corporativo Harmonizado com Protocolo / Visão Geral (Grafite Premium 2.1) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center text-[10px] font-bold tracking-[1.5px] uppercase text-[#C9922A] bg-[#C9922A]/10 px-2 py-0.5 rounded">
              GESTÃO DE CONTRATOS
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#252B34] dark:text-foreground">
            Contratos Fechados
          </h1>
          <p className="text-sm text-[#78818E] dark:text-muted-foreground">
            Gestão de fechamentos, acompanhamento R. Docs e metas de liberação para protocolo.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start lg:self-center">
          <Select value={gridMonth} onValueChange={setGridMonth}>
            <SelectTrigger className="w-[170px] h-9 text-xs border-[#E4E7EB] dark:border-border bg-white dark:bg-card rounded-md focus:ring-[#C9922A]">
              <SelectValue placeholder="Todos os meses" />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m) => (
                <SelectItem key={m} value={m} className="text-xs">
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={gridYear.toString()}
            onValueChange={(v) => setGridYear(v === 'Todos os anos' ? v : parseInt(v, 10))}
          >
            <SelectTrigger className="w-[130px] h-9 text-xs border-[#E4E7EB] dark:border-border bg-white dark:bg-card rounded-md focus:ring-[#C9922A]">
              <SelectValue placeholder="Todos os anos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos os anos" className="text-xs">
                Todos os anos
              </SelectItem>
              <SelectItem value="2024" className="text-xs">
                2024
              </SelectItem>
              <SelectItem value="2025" className="text-xs">
                2025
              </SelectItem>
              <SelectItem value="2026" className="text-xs">
                2026
              </SelectItem>
              <SelectItem value="2027" className="text-xs">
                2027
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <MonthlyGrid
          contratos={gridContratos}
          year={gridYear as any}
          month={gridMonth}
          activeFilter={activeFilter}
        />
      </div>

      <ContractsTable
        contratos={contratos}
        activeFilter={activeFilter}
        setActiveFilter={setActiveFilter}
        onMonthChange={setGridMonth}
      />
    </div>
  )
}
