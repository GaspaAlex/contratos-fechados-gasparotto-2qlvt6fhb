import { Card, CardContent } from '@/components/ui/card'
import { Pericia } from '@/services/pericias'
import { CalendarClock, UserCheck, UserX, Award } from 'lucide-react'

export function Summary({ data }: { data: Pericia[] }) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const aRealizar = data.filter((d) => new Date(d.data) > today).length
  const compareceram = data.filter((d) => d.compareceu === 'Sim').length
  const faltaram = data.filter((d) => d.compareceu === 'Não').length

  const favoraveis = data.filter((d) => d.laudo === 'Favorável').length
  const desfavoraveis = data.filter((d) => d.laudo === 'Desfavorável').length
  const totalLaudos = favoraveis + desfavoraveis
  const taxaProcedencia = totalLaudos > 0 ? Math.round((favoraveis / totalLaudos) * 100) : null

  return (
    <div className="space-y-4">
      {/* Linha de Indicadores Estratégicos (KPIs) — Grafite Premium 2.1 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* A Realizar */}
        <Card className="rounded-[10px] border border-[#E4E7EB] dark:border-border bg-white dark:bg-card shadow-xs hover:border-[#C77E1E]/40 transition-all duration-200">
          <CardContent className="p-4 flex flex-col justify-between h-[100px]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold tracking-wider text-[#78818E] dark:text-muted-foreground uppercase">
                A Realizar
              </span>
              <div className="h-7 w-7 rounded-md bg-[#C77E1E]/10 flex items-center justify-center shrink-0">
                <CalendarClock className="h-3.5 w-3.5 text-[#C77E1E]" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 mt-auto">
              <span className="text-2xl sm:text-3xl font-bold leading-none tracking-tight text-[#C77E1E] tabular-nums">
                {aRealizar}
              </span>
              <span className="text-xs font-medium text-[#78818E] dark:text-muted-foreground">
                {aRealizar === 1 ? 'pendente' : 'pendentes'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Compareceram */}
        <Card className="rounded-[10px] border border-[#E4E7EB] dark:border-border bg-white dark:bg-card shadow-xs hover:border-[#3E8E5A]/40 transition-all duration-200">
          <CardContent className="p-4 flex flex-col justify-between h-[100px]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold tracking-wider text-[#78818E] dark:text-muted-foreground uppercase">
                Compareceram
              </span>
              <div className="h-7 w-7 rounded-md bg-[#3E8E5A]/10 flex items-center justify-center shrink-0">
                <UserCheck className="h-3.5 w-3.5 text-[#3E8E5A]" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 mt-auto">
              <span className="text-2xl sm:text-3xl font-bold leading-none tracking-tight text-[#3E8E5A] tabular-nums">
                {compareceram}
              </span>
              <span className="text-xs font-medium text-[#78818E] dark:text-muted-foreground">
                {compareceram === 1 ? 'cliente' : 'clientes'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Faltaram */}
        <Card className="rounded-[10px] border border-[#E4E7EB] dark:border-border bg-white dark:bg-card shadow-xs hover:border-[#B4453C]/40 transition-all duration-200">
          <CardContent className="p-4 flex flex-col justify-between h-[100px]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold tracking-wider text-[#78818E] dark:text-muted-foreground uppercase">
                Faltaram
              </span>
              <div className="h-7 w-7 rounded-md bg-[#B4453C]/10 flex items-center justify-center shrink-0">
                <UserX className="h-3.5 w-3.5 text-[#B4453C]" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 mt-auto">
              <span className="text-2xl sm:text-3xl font-bold leading-none tracking-tight text-[#B4453C] tabular-nums">
                {faltaram}
              </span>
              <span className="text-xs font-medium text-[#78818E] dark:text-muted-foreground">
                {faltaram === 1 ? 'ausência' : 'ausências'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Taxa de Procedência */}
        <Card className="rounded-[10px] border border-[#E4E7EB] dark:border-border bg-white dark:bg-card shadow-xs hover:border-[#4A7FA5]/40 transition-all duration-200">
          <CardContent className="p-4 flex flex-col justify-between h-[100px]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold tracking-wider text-[#78818E] dark:text-muted-foreground uppercase">
                Taxa de Procedência
              </span>
              <div className="h-7 w-7 rounded-md bg-[#4A7FA5]/10 flex items-center justify-center shrink-0">
                <Award className="h-3.5 w-3.5 text-[#4A7FA5]" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 mt-auto">
              <span className="text-2xl sm:text-3xl font-bold leading-none tracking-tight text-[#4A7FA5] tabular-nums">
                {taxaProcedencia !== null ? `${taxaProcedencia}%` : '—'}
              </span>
              <span className="text-xs font-medium text-[#78818E] dark:text-muted-foreground">
                laudos favoráveis
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Proporção de Laudos — Card Corporativo com Barra Limpa */}
      <Card className="rounded-[10px] border border-[#E4E7EB] dark:border-border bg-white dark:bg-card shadow-xs">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-bold tracking-tight text-[#252B34] dark:text-foreground">
                  Proporção de Laudos
                </span>
                <span className="text-[11px] text-[#78818E] dark:text-muted-foreground">
                  ({totalLaudos} {totalLaudos === 1 ? 'laudo avaliado' : 'laudos avaliados'})
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs font-medium">
                <span className="flex items-center gap-1.5 text-[#3E8E5A]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#3E8E5A]" />
                  <span>
                    <strong>{favoraveis}</strong> Favoráveis (
                    {totalLaudos > 0 ? Math.round((favoraveis / totalLaudos) * 100) : 0}%)
                  </span>
                </span>
                <span className="flex items-center gap-1.5 text-[#B4453C]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#B4453C]" />
                  <span>
                    <strong>{desfavoraveis}</strong> Desfavoráveis (
                    {totalLaudos > 0 ? Math.round((desfavoraveis / totalLaudos) * 100) : 0}%)
                  </span>
                </span>
              </div>
            </div>

            <div className="h-2.5 w-full flex rounded-full overflow-hidden bg-[#F2F4F7] dark:bg-muted">
              {totalLaudos > 0 ? (
                <>
                  <div
                    className="h-full bg-[#3E8E5A] transition-all duration-300"
                    style={{ width: `${(favoraveis / totalLaudos) * 100}%` }}
                    title={`Favoráveis: ${favoraveis} (${Math.round((favoraveis / totalLaudos) * 100)}%)`}
                  />
                  <div
                    className="h-full bg-[#B4453C] transition-all duration-300"
                    style={{ width: `${(desfavoraveis / totalLaudos) * 100}%` }}
                    title={`Desfavoráveis: ${desfavoraveis} (${Math.round((desfavoraveis / totalLaudos) * 100)}%)`}
                  />
                </>
              ) : (
                <div className="h-full w-full bg-[#E4E7EB] dark:bg-muted" />
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
