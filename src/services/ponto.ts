import pb from '@/lib/pocketbase/client'

export const getActiveFuncionariosCount = async () => {
  try {
    const res = await pb.collection('funcionarios').getList(1, 1, {
      filter: 'ativo = true',
    })
    return res.totalItems
  } catch (e) {
    console.error(e)
    return 0
  }
}

export const getSaldosMensais = async (mes: number, ano: number) => {
  try {
    return await pb.collection('saldos_mensais').getFullList({
      filter: `mes = ${mes} && ano = ${ano}`,
      expand: 'funcionario_id',
      sort: '-created',
    })
  } catch (e) {
    console.error(e)
    return []
  }
}

export const getFuncionarioPhotoUrl = (record: any) => {
  if (!record || !record.foto) return ''
  return pb.files.getURL(record, record.foto, { thumb: '100x100' })
}
