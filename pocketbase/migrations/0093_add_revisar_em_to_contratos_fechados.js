migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('contratos_fechados')
    if (!col.fields.getByName('revisar_em')) {
      col.fields.add(new DateField({ name: 'revisar_em' }))
      app.save(col)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('contratos_fechados')
      const field = col.fields.getByName('revisar_em')
      if (field) {
        col.fields.remove(field)
        app.save(col)
      }
    } catch (_) {}
  },
)
