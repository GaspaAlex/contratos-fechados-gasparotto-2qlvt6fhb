migrate(
  (app) => {
    // 1. Data Fix - Forced Deletion of "Natally"
    try {
      const records = app.findRecordsByFilter(
        'funcionarios',
        "nome = 'Natally' && perfil = 'lider'",
        '',
        10,
        0,
      )
      for (const rec of records) {
        // First delete saldos_mensais
        const saldos = app.findRecordsByFilter(
          'saldos_mensais',
          `funcionario_id = '${rec.id}'`,
          '',
          1000,
          0,
        )
        for (const s of saldos) app.delete(s)

        // Then delete registros
        const registros = app.findRecordsByFilter(
          'registros',
          `funcionario_id = '${rec.id}'`,
          '',
          1000,
          0,
        )
        for (const r of registros) app.delete(r)

        // Finally delete the employee
        app.delete(rec)
      }
    } catch (e) {
      console.log("Migration 0025: No 'Natally' found or error deleting", e)
    }

    // 2. Data Fix - Deduplicate saldos_mensais
    try {
      app
        .db()
        .newQuery(`
      DELETE FROM saldos_mensais WHERE id NOT IN (
        SELECT MIN(id) FROM saldos_mensais GROUP BY funcionario_id, mes, ano
      )
    `)
        .execute()
    } catch (e) {
      console.log('Migration 0025: Error deduplicating saldos_mensais', e)
    }

    // 3. Data Fix - Balance Correction for Nataly Tayna
    try {
      const natalyRecords = app.findRecordsByFilter(
        'funcionarios',
        "nome = 'Nataly Tayna Figueiredo da Silva'",
        '',
        1,
        0,
      )
      if (natalyRecords.length > 0) {
        const nataly = natalyRecords[0]

        const saldos = app.findRecordsByFilter(
          'saldos_mensais',
          `funcionario_id = '${nataly.id}' && mes = 4 && ano = 2026`,
          '',
          1,
          0,
        )
        if (saldos.length > 0) {
          const saldoRec = saldos[0]

          let sumSaldoDia = 0
          const registros = app.findRecordsByFilter(
            'registros',
            `funcionario_id = '${nataly.id}' && data >= '2026-04-01 00:00:00' && data <= '2026-04-30 23:59:59'`,
            '',
            1000,
            0,
          )
          for (const r of registros) {
            sumSaldoDia += r.getFloat('saldo_dia') || 0
          }

          saldoRec.set('saldo_anterior', 628)
          saldoRec.set('saldo_mes', sumSaldoDia)
          saldoRec.set('saldo_total', 628 + sumSaldoDia)

          app.save(saldoRec)
        }
      }
    } catch (e) {
      console.log('Migration 0025: Error correcting Nataly Tayna balance', e)
    }
  },
  (app) => {
    // Irreversible operations
  },
)
