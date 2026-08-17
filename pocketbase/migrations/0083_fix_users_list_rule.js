migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('_pb_users_auth_')
    col.listRule = "id = @request.auth.id || @request.auth.perfil = 'gestor'"
    col.viewRule = "id = @request.auth.id || @request.auth.perfil = 'gestor'"
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('_pb_users_auth_')
    col.listRule = 'id = @request.auth.id'
    col.viewRule = 'id = @request.auth.id'
    app.save(col)
  },
)
