import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { format, eachDayOfInterval, startOfMonth, endOfMonth, isWeekend } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  getFuncionario,
  getRegistrosMes,
  getOrCreateSaldoMensal,
  upsertRegistro,
  updateSaldoMensal,
  getPreviousMonthBalance,
} from '@/services/ponto'
import { formatMinutesToHHMM } from '@/lib/formatters'
import { formatBalance } from '@/lib/ponto-utils'
import { CartaoHeader } from '@/components/gestao/CartaoHeader'
import { EditRegistroModal } from '@/components/gestao/EditRegistroModal'
import { cn } from '@/lib/utils'

export default function CartaoPonto() {
  const { funcionarioId } = useParams()
  const { toast } = useToast()
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [funcionario, setFuncionario] = useState<any>(null)
  const [registros, setRegistros] = useState<any[]>([])
  const [saldoMensal, setSaldoMensal] = useState<any>(null)
  const [saldoAnteriorDinamico, setSaldoAnteriorDinamico] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(true)
  const [editingRow, setEditingRow] = useState<any>(null)
  const [exportModalOpen, setExportModalOpen] = useState(false)

  useEffect(() => {
    if (!funcionarioId) return
    const loadData = async () => {
      setIsLoading(true)
      try {
        const func = await getFuncionario(funcionarioId)
        setFuncionario(func)
        const [regs, saldo, prevBalance] = await Promise.all([
          getRegistrosMes(funcionarioId, month, year),
          getOrCreateSaldoMensal(funcionarioId, month, year),
          getPreviousMonthBalance(funcionarioId, month, year),
        ])
        setRegistros(regs)
        setSaldoMensal(saldo)
        setSaldoAnteriorDinamico(prevBalance)
      } catch (err) {
        toast({ title: 'Erro ao carregar dados', variant: 'destructive' })
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [funcionarioId, month, year, toast])

  const tableRows = useMemo(() => {
    if (!funcionario) return []
    const start = new Date(year, month - 1, 1)
    const end = endOfMonth(start)
    const days = eachDayOfInterval({ start, end }).filter((d) => !isWeekend(d))
    const cargaMins = funcionario.carga_diaria || 480
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return days.map((d) => {
      const dateStr = format(d, 'yyyy-MM-dd')
      const rec = registros.find((r) => r.data.startsWith(dateStr))
      const compareDate = new Date(d)
      compareDate.setHours(0, 0, 0, 0)

      const isPast = compareDate < today
      const isTodayOrFuture = compareDate >= today
      const isToday = compareDate.getTime() === today.getTime()

      if (rec) return { date: d, isReal: true, isTodayOrFuture, isPast, isToday, ...rec }

      if (isTodayOrFuture) {
        return {
          date: d,
          isReal: false,
          isTodayOrFuture,
          isPast,
          isToday,
          tipo_dia: 'normal',
          horas_trabalhadas: 0,
          saldo_dia: 0,
          justificativa: '',
        }
      }

      return {
        date: d,
        isReal: false,
        isTodayOrFuture,
        isPast,
        isToday,
        tipo_dia: 'falta',
        horas_trabalhadas: 0,
        saldo_dia: -cargaMins,
        justificativa: '',
      }
    })
  }, [funcionario, registros, month, year])

  const monthlyTotals = useMemo(() => {
    const hTrab = tableRows.reduce((acc, row) => acc + (row.horas_trabalhadas || 0), 0)
    const saldoMes = tableRows.reduce((acc, row) => {
      if (row.isToday && !row.saida2) {
        return acc
      }
      return acc + (row.saldo_dia || 0)
    }, 0)
    return { hTrab, saldoMes }
  }, [tableRows])

  const saldoAcumulado = useMemo(() => {
    return saldoAnteriorDinamico + (monthlyTotals.saldoMes || 0)
  }, [saldoAnteriorDinamico, monthlyTotals.saldoMes])

  useEffect(() => {
    if (
      saldoMensal &&
      !isLoading &&
      saldoMensal.mes === month &&
      saldoMensal.ano === year &&
      (saldoMensal.saldo_mes !== monthlyTotals.saldoMes ||
        saldoMensal.saldo_anterior !== saldoAnteriorDinamico)
    ) {
      updateSaldoMensal(saldoMensal.id, {
        saldo_mes: monthlyTotals.saldoMes,
        saldo_total: saldoAcumulado,
        saldo_anterior: saldoAnteriorDinamico,
      }).then((updated) => setSaldoMensal({ ...updated, saldo_anterior: saldoAnteriorDinamico }))
    }
  }, [
    monthlyTotals.saldoMes,
    saldoMensal,
    isLoading,
    saldoAcumulado,
    saldoAnteriorDinamico,
    month,
    year,
  ])

  const handleSaveRegistro = async (data: any) => {
    try {
      const saved = await upsertRegistro(data.id, data)
      setRegistros((prev) => {
        const exists = prev.find((p) => p.id === saved.id)
        if (exists) return prev.map((p) => (p.id === saved.id ? saved : p))
        return [...prev, saved]
      })
      toast({ title: 'Registro salvo com sucesso!' })
    } catch (err) {
      toast({ title: 'Erro ao salvar', variant: 'destructive' })
      throw err
    }
  }

  const handleExportPDF = () => {
    if (!funcionario) return
    setExportModalOpen(false)
    setTimeout(() => {
      const originalTitle = document.title
      document.title = `CartaoPonto_${funcionario.nome.replace(/\s+/g, '_')}_${month}_${year}`
      window.print()
      document.title = originalTitle
    }, 150)
  }

  const handleExportExcel = () => {
    if (!funcionario || !tableRows.length) return
    const monthName = format(new Date(year, month - 1), 'MMMM', { locale: ptBR })
    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="UTF-8"></head>
      <body>
        <h2>Advocacia Gasparotto - Cartão de Ponto</h2>
        <p><strong>Funcionário:</strong> ${funcionario.nome}</p>
        <p><strong>Mês/Ano:</strong> ${monthName} / ${year}</p>
        <p><strong>Gerado em:</strong> ${format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
        <table border="1">
          <thead>
            <tr>
              <th>Data</th>
              <th>Dia</th>
              <th>Entrada 1</th>
              <th>Saída 1</th>
              <th>Entrada 2</th>
              <th>Saída 2</th>
              <th>H. Trab.</th>
              <th>Saldo Dia</th>
              <th>Justificativa</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows
              .map(
                (row: any) => `
              <tr>
                <td>${format(row.date, 'dd/MM/yyyy')}</td>
                <td>${format(row.date, 'EEEE', { locale: ptBR })}</td>
                <td>${row.entrada1 || ''}</td>
                <td>${row.saida1 || ''}</td>
                <td>${row.entrada2 || ''}</td>
                <td>${row.saida2 || ''}</td>
                <td>${formatMinutesToHHMM(row.horas_trabalhadas || 0)}</td>
                <td>${formatBalance(row.saldo_dia, formatMinutesToHHMM)}</td>
                <td>${row.justificativa || ''}</td>
              </tr>
            `,
              )
              .join('')}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="6"><strong>Totais do Mês</strong></td>
              <td><strong>${formatMinutesToHHMM(monthlyTotals.hTrab)}</strong></td>
              <td><strong>${formatBalance(monthlyTotals.saldoMes, formatMinutesToHHMM)}</strong></td>
              <td></td>
            </tr>
            <tr>
              <td colspan="7"><strong>Saldo Anterior</strong></td>
              <td><strong>${formatBalance(saldoAnteriorDinamico, formatMinutesToHHMM)}</strong></td>
              <td></td>
            </tr>
            <tr>
              <td colspan="7"><strong>Saldo Total Acumulado</strong></td>
              <td><strong>${formatBalance(saldoAcumulado, formatMinutesToHHMM)}</strong></td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </body>
      </html>
    `
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `CartaoPonto_${funcionario.nome.replace(/\s+/g, '_')}_${month}_${year}.xls`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setExportModalOpen(false)
  }

  const getRowStyle = (tipo: string, isReal: boolean, isTodayOrFuture: boolean) => {
    if (!isReal && tipo === 'falta' && !isTodayOrFuture)
      return 'bg-[#B4453C]/5 dark:bg-red-950/20 hover:bg-[#B4453C]/10 dark:hover:bg-red-950/30'
    if (tipo === 'feriado')
      return 'bg-[#C77E1E]/5 dark:bg-amber-950/20 hover:bg-[#C77E1E]/10 dark:hover:bg-amber-950/30'
    if (tipo === 'atestado')
      return 'bg-[#4A7FA5]/5 dark:bg-blue-950/20 hover:bg-[#4A7FA5]/10 dark:hover:bg-blue-950/30'
    if (tipo === 'falta' && !isTodayOrFuture)
      return 'bg-[#B4453C]/5 dark:bg-red-950/20 hover:bg-[#B4453C]/10 dark:hover:bg-red-950/30'
    return 'hover:bg-[#F5F6F8]/60 dark:hover:bg-muted/30 transition-colors'
  }

  const headerClass =
    'text-[10px] uppercase font-bold tracking-[0.8px] text-[#78818E] dark:text-muted-foreground py-3'

  if (isLoading)
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#C9922A] border-t-transparent animate-spin" />
          <p className="text-xs uppercase tracking-wider text-[#78818E] dark:text-muted-foreground">
            Carregando cartão de ponto...
          </p>
        </div>
      </div>
    )

  return (
    <div className="min-h-screen bg-background pb-10 print:bg-white print:p-0">
      <style>{`
        @media print {
          body { background-color: white !important; }
          .print-hide { display: none !important; }
          .print-show { display: block !important; }
          @page { margin: 15mm; size: landscape; }
        }
      `}</style>

      {/* Print Header */}
      <div className="hidden print:block mb-6 text-center">
        <h1 className="text-2xl font-bold uppercase tracking-wider text-gray-800">
          Advocacia Gasparotto
        </h1>
        <h2 className="text-xl font-semibold text-gray-700 mt-2">Relatório de Cartão de Ponto</h2>
        <div className="mt-4 flex justify-between text-sm text-gray-600 border-b border-gray-300 pb-4">
          <div>
            <strong>Funcionário(a):</strong> {funcionario?.nome}
          </div>
          <div>
            <strong>Período:</strong> {format(new Date(year, month - 1), 'MMMM', { locale: ptBR })}{' '}
            / {year}
          </div>
          <div>
            <strong>Gerado em:</strong> {format(new Date(), 'dd/MM/yyyy HH:mm')}
          </div>
        </div>
      </div>

      <div className="space-y-6 animate-fade-in-up print:space-y-4">
        {/* CABEÇALHO DA PÁGINA */}
        <div className="print-hide">
          <CartaoHeader
            funcionario={funcionario}
            month={month}
            year={year}
            setMonth={setMonth}
            setYear={setYear}
            onExportClick={() => setExportModalOpen(true)}
          />
        </div>

        {/* TABELA DE MARCAÇÕES */}
        <div className="rounded-[10px] border border-[#E4E7EB] dark:border-border bg-white dark:bg-card shadow-sm overflow-hidden print:shadow-none print:border print:border-gray-200">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-[#F5F6F8] dark:bg-muted/40 border-b border-[#E4E7EB] dark:border-border">
                <TableRow className="hover:bg-transparent">
                  <TableHead className={headerClass}>DATA</TableHead>
                  <TableHead className={headerClass}>DIA</TableHead>
                  <TableHead className={`text-center ${headerClass}`}>ENTRADA 1</TableHead>
                  <TableHead className={`text-center ${headerClass}`}>SAÍDA 1</TableHead>
                  <TableHead className={`text-center ${headerClass}`}>ENTRADA 2</TableHead>
                  <TableHead className={`text-center ${headerClass}`}>SAÍDA 2</TableHead>
                  <TableHead className={`text-right ${headerClass}`}>H. TRAB.</TableHead>
                  <TableHead className={`text-right ${headerClass}`}>SALDO DO DIA</TableHead>
                  <TableHead className={headerClass}>JUSTIFICATIVA / TIPO</TableHead>
                  <TableHead className={`w-20 text-center pr-4 print-hide ${headerClass}`}>
                    AÇÕES
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-[#E4E7EB] dark:divide-border text-xs">
                {/* Linha Saldo Anterior */}
                <TableRow className="bg-[#FAF8F2]/60 dark:bg-muted/20 font-semibold border-b border-[#E4E7EB] dark:border-border">
                  <TableCell className="text-[#252B34] dark:text-foreground font-bold py-3">
                    Saldo Ant.
                  </TableCell>
                  <TableCell
                    className="text-[#78818E] dark:text-muted-foreground italic"
                    colSpan={5}
                  >
                    Saldo acumulado transferido do mês anterior
                  </TableCell>
                  <TableCell className="text-right text-[#78818E] dark:text-muted-foreground tabular-nums">
                    —
                  </TableCell>
                  <TableCell
                    className={cn(
                      'text-right font-bold tabular-nums py-3',
                      saldoAnteriorDinamico >= 0 ? 'text-[#3E8E5A]' : 'text-[#B4453C]',
                    )}
                  >
                    <span
                      className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded font-mono',
                        saldoAnteriorDinamico >= 0
                          ? 'bg-[#3E8E5A]/10 text-[#3E8E5A]'
                          : 'bg-[#B4453C]/10 text-[#B4453C]',
                      )}
                    >
                      {formatBalance(saldoAnteriorDinamico, formatMinutesToHHMM)}
                    </span>
                  </TableCell>
                  <TableCell
                    className="text-[#78818E] dark:text-muted-foreground text-[11px]"
                    colSpan={2}
                  >
                    Referência do período anterior
                  </TableCell>
                </TableRow>

                {/* Linhas diárias */}
                {tableRows.map((row, i) => {
                  const isFalta = !row.isReal && row.tipo_dia === 'falta' && !row.isTodayOrFuture
                  return (
                    <TableRow
                      key={i}
                      className={cn(
                        getRowStyle(row.tipo_dia, row.isReal, row.isTodayOrFuture),
                        row.isToday &&
                          'ring-1 ring-[#C9922A]/40 bg-[#FAF8F2]/40 dark:bg-[#C9922A]/5',
                      )}
                    >
                      <TableCell className="py-2.5 font-medium tabular-nums text-[#252B34] dark:text-foreground">
                        <div className="flex items-center gap-1.5">
                          <span>{format(row.date, 'dd/MM')}</span>
                          {row.isToday && (
                            <span className="text-[9px] font-bold uppercase tracking-wider bg-[#C9922A] text-white px-1 py-0.2 rounded">
                              Hoje
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="capitalize text-[#78818E] dark:text-muted-foreground py-2.5">
                        {format(row.date, 'EEEE', { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-center font-mono text-[#252B34] dark:text-foreground tabular-nums py-2.5">
                        {row.entrada1 || <span className="text-[#A5ADB9]">—</span>}
                      </TableCell>
                      <TableCell className="text-center font-mono text-[#252B34] dark:text-foreground tabular-nums py-2.5">
                        {row.saida1 || <span className="text-[#A5ADB9]">—</span>}
                      </TableCell>
                      <TableCell className="text-center font-mono text-[#252B34] dark:text-foreground tabular-nums py-2.5">
                        {row.entrada2 || <span className="text-[#A5ADB9]">—</span>}
                      </TableCell>
                      <TableCell className="text-center font-mono text-[#252B34] dark:text-foreground tabular-nums py-2.5">
                        {row.saida2 || <span className="text-[#A5ADB9]">—</span>}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium text-[#252B34] dark:text-foreground tabular-nums py-2.5">
                        {formatMinutesToHHMM(row.horas_trabalhadas)}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums py-2.5">
                        <span
                          className={cn(
                            'inline-flex items-center font-semibold px-1.5 py-0.5 rounded text-xs',
                            row.saldo_dia > 0
                              ? 'bg-[#3E8E5A]/10 text-[#3E8E5A]'
                              : row.saldo_dia < 0
                                ? 'bg-[#B4453C]/10 text-[#B4453C]'
                                : 'text-[#78818E] dark:text-muted-foreground',
                          )}
                        >
                          {formatBalance(row.saldo_dia, formatMinutesToHHMM)}
                        </span>
                      </TableCell>
                      <TableCell
                        className="max-w-[200px] truncate print:max-w-none print:whitespace-normal py-2.5"
                        title={row.justificativa || row.tipo_dia}
                      >
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {row.tipo_dia && row.tipo_dia !== 'normal' && (
                            <span
                              className={cn(
                                'inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded border',
                                row.tipo_dia === 'falta'
                                  ? 'bg-[#B4453C]/10 text-[#B4453C] border-[#B4453C]/20'
                                  : row.tipo_dia === 'feriado'
                                    ? 'bg-[#C77E1E]/10 text-[#C77E1E] border-[#C77E1E]/20'
                                    : row.tipo_dia === 'atestado'
                                      ? 'bg-[#4A7FA5]/10 text-[#4A7FA5] border-[#4A7FA5]/20'
                                      : 'bg-muted text-muted-foreground border-border',
                              )}
                            >
                              {row.tipo_dia}
                            </span>
                          )}
                          <span className="text-[#78818E] dark:text-muted-foreground truncate">
                            {row.justificativa ||
                              (!row.tipo_dia || row.tipo_dia === 'normal' ? '—' : '')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center print-hide py-2.5 pr-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingRow(row)}
                          className="h-7 px-2.5 text-xs text-[#78818E] hover:text-[#C9922A] hover:bg-[#FAF8F2] dark:hover:bg-muted/40 rounded transition-colors"
                        >
                          Editar
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* 5. CARDS DE RESUMO DO RODAPÉ (GRAFITE PREMIUM 2.1) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 print:grid-cols-4">
          {/* CARD 1 — HORAS TRABALHADAS */}
          <Card className="rounded-[10px] border border-[#E4E7EB] dark:border-border bg-white dark:bg-card shadow-sm">
            <CardContent className="p-4 sm:p-5 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-semibold tracking-wider uppercase text-[#78818E] dark:text-muted-foreground block mb-2">
                  Horas Trabalhadas
                </span>
                <p className="text-[11px] text-[#78818E] dark:text-muted-foreground mb-3">
                  Total apurado no mês
                </p>
              </div>
              <div className="text-2xl sm:text-3xl font-bold tracking-tight text-[#252B34] dark:text-foreground font-mono tabular-nums">
                {formatMinutesToHHMM(monthlyTotals.hTrab)}
              </div>
            </CardContent>
          </Card>

          {/* CARD 2 — SALDO DO MÊS */}
          <Card className="rounded-[10px] border border-[#E4E7EB] dark:border-border bg-white dark:bg-card shadow-sm">
            <CardContent className="p-4 sm:p-5 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-semibold tracking-wider uppercase text-[#78818E] dark:text-muted-foreground block mb-2">
                  Saldo do Mês
                </span>
                <p className="text-[11px] text-[#78818E] dark:text-muted-foreground mb-3">
                  Balanço das marcações
                </p>
              </div>
              <div
                className={cn(
                  'text-2xl sm:text-3xl font-bold tracking-tight font-mono tabular-nums',
                  monthlyTotals.saldoMes >= 0 ? 'text-[#3E8E5A]' : 'text-[#B4453C]',
                )}
              >
                {formatBalance(monthlyTotals.saldoMes, formatMinutesToHHMM)}
              </div>
            </CardContent>
          </Card>

          {/* CARD 3 — SALDO ANTERIOR */}
          <Card className="rounded-[10px] border border-[#E4E7EB] dark:border-border bg-white dark:bg-card shadow-sm">
            <CardContent className="p-4 sm:p-5 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-semibold tracking-wider uppercase text-[#78818E] dark:text-muted-foreground block mb-2">
                  Saldo Anterior
                </span>
                <p className="text-[11px] text-[#78818E] dark:text-muted-foreground mb-3">
                  Acumulado até o mês anterior
                </p>
              </div>
              <div
                className={cn(
                  'text-2xl sm:text-3xl font-bold tracking-tight font-mono tabular-nums',
                  saldoAnteriorDinamico >= 0 ? 'text-[#3E8E5A]' : 'text-[#B4453C]',
                )}
              >
                {formatBalance(saldoAnteriorDinamico, formatMinutesToHHMM)}
              </div>
            </CardContent>
          </Card>

          {/* CARD 4 — SALDO ACUMULADO (CARD EXECUTIVO GRAFITE PREMIUM #22262E) */}
          <Card className="relative overflow-hidden rounded-[10px] border border-[#2E3440] bg-[#22262E] text-white shadow-sm flex flex-col justify-between print:bg-white print:text-black print:border-gray-300">
            <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[11px] font-semibold tracking-wider uppercase text-[#9EA7B6] print:text-gray-700">
                    Saldo Acumulado
                  </span>
                  <span className="inline-flex items-center text-[9px] font-bold tracking-wider uppercase text-[#D9A94A] bg-[#2B303C] print:bg-gray-100 print:text-black px-1.5 py-0.5 rounded">
                    Total
                  </span>
                </div>
                <p className="text-[11px] text-[#7C8596] print:text-gray-500 mb-3">
                  Saldo anterior + saldo do mês
                </p>
              </div>

              <div>
                <div
                  className={cn(
                    'text-2xl sm:text-3xl font-bold tracking-tight font-mono tabular-nums',
                    saldoAcumulado >= 0
                      ? 'text-[#D9A94A] print:text-green-700'
                      : 'text-[#F87171] print:text-red-700',
                  )}
                >
                  {formatBalance(saldoAcumulado, formatMinutesToHHMM)}
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-[11px] text-[#A5ADB9] print:text-gray-600">
                  <span
                    className={cn(
                      'inline-block h-1.5 w-1.5 rounded-full',
                      saldoAcumulado >= 0 ? 'bg-[#3E8E5A]' : 'bg-[#B4453C]',
                    )}
                  />
                  <span>
                    {saldoAcumulado >= 0 ? 'Banco de horas positivo' : 'Banco de horas negativo'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <EditRegistroModal
        isOpen={!!editingRow}
        onClose={() => setEditingRow(null)}
        rowData={editingRow}
        funcionario={funcionario}
        onSave={handleSaveRegistro}
      />

      <Dialog open={exportModalOpen} onOpenChange={setExportModalOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-card border border-[#E4E7EB] dark:border-border rounded-[10px] p-6 shadow-lg print-hide">
          <DialogHeader className="space-y-1.5">
            <span className="inline-flex items-center self-start text-[10px] font-bold tracking-[1.5px] uppercase text-[#C9922A] bg-[#C9922A]/10 px-2 py-0.5 rounded">
              EXPORTAÇÃO
            </span>
            <DialogTitle className="text-xl font-bold text-[#252B34] dark:text-foreground">
              Exportar Relatório
            </DialogTitle>
            <DialogDescription className="text-xs text-[#78818E] dark:text-muted-foreground">
              Selecione o formato desejado para exportar o cartão de ponto de {funcionario?.nome}.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-4">
            <Button
              onClick={handleExportPDF}
              className="w-full h-11 text-xs font-semibold bg-[#C9922A] hover:bg-[#b58324] text-white shadow-sm transition-colors rounded-md"
            >
              Exportar PDF para Impressão
            </Button>
            <Button
              variant="outline"
              onClick={handleExportExcel}
              className="w-full h-11 text-xs font-semibold border-[#E4E7EB] dark:border-border text-[#252B34] dark:text-foreground hover:bg-[#FAF8F2] dark:hover:bg-muted/40 transition-colors rounded-md"
            >
              Exportar Planilha Excel (.xls)
            </Button>
          </div>
          <div className="pt-2 border-t border-[#E4E7EB] dark:border-border flex justify-end">
            <Button
              variant="ghost"
              onClick={() => setExportModalOpen(false)}
              className="h-9 px-4 text-xs text-[#78818E] hover:text-[#252B34] dark:hover:text-foreground"
            >
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
