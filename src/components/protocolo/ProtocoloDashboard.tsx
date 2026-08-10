import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { formatCurrency } from '@/lib/formatters'
export function ProtocoloDashboard({
  data,
  tipo,
  responsavel,
  origem,
  month,
  year,
  monthStart,
  monthEnd,
  status,
}: {
  data: any[]
  tipo: string
  responsavel: string
  origem: string
  month: string
  year: string
  monthStart: string
  monthEnd: string
  status: string
}) {
  const filteredData = useMemo(() => {
    return data.filter((d) => {
      if (origem !== 'Todos') {
        if (['Previdenciarista', 'Carnevale', 'Macohin'].includes(origem)) {
          if (d.parceiro !== origem) return false
        } else if (d.origem !== origem) {
          return false
        }
      }
      if (tipo !== 'Todos' && d.expand?.tipo_acao?.nome !== tipo) return false
      const respName = d.expand?.responsavel?.nome || d.responsavel || ''
      if (responsavel !== 'Todos' && respName !== responsavel) return false
      if (year !== 'Todos') {
        const recYear = d.dprotocolo
          ? d.dprotocolo.substring(0, 4)
          : d.dcalculo
            ? d.dcalculo.substring(0, 4)
            : null
        if (recYear !== year) return false
      }

      const hasRange = monthStart !== 'Todos' && monthEnd !== 'Todos'

      if (hasRange) {
        const dMonthStr = d.dprotocolo
          ? d.dprotocolo.substring(5, 7)
          : d.dcalculo
            ? d.dcalculo.substring(5, 7)
            : null
        const dMonth = dMonthStr ? parseInt(dMonthStr, 10) - 1 : -1
        const start = parseInt(monthStart, 10)
        const end = parseInt(monthEnd, 10)
        if (dMonth < start || dMonth > end) return false
      } else if (month !== 'Todos') {
        const dMonthStr = d.dprotocolo
          ? d.dprotocolo.substring(5, 7)
          : d.dcalculo
            ? d.dcalculo.substring(5, 7)
            : null
        const dMonth = dMonthStr ? (parseInt(dMonthStr, 10) - 1).toString() : ''
        if (dMonth !== month) return false
      }
      return true
    })
  }, [data, tipo, responsavel, origem, year, month, monthStart, monthEnd])

  const filteredByStatus = useMemo(() => {
    return filteredData.filter((d) => {
      if (status === 'Todos') {
        return ['Protocolado Judicial', 'Requerimento Adm.', 'Prov. Inicial', 'Calculado'].includes(
          d.status,
        )
      }
      return d.status === status
    })
  }, [filteredData, status])

  const totalAcoes = filteredByStatus.filter((d) =>
    ['Protocolado Judicial', 'Requerimento Adm.', 'Prov. Inicial', 'Calculado'].includes(d.status),
  ).length

  const projHonorariosTicketMedio = filteredByStatus
    .filter(
      (d) =>
        ['Protocolado Judicial', 'Requerimento Adm.', 'Prov. Inicial', 'Calculado'].includes(
          d.status,
        ) && d.decisao !== 'Improcedente',
    )
    .reduce((sum, d) => sum + (d.valor || 0) * (d.parceiro ? 0.15 : 0.3), 0)

  const cProtJud = filteredData.filter((d) => d.status === 'Protocolado Judicial').length
  const cReqAdm = filteredData.filter((d) => d.status === 'Requerimento Adm.').length
  const cProv = filteredData.filter((d) => d.status === 'Prov. Inicial').length
  const cDocs = filteredData.filter((d) => d.status === 'R. Docs').length
  const cCalc = filteredData.filter((d) => d.status === 'Calculado').length

  return (
    <div className="grid gap-6 grid-cols-1 md:grid-cols-3 mb-8">
      <Card className="md:col-span-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl font-bold">Dashboard — Protocolo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-8 mt-4">
            <div>
              <p className="text-sm font-semibold text-muted-foreground">TOTAL AÇÕES</p>
              <p className="text-4xl font-bold">{totalAcoes}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-muted-foreground">PROJEÇÃO DE HONORÁRIOS</p>
              <p className="text-4xl font-bold text-[#C9922A]">{formatCurrency(tVal)}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 mt-6 text-sm">
            <span className="font-medium text-purple-600">Calculado: {cCalc}</span>
            <span className="font-medium text-emerald-600">Prot. Judicial: {cProtJud}</span>
            <span className="font-medium text-teal-600">Req. Adm.: {cReqAdm}</span>
            <span className="font-medium text-blue-600">Prov. Inicial: {cProv}</span>
            <span className="font-medium text-red-600">R. Docs: {cDocs}</span>
          </div>
        </CardContent>
      </Card>

      <Card className="md:col-span-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl font-bold">Ticket Médio por Ação</CardTitle>
          <CardDescription>Média de honorários projetados por processo</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-8 mt-4">
            <div>
              <p className="text-4xl font-bold text-[#C9922A]">
                {totalAcoes > 0 ? formatCurrency(projHonorariosTicketMedio / totalAcoes) : '—'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
