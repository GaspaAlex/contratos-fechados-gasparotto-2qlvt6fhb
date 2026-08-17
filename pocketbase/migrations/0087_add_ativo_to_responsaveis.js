migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('responsaveis')

    // Add "ativo" bool field (default true). NOT required: a required bool
    // rejects false/empty values, which we must allow for inactivation.
    if (!col.fields.getByName('ativo')) {
      col.fields.add(
        new BoolField({
          name: 'ativo',
        }),
      )
    }
    app.save(col)

    // Set ativo = true for every existing record
    app
      .db()
      .newQuery('UPDATE responsaveis SET ativo = 1 WHERE ativo IS NULL OR ativo = 0')
      .execute()
  },
  (app) => {
    const col = app.findCollectionByNameOrId('responsaveis')
    col.fields.removeByName('ativo')
    app.save(col)
  },
)
