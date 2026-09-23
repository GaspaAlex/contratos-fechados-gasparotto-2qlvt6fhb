import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { RDocsDashboard } from '@/components/dashboard/RDocsDashboard'

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
  year: number | string
  month?: string
  activeFilter?: string
}) {
  const isArchived = (c: any) => ARCHIVED_STATUSES.includes(c.status)

  const yearContratos = contratos.filter((c) => {
    if (!c.dcontrato) return false
    if (year === 'Todos os anos') return true
    return c.dcontrato.startsWith(year.toString())
  })

  const monthlyCounts = MONTHS.map((name, i) => {
    const monthStr = (i + 1).toString().padStart(2, '0')
    const monthContratos = yearContratos.filter((c) => {
      if (year === 'Todos os anos') {
        const parts = c.dcontrato.split('-')
        return parts.length >= 2 && parts[1] === monthStr
      }
      return c.dcontrato.startsWith(`${year}-${monthStr}`)
    })
    const activeContratos = monthContratos.filter((c) => !isArchived(c))
    const activeCount = activeContratos.length
    const campanhaCount = activeContratos.filter((c) => c.origem === 'Campanha').length
    const particularCount = activeContratos.filter((c) => c.origem === 'Particular').length
    const macohinCount = activeContratos.filter((c) => c.origem === 'Macohin').length
    const indicacaoMacohinCount = activeContratos.filter(
      (c) => c.origem === 'Indicação Macohin',
    ).length
    const totalMacohin = macohinCount + indicacaoMacohinCount

    return {
      name,
      count: activeCount,
      campanhaCount,
      particularCount,
      macohinCount,
      indicacaoMacohinCount,
      totalMacohin,
    }
  }).filter((m) => month === 'Todos os meses' || m.name === month)

  const totalActive = yearContratos.filter((c) => !isArchived(c)).length
  const totalArchived = yearContratos.filter((c) => isArchived(c)).length
  const totalRegistrado = yearContratos.length

  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const todayActiveContratos = yearContratos.filter(
    (c) => !isArchived(c) && c.dcontrato.startsWith(todayStr),
  )
  const todayActive = todayActiveContratos.length
  const todayCampanhaCount = todayActiveContratos.filter((c) => c.origem === 'Campanha').length
  const todayParticularCount = todayActiveContratos.filter((c) => c.origem === 'Particular').length
  const todayMacohinCount = todayActiveContratos.filter((c) => c.origem === 'Macohin').length
  const todayIndicacaoMacohinCount = todayActiveContratos.filter(
    (c) => c.origem === 'Indicação Macohin',
  ).length
  const todayTotalMacohin = todayMacohinCount + todayIndicacaoMacohinCount

  const totalActiveContratos = yearContratos.filter((c) => !isArchived(c))
  const totalCampanhaCount = totalActiveContratos.filter((c) => c.origem === 'Campanha').length
  const totalParticularCount = totalActiveContratos.filter((c) => c.origem === 'Particular').length
  const totalMacohinCount = totalActiveContratos.filter((c) => c.origem === 'Macohin').length
  const totalIndicacaoMacohinCount = totalActiveContratos.filter(
    (c) => c.origem === 'Indicação Macohin',
  ).length
  const totalTotalMacohin = totalMacohinCount + totalIndicacaoMacohinCount

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
              <h3 className="text-xs sm:text-sm font-bold tracking-wider text-muted-foreground uppercase mb-1">
                {month.name}
              </h3>

              <div className="flex items-baseline gap-1.5">
                <span
                  className={cn(
                    'text-3xl sm:text-4xl font-black leading-none tracking-tight',
                    month.count > 0 ? 'text-[#C9922A]' : 'text-muted-foreground/40',
                  )}
                >
                  {month.count}
                </span>
                <span
                  className={cn(
                    'text-xs font-medium',
                    month.count > 0 ? 'text-muted-foreground' : 'text-muted-foreground/40',
                  )}
                >
                  {month.count === 1
                    ? 'fechamento'
                    : month.count > 0
                      ? 'fechamentos'
                      : 'sem registro'}
                </span>
              </div>

              {month.count > 0 && (
                <div className="mt-2.5 space-y-2">
                  {/* Grade 2x2 das 4 origens */}
                  <div className="grid grid-cols-2 gap-1.5">
                    {/* Linha 1: Campanha | Particular */}
                    <div
                      className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium leading-tight min-w-0 text-foreground"
                      style={{
                        backgroundColor: 'rgba(82, 184, 110, 0.12)',
                      }}
                    >
                      <span className="font-extrabold text-[12px] shrink-0">
                        {month.campanhaCount}
                      </span>
                      <span className="truncate">Campanha</span>
                    </div>

                    <div
                      className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium leading-tight min-w-0 text-foreground"
                      style={{
                        backgroundColor: 'rgba(90, 159, 212, 0.12)',
                      }}
                    >
                      <span className="font-extrabold text-[12px] shrink-0">
                        {month.particularCount}
                      </span>
                      <span className="truncate">Particular</span>
                    </div>

                    {/* Linha 2: Macohin | Indicação Macohin */}
                    <div
                      className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium leading-tight min-w-0 text-foreground"
                      style={{
                        backgroundColor: 'rgba(139, 92, 246, 0.12)',
                      }}
                    >
                      <span className="font-extrabold text-[12px] shrink-0">
                        {month.macohinCount}
                      </span>
                      <span className="truncate">Macohin</span>
                    </div>

                    <div
                      className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium leading-tight min-w-0 text-foreground"
                      title={`${month.indicacaoMacohinCount} Indicação Macohin`}
                      style={{
                        backgroundColor: 'rgba(217, 119, 6, 0.12)',
                      }}
                    >
                      <span className="font-extrabold text-[12px] shrink-0">
                        {month.indicacaoMacohinCount}
                      </span>
                      <span className="truncate">Indicação Macohin</span>
                    </div>
                  </div>

                  {/* Linha divisória horizontal discreta */}
                  <div className="border-t border-border/40" />

                  {/* Área de destaque próprio para Total Macohin */}
                  <div
                    className="flex items-center justify-between rounded-md px-2.5 py-1.5 border"
                    style={{
                      backgroundColor: 'rgba(201, 146, 42, 0.08)',
                      borderColor: 'rgba(201, 146, 42, 0.22)',
                    }}
                  >
                    <span className="text-[11px] font-semibold text-foreground/80 tracking-tight">
                      Total Macohin
                    </span>
                    <span className="text-base font-black text-[#C9922A] leading-none">
                      {month.totalMacohin}
                    </span>
                  </div>
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
            <h3 className="text-xs sm:text-sm font-bold tracking-wider text-muted-foreground uppercase mb-1">
              HOJE
            </h3>
            <div className="flex items-baseline gap-1.5">
              <span
                className={cn(
                  'text-3xl sm:text-4xl font-black leading-none tracking-tight',
                  todayActive > 0 ? 'text-[#C9922A]' : 'text-muted-foreground/40',
                )}
              >
                {todayActive}
              </span>
              <span
                className={cn(
                  'text-xs font-medium',
                  todayActive > 0 ? 'text-muted-foreground' : 'text-muted-foreground/40',
                )}
              >
                {todayActive === 1 ? 'fechamento hoje' : 'fechamentos hoje'}
              </span>
            </div>

            <div className="mt-2.5 space-y-2">
              {/* Grade 2x2 das 4 origens */}
              <div className="grid grid-cols-2 gap-1.5">
                {/* Linha 1: Campanha | Particular */}
                <div
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium leading-tight min-w-0 text-foreground"
                  style={{
                    backgroundColor: 'rgba(82, 184, 110, 0.12)',
                  }}
                >
                  <span className="font-extrabold text-[12px] shrink-0">{todayCampanhaCount}</span>
                  <span className="truncate">Campanha</span>
                </div>

                <div
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium leading-tight min-w-0 text-foreground"
                  style={{
                    backgroundColor: 'rgba(90, 159, 212, 0.12)',
                  }}
                >
                  <span className="font-extrabold text-[12px] shrink-0">
                    {todayParticularCount}
                  </span>
                  <span className="truncate">Particular</span>
                </div>

                {/* Linha 2: Macohin | Indicação Macohin */}
                <div
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium leading-tight min-w-0 text-foreground"
                  style={{
                    backgroundColor: 'rgba(139, 92, 246, 0.12)',
                  }}
                >
                  <span className="font-extrabold text-[12px] shrink-0">{todayMacohinCount}</span>
                  <span className="truncate">Macohin</span>
                </div>

                <div
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium leading-tight min-w-0 text-foreground"
                  title={`${todayIndicacaoMacohinCount} Indicação Macohin`}
                  style={{
                    backgroundColor: 'rgba(217, 119, 6, 0.12)',
                  }}
                >
                  <span className="font-extrabold text-[12px] shrink-0">
                    {todayIndicacaoMacohinCount}
                  </span>
                  <span className="truncate">Indicação Macohin</span>
                </div>
              </div>

              {/* Linha divisória horizontal discreta */}
              <div className="border-t border-border/40" />

              {/* Área de destaque próprio para Total Macohin */}
              <div
                className="flex items-center justify-between rounded-md px-2.5 py-1.5 border"
                style={{
                  backgroundColor: 'rgba(201, 146, 42, 0.08)',
                  borderColor: 'rgba(201, 146, 42, 0.22)',
                }}
              >
                <span className="text-[11px] font-semibold text-foreground/80 tracking-tight">
                  Total Macohin
                </span>
                <span className="text-base font-black text-[#C9922A] leading-none">
                  {todayTotalMacohin}
                </span>
              </div>
            </div>
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
            <h3 className="text-xs sm:text-sm font-bold tracking-wider text-muted-foreground uppercase mb-1">
              {year === 'Todos os anos' ? 'TOTAL GERAL' : `TOTAL ${year}`}
            </h3>
            <div className="flex items-baseline gap-1.5">
              <span
                className={cn(
                  'text-3xl sm:text-4xl font-black leading-none tracking-tight',
                  totalActive > 0 ? 'text-[#C9922A]' : 'text-muted-foreground/40',
                )}
              >
                {totalActive}
              </span>
              <span
                className={cn(
                  'text-xs font-medium',
                  totalActive > 0 ? 'text-muted-foreground' : 'text-muted-foreground/40',
                )}
              >
                {totalActive === 1 ? 'ativo' : 'ativos'}
              </span>
            </div>

            {totalArchived > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 text-[10px] font-bold px-[6px] py-[1px] rounded-[10px]">
                  {totalArchived} arquivados
                </span>
              </div>
            )}

            <div className="mt-2.5 space-y-2">
              {/* Grade 2x2 das 4 origens */}
              <div className="grid grid-cols-2 gap-1.5">
                {/* Linha 1: Campanha | Particular */}
                <div
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium leading-tight min-w-0 text-foreground"
                  style={{
                    backgroundColor: 'rgba(82, 184, 110, 0.12)',
                  }}
                >
                  <span className="font-extrabold text-[12px] shrink-0">{totalCampanhaCount}</span>
                  <span className="truncate">Campanha</span>
                </div>

                <div
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium leading-tight min-w-0 text-foreground"
                  style={{
                    backgroundColor: 'rgba(90, 159, 212, 0.12)',
                  }}
                >
                  <span className="font-extrabold text-[12px] shrink-0">
                    {totalParticularCount}
                  </span>
                  <span className="truncate">Particular</span>
                </div>

                {/* Linha 2: Macohin | Indicação Macohin */}
                <div
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium leading-tight min-w-0 text-foreground"
                  style={{
                    backgroundColor: 'rgba(139, 92, 246, 0.12)',
                  }}
                >
                  <span className="font-extrabold text-[12px] shrink-0">{totalMacohinCount}</span>
                  <span className="truncate">Macohin</span>
                </div>

                <div
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium leading-tight min-w-0 text-foreground"
                  title={`${totalIndicacaoMacohinCount} Indicação Macohin`}
                  style={{
                    backgroundColor: 'rgba(217, 119, 6, 0.12)',
                  }}
                >
                  <span className="font-extrabold text-[12px] shrink-0">
                    {totalIndicacaoMacohinCount}
                  </span>
                  <span className="truncate">Indicação Macohin</span>
                </div>
              </div>

              {/* Linha divisória horizontal discreta */}
              <div className="border-t border-border/40" />

              {/* Área de destaque próprio para Total Macohin */}
              <div
                className="flex items-center justify-between rounded-md px-2.5 py-1.5 border"
                style={{
                  backgroundColor: 'rgba(201, 146, 42, 0.08)',
                  borderColor: 'rgba(201, 146, 42, 0.22)',
                }}
              >
                <span className="text-[11px] font-semibold text-foreground/80 tracking-tight">
                  Total Macohin
                </span>
                <span className="text-base font-black text-[#C9922A] leading-none">
                  {totalTotalMacohin}
                </span>
              </div>
            </div>
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
        {year === 'Todos os anos' ? 'Total (ativos):' : 'Total do ano (ativos):'}{' '}
        <span className="font-bold text-foreground">{totalActive}</span> &mdash; Arquivados
        excluídos: <span className="font-bold text-foreground">{totalArchived}</span> &mdash; Total
        registrado: <span className="font-bold text-foreground">{totalRegistrado}</span>
      </div>

      <RDocsDashboard
        contratos={contratos}
        year={year as any}
        month={month}
        activeFilter={activeFilter}
      />
    </div>
  )
}
