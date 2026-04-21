import { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'

export interface DashboardProtocolo {
  id: string
  status: string
  decisao?: string
  valor?: number
  dprotocolo?: string
  expand?: {
    responsavel?: {
      nome: string
    }
  }
}

export interface DashboardContrato {
  id: string
  status: string
  dcontrato?: string
}

export function useDashboardData() {
  const [protocolos, setProtocolos] = useState<DashboardProtocolo[]>([])
  const [contratos, setContratos] = useState<DashboardContrato[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    try {
      const [pRes, cRes] = await Promise.all([
        pb.collection('protocolo').getFullList({ expand: 'responsavel' }),
        pb.collection('contratos_fechados').getFullList(),
      ])
      setProtocolos(pRes as unknown as DashboardProtocolo[])
      setContratos(cRes as unknown as DashboardContrato[])
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('protocolo', loadData)
  useRealtime('contratos_fechados', loadData)

  return { protocolos, contratos, loading }
}
