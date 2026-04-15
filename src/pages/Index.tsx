import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

// Mock Data
const mockData = {
  year: '2026',
  totalAno: 15,
  arquivadosExcluidos: 2,
  totalRegistrado: 17,
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

export default function Index() {
  const [year, setYear] = useState(mockData.year)

  return (
    <div className="mx-auto w-full max-w-7xl animate-fade-in-up">
      {/* Header Section */}
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Contratos Fechados
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">Registro de fechamentos mensais</p>
        </div>
        <div className="w-full sm:w-[180px]">
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="bg-card text-foreground shadow-sm">
              <SelectValue placeholder="Selecione o ano" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2026">2026</SelectItem>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2024">2024</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Totals Bar */}
      <Card className="mb-8 overflow-hidden bg-card shadow-subtle border-border/60">
        <div className="flex flex-col divide-y divide-border/60 sm:flex-row sm:divide-x sm:divide-y-0">
          <div className="flex flex-1 items-center justify-between p-6 sm:justify-start sm:gap-4">
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Total do ano
            </span>
            <span className="text-3xl font-bold text-emerald-500">{mockData.totalAno}</span>
          </div>
          <div className="flex flex-1 items-center justify-between p-6 sm:justify-start sm:gap-4">
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Arquivados excluídos
            </span>
            <span className="text-3xl font-bold text-red-500">{mockData.arquivadosExcluidos}</span>
          </div>
          <div className="flex flex-1 items-center justify-between p-6 sm:justify-start sm:gap-4">
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Total registrado
            </span>
            <span className="text-3xl font-bold text-foreground">{mockData.totalRegistrado}</span>
          </div>
        </div>
      </Card>

      {/* Summary Card */}
      <Card className="mb-8 border-none bg-primary text-primary-foreground shadow-elevation overflow-hidden relative">
        <div className="absolute top-0 right-0 p-12 opacity-10">
          <svg
            width="120"
            height="120"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        </div>
        <CardContent className="flex flex-col items-start justify-between p-8 sm:flex-row sm:items-center relative z-10">
          <div>
            <h2 className="font-serif text-3xl font-bold tracking-wide text-secondary md:text-5xl">
              TOTAL {year}: {mockData.totalAno}
            </h2>
            <p className="mt-2 text-primary-foreground/70 text-lg">
              ({mockData.arquivadosExcluidos} arquivados excluídos)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {mockData.months.map((month, index) => (
          <Card
            key={month.name}
            className={cn(
              'group relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-elevation border-border/60',
              'animate-fade-in-up',
              month.count > 0 ? 'bg-card' : 'bg-card/50',
            )}
            style={{ animationFillMode: 'both', animationDelay: `${index * 50}ms` }}
          >
            <CardContent className="p-6">
              <h3 className="mb-4 text-xl font-semibold tracking-wider text-muted-foreground">
                {month.name}
              </h3>
              <div className="flex items-baseline gap-2">
                <span
                  className={cn(
                    'text-4xl font-bold',
                    month.count > 0 ? 'text-foreground' : 'text-muted-foreground/40',
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
              <div className="absolute bottom-0 left-0 h-1 w-full bg-secondary/50 transform origin-left scale-x-0 transition-transform duration-300 group-hover:scale-x-100" />
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
