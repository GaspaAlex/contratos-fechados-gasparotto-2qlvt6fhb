migrate(
  (app) => {
    const funcionarios = app.findRecordsByFilter(
      'funcionarios',
      "nome ~ 'Giulianna'",
      '-created',
      1,
      0,
    )
    if (funcionarios.length > 0) {
      const giulianna = funcionarios[0]
      const funcId = giulianna.id

      const mayBalances = app.findRecordsByFilter(
        'saldos_mensais',
        `funcionario_id = '${funcId}' && mes = 5 && ano = 2026`,
        '',
        1,
        0,
      )
      const aprilBalances = app.findRecordsByFilter(
        'saldos_mensais',
        `funcionario_id = '${funcId}' && mes = 4 && ano = 2026`,
        '',
        1,
        0,
      )

      if (mayBalances.length > 0 && aprilBalances.length > 0) {
        const mayBalance = mayBalances[0]
        const aprilBalance = aprilBalances[0]

        const mayMes = mayBalance.getInt('saldo_mes')
        const aprilTotal = 378 - mayMes

        aprilBalance.set('saldo_total', aprilTotal)
        app.save(aprilBalance)

        mayBalance.set('saldo_anterior', aprilTotal)
        mayBalance.set('saldo_total', 378)
        app.save(mayBalance)
      }
    }
  },
  (app) => {
    // Revert logic omitted as original state depends on prior records.
  },
)
