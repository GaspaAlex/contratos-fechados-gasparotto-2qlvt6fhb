import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Pericia } from '@/services/pericias'

export function Dashboard({ data, year }: { data: Pericia[]; year: number }) {
  const months = [
    'JAN',
    'FEV',
    'MAR',
    'ABR',
    'MAI',
    'JUN',
    'JUL',
    'AGO',
    'SET',
    'OUT',
    'NOV',
    'DEZ',
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
              'border bg-card transition-colors',
              isCurrent && 'border-amber-400 bg-amber-500/5 shadow-sm',
            )}
          >
            <CardContent className="p-4 flex flex-col justify-between h-[100px]">
              <span className="text-[11px] font-semibold text-muted-foreground tracking-wider uppercase text-left">
                {m}
              </span>
              <div className="flex items-baseline gap-1.5 mt-auto text-left">
                {count > 0 ? (
                  <>
                    <span className="text-2xl font-bold leading-none text-foreground">{count}</span>
                    <span className="text-[11px] text-muted-foreground uppercase font-medium">
                      perícias
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-2xl font-bold leading-none text-muted-foreground/40">
                      —
                    </span>
                    <span className="text-[11px] text-muted-foreground/40 uppercase font-medium">
                      sem registro
                    </span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}

      <Card className="bg-amber-500/10 border-amber-500/30 transition-colors">
        <CardContent className="p-4 flex flex-col justify-between h-[100px]">
          <span className="text-[11px] font-semibold text-amber-700/80 dark:text-amber-500/80 tracking-wider uppercase text-left">
            TOTAL {year}
          </span>
          <div className="flex flex-col mt-auto text-left">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold leading-none text-amber-700 dark:text-amber-500">
                {total}
              </span>
              <span className="text-[11px] text-amber-700/80 dark:text-amber-500/80 uppercase font-medium">
                perícias
              </span>
            </div>
            <span className="text-[10px] text-amber-700/60 dark:text-amber-500/60 mt-0.5 font-medium">
              {laudosRegistrados} laudos registrados
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
