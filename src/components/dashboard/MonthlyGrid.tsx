import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { RDocsDashboard } from '@/components/dashboard/RDocsDashboard'
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
    const archivedCount = monthContratos.filter((c) => isArchived(c)).length
    const activeCount = activeContratos.length
    const campanhaCount = activeContratos.filter((c) => c.origem === 'Campanha').length
    const particularCount = activeContratos.filter((c) => c.origem === 'Particular').length
    const macohinCount = activeContratos.filter((c) => c.origem === 'Macohin').length
    const totalMacohin = macohinCount

    return {
      name,
      count: activeCount,
      archivedCount,
      campanhaCount,
      particularCount,
      macohinCount,
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
  const todayTotalMacohin = todayMacohinCount

  const totalActiveContratos = yearContratos.filter((c) => !isArchived(c))
  const totalCampanhaCount = totalActiveContratos.filter((c) => c.origem === 'Campanha').length
  const totalParticularCount = totalActiveContratos.filter((c) => c.origem === 'Particular').length
  const totalMacohinCount = totalActiveContratos.filter((c) => c.origem === 'Macohin').length
  const totalTotalMacohin = totalMacohinCount

  return (
    <div className="space-y-4">
      {/* 12 Cards Mensais + Indicadores Hoje e Total */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {monthlyCounts.map((monthItem, index) => {
          const hasContracts = monthItem.count > 0
          return (
            <Card
              key={monthItem.name}
              className={cn(
                'group relative h-full overflow-hidden transition-all duration-200 rounded-[10px] border shadow-xs',
                'animate-fade-in-up',
                hasContracts
                  ? 'border-[#E4E7EB] dark:border-border bg-white dark:bg-card hover:border-[#C9922A]/40 hover:shadow-sm'
                  : 'border-[#E4E7EB]/80 dark:border-border/60 bg-white/70 dark:bg-card/40 opacity-75',
              )}
              style={{ animationFillMode: 'both', animationDelay: `${index * 35}ms` }}
            >
              <CardContent className="p-3.5 flex flex-col justify-between h-full">
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <h3 className="text-[11px] font-bold tracking-wider text-[#78818E] dark:text-muted-foreground uppercase">
                      {monthItem.name}
                    </h3>
                    {monthItem.archivedCount > 0 && (
                      <span className="inline-flex items-center bg-[#F5F6F8] text-[#78818E] dark:bg-muted dark:text-muted-foreground text-[10px] font-semibold px-2 py-0.5 rounded-full border border-[#E4E7EB] dark:border-border">
                        {monthItem.archivedCount} {monthItem.archivedCount === 1 ? 'arq.' : 'arq.'}
                      </span>
                    )}
                  </div>

                  <div className="flex items-baseline gap-2 mb-2">
                    <span
                      className={cn(
                        'text-2xl sm:text-3xl font-bold leading-none tracking-tight tabular-nums',
                        hasContracts
                          ? 'text-[#252B34] dark:text-foreground'
                          : 'text-[#A0A7B5] dark:text-muted-foreground/40',
                      )}
                    >
                      {monthItem.count}
                    </span>
                    <span
                      className={cn(
                        'text-xs font-medium',
                        hasContracts
                          ? 'text-[#78818E] dark:text-muted-foreground'
                          : 'text-[#A0A7B5] dark:text-muted-foreground/40',
                      )}
                    >
                      {monthItem.count === 1
                        ? 'fechamento'
                        : monthItem.count > 0
                          ? 'fechamentos'
                          : 'sem registro'}
                    </span>
                  </div>
                </div>

                {hasContracts ? (
                  <div className="mt-2 space-y-2 pt-2 border-t border-[#E4E7EB]/70 dark:border-border/70">
                    {/* Grade das 3 origens */}
                    <div className="grid grid-cols-3 gap-1.5">
                      {/* Campanha (Verde #3E8E5A) */}
                      <div className="flex items-center justify-between rounded-md px-1.5 py-1 text-[11px] font-medium leading-tight min-w-0 bg-[#3E8E5A]/10 text-[#252B34] dark:text-foreground border border-[#3E8E5A]/20">
                        <span className="truncate text-[9.5px] text-[#3E8E5A] font-semibold">
                          Campanha
                        </span>
                        <span className="font-bold text-xs shrink-0 tabular-nums text-[#3E8E5A]">
                          {monthItem.campanhaCount}
                        </span>
                      </div>

                      {/* Particular (Azul #4A7FA5) */}
                      <div className="flex items-center justify-between rounded-md px-1.5 py-1 text-[11px] font-medium leading-tight min-w-0 bg-[#4A7FA5]/10 text-[#252B34] dark:text-foreground border border-[#4A7FA5]/20">
                        <span className="truncate text-[9.5px] text-[#4A7FA5] font-semibold">
                          Particular
                        </span>
                        <span className="font-bold text-xs shrink-0 tabular-nums text-[#4A7FA5]">
                          {monthItem.particularCount}
                        </span>
                      </div>

                      {/* Macohin (Roxo #8A56AC) */}
                      <div className="flex items-center justify-between rounded-md px-1.5 py-1 text-[11px] font-medium leading-tight min-w-0 bg-[#8A56AC]/10 text-[#252B34] dark:text-foreground border border-[#8A56AC]/20">
                        <span className="truncate text-[9.5px] text-[#8A56AC] font-semibold">
                          Macohin
                        </span>
                        <span className="font-bold text-xs shrink-0 tabular-nums text-[#8A56AC]">
                          {monthItem.macohinCount}
                        </span>
                      </div>
                    </div>

                    {/* Destaque Próprio para Total Macohin */}
                    <div className="flex items-center justify-between rounded-md px-2.5 py-1 bg-[#8A56AC]/10 border border-[#8A56AC]/25">
                      <span className="text-[11px] font-semibold text-[#8A56AC] dark:text-purple-300 tracking-tight">
                        Total Macohin
                      </span>
                      <span className="text-sm font-bold text-[#8A56AC] dark:text-purple-300 leading-none tabular-nums">
                        {monthItem.totalMacohin}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 pt-2 border-t border-[#E4E7EB]/50 dark:border-border/50">
                    <p className="text-[11px] text-[#A0A7B5] dark:text-muted-foreground/60 italic">
                      Nenhum fechamento registrado
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}

        {/* CARD HOJE — Estilo Corporativo com Borda Sutil e Hierarquia Refinada */}
        <Card
          className={cn(
            'group relative h-full overflow-hidden transition-all duration-200 rounded-[10px] border shadow-xs',
            'animate-fade-in-up',
            todayActive > 0
              ? 'border-[#C9922A]/40 bg-white dark:bg-card shadow-sm'
              : 'border-[#E4E7EB] dark:border-border bg-white dark:bg-card',
          )}
          style={{ animationFillMode: 'both', animationDelay: '500ms' }}
        >
          <CardContent className="p-3.5 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <span className="text-[11px] font-bold tracking-wider text-[#C9922A] uppercase">
                  HOJE
                </span>
                <span className="text-[10px] font-medium text-[#78818E] dark:text-muted-foreground">
                  Tempo real
                </span>
              </div>

              <div className="flex items-baseline gap-2 mb-2">
                <span
                  className={cn(
                    'text-2xl sm:text-3xl font-bold leading-none tracking-tight tabular-nums',
                    todayActive > 0
                      ? 'text-[#252B34] dark:text-foreground'
                      : 'text-[#A0A7B5] dark:text-muted-foreground/40',
                  )}
                >
                  {todayActive}
                </span>
                <span className="text-xs font-medium text-[#78818E] dark:text-muted-foreground">
                  {todayActive === 1 ? 'fechamento hoje' : 'fechamentos hoje'}
                </span>
              </div>
            </div>

            <div className="mt-2 space-y-2 pt-2 border-t border-[#E4E7EB]/70 dark:border-border/70">
              <div className="grid grid-cols-3 gap-1.5">
                <div className="flex items-center justify-between rounded-md px-1.5 py-1 text-[11px] font-medium leading-tight min-w-0 bg-[#3E8E5A]/10 text-[#252B34] dark:text-foreground border border-[#3E8E5A]/20">
                  <span className="truncate text-[9.5px] text-[#3E8E5A] font-semibold">
                    Campanha
                  </span>
                  <span className="font-bold text-xs shrink-0 tabular-nums text-[#3E8E5A]">
                    {todayCampanhaCount}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-md px-1.5 py-1 text-[11px] font-medium leading-tight min-w-0 bg-[#4A7FA5]/10 text-[#252B34] dark:text-foreground border border-[#4A7FA5]/20">
                  <span className="truncate text-[9.5px] text-[#4A7FA5] font-semibold">
                    Particular
                  </span>
                  <span className="font-bold text-xs shrink-0 tabular-nums text-[#4A7FA5]">
                    {todayParticularCount}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-md px-1.5 py-1 text-[11px] font-medium leading-tight min-w-0 bg-[#8A56AC]/10 text-[#252B34] dark:text-foreground border border-[#8A56AC]/20">
                  <span className="truncate text-[9.5px] text-[#8A56AC] font-semibold">
                    Macohin
                  </span>
                  <span className="font-bold text-xs shrink-0 tabular-nums text-[#8A56AC]">
                    {todayMacohinCount}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-md px-2.5 py-1 bg-[#8A56AC]/10 border border-[#8A56AC]/25">
                <span className="text-[11px] font-semibold text-[#8A56AC] dark:text-purple-300 tracking-tight">
                  Total Macohin
                </span>
                <span className="text-sm font-bold text-[#8A56AC] dark:text-purple-300 leading-none tabular-nums">
                  {todayTotalMacohin}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CARD TOTAL DO ANO / GERAL — Destaque Executivo Grafite #22262E com Valores Dourados #D9A94A */}
        <Card
          className="relative overflow-hidden rounded-[10px] border border-[#2E3440] bg-[#22262E] text-white shadow-sm animate-fade-in-up"
          style={{ animationFillMode: 'both', animationDelay: '550ms' }}
        >
          <CardContent className="p-3.5 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <h3 className="text-[11px] font-bold tracking-wider text-[#9EA7B6] uppercase">
                  {year === 'Todos os anos' ? 'TOTAL GERAL' : `TOTAL ${year}`}
                </h3>
                {totalArchived > 0 && (
                  <span className="inline-flex items-center bg-[#2B303C] text-[#D9A94A] text-[10px] font-semibold px-2 py-0.5 rounded-full border border-[#D9A94A]/20">
                    {totalArchived} arq.
                  </span>
                )}
              </div>

              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-2xl sm:text-3xl font-bold leading-none tracking-tight text-[#D9A94A] tabular-nums">
                  {totalActive}
                </span>
                <span className="text-xs font-medium text-[#A5ADB9]">
                  {totalActive === 1 ? 'contrato ativo' : 'contratos ativos'}
                </span>
              </div>
            </div>

            <div className="mt-2 space-y-2 pt-2 border-t border-[#2E3440]">
              <div className="grid grid-cols-3 gap-1.5">
                <div className="flex items-center justify-between rounded-md px-1.5 py-1 text-[11px] font-medium leading-tight min-w-0 bg-[#2B303C] text-white border border-[#3E8E5A]/30">
                  <span className="truncate text-[9.5px] text-[#52B86E] font-semibold">
                    Campanha
                  </span>
                  <span className="font-bold text-xs shrink-0 tabular-nums text-[#52B86E]">
                    {totalCampanhaCount}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-md px-1.5 py-1 text-[11px] font-medium leading-tight min-w-0 bg-[#2B303C] text-white border border-[#5A9FD4]/30">
                  <span className="truncate text-[9.5px] text-[#5A9FD4] font-semibold">
                    Particular
                  </span>
                  <span className="font-bold text-xs shrink-0 tabular-nums text-[#5A9FD4]">
                    {totalParticularCount}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-md px-1.5 py-1 text-[11px] font-medium leading-tight min-w-0 bg-[#2B303C] text-white border border-[#8B5CF6]/30">
                  <span className="truncate text-[9.5px] text-[#A78BFA] font-semibold">
                    Macohin
                  </span>
                  <span className="font-bold text-xs shrink-0 tabular-nums text-[#A78BFA]">
                    {totalMacohinCount}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-md px-2.5 py-1 bg-[#2B303C] border border-[#8B5CF6]/40">
                <span className="text-[11px] font-semibold text-[#A78BFA] tracking-tight">
                  Total Macohin
                </span>
                <span className="text-sm font-bold text-[#A78BFA] leading-none tabular-nums">
                  {totalTotalMacohin}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Faixa Sóbria de Auditoria e Resumo Geral */}
      <div
        className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-[#78818E] dark:text-muted-foreground animate-fade-in-up"
        style={{ animationDelay: '600ms' }}
      >
        <div>
          <span>Escopo exibido: </span>
          <strong className="text-[#252B34] dark:text-foreground font-semibold">
            {month === 'Todos os meses' ? 'Todos os meses' : month} / {year}
          </strong>
        </div>
        <div className="flex items-center gap-3 tabular-nums">
          <span>
            Ativos:{' '}
            <strong className="text-[#252B34] dark:text-foreground font-semibold">
              {totalActive}
            </strong>
          </span>
          <span className="text-[#A0A7B5]">&bull;</span>
          <span>
            Arquivados:{' '}
            <strong className="text-[#78818E] dark:text-muted-foreground font-medium">
              {totalArchived}
            </strong>
          </span>
          <span className="text-[#A0A7B5]">&bull;</span>
          <span>
            Total cadastrado:{' '}
            <strong className="text-[#252B34] dark:text-foreground font-semibold">
              {totalRegistrado}
            </strong>
          </span>
        </div>
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
