migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('protocolo')
    if (!col.fields.getByName('parceiro')) {
      col.fields.add(new TextField({ name: 'parceiro' }))
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('protocolo')
    col.fields.removeByName('parceiro')
    app.save(col)
  },
)
