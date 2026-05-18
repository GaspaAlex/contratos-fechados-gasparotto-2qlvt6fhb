import { useEffect, useState, useMemo } from 'react'
import { useRealtime } from '@/hooks/use-realtime'
import { getRpvs } from '@/services/rpv'
import { RpvFilters } from '@/components/rpv/RpvFilters'
import { RpvTable } from '@/components/rpv/RpvTable'
import { RpvFormModal } from '@/components/rpv/RpvFormModal'
import { RpvDashboard } from '@/components/rpv/RpvDashboard'
import { RpvPinGuard } from '@/components/rpv/RpvPinGuard'

export default function Rpv() {
  const [data, setData] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [tipo, setTipo] = useState('Todos')
  const [status, setStatus] = useState('Todos')
  const [month, setMonth] = useState('Todos')
  const [year, setYear] = useState('Todos')

  const [formOpen, setFormOpen] = useState(false)
  const [editRecord, setEditRecord] = useState<any>(null)

  const loadData = async () => {
    try {
      const res = await getRpvs()
      setData(res)
    } catch (e) {
      console.error('Failed to load RPVs:', e)
    }
  }

  useEffect(() => {
    loadData()
  }, [])
  useRealtime('rpv_precatorio', () => {
    loadData()
  })

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      if (search) {
        const query = search.toLowerCase()
        const matchName = item.nome?.toLowerCase().includes(query)
        const matchProc = item.numero_processo?.toLowerCase().includes(query)
        if (!matchName && !matchProc) return false
      }
      if (tipo !== 'Todos' && item.tipo !== tipo) return false
      if (status !== 'Todos' && item.status !== status) return false

      const [m, y] = (item.previsao_pagamento || '').split('/')
      if (month !== 'Todos' && m !== month) return false
      if (year !== 'Todos' && y !== year) return false
      return true
    })
  }, [data, search, tipo, status, month, year])

  return (
    <RpvPinGuard>
      <div className="-m-4 sm:-m-8 p-4 sm:p-8 flex flex-col gap-6 min-h-[calc(100vh-4rem)] animate-fade-in bg-[#FAF8F2] dark:bg-[#0D0F0C]">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-[#C9922A]">RPV/Precatório</h1>
          <p className="text-muted-foreground">Gestão de RPVs e Precatórios</p>
        </div>

        <RpvFilters
          search={search}
          setSearch={setSearch}
          tipo={tipo}
          setTipo={setTipo}
          status={status}
          setStatus={setStatus}
          month={month}
          setMonth={setMonth}
          year={year}
          setYear={setYear}
          onAdd={() => {
            setEditRecord(null)
            setFormOpen(true)
          }}
        />

        <RpvDashboard data={data} month={month} year={year} />

        <div className="flex-1 bg-white dark:bg-[#0D0F0C] border dark:border-gray-800 rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto">
            <RpvTable
              data={filteredData}
              onEdit={(r) => {
                setEditRecord(r)
                setFormOpen(true)
              }}
            />
          </div>
        </div>

        <RpvFormModal open={formOpen} onOpenChange={setFormOpen} record={editRecord} />
      </div>
    </RpvPinGuard>
  )
}
