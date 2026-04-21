import { useMemo } from 'react'
import { Clock, CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { DashboardProtocolo } from '@/hooks/use-dashboard-data'

interface Props {
  protocolos: DashboardProtocolo[]
}

const getTeamColor = (name: string) => {
  const n = name.toLowerCase()
  if (n.includes('nataly')) return '#5A9FD4' // Blue
  if (n.includes('giulianna')) return '#52B86E' // Green
  if (n.includes('ia')) return '#C9922A' // Amber
  if (n.includes('caio')) return '#A07820' // Dark Amber
  if (n.includes('alex')) return '#9A9070' // Gray
  return '#C9922A' // Default Amber
}

export function OverviewTeamAlerts({ protocolos }: Props) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const delayedCount = useMemo(() => {
    return protocolos.filter((p) => {
      if (p.status !== 'Prov. Inicial' || !p.dprotocolo) return false
      return new Date(p.dprotocolo) < today
    }).length
  }, [protocolos, today])

  const teamData = useMemo(() => {
    const counts: Record<string, number> = {}
    protocolos.forEach((p) => {
      const name = p.expand?.responsavel?.nome || 'Sem responsável'
      counts[name] = (counts[name] || 0) + 1
    })
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count, color: getTeamColor(name) }))
      .sort((a, b) => b.count - a.count)
  }, [protocolos])

  const maxCount = teamData.length > 0 ? teamData[0].count : 1

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card className="shadow-sm lg:col-span-1 border border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Alertas de Atraso</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={cn(
              'flex items-center gap-4 rounded-lg border p-4',
              delayedCount > 0
                ? 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'
                : 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400',
            )}
          >
            {delayedCount > 0 ? (
              <Clock className="h-8 w-8 text-red-500" />
            ) : (
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            )}
            <div>
              <p className="font-bold text-lg leading-tight">
                {delayedCount > 0
                  ? `${delayedCount} ${delayedCount === 1 ? 'protocolo' : 'protocolos'} em atraso`
                  : 'Nenhum protocolo em atraso'}
              </p>
              <p className="text-sm opacity-80 mt-0.5">
                {delayedCount > 0
                  ? 'Verifique os casos com status "Prov. Inicial"'
                  : 'Sua equipe está em dia!'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm lg:col-span-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Desempenho da Equipe</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {teamData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum dado de equipe.
              </p>
            ) : (
              teamData.map((member) => (
                <div key={member.name} className="flex items-center gap-4">
                  <div className="w-32 truncate text-sm font-medium" title={member.name}>
                    {member.name}
                  </div>
                  <div className="flex-1 flex items-center gap-3">
                    <div className="flex h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${(member.count / maxCount) * 80}%`,
                          backgroundColor: member.color,
                        }}
                      />
                    </div>
                    <span className="w-10 text-right text-sm font-semibold text-muted-foreground">
                      {member.count}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
