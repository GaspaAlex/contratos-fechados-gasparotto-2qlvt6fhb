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

    const currentValues = (field.selectValues || []).slice().sort()
    const targetValues = desiredValues.slice().sort()

    const needsUpdate =
      currentValues.length !== targetValues.length ||
      currentValues.some((v, i) => v !== targetValues[i])

    if (needsUpdate) {
      field.selectValues = desiredValues
      app.save(col)
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('pericias')
    const field = col.fields.getByName('laudo')
    if (!field) return

    field.selectValues = ['Favorável', 'Desfavorável', 'Aguardando']
    app.save(col)
  },
)
