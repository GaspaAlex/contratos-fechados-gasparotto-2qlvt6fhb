import pb from '@/lib/pocketbase/client'

export const getContratos = async () => {
  return await pb.collection('contratos_fechados').getFullList({
    sort: '-created',
  })
}

export const createContrato = async (data: any) => {
  return await pb.collection('contratos_fechados').create(data)
}

export const updateContrato = async (id: string, data: any) => {
  return await pb.collection('contratos_fechados').update(id, data)
}

export const deleteContrato = async (id: string) => {
  return await pb.collection('contratos_fechados').delete(id)
}

export const toYMD = (dateString?: string) => {
  if (!dateString) return ''
  return dateString.split(' ')[0]
}

export const toPBDate = (ymd?: string) => {
  if (!ymd) return ''
  return `${ymd} 12:00:00.000Z`
}
