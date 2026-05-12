migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('status_pericia')
    const statuses = ['Agendado', 'Pendente', 'Cancelado', 'Concluído']
    for (const s of statuses) {
      try {
        app.findFirstRecordByData('status_pericia', 'nome', s)
      } catch (_) {
        const record = new Record(col)
        record.set('nome', s)
        app.save(record)
      }
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('status_pericia')
    const statuses = ['Agendado', 'Pendente', 'Cancelado', 'Concluído']
    for (const s of statuses) {
      try {
        const record = app.findFirstRecordByData('status_pericia', 'nome', s)
        app.delete(record)
      } catch (_) {}
    }
  },
)
