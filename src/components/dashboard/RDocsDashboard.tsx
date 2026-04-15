import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { CheckCircle2, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

const MONTHS = [
  'JANEIRO',
  'FEVEREIRO',
  'MARÇO',
  'ABRIL',
  'MAIO',
  'JUNHO',
  'JULHO',
  'AGOSTO',
  'SETEMBRO',
  'OUTUBRO',
  'NOVEMBRO',
  'DEZEMBRO',
]
const ARCHIVED_STATUSES = ['Sem Qualidade de Segurado', 'Tem Advogado', 'Litispendência']

export function RDocsDashboard({ contratos, year }: { contratos: any[]; year: number }) {
  const [selectedMonth, setSelectedMonth] = useState('MARÇO')

  const metrics = useMemo(() => {
    const monthIndex = MONTHS.indexOf(selectedMonth)
    const monthStr = (monthIndex + 1).toString().padStart(2, '0')
    const prefix = `${year}-${monthStr}`

    const periodContratos = contratos.filter(
      (c) => c.dcontrato && c.dcontrato.startsWith(prefix) && !ARCHIVED_STATUSES.includes(c.status),
    )
    const total = periodContratos.length
    const liberados = periodContratos.filter((c) => c.status === 'OK').length
    const pendentes = total - liberados
    const rate = total > 0 ? Math.round((liberados / total) * 100) : 0

    return { total, liberados, pendentes, rate }
  }, [contratos, selectedMonth, year])

  const isSuccess = metrics.rate >= 50
  const message = isSuccess
    ? `Em ${selectedMonth} ${year}, ${metrics.rate}% dos contratos foram liberados — acima da média aceitável de 50%.`
    : `Em ${selectedMonth} ${year}, ${metrics.rate}% dos contratos foram liberados — abaixo da meta de 50%.`

  return (
    <Card
      className="mt-8 border-border/60 shadow-sm animate-fade-in-up"
      style={{ animationDelay: '100ms' }}
    >
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 gap-4">
        <CardTitle className="text-xl font-bold">Acompanhamento R. Docs</CardTitle>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-full sm:w-[180px] bg-background border-amber-200">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 mt-4">
          <div className="p-4 border rounded-lg bg-card shadow-sm flex flex-col justify-center items-center text-center">
            <div className="text-4xl font-bold text-foreground mb-1">{metrics.total}</div>
            <div className="text-sm text-muted-foreground font-medium uppercase tracking-wide">
              Contratos fechados
            </div>
          </div>
          <div className="p-4 border border-emerald-100 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-lg shadow-sm flex flex-col justify-center items-center text-center">
            <div className="text-4xl font-bold text-emerald-600 dark:text-emerald-500 mb-1">
              {metrics.liberados}
            </div>
            <div className="text-sm text-emerald-800 dark:text-emerald-400 font-medium uppercase tracking-wide">
              Liberados para protocolo
            </div>
          </div>
          <div className="p-4 border border-red-100 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20 rounded-lg shadow-sm flex flex-col justify-center items-center text-center">
            <div className="text-4xl font-bold text-red-600 dark:text-red-500 mb-1">
              {metrics.pendentes}
            </div>
            <div className="text-sm text-red-800 dark:text-red-400 font-medium uppercase tracking-wide">
              Pendentes R. Docs
            </div>
          </div>
        </div>

        <div className="space-y-3 bg-muted/30 p-5 rounded-lg border border-border/40">
          <div className="flex justify-between text-xs font-bold text-muted-foreground">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
          <Progress value={metrics.rate} className="h-3 bg-muted overflow-hidden" />

          <div
            className={cn(
              'flex flex-col sm:flex-row sm:items-center gap-2 mt-4 font-semibold',
              isSuccess
                ? 'text-emerald-600 dark:text-emerald-500'
                : 'text-red-600 dark:text-red-500',
            )}
          >
            <div className="flex items-center gap-1.5">
              {isSuccess ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
              <span>
                {metrics.rate}% {isSuccess ? 'Acima da meta' : 'Abaixo da meta'}
              </span>
            </div>
            <span className="hidden sm:inline text-muted-foreground font-normal">|</span>
            <p
              className={cn(
                'text-sm font-medium',
                isSuccess
                  ? 'text-emerald-700 dark:text-emerald-400/90'
                  : 'text-red-700 dark:text-red-400/90',
              )}
            >
              {message}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
