migrate(
  (app) => {
    try {
      const nataly = app.findFirstRecordByData(
        'funcionarios',
        'nome',
        'Nataly Tayna Figueiredo da Silva',
      )

      const registros = app.findRecordsByFilter(
        'registros',
        `funcionario_id = '${nataly.id}' && data >= '2026-04-01' && data < '2026-05-01'`,
        '',
        100,
        0,
      )

      let saldoMes = 0
      for (let i = 0; i < registros.length; i++) {
        saldoMes += registros[i].getInt('saldo_dia') || 0
      }

      const saldos = app.findRecordsByFilter(
        'saldos_mensais',
        `funcionario_id = '${nataly.id}' && mes = 4 && ano = 2026`,
        '',
        1,
        0,
      )

      if (saldos.length > 0) {
        const saldoRec = saldos[0]
        const saldoAnterior = saldoRec.getInt('saldo_anterior') || 0
        saldoRec.set('saldo_mes', saldoMes)
        saldoRec.set('saldo_total', saldoAnterior + saldoMes)
        app.save(saldoRec)
      }
    } catch (e) {
      // silently ignore if not found
    }
  },
  (app) => {
    // no-op down migration
  },
)
