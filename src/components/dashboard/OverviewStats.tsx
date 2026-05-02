import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

  // Card 1 & 2 Logic
  const validProtocolos = protocolos.filter(
    (p) => p.status !== 'R. Docs' && p.decisao !== 'Improcedente',
  )
  const totalHonorarios = validProtocolos.reduce((acc, p) => acc + (p.valor || 0) * 0.3, 0)
  const totalAcoes = validProtocolos.length

  // Card 3 Logic
  const contratosAno3 = contratos.filter(
    (c) => c.dcontrato && new Date(c.dcontrato).getFullYear() === yearCard3,
  )
  const ativosAno3 = contratosAno3.filter(
    (c) => !['Sem Qualidade de Segurado', 'Tem Advogado', 'Litispendência'].includes(c.status),
  ).length

  // Card 4 Logic
  const contratosAno4 = contratos.filter(
    (c) => c.dcontrato && new Date(c.dcontrato).getFullYear() === yearCard4,
  )
  const rDocsAno4 = contratosAno4.filter((c) => c.status === 'R. Docs').length
  const ativosAno4 = contratosAno4.filter(
    (c) => !['Sem Qualidade de Segurado', 'Tem Advogado', 'Litispendência'].includes(c.status),
  ).length

  const rdocsPercentage = ativosAno4 > 0 ? Math.round((rDocsAno4 / ativosAno4) * 100) : 0
  const isMetaMet = rdocsPercentage >= 50

  // Ticket Médio Logic
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
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      <Card className="border-t-2 border-t-[#C9922A] shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Honorários (todos os anos)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">
            {formatCurrency(totalHonorarios)}
          </div>
        </CardContent>
      </Card>

      <Card className="border-t-2 border-t-[#C9922A] shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Ticket Médio por Ação
          </CardTitle>
          <div className="flex gap-1">
            <select
              className="h-7 rounded-md border border-input bg-transparent px-1 py-0.5 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={monthTicket}
              onChange={(e) => setMonthTicket(Number(e.target.value))}
            >
              {months.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            <select
              className="h-7 rounded-md border border-input bg-transparent px-1 py-0.5 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={yearTicket}
              onChange={(e) => setYearTicket(Number(e.target.value))}
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-[#C9922A]">
            {ticketMedio !== null ? formatCurrency(ticketMedio) : '—'}
          </div>
        </CardContent>
      </Card>

      <Card className="border-t-2 border-t-blue-500 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Ações Distribuídas (todos os anos)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">{totalAcoes}</div>
        </CardContent>
      </Card>

      <Card className="border-t-2 border-t-green-500 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Contratos Fechados (Ativos)
          </CardTitle>
          <select
            className="h-7 rounded-md border border-input bg-transparent px-2 py-0.5 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={yearCard3}
            onChange={(e) => setYearCard3(Number(e.target.value))}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">{ativosAno3}</div>
        </CardContent>
      </Card>

      <Card className="border-t-2 border-t-red-500 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Casos em R. Docs
          </CardTitle>
          <select
            className="h-7 rounded-md border border-input bg-transparent px-2 py-0.5 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={yearCard4}
            onChange={(e) => setYearCard4(Number(e.target.value))}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-red-500">{rDocsAno4}</span>
            <span className="text-lg font-semibold text-[#C9922A]">{rdocsPercentage}%</span>
          </div>
          <p
            className={cn(
              'mt-1 text-xs font-medium',
              isMetaMet ? 'text-green-600' : 'text-red-600',
            )}
          >
            Meta: liberar ≥ 50% para protocolo
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
