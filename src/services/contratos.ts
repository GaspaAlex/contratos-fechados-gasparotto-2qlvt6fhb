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

export const getTiposAcao = async () => pb.collection('tipos_acao').getFullList({ sort: 'nome' })
export const createTipoAcao = async (data: any) => pb.collection('tipos_acao').create(data)
export const deleteTipoAcao = async (id: string) => pb.collection('tipos_acao').delete(id)

export const getStatusContrato = async () =>
  pb.collection('status_contrato').getFullList({ sort: 'nome' })
export const createStatusContrato = async (data: any) =>
  pb.collection('status_contrato').create(data)
export const updateStatusContrato = async (id: string, data: any) =>
  pb.collection('status_contrato').update(id, data)
export const deleteStatusContrato = async (id: string) =>
  pb.collection('status_contrato').delete(id)

export const getContratosByStatus = async (status: string) =>
  pb
    .collection('contratos_fechados')
    .getFullList({ filter: `status = '${status.replace(/'/g, "\\'")}'` })

export const getContratosByBeneficio = async (beneficio: string) =>
  pb
    .collection('contratos_fechados')
    .getFullList({ filter: `beneficio = '${beneficio.replace(/'/g, "\\'")}'` })

export const getResponsaveis = async () =>
  pb.collection('responsaveis').getFullList({ sort: 'nome' })
export const createResponsavel = async (data: any) => pb.collection('responsaveis').create(data)
export const deleteResponsavel = async (id: string) => pb.collection('responsaveis').delete(id)

export const toPBDate = (ymd?: string) => {
  if (!ymd) return ''
  return `${ymd} 12:00:00.000Z`
}
