import { useState } from 'react'
import { DollarSign, TrendingUp, FileCheck2, FolderCheck, AlertCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { DashboardProtocolo, DashboardContrato } from '@/hooks/use-dashboard-data'

interface Props {
  protocolos: DashboardProtocolo[]
  contratos: DashboardContrato[]
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

export function OverviewStats({ protocolos, contratos }: Props) {
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)
  const months = [
    { value: 0, label: 'Todos os meses' },
    { value: 1, label: 'Janeiro' },
    { value: 2, label: 'Fevereiro' },
    { value: 3, label: 'Março' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Maio' },
    { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Setembro' },
    { value: 10, label: 'Outubro' },
    { value: 11, label: 'Novembro' },
    { value: 12, label: 'Dezembro' },
  ]

  const [yearTicket, setYearTicket] = useState(currentYear)
  const [monthTicket, setMonthTicket] = useState(0)

  const [yearCard3, setYearCard3] = useState(currentYear)
  const [yearCard4, setYearCard4] = useState(currentYear)

  // Card 1 & 2 Logic (Preservada integralmente)
  const validProtocolos = protocolos.filter(
    (p) => p.status !== 'R. Docs' && p.decisao !== 'Improcedente',
  )
  const totalHonorarios = validProtocolos.reduce((acc, p) => acc + (p.valor || 0) * 0.3, 0)
  const totalAcoes = validProtocolos.length

  // Card 3 Logic (Preservada integralmente)
  const contratosAno3 = contratos.filter(
    (c) => c.dcontrato && new Date(c.dcontrato).getFullYear() === yearCard3,
  )
  const ativosAno3 = contratosAno3.filter(
    (c) => !['Sem Qualidade de Segurado', 'Tem Advogado', 'Litispendência'].includes(c.status),
  ).length

  // Card 4 Logic (Preservada integralmente)
  const contratosAno4 = contratos.filter(
    (c) => c.dcontrato && new Date(c.dcontrato).getFullYear() === yearCard4,
  )
  const rDocsAno4 = contratosAno4.filter((c) => c.status === 'R. Docs').length
  const ativosAno4 = contratosAno4.filter(
    (c) => !['Sem Qualidade de Segurado', 'Tem Advogado', 'Litispendência'].includes(c.status),
  ).length

  const rdocsPercentage = ativosAno4 > 0 ? Math.round((rDocsAno4 / ativosAno4) * 100) : 0
  const isMetaMet = rdocsPercentage >= 50

  // Ticket Médio Logic (Preservada integralmente)
  const validTicketProtocolos = protocolos.filter((p) => {
    if (!p.dprotocolo) return false
    const date = new Date(p.dprotocolo)
    const isYearMatch = date.getFullYear() === yearTicket
    const isMonthMatch = monthTicket === 0 || date.getMonth() + 1 === monthTicket
    const isStatusMatch = ['Protocolado Judicial', 'Requerimento Adm.', 'Prov. Inicial'].includes(
      p.status,
    )
    const isDecisaoMatch = p.decisao !== 'Improcedente'
    return isYearMatch && isMonthMatch && isStatusMatch && isDecisaoMatch
  })

  const sumHonorariosTicket = validTicketProtocolos.reduce(
    (acc, p) => acc + (p.valor || 0) * 0.3,
    0,
  )
  const countTicket = validTicketProtocolos.length
  const ticketMedio = countTicket > 0 ? sumHonorariosTicket / countTicket : null

  return (
    <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {/* CARD 1 — TOTAL HONORÁRIOS (Grafite Premium Executivo #22262E) */}
      <Card className="relative overflow-hidden rounded-[10px] border border-[#2E3440] bg-[#22262E] text-white shadow-sm flex flex-col justify-between">
        <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[11px] font-semibold tracking-wider uppercase text-[#9EA7B6]">
                Total Honorários
              </span>
              <div className="h-7 w-7 rounded-md bg-[#2B303C] flex items-center justify-center text-[#D9A94A]">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
            <p className="text-[11px] text-[#7C8596] mb-3">Todos os anos acumulados</p>
          </div>

          <div>
            <div
              className="text-xl sm:text-2xl font-bold tracking-tight text-[#D9A94A] tabular-nums"
              title={formatCurrency(totalHonorarios)}
            >
              {formatCurrency(totalHonorarios)}
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-[#A5ADB9]">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#3E8E5A]" />
              <span>Estimativa 30% contratual</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CARD 2 — TICKET MÉDIO POR AÇÃO */}
      <Card className="rounded-[10px] border border-[#E4E7EB] dark:border-border bg-white dark:bg-card shadow-sm flex flex-col justify-between">
        <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[11px] font-semibold tracking-wider uppercase text-[#78818E] dark:text-muted-foreground">
                Ticket Médio
              </span>
              <div className="h-7 w-7 rounded-md bg-[#F5F6F8] dark:bg-muted/50 flex items-center justify-center text-[#C9922A]">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>

            {/* Filtros em shadcn Select */}
            <div className="grid grid-cols-2 gap-1.5 mb-3">
              <Select
                value={String(monthTicket)}
                onValueChange={(val) => setMonthTicket(Number(val))}
              >
                <SelectTrigger className="h-7 text-[11px] px-2 py-0 border-[#E4E7EB] dark:border-border bg-white dark:bg-card">
                  <SelectValue placeholder="Mês" />
                </SelectTrigger>
                <SelectContent>
                  {months.map((m) => (
                    <SelectItem key={m.value} value={String(m.value)} className="text-xs">
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={String(yearTicket)}
                onValueChange={(val) => setYearTicket(Number(val))}
              >
                <SelectTrigger className="h-7 text-[11px] px-2 py-0 border-[#E4E7EB] dark:border-border bg-white dark:bg-card">
                  <SelectValue placeholder="Ano" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)} className="text-xs">
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <div
              className="text-xl sm:text-2xl font-bold tracking-tight text-[#252B34] dark:text-foreground tabular-nums"
              title={ticketMedio !== null ? formatCurrency(ticketMedio) : 'Sem registros'}
            >
              {ticketMedio !== null ? formatCurrency(ticketMedio) : '—'}
            </div>
            <p className="mt-2 text-[11px] text-[#78818E] dark:text-muted-foreground">
              {countTicket > 0 ? `${countTicket} ações consideradas` : 'Nenhuma ação no período'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* CARD 3 — AÇÕES DISTRIBUÍDAS */}
      <Card className="rounded-[10px] border border-[#E4E7EB] dark:border-border bg-white dark:bg-card shadow-sm flex flex-col justify-between">
        <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[11px] font-semibold tracking-wider uppercase text-[#78818E] dark:text-muted-foreground">
                Ações Distribuídas
              </span>
              <div className="h-7 w-7 rounded-md bg-[#F5F6F8] dark:bg-muted/50 flex items-center justify-center text-[#4A7FA5]">
                <FileCheck2 className="h-4 w-4" />
              </div>
            </div>
            <p className="text-[11px] text-[#78818E] dark:text-muted-foreground mb-3">
              Todos os anos acumulados
            </p>
          </div>

          <div>
            <div className="text-xl sm:text-2xl font-bold tracking-tight text-[#252B34] dark:text-foreground tabular-nums">
              {totalAcoes}
            </div>
            <p className="mt-2 text-[11px] text-[#78818E] dark:text-muted-foreground">
              Processos com protocolo ativo
            </p>
          </div>
        </CardContent>
      </Card>

      {/* CARD 4 — CONTRATOS FECHADOS (ATIVOS) */}
      <Card className="rounded-[10px] border border-[#E4E7EB] dark:border-border bg-white dark:bg-card shadow-sm flex flex-col justify-between">
        <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[11px] font-semibold tracking-wider uppercase text-[#78818E] dark:text-muted-foreground">
                Contratos Fechados
              </span>
              <div className="h-7 w-7 rounded-md bg-[#F5F6F8] dark:bg-muted/50 flex items-center justify-center text-[#3E8E5A]">
                <FolderCheck className="h-4 w-4" />
              </div>
            </div>

            <div className="mb-3">
              <Select value={String(yearCard3)} onValueChange={(val) => setYearCard3(Number(val))}>
                <SelectTrigger className="h-7 text-[11px] px-2 py-0 border-[#E4E7EB] dark:border-border bg-white dark:bg-card">
                  <SelectValue placeholder="Ano" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)} className="text-xs">
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <div className="text-xl sm:text-2xl font-bold tracking-tight text-[#252B34] dark:text-foreground tabular-nums">
              {ativosAno3}
            </div>
            <p className="mt-2 text-[11px] text-[#78818E] dark:text-muted-foreground">
              Contratos ativos em {yearCard3}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* CARD 5 — CASOS FALTANDO DOCUMENTOS */}
      <Card className="rounded-[10px] border border-[#E4E7EB] dark:border-border bg-white dark:bg-card shadow-sm flex flex-col justify-between">
        <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[11px] font-semibold tracking-wider uppercase text-[#78818E] dark:text-muted-foreground">
                Faltando Documentos
              </span>
              <div className="h-7 w-7 rounded-md bg-[#F5F6F8] dark:bg-muted/50 flex items-center justify-center text-[#C77E1E]">
                <AlertCircle className="h-4 w-4" />
              </div>
            </div>

            <div className="mb-3">
              <Select value={String(yearCard4)} onValueChange={(val) => setYearCard4(Number(val))}>
                <SelectTrigger className="h-7 text-[11px] px-2 py-0 border-[#E4E7EB] dark:border-border bg-white dark:bg-card">
                  <SelectValue placeholder="Ano" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)} className="text-xs">
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[#B4453C] tabular-nums">{rDocsAno4}</span>
              <span className="text-sm font-semibold text-[#C9922A] tabular-nums">
                ({rdocsPercentage}%)
              </span>
            </div>
            <div className="mt-2 flex items-center gap-1.5">
              <span
                className={cn(
                  'inline-block h-2 w-2 rounded-full',
                  isMetaMet ? 'bg-[#3E8E5A]' : 'bg-[#B4453C]',
                )}
              />
              <p
                className={cn(
                  'text-[11px] font-medium leading-tight',
                  isMetaMet
                    ? 'text-[#3E8E5A] dark:text-green-400'
                    : 'text-[#B4453C] dark:text-red-400',
                )}
              >
                Meta: liberar ≥ 50%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
