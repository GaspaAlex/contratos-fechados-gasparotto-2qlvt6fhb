import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { getLeadsByYear, deleteLeadDiario } from '@/services/leads'
import { useRealtime } from '@/hooks/use-realtime'
import { DailyTable } from '@/components/leads/DailyTable'
import { SummaryCards, CACCPLTable, DisqualificationAnalysis } from '@/components/leads/DashBlocks'
import { LeadModal } from '@/components/leads/LeadModal'
import { useToast } from '@/hooks/use-toast'
import { MONTHS } from '@/lib/leads-calc'

export default function LeadsCampanha() {
  const currentYear = new Date().getFullYear().toString()
  const [year, setYear] = useState(currentYear)
  const [summaryMonth, setSummaryMonth] = useState('Todos')
  const [leads, setLeads] = useState<any[]>([])

  const [modalOpen, setModalOpen] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<any>(null)

  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [recordToDelete, setRecordToDelete] = useState<any>(null)

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

  const handleDeleteRequest = (row: any) => {
    setRecordToDelete(row)
    setDeleteModalOpen(true)
  }

  const confirmDelete = async () => {
    if (!recordToDelete) return
    try {
      await deleteLeadDiario(recordToDelete.id)
      toast({ title: 'Sucesso', description: 'Registro removido com sucesso.' })
      setDeleteModalOpen(false)
      loadData()
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível remover o registro.',
      })
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
            CAC R$ 80–R$ 250
          </Badge>
        </div>
        <div className="flex w-full md:w-auto gap-2">
          <Select value={summaryMonth} onValueChange={setSummaryMonth}>
            <SelectTrigger className="h-9 bg-background w-full md:w-40">
              <SelectValue placeholder="Mês" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Todos os meses</SelectItem>
              {MONTHS.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="h-9 bg-background w-full md:w-28">
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

      <SummaryCards leads={leads} month={summaryMonth} year={year} />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-6 2xl:col-span-5">
          <CACCPLTable leads={leads} month={summaryMonth} />
        </div>
        <div className="xl:col-span-6 2xl:col-span-7">
          <DisqualificationAnalysis leads={leads} month={summaryMonth} />
        </div>
      </div>

      <DailyTable
        leads={leads}
        onEdit={handleEdit}
        onAdd={handleAdd}
        onDelete={handleDeleteRequest}
      />

      <LeadModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        data={selectedRecord}
        year={year}
        onSuccess={loadData}
      />

      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="rounded-[10px]">
          <DialogHeader>
            <DialogTitle className="text-red-600">Excluir registro</DialogTitle>
            <DialogDescription className="py-4 text-base text-foreground">
              Deseja excluir o registro do dia <strong>{recordToDelete?.dia}</strong> de{' '}
              <strong>{recordToDelete?.mes}</strong>? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              style={{ backgroundColor: '#E84040', color: 'white' }}
              className="hover:bg-red-700"
              onClick={confirmDelete}
            >
              Excluir permanentemente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
