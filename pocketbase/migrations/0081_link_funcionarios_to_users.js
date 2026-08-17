migrate(
  (app) => {
    const links = [
      {
        nome: 'Nataly Tayna Figueiredo da Silva',
        email: 'taay-f@hotmail.com',
      },
      {
        nome: 'Kaique Gotardo de Carvalho dos Santos',
        email: 'kaiquesantoscr@gmail.com',
      },
      {
        nome: 'Evelin Soares Pereira',
        email: 'atendimentoadvgasparotto@gmail.com',
      },
      {
        nome: 'Lara Contardi da Silva',
        email: 'advocaciagasparotto@gmail.com',
      },
    ]

    for (const link of links) {
      try {
        const user = app.findAuthRecordByEmail('_pb_users_auth_', link.email)
        const found = app.findRecordsByFilter('funcionarios', `nome = "${link.nome}"`, '', 1, 0)
        if (found.length > 0) {
          const record = found[0]
          record.set('user_id', user.id)
          app.save(record)
        }
      } catch (_) {}
    }
  },
  (app) => {
    const links = [
      {
        nome: 'Nataly Tayna Figueiredo da Silva',
        email: 'taay-f@hotmail.com',
      },
      {
        nome: 'Kaique Gotardo de Carvalho dos Santos',
        email: 'kaiquesantoscr@gmail.com',
      },
      {
        nome: 'Evelin Soares Pereira',
        email: 'atendimentoadvgasparotto@gmail.com',
      },
      {
        nome: 'Lara Contardi da Silva',
        email: 'advocaciagasparotto@gmail.com',
      },
    ]

    for (const link of links) {
      try {
        const found = app.findRecordsByFilter('funcionarios', `nome = "${link.nome}"`, '', 1, 0)
        if (found.length > 0) {
          const record = found[0]
          record.set('user_id', '')
          app.save(record)
        }
      } catch (_) {}
    }
  },
)
