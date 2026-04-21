import { useDashboardData } from '@/hooks/use-dashboard-data'
import { OverviewStats } from '@/components/dashboard/OverviewStats'
import { OverviewCharts } from '@/components/dashboard/OverviewCharts'
import { OverviewTeamAlerts } from '@/components/dashboard/OverviewTeamAlerts'
import { Skeleton } from '@/components/ui/skeleton'

export default function Index() {
  const { protocolos, contratos, loading } = useDashboardData()

  if (loading) {
    return (
      <div className="space-y-6 pb-10">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-[400px] w-full rounded-xl" />
          <Skeleton className="h-[400px] w-full rounded-xl" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-32 w-full rounded-xl lg:col-span-1" />
          <Skeleton className="h-32 w-full rounded-xl lg:col-span-2" />
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in-up space-y-6 pb-10">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Visão Geral</h1>
        <p className="text-muted-foreground">
          Monitore métricas em tempo real, honorários e desempenho da equipe.
        </p>
      </div>

      <OverviewStats protocolos={protocolos} contratos={contratos} />
      <OverviewCharts protocolos={protocolos} />
      <OverviewTeamAlerts protocolos={protocolos} />
    </div>
  )
}
