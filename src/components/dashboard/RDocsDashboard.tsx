import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { CheckCircle2, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { isArchived } from '@/lib/archivedStatuses'

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

export function RDocsDashboard({
  contratos = [],
  year,
  month,
  beneficio = 'Todos os benefícios',
  activeFilter: propActiveFilter,
}: {
  contratos: any[]
  year: number
  month: string
  beneficio?: string
  activeFilter?: string
}) {
  const activeFilter = propActiveFilter ?? 'Todos'

  const metrics = useMemo(() => {
    let periodContratos = contratos.filter(
      (c) => c.dcontrato && c.dcontrato.startsWith(year.toString()) && !isArchived(c.status),
    )

    if (activeFilter === 'Campanha') {
      periodContratos = periodContratos.filter((c) => c.origem === 'Campanha')
    } else if (activeFilter === 'Particular') {
      periodContratos = periodContratos.filter((c) => c.origem === 'Particular')
    } else if (activeFilter === 'Macohin') {
      periodContratos = periodContratos.filter((c) => c.origem === 'Macohin')
    } else if (activeFilter === 'Indicação Macohin') {
      periodContratos = periodContratos.filter((c) => c.origem === 'Indicação Macohin')
    }

    if (month !== 'Todos os meses') {
      const monthIndex = MONTHS.indexOf(month)
      const monthStr = (monthIndex + 1).toString().padStart(2, '0')
      const prefix = `${year}-${monthStr}`
      periodContratos = periodContratos.filter((c) => c.dcontrato.startsWith(prefix))
    }

    if (beneficio && beneficio !== 'Todos os benefícios') {
      periodContratos = periodContratos.filter(
        (c) => (c.beneficio || '').trim().toLowerCase() === beneficio.trim().toLowerCase(),
      )
    }

    const total = periodContratos.length
    const liberados = periodContratos.filter((c) => c.status !== 'R. Docs').length
    const pendentes = periodContratos.filter((c) => c.status === 'R. Docs').length
    const rate = total > 0 ? Math.round((liberados / total) * 100) : 0

    return { total, liberados, pendentes, rate }
  }, [contratos, month, year, beneficio, activeFilter])

  const isSuccess = metrics.rate >= 50

  const displayMonth =
    month !== 'Todos os meses' ? month.charAt(0).toUpperCase() + month.slice(1).toLowerCase() : ''

  const isOriginSelected =
    activeFilter === 'Campanha' ||
    activeFilter === 'Particular' ||
    activeFilter === 'Macohin' ||
    activeFilter === 'Indicação Macohin'

  let subtitle = ''
  if (!displayMonth && !isOriginSelected) {
    subtitle = '(Todos os meses)'
  } else if (displayMonth && !isOriginSelected) {
    subtitle = `(${displayMonth})`
  } else if (!displayMonth && isOriginSelected) {
    subtitle = `(${activeFilter})`
  } else if (displayMonth && isOriginSelected) {
    subtitle = `(${displayMonth} · ${activeFilter})`
  }

  const formattedMonthLower = displayMonth ? displayMonth.toLowerCase() : ''
  const label = month === 'Todos os meses' ? `Em ${year}` : `Em ${formattedMonthLower}/${year}`
  const message = isSuccess
    ? `${label}, ${metrics.rate}% dos contratos foram liberados — acima da média aceitável de 50%.`
    : `${label}, ${metrics.rate}% dos contratos foram liberados — abaixo da meta de 50%.`

  return (
    <Card
      className="mt-6 rounded-[10px] border border-[#E4E7EB] dark:border-border bg-white dark:bg-card shadow-sm animate-fade-in-up"
      style={{ animationDelay: '100ms' }}
    >
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 gap-2 border-b border-[#E4E7EB]/70 dark:border-border/70">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-[#C9922A]" />
          <CardTitle className="text-base sm:text-lg font-bold text-[#252B34] dark:text-foreground">
            Acompanhamento de Fechamentos
          </CardTitle>
          {subtitle && (
            <span className="text-xs text-[#78818E] dark:text-muted-foreground font-medium">
              {subtitle}
            </span>
          )}
        </div>
        <span className="text-xs text-[#78818E] dark:text-muted-foreground">
          Meta de eficiência:{' '}
          <strong className="text-[#252B34] dark:text-foreground">&ge; 50%</strong> liberados
        </span>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-5">
          {/* Card Ativos */}
          <div className="p-4 border border-[#E4E7EB] dark:border-border rounded-[10px] bg-white dark:bg-card shadow-xs flex flex-col justify-center items-center text-center">
            <div className="text-3xl sm:text-4xl font-bold text-[#252B34] dark:text-foreground mb-1 tabular-nums">
              {metrics.total}
            </div>
            <div className="text-[11px] text-[#78818E] dark:text-muted-foreground font-semibold uppercase tracking-wider">
              Contratos ativos
            </div>
          </div>

          {/* Card Liberados */}
          <div className="p-4 border border-[#3E8E5A]/25 rounded-[10px] bg-[#3E8E5A]/[0.06] dark:bg-[#3E8E5A]/10 shadow-xs flex flex-col justify-center items-center text-center">
            <div className="text-3xl sm:text-4xl font-bold text-[#3E8E5A] dark:text-green-400 mb-1 tabular-nums">
              {metrics.liberados}
            </div>
            <div className="text-[11px] text-[#3E8E5A] dark:text-green-400 font-semibold uppercase tracking-wider">
              Liberados para protocolo
            </div>
          </div>

          {/* Card Pendentes Faltando Docs */}
          <div className="p-4 border border-[#B4453C]/25 rounded-[10px] bg-[#B4453C]/[0.06] dark:bg-[#B4453C]/10 shadow-xs flex flex-col justify-center items-center text-center">
            <div className="text-3xl sm:text-4xl font-bold text-[#B4453C] dark:text-red-400 mb-1 tabular-nums">
              {metrics.pendentes}
            </div>
            <div className="text-[11px] text-[#B4453C] dark:text-red-400 font-semibold uppercase tracking-wider">
              Pendentes Faltando Docs
            </div>
          </div>
        </div>

        {/* Barra de Progresso e Meta Semântica */}
        <div className="space-y-3 bg-[#F5F6F8] dark:bg-muted/30 p-4 sm:p-5 rounded-[10px] border border-[#E4E7EB] dark:border-border">
          <div className="flex justify-between text-[11px] font-semibold text-[#78818E] dark:text-muted-foreground">
            <span>0%</span>
            <span className="text-[#C9922A] font-bold">Meta 50%</span>
            <span>100%</span>
          </div>
          <div className="relative w-full h-2.5 bg-white dark:bg-muted rounded-full overflow-hidden border border-[#E4E7EB]/80 dark:border-border">
            <div
              className={cn(
                'h-full transition-all duration-500 rounded-full',
                isSuccess ? 'bg-[#3E8E5A]' : 'bg-[#B4453C]',
              )}
              style={{ width: `${Math.min(100, Math.max(0, metrics.rate))}%` }}
            />
          </div>

          <div
            className={cn(
              'flex flex-col sm:flex-row sm:items-center gap-2 mt-3 font-semibold text-xs sm:text-sm',
              isSuccess ? 'text-[#3E8E5A] dark:text-green-400' : 'text-[#B4453C] dark:text-red-400',
            )}
          >
            <div className="flex items-center gap-1.5 shrink-0">
              {isSuccess ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
              <span className="tabular-nums">
                {metrics.rate}% {isSuccess ? 'Acima da meta' : 'Abaixo da meta'}
              </span>
            </div>
            <span className="hidden sm:inline text-[#A0A7B5] font-normal">&bull;</span>
            <p className="text-xs sm:text-sm font-medium text-[#252B34] dark:text-foreground">
              {message}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
