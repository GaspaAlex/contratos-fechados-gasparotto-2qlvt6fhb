migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('pericias')
    const field = col.fields.getByName('laudo')
    if (field) {
      field.selectValues = [
        'Favorável',
        'Parcialmente Favorável',
        'Parcialmente Desfavorável',
        'Desfavorável',
        'Aguardando',
      ]
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('pericias')
    const field = col.fields.getByName('laudo')
    if (field) {
      field.selectValues = ['Favorável', 'Desfavorável', 'Aguardando']
    }
    app.save(col)
  },
)
