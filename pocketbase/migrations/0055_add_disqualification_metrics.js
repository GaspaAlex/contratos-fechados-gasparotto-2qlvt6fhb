migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('leads_diarios')
    col.fields.add(new NumberField({ name: 'sem_interesse' }))
    col.fields.add(new NumberField({ name: 'engano' }))
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('leads_diarios')
    col.fields.removeByName('sem_interesse')
    col.fields.removeByName('engano')
    app.save(col)
  },
)
