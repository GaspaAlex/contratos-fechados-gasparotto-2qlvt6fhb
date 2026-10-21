import React, { useState, useEffect } from 'react'
import { getProtocolos } from '@/services/protocolo'
import { getTiposAcao, getResponsaveis } from '@/services/lookups'
import { useRealtime } from '@/hooks/use-realtime'
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
  const [parceiro, setParceiro] = useState('Todos')
  const [tipo, setTipo] = useState('Todos')
  const [responsavel, setResponsavel] = useState('Todos')
  const [month, setMonth] = useState('Todos')
  const [year, setYear] = useState(new Date().getFullYear().toString())
  const [monthStart, setMonthStart] = useState('Todos')
  const [monthEnd, setMonthEnd] = useState('Todos')
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
      {/* Cabeçalho Corporativo Harmonizado com Visão Geral (Grafite Premium 2.1) */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center text-[10px] font-bold tracking-[1.5px] uppercase text-[#C9922A] bg-[#C9922A]/10 px-2 py-0.5 rounded">
            GESTÃO DE CASOS
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#252B34] dark:text-foreground">
          Protocolo
        </h1>
        <p className="text-sm text-[#78818E] dark:text-muted-foreground">
          Gestão de processos em fase de protocolo, prazos, acompanhamento e projeção de honorários.
        </p>
      </div>

      <ProtocoloDashboard
        data={data}
        tipo={tipo}
        responsavel={responsavel}
        origem={origem}
        parceiro={parceiro}
        month={month}
        year={year}
        monthStart={monthStart}
        monthEnd={monthEnd}
        status={status}
      />

      <ProtocoloTable
        data={data}
        tipos={tipos}
        search={search}
        setSearch={setSearch}
        status={status}
        setStatus={setStatus}
        origem={origem}
        setOrigem={setOrigem}
        parceiro={parceiro}
        setParceiro={setParceiro}
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
