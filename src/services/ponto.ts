import pb from '@/lib/pocketbase/client'
import { calculateDailyBalance } from '@/lib/ponto-utils'

export const recalcularTodosSaldos = async (
  onProgress: (current: number, total: number, step: string) => void,
) => {
  const todosRegistros = await pb.collection('registros').getFullList({ sort: '+data' })
  let current = 0
  const totalRegistros = todosRegistros.length
  const funcIds = new Set<string>()

  for (const reg of todosRegistros) {
    current++
    onProgress(current, totalRegistros, 'registros')

    let newSaldo = 0
    if (reg.tipo_dia === 'atestado') newSaldo = 0
    else if (reg.tipo_dia === 'feriado') newSaldo = 0
    else if (reg.tipo_dia === 'falta') newSaldo = -480
    else {
      const res = calculateDailyBalance(
        reg.entrada1,
        reg.saida1,
        reg.entrada2,
        reg.saida2,
        480,
        reg.tipo_dia,
        reg.horas_atestado,
        reg.data,
      )
      newSaldo = res.saldo_dia
    }

    if (reg.saldo_dia !== newSaldo) {
      await pb.collection('registros').update(reg.id, { saldo_dia: newSaldo })
    }
    funcIds.add(reg.funcionario_id)
  }

  const arrFuncIds = Array.from(funcIds)
  for (let i = 0; i < arrFuncIds.length; i++) {
    const funcId = arrFuncIds[i]
    onProgress(i + 1, arrFuncIds.length, 'saldos')

    const saldos = await pb.collection('saldos_mensais').getFullList({
      filter: `funcionario_id = '${funcId}'`,
      sort: '+ano,+mes',
    })

    let saldoAnterior = 0

    for (const sm of saldos) {
      const start = new Date(sm.ano, sm.mes - 1, 1).toISOString().split('T')[0]
      const end = new Date(sm.ano, sm.mes, 0).toISOString().split('T')[0]

      const regsMes = await pb.collection('registros').getFullList({
        filter: `funcionario_id = '${funcId}' && data >= '${start} 00:00:00' && data <= '${end} 23:59:59'`,
      })

      const saldoMes = regsMes.reduce((acc, r) => acc + (r.saldo_dia || 0), 0)
      const saldoTotal = saldoAnterior + saldoMes

      if (
        sm.saldo_anterior !== saldoAnterior ||
        sm.saldo_mes !== saldoMes ||
        sm.saldo_total !== saldoTotal
      ) {
        await pb.collection('saldos_mensais').update(sm.id, {
          saldo_anterior: saldoAnterior,
          saldo_mes: saldoMes,
          saldo_total: saldoTotal,
        })
      }

      saldoAnterior = saldoTotal
    }
  }
}

export const getActiveFuncionariosCount = async () => {
  try {
    const res = await pb
      .collection('funcionarios')
      .getList(1, 1, { filter: "ativo = true && perfil != 'admin'" })
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

export const getFuncionario = async (id: string) => {
  return await pb.collection('funcionarios').getOne(id)
}

export const getRegistrosMes = async (funcionarioId: string, mes: number, ano: number) => {
  const start = new Date(ano, mes - 1, 1).toISOString().split('T')[0]
  const end = new Date(ano, mes, 0).toISOString().split('T')[0]
  return await pb.collection('registros').getFullList({
    filter: `funcionario_id = '${funcionarioId}' && data >= '${start} 00:00:00' && data <= '${end} 23:59:59'`,
    sort: 'data',
  })
}

export const getSaldoMensal = async (funcionarioId: string, mes: number, ano: number) => {
  try {
    return await pb
      .collection('saldos_mensais')
      .getFirstListItem(`funcionario_id = '${funcionarioId}' && mes = ${mes} && ano = ${ano}`)
  } catch {
    return null
  }
}

export const createSaldoMensal = async (data: any) => pb.collection('saldos_mensais').create(data)
export const updateSaldoMensal = async (id: string, data: any) =>
  pb.collection('saldos_mensais').update(id, data)

export const ensureTodosSaldosMes = async (mes: number, ano: number) => {
  const now = new Date()
  if (mes !== now.getMonth() + 1 || ano !== now.getFullYear()) {
    return
  }

  try {
    const ativos = await pb
      .collection('funcionarios')
      .getFullList({ filter: "ativo = true && perfil != 'admin'" })
    const saldos = await pb
      .collection('saldos_mensais')
      .getFullList({ filter: `mes = ${mes} && ano = ${ano}` })

    const saldosMap = new Set(saldos.map((s) => s.funcionario_id))

    for (const func of ativos) {
      if (!saldosMap.has(func.id)) {
        await getOrCreateSaldoMensal(func.id, mes, ano)
      }
    }
  } catch (e) {
    console.error('Erro ao verificar saldos', e)
  }
}

export const getOrCreateSaldoMensal = async (funcionarioId: string, mes: number, ano: number) => {
  const current = await getSaldoMensal(funcionarioId, mes, ano)
  if (current) return current

  let saldo_anterior = 0
  try {
    const mostRecent = await pb
      .collection('saldos_mensais')
      .getFirstListItem(
        `funcionario_id = '${funcionarioId}' && (ano < ${ano} || (ano = ${ano} && mes < ${mes}))`,
        { sort: '-ano,-mes' },
      )
    if (mostRecent) {
      saldo_anterior = mostRecent.saldo_total
    }
  } catch {
    // No previous record found
  }

  return await createSaldoMensal({
    funcionario_id: funcionarioId,
    mes,
    ano,
    saldo_anterior,
    saldo_mes: 0,
    saldo_total: saldo_anterior,
    fechado: false,
  })
}

export const upsertRegistro = async (id: string | undefined, data: any) => {
  if (id) return await pb.collection('registros').update(id, data)
  return await pb.collection('registros').create(data)
}
