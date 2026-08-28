migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('_pb_users_auth_')
    col.createRule = "@request.auth.id != '' && @request.auth.perfil = 'gestor'"
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('_pb_users_auth_')
    col.createRule = ''
    app.save(col)
  },
)
