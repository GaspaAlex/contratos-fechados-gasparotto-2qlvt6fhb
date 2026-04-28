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
        `funcionario_id = '${nataly.id}' && data >= '2026-04-09' && data < '2026-04-10'`,
        '',
        1,
        0,
      )

      if (registros.length > 0) {
        const record = registros[0]
        record.set('saldo_dia', 0)
        app.save(record)
      }
    } catch (e) {
      // silently ignore if not found
    }
  },
  (app) => {
    // no-op down migration
  },
)
