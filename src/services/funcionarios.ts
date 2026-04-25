import pb from '@/lib/pocketbase/client'

export const getFuncionarios = async () => {
  return await pb.collection('funcionarios').getFullList({
    sort: 'nome',
  })
}

export const getFuncionarioByPin = async (pin: string) => {
  try {
    return await pb.collection('funcionarios').getFirstListItem(`pin = '${pin}'`)
  } catch {
    return null
  }
}

export const checkPinUnique = async (pin: string, excludeId?: string) => {
  try {
    const res = await pb.collection('funcionarios').getFirstListItem(`pin = '${pin}'`)
    return res.id === excludeId
  } catch {
    return true
  }
}

export const createFuncionario = async (data: FormData) => {
  return await pb.collection('funcionarios').create(data)
}

export const updateFuncionario = async (id: string, data: FormData | Partial<any>) => {
  return await pb.collection('funcionarios').update(id, data)
}
