migrate(
  (app) => {
    // 1. Contar registros contratos_fechados com status='OK' antes da migração
    const okRecords = app.findRecordsByFilter('contratos_fechados', "status = 'OK'", '', 10000, 0)
    const prevCount = okRecords.length
    console.log(
      `[MIGRATION 0098] Total de contratos_fechados com status 'OK' previstos: ${prevCount}`,
    )

    // 2. Renomear registro em status_contrato 'OK' -> 'Concluído' preservando is_default e demais campos
    try {
      const okStatus = app.findFirstRecordByData('status_contrato', 'nome', 'OK')
      okStatus.set('nome', 'Concluído')
      app.save(okStatus)
      console.log(
        `[MIGRATION 0098] status_contrato 'OK' (id: ${okStatus.id}) atualizado para 'Concluído'`,
      )
    } catch (_) {
      try {
        const recordById = app.findRecordById('status_contrato', 'ngpeaqhn5slvbli')
        if (recordById.getString('nome') === 'OK') {
          recordById.set('nome', 'Concluído')
          app.save(recordById)
          console.log(
            `[MIGRATION 0098] status_contrato por ID ngpeaqhn5slvbli atualizado para 'Concluído'`,
          )
        }
      } catch (__) {
        console.log(`[MIGRATION 0098] status_contrato 'OK' já migrado ou não encontrado.`)
      }
    }

    // 3. Cadastrar novo status 'Cadastrar Intranet' (is_default=false)
    try {
      app.findFirstRecordByData('status_contrato', 'nome', 'Cadastrar Intranet')
      console.log(`[MIGRATION 0098] status_contrato 'Cadastrar Intranet' já existe`)
    } catch (_) {
      const statusCol = app.findCollectionByNameOrId('status_contrato')
      const rec = new Record(statusCol)
      rec.set('nome', 'Cadastrar Intranet')
      rec.set('is_default', false)
      app.save(rec)
      console.log(`[MIGRATION 0098] status_contrato 'Cadastrar Intranet' criado com sucesso`)
    }

    // 4. Cadastrar novo status 'Agendar Inicial' (is_default=false)
    try {
      app.findFirstRecordByData('status_contrato', 'nome', 'Agendar Inicial')
      console.log(`[MIGRATION 0098] status_contrato 'Agendar Inicial' já existe`)
    } catch (_) {
      const statusCol = app.findCollectionByNameOrId('status_contrato')
      const rec = new Record(statusCol)
      rec.set('nome', 'Agendar Inicial')
      rec.set('is_default', false)
      app.save(rec)
      console.log(`[MIGRATION 0098] status_contrato 'Agendar Inicial' criado com sucesso`)
    }

    // 5. Bulk-update idempotente em contratos_fechados: status='OK' -> status='Concluído'
    // OBSERVAÇÃO CRÍTICA: NENHUM registro da coleção 'protocolo' é alterado.
    app
      .db()
      .newQuery("UPDATE contratos_fechados SET status = 'Concluído' WHERE status = 'OK'")
      .execute()

    // 6. Validar resultado após a migração
    const remainingOk = app.findRecordsByFilter(
      'contratos_fechados',
      "status = 'OK'",
      '',
      10,
      0,
    ).length
    const concluidoRecords = app.findRecordsByFilter(
      'contratos_fechados',
      "status = 'Concluído'",
      '',
      10000,
      0,
    )
    console.log(
      `[MIGRATION 0098] Migração concluída: previstos = ${prevCount}, restantes com status 'OK' = ${remainingOk}, total com status 'Concluído' = ${concluidoRecords.length}`,
    )
  },
  (app) => {
    // Reversão segura
    app
      .db()
      .newQuery("UPDATE contratos_fechados SET status = 'OK' WHERE status = 'Concluído'")
      .execute()

    try {
      const concStatus = app.findFirstRecordByData('status_contrato', 'nome', 'Concluído')
      concStatus.set('nome', 'OK')
      app.save(concStatus)
    } catch (_) {}

    try {
      const rec = app.findFirstRecordByData('status_contrato', 'nome', 'Cadastrar Intranet')
      app.delete(rec)
    } catch (_) {}

    try {
      const rec = app.findFirstRecordByData('status_contrato', 'nome', 'Agendar Inicial')
      app.delete(rec)
    } catch (_) {}
  },
)
