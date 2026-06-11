import { useState, useEffect, useCallback } from 'react'
import { Plus, ClipboardList, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { LeadsRegistroModal } from '@/components/leads/LeadsRegistroModal'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { format, endOfMonth, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import pb from '@/lib/pocketbase/client'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export default function LeadsRegistro() {
  const [activeTab, setActiveTab] = useState<'DER' | 'AUX. ACIDENTE'>('DER')
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), 'yyyy-MM'))

  const [leads, setLeads] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const months = Array.from({ length: 12 }).map((_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    return format(d, 'yyyy-MM')
  })

  const fetchLeads = useCallback(async () => {
    setIsLoading(true)
    try {
      const startStr = `${selectedMonth}-01`
      const endMonthDate = endOfMonth(parseISO(startStr))
      const endStr = format(endMonthDate, 'yyyy-MM-dd')

      const filter = `campanha = '${activeTab}' && data >= '${startStr} 00:00:00' && data <= '${endStr} 23:59:59'`

      const records = await pb.collection('leads_registro').getFullList({
        filter,
        sort: '+data',
      })

      setLeads(records)
    } catch (error) {
      console.error('Error fetching leads:', error)
      toast.error('Erro ao buscar leads')
    } finally {
      setIsLoading(false)
    }
  }, [activeTab, selectedMonth])

  useEffect(() => {
    fetchLeads()
  }, [fetchLeads])

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja remover este lead?')) return
    try {
      await pb.collection('leads_registro').delete(id)
      toast.success('Lead removido')
      fetchLeads()
    } catch (error) {
      console.error('Error deleting lead:', error)
      toast.error('Erro ao remover lead')
    }
  }

  const getBadgeProps = (classificacao?: string) => {
    if (!classificacao) return { label: 'Qualificando', bg: '#5A9FD4' }
    if (classificacao === 'Qualificado') return { label: 'Qualificado', bg: '#52B86E' }
    if (classificacao === 'Contrato Fechado') return { label: 'Contrato Fechado', bg: '#C9922A' }
    return { label: classificacao, bg: '#E84040' }
  }

  return (
    <div className="flex flex-col h-full bg-[#FAF8F2] min-h-[calc(100vh-8rem)] rounded-xl overflow-hidden p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-sans">Registro de Leads</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gerencie os registros individuais de leads.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[160px] bg-white border-muted font-sans">
              <SelectValue placeholder="Selecione o mês" />
            </SelectTrigger>
            <SelectContent className="font-sans">
              {months.map((m) => {
                const [year, month] = m.split('-')
                const date = new Date(parseInt(year), parseInt(month) - 1)
                return (
                  <SelectItem key={m} value={m} className="capitalize">
                    {format(date, 'MMMM yyyy', { locale: ptBR })}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>

          <Button
            className="bg-[#C9922A] hover:bg-[#b07d22] text-white font-sans font-medium"
            onClick={() => setModalOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Lead
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-6 border-b border-border/50">
        <button
          onClick={() => setActiveTab('DER')}
          className={`pb-3 px-4 text-sm font-semibold tracking-wide transition-colors relative font-sans ${
            activeTab === 'DER' ? 'text-[#C9922A]' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          DER
          {activeTab === 'DER' && (
            <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[#C9922A] rounded-t-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('AUX. ACIDENTE')}
          className={`pb-3 px-4 text-sm font-semibold tracking-wide transition-colors relative font-sans ${
            activeTab === 'AUX. ACIDENTE'
              ? 'text-[#C9922A]'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          AUX. ACIDENTE
          {activeTab === 'AUX. ACIDENTE' && (
            <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[#C9922A] rounded-t-full" />
          )}
        </button>
      </div>

      <div className="flex-1 bg-white rounded-xl border border-border/50 shadow-sm flex flex-col overflow-hidden">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center min-h-[400px]">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : leads.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-8 animate-fade-in-up duration-500 min-h-[400px]">
            <div className="text-center max-w-sm">
              <div className="w-16 h-16 bg-[#FAF8F2] rounded-full flex items-center justify-center mx-auto mb-4 border border-[#C9922A]/20">
                <ClipboardList className="w-8 h-8 text-[#C9922A]" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2 font-sans">
                Nenhum lead encontrado
              </h3>
              <p className="text-muted-foreground font-sans text-sm">
                Nenhum lead registrado neste período.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-auto flex-1">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#FAF8F2]/50 hover:bg-[#FAF8F2]/50">
                  <TableHead className="font-sans font-semibold text-foreground whitespace-nowrap">
                    Data
                  </TableHead>
                  <TableHead className="font-sans font-semibold text-foreground whitespace-nowrap">
                    Telefone
                  </TableHead>
                  <TableHead className="font-sans font-semibold text-foreground whitespace-nowrap">
                    Responsável
                  </TableHead>
                  <TableHead className="font-sans font-semibold text-foreground whitespace-nowrap">
                    Classificação
                  </TableHead>
                  <TableHead className="font-sans font-semibold text-foreground w-[80px] text-right whitespace-nowrap">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead) => {
                  const badge = getBadgeProps(lead.classificacao)
                  return (
                    <TableRow key={lead.id} className="hover:bg-muted/30">
                      <TableCell className="font-sans py-3">
                        {format(parseISO(lead.data), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell className="font-sans py-3">{lead.telefone}</TableCell>
                      <TableCell className="font-sans py-3">{lead.responsavel}</TableCell>
                      <TableCell className="font-sans py-3">
                        <span
                          className="px-2.5 py-1 text-[11px] uppercase tracking-wider font-bold rounded-md text-white inline-block shadow-sm"
                          style={{ backgroundColor: badge.bg }}
                        >
                          {badge.label}
                        </span>
                      </TableCell>
                      <TableCell className="text-right py-3">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
                          onClick={() => handleDelete(lead.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <LeadsRegistroModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={() => {
          setModalOpen(false)
          toast.success('Lead registrado com sucesso')
          fetchLeads()
        }}
      />
    </div>
  )
}
