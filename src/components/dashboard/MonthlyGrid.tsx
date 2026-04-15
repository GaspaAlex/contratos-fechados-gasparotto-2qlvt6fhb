import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const mockData = {
  months: [
    { name: 'JAN', count: 10 },
    { name: 'FEV', count: 3 },
    { name: 'MAR', count: 2 },
    { name: 'ABR', count: 0 },
    { name: 'MAI', count: 0 },
    { name: 'JUN', count: 0 },
    { name: 'JUL', count: 0 },
    { name: 'AGO', count: 0 },
    { name: 'SET', count: 0 },
    { name: 'OUT', count: 0 },
    { name: 'NOV', count: 0 },
    { name: 'DEZ', count: 0 },
  ],
}

export function MonthlyGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 lg:gap-6">
      {mockData.months.map((month, index) => (
        <Card
          key={month.name}
          className={cn(
            'group relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-md border-border/60',
            'animate-fade-in-up',
            month.count > 0 ? 'bg-primary/5 border-primary/20' : 'bg-card/50',
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
                  month.count > 0 ? 'text-primary' : 'text-muted-foreground/40',
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
            <div className="absolute bottom-0 left-0 h-1 w-full bg-primary/60 transform origin-left scale-x-0 transition-transform duration-300 group-hover:scale-x-100" />
          )}
        </Card>
      ))}
    </div>
  )
}
