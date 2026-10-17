import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Plus,
  ClipboardList,
  Trash2,
  Pencil,
  Loader2,
  Search,
  Calendar,
  AlertTriangle,
  FilterX,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { LeadsRegistroModal } from '@/components/leads/LeadsRegistroModal'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import pb from '@/lib/pocketbase/client'
import { cn } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export default function LeadsRegistro() {
  const [activeTab, setActiveTab] = useState<'DER' | 'AUX. ACIDENTE' | 'DER CANAL'>('DER')
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), 'yyyy-MM'))

  const [leads, setLeads] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [leadToDelete, setLeadToDelete] = useState<string | null>(null)
  const [leadToEdit, setLeadToEdit] = useState<any>(null)
  const [searchTel, setSearchTel] = useState('')
  const [searchDate, setSearchDate] = useState('')
  const [diaInicio, setDiaInicio] = useState<string | null>(null)
  const [diaFim, setDiaFim] = useState<string | null>(null)

  useEffect(() => {
    setDiaInicio(null)
    setDiaFim(null)
  }, [selectedMonth])

  const daysInMonth = useMemo(() => {
    const [yearStr, monthStr] = selectedMonth.split('-')
    return new Date(parseInt(yearStr, 10), parseInt(monthStr, 10), 0).getDate()
  }, [selectedMonth])

  const daysOptions = useMemo(() => {
    return Array.from({ length: daysInMonth }).map((_, i) => String(i + 1).padStart(2, '0'))
  }, [daysInMonth])

  const filteredLeads = useMemo(() => {
    let result = leads

    if (diaInicio) {
      result = result.filter((lead) => {
        const dayStr = lead.data.split(' ')[0].split('-')[2]
        return dayStr >= diaInicio
      })
    }

    if (diaFim) {
      result = result.filter((lead) => {
        const dayStr = lead.data.split(' ')[0].split('-')[2]
        return dayStr <= diaFim
      })
    }

    if (searchTel.trim()) {
      const searchDigits = searchTel.replace(/\D/g, '')
      result = result.filter((lead) => {
        const leadTelDigits = (lead.telefone || '').replace(/\D/g, '')
        return leadTelDigits.includes(searchDigits)
      })
    }

    if (searchDate.trim()) {
      const sd = searchDate.trim()
      const matchFull = sd.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
      const matchPartial = sd.match(/^(\d{2})\/(\d{2})$/)

      if (matchFull) {
        const expectedStr = `${matchFull[3]}-${matchFull[2]}-${matchFull[1]}`
        result = result.filter((lead) => lead.data.split(' ')[0] === expectedStr)
      } else if (matchPartial) {
        const expectedStr = `-${matchPartial[2]}-${matchPartial[1]}`
        result = result.filter((lead) => lead.data.includes(expectedStr))
      } else {
        result = result.filter((lead) => lead.data.includes(sd))
      }
    }

    return result
  }, [leads, searchTel, searchDate, diaInicio, diaFim])

  const months = Array.from({ length: 12 }).map((_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    return format(d, 'yyyy-MM')
  })

  const fetchLeads = useCallback(async () => {
    setIsLoading(true)
    try {
      const [yearStr, monthStr] = selectedMonth.split('-')
      const year = parseInt(yearStr, 10)
      const month = parseInt(monthStr, 10)
      const lastDay = new Date(year, month, 0).getDate()

      const startStr = `${selectedMonth}-01`
      const endStr = `${selectedMonth}-${String(lastDay).padStart(2, '0')}`

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

  const confirmDelete = async () => {
    if (!leadToDelete) return
    try {
      await pb.collection('leads_registro').delete(leadToDelete)
      toast.success('Lead removido')
      fetchLeads()
    } catch (error) {
      console.error('Error deleting lead:', error)
      toast.error('Erro ao remover lead')
    } finally {
      setLeadToDelete(null)
    }
  }

  const [classificacoes, setClassificacoes] = useState<any[]>([])

  const fetchClassificacoes = useCallback(async () => {
    try {
      const records = await pb.collection('classificacoes_lead').getFullList({
        filter: `campanha = '${activeTab}'`,
        sort: '+created',
      })
      setClassificacoes(records)
    } catch (error) {
      console.error('Error fetching classificacoes:', error)
    }
  }, [activeTab])

  useEffect(() => {
    fetchClassificacoes()
  }, [fetchClassificacoes])

  useEffect(() => {
    const migrateClassificacoes = async () => {
      if (localStorage.getItem('migration_classificacao_v2') === 'true') {
        return
      }

      try {
        const records = await pb.collection('leads_registro').getFullList({
          filter: "campanha = 'AUX. ACIDENTE'",
        })

        const mapping: Record<string, string> = {
          'Sem qualidade': 'Sem Qual.',
          Aposentado: 'Aposent.',
          'Sem interesse': 'Sem Inter.',
          'Recebendo aux doença': 'Rec. Aux. D.',
          'Não sofreu acidente': 'N. Sof. Ac.',
          'Servidor público': 'Serv. Públ.',
        }

        let updated = false
        for (const record of records) {
          if (record.classificacao && mapping[record.classificacao]) {
            await pb.collection('leads_registro').update(record.id, {
              classificacao: mapping[record.classificacao],
            })
            updated = true
          }
        }

        localStorage.setItem('migration_classificacao_v2', 'true')

        if (updated) {
          fetchLeads()
        }
      } catch (error) {
        console.error('Error migrating classificacoes:', error)
      }
    }

    migrateClassificacoes()
  }, [fetchLeads])

  const activeColumns = useMemo(() => {
    const baseCols = [
      { key: 'data', label: 'Data', width: '110px', minWidth: '110px' },
      { key: 'total', label: 'Total', width: '80px', minWidth: '80px' },
      { key: 'qualificando', label: 'Qualificando', width: '120px', minWidth: '120px' },
      { key: 'qualificado', label: 'Qualificado', width: '120px', minWidth: '120px' },
      { key: 'contratoFechado', label: 'Contrato Fechado', width: '135px', minWidth: '135px' },
    ]

    const dynCols = classificacoes
      .filter((c) => c.nome !== 'Qualificado' && c.nome !== 'Contrato Fechado')
      .map((c) => ({
        key: c.nome,
        label: c.nome,
        width: '120px',
        minWidth: '120px',
      }))

    const endCols = [{ key: 'totalDesq', label: 'Total Desq.', width: '120px', minWidth: '120px' }]

    return [...baseCols, ...dynCols, ...endCols]
  }, [classificacoes])

  const tableMinWidth = useMemo(() => {
    const totalPx = activeColumns.reduce((acc, col) => {
      const num = parseInt(col.minWidth || col.width || '110', 10)
      return acc + (isNaN(num) ? 110 : num)
    }, 0)
    return `${Math.max(totalPx, 800)}px`
  }, [activeColumns])

  const getBadgeProps = (classificacao?: string) => {
    if (!classificacao) {
      return {
        label: 'Qualificando',
        className:
          'bg-[#4A7FA5]/10 text-[#4A7FA5] border-[#4A7FA5]/30 dark:bg-[#4A7FA5]/20 dark:text-sky-300',
      }
    }
    if (classificacao === 'Qualificado') {
      return {
        label: 'Qualificado',
        className:
          'bg-[#3E8E5A]/10 text-[#3E8E5A] border-[#3E8E5A]/30 dark:bg-[#3E8E5A]/20 dark:text-green-300',
      }
    }
    if (classificacao === 'Contrato Fechado') {
      return {
        label: 'Contrato Fechado',
        className:
          'bg-[#C9922A]/15 text-[#C9922A] border-[#C9922A]/40 dark:bg-[#C9922A]/25 dark:text-[#D9A94A]',
      }
    }
    return {
      label: classificacao,
      className:
        'bg-[#B4453C]/10 text-[#B4453C] border-[#B4453C]/30 dark:bg-[#B4453C]/20 dark:text-red-300',
    }
  }

  const summaryData = useMemo(() => {
    if (!filteredLeads || filteredLeads.length === 0) return []

    const grouped = filteredLeads.reduce(
      (acc, lead) => {
        const date = lead.data.split(' ')[0]
        if (!acc[date]) {
          acc[date] = {
            date,
            total: 0,
            qualificando: 0,
            qualificado: 0,
            contratoFechado: 0,
            totalDesq: 0,
          }
          classificacoes.forEach((c) => {
            if (c.nome !== 'Qualificado' && c.nome !== 'Contrato Fechado') {
              acc[date][c.nome] = 0
            }
          })
        }

        acc[date].total += 1

        const c = lead.classificacao
        if (!c) {
          acc[date].qualificando += 1
        } else if (c === 'Qualificado') {
          acc[date].qualificado += 1
        } else if (c === 'Contrato Fechado') {
          acc[date].contratoFechado += 1
        } else {
          acc[date].totalDesq += 1
          acc[date][c] = (acc[date][c] || 0) + 1
        }

        return acc
      },
      {} as Record<string, any>,
    )

    return Object.values(grouped).sort((a: any, b: any) => a.date.localeCompare(b.date))
  }, [filteredLeads, classificacoes])

  const totals = useMemo(() => {
    const t: Record<string, number> = {
      total: 0,
      qualificando: 0,
      qualificado: 0,
      contratoFechado: 0,
      totalDesq: 0,
    }

    classificacoes.forEach((c) => {
      if (c.nome !== 'Qualificado' && c.nome !== 'Contrato Fechado') {
        t[c.nome] = 0
      }
    })

    summaryData.forEach((row: any) => {
      t.total += row.total || 0
      t.qualificando += row.qualificando || 0
      t.qualificado += row.qualificado || 0
      t.contratoFechado += row.contratoFechado || 0
      t.totalDesq += row.totalDesq || 0

      Object.keys(row).forEach((k) => {
        if (
          k !== 'date' &&
          k !== 'total' &&
          k !== 'qualificando' &&
          k !== 'qualificado' &&
          k !== 'contratoFechado' &&
          k !== 'totalDesq'
        ) {
          t[k] = (t[k] || 0) + (row[k] || 0)
        }
      })
    })

    return t
  }, [summaryData, classificacoes])

  const leadToDeleteItem = useMemo(() => {
    if (!leadToDelete) return null
    return leads.find((l) => l.id === leadToDelete) || null
  }, [leadToDelete, leads])

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
          Registro de Leads
        </h1>
        <p className="text-sm text-[#78818E] dark:text-muted-foreground">
          Gestão e acompanhamento individual dos leads por origem e classificação
        </p>
      </div>

      {/* 2. BARRA DE CONTROLES: MÊS/ANO, PERÍODO (DE/ATÉ) E BOTÃO NOVO LEAD */}
      <div className="rounded-[10px] border border-[#E4E7EB] dark:border-border bg-white dark:bg-card p-3.5 sm:p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-end justify-between gap-3">
          <div className="flex flex-wrap items-end gap-2.5">
            {/* Mês/Ano */}
            <div className="w-full sm:w-[190px]">
              <label className="text-[10px] font-bold tracking-wider uppercase text-[#78818E] dark:text-muted-foreground mb-1 block">
                Mês de Referência
              </label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="h-9 w-full text-xs border-[#E4E7EB] dark:border-border bg-white dark:bg-card rounded-md focus:ring-[#C9922A]">
                  <SelectValue placeholder="Selecione o mês" />
                </SelectTrigger>
                <SelectContent>
                  {months.map((m) => {
                    const [year, month] = m.split('-')
                    const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1)
                    return (
                      <SelectItem key={m} value={m} className="capitalize text-xs">
                        {format(date, 'MMMM yyyy', { locale: ptBR })}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Período De */}
            <div className="w-[85px] sm:w-[95px]">
              <label className="text-[10px] font-bold tracking-wider uppercase text-[#78818E] dark:text-muted-foreground mb-1 block">
                De (Dia)
              </label>
              <Select
                value={diaInicio || 'all'}
                onValueChange={(val) => setDiaInicio(val === 'all' ? null : val)}
              >
                <SelectTrigger className="h-9 w-full text-xs border-[#E4E7EB] dark:border-border bg-white dark:bg-card rounded-md focus:ring-[#C9922A]">
                  <SelectValue placeholder="De" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  <SelectItem value="all" className="text-xs">
                    Todos
                  </SelectItem>
                  {daysOptions.map((d) => (
                    <SelectItem key={d} value={d} className="text-xs">
                      Dia {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Período Até */}
            <div className="w-[85px] sm:w-[95px]">
              <label className="text-[10px] font-bold tracking-wider uppercase text-[#78818E] dark:text-muted-foreground mb-1 block">
                Até (Dia)
              </label>
              <Select
                value={diaFim || 'all'}
                onValueChange={(val) => setDiaFim(val === 'all' ? null : val)}
              >
                <SelectTrigger className="h-9 w-full text-xs border-[#E4E7EB] dark:border-border bg-white dark:bg-card rounded-md focus:ring-[#C9922A]">
                  <SelectValue placeholder="Até" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  <SelectItem value="all" className="text-xs">
                    Todos
                  </SelectItem>
                  {daysOptions.map((d) => (
                    <SelectItem key={d} value={d} className="text-xs">
                      Dia {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Botão Limpar Filtro de Dias */}
            {(diaInicio || diaFim) && (
              <div className="self-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDiaInicio(null)
                    setDiaFim(null)
                  }}
                  className={cn(
                    'h-9 px-3 text-xs border-[#E4E7EB] dark:border-border rounded-md transition-colors',
                    diaInicio && diaFim && diaInicio > diaFim
                      ? 'text-[#B4453C] hover:bg-red-50 dark:hover:bg-red-950/20 border-[#B4453C]/40'
                      : 'text-[#78818E] hover:text-[#C9922A] hover:bg-[#FAF8F2] dark:hover:bg-muted/40',
                  )}
                  title="Limpar intervalo de dias"
                >
                  <FilterX className="h-3.5 w-3.5 mr-1" /> Limpar
                </Button>
              </div>
            )}
          </div>

          {/* Botão Novo Lead (Padrão dourado institucional dos botões principais) */}
          <div className="self-end sm:self-auto">
            <Button
              onClick={() => {
                setLeadToEdit(null)
                setModalOpen(true)
              }}
              className="bg-[#C9922A] hover:bg-[#b58324] text-white shadow-sm h-9 px-4 text-xs font-semibold rounded-md transition-colors shrink-0 w-full sm:w-auto"
            >
              <Plus className="mr-1.5 h-4 w-4" /> Novo Lead
            </Button>
          </div>
        </div>
      </div>

      {/* 3. ABAS DE ORIGEM — Grafite Premium 2.1 (Pills sóbrias com destaque dourado institucional) */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#E4E7EB] dark:border-border pb-2">
        <span className="text-[10px] uppercase font-bold tracking-wider text-[#78818E] dark:text-muted-foreground mr-1">
          ORIGEM:
        </span>
        {(['DER', 'AUX. ACIDENTE', 'DER CANAL'] as const).map((tab) => {
          const isActive = activeTab === tab
          const label = tab === 'DER' ? 'DER Campanha' : tab === 'DER CANAL' ? 'DER Canal' : tab
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                'h-8 px-3.5 text-xs rounded-md transition-all font-medium cursor-pointer select-none inline-flex items-center gap-1.5 border',
                isActive
                  ? 'bg-[#161920] dark:bg-[#D9A94A] text-[#F1C078] dark:text-[#161920] border-[#161920] dark:border-[#D9A94A] font-semibold shadow-xs ring-1 ring-[#C9922A]/30'
                  : 'border-[#E4E7EB] dark:border-border text-[#78818E] dark:text-muted-foreground bg-white dark:bg-card hover:bg-[#F5F6F8] dark:hover:bg-muted/40 hover:text-[#252B34] dark:hover:text-foreground',
              )}
            >
              <span
                className={cn(
                  'h-1.5 w-1.5 rounded-full transition-colors',
                  isActive ? 'bg-[#C9922A]' : 'bg-[#78818E]/40',
                )}
              />
              {label}
            </button>
          )
        })}
      </div>

      {/* 4. TABELA "RESUMO POR DATA" — Painel corporativo refinado (foco principal) */}
      {!isLoading && summaryData.length > 0 && (
        <div className="rounded-[10px] border border-[#E4E7EB] dark:border-border bg-white dark:bg-card shadow-sm overflow-hidden flex flex-col">
          {/* Cabeçalho da Seção Padronizado */}
          <div className="px-4 py-3 border-b border-[#E4E7EB] dark:border-border bg-white dark:bg-card flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#C9922A]" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#252B34] dark:text-foreground">
                Resumo por Data
              </h2>
              <span className="text-xs text-[#78818E] dark:text-muted-foreground">
                • {summaryData.length}{' '}
                {summaryData.length === 1 ? 'dia com registros' : 'dias com registros'}
              </span>
            </div>
            <span className="text-[10px] font-bold tracking-wider uppercase text-[#C9922A] bg-[#C9922A]/10 px-2 py-0.5 rounded">
              {activeTab === 'DER' ? 'DER CAMPANHA' : activeTab}
            </span>
          </div>

          {/* Tabela com scroll horizontal preservado e larguras mínimas seguras */}
          <div className="overflow-x-auto">
            <div style={{ minWidth: tableMinWidth }}>
              <Table className="table-fixed w-full text-xs">
                {/* Cabeçalho cinza-grafite muito claro com acento sutil */}
                <TableHeader className="bg-[#F5F6F8] dark:bg-muted/40 border-b border-[#E4E7EB] dark:border-border">
                  <TableRow className="hover:bg-transparent border-none">
                    {activeColumns.map((col, idx) => (
                      <TableHead
                        key={idx}
                        style={{ width: col.width, minWidth: col.minWidth }}
                        className={cn(
                          'py-2.5 px-3 text-[10px] font-bold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground whitespace-normal leading-tight break-words border-r border-[#E4E7EB]/70 dark:border-border/70 last:border-r-0',
                          col.key === 'data'
                            ? 'text-left pl-4'
                            : col.key === 'total'
                              ? 'text-center font-extrabold text-[#252B34] dark:text-foreground bg-[#F0F2F5]/60'
                              : col.key === 'qualificando'
                                ? 'text-center text-[#4A7FA5] dark:text-sky-400'
                                : col.key === 'qualificado'
                                  ? 'text-center text-[#3E8E5A] dark:text-green-400'
                                  : col.key === 'contratoFechado'
                                    ? 'text-center text-[#C9922A] dark:text-[#D9A94A]'
                                    : col.key === 'totalDesq'
                                      ? 'text-center text-[#B4453C] dark:text-red-400'
                                      : 'text-center',
                        )}
                        title={col.label}
                      >
                        {col.label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>

                <TableBody className="divide-y divide-[#E4E7EB] dark:divide-border">
                  {summaryData.map((row: any) => (
                    <TableRow
                      key={row.date}
                      className="hover:bg-[#F5F6F8]/70 dark:hover:bg-muted/40 transition-colors bg-white dark:bg-card"
                    >
                      {activeColumns.map((col, idx) => {
                        const isDataCol = col.key === 'data'
                        const isTotalCol = col.key === 'total'
                        const isTotalDesq = col.key === 'totalDesq'
                        const val = isDataCol
                          ? row.date.split('-').reverse().join('/')
                          : row[col.key] || 0

                        return (
                          <TableCell
                            key={idx}
                            style={{ width: col.width, minWidth: col.minWidth }}
                            className={cn(
                              'py-2 px-3 tabular-nums border-r border-[#E4E7EB]/50 dark:border-border/50 last:border-r-0',
                              isDataCol
                                ? 'text-left font-medium text-[#252B34] dark:text-foreground pl-4'
                                : 'text-center',
                              isTotalCol &&
                                'font-bold text-[#252B34] dark:text-foreground bg-[#F5F6F8]/40',
                              col.key === 'qualificando' &&
                                val > 0 &&
                                'text-[#4A7FA5] font-semibold',
                              col.key === 'qualificado' &&
                                val > 0 &&
                                'text-[#3E8E5A] font-semibold',
                              col.key === 'contratoFechado' &&
                                val > 0 &&
                                'text-[#C9922A] font-bold',
                              isTotalDesq && val > 0 && 'text-[#B4453C] font-semibold',
                              !isDataCol && val === 0 && 'text-[#78818E]/60',
                            )}
                          >
                            {val}
                          </TableCell>
                        )
                      })}
                    </TableRow>
                  ))}

                  {/* Linha Total Destacada com régua sutil e fundo neutro suave */}
                  <TableRow className="bg-[#FAF8F2] dark:bg-[#C9922A]/10 hover:bg-[#FAF8F2] dark:hover:bg-[#C9922A]/15 font-bold border-t-2 border-[#C9922A]/40 dark:border-[#C9922A]/60">
                    {activeColumns.map((col, idx) => {
                      const isDataCol = col.key === 'data'
                      const val = isDataCol ? 'TOTAL' : totals[col.key as keyof typeof totals] || 0

                      return (
                        <TableCell
                          key={idx}
                          style={{ width: col.width, minWidth: col.minWidth }}
                          className={cn(
                            'py-2.5 px-3 tabular-nums font-bold border-r border-[#E4E7EB]/70 dark:border-border/70 last:border-r-0',
                            isDataCol
                              ? 'text-left text-[#C9922A] uppercase text-xs tracking-wider pl-4'
                              : 'text-center',
                            col.key === 'total' &&
                              'text-[#252B34] dark:text-foreground text-sm font-extrabold',
                            col.key === 'qualificando' && 'text-[#4A7FA5]',
                            col.key === 'qualificado' && 'text-[#3E8E5A]',
                            col.key === 'contratoFechado' && 'text-[#C9922A]',
                            col.key === 'totalDesq' && 'text-[#B4453C]',
                          )}
                        >
                          {val}
                        </TableCell>
                      )
                    })}
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}

      {/* 5. FILTROS DE BUSCA — Padrão refinado de inputs de /leads */}
      <div className="rounded-[10px] border border-[#E4E7EB] dark:border-border bg-white dark:bg-card p-3 sm:p-3.5 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#78818E] dark:text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por telefone..."
              value={searchTel}
              onChange={(e) => setSearchTel(e.target.value)}
              className="flex h-9 w-full rounded-md border border-[#E4E7EB] dark:border-border bg-white dark:bg-card px-3 py-1.5 pl-9 text-xs placeholder:text-[#78818E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9922A] focus-visible:ring-offset-1 transition-colors"
            />
          </div>
          <div className="relative flex-1 sm:max-w-xs">
            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#78818E] dark:text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por data... (ex: 08/06)"
              value={searchDate}
              onChange={(e) => setSearchDate(e.target.value)}
              className="flex h-9 w-full rounded-md border border-[#E4E7EB] dark:border-border bg-white dark:bg-card px-3 py-1.5 pl-9 text-xs placeholder:text-[#78818E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9922A] focus-visible:ring-offset-1 transition-colors"
            />
          </div>
          {(searchTel || searchDate) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchTel('')
                setSearchDate('')
              }}
              className="h-9 px-3 text-xs border-[#E4E7EB] dark:border-border hover:bg-[#FAF8F2] dark:hover:bg-muted/40 text-[#78818E] hover:text-[#C9922A] rounded-md transition-colors"
            >
              <FilterX className="h-3.5 w-3.5 mr-1" /> Limpar filtros
            </Button>
          )}
        </div>
      </div>

      {/* 6. LISTAGEM INDIVIDUAL DE LEADS — Tabela Corporativa Refinada */}
      <div className="rounded-[10px] border border-[#E4E7EB] dark:border-border bg-white dark:bg-card shadow-sm flex flex-col overflow-hidden">
        {/* Cabeçalho da Listagem */}
        <div className="px-4 py-3 border-b border-[#E4E7EB] dark:border-border bg-white dark:bg-card flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#4A7FA5]" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#252B34] dark:text-foreground">
              Leads Individuais
            </h2>
          </div>
          <span className="text-xs text-[#78818E] dark:text-muted-foreground">
            Exibindo{' '}
            <strong className="text-[#252B34] dark:text-foreground font-semibold tabular-nums">
              {filteredLeads.length}
            </strong>{' '}
            {filteredLeads.length === 1 ? 'registro' : 'registros'}
          </span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center min-h-[300px]">
            <Loader2 className="w-8 h-8 animate-spin text-[#C9922A]" />
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="flex items-center justify-center p-12 min-h-[300px]">
            <div className="text-center max-w-sm">
              <div className="w-14 h-14 bg-[#FAF8F2] dark:bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-3 border border-[#C9922A]/20">
                <ClipboardList className="w-7 h-7 text-[#C9922A]" />
              </div>
              <h3 className="text-base font-bold text-[#252B34] dark:text-foreground mb-1">
                Nenhum lead encontrado
              </h3>
              <p className="text-[#78818E] dark:text-muted-foreground text-xs">
                Nenhum lead registrado para os filtros selecionados neste período.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="text-xs">
              <TableHeader className="bg-[#F5F6F8] dark:bg-muted/40 border-b border-[#E4E7EB] dark:border-border">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="py-2.5 px-4 text-[10px] font-bold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground whitespace-nowrap w-[130px]">
                    DATA
                  </TableHead>
                  <TableHead className="py-2.5 px-4 text-[10px] font-bold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground whitespace-nowrap">
                    TELEFONE
                  </TableHead>
                  <TableHead className="py-2.5 px-4 text-[10px] font-bold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground whitespace-nowrap">
                    RESPONSÁVEL
                  </TableHead>
                  <TableHead className="py-2.5 px-4 text-[10px] font-bold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground whitespace-nowrap">
                    CLASSIFICAÇÃO
                  </TableHead>
                  <TableHead className="py-2.5 px-4 text-[10px] font-bold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground w-[90px] text-right whitespace-nowrap">
                    AÇÕES
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-[#E4E7EB] dark:divide-border">
                {filteredLeads.map((lead) => {
                  const badge = getBadgeProps(lead.classificacao)
                  return (
                    <TableRow
                      key={lead.id}
                      className="hover:bg-[#F5F6F8]/70 dark:hover:bg-muted/40 transition-colors bg-white dark:bg-card"
                    >
                      <TableCell className="py-2.5 px-4 tabular-nums font-medium text-[#252B34] dark:text-foreground whitespace-nowrap">
                        {lead.data.split(' ')[0].split('-').reverse().join('/')}
                      </TableCell>
                      <TableCell className="py-2.5 px-4 tabular-nums text-[#252B34] dark:text-foreground whitespace-nowrap">
                        {lead.telefone}
                      </TableCell>
                      <TableCell className="py-2.5 px-4 text-[#252B34] dark:text-foreground">
                        {lead.responsavel || '—'}
                      </TableCell>
                      <TableCell className="py-2.5 px-4">
                        <span
                          className={cn(
                            'inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border',
                            badge.className,
                          )}
                        >
                          {badge.label}
                        </span>
                      </TableCell>
                      <TableCell className="py-2.5 px-4 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-[#78818E] hover:text-[#C9922A] hover:bg-[#FAF8F2] dark:hover:bg-muted/40 rounded transition-colors"
                            onClick={() => {
                              setLeadToEdit(lead)
                              setModalOpen(true)
                            }}
                            title="Editar lead"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-[#78818E] hover:text-[#B4453C] hover:bg-red-50 dark:hover:bg-red-950/20 rounded transition-colors"
                            onClick={() => setLeadToDelete(lead.id)}
                            title="Remover lead"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* 7. MODAL DE CADASTRO/EDIÇÃO */}
      <LeadsRegistroModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        campanha={activeTab}
        lead={leadToEdit}
        onSaved={() => {
          setModalOpen(false)
          toast.success(leadToEdit ? 'Lead atualizado com sucesso' : 'Lead registrado com sucesso')
          fetchLeads()
        }}
        onClassificacaoAdded={fetchClassificacoes}
      />

      {/* 8. MODAL DE CONFIRMAÇÃO DE EXCLUSÃO (Padrão Corporativo com Alerta Vermelho #B4453C) */}
      <Dialog open={!!leadToDelete} onOpenChange={(isOpen) => !isOpen && setLeadToDelete(null)}>
        <DialogContent className="rounded-[10px] sm:max-w-[450px] border border-[#E4E7EB] dark:border-border p-6 shadow-xl bg-white dark:bg-card">
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
                  Remover Lead
                </DialogTitle>
              </div>
            </div>
            <DialogDescription className="pt-2 text-sm text-[#78818E] dark:text-muted-foreground leading-relaxed">
              Deseja realmente remover o lead{' '}
              {leadToDeleteItem?.telefone ? (
                <strong className="text-[#252B34] dark:text-foreground">
                  ({leadToDeleteItem.telefone})
                </strong>
              ) : null}{' '}
              registrado em{' '}
              <strong className="text-[#252B34] dark:text-foreground">
                {leadToDeleteItem?.data
                  ? leadToDeleteItem.data.split(' ')[0].split('-').reverse().join('/')
                  : 'data selecionada'}
              </strong>
              ? Esta ação não poderá ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-5 flex gap-2 sm:justify-end">
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-4 text-xs border-[#E4E7EB] dark:border-border hover:bg-[#FAF8F2] dark:hover:bg-muted/40 text-[#78818E] rounded-md transition-colors"
              onClick={() => setLeadToDelete(null)}
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
