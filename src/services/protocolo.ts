import pb from '@/lib/pocketbase/client'

export const getProtocolos = () =>
  pb.collection('protocolo').getFullList({ expand: 'tipo_acao,responsavel', sort: '+dprotocolo' })

export const createProtocolo = (data: any) => pb.collection('protocolo').create(data)

export const updateProtocolo = (id: string, data: any) =>
  pb.collection('protocolo').update(id, data)

export const deleteProtocolo = (id: string) => pb.collection('protocolo').delete(id)
