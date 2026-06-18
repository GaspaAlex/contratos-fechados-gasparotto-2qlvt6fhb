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
import { getCampaignConfigs, CampaignConfig } from '@/services/campaign_config'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { DailyTable } from '@/components/leads/DailyTable'
import { SummaryCards, DisqualificationAnalysis } from '@/components/leads/DashBlocks'
import { CACCPLTable } from '@/components/leads/CACCPLTable'
import { LeadModal } from '@/components/leads/LeadModal'
import { useToast } from '@/hooks/use-toast'
import { MONTHS } from '@/lib/leads-calc'

export default function LeadsCampanha() {
  const currentYear = new Date().getFullYear().toString()
  const [year, setYear] = useState(currentYear)
  const [startMonth, setStartMonth] = useState('')
  const [endMonth, setEndMonth] = useState('')
  const [summaryMonth, setSummaryMonth] = useState('Todos')
  const [summaryDay, setSummaryDay] = useState('Todos')
  const [leads, setLeads] = useState<any[]>([])
  const [leadsRegistro, setLeadsRegistro] = useState<any[]>([])
  const [campaignConfigs, setCampaignConfigs] = useState<CampaignConfig[]>([])
  const [contratos, setContratos] = useState<any[]>([])
  const [campaign, setCampaign] = useState('Todas')

  const handleMonthChange = (val: string) => {
    setSummaryMonth(val)
    if (val === 'Todos') {
      setSummaryDay('Todos')
    }
  }

  const [modalOpen, setModalOpen] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<any>(null)

  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [recordToDelete, setRecordToDelete] = useState<any>(null)

  const { toast } = useToast()

  const loadData = async () => {
    try {
      const [data, configs, conts, registros] = await Promise.all([
        getLeadsByYear(year),
        getCampaignConfigs(),
        pb.collection('contratos_fechados').getFullList({
          filter: `dcontrato >= "${year}-01-01 00:00:00" && dcontrato <= "${year}-12-31 23:59:59"`,
        }),
        pb.collection('leads_registro').getFullList({
          filter: `data >= "${year}-01-01 00:00:00" && data <= "${year}-12-31 23:59:59"`,
        }),
      ])
      setLeads(data ?? [])
      setCampaignConfigs(configs ?? [])
      setContratos(conts ?? [])
      setLeadsRegistro(registros ?? [])
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadData()
  }, [year])

  useRealtime('leads_diarios', loadData)
  useRealtime('configuracoes_metas', loadData)
  useRealtime('contratos_fechados', loadData)
  useRealtime('leads_registro', loadData)

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
        <div className="flex w-full md:w-auto">
          <Select
            value={campaign}
            onValueChange={(val) => {
              setCampaign(val)
            }}
          >
            <SelectTrigger className="h-9 bg-background w-full min-w-[220px]">
              <SelectValue placeholder="Campanha" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todas">Todas as Campanhas</SelectItem>
              {campaignConfigs
                .filter((c) => c.ativo)
                .map((c) => (
                  <SelectItem key={c.slug} value={c.slug}>
                    {c.rotulo}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex w-full md:w-auto gap-2 flex-wrap md:flex-nowrap md:justify-end">
          <Select value={startMonth} onValueChange={setStartMonth}>
            <SelectTrigger className="h-9 bg-background w-full md:w-32">
              <SelectValue placeholder="De" />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={endMonth} onValueChange={setEndMonth}>
            <SelectTrigger className="h-9 bg-background w-full md:w-32">
              <SelectValue placeholder="Até" />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(startMonth || endMonth) && (
            <Button
              variant="outline"
              className="h-9 px-3 text-xs"
              onClick={() => {
                setStartMonth('')
                setEndMonth('')
              }}
            >
              Limpar
            </Button>
          )}
          <Select value={summaryMonth} onValueChange={handleMonthChange}>
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
          <Select
            value={summaryDay}
            onValueChange={setSummaryDay}
            disabled={summaryMonth === 'Todos'}
          >
            <SelectTrigger className="h-9 bg-background w-full md:w-36">
              <SelectValue placeholder="Dia" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Todos os dias</SelectItem>
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                <SelectItem key={d} value={d.toString()}>
                  Dia {d}
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

      <SummaryCards
        leads={leads}
        leadsRegistro={leadsRegistro}
        contratos={contratos}
        configs={campaignConfigs}
        month={summaryMonth}
        year={year}
        day={summaryDay}
        startMonth={startMonth}
        endMonth={endMonth}
        campaign={campaign}
      />

      <div className="flex flex-col gap-6 w-full">
        <CACCPLTable
          leads={leads}
          contratos={contratos}
          configs={campaignConfigs}
          month={summaryMonth}
          day={summaryDay}
          year={year}
          startMonth={startMonth}
          endMonth={endMonth}
          campaign={campaign}
        />
        <DisqualificationAnalysis
          leads={leads}
          month={summaryMonth}
          day={summaryDay}
          year={year}
          startMonth={startMonth}
          endMonth={endMonth}
          campaign={campaign}
        />
      </div>

      <DailyTable
        leads={leads}
        contratos={contratos}
        configs={campaignConfigs}
        campaign={campaign}
        month={summaryMonth}
        day={summaryDay}
        startMonth={startMonth}
        endMonth={endMonth}
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
        campaignConfigs={campaignConfigs}
      />

      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="rounded-[10px]">
          <DialogHeader>
            <DialogTitle className="text-destructive">Excluir registro</DialogTitle>
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
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
