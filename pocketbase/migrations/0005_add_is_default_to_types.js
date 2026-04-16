migrate(
  (app) => {
    const tipos = app.findCollectionByNameOrId('tipos_acao')
    if (!tipos.fields.getByName('is_default')) {
      tipos.fields.add(new BoolField({ name: 'is_default' }))
    }
    app.save(tipos)

    const status = app.findCollectionByNameOrId('status_contrato')
    if (!status.fields.getByName('is_default')) {
      status.fields.add(new BoolField({ name: 'is_default' }))
    }
    app.save(status)

    app.db().newQuery(`UPDATE tipos_acao SET is_default = 0`).execute()
    const defaultBeneficios = [
      'Aux. Acidente',
      'Aposentadoria',
      'BPC/LOAS',
      'DER',
      'Pensão por Morte',
    ]
    for (const b of defaultBeneficios) {
      app
        .db()
        .newQuery(`UPDATE tipos_acao SET is_default = 1 WHERE nome = {:nome}`)
        .bind({ nome: b })
        .execute()
    }

    app.db().newQuery(`UPDATE status_contrato SET is_default = 0`).execute()
    const defaultStatus = [
      'R. Docs',
      'L. Cálculos',
      'OK',
      'Ag. Perícia',
      'Sem Qualidade de Segurado',
      'Tem Advogado',
      'Litispendência',
    ]
    for (const s of defaultStatus) {
      app
        .db()
        .newQuery(`UPDATE status_contrato SET is_default = 1 WHERE nome = {:nome}`)
        .bind({ nome: s })
        .execute()
    }
  },
  (app) => {
    const tipos = app.findCollectionByNameOrId('tipos_acao')
    tipos.fields.removeByName('is_default')
    app.save(tipos)

    const status = app.findCollectionByNameOrId('status_contrato')
    status.fields.removeByName('is_default')
    app.save(status)
  },
)
