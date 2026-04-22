import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Megaphone } from 'lucide-react'

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
}: {
  contratos: any[]
  year: number
  month?: string
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

  const totalCampanha = yearContratos.filter(
    (c) => !isArchived(c) && c.origem === 'Campanha',
  ).length
  const totalParticular = yearContratos.filter(
    (c) => !isArchived(c) && c.origem === 'Particular',
  ).length
  const totalNaoClassificado = yearContratos.filter(
    (c) => !isArchived(c) && (!c.origem || c.origem === 'Não classificado'),
  ).length

  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const todayActive = yearContratos.filter(
    (c) => !isArchived(c) && c.dcontrato.startsWith(todayStr),
  ).length

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 lg:gap-6 mb-4">
        {monthlyCounts.map((month, index) => (
          <Card
            key={month.name}
            className={cn(
              'group relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-md border-border/60',
              'animate-fade-in-up',
              month.count > 0 ? 'bg-[#C9922A]/5 border-[#C9922A]/20' : 'bg-card/50 opacity-80',
            )}
            style={{ animationFillMode: 'both', animationDelay: `${index * 50}ms` }}
          >
            <CardContent className="p-5">
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

        <Card
          className="group relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-md bg-[#C9922A]/[0.08] border-[#C9922A]/25 border-t-[#C9922A] border-t-2 animate-fade-in-up"
          style={{ animationFillMode: 'both', animationDelay: '550ms' }}
        >
          <CardContent className="p-5">
            <h3 className="mb-2 text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
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
              <span className="text-[11px] font-medium text-muted-foreground">
                contratos fechados hoje
              </span>
            </div>
          </CardContent>
        </Card>

        <Card
          className="group relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-md bg-[#C9922A]/10 border-[#C9922A]/30 border-t-[#C9922A] border-t-2 animate-fade-in-up"
          style={{ animationFillMode: 'both', animationDelay: '600ms' }}
        >
          <CardContent className="p-5">
            <h3 className="mb-2 text-lg font-bold tracking-wider text-[#C9922A]">TOTAL {year}</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-[#C9922A]">{totalActive}</span>
              <span className="text-sm font-semibold text-[#C9922A]/80">ativos</span>
            </div>
            <p className="mt-2 text-[10px] font-normal text-muted-foreground">
              {totalCampanha} campanha / {totalParticular} particular / {totalNaoClassificado} não
              classificado
            </p>
            <p className="mt-1 text-[12px] font-medium text-[#C9922A]">
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
