import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getLeadsByYear } from '@/services/leads'
import { useRealtime } from '@/hooks/use-realtime'
import { DailyTable } from '@/components/leads/DailyTable'
import {
  MonthlyCards,
  DisqualificationTable,
  ChannelPerformance,
} from '@/components/leads/DashBlocks'
import { LeadModal } from '@/components/leads/LeadModal'
import { MONTHS } from '@/lib/leads-calc'

export default function LeadsCampanha() {
  const currentYear = new Date().getFullYear().toString()
  const [year, setYear] = useState(currentYear)
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[new Date().getMonth()])
  const [leads, setLeads] = useState<any[]>([])

  const [modalOpen, setModalOpen] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<any>(null)

  const loadData = async () => {
    try {
      const data = await getLeadsByYear(year)
      setLeads(data)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadData()
  }, [year])
  useRealtime('leads_diarios', () => {
    loadData()
  })

  const monthLeads = leads.filter((l) => l.mes.startsWith(selectedMonth))

  const handleEdit = (row: any) => {
    setSelectedRecord(row)
    setModalOpen(true)
  }

  const handleAdd = () => {
    setSelectedRecord(null)
    setModalOpen(true)
  }

  return (
    <div className="animate-fade-in-up pb-10 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Leads Campanha</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Gerenciamento e análise de conversão diária
          </p>
        </div>
        <div className="w-32">
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="w-full h-10 px-3 py-2 rounded-md border bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#C9922A]"
          >
            {[
              currentYear,
              (parseInt(currentYear) - 1).toString(),
              (parseInt(currentYear) - 2).toString(),
            ].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 p-4 bg-muted/20 rounded-lg border items-center shadow-sm">
        <div className="text-xs font-bold text-foreground mr-2">METAS DO ESCRITÓRIO:</div>
        <Badge
          variant="outline"
          className="border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950/30"
        >
          Conv. Geral ≥ 6%
        </Badge>
        <Badge
          variant="outline"
          className="border-green-300 bg-green-50 text-green-800 dark:bg-green-950/30"
        >
          Conv. Qualif. ≥ 10%
        </Badge>
        <Badge
          variant="outline"
          className="border-red-300 bg-red-50 text-red-800 dark:bg-red-950/30"
        >
          Desqualificação 15%-30%
        </Badge>
        <Badge
          variant="outline"
          className="border-blue-300 bg-blue-50 text-blue-800 dark:bg-blue-950/30"
        >
          CAC R$ 80-R$ 150
        </Badge>
      </div>

      <MonthlyCards leads={leads} selectedMonth={selectedMonth} onSelectMonth={setSelectedMonth} />

      <DailyTable monthLeads={monthLeads} onEdit={handleEdit} onAdd={handleAdd} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
        <DisqualificationTable leads={leads} />
        <ChannelPerformance leads={leads} />
      </div>

      <LeadModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        data={selectedRecord}
        selectedMonth={selectedMonth}
        year={year}
        onSuccess={loadData}
      />
    </div>
  )
}
