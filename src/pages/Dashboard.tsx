import { useState, useEffect } from 'react'
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
  const [gridYear, setGridYear] = useState<number>(new Date().getFullYear())

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
    <div className="space-y-8">
      <div>
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#C9922A]/10 rounded-lg">
              <LayoutGrid className="w-6 h-6 text-[#C9922A]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Contratos Fechados</h1>
              <p className="text-sm font-medium text-muted-foreground">
                Gestão de fechamentos e acompanhamento R. Docs
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Select value={gridMonth} onValueChange={setGridMonth}>
              <SelectTrigger className="w-[180px] bg-background border-[#C9922A]/30 focus:ring-[#C9922A]">
                <SelectValue placeholder="Mês" />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={gridYear.toString()} onValueChange={(v) => setGridYear(parseInt(v))}>
              <SelectTrigger className="w-[120px] bg-background border-[#C9922A]/30 focus:ring-[#C9922A]">
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2024">2024</SelectItem>
                <SelectItem value="2025">2025</SelectItem>
                <SelectItem value="2026">2026</SelectItem>
                <SelectItem value="2027">2027</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <MonthlyGrid contratos={contratos} year={gridYear} month={gridMonth} />
      </div>

      <ContractsTable contratos={contratos} />
    </div>
  )
}
