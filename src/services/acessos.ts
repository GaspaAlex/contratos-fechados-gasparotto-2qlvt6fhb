import pb from '@/lib/pocketbase/client'

export const getGrupos = async () => {
  return await pb.collection('acessos_grupos').getFullList({
    sort: 'titulo',
    expand: 'acessos_blocos_via_grupo',
  })
}

export const deleteGrupo = async (id: string) => {
  return await pb.collection('acessos_grupos').delete(id)
}

export const createGrupo = async (data: FormData) => {
  return await pb.collection('acessos_grupos').create(data)
}

export const updateGrupo = async (id: string, data: FormData) => {
  return await pb.collection('acessos_grupos').update(id, data)
}

export const createBloco = async (data: {
  grupo: string
  rotulo?: string
  colaborador?: string
  campos: any[]
}) => {
  return await pb.collection('acessos_blocos').create(data)
}

export const updateBloco = async (
  id: string,
  data: { rotulo?: string; colaborador?: string; campos: any[] },
) => {
  return await pb.collection('acessos_blocos').update(id, data)
}

export const deleteBloco = async (id: string) => {
  return await pb.collection('acessos_blocos').delete(id)
}

export const getColaboradores = async () => {
  return await pb.collection('users').getFullList({
    filter: "perfil = 'colaborador'",
    sort: 'name',
  })
}
