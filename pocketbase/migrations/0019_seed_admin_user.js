migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    try {
      app.findAuthRecordByEmail('_pb_users_auth_', 'escritorio@advocaciagasparotto.com.br')
      return
    } catch (_) {}

    const record = new Record(users)
    record.setEmail('escritorio@advocaciagasparotto.com.br')
    record.setPassword('Capatcha*200!')
    record.setVerified(true)
    record.set('name', 'Admin Gasparotto')
    app.save(record)
  },
  (app) => {
    try {
      const record = app.findAuthRecordByEmail(
        '_pb_users_auth_',
        'escritorio@advocaciagasparotto.com.br',
      )
      app.delete(record)
    } catch (_) {}
  },
)
