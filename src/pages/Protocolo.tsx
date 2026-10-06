import React, { useState, useEffect, useMemo } from 'react'
import { Bell, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getProtocolos } from '@/services/protocolo'
import { getTiposAcao, getResponsaveis } from '@/services/lookups'
import { useRealtime } from '@/hooks/use-realtime'
import { getProtocoloFollowUpStats } from '@/lib/date-utils'
import { ProtocoloDashboard } from '@/components/protocolo/ProtocoloDashboard'
import { ProtocoloTable } from '@/components/protocolo/ProtocoloTable'
import { ProtocoloDialog, ProtocoloDeleteDialog } from '@/components/protocolo/ProtocoloDialogs'

export default function Protocolo() {
  const [data, setData] = useState<any[]>([])
  const [tipos, setTipos] = useState<any[]>([])
  const [responsaveis, setResponsaveis] = useState<any[]>([])
  const [selected, setSelected] = useState(null)
  const [open, setOpen] = useState(false)
  const [delOpen, setDelOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState(null)

  // Filters State
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('Todos')
  const [origem, setOrigem] = useState('Todos')
  const [tipo, setTipo] = useState('Todos')
  const [responsavel, setResponsavel] = useState('Todos')
  const [month, setMonth] = useState('Todos')
  const [year, setYear] = useState(new Date().getFullYear().toString())
  const [monthStart, setMonthStart] = useState('Todos')
  const [monthEnd, setMonthEnd] = useState('Todos')

  const followUpStats = useMemo(() => {
    return getProtocoloFollowUpStats(data)
  }, [data])

  const loadData = async () => {
    try {
      const [p, t, r] = await Promise.all([getProtocolos(), getTiposAcao(), getResponsaveis()])
      setData(p)
      setTipos(t)
      setResponsaveis(r)
    } catch (e) {
      console.error('Failed to load data', e)
    }
  }

  useEffect(() => {
    loadData()
  }, [])
  useRealtime('protocolo', loadData)

  return (
    <div className="space-y-6 animate-fade-in-up pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Protocolo</h1>
          <p className="text-muted-foreground mt-1">Gestão de processos em fase de protocolo</p>
        </div>
      </div>

      <ProtocoloDashboard
        data={data}
        tipo={tipo}
        responsavel={responsavel}
        origem={origem}
        month={month}
        year={year}
        monthStart={monthStart}
        monthEnd={monthEnd}
        status={status}
      />

      {followUpStats.total > 0 && (
        <div
          role="alert"
          aria-live="polite"
          className="relative overflow-hidden rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500/[0.12] via-amber-500/[0.08] to-amber-500/[0.03] dark:from-amber-500/[0.18] dark:via-amber-500/[0.10] dark:to-transparent p-4 sm:p-5 shadow-sm animate-fade-in-up"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                <Bell className="h-5 w-5 animate-pulse" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-bold text-foreground text-sm sm:text-base tracking-tight">
                  <span className="text-amber-600 dark:text-amber-400">ATENÇÃO</span>
                  <span className="text-muted-foreground font-normal">&mdash;</span>
                  <span>
                    {followUpStats.total === 1
                      ? '1 caso precisa de acompanhamento'
                      : `${followUpStats.total} casos precisam de acompanhamento`}
                  </span>
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  {(() => {
                    const parts: React.ReactNode[] = []

                    if (followUpStats.atrasados > 0) {
                      parts.push(
                        <span
                          key="atrasados"
                          className="font-medium text-rose-600 dark:text-rose-400"
                        >
                          {followUpStats.atrasados === 1
                            ? '1 protocolo atrasado'
                            : `${followUpStats.atrasados} protocolos atrasados`}
                        </span>,
                      )
                    }

                    if (followUpStats.revisarHoje > 0) {
                      parts.push(
                        <span key="hoje" className="font-medium text-amber-700 dark:text-amber-300">
                          {followUpStats.revisarHoje === 1
                            ? '1 para revisar hoje'
                            : `${followUpStats.revisarHoje} para revisar hoje`}
                        </span>,
                      )
                    }

                    if (followUpStats.revisarAtrasadas > 0) {
                      parts.push(
                        <span
                          key="revisar-atrasadas"
                          className="font-medium text-red-600 dark:text-red-400"
                        >
                          {followUpStats.revisarAtrasadas === 1
                            ? '1 revisão atrasada'
                            : `${followUpStats.revisarAtrasadas} revisões atrasadas`}
                        </span>,
                      )
                    }

                    return parts.map((part, index) => (
                      <React.Fragment key={index}>
                        {index > 0 && <span className="text-muted-foreground/60">&bull;</span>}
                        {part}
                      </React.Fragment>
                    ))
                  })()}
                </div>
              </div>
            </div>

            <Button
              type="button"
              onClick={() => setStatus('Acompanhar')}
              variant="outline"
              size="sm"
              className="self-start sm:self-center shrink-0 border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 hover:text-amber-800 dark:hover:text-amber-200 font-semibold gap-1.5 shadow-none transition-colors"
            >
              Ver casos para acompanhamento
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      <ProtocoloTable
        data={data}
        tipos={tipos}
        search={search}
        setSearch={setSearch}
        status={status}
        setStatus={setStatus}
        origem={origem}
        setOrigem={setOrigem}
        tipo={tipo}
        setTipo={setTipo}
        responsavel={responsavel}
        setResponsavel={setResponsavel}
        month={month}
        setMonth={setMonth}
        year={year}
        setYear={setYear}
        monthStart={monthStart}
        setMonthStart={setMonthStart}
        monthEnd={monthEnd}
        setMonthEnd={setMonthEnd}
        onAdd={() => {
          setSelected(null)
          setOpen(true)
        }}
        onEdit={(item: any) => {
          setSelected(item)
          setOpen(true)
        }}
        onDelete={(item: any) => {
          setItemToDelete(item)
          setDelOpen(true)
        }}
      />

      <ProtocoloDialog
        open={open}
        onOpenChange={setOpen}
        item={selected}
        tipos={tipos}
        responsaveis={responsaveis}
        onSaved={loadData}
      />
      <ProtocoloDeleteDialog
        open={delOpen}
        onOpenChange={setDelOpen}
        item={itemToDelete}
        onDeleted={loadData}
      />
    </div>
  )
}
