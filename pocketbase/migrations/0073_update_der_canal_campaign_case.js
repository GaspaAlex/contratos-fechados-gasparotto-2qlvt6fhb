migrate(
  (app) => {
    try {
      const records = app.findRecordsByFilter(
        'classificacoes_lead',
        "campanha = 'DER Canal'",
        '-created',
        100,
        0,
      )

      const targetNames = [
        'Qualificado',
        'Contrato Fechado',
        'Prazo Decadencial',
        'Fora do prazo',
        'Revisão em pensão',
        'Revisão',
        'Queria RVT',
        'Outros',
      ]

      for (const record of records) {
        if (targetNames.includes(record.getString('nome'))) {
          record.set('campanha', 'DER CANAL')
          app.save(record)
        }
      }
    } catch (_) {
      // Ignoring if no records are found to maintain idempotency
    }
  },
  (app) => {
    try {
      const records = app.findRecordsByFilter(
        'classificacoes_lead',
        "campanha = 'DER CANAL'",
        '-created',
        100,
        0,
      )

      const targetNames = [
        'Qualificado',
        'Contrato Fechado',
        'Prazo Decadencial',
        'Fora do prazo',
        'Revisão em pensão',
        'Revisão',
        'Queria RVT',
        'Outros',
      ]

      for (const record of records) {
        if (targetNames.includes(record.getString('nome'))) {
          record.set('campanha', 'DER Canal')
          app.save(record)
        }
      }
    } catch (_) {
      // Ignoring if no records are found to maintain idempotency
    }
  },
)
