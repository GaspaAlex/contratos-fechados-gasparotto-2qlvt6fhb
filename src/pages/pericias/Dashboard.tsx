import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Pericia } from '@/services/pericias'

export function Dashboard({ data, year }: { data: Pericia[]; year: number }) {
  const months = [
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

  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()

  const counts = Array(12).fill(0)
  data.forEach((d) => {
    if (d.data) {
      counts[new Date(d.data).getMonth()]++
    }
  })

  const total = data.length
  const laudosRegistrados = data.filter((d) => d.laudo && d.laudo !== 'Aguardando').length

  return (
    <div className="space-y-3.5">
      {/* Grade de 12 Meses — Padrão Corporativo Contemporâneo (Grafite Premium 2.1) */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
        {months.map((m, i) => {
          const isCurrent = i === currentMonth && year === currentYear
          const count = counts[i]
          const hasData = count > 0

          return (
            <Card
              key={m}
              className={cn(
                'group relative h-full overflow-hidden transition-all duration-200 rounded-[10px] border shadow-xs',
                'animate-fade-in-up',
                hasData
                  ? 'border-[#E4E7EB] dark:border-border bg-white dark:bg-card hover:border-[#C9922A]/40 hover:shadow-sm'
                  : 'border-[#E4E7EB]/80 dark:border-border/60 bg-white/70 dark:bg-card/40 opacity-80',
                isCurrent && 'ring-1 ring-[#C9922A]/50 border-[#C9922A]/50 bg-amber-500/[0.02]',
              )}
              style={{ animationFillMode: 'both', animationDelay: `${i * 30}ms` }}
            >
              <CardContent className="p-3.5 sm:p-4 flex flex-col justify-between h-[105px]">
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span
                    className={cn(
                      'text-[11px] font-bold tracking-wider uppercase',
                      isCurrent
                        ? 'text-[#C9922A]'
                        : hasData
                          ? 'text-[#78818E] dark:text-muted-foreground'
                          : 'text-[#A0A7B5] dark:text-muted-foreground/50',
                    )}
                  >
                    {m}
                  </span>
                  {isCurrent && (
                    <span className="inline-flex items-center text-[9px] font-bold uppercase tracking-wider text-[#C9922A] bg-[#C9922A]/10 px-1.5 py-0.5 rounded">
                      Atual
                    </span>
                  )}
                </div>

                <div className="flex items-baseline gap-2 mt-auto">
                  <span
                    className={cn(
                      'text-2xl sm:text-3xl font-bold leading-none tracking-tight tabular-nums',
                      hasData
                        ? 'text-[#252B34] dark:text-foreground'
                        : 'text-[#A0A7B5] dark:text-muted-foreground/40',
                    )}
                  >
                    {count}
                  </span>
                  <span
                    className={cn(
                      'text-xs font-medium',
                      hasData
                        ? 'text-[#78818E] dark:text-muted-foreground'
                        : 'text-[#A0A7B5] dark:text-muted-foreground/40',
                    )}
                  >
                    {count === 1 ? 'perícia' : hasData ? 'perícias' : 'sem registro'}
                  </span>
                </div>
              </CardContent>
            </Card>
          )
        })}

        {/* Card TOTAL ANO — Destaque Executivo Grafite #22262E com Valores Dourados #D9A94A */}
        <Card
          className="relative overflow-hidden rounded-[10px] border border-[#2E3440] bg-[#22262E] text-white shadow-sm transition-all duration-200 col-span-2 sm:col-span-2 md:col-span-3 lg:col-span-4 animate-fade-in-up"
          style={{ animationFillMode: 'both', animationDelay: '380ms' }}
        >
          <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold tracking-wider text-[#9EA7B6] uppercase">
                  TOTAL {year}
                </span>
                <span className="inline-flex items-center bg-[#2B303C] text-[#D9A94A] text-[10px] font-semibold px-2 py-0.5 rounded-full border border-[#D9A94A]/20">
                  Consolidado
                </span>
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl sm:text-3xl font-bold leading-none tracking-tight text-[#D9A94A] tabular-nums">
                  {total}
                </span>
                <span className="text-xs font-medium text-[#A5ADB9]">
                  {total === 1 ? 'perícia registrada' : 'perícias registradas'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4 pt-3 sm:pt-0 border-t sm:border-t-0 sm:border-l border-[#2E3440] sm:pl-6">
              <div className="flex flex-col">
                <span className="text-[11px] text-[#A5ADB9] font-medium">Laudos Registrados</span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-lg sm:text-xl font-bold text-white tabular-nums">
                    {laudosRegistrados}
                  </span>
                  <span className="text-xs text-[#A5ADB9]">
                    {laudosRegistrados === 1 ? 'laudo registrado' : 'laudos registrados'}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
