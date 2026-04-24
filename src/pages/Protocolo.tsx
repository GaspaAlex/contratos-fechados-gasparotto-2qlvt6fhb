import { useState, useEffect } from 'react'
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
  const [tipo, setTipo] = useState('Todos')
  const [month, setMonth] = useState('Todos')
  const [year, setYear] = useState(new Date().getFullYear().toString())

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

      <ProtocoloDashboard data={data} tipo={tipo} month={month} year={year} />

      <ProtocoloTable
        data={data}
        tipos={tipos}
        search={search}
        setSearch={setSearch}
        status={status}
        setStatus={setStatus}
        tipo={tipo}
        setTipo={setTipo}
        month={month}
        setMonth={setMonth}
        year={year}
        setYear={setYear}
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
