import { useMemo } from 'react'
import { DollarSign, CheckCircle2, Clock, Scale } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/formatters'
import { useRpvFilters } from './store'

export function calculateHonorariosEscritorio(item: any) {
  const valorRpv = Number(item.valor_rpv) || 0
  const sucumbencia = Number(item.sucumbencia) || 0
  const totalHonorarios = valorRpv * 0.3 + sucumbencia

  switch (item.tipo_parceria) {
    case 'Carnevale':
      return totalHonorarios * 0.5
    case 'Macohin':
      return (totalHonorarios * 0.857 * 0.8334) / 2
    case 'Macohin + Rogério':
      return ((totalHonorarios * 0.857 * 0.8334) / 2) * 0.4
    case 'Macohin + Luciana':
      return ((totalHonorarios * 0.857 * 0.8334) / 2) * 0.5
    case 'Sem parceria':
    default:
      return totalHonorarios
  }
}

export function RpvDashboard({ data, month, year }: { data: any[]; month: string; year: string }) {
  const { quickFilter, parceriaFilter } = useRpvFilters()

  const { aReceber, recebido, pendentes, recebidosCount, totalCasos } = useMemo(() => {
    let aReceberVal = 0
    let recebidoVal = 0
    let pendentesVal = 0
    let recebidosCountVal = 0
    let totalCasosVal = 0

    data.forEach((item) => {
      const [m, y] = (item.previsao_pagamento || '').split('/')
      if (month !== 'Todos' && m !== month) return
      if (year !== 'Todos' && y !== year) return

      if (quickFilter === 'A Receber' && item.status === 'Recebido') return
      if (quickFilter === 'Recebido' && item.status !== 'Recebido') return
      if (quickFilter === 'RPV' && item.tipo !== 'RPV') return
      if (quickFilter === 'Precatório' && item.tipo !== 'Precatório') return
      if (quickFilter === 'Por Parceria') {
        if (parceriaFilter !== 'Todos os parceiros' && item.tipo_parceria !== parceriaFilter) return
      }

      totalCasosVal++
      if (item.status === 'Recebido') {
        recebidoVal += Number(item.valor_recebido) || 0
        recebidosCountVal++
      } else {
        aReceberVal += calculateHonorariosEscritorio(item)
        pendentesVal++
      }
    })

    return {
      aReceber: aReceberVal,
      recebido: recebidoVal,
      pendentes: pendentesVal,
      recebidosCount: recebidosCountVal,
      totalCasos: totalCasosVal,
    }
  }, [data, month, year, quickFilter, parceriaFilter])

  const totalGeral = aReceber + recebido

  return (
    <div className="space-y-3">
      <div className="grid gap-3.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {/* CARD 1 — TOTAL GERAL (Destaque Executivo Grafite #22262E com valor Dourado Claro #D9A94A) */}
        <Card className="relative overflow-hidden rounded-[10px] border border-[#2E3440] bg-[#22262E] text-white shadow-sm flex flex-col justify-between">
          <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[11px] font-semibold tracking-wider uppercase text-[#9EA7B6]">
                  Total Geral
                </span>
                <div className="h-7 w-7 rounded-md bg-[#2B303C] flex items-center justify-center text-[#D9A94A]">
                  <DollarSign className="h-4 w-4" />
                </div>
              </div>
              <p className="text-[11px] text-[#7C8596] mb-3">Projeção total do escritório</p>
            </div>

            <div>
              <div
                className="text-xl sm:text-2xl font-bold tracking-tight text-[#D9A94A] tabular-nums"
                title={formatCurrency(totalGeral)}
              >
                {formatCurrency(totalGeral)}
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-[#A5ADB9]">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#3E8E5A]" />
                <span>Honorários contratuais e sucumbência</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CARD 2 — A RECEBER (Card Branco com destaque Âmbar/Dourado #C77E1E) */}
        <Card className="rounded-[10px] border border-[#E4E7EB] dark:border-border bg-white dark:bg-card shadow-sm flex flex-col justify-between">
          <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[11px] font-semibold tracking-wider uppercase text-[#78818E] dark:text-muted-foreground">
                  A Receber
                </span>
                <div className="h-7 w-7 rounded-md bg-[#FDF7ED] dark:bg-amber-950/30 flex items-center justify-center text-[#C77E1E]">
                  <Clock className="h-4 w-4" />
                </div>
              </div>
              <p className="text-[11px] text-[#78818E] dark:text-muted-foreground mb-3">
                Casos pendentes de pagamento
              </p>
            </div>

            <div>
              <div
                className="text-xl sm:text-2xl font-bold tracking-tight text-[#C77E1E] tabular-nums"
                title={formatCurrency(aReceber)}
              >
                {formatCurrency(aReceber)}
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-[#78818E] dark:text-muted-foreground">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#C77E1E]" />
                <span>{pendentes} caso(s) aguardando liquidação</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CARD 3 — TOTAL RECEBIDO (Card Branco com destaque Verde Corporativo #3E8E5A) */}
        <Card className="rounded-[10px] border border-[#E4E7EB] dark:border-border bg-white dark:bg-card shadow-sm flex flex-col justify-between">
          <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[11px] font-semibold tracking-wider uppercase text-[#78818E] dark:text-muted-foreground">
                  Total Recebido
                </span>
                <div className="h-7 w-7 rounded-md bg-[#EDF7F0] dark:bg-green-950/30 flex items-center justify-center text-[#3E8E5A]">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
              </div>
              <p className="text-[11px] text-[#78818E] dark:text-muted-foreground mb-3">
                Valores já liquidados e recebidos
              </p>
            </div>

            <div>
              <div
                className="text-xl sm:text-2xl font-bold tracking-tight text-[#3E8E5A] tabular-nums"
                title={formatCurrency(recebido)}
              >
                {formatCurrency(recebido)}
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-[#78818E] dark:text-muted-foreground">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#3E8E5A]" />
                <span>{recebidosCount} caso(s) recebidos</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CARD 4 — VOLUME DE CASOS */}
        <Card className="rounded-[10px] border border-[#E4E7EB] dark:border-border bg-white dark:bg-card shadow-sm flex flex-col justify-between">
          <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[11px] font-semibold tracking-wider uppercase text-[#78818E] dark:text-muted-foreground">
                  Casos
                </span>
                <div className="h-7 w-7 rounded-md bg-[#F5F6F8] dark:bg-muted/50 flex items-center justify-center text-[#4A7FA5]">
                  <Scale className="h-4 w-4" />
                </div>
              </div>
              <p className="text-[11px] text-[#78818E] dark:text-muted-foreground mb-3">
                Volume total de processos
              </p>
            </div>

            <div>
              <div className="text-xl sm:text-2xl font-bold tracking-tight text-[#252B34] dark:text-foreground tabular-nums">
                {totalCasos}
              </div>
              <div className="mt-2 flex items-center gap-2 text-[11px] text-[#78818E] dark:text-muted-foreground font-medium">
                <span className="text-[#C77E1E] tabular-nums">{pendentes} pendente(s)</span>
                <span>•</span>
                <span className="text-[#3E8E5A] tabular-nums">{recebidosCount} recebido(s)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
