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
      return 'bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/40 text-red-900 dark:text-red-300'
    if (tipo === 'feriado')
      return 'bg-yellow-50 dark:bg-yellow-950/20 hover:bg-yellow-100 dark:hover:bg-yellow-950/40 text-yellow-900 dark:text-yellow-300'
    if (tipo === 'atestado')
      return 'bg-blue-50 dark:bg-blue-950/20 hover:bg-blue-100 dark:hover:bg-blue-950/40 text-blue-900 dark:text-blue-300'
    if (tipo === 'falta' && !isTodayOrFuture)
      return 'bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/40 text-red-900 dark:text-red-300'
    return 'bg-card hover:bg-muted/50'
  }

  if (isLoading)
    return (
      <div className="p-8 text-center text-muted-foreground">Carregando cartão de ponto...</div>
    )

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 print:bg-white print:p-0">
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

      <div className="max-w-6xl mx-auto space-y-6 print:space-y-4">
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

        <Card className="border border-border bg-card shadow-sm overflow-hidden print:shadow-none print:border print:border-gray-200">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted">
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Dia</TableHead>
                  <TableHead>Entrada 1</TableHead>
                  <TableHead>Saída 1</TableHead>
                  <TableHead>Entrada 2</TableHead>
                  <TableHead>Saída 2</TableHead>
                  <TableHead>H. Trab.</TableHead>
                  <TableHead>Saldo do Dia</TableHead>
                  <TableHead>Justificativa</TableHead>
                  <TableHead className="print-hide"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="bg-muted/50">
                  <TableCell className="font-medium text-muted-foreground">Saldo Ant.</TableCell>
                  <TableCell colSpan={6}></TableCell>
                  <TableCell
                    className={cn(
                      'font-bold',
                      saldoAnteriorDinamico >= 0
                        ? 'text-green-600 dark:text-green-500'
                        : 'text-red-600 dark:text-red-500',
                    )}
                  >
                    {formatBalance(saldoAnteriorDinamico, formatMinutesToHHMM)}
                  </TableCell>
                  <TableCell colSpan={2} className="text-xs text-muted-foreground opacity-80">
                    Do mês anterior
                  </TableCell>
                </TableRow>
                {tableRows.map((row, i) => (
                  <TableRow
                    key={i}
                    className={getRowStyle(row.tipo_dia, row.isReal, row.isTodayOrFuture)}
                  >
                    <TableCell>{format(row.date, 'dd/MM')}</TableCell>
                    <TableCell className="capitalize">
                      {format(row.date, 'EEEE', { locale: ptBR })}
                    </TableCell>
                    <TableCell>{row.entrada1 || '-'}</TableCell>
                    <TableCell>{row.saida1 || '-'}</TableCell>
                    <TableCell>{row.entrada2 || '-'}</TableCell>
                    <TableCell>{row.saida2 || '-'}</TableCell>
                    <TableCell className="font-medium">
                      {formatMinutesToHHMM(row.horas_trabalhadas)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        'font-bold',
                        row.saldo_dia > 0
                          ? 'text-green-600 dark:text-green-500'
                          : row.saldo_dia < 0
                            ? 'text-red-600 dark:text-red-500'
                            : 'text-muted-foreground',
                      )}
                    >
                      {formatBalance(row.saldo_dia, formatMinutesToHHMM)}
                    </TableCell>
                    <TableCell
                      className="max-w-[150px] truncate print:max-w-none print:whitespace-normal"
                      title={row.justificativa}
                    >
                      {row.justificativa || '-'}
                    </TableCell>
                    <TableCell className="print-hide">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingRow(row)}
                        className="text-[#C8922A] hover:text-[#C8922A] hover:bg-[#C8922A]/10"
                      >
                        Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-card">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">Horas Trabalhadas</p>
              <p className="text-2xl font-bold text-foreground">
                {formatMinutesToHHMM(monthlyTotals.hTrab)}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-card">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">Saldo do Mês</p>
              <p
                className={cn(
                  'text-2xl font-bold',
                  monthlyTotals.saldoMes >= 0
                    ? 'text-green-600 dark:text-green-500'
                    : 'text-red-600 dark:text-red-500',
                )}
              >
                {formatBalance(monthlyTotals.saldoMes, formatMinutesToHHMM)}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-card">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">Saldo Anterior</p>
              <p
                className={cn(
                  'text-2xl font-bold',
                  saldoAnteriorDinamico >= 0
                    ? 'text-green-600 dark:text-green-500'
                    : 'text-red-600 dark:text-red-500',
                )}
              >
                {formatBalance(saldoAnteriorDinamico, formatMinutesToHHMM)}
              </p>
            </CardContent>
          </Card>
          <Card className="border-[#C8922A] border-2 bg-card print:border-gray-200 print:border">
            <CardContent className="p-4 text-center">
              <p className="text-sm font-semibold text-[#C8922A] print:text-gray-800 mb-1">
                Saldo Acumulado
              </p>
              <p
                className={cn(
                  'text-3xl font-black print:text-black',
                  saldoAcumulado >= 0
                    ? 'text-green-600 dark:text-green-500'
                    : 'text-red-600 dark:text-red-500',
                )}
              >
                {formatBalance(saldoAcumulado, formatMinutesToHHMM)}
              </p>
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
        <DialogContent className="sm:max-w-md bg-background border-border print-hide">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground text-center">
              Exportar Relatório
            </DialogTitle>
            <DialogDescription className="text-center text-muted-foreground">
              Escolha o formato desejado para exportar o cartão de ponto de {funcionario?.nome}.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-6">
            <Button
              onClick={handleExportPDF}
              className="w-full h-14 text-lg bg-[#C8922A] hover:bg-[#b08020] text-white shadow-sm transition-all"
            >
              Exportar PDF
            </Button>
            <Button
              onClick={handleExportExcel}
              className="w-full h-14 text-lg bg-[#C8922A] hover:bg-[#b08020] text-white shadow-sm transition-all"
            >
              Exportar Excel
            </Button>
            <Button
              variant="ghost"
              onClick={() => setExportModalOpen(false)}
              className="w-full text-muted-foreground hover:text-foreground mt-2"
            >
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
