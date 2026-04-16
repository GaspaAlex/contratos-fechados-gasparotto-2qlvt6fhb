import { useState, useEffect } from 'react'
import { getContratos } from '@/services/contratos'
import { ContractsTable } from '@/components/dashboard/ContractsTable'
import { useRealtime } from '@/hooks/use-realtime'

export default function Dashboard() {
  const [contratos, setContratos] = useState<any[]>([])

  const loadData = async () => {
    try {
      const data = await getContratos()
      setContratos(data)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('contratos_fechados', () => {
    loadData()
  })

  return (
    <div className="space-y-6">
      <ContractsTable contratos={contratos} />
    </div>
  )
}
