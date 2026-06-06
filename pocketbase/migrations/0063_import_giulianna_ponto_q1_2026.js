migrate(
  (app) => {
    let giulianna
    try {
      const records = app.findRecordsByFilter(
        'funcionarios',
        "nome ~ 'Giulianna'",
        '-created',
        1,
        0,
      )
      if (records.length > 0) giulianna = records[0]
    } catch (e) {}

    if (!giulianna) {
      console.log('Funcionária Giulianna não encontrada. Ignorando a migração.')
      return
    }

    const funcionarioId = giulianna.id
    let cargaDiaria = giulianna.getFloat('carga_diaria') || 480
    // If workload is represented in minutes (e.g. 480), convert to hours. Otherwise, keep it.
    let cargaDiariaHoras = cargaDiaria > 24 ? cargaDiaria / 60 : cargaDiaria

    const registros = app.findCollectionByNameOrId('registros')
    const saldos = app.findCollectionByNameOrId('saldos_mensais')

    // Date range for Q1 2026
    const startDate = new Date(Date.UTC(2026, 0, 1)) // January 1st, 2026
    const endDate = new Date(Date.UTC(2026, 2, 31)) // March 31st, 2026

    const weekdays = [
      'Domingo',
      'Segunda-feira',
      'Terça-feira',
      'Quarta-feira',
      'Quinta-feira',
      'Sexta-feira',
      'Sábado',
    ]

    let currentDate = new Date(startDate)

    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getUTCDay()
      // Only process Monday to Friday
      if (dayOfWeek > 0 && dayOfWeek < 6) {
        const isoDate = currentDate.toISOString().split('T')[0]

        try {
          // Check if a record already exists for this day
          app.findFirstRecordByFilter(
            'registros',
            `funcionario_id = '${funcionarioId}' && data >= '${isoDate} 00:00:00.000Z' && data <= '${isoDate} 23:59:59.999Z'`,
          )
        } catch (e) {
          // Record does not exist, safe to create
          const record = new Record(registros)
          record.set('funcionario_id', funcionarioId)
          record.set('data', `${isoDate} 12:00:00.000Z`)
          record.set('dia_semana', weekdays[dayOfWeek])
          record.set('entrada1', '08:00')
          record.set('saida1', '11:30')
          record.set('entrada2', '13:00')
          record.set('saida2', '17:30')
          record.set('horas_trabalhadas', 8.0)

          const saldoDia = 8.0 - cargaDiariaHoras
          record.set('saldo_dia', saldoDia)
          record.set('tipo_dia', 'normal')

          app.save(record)
        }
      }
      currentDate.setUTCDate(currentDate.getUTCDate() + 1)
    }

    // Recalculate monthly balances for Giulianna to ensure complete consistency
    const allRecords = app.findRecordsByFilter(
      'registros',
      `funcionario_id = '${funcionarioId}'`,
      '+data',
      10000,
      0,
    )

    const monthlyData = {}
    for (const r of allRecords) {
      const dStr = r.getString('data')
      if (!dStr) continue
      const match = dStr.match(/^(\d{4})-(\d{2})/)
      if (match) {
        const key = `${match[1]}-${match[2]}`
        if (!monthlyData[key]) monthlyData[key] = 0
        monthlyData[key] += r.getFloat('saldo_dia') || 0
      }
    }

    const keys = Object.keys(monthlyData).sort()
    let saldoAnterior = 0

    for (const key of keys) {
      const [anoStr, mesStr] = key.split('-')
      const ano = parseInt(anoStr, 10)
      const mes = parseInt(mesStr, 10)

      const saldoMes = monthlyData[key]
      const saldoTotal = saldoAnterior + saldoMes

      try {
        const saldoRec = app.findFirstRecordByFilter(
          'saldos_mensais',
          `funcionario_id = '${funcionarioId}' && mes = ${mes} && ano = ${ano}`,
        )
        saldoRec.set('saldo_anterior', saldoAnterior)
        saldoRec.set('saldo_mes', saldoMes)
        saldoRec.set('saldo_total', saldoTotal)
        app.save(saldoRec)
      } catch (e) {
        const saldoRec = new Record(saldos)
        saldoRec.set('funcionario_id', funcionarioId)
        saldoRec.set('mes', mes)
        saldoRec.set('ano', ano)
        saldoRec.set('saldo_anterior', saldoAnterior)
        saldoRec.set('saldo_mes', saldoMes)
        saldoRec.set('saldo_total', saldoTotal)
        saldoRec.set('fechado', false)
        app.save(saldoRec)
      }

      saldoAnterior = saldoTotal
    }
  },
  (app) => {
    let giulianna
    try {
      const records = app.findRecordsByFilter(
        'funcionarios',
        "nome ~ 'Giulianna'",
        '-created',
        1,
        0,
      )
      if (records.length > 0) giulianna = records[0]
    } catch (e) {}

    if (!giulianna) return

    // Revert backfilled records
    const isoStart = '2026-01-01'
    const isoEnd = '2026-03-31'
    app
      .db()
      .newQuery(
        `DELETE FROM registros WHERE funcionario_id = {:id} AND data >= {:start} AND data <= {:end} AND entrada1 = '08:00' AND saida2 = '17:30'`,
      )
      .bind({
        id: giulianna.id,
        start: isoStart + ' 00:00:00.000Z',
        end: isoEnd + ' 23:59:59.999Z',
      })
      .execute()

    // We opt to not recalculate the balances downward to avoid complex unrolling logic;
    // the typical fix is applying a new corrective migration if needed.
  },
)
