migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    // 2a) Update the existing admin record
    try {
      const record = app.findAuthRecordByEmail(
        '_pb_users_auth_',
        'escritorio@advocaciagasparotto.com.br',
      )
      record.setEmail('alexcoelho.ac.ac@gmail.com')
      record.setPassword('2683Gaspa2026')
      record.set('name', 'Dr. Alex')
      record.set('perfil', 'gestor')
      app.save(record)
    } catch (_) {}

    // 2b) Seed the 5 users (idempotent — skip if already exists by email)
    const seedUsers = [
      {
        name: 'Dr. Caio',
        email: 'caio_carvalh@hotmail.com',
        password: '5809Gaspa2026',
        perfil: 'gestor',
      },
      {
        name: 'Nataly',
        email: 'taay-f@hotmail.com',
        password: '3826Gaspa2026',
        perfil: 'gestor',
      },
      {
        name: 'Kaique',
        email: 'kaiquesantoscr@gmail.com',
        password: '4642Gaspa2026',
        perfil: 'colaborador',
      },
      {
        name: 'Evelin',
        email: 'atendimentoadvgasparotto@gmail.com',
        password: '4246Gaspa2026',
        perfil: 'colaborador',
      },
      {
        name: 'Lara',
        email: 'advocaciagasparotto@gmail.com',
        password: '0958Gaspa2026',
        perfil: 'colaborador',
      },
    ]

    for (const u of seedUsers) {
      try {
        app.findAuthRecordByEmail('_pb_users_auth_', u.email)
        continue // already exists — skip
      } catch (_) {}

      const record = new Record(users)
      record.setEmail(u.email)
      record.setPassword(u.password)
      record.setVerified(true)
      record.set('name', u.name)
      record.set('perfil', u.perfil)
      app.save(record)
    }
  },
  (app) => {
    // Down migration: delete the 5 seeded users by email (skip if not found)
    const emails = [
      'caio_carvalh@hotmail.com',
      'taay-f@hotmail.com',
      'kaiquesantoscr@gmail.com',
      'atendimentoadvgasparotto@gmail.com',
      'advocaciagasparotto@gmail.com',
    ]

    for (const email of emails) {
      try {
        const record = app.findAuthRecordByEmail('_pb_users_auth_', email)
        app.delete(record)
      } catch (_) {}
    }
  },
)
