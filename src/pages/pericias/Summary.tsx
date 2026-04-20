import { Card, CardContent } from '@/components/ui/card'
import { Pericia } from '@/services/pericias'

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
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="text-xs text-muted-foreground font-semibold mb-2">A REALIZAR</div>
            <div className="text-[28px] leading-none font-bold text-amber-600 dark:text-amber-500">
              {aRealizar}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-xs text-muted-foreground font-semibold mb-2">COMPARECERAM</div>
            <div className="text-[28px] leading-none font-bold text-emerald-600 dark:text-emerald-500">
              {compareceram}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-xs text-muted-foreground font-semibold mb-2">FALTARAM</div>
            <div className="text-[28px] leading-none font-bold text-rose-600 dark:text-rose-500">
              {faltaram}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-xs text-muted-foreground font-semibold mb-2 tracking-tight">
              TAXA DE PROCEDÊNCIA
            </div>
            <div className="text-[28px] leading-none font-bold text-blue-600 dark:text-blue-500">
              {taxaProcedencia !== null ? `${taxaProcedencia}%` : '—'}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between text-sm font-semibold">
              <span>Proporção de Laudos</span>
              <div className="flex flex-wrap items-center gap-4 text-xs font-normal">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  {favoraveis} Favoráveis (
                  {totalLaudos > 0 ? Math.round((favoraveis / totalLaudos) * 100) : 0}%)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  {desfavoraveis} Desfavorável (
                  {totalLaudos > 0 ? Math.round((desfavoraveis / totalLaudos) * 100) : 0}%)
                </span>
              </div>
            </div>

            <div className="h-2 w-full flex rounded-[4px] overflow-hidden bg-muted">
              {totalLaudos > 0 ? (
                <>
                  <div
                    className="h-full bg-emerald-500"
                    style={{ width: `${(favoraveis / totalLaudos) * 100}%` }}
                  />
                  <div
                    className="h-full bg-rose-500"
                    style={{ width: `${(desfavoraveis / totalLaudos) * 100}%` }}
                  />
                </>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
