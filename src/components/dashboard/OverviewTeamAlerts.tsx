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
  return '#C9922A' // Default Amber for new/others
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
      const nLower = name.trim().toLowerCase()

      // Exclude IA, Caio and Alex from the team metrics
      if (nLower === 'ia' || nLower.includes('caio') || nLower.includes('alex')) {
        return
      }

      counts[name] = (counts[name] || 0) + 1
    })

    return Object.entries(counts)
      .map(([name, count]) => ({ name, count, color: getTeamColor(name) }))
      .sort((a, b) => b.count - a.count)
  }, [protocolos])

  const maxCount = teamData.length > 0 ? teamData[0].count : 1

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {/* Alertas de Atraso */}
      <Card className="shadow-sm lg:col-span-1 rounded-[10px] border border-[#E4E7EB] dark:border-border bg-white dark:bg-card">
        <CardHeader className="pb-3 pt-5 px-5 sm:px-6">
          <CardTitle className="text-base font-bold text-[#252B34] dark:text-foreground">
            Alertas de Atraso
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 sm:px-6 pb-6">
          <div
            className={cn(
              'flex items-center gap-4 rounded-[10px] border p-4 transition-colors',
              delayedCount > 0
                ? 'bg-[#B4453C]/[0.07] border-[#B4453C]/25 text-[#B4453C] dark:text-red-400'
                : 'bg-[#3E8E5A]/[0.07] border-[#3E8E5A]/25 text-[#3E8E5A] dark:text-green-400',
            )}
          >
            <div
              className={cn(
                'h-11 w-11 rounded-lg flex items-center justify-center shrink-0',
                delayedCount > 0 ? 'bg-[#B4453C]/15' : 'bg-[#3E8E5A]/15',
              )}
            >
              {delayedCount > 0 ? (
                <Clock className="h-6 w-6 text-[#B4453C]" />
              ) : (
                <CheckCircle2 className="h-6 w-6 text-[#3E8E5A]" />
              )}
            </div>
            <div>
              <p className="font-bold text-base leading-tight tabular-nums">
                {delayedCount > 0
                  ? `${delayedCount} ${delayedCount === 1 ? 'protocolo' : 'protocolos'} em atraso`
                  : 'Nenhum protocolo em atraso'}
              </p>
              <p className="text-xs text-[#78818E] dark:text-muted-foreground mt-1">
                {delayedCount > 0
                  ? 'Verifique os casos com status "Prov. Inicial"'
                  : 'Sua equipe está com todos os prazos em dia!'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Desempenho da Equipe */}
      <Card className="shadow-sm lg:col-span-2 rounded-[10px] border border-[#E4E7EB] dark:border-border bg-white dark:bg-card">
        <CardHeader className="pb-3 pt-5 px-5 sm:px-6">
          <CardTitle className="text-base font-bold text-[#252B34] dark:text-foreground">
            Desempenho da Equipe
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 sm:px-6 pb-6">
          <div className="space-y-4">
            {teamData.length === 0 ? (
              <p className="text-xs text-[#78818E] dark:text-muted-foreground text-center py-6">
                Nenhum dado de equipe encontrado.
              </p>
            ) : (
              teamData.map((member) => (
                <div key={member.name} className="flex items-center gap-4">
                  <div
                    className="w-36 truncate text-xs font-semibold text-[#252B34] dark:text-foreground"
                    title={member.name}
                  >
                    {member.name}
                  </div>
                  <div className="flex-1 flex items-center gap-3">
                    <div className="flex h-2.5 w-full bg-[#F5F6F8] dark:bg-muted/50 rounded-full overflow-hidden border border-[#E4E7EB]/50 dark:border-border">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${(member.count / maxCount) * 85}%`,
                          backgroundColor: member.color,
                        }}
                      />
                    </div>
                    <span className="w-8 text-right text-xs font-bold text-[#252B34] dark:text-foreground tabular-nums">
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
