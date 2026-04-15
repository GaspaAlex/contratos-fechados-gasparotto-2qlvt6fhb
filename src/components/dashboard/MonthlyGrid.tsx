import { Card, CardContent } from '@/components/ui/card'
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

export function MonthlyGrid({ contratos, year }: { contratos: any[]; year: number }) {
  const isArchived = (c: any) => ARCHIVED_STATUSES.includes(c.status)

  const yearContratos = contratos.filter((c) => {
    if (!c.dcontrato) return false
    return c.dcontrato.startsWith(year.toString())
  })

  const monthlyCounts = MONTHS.map((name, i) => {
    const monthStr = (i + 1).toString().padStart(2, '0')
    const monthContratos = yearContratos.filter((c) =>
      c.dcontrato.startsWith(`${year}-${monthStr}`),
    )
    const activeCount = monthContratos.filter((c) => !isArchived(c)).length
    return { name, count: activeCount }
  })

  const totalActive = yearContratos.filter((c) => !isArchived(c)).length
  const totalArchived = yearContratos.filter((c) => isArchived(c)).length
  const totalRegistrado = yearContratos.length

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 lg:gap-6 mb-4">
        {monthlyCounts.map((month, index) => (
          <Card
            key={month.name}
            className={cn(
              'group relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-md border-border/60',
              'animate-fade-in-up',
              month.count > 0 ? 'bg-amber-500/5 border-amber-500/20' : 'bg-card/50 opacity-80',
            )}
            style={{ animationFillMode: 'both', animationDelay: `${index * 50}ms` }}
          >
            <CardContent className="p-5">
              <h3 className="mb-2 text-lg font-semibold tracking-wider text-muted-foreground">
                {month.name}
              </h3>
              <div className="flex items-baseline gap-2">
                <span
                  className={cn(
                    'text-4xl font-bold',
                    month.count > 0
                      ? 'text-amber-600 dark:text-amber-500'
                      : 'text-muted-foreground/40',
                  )}
                >
                  {month.count}
                </span>
                <span
                  className={cn(
                    'text-sm font-medium',
                    month.count > 0 ? 'text-muted-foreground' : 'text-muted-foreground/40',
                  )}
                >
                  {month.count === 1
                    ? 'fechamento'
                    : month.count > 0
                      ? 'fechamentos'
                      : 'Sem registro'}
                </span>
              </div>
            </CardContent>
            {month.count > 0 && (
              <div className="absolute bottom-0 left-0 h-1 w-full bg-amber-500/60 transform origin-left scale-x-0 transition-transform duration-300 group-hover:scale-x-100" />
            )}
          </Card>
        ))}

        <Card
          className="group relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-md bg-amber-500/10 border-amber-500/30 border-t-amber-500 border-t-2 animate-fade-in-up"
          style={{ animationFillMode: 'both', animationDelay: '600ms' }}
        >
          <CardContent className="p-5">
            <h3 className="mb-2 text-lg font-bold tracking-wider text-amber-700 dark:text-amber-400">
              TOTAL {year}
            </h3>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-amber-700 dark:text-amber-500">
                {totalActive}
              </span>
              <span className="text-sm font-semibold text-amber-600/80 dark:text-amber-400/80">
                ativos
              </span>
            </div>
            <p className="mt-2 text-xs font-medium text-amber-700/60 dark:text-amber-400/60">
              {totalArchived} arquivados excluídos
            </p>
          </CardContent>
        </Card>
      </div>

      <div
        className="text-center sm:text-right text-sm text-muted-foreground font-medium mb-8 animate-fade-in-up"
        style={{ animationDelay: '650ms' }}
      >
        Total do ano (ativos): <span className="font-bold text-foreground">{totalActive}</span>{' '}
        &mdash; Arquivados excluídos:{' '}
        <span className="font-bold text-foreground">{totalArchived}</span> &mdash; Total registrado:{' '}
        <span className="font-bold text-foreground">{totalRegistrado}</span>
      </div>
    </div>
  )
}
