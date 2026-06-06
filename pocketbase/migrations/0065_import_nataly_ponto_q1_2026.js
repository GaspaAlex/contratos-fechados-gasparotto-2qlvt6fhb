/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const funcionarios = app.findCollectionByNameOrId('funcionarios')
    const registros = app.findCollectionByNameOrId('registros')
    const saldosMensais = app.findCollectionByNameOrId('saldos_mensais')

    let nataly
    try {
      nataly = app.findFirstRecordByFilter('funcionarios', "nome ~ 'Nataly'")
    } catch (e) {
      console.log("Funcionario 'Nataly' não encontrado. Migração ignorada.")
      return
    }

    const startDate = new Date('2026-01-01T00:00:00.000Z')
    const endDate = new Date('2026-03-31T23:59:59.000Z')
    const daysOfWeek = [
      'domingo',
      'segunda-feira',
      'terça-feira',
      'quarta-feira',
      'quinta-feira',
      'sexta-feira',
      'sábado',
    ]

    let currentDate = new Date(startDate)

    app.runInTransaction((txApp) => {
      while (currentDate <= endDate) {
        const day = currentDate.getUTCDay()

        // Skip weekends (0 = Sunday, 6 = Saturday)
        if (day !== 0 && day !== 6) {
          const dateStringYMD = currentDate.toISOString().split('T')[0]
          const startStr = dateStringYMD + ' 00:00:00.000Z'
          const endStr = dateStringYMD + ' 23:59:59.999Z'

          let existing = null
          try {
            existing = txApp.findFirstRecordByFilter(
              'registros',
              'funcionario_id = {:funcId} && data >= {:start} && data <= {:end}',
              {
                funcId: nataly.id,
                start: startStr,
                end: endStr,
              },
            )
          } catch (e) {
            // No record exists
          }

          if (!existing) {
            const record = new Record(registros)
            record.set('funcionario_id', nataly.id)
            record.set('data', dateStringYMD + ' 12:00:00.000Z')
            record.set('dia_semana', daysOfWeek[day])
            record.set('entrada1', '08:00')
            record.set('saida1', '11:30')
            record.set('entrada2', '13:00')
            record.set('saida2', '17:30')
            record.set('horas_trabalhadas', 480)
            record.set('saldo_dia', 0)
            record.set('tipo_dia', 'normal')
            record.set('justificativa', 'Importação Automática Q1 2026')
            record.set('editado_por', 'system')

            txApp.save(record)
          }
        }
        currentDate.setUTCDate(currentDate.getUTCDate() + 1)
      }

      // Recalculate balances from January to December 2026 to ripple changes
      const monthsToRecalculate = [
        { m: 1, y: 2026 },
        { m: 2, y: 2026 },
        { m: 3, y: 2026 },
        { m: 4, y: 2026 },
        { m: 5, y: 2026 },
        { m: 6, y: 2026 },
        { m: 7, y: 2026 },
        { m: 8, y: 2026 },
        { m: 9, y: 2026 },
        { m: 10, y: 2026 },
        { m: 11, y: 2026 },
        { m: 12, y: 2026 },
      ]

      for (const { m, y } of monthsToRecalculate) {
        const startStr = `${y}-${String(m).padStart(2, '0')}-01 00:00:00.000Z`
        const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate()
        const endStr = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')} 23:59:59.999Z`

        let monthRecords = []
        try {
          monthRecords = txApp.findRecordsByFilter(
            'registros',
            'funcionario_id = {:funcId} && data >= {:start} && data <= {:end}',
            '-data',
            1000,
            0,
            {
              funcId: nataly.id,
              start: startStr,
              end: endStr,
            },
          )
        } catch (e) {}

        let saldoMes = 0
        for (const rec of monthRecords) {
          saldoMes += rec.getFloat('saldo_dia')
        }

        let prevM = m - 1
        let prevY = y
        if (prevM === 0) {
          prevM = 12
          prevY = y - 1
        }

        let prevSaldo = 0
        try {
          const prev = txApp.findFirstRecordByFilter(
            'saldos_mensais',
            'funcionario_id = {:funcId} && mes = {:m} && ano = {:y}',
            {
              funcId: nataly.id,
              m: prevM,
              y: prevY,
            },
          )
          prevSaldo = prev.getFloat('saldo_total')
        } catch (e) {}

        const saldoTotal = prevSaldo + saldoMes

        let smRecord = null
        try {
          smRecord = txApp.findFirstRecordByFilter(
            'saldos_mensais',
            'funcionario_id = {:funcId} && mes = {:m} && ano = {:y}',
            {
              funcId: nataly.id,
              m: m,
              y: y,
            },
          )
        } catch (e) {}

        if (smRecord) {
          smRecord.set('saldo_anterior', prevSaldo)
          smRecord.set('saldo_mes', saldoMes)
          smRecord.set('saldo_total', saldoTotal)
          txApp.save(smRecord)
        } else {
          // Create saldos_mensais if there are records for this month or it's within Q1 2026
          if (monthRecords.length > 0 || (y === 2026 && m <= 3)) {
            smRecord = new Record(saldosMensais)
            smRecord.set('funcionario_id', nataly.id)
            smRecord.set('mes', m)
            smRecord.set('ano', y)
            smRecord.set('saldo_anterior', prevSaldo)
            smRecord.set('saldo_mes', saldoMes)
            smRecord.set('saldo_total', saldoTotal)
            smRecord.set('fechado', false)
            txApp.save(smRecord)
          }
        }
      }
    })
  },
  (app) => {
    let nataly
    try {
      nataly = app.findFirstRecordByFilter('funcionarios', "nome ~ 'Nataly'")
    } catch (e) {
      return
    }

    const start = '2026-01-01 00:00:00.000Z'
    const end = '2026-03-31 23:59:59.999Z'

    app.runInTransaction((txApp) => {
      let records = []
      try {
        records = txApp.findRecordsByFilter(
          'registros',
          "funcionario_id = {:funcId} && data >= {:start} && data <= {:end} && justificativa = 'Importação Automática Q1 2026'",
          '',
          1000,
          0,
          {
            funcId: nataly.id,
            start: start,
            end: end,
          },
        )
      } catch (e) {}

      for (const r of records) {
        txApp.delete(r)
      }

      const monthsToRecalculate = [
        { m: 1, y: 2026 },
        { m: 2, y: 2026 },
        { m: 3, y: 2026 },
        { m: 4, y: 2026 },
        { m: 5, y: 2026 },
        { m: 6, y: 2026 },
        { m: 7, y: 2026 },
        { m: 8, y: 2026 },
        { m: 9, y: 2026 },
        { m: 10, y: 2026 },
        { m: 11, y: 2026 },
        { m: 12, y: 2026 },
      ]

      for (const { m, y } of monthsToRecalculate) {
        const startStr = `${y}-${String(m).padStart(2, '0')}-01 00:00:00.000Z`
        const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate()
        const endStr = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')} 23:59:59.999Z`

        let monthRecords = []
        try {
          monthRecords = txApp.findRecordsByFilter(
            'registros',
            'funcionario_id = {:funcId} && data >= {:start} && data <= {:end}',
            '-data',
            1000,
            0,
            {
              funcId: nataly.id,
              start: startStr,
              end: endStr,
            },
          )
        } catch (e) {}

        let saldoMes = 0
        for (const rec of monthRecords) {
          saldoMes += rec.getFloat('saldo_dia')
        }

        let prevM = m - 1
        let prevY = y
        if (prevM === 0) {
          prevM = 12
          prevY = y - 1
        }

        let prevSaldo = 0
        try {
          const prev = txApp.findFirstRecordByFilter(
            'saldos_mensais',
            'funcionario_id = {:funcId} && mes = {:m} && ano = {:y}',
            {
              funcId: nataly.id,
              m: prevM,
              y: prevY,
            },
          )
          prevSaldo = prev.getFloat('saldo_total')
        } catch (e) {}

        const saldoTotal = prevSaldo + saldoMes

        let smRecord = null
        try {
          smRecord = txApp.findFirstRecordByFilter(
            'saldos_mensais',
            'funcionario_id = {:funcId} && mes = {:m} && ano = {:y}',
            {
              funcId: nataly.id,
              m: m,
              y: y,
            },
          )
        } catch (e) {}

        if (smRecord) {
          smRecord.set('saldo_anterior', prevSaldo)
          smRecord.set('saldo_mes', saldoMes)
          smRecord.set('saldo_total', saldoTotal)
          txApp.save(smRecord)
        }
      }
    })
  },
)
