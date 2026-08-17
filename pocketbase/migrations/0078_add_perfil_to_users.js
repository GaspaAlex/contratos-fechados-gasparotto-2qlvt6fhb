migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('_pb_users_auth_')

    if (!col.fields.getByName('perfil')) {
      col.fields.add(
        new SelectField({
          name: 'perfil',
          values: ['gestor', 'colaborador'],
          maxSelect: 1,
          required: false,
        }),
      )
      app.save(col)
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('_pb_users_auth_')
    const field = col.fields.getByName('perfil')
    if (field) {
      col.fields.remove(field)
      app.save(col)
    }
  },
)
