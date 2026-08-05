migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('pericias')
    const field = col.fields.getByName('laudo')
    if (!field) return

    const desiredValues = [
      'Aguardando',
      'Favorável',
      'Parcialmente Favorável',
      'Parcialmente Desfavorável',
      'Desfavorável',
    ]

    field.values = desiredValues
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('pericias')
    const field = col.fields.getByName('laudo')
    if (!field) return

    field.values = ['Favorável', 'Desfavorável', 'Aguardando']
    app.save(col)
  },
)
