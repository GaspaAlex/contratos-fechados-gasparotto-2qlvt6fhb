migrate(
  (app) => {
    try {
      const record = app.findFirstRecordByData(
        'funcionarios',
        'nome',
        'Kaique Gotardo de Carvalho dos Santos',
      )
      record.set('carga_diaria', 480)
      app.save(record)
    } catch (_) {
      // Record not found, skip
    }
  },
  (app) => {
    try {
      const record = app.findFirstRecordByData(
        'funcionarios',
        'nome',
        'Kaique Gotardo de Carvalho dos Santos',
      )
      record.set('carga_diaria', 510)
      app.save(record)
    } catch (_) {
      // Record not found, skip
    }
  },
)
