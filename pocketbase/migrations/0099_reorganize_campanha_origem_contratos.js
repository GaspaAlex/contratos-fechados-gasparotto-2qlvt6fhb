migrate(
  (app) => {
    // 1. Contagens prévias
    const prevAuxAcidente = app.findRecordsByFilter(
      'contratos_fechados',
      "campanha_origem = 'Aux. Acidente'",
      '',
      10000,
      0,
    ).length

    const prevDER = app.findRecordsByFilter(
      'contratos_fechados',
      "campanha_origem = 'DER'",
      '',
      10000,
      0,
    ).length

    const prevDERCanal = app.findRecordsByFilter(
      'contratos_fechados',
      "campanha_origem = 'DER Canal'",
      '',
      10000,
      0,
    ).length

    const indicacaoMacohin = app.findRecordsByFilter(
      'contratos_fechados',
      "origem = 'Indicação Macohin'",
      '',
      1000,
      0,
    ).length

    const macohinVazio = app.findRecordsByFilter(
      'contratos_fechados',
      "origem = 'Macohin' && (campanha_origem = '' || campanha_origem = null)",
      '',
      1000,
      0,
    ).length

    console.log(
      `[MIGRATION 0099] Antes: Aux. Acidente=${prevAuxAcidente}, DER=${prevDER}, DER Canal=${prevDERCanal}, Indicação Macohin=${indicacaoMacohin}, Macohin vazio=${macohinVazio}`,
    )

    // Se houver algum registro inesperado de 'Indicação Macohin', registrar alerta
    if (indicacaoMacohin > 0) {
      console.warn(
        `[MIGRATION 0099] ATENÇÃO: encontrados ${indicacaoMacohin} registros com origem='Indicação Macohin'. Conforme requisito, NÃO foram alterados.`,
      )
    }

    // 2. Executar migração controlada e idempotente APENAS em contratos_fechados:
    // 'Aux. Acidente' -> 'Aux. Acidente META'
    app
      .db()
      .newQuery(
        "UPDATE contratos_fechados SET campanha_origem = 'Aux. Acidente META' WHERE campanha_origem = 'Aux. Acidente'",
      )
      .execute()

    // 'DER' -> 'DER Google'
    app
      .db()
      .newQuery(
        "UPDATE contratos_fechados SET campanha_origem = 'DER Google' WHERE campanha_origem = 'DER'",
      )
      .execute()

    // 3. Validação pós-migração
    const remainingAuxAcidente = app.findRecordsByFilter(
      'contratos_fechados',
      "campanha_origem = 'Aux. Acidente'",
      '',
      10,
      0,
    ).length

    const remainingDER = app.findRecordsByFilter(
      'contratos_fechados',
      "campanha_origem = 'DER'",
      '',
      10,
      0,
    ).length

    const newAuxMeta = app.findRecordsByFilter(
      'contratos_fechados',
      "campanha_origem = 'Aux. Acidente META'",
      '',
      10000,
      0,
    ).length

    const newDERGoogle = app.findRecordsByFilter(
      'contratos_fechados',
      "campanha_origem = 'DER Google'",
      '',
      10000,
      0,
    ).length

    const postDERCanal = app.findRecordsByFilter(
      'contratos_fechados',
      "campanha_origem = 'DER Canal'",
      '',
      10000,
      0,
    ).length

    const postMacohinVazio = app.findRecordsByFilter(
      'contratos_fechados',
      "origem = 'Macohin' && (campanha_origem = '' || campanha_origem = null)",
      '',
      1000,
      0,
    ).length

    console.log(
      `[MIGRATION 0099] Concluído com sucesso:
       - 'Aux. Acidente' migrados: ${prevAuxAcidente} -> novos 'Aux. Acidente META': ${newAuxMeta} (restantes antigos: ${remainingAuxAcidente})
       - 'DER' migrados: ${prevDER} -> novos 'DER Google': ${newDERGoogle} (restantes antigos: ${remainingDER})
       - 'DER Canal' preservados: ${postDERCanal} (inicial era ${prevDERCanal})
       - Macohin históricos com campanha_origem vazio preservados: ${postMacohinVazio}`,
    )
  },
  (app) => {
    // Reversão segura e idempotente
    app
      .db()
      .newQuery(
        "UPDATE contratos_fechados SET campanha_origem = 'Aux. Acidente' WHERE campanha_origem = 'Aux. Acidente META'",
      )
      .execute()

    app
      .db()
      .newQuery(
        "UPDATE contratos_fechados SET campanha_origem = 'DER' WHERE campanha_origem = 'DER Google'",
      )
      .execute()
  },
)
