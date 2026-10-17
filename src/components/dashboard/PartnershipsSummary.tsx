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
        <script>
          window.onload = () => window.print();
        </script>
      </head>
      <body>
        <button class="no-print print-btn" onclick="window.print()">🖨️ Imprimir Relatório</button>
        <h1>Advocacia Gasparotto &mdash; ${title}</h1>
        <div class="date">Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</div>
        ${dataHtml}
      </body>
    </html>
  `
  const win = window.open('', '_blank')
  if (win) {
    win.document.open()
    win.document.write(html)
    win.document.close()
  }
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
    casos: (data as any).casos,
    total: (data as any).total,
    contratos: (data as any).contratos,
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
      className="mt-6 mb-8 rounded-[10px] border border-[#E4E7EB] dark:border-border bg-white dark:bg-card shadow-sm animate-fade-in-down"
      style={{ animationDelay: '100ms' }}
    >
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 gap-3 border-b border-[#E4E7EB] dark:border-border">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-[#C9922A]" />
          <CardTitle className="text-base sm:text-lg font-bold text-[#252B34] dark:text-foreground">
            Resumo de Parcerias
          </CardTitle>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRelatorioGeral}
          className="h-8 text-xs font-semibold border-[#E4E7EB] dark:border-border text-[#252B34] dark:text-foreground hover:bg-[#F5F6F8] dark:hover:bg-muted/50 rounded-md gap-1.5 shadow-xs"
        >
          <FileText className="h-3.5 w-3.5 text-[#C9922A]" /> Imprimir Relatório Geral
        </Button>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="rounded-[10px] border border-[#E4E7EB] dark:border-border overflow-hidden">
          <Table>
            <TableHeader className="bg-[#F5F6F8] dark:bg-muted/40">
              <TableRow>
                <TableHead className="text-[10px] uppercase tracking-wider text-[#78818E] dark:text-muted-foreground font-semibold">
                  PARCEIRO
                </TableHead>
                <TableHead className="text-right text-[10px] uppercase tracking-wider text-[#78818E] dark:text-muted-foreground font-semibold">
                  CASOS
                </TableHead>
                <TableHead className="text-right text-[10px] uppercase tracking-wider text-[#78818E] dark:text-muted-foreground font-semibold">
                  TOTAL POR PARCEIRO
                </TableHead>
                <TableHead className="text-center text-[10px] uppercase tracking-wider text-[#78818E] dark:text-muted-foreground font-semibold w-28">
                  RELATÓRIO
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-[#E4E7EB] dark:divide-border">
              {partnerships.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center py-8 text-xs text-[#78818E] dark:text-muted-foreground"
                  >
                    Nenhuma parceria encontrada para os filtros atuais.
                  </TableCell>
                </TableRow>
              ) : (
                partnerships.map((p) => (
                  <TableRow
                    key={p.id}
                    className="hover:bg-[#F5F6F8]/70 dark:hover:bg-muted/30 transition-colors"
                  >
                    <TableCell className="font-semibold text-xs text-[#252B34] dark:text-foreground">
                      {p.parceiro}
                    </TableCell>
                    <TableCell className="text-right text-xs font-medium tabular-nums text-[#78818E] dark:text-muted-foreground">
                      {p.casos}
                    </TableCell>
                    <TableCell className="text-right text-xs font-bold text-[#C9922A] tabular-nums">
                      {formatMoney(p.total)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleImprimir(p)}
                        className="h-7 px-2.5 text-xs text-[#78818E] hover:text-[#C9922A] hover:bg-[#C9922A]/10 rounded-md"
                      >
                        <Printer className="mr-1.5 h-3.5 w-3.5" /> Imprimir
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
            <TableFooter className="bg-[#F5F6F8] dark:bg-muted/50 border-t border-[#E4E7EB] dark:border-border font-semibold text-xs text-[#252B34] dark:text-foreground">
              <TableRow>
                <TableCell className="text-xs uppercase tracking-wider">TOTAL GERAL</TableCell>
                <TableCell className="text-right text-xs tabular-nums">{totalGeralCasos}</TableCell>
                <TableCell className="text-right text-sm font-bold text-[#C9922A] tabular-nums">
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
