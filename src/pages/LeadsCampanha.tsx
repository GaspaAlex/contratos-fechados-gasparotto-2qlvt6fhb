import { useState, useEffect } from 'react'
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
import { AlertTriangle, FilterX } from 'lucide-react'
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

  const [loading, setLoading] = useState(false)

  const loadData = async () => {
    try {
      setLoading(true)
      const [data, configs, conts, registros] = await Promise.all([
        getLeadsByYear(year).catch(() => []),
        getCampaignConfigs().catch(() => []),
        pb
          .collection('contratos_fechados')
          .getFullList({
            filter: `dcontrato >= "${year}-01-01 00:00:00" && dcontrato <= "${year}-12-31 23:59:59"`,
          })
          .catch(() => []),
        pb
          .collection('leads_registro')
          .getFullList({
            filter: `data >= "${year}-01-01 00:00:00" && data <= "${year}-12-31 23:59:59"`,
          })
          .catch(() => []),
      ])
      setLeads(Array.isArray(data) ? data : [])
      setCampaignConfigs(Array.isArray(configs) ? configs : [])
      setContratos(Array.isArray(conts) ? conts : [])
      setLeadsRegistro(Array.isArray(registros) ? registros : [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
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
      {/* 1. CABEÇALHO CORPORATIVO PADRONIZADO (GRAFITE PREMIUM 2.1) */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center text-[10px] font-bold tracking-[1.5px] uppercase text-[#C9922A] bg-[#C9922A]/10 px-2 py-0.5 rounded">
            CAPTAÇÃO DE LEADS
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#252B34] dark:text-foreground">
          Leads Campanha
        </h1>
        <p className="text-sm text-[#78818E] dark:text-muted-foreground">
          Monitoramento de aquisição, qualificação de leads, métricas de conversão e custo de
          captação por canal.
        </p>
      </div>

      {/* 2. ÁREA DE FILTROS SUPERIORES REFINADA (GRAFITE PREMIUM 2.1) */}
      <div className="rounded-[10px] border border-[#E4E7EB] dark:border-border bg-white dark:bg-card p-3.5 sm:p-4 shadow-sm">
        <div className="flex flex-col xl:flex-row gap-3 items-stretch xl:items-center justify-between">
          {/* Campanha */}
          <div className="flex-1 min-w-[220px]">
            <label className="text-[10px] font-bold tracking-wider uppercase text-[#78818E] dark:text-muted-foreground mb-1 block">
              Campanha
            </label>
            <Select
              value={campaign}
              onValueChange={(val) => {
                setCampaign(val)
              }}
            >
              <SelectTrigger className="h-9 w-full text-xs border-[#E4E7EB] dark:border-border bg-white dark:bg-card rounded-md focus:ring-[#C9922A]">
                <SelectValue placeholder="Selecione a campanha" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todas" className="text-xs">
                  Todas as Campanhas
                </SelectItem>
                {(campaignConfigs || [])
                  .filter((c) => c?.ativo)
                  .map((c) => (
                    <SelectItem key={c.slug} value={c.slug} className="text-xs">
                      {c.rotulo || c.slug}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Grupo de Período e Seleções de Data */}
          <div className="flex flex-wrap items-end gap-2.5">
            {/* Período De */}
            <div className="w-full sm:w-[125px]">
              <label className="text-[10px] font-bold tracking-wider uppercase text-[#78818E] dark:text-muted-foreground mb-1 block">
                De (Mês)
              </label>
              <Select value={startMonth} onValueChange={setStartMonth}>
                <SelectTrigger className="h-9 w-full text-xs border-[#E4E7EB] dark:border-border bg-white dark:bg-card rounded-md focus:ring-[#C9922A]">
                  <SelectValue placeholder="De" />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m) => (
                    <SelectItem key={m} value={m} className="text-xs">
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Período Até */}
            <div className="w-full sm:w-[125px]">
              <label className="text-[10px] font-bold tracking-wider uppercase text-[#78818E] dark:text-muted-foreground mb-1 block">
                Até (Mês)
              </label>
              <Select value={endMonth} onValueChange={setEndMonth}>
                <SelectTrigger className="h-9 w-full text-xs border-[#E4E7EB] dark:border-border bg-white dark:bg-card rounded-md focus:ring-[#C9922A]">
                  <SelectValue placeholder="Até" />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m) => (
                    <SelectItem key={m} value={m} className="text-xs">
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Botão Limpar Range */}
            {(startMonth || endMonth) && (
              <div className="self-end">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 px-3 text-xs border-[#E4E7EB] dark:border-border hover:bg-[#FAF8F2] dark:hover:bg-muted/40 text-[#78818E] hover:text-[#C9922A] transition-colors"
                  onClick={() => {
                    setStartMonth('')
                    setEndMonth('')
                  }}
                  title="Limpar intervalo de meses"
                >
                  <FilterX className="h-3.5 w-3.5 mr-1" /> Limpar
                </Button>
              </div>
            )}

            {/* Mês Específico */}
            <div className="w-full sm:w-[145px]">
              <label className="text-[10px] font-bold tracking-wider uppercase text-[#78818E] dark:text-muted-foreground mb-1 block">
                Mês
              </label>
              <Select value={summaryMonth} onValueChange={handleMonthChange}>
                <SelectTrigger className="h-9 w-full text-xs border-[#E4E7EB] dark:border-border bg-white dark:bg-card rounded-md focus:ring-[#C9922A]">
                  <SelectValue placeholder="Mês" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos" className="text-xs">
                    Todos os meses
                  </SelectItem>
                  {MONTHS.map((m) => (
                    <SelectItem key={m} value={m} className="text-xs">
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Dia Específico */}
            <div className="w-full sm:w-[125px]">
              <label className="text-[10px] font-bold tracking-wider uppercase text-[#78818E] dark:text-muted-foreground mb-1 block">
                Dia
              </label>
              <Select
                value={summaryDay}
                onValueChange={setSummaryDay}
                disabled={summaryMonth === 'Todos'}
              >
                <SelectTrigger className="h-9 w-full text-xs border-[#E4E7EB] dark:border-border bg-white dark:bg-card rounded-md focus:ring-[#C9922A] disabled:opacity-50">
                  <SelectValue placeholder="Dia" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos" className="text-xs">
                    Todos os dias
                  </SelectItem>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                    <SelectItem key={d} value={d.toString()} className="text-xs">
                      Dia {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Ano */}
            <div className="w-full sm:w-[115px]">
              <label className="text-[10px] font-bold tracking-wider uppercase text-[#78818E] dark:text-muted-foreground mb-1 block">
                Ano
              </label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger className="h-9 w-full text-xs border-[#E4E7EB] dark:border-border bg-white dark:bg-card rounded-md focus:ring-[#C9922A]">
                  <SelectValue placeholder="Ano" />
                </SelectTrigger>
                <SelectContent>
                  {[
                    currentYear,
                    (parseInt(currentYear) - 1).toString(),
                    (parseInt(currentYear) - 2).toString(),
                  ].map((y) => (
                    <SelectItem key={y} value={y} className="text-xs">
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* 3. CARDS DE KPI EXECUTIVOS */}
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

      {/* MODAL DE EXCLUSÃO NO PADRÃO CORPORATIVO ALERTA VERMELHO (Grafite Premium 2.1) */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="rounded-[10px] sm:max-w-[450px] border border-[#E4E7EB] dark:border-border p-6 shadow-lg bg-white dark:bg-card">
          <DialogHeader className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-red-100 dark:bg-red-950/40 flex items-center justify-center text-[#B4453C] shrink-0">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold tracking-[1.5px] uppercase text-[#B4453C] block">
                  AÇÃO IRREVERSÍVEL
                </span>
                <DialogTitle className="text-lg font-bold text-[#252B34] dark:text-foreground">
                  Excluir Registro Diário
                </DialogTitle>
              </div>
            </div>
            <DialogDescription className="pt-2 text-sm text-[#78818E] dark:text-muted-foreground leading-relaxed">
              Deseja realmente remover o registro do dia{' '}
              <strong className="text-[#252B34] dark:text-foreground">{recordToDelete?.dia}</strong>{' '}
              de{' '}
              <strong className="text-[#252B34] dark:text-foreground">{recordToDelete?.mes}</strong>
              ? Esta ação não poderá ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-5 flex gap-2 sm:justify-end">
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-4 text-xs border-[#E4E7EB] dark:border-border hover:bg-[#FAF8F2] dark:hover:bg-muted/40 text-[#78818E] rounded-md transition-colors"
              onClick={() => setDeleteModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              className="h-9 px-4 text-xs font-semibold bg-[#B4453C] text-white hover:bg-[#963730] rounded-md shadow-sm transition-colors"
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
