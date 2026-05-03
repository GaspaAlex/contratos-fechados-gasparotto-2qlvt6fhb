import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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

      if (quickFilter === 'A Receber' && item.recebido) return
      if (quickFilter === 'Recebido' && !item.recebido) return
      if (quickFilter === 'RPV' && item.tipo !== 'RPV') return
      if (quickFilter === 'Precatório' && item.tipo !== 'Precatório') return
      if (quickFilter === 'Por Parceria') {
        if (parceriaFilter !== 'Todos os parceiros' && item.tipo_parceria !== parceriaFilter) return
      }

      totalCasosVal++
      if (item.recebido) {
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
    <div className="flex flex-col gap-4 mb-2 mt-4">
      <div>
        <h2 className="text-xl font-semibold text-[#C9922A]">Resumo Financeiro</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-[#C9922A]/20 bg-[#C9922A]/5 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-[#C9922A] text-sm font-medium">A Receber</CardTitle>
            <CardDescription className="text-[#C9922A]/70 text-xs">
              Casos pendentes de pagamento
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#C9922A]">{formatCurrency(aReceber)}</div>
          </CardContent>
        </Card>

        <Card className="border-[#52B86E]/20 bg-[#52B86E]/5 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-[#52B86E] text-sm font-medium">Total Recebido</CardTitle>
            <CardDescription className="text-[#52B86E]/70 text-xs">
              Valores já recebidos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#52B86E]">{formatCurrency(recebido)}</div>
          </CardContent>
        </Card>

        <Card className="border-[#5A9FD4]/20 bg-[#5A9FD4]/5 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-[#5A9FD4] text-sm font-medium">Total Geral</CardTitle>
            <CardDescription className="text-[#5A9FD4]/70 text-xs">
              Projeção total do escritório
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#5A9FD4]">{formatCurrency(totalGeral)}</div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 bg-gray-50/50 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-gray-700 text-sm font-medium">Casos</CardTitle>
            <CardDescription className="text-gray-500 text-xs">Volume de processos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-700">{totalCasos}</div>
            <p className="text-xs text-gray-500 mt-1 font-medium">
              {pendentes} Pendentes &bull; {recebidosCount} Recebidos
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
