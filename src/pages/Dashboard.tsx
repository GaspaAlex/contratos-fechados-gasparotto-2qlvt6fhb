import { useState, useEffect } from 'react'
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

export default function Dashboard() {
  const [year, setYear] = useState(2026)
  const [contratos, setContratos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

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
            <LayoutDashboard className="h-8 w-8 text-amber-500" />
            Contratos Fechados
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestão de fechamentos e acompanhamento R. Docs
          </p>
        </div>
        <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
          <SelectTrigger className="w-[120px] bg-background border-amber-200 focus:ring-amber-500 font-semibold">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="2025">2025</SelectItem>
            <SelectItem value="2026">2026</SelectItem>
            <SelectItem value="2027">2027</SelectItem>
          </SelectContent>
        </Select>
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
          <MonthlyGrid contratos={contratos} year={year} />
          <RDocsDashboard contratos={contratos} year={year} />
          <ContractsTable contratos={contratos} />
        </>
      )}
    </div>
  )
}
