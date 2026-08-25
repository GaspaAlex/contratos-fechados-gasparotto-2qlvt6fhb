migrate(
  (app) => {
    // a) Update alexcoelho.ac.ac@gmail.com -> escritorio@advocaciagasparotto.com.br
    try {
      const user = app.findAuthRecordByEmail('_pb_users_auth_', 'alexcoelho.ac.ac@gmail.com')
      user.setEmail('escritorio@advocaciagasparotto.com.br')
      app.save(user)
    } catch (_) {}

    // b) Update caio_carvalh@hotmail.com -> juridico@advocaciagasparotto.com.br
    try {
      const user = app.findAuthRecordByEmail('_pb_users_auth_', 'caio_carvalh@hotmail.com')
      user.setEmail('juridico@advocaciagasparotto.com.br')
      app.save(user)
    } catch (_) {}

    // c) Update taay-f@hotmail.com -> coordenacao@advocaciagasparotto.com.br
    try {
      const user = app.findAuthRecordByEmail('_pb_users_auth_', 'taay-f@hotmail.com')
      user.setEmail('coordenacao@advocaciagasparotto.com.br')
      app.save(user)
    } catch (_) {}

    // d) Update kaiquesantoscr@gmail.com -> suportejuridico@advocaciagasparotto.com.br
    try {
      const user = app.findAuthRecordByEmail('_pb_users_auth_', 'kaiquesantoscr@gmail.com')
      user.setEmail('suportejuridico@advocaciagasparotto.com.br')
      app.save(user)
    } catch (_) {}

    // e) Update atendimentoadvgasparotto@gmail.com -> comercial@advocaciagasparotto.com.br
    try {
      const user = app.findAuthRecordByEmail(
        '_pb_users_auth_',
        'atendimentoadvgasparotto@gmail.com',
      )
      user.setEmail('comercial@advocaciagasparotto.com.br')
      app.save(user)
    } catch (_) {}

    // f) Na coleção "funcionarios", localize Lara Contardi da Silva: ativo = false, user_id = ""
    try {
      const records = app.findRecordsByFilter(
        'funcionarios',
        'nome = "Lara Contardi da Silva"',
        '',
        1,
        0,
      )
      if (records.length > 0) {
        const lara = records[0]
        lara.set('ativo', false)
        lara.set('user_id', '')
        app.save(lara)
      }
    } catch (_) {}

    // g) Na coleção "funcionarios", crie novo registro: Beatriz
    let beatrizFuncId = null
    try {
      const col = app.findCollectionByNameOrId('funcionarios')
      const beatriz = new Record(col)
      beatriz.set('nome', 'Beatriz')
      beatriz.set('pin', '5170')
      beatriz.set('perfil', 'funcionaria')
      beatriz.set('horario_entrada', '08:00')
      beatriz.set('horario_saida', '17:30')
      beatriz.set('carga_diaria', 480)
      beatriz.set('ativo', true)
      app.save(beatriz)
      beatrizFuncId = beatriz.id
    } catch (_) {}

    // h) Update advocaciagasparotto@gmail.com -> operacional@advocaciagasparotto.com.br, name "Beatriz", password "5170Gaspa2026"
    let beatrizUserId = null
    try {
      const user = app.findAuthRecordByEmail('_pb_users_auth_', 'advocaciagasparotto@gmail.com')
      user.setEmail('operacional@advocaciagasparotto.com.br')
      user.set('name', 'Beatriz')
      user.setPassword('5170Gaspa2026')
      app.save(user)
      beatrizUserId = user.id
    } catch (_) {
      // If already updated previously, find by new email
      try {
        const user = app.findAuthRecordByEmail(
          '_pb_users_auth_',
          'operacional@advocaciagasparotto.com.br',
        )
        beatrizUserId = user.id
      } catch (_) {}
    }

    // i) Vincular user_id no registro da Beatriz
    try {
      if (beatrizUserId) {
        if (beatrizFuncId) {
          const beatrizRec = app.findFirstRecordByData('funcionarios', 'id', beatrizFuncId)
          beatrizRec.set('user_id', beatrizUserId)
          app.save(beatrizRec)
        } else {
          // If already created or find by nome = "Beatriz"
          const records = app.findRecordsByFilter(
            'funcionarios',
            'nome = "Beatriz"',
            '-created',
            1,
            0,
          )
          if (records.length > 0) {
            const beatrizRec = records[0]
            beatrizRec.set('user_id', beatrizUserId)
            app.save(beatrizRec)
          }
        }
      }
    } catch (_) {}
  },
  (app) => {
    // Reverter no down:
    // a) escritorio@advocaciagasparotto.com.br -> alexcoelho.ac.ac@gmail.com
    try {
      const user = app.findAuthRecordByEmail(
        '_pb_users_auth_',
        'escritorio@advocaciagasparotto.com.br',
      )
      user.setEmail('alexcoelho.ac.ac@gmail.com')
      app.save(user)
    } catch (_) {}

    // b) juridico@advocaciagasparotto.com.br -> caio_carvalh@hotmail.com
    try {
      const user = app.findAuthRecordByEmail(
        '_pb_users_auth_',
        'juridico@advocaciagasparotto.com.br',
      )
      user.setEmail('caio_carvalh@hotmail.com')
      app.save(user)
    } catch (_) {}

    // c) coordenacao@advocaciagasparotto.com.br -> taay-f@hotmail.com
    try {
      const user = app.findAuthRecordByEmail(
        '_pb_users_auth_',
        'coordenacao@advocaciagasparotto.com.br',
      )
      user.setEmail('taay-f@hotmail.com')
      app.save(user)
    } catch (_) {}

    // d) suportejuridico@advocaciagasparotto.com.br -> kaiquesantoscr@gmail.com
    try {
      const user = app.findAuthRecordByEmail(
        '_pb_users_auth_',
        'suportejuridico@advocaciagasparotto.com.br',
      )
      user.setEmail('kaiquesantoscr@gmail.com')
      app.save(user)
    } catch (_) {}

    // e) comercial@advocaciagasparotto.com.br -> atendimentoadvgasparotto@gmail.com
    try {
      const user = app.findAuthRecordByEmail(
        '_pb_users_auth_',
        'comercial@advocaciagasparotto.com.br',
      )
      user.setEmail('atendimentoadvgasparotto@gmail.com')
      app.save(user)
    } catch (_) {}

    // Reverter Lara user & funcionaria
    let laraUserId = ''
    try {
      const user = app.findAuthRecordByEmail(
        '_pb_users_auth_',
        'operacional@advocaciagasparotto.com.br',
      )
      user.setEmail('advocaciagasparotto@gmail.com')
      user.set('name', 'Lara')
      user.setPassword('0958Gaspa2026')
      app.save(user)
      laraUserId = user.id
    } catch (_) {
      try {
        const user = app.findAuthRecordByEmail('_pb_users_auth_', 'advocaciagasparotto@gmail.com')
        laraUserId = user.id
      } catch (_) {}
    }

    // Reativar Lara e restaurar user_id
    try {
      const records = app.findRecordsByFilter(
        'funcionarios',
        'nome = "Lara Contardi da Silva"',
        '',
        1,
        0,
      )
      if (records.length > 0) {
        const lara = records[0]
        lara.set('ativo', true)
        if (laraUserId) {
          lara.set('user_id', laraUserId)
        }
        app.save(lara)
      }
    } catch (_) {}

    // Deletar funcionaria Beatriz criada
    try {
      const records = app.findRecordsByFilter('funcionarios', 'nome = "Beatriz"', '-created', 10, 0)
      for (const rec of records) {
        app.delete(rec)
      }
    } catch (_) {}
  },
)
