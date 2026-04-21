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
    counts[new Date(d.data).getMonth()]++
  })

  const total = data.length
  const laudosRegistrados = data.filter((d) => d.laudo !== 'Aguardando').length

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {months.map((m, i) => {
        const isCurrent = i === currentMonth && year === currentYear
        const count = counts[i]
        return (
          <Card
            key={m}
            className={cn(
              'border transition-colors shadow-sm',
              count > 0
                ? 'bg-[#FAF7F2] border-[#E8DFD1] dark:bg-amber-500/5 dark:border-amber-500/20'
                : 'bg-card border-border/50',
              isCurrent && 'ring-1 ring-amber-400',
            )}
          >
            <CardContent className="p-5 flex flex-col justify-between h-[110px]">
              <span
                className={cn(
                  'text-[13px] font-bold tracking-wide uppercase text-left',
                  count > 0 ? 'text-muted-foreground' : 'text-muted-foreground/40',
                )}
              >
                {m}
              </span>
              <div className="flex items-baseline gap-1.5 mt-auto text-left">
                <span
                  className={cn(
                    'text-[28px] font-bold leading-none',
                    count > 0 ? 'text-[#D99A29] dark:text-amber-500' : 'text-muted-foreground/30',
                  )}
                >
                  {count > 0 ? count : '0'}
                </span>
                <span
                  className={cn(
                    'text-[12px] font-medium',
                    count > 0 ? 'text-muted-foreground' : 'text-muted-foreground/40',
                  )}
                >
                  {count > 0 ? 'perícias' : 'sem registro'}
                </span>
              </div>
            </CardContent>
          </Card>
        )
      })}

      <Card className="bg-[#FAF7F2] border-[#D99A29] dark:bg-amber-500/10 dark:border-amber-500/50 transition-colors shadow-sm">
        <CardContent className="p-5 flex flex-col justify-between h-[110px]">
          <span className="text-[13px] font-bold text-[#D99A29] dark:text-amber-500 tracking-wide uppercase text-left">
            TOTAL {year}
          </span>
          <div className="flex flex-col mt-auto text-left">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[32px] font-bold leading-none text-[#D99A29] dark:text-amber-500">
                {total}
              </span>
              <span className="text-[12px] text-[#D99A29] dark:text-amber-500 font-medium">
                perícias
              </span>
            </div>
            <span className="text-[11px] text-[#D99A29]/70 dark:text-amber-500/70 mt-1 font-medium">
              {laudosRegistrados} laudos registrados
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
