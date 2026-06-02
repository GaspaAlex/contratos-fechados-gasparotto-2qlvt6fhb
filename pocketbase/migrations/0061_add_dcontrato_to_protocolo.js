migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('protocolo')
    col.fields.add(new DateField({ name: 'dcontrato' }))
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('protocolo')
    col.fields.removeByName('dcontrato')
    app.save(col)
  },
)
