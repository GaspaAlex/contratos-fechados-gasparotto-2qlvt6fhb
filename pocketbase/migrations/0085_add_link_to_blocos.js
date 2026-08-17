migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('acessos_blocos')
    if (!col.fields.getByName('link')) {
      col.fields.add(new TextField({ name: 'link' }))
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('acessos_blocos')
    const field = col.fields.getByName('link')
    if (field) {
      col.fields.remove(field)
    }
    app.save(col)
  },
)
