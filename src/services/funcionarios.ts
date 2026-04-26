import pb from '@/lib/pocketbase/client'

export const getFuncionarios = async () => {
  return await pb.collection('funcionarios').getFullList({
    sort: 'nome',
    filter: "perfil != 'admin'",
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

export const deleteFuncionario = async (id: string) => {
  try {
    const saldos = await pb
      .collection('saldos_mensais')
      .getFullList({ filter: `funcionario_id = "${id}"` })
    for (const s of saldos) {
      await pb.collection('saldos_mensais').delete(s.id)
    }

    const registros = await pb
      .collection('registros')
      .getFullList({ filter: `funcionario_id = "${id}"` })
    for (const r of registros) {
      await pb.collection('registros').delete(r.id)
    }

    return await pb.collection('funcionarios').delete(id)
  } catch (error) {
    console.error('Erro na exclusão em cascata:', error)
    throw new Error(
      'Falha ao excluir registros dependentes ou o funcionário. A operação foi abortada para garantir a integridade.',
    )
  }
}
