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
    <div className="space-y-4">
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
              <CardContent className="p-4 flex flex-col items-center justify-center text-center h-[100px]">
                <span className="text-[11px] font-semibold text-muted-foreground tracking-wider">
                  {m}
                </span>
                {count > 0 ? (
                  <>
                    <span className="text-[26px] font-bold mt-1 leading-none">{count}</span>
                    <span className="text-[11px] text-muted-foreground uppercase mt-1">
                      perícias
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-[22px] font-bold mt-1 text-muted-foreground/35 leading-none">
                      —
                    </span>
                    <span className="text-[11px] text-muted-foreground/35 uppercase mt-1">
                      sem registro
                    </span>
                  </>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card className="bg-amber-500/10 border-amber-500/30">
        <CardContent className="p-6 flex flex-col md:flex-row justify-between items-center">
          <div className="flex flex-col items-center md:items-start">
            <span className="text-[13px] font-bold tracking-widest text-amber-700 dark:text-amber-500">
              TOTAL {year}
            </span>
            <span className="text-[32px] font-bold text-amber-700 dark:text-amber-500 leading-none mt-1">
              {total}
            </span>
          </div>
          <div className="flex flex-col items-center md:items-end mt-4 md:mt-0 text-[13px] font-medium text-amber-800 dark:text-amber-500/80 gap-1">
            <span>Total do ano: {total}</span>
            <span>Laudos registrados: {laudosRegistrados}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
