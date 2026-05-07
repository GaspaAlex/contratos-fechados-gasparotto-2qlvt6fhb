migrate(
  (app) => {
    try {
      const funcionario = app.findFirstRecordByData(
        'funcionarios',
        'nome',
        'Nataly Tayna Figueiredo da Silva',
      )

      const aprilRecords = app.findRecordsByFilter(
        'saldos_mensais',
        "funcionario_id = '" + funcionario.id + "' && mes = 4 && ano = 2026",
        '',
        1,
        0,
      )

      if (!aprilRecords || aprilRecords.length === 0) {
        console.log('April record not found for Nataly')
        return
      }

      const mayRecords = app.findRecordsByFilter(
        'saldos_mensais',
        "funcionario_id = '" + funcionario.id + "' && mes = 5 && ano = 2026",
        '',
        1,
        0,
      )

      if (!mayRecords || mayRecords.length === 0) {
        console.log('May record not found for Nataly')
        return
      }

      const aprilRecord = aprilRecords[0]
      const mayRecord = mayRecords[0]

      const saldoAnteriorCorreto = Number(aprilRecord.get('saldo_total')) || 0
      const saldoMes = Number(mayRecord.get('saldo_mes')) || 0
      const novoSaldoTotal = saldoAnteriorCorreto + saldoMes

      mayRecord.set('saldo_anterior', saldoAnteriorCorreto)
      mayRecord.set('saldo_total', novoSaldoTotal)

      app.save(mayRecord)
    } catch (err) {
      console.log("Could not update Nataly's May 2026 balance:", err)
    }
  },
  (app) => {
    // Revert not possible without storing previous state
  },
)
