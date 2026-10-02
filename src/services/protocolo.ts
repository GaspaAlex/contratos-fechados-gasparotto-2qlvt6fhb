import pb from '@/lib/pocketbase/client'

export interface ProtocoloItem {
  id: string
  nome: string
  fone?: string
  tipo_acao?: string
  responsavel?: string
  dcalculo?: string
  dprotocolo?: string
  prazo?: number
  nautos?: string
  valor?: number
  decisao?: 'Aguardando' | 'Procedente' | 'Improcedente' | string
  status: string
  pedido?: string
  representante?: boolean
  representante_nome?: string
  representante_cpf?: string
  representante_vinculo?: string
  representante_telefone?: string
  origem?: string
  dcontrato?: string
  parceiro?: string
  observacoes?: string
  created?: string
  updated?: string
  expand?: {
    tipo_acao?: { id: string; nome: string }
    responsavel?: { id: string; nome: string }
  }
}

export type ProtocoloInput = Partial<Omit<ProtocoloItem, 'id' | 'created' | 'updated' | 'expand'>>

export const getProtocolos = () =>
  pb.collection('protocolo').getFullList<ProtocoloItem>({
    expand: 'tipo_acao,responsavel',
    sort: '+dprotocolo',
  })

export const createProtocolo = (data: ProtocoloInput | Record<string, any>) =>
  pb.collection('protocolo').create<ProtocoloItem>(data)

export const updateProtocolo = (id: string, data: ProtocoloInput | Record<string, any>) =>
  pb.collection('protocolo').update<ProtocoloItem>(id, data)

export const deleteProtocolo = (id: string) => pb.collection('protocolo').delete(id)
