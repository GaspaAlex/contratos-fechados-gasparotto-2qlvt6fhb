migrate(
  (app) => {
    let kaique
    try {
      kaique = app.findFirstRecordByFilter('funcionarios', "nome ~ 'Kaique'")
    } catch (e) {
      console.log('Funcionario Kaique not found, skipping migration.')
      return
    }

    const funcionarioId = kaique.id
    const colRegistros = app.findCollectionByNameOrId('registros')
    const colSaldos = app.findCollectionByNameOrId('saldos_mensais')

    const startDate = new Date(Date.UTC(2026, 0, 1)) // 2026-01-01
    const endDate = new Date(Date.UTC(2026, 3, 30)) // 2026-04-30

    const diasSemana = [
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

      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        // Mon-Fri
        const dateString = currentDate.toISOString().split('T')[0] // YYYY-MM-DD
        const dateStart = `${dateString} 00:00:00.000Z`
        const dateEnd = `${dateString} 23:59:59.999Z`

        try {
          app.findFirstRecordByFilter(
            'registros',
            `funcionario_id = '${funcionarioId}' && data >= '${dateStart}' && data <= '${dateEnd}'`,
          )
        } catch (e) {
          // Not found, create
          const record = new Record(colRegistros)
          record.set('funcionario_id', funcionarioId)
          record.set('data', `${dateString} 12:00:00.000Z`)
          record.set('dia_semana', diasSemana[dayOfWeek])
          record.set('entrada1', '08:00')
          record.set('saida1', '11:30')
          record.set('entrada2', '13:00')
          record.set('saida2', '17:30')
          record.set('horas_trabalhadas', 480)
          record.set('saldo_dia', 0)
          record.set('tipo_dia', 'normal')

          app.save(record)
        }
      }
      currentDate.setUTCDate(currentDate.getUTCDate() + 1)
    }

    // Recalculate balances for months 1 to 4 of 2026
    const monthsToUpdate = [
      { mes: 1, ano: 2026 },
      { mes: 2, ano: 2026 },
      { mes: 3, ano: 2026 },
      { mes: 4, ano: 2026 },
    ]

    let saldoAnteriorTotal = 0

    try {
      const previousSaldos = app.findRecordsByFilter(
        'saldos_mensais',
        `funcionario_id = '${funcionarioId}' && (ano < 2026)`,
        '-ano,-mes',
        1,
        0,
      )
      if (previousSaldos.length > 0) {
        saldoAnteriorTotal = previousSaldos[0].getFloat('saldo_total')
      }
    } catch (e) {}

    for (const period of monthsToUpdate) {
      const { mes, ano } = period

      const endOfMonth = new Date(Date.UTC(ano, mes, 0))
      const startStr = `${ano}-${String(mes).padStart(2, '0')}-01 00:00:00.000Z`
      const endStr = `${ano}-${String(mes).padStart(2, '0')}-${String(endOfMonth.getUTCDate()).padStart(2, '0')} 23:59:59.999Z`

      const registrosMes = app.findRecordsByFilter(
        'registros',
        `funcionario_id = '${funcionarioId}' && data >= '${startStr}' && data <= '${endStr}'`,
        '',
        1000,
        0,
      )

      let saldoMes = 0
      for (const reg of registrosMes) {
        saldoMes += reg.getFloat('saldo_dia')
      }

      const saldoTotal = saldoAnteriorTotal + saldoMes

      let saldoRecord
      try {
        saldoRecord = app.findFirstRecordByFilter(
          'saldos_mensais',
          `funcionario_id = '${funcionarioId}' && mes = ${mes} && ano = ${ano}`,
        )
        saldoRecord.set('saldo_anterior', saldoAnteriorTotal)
        saldoRecord.set('saldo_mes', saldoMes)
        saldoRecord.set('saldo_total', saldoTotal)
        app.save(saldoRecord)
      } catch (e) {
        saldoRecord = new Record(colSaldos)
        saldoRecord.set('funcionario_id', funcionarioId)
        saldoRecord.set('mes', mes)
        saldoRecord.set('ano', ano)
        saldoRecord.set('saldo_anterior', saldoAnteriorTotal)
        saldoRecord.set('saldo_mes', saldoMes)
        saldoRecord.set('saldo_total', saldoTotal)
        saldoRecord.set('fechado', false)
        app.save(saldoRecord)
      }

      saldoAnteriorTotal = saldoTotal
    }

    // Also recalculate any subsequent months if they exist
    try {
      const subsequentSaldos = app.findRecordsByFilter(
        'saldos_mensais',
        `funcionario_id = '${funcionarioId}' && ((ano = 2026 && mes > 4) || ano > 2026)`,
        '+ano,+mes',
        100,
        0,
      )

      for (const subSaldo of subsequentSaldos) {
        const mes = subSaldo.getInt('mes')
        const ano = subSaldo.getInt('ano')

        const endOfMonth = new Date(Date.UTC(ano, mes, 0))
        const startStr = `${ano}-${String(mes).padStart(2, '0')}-01 00:00:00.000Z`
        const endStr = `${ano}-${String(mes).padStart(2, '0')}-${String(endOfMonth.getUTCDate()).padStart(2, '0')} 23:59:59.999Z`

        const registrosMes = app.findRecordsByFilter(
          'registros',
          `funcionario_id = '${funcionarioId}' && data >= '${startStr}' && data <= '${endStr}'`,
          '',
          1000,
          0,
        )

        let saldoMes = 0
        for (const reg of registrosMes) {
          saldoMes += reg.getFloat('saldo_dia')
        }

        const saldoTotal = saldoAnteriorTotal + saldoMes
        subSaldo.set('saldo_anterior', saldoAnteriorTotal)
        subSaldo.set('saldo_mes', saldoMes)
        subSaldo.set('saldo_total', saldoTotal)
        app.save(subSaldo)

        saldoAnteriorTotal = saldoTotal
      }
    } catch (e) {}
  },
  (app) => {
    // Intentionally left empty. Reverting time records programmatically
    // could accidentally delete valid records manually created during that period.
  },
)
