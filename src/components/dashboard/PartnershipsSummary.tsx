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
  const html = `<!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>${title}</title>
        <style>
          body { font-family: system-ui, sans-serif; padding: 20px; color: #333; }
          body { font-family: system-ui, sans-serif; padding: 20px; color: #1A1A0E; background: #ffffff; }
          h1 { color: #C9922A; border-bottom: 2px solid #C9922A; padding-bottom: 10px; }
          .date { color: #666; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #e5e7eb; padding: 10px; text-align: left; }
          th { background-color: #FAF8F2; font-weight: 600; color: #1A1A0E; }
          .money { text-align: right; color: #C9922A; font-weight: 700; }
          @media print { .no-print { display: none; } }
          .print-btn { background: #C9922A; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; margin-bottom: 20px; font-weight: bold; }
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
  const blob = new Blob([html], { type: 'text/html; charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${title}.html`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function PartnershipsSummary({ contratos = [] }: { contratos: any[] }) {
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
      <div style="text-align: right; margin-top: 10px; padding: 10px; font-weight: bold; font-size: 1.1em; background: #FFF8E8; color: #1A1A0E; border: 1px solid #e5e7eb; border-top: none;">
        Total do Parceiro: <span style="color: #C9922A;">${formatMoney(p.total)}</span>
      </div>
    `,
      )
      .join('')

    const summaryHtml = `
      <div style="margin-top: 40px; padding: 20px; background: #FFF8E8; border: 2px solid #C9922A; border-radius: 8px; color: #1A1A0E;">
        <h3 style="margin: 0 0 10px 0; color: #C9922A;">Resumo Final</h3>
        <p style="margin: 0; font-size: 1.2em; font-weight: bold;">Total Geral de Casos: ${totalGeralCasos}</p>
        <p style="margin: 5px 0 0 0; font-size: 1.2em; font-weight: bold;">Total Geral em Comissões: <span style="color: #C9922A;">${formatMoney(totalGeralRs)}</span></p>
      </div>
    `

    printHtml('Relatório Geral de Parcerias', htmlParts + summaryHtml)
  }

  const handleImprimir = (p: any) => {
    const html = `
      <h2 style="color: #374151;">Parceiro: ${p.parceiro}</h2>
      ${buildTableHtml(p.contratos)}
      <div style="text-align: right; margin-top: 20px; padding: 15px; font-weight: bold; font-size: 1.2em; background: #FFF8E8; color: #1A1A0E; border: 1px solid #C9922A;">
        Total a Receber: <span style="color: #C9922A;">${formatMoney(p.total)}</span>
      </div>
    `
    printHtml(`Relatório de Parceria - ${p.parceiro}`, html)
  }

  return (
    <Card
      className="mt-8 mb-12 border-amber-200/60 shadow-sm animate-fade-in-down"
      style={{ animationDelay: '100ms' }}
    >
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 gap-4 bg-[#C9922A]/5 rounded-t-xl border-b border-[#C9922A]/10">
        <CardTitle className="text-xl font-bold text-[#C9922A]">Resumo de Parcerias</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRelatorioGeral}
          className="font-bold border-[#C9922A] text-[#C9922A] hover:bg-[#C9922A]/10 hover:text-[#C9922A]"
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
                    <TableCell className="text-right font-bold text-[#C9922A]">
                      {formatMoney(p.total)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleImprimir(p)}
                        className="h-8 hover:bg-[#C9922A]/10 hover:text-[#C9922A]"
                      >
                        <Printer className="mr-2 h-4 w-4" /> Imprimir
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
            <TableFooter className="bg-[#C9922A]/10 text-[#C9922A] font-bold border-t-2 border-[#C9922A]/30">
              <TableRow>
                <TableCell className="text-lg uppercase tracking-wide">TOTAL GERAL</TableCell>
                <TableCell className="text-right text-lg">{totalGeralCasos}</TableCell>
                <TableCell className="text-right text-lg font-black">
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
