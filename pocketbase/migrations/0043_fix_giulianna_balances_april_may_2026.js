migrate(
  (app) => {
    const funcRecords = app.findRecordsByFilter('funcionarios', "nome ~ 'Giulianna'", '', 1, 0)
    if (!funcRecords || funcRecords.length === 0) {
      return
    }
    const giuId = funcRecords[0].id

    const aprilRegistros = app.findRecordsByFilter(
      'registros',
      "funcionario_id = '" + giuId + "' && data >= '2026-04-01' && data < '2026-05-01'",
      '',
      100,
      0,
    )

    let aprilSaldoMes = 0
    for (const reg of aprilRegistros) {
      aprilSaldoMes += reg.getInt('saldo_dia')
    }

    const aprilSaldos = app.findRecordsByFilter(
      'saldos_mensais',
      "funcionario_id = '" + giuId + "' && mes = 4 && ano = 2026",
      '',
      1,
      0,
    )

    let aprilTotal = 0
    let aprilFound = false

    if (aprilSaldos && aprilSaldos.length > 0) {
      const aprilRecord = aprilSaldos[0]
      const saldoAnterior = 227
      aprilTotal = saldoAnterior + aprilSaldoMes

      aprilRecord.set('saldo_anterior', saldoAnterior)
      aprilRecord.set('saldo_mes', aprilSaldoMes)
      aprilRecord.set('saldo_total', aprilTotal)
      app.save(aprilRecord)

      aprilFound = true
    }

    if (aprilFound) {
      const maySaldos = app.findRecordsByFilter(
        'saldos_mensais',
        "funcionario_id = '" + giuId + "' && mes = 5 && ano = 2026",
        '',
        1,
        0,
      )

      if (maySaldos && maySaldos.length > 0) {
        const mayRecord = maySaldos[0]
        const maySaldoMes = mayRecord.getInt('saldo_mes')
        const mayTotal = aprilTotal + maySaldoMes

        mayRecord.set('saldo_anterior', aprilTotal)
        mayRecord.set('saldo_total', mayTotal)
        app.save(mayRecord)
      }
    }
  },
  (app) => {
    // Revert not strictly defined for this exact point-in-time calculation
  },
)
