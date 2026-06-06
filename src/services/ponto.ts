import pb from '@/lib/pocketbase/client'

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

export const getPreviousMonthBalance = async (
  funcionarioId: string,
  currentMonth: number,
  currentYear: number,
) => {
  let prevMonth = currentMonth - 1
  let prevYear = currentYear
  if (prevMonth === 0) {
    prevMonth = 12
    prevYear--
  }

  try {
    const prevRecord = await pb
      .collection('saldos_mensais')
      .getFirstListItem(
        `funcionario_id = '${funcionarioId}' && mes = ${prevMonth} && ano = ${prevYear}`,
      )
    return prevRecord.saldo_total || 0
  } catch {
    return 0
  }
}

export const createSaldoMensal = async (data: any) => pb.collection('saldos_mensais').create(data)
export const recalculateSubsequentMonths = async (
  funcionarioId: string,
  fromMonth: number,
  fromYear: number,
  newSaldoTotal: number,
) => {
  let currentMonth = fromMonth + 1
  let currentYear = fromYear
  if (currentMonth > 12) {
    currentMonth = 1
    currentYear++
  }

  let currentSaldoAnterior = newSaldoTotal

  while (true) {
    try {
      const nextMonthRecord = await pb
        .collection('saldos_mensais')
        .getFirstListItem(
          `funcionario_id = '${funcionarioId}' && mes = ${currentMonth} && ano = ${currentYear}`,
        )

      const newSaldoTotalNext = currentSaldoAnterior + nextMonthRecord.saldo_mes

      if (
        nextMonthRecord.saldo_anterior !== currentSaldoAnterior ||
        nextMonthRecord.saldo_total !== newSaldoTotalNext
      ) {
        await pb.collection('saldos_mensais').update(nextMonthRecord.id, {
          saldo_anterior: currentSaldoAnterior,
          saldo_total: newSaldoTotalNext,
        })
        currentSaldoAnterior = newSaldoTotalNext
      } else {
        break
      }

      currentMonth++
      if (currentMonth > 12) {
        currentMonth = 1
        currentYear++
      }
    } catch {
      break
    }
  }
}

export const updateSaldoMensal = async (id: string, data: any) => {
  const updated = await pb.collection('saldos_mensais').update(id, data)
  if (data.saldo_total !== undefined) {
    await recalculateSubsequentMonths(
      updated.funcionario_id,
      updated.mes,
      updated.ano,
      updated.saldo_total,
    )
  }
  return updated
}

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
  const saldo_anterior = await getPreviousMonthBalance(funcionarioId, mes, ano)

  const current = await getSaldoMensal(funcionarioId, mes, ano)
  if (current) {
    return { ...current, saldo_anterior }
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
