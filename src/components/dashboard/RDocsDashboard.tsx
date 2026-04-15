import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { CheckCircle2 } from 'lucide-react'

export function RDocsDashboard() {
  return (
    <Card
      className="mt-8 border-border/60 shadow-sm animate-fade-in-up"
      style={{ animationDelay: '100ms' }}
    >
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 gap-4">
        <CardTitle className="text-xl font-bold">Acompanhamento R. Docs por Mês</CardTitle>
        <Select defaultValue="MARÇO 2026">
          <SelectTrigger className="w-full sm:w-[180px] bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="MARÇO 2026">MARÇO 2026</SelectItem>
            <SelectItem value="FEVEREIRO 2026">FEVEREIRO 2026</SelectItem>
            <SelectItem value="JANEIRO 2026">JANEIRO 2026</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 mt-4">
          <div className="p-4 border rounded-lg bg-card shadow-sm flex flex-col justify-center items-center text-center">
            <div className="text-4xl font-bold text-foreground mb-1">2</div>
            <div className="text-sm text-muted-foreground font-medium uppercase tracking-wide">
              Contratos fechados
            </div>
          </div>
          <div className="p-4 border border-emerald-100 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-lg shadow-sm flex flex-col justify-center items-center text-center">
            <div className="text-4xl font-bold text-emerald-600 dark:text-emerald-500 mb-1">1</div>
            <div className="text-sm text-emerald-800 dark:text-emerald-400 font-medium uppercase tracking-wide">
              Liberados para protocolo 50%
            </div>
          </div>
          <div className="p-4 border border-red-100 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20 rounded-lg shadow-sm flex flex-col justify-center items-center text-center">
            <div className="text-4xl font-bold text-red-600 dark:text-red-500 mb-1">1</div>
            <div className="text-sm text-red-800 dark:text-red-400 font-medium uppercase tracking-wide">
              Pendentes R. Docs 50%
            </div>
          </div>
        </div>
        <div className="space-y-3 bg-muted/30 p-5 rounded-lg border border-border/40">
          <div className="flex justify-between text-xs font-bold text-muted-foreground">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
          <Progress value={50} className="h-3 bg-muted" />
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-4 text-emerald-600 dark:text-emerald-500 font-semibold">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-5 w-5" />
              <span>50% Acima da meta</span>
            </div>
            <span className="hidden sm:inline text-muted-foreground font-normal">|</span>
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400/90">
              Em MARÇO 2026, 50% dos contratos foram liberados – acima da média aceitável de 50%.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
