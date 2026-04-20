migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('leads_diarios')
    if (!col.fields.getByName('meta_ads')) {
      col.fields.add(new NumberField({ name: 'meta_ads' }))
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('leads_diarios')
    col.fields.removeByName('meta_ads')
    app.save(col)
  },
)
