import { useState, useEffect } from 'react'
import { useDashboardData } from '@/hooks/use-dashboard-data'
import { useRealtime } from '@/hooks/use-realtime'
import { OverviewStats } from '@/components/dashboard/OverviewStats'
import { OverviewCharts } from '@/components/dashboard/OverviewCharts'
import { OverviewTeamAlerts } from '@/components/dashboard/OverviewTeamAlerts'
import { Skeleton } from '@/components/ui/skeleton'

export default function Index() {
  const { protocolos: initialProtocolos, contratos, loading } = useDashboardData()
  const [protocolos, setProtocolos] = useState(initialProtocolos)

  useEffect(() => {
    setProtocolos(initialProtocolos)
  }, [initialProtocolos])

  useRealtime('protocolo', (e) => {
    if (e.action === 'create') {
      setProtocolos((prev) => [...prev, e.record as any])
    } else if (e.action === 'update') {
      setProtocolos((prev) => prev.map((p) => (p.id === e.record.id ? (e.record as any) : p)))
    } else if (e.action === 'delete') {
      setProtocolos((prev) => prev.filter((p) => p.id !== e.record.id))
    }
  })

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
    <div className="animate-fade-in-up space-y-7 pb-10">
      {/* Cabeçalho da Página com Eyebrow Corporativo */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center text-[10px] font-bold tracking-[1.5px] uppercase text-[#C9922A] bg-[#C9922A]/10 px-2 py-0.5 rounded">
            PAINEL EXECUTIVO
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#252B34] dark:text-foreground">
          Visão Geral
        </h1>
        <p className="text-sm text-[#78818E] dark:text-muted-foreground">
          Monitore métricas em tempo real, honorários e desempenho da equipe.
        </p>
      </div>

      <OverviewStats protocolos={protocolos} contratos={contratos} />
      <OverviewCharts protocolos={protocolos} />
      <OverviewTeamAlerts protocolos={protocolos} />
    </div>
  )
}
