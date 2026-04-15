import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { FileText, Printer } from 'lucide-react'
import { toYMD } from '@/services/contratos'

const printHtml = (title: string, dataHtml: string) => {
  const html = `
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: system-ui, sans-serif; padding: 20px; color: #333; }
          h1 { color: #d97706; border-bottom: 2px solid #fde68a; padding-bottom: 10px; }
          .date { color: #666; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #e5e7eb; padding: 10px; text-align: left; }
          th { background-color: #f9fafb; font-weight: 600; }
          .money { text-align: right; color: #059669; font-weight: 500; }
          @media print { .no-print { display: none; } }
          .print-btn { background: #d97706; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; margin-bottom: 20px; font-weight: bold; }
        </style>
      </head>
      <body>
        <button class="no-print print-btn" onclick="window.print()">🖨️ Imprimir Relatório</button>
        <h1>Advocacia Gasparotto &mdash; ${title}</h1>
        <div class="date">Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</div>
        ${dataHtml}
      </body>
    </html>
  `
  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
}

export function PartnershipsSummary({ contratos }: { contratos: any[] }) {
  const grouped = contratos.reduce(
    (acc, c) => {
      const nome = c.parceiro_nome || 'Sem Nome'
      if (!acc[nome]) acc[nome] = { casos: 0, total: 0, contratos: [] }
      acc[nome].casos += 1
      acc[nome].total += c.parceiro_comissao || 0
      acc[nome].contratos.push(c)
      return acc
    },
    {} as Record<string, any>,
  )

  const partnerships = Object.entries(grouped).map(([parceiro, data]) => ({
    id: parceiro,
    parceiro,
    casos: data.casos,
    total: data.total,
    contratos: data.contratos,
  }))

  const totalGeralCasos = partnerships.reduce((sum, p) => sum + p.casos, 0)
  const totalGeralRs = partnerships.reduce((sum, p) => sum + p.total, 0)

  const formatMoney = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
  const formatDate = (d: string) => {
    if (!d) return '-'
    const ymd = toYMD(d)
    const [y, m, day] = ymd.split('-')
    return day ? `${day}/${m}/${y}` : '-'
  }

  const buildTableHtml = (lista: any[]) => `
    <table>
      <thead>
        <tr>
          <th>Cliente</th>
          <th>Telefone</th>
          <th>Tipo de Benefício</th>
          <th>Responsável</th>
          <th>Status</th>
          <th>D. Contrato</th>
          <th>D. Protocolo</th>
          <th style="text-align: right;">Comissão R$</th>
        </tr>
      </thead>
      <tbody>
        ${lista
          .map(
            (c) => `
          <tr>
            <td>${c.nome || '-'}</td>
            <td>${c.fone || '-'}</td>
            <td>${c.beneficio || '-'}</td>
            <td>${c.responsavel || '-'}</td>
            <td>${c.status || '-'}</td>
            <td>${formatDate(c.dcontrato)}</td>
            <td>${formatDate(c.dprotocolo)}</td>
            <td class="money">${formatMoney(c.parceiro_comissao || 0)}</td>
          </tr>
        `,
          )
          .join('')}
      </tbody>
    </table>
  `

  const handleRelatorioGeral = () => {
    const htmlParts = partnerships
      .map(
        (p) => `
      <h2 style="margin-top: 30px; color: #374151;">Parceiro: ${p.parceiro}</h2>
      ${buildTableHtml(p.contratos)}
      <div style="text-align: right; margin-top: 10px; font-weight: bold; font-size: 1.1em;">
        Total do Parceiro: <span style="color: #059669;">${formatMoney(p.total)}</span>
      </div>
    `,
      )
      .join('')

    const summaryHtml = `
      <div style="margin-top: 40px; padding: 20px; background: #fef3c7; border: 1px solid #fde68a; border-radius: 8px;">
        <h3 style="margin: 0 0 10px 0; color: #92400e;">Resumo Final</h3>
        <p style="margin: 0; font-size: 1.2em; font-weight: bold;">Total Geral de Casos: ${totalGeralCasos}</p>
        <p style="margin: 5px 0 0 0; font-size: 1.2em; font-weight: bold;">Total Geral em Comissões: <span style="color: #059669;">${formatMoney(totalGeralRs)}</span></p>
      </div>
    `

    printHtml('Relatório Geral de Parcerias', htmlParts + summaryHtml)
  }

  const handleImprimir = (p: any) => {
    const html = `
      <h2 style="color: #374151;">Parceiro: ${p.parceiro}</h2>
      ${buildTableHtml(p.contratos)}
      <div style="text-align: right; margin-top: 20px; font-weight: bold; font-size: 1.2em; padding-top: 10px; border-top: 2px solid #e5e7eb;">
        Total a Receber: <span style="color: #059669;">${formatMoney(p.total)}</span>
      </div>
    `
    printHtml(`Relatório de Parceria - ${p.parceiro}`, html)
  }

  return (
    <Card
      className="mt-8 mb-12 border-amber-200/60 shadow-sm animate-fade-in-down"
      style={{ animationDelay: '100ms' }}
    >
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 gap-4 bg-amber-500/5 rounded-t-xl border-b border-amber-500/10">
        <CardTitle className="text-xl font-bold text-amber-800 dark:text-amber-500">
          Resumo de Parcerias
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRelatorioGeral}
          className="font-semibold bg-background border-amber-300 text-amber-700 hover:bg-amber-50 hover:text-amber-800"
        >
          <FileText className="mr-2 h-4 w-4" /> Relatório geral
        </Button>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-semibold">PARCEIRO</TableHead>
                <TableHead className="text-right font-semibold">CASOS</TableHead>
                <TableHead className="text-right font-semibold">TOTAL POR PARCEIRO (R$)</TableHead>
                <TableHead className="text-center font-semibold w-32">RELATÓRIO</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {partnerships.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                    Nenhuma parceria encontrada para os filtros atuais.
                  </TableCell>
                </TableRow>
              ) : (
                partnerships.map((p) => (
                  <TableRow key={p.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-semibold">{p.parceiro}</TableCell>
                    <TableCell className="text-right font-medium">{p.casos}</TableCell>
                    <TableCell className="text-right font-medium text-emerald-600 dark:text-emerald-400">
                      {formatMoney(p.total)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleImprimir(p)}
                        className="h-8 hover:bg-amber-500/10 hover:text-amber-600"
                      >
                        <Printer className="mr-2 h-4 w-4" /> Imprimir
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
            <TableFooter className="bg-amber-500/10 text-amber-900 dark:text-amber-500 font-bold border-t-2 border-amber-200 dark:border-amber-900">
              <TableRow>
                <TableCell className="text-lg uppercase tracking-wide">TOTAL GERAL</TableCell>
                <TableCell className="text-right text-lg">{totalGeralCasos}</TableCell>
                <TableCell className="text-right text-lg text-emerald-600 dark:text-emerald-400">
                  {formatMoney(totalGeralRs)}
                </TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
