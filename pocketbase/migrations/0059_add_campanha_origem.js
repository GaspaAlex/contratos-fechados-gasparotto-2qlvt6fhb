migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('contratos_fechados')
    col.fields.add(
      new TextField({
        name: 'campanha_origem',
      }),
    )
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('contratos_fechados')
    col.fields.removeByName('campanha_origem')
    app.save(col)
  },
)
