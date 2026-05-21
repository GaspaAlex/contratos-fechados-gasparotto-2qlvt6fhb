import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Megaphone } from 'lucide-react'
import { RDocsDashboard } from './RDocsDashboard'

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

export function MonthlyGrid({
  contratos = [],
  year,
  month = 'Todos os meses',
  activeFilter,
}: {
  contratos: any[]
  year: number
  month?: string
  activeFilter?: string
}) {
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
    const activeContratos = monthContratos.filter((c) => !isArchived(c))
    const activeCount = activeContratos.length
    const campanhaCount = activeContratos.filter((c) => c.origem === 'Campanha').length
    const particularCount = activeContratos.filter((c) => c.origem === 'Particular').length

    return { name, count: activeCount, campanhaCount, particularCount }
  }).filter((m) => month === 'Todos os meses' || m.name === month)

  const totalActive = yearContratos.filter((c) => !isArchived(c)).length
  const totalArchived = yearContratos.filter((c) => isArchived(c)).length
  const totalRegistrado = yearContratos.length

  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const todayActive = yearContratos.filter(
    (c) => !isArchived(c) && c.dcontrato.startsWith(todayStr),
  ).length

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6 lg:gap-4 mb-6">
        {monthlyCounts.map((month, index) => (
          <Card
            key={month.name}
            className={cn(
              'group relative h-full overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-md border-border/60',
              'animate-fade-in-up',
              month.count > 0 ? 'bg-[#C9922A]/5 border-[#C9922A]/20' : 'bg-card/50 opacity-80',
            )}
            style={{ animationFillMode: 'both', animationDelay: `${index * 50}ms` }}
          >
            <CardContent className="p-3">
              <h3 className="mb-2 text-lg font-bold tracking-wider text-muted-foreground">
                {month.name}
              </h3>
              <div className="flex items-baseline gap-2">
                <span
                  className={cn(
                    'text-4xl font-black',
                    month.count > 0 ? 'text-[#C9922A]' : 'text-muted-foreground/40',
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
                      : 'sem registro'}
                </span>{' '}
              </div>
              {month.count > 0 && (month.campanhaCount > 0 || month.particularCount > 0) && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {month.campanhaCount > 0 && (
                    <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 text-[10px] font-bold px-[6px] py-[1px] rounded-[10px]">
                      <Megaphone className="w-3 h-3" /> {month.campanhaCount} campanha
                    </span>
                  )}
                  {month.particularCount > 0 && (
                    <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 text-[10px] font-bold px-[6px] py-[1px] rounded-[10px]">
                      {month.particularCount} particular
                    </span>
                  )}
                </div>
              )}
            </CardContent>
            {month.count > 0 && (
              <div className="absolute bottom-0 left-0 h-1 w-full bg-[#C9922A] transform origin-left scale-x-0 transition-transform duration-300 group-hover:scale-x-100" />
            )}
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6 lg:gap-4 mb-4 w-full">
        <Card
          className={cn(
            'group relative h-full overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-md border-border/60 animate-fade-in-up',
            todayActive > 0 ? 'bg-[#C9922A]/5 border-[#C9922A]/20' : 'bg-card/50 opacity-80',
          )}
          style={{ animationFillMode: 'both', animationDelay: '550ms' }}
        >
          <CardContent className="p-3">
            <h3 className="mb-2 text-lg font-bold tracking-wider text-muted-foreground uppercase">
              HOJE
            </h3>
            <div className="flex items-baseline gap-2">
              <span
                className={cn(
                  'text-4xl font-black',
                  todayActive > 0 ? 'text-[#C9922A]' : 'text-muted-foreground/40',
                )}
              >
                {todayActive}
              </span>
              <span
                className={cn(
                  'text-sm font-medium',
                  todayActive > 0 ? 'text-foreground' : 'text-muted-foreground/40',
                )}
              >
                fechados hoje
              </span>
            </div>
            {todayActive > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 text-[10px] font-bold px-[6px] py-[1px] rounded-[10px]">
                  ativos
                </span>
              </div>
            )}
            {todayActive > 0 && (
              <div className="absolute bottom-0 left-0 h-1 w-full bg-[#C9922A] transform origin-left scale-x-0 transition-transform duration-300 group-hover:scale-x-100" />
            )}
          </CardContent>
        </Card>

        <Card
          className={cn(
            'group relative h-full overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-md border-border/60 animate-fade-in-up',
            totalActive > 0 ? 'bg-[#C9922A]/5 border-[#C9922A]/20' : 'bg-card/50 opacity-80',
          )}
          style={{ animationFillMode: 'both', animationDelay: '600ms' }}
        >
          <CardContent className="p-3">
            <h3 className="mb-2 text-lg font-bold tracking-wider text-muted-foreground uppercase">
              TOTAL {year}
            </h3>
            <div className="flex items-baseline gap-2">
              <span
                className={cn(
                  'text-4xl font-black',
                  totalActive > 0 ? 'text-[#C9922A]' : 'text-muted-foreground/40',
                )}
              >
                {totalActive}
              </span>
              <span
                className={cn(
                  'text-sm font-medium',
                  totalActive > 0 ? 'text-foreground' : 'text-muted-foreground/40',
                )}
              >
                ativos
              </span>
            </div>
            {(totalActive > 0 || totalArchived > 0) && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {totalActive > 0 && (
                  <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 text-[10px] font-bold px-[6px] py-[1px] rounded-[10px]">
                    {totalActive} ativos
                  </span>
                )}
                {totalArchived > 0 && (
                  <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 text-[10px] font-bold px-[6px] py-[1px] rounded-[10px]">
                    {totalArchived} arquivados
                  </span>
                )}
              </div>
            )}
            {totalActive > 0 && (
              <div className="absolute bottom-0 left-0 h-1 w-full bg-[#C9922A] transform origin-left scale-x-0 transition-transform duration-300 group-hover:scale-x-100" />
            )}
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

      <RDocsDashboard contratos={contratos} year={year} month={month} activeFilter={activeFilter} />
    </div>
  )
}
