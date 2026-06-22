migrate(
  (app) => {
    // 1. Deactivate "Ben. Análise" (meta_c3)
    try {
      const recordC3 = app.findFirstRecordByData('configuracoes_metas', 'slug', 'meta_c3')
      recordC3.set('ativo', false)
      app.save(recordC3)
    } catch (_) {}

    // 2. Create or Update "DER Canal" (meta_c4)
    const confCol = app.findCollectionByNameOrId('configuracoes_metas')
    try {
      const recordC4 = app.findFirstRecordByData('configuracoes_metas', 'slug', 'meta_c4')
      recordC4.set('rotulo', 'DER Canal')
      recordC4.set('ativo', true)
      app.save(recordC4)
    } catch (_) {
      const recordC4 = new Record(confCol)
      recordC4.set('slug', 'meta_c4')
      recordC4.set('rotulo', 'DER Canal')
      recordC4.set('ativo', true)
      recordC4.set('ordem', 4)
      app.save(recordC4)
    }

    // 3. Seed Classifications for "DER Canal"
    const classCol = app.findCollectionByNameOrId('classificacoes_lead')
    const classificacoes = [
      'Qualificado',
      'Contrato Fechado',
      'Prazo Decadencial',
      'Fora do prazo',
      'Revisão em pensão',
      'Revisão',
      'Queria RVT',
      'Outros',
    ]

    for (const nome of classificacoes) {
      try {
        app.findFirstRecordByFilter(
          'classificacoes_lead',
          "campanha = 'DER Canal' && nome = {:nome}",
          { nome },
        )
      } catch (_) {
        const record = new Record(classCol)
        record.set('campanha', 'DER Canal')
        record.set('nome', nome)
        app.save(record)
      }
    }
  },
  (app) => {
    // Rollback
    try {
      const recordC3 = app.findFirstRecordByData('configuracoes_metas', 'slug', 'meta_c3')
      recordC3.set('ativo', true)
      app.save(recordC3)
    } catch (_) {}

    try {
      const recordC4 = app.findFirstRecordByData('configuracoes_metas', 'slug', 'meta_c4')
      recordC4.set('rotulo', '')
      recordC4.set('ativo', false)
      app.save(recordC4)
    } catch (_) {}

    try {
      const records = app.findRecordsByFilter(
        'classificacoes_lead',
        "campanha = 'DER Canal'",
        '-created',
        100,
        0,
      )
      for (const record of records) {
        app.delete(record)
      }
    } catch (_) {}
  },
)
