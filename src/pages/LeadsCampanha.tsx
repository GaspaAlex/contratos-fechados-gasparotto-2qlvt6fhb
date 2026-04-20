import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getLeadsByYear, deleteLeadDiario } from '@/services/leads'
import { useRealtime } from '@/hooks/use-realtime'
import { DailyTable } from '@/components/leads/DailyTable'
import { SummaryCards, CACCPLTable, DisqualificationAnalysis } from '@/components/leads/DashBlocks'
import { LeadModal } from '@/components/leads/LeadModal'
import { useToast } from '@/hooks/use-toast'

export default function LeadsCampanha() {
  const currentYear = new Date().getFullYear().toString()
  const [year, setYear] = useState(currentYear)
  const [leads, setLeads] = useState<any[]>([])

  const [modalOpen, setModalOpen] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<any>(null)
  const { toast } = useToast()

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

  const handleEdit = (row: any) => {
    setSelectedRecord(row)
    setModalOpen(true)
  }

  const handleAdd = () => {
    setSelectedRecord(null)
    setModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja remover este registro?')) {
      try {
        await deleteLeadDiario(id)
        toast({ title: 'Sucesso', description: 'Registro removido com sucesso.' })
        loadData()
      } catch (err) {
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'Não foi possível remover o registro.',
        })
      }
    }
  }

  return (
    <div className="animate-fade-in-up pb-10 space-y-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-muted/20 border p-3 rounded-lg shadow-sm sticky top-0 z-30 backdrop-blur-md">
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs font-bold text-muted-foreground mr-2 uppercase tracking-wider">
            Metas da Campanha:
          </span>
          <Badge
            variant="outline"
            className="bg-background text-muted-foreground border-muted-foreground/30 font-medium rounded-full px-3"
          >
            Conv. Geral ≥ 6%
          </Badge>
          <Badge
            variant="outline"
            className="bg-background text-muted-foreground border-muted-foreground/30 font-medium rounded-full px-3"
          >
            Conv. Qualif. ≥ 10%
          </Badge>
          <Badge
            variant="outline"
            className="bg-background text-muted-foreground border-muted-foreground/30 font-medium rounded-full px-3"
          >
            Desqualificado ≤ 30%
          </Badge>
          <Badge
            variant="outline"
            className="bg-background text-muted-foreground border-muted-foreground/30 font-medium rounded-full px-3"
          >
            CAC R$ 80–R$ 150
          </Badge>
        </div>
        <div className="w-full md:w-32">
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="h-9 bg-background w-full">
              <SelectValue placeholder="Ano" />
            </SelectTrigger>
            <SelectContent>
              {[
                currentYear,
                (parseInt(currentYear) - 1).toString(),
                (parseInt(currentYear) - 2).toString(),
              ].map((y) => (
                <SelectItem key={y} value={y}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <SummaryCards leads={leads} />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-6 2xl:col-span-5">
          <CACCPLTable leads={leads} />
        </div>
        <div className="xl:col-span-6 2xl:col-span-7">
          <DisqualificationAnalysis leads={leads} />
        </div>
      </div>

      <DailyTable leads={leads} onEdit={handleEdit} onAdd={handleAdd} onDelete={handleDelete} />

      <LeadModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        data={selectedRecord}
        year={year}
        onSuccess={loadData}
      />
    </div>
  )
}
