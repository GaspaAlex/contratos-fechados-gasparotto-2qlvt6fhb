import { useState, useEffect, useMemo } from 'react'
import { MonthlyGrid } from '@/components/dashboard/MonthlyGrid'
import { RDocsDashboard } from '@/components/dashboard/RDocsDashboard'
import { ContractsTable } from '@/components/dashboard/ContractsTable'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { getContratos } from '@/services/contratos'
import { useRealtime } from '@/hooks/use-realtime'
import { LayoutDashboard } from 'lucide-react'
import { toast } from 'sonner'

const MONTHS = [
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
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState('Todos os meses')
  const [contratos, setContratos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const years = useMemo(() => {
    const ySet = new Set<number>()
    contratos.forEach((c) => {
      if (c.dcontrato) {
        const y = parseInt(c.dcontrato.split('-')[0])
        if (!isNaN(y)) ySet.add(y)
      }
    })
    const arr = Array.from(ySet).sort((a, b) => b - a)
    if (arr.length === 0) return [new Date().getFullYear()]
    return arr
  }, [contratos])

  useEffect(() => {
    if (years.length > 0 && !years.includes(year)) {
      setYear(years[0])
    }
  }, [years, year])

  const loadData = async () => {
    try {
      setLoading(true)
      const data = await getContratos()
      setContratos(data || [])
    } catch (e: any) {
      toast.error('Erro ao carregar contratos: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('contratos_fechados', () => {
    // Only refresh data silently in the background
    getContratos()
      .then((data) => setContratos(data || []))
      .catch((e) => console.error(e))
  })

  return (
    <div className="animate-fade-in-up pb-12">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <LayoutDashboard className="h-8 w-8 text-[#C9922A]" />
            Contratos Fechados
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestão de fechamentos e acompanhamento R. Docs
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-[160px] bg-background border-[#C9922A]/30 focus:ring-[#C9922A] font-semibold text-[#C9922A]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos os meses">Todos os meses</SelectItem>
              {MONTHS.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
            <SelectTrigger className="w-[120px] bg-background border-[#C9922A]/30 focus:ring-[#C9922A] font-semibold text-[#C9922A]">
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
      </div>

      {loading ? (
        <div className="space-y-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 lg:gap-6 mb-4">
            {Array.from({ length: 13 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-80 w-full rounded-xl" />
          <Skeleton className="h-[500px] w-full rounded-xl" />
        </div>
      ) : (
        <>
          <MonthlyGrid contratos={contratos} year={year} month={month} />
          <RDocsDashboard contratos={contratos} year={year} month={month} />
          <ContractsTable contratos={contratos} year={year} month={month} />
        </>
      )}
    </div>
  )
}
