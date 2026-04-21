migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('contratos_fechados')
    col.fields.add(
      new TextField({
        name: 'origem',
      }),
    )
    app.save(col)

    app
      .db()
      .newQuery(
        "UPDATE contratos_fechados SET origem = 'Não classificado' WHERE origem = '' OR origem IS NULL",
      )
      .execute()
  },
  (app) => {
    const col = app.findCollectionByNameOrId('contratos_fechados')
    col.fields.removeByName('origem')
    app.save(col)
  },
)
