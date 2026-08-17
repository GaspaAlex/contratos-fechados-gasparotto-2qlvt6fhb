migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('funcionarios')
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    col.fields.add(
      new RelationField({
        name: 'user_id',
        collectionId: usersCol.id,
        maxSelect: 1,
      }),
    )
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('funcionarios')
    col.fields.removeByName('user_id')
    app.save(col)
  },
)
