migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('funcionarios')

    try {
      const existing = app.findFirstRecordByData('funcionarios', 'pin', '2683')
      existing.set('nome', 'Dr. Alex José Coelho Gasparotto')
      existing.set('perfil', 'admin')
      existing.set('ativo', true)
      existing.set('horario_entrada', '')
      existing.set('horario_saida', '')
      existing.set('carga_diaria', 0)
      app.save(existing)
      return
    } catch (_) {}

    try {
      const existingName = app.findFirstRecordByData(
        'funcionarios',
        'nome',
        'Dr. Alex José Coelho Gasparotto',
      )
      existingName.set('pin', '2683')
      existingName.set('perfil', 'admin')
      existingName.set('ativo', true)
      existingName.set('horario_entrada', '')
      existingName.set('horario_saida', '')
      existingName.set('carga_diaria', 0)
      app.save(existingName)
      return
    } catch (_) {}

    const record = new Record(col)
    record.set('nome', 'Dr. Alex José Coelho Gasparotto')
    record.set('pin', '2683')
    record.set('perfil', 'admin')
    record.set('ativo', true)
    record.set('horario_entrada', '')
    record.set('horario_saida', '')
    record.set('carga_diaria', 0)
    app.save(record)
  },
  (app) => {
    try {
      const record = app.findFirstRecordByData('funcionarios', 'pin', '2683')
      app.delete(record)
    } catch (_) {}
  },
)
