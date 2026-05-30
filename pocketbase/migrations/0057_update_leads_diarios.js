migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('leads_diarios')
    col.fields.add(new NumberField({ name: 'meta_c1' }))
    col.fields.add(new NumberField({ name: 'meta_c2' }))
    col.fields.add(new NumberField({ name: 'meta_c3' }))
    col.fields.add(new NumberField({ name: 'meta_c4' }))
    col.fields.add(new NumberField({ name: 'meta_c5' }))
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('leads_diarios')
    col.fields.removeByName('meta_c1')
    col.fields.removeByName('meta_c2')
    col.fields.removeByName('meta_c3')
    col.fields.removeByName('meta_c4')
    col.fields.removeByName('meta_c5')
    app.save(col)
  },
)
