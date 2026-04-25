migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('funcionarios')
    col.fields.add(
      new FileField({
        name: 'foto',
        maxSelect: 1,
        mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
      }),
    )
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('funcionarios')
    col.fields.removeByName('foto')
    app.save(col)
  },
)
