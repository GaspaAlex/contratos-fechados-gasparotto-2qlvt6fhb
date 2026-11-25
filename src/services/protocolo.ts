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
  revisar_em?: string
  contratos?: string[]
  /** Novo protocolo do mesmo caso: raiz da cadeia (vazio em registros normais). */
  caso_origem?: string
  /** Justificativa obrigatória do fluxo "Novo protocolo do mesmo caso". */
  justificativa_reabertura?: string
  /** Auditoria: registro imediatamente anterior da cadeia. */
  protocolo_anterior?: string
  /** Auditoria (só na raiz, preenchido pelo hook): continuacoes da cadeia. */
  caso_continuacoes?: string[]
  created?: string
  updated?: string
  expand?: {
    tipo_acao?: { id: string; nome: string }
    responsavel?: { id: string; nome: string }
    contratos?: { id: string; status?: string }[]
    caso_origem?: {
      id: string
      nome: string
      dcalculo?: string
      dprotocolo?: string
      status?: string
      justificativa_reabertura?: string
    } | null
  }
}

export type ProtocoloInput = Partial<Omit<ProtocoloItem, 'id' | 'created' | 'updated' | 'expand'>>

export const getProtocolos = () =>
  pb.collection('protocolo').getFullList<ProtocoloItem>({
    expand: 'tipo_acao,responsavel,contratos,caso_origem',
    sort: '+dprotocolo',
  })

export const createProtocolo = (data: ProtocoloInput | Record<string, any>) =>
  pb.collection('protocolo').create<ProtocoloItem>(data)

export const updateProtocolo = (id: string, data: ProtocoloInput | Record<string, any>) =>
  pb.collection('protocolo').update<ProtocoloItem>(id, data)

export const deleteProtocolo = (id: string) => pb.collection('protocolo').delete(id)
