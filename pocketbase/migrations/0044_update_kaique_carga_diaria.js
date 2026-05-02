migrate(
  (app) => {
    try {
      const record = app.findFirstRecordByData('funcionarios', 'nome', 'Kaique')
      record.set('carga_diaria', 480)
      app.save(record)
    } catch (e) {
      // record does not exist, ignore
    }
  },
  (app) => {
    try {
      const record = app.findFirstRecordByData('funcionarios', 'nome', 'Kaique')
      record.set('carga_diaria', 510)
      app.save(record)
    } catch (e) {
      // record does not exist, ignore
    }
  },
)
