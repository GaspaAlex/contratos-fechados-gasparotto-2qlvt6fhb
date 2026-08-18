migrate(
  (app) => {
    // === acessos_grupos: add "restrito" to nivel_acesso + add usuario_restrito relation + update rules ===
    const grupos = app.findCollectionByNameOrId('acessos_grupos')

    // Update nivel_acesso select to include the third value "restrito"
    const nivelField = grupos.fields.getByName('nivel_acesso')
    if (nivelField) {
      nivelField.values = ['todos', 'gestores', 'restrito']
    }

    // Add usuario_restrito relation (optional, maxSelect 1)
    if (!grupos.fields.getByName('usuario_restrito')) {
      grupos.fields.add(
        new RelationField({
          name: 'usuario_restrito',
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
        }),
      )
    }

    const regraGrupos =
      "@request.auth.id != '' && ((nivel_acesso = 'restrito' && usuario_restrito = @request.auth.id) || (nivel_acesso != 'restrito' && (@request.auth.perfil = 'gestor' || nivel_acesso = 'todos')))"
    grupos.listRule = regraGrupos
    grupos.viewRule = regraGrupos

    app.save(grupos)

    // === acessos_blocos: update list/view rules ===
    const blocos = app.findCollectionByNameOrId('acessos_blocos')
    const regraBlocos =
      "@request.auth.id != '' && ((grupo.nivel_acesso = 'restrito' && grupo.usuario_restrito = @request.auth.id) || (grupo.nivel_acesso != 'restrito' && (@request.auth.perfil = 'gestor' || (grupo.nivel_acesso = 'todos' && (colaborador = '' || colaborador = @request.auth.id)))))"
    blocos.listRule = regraBlocos
    blocos.viewRule = regraBlocos
    app.save(blocos)
  },
  (app) => {
    // Reverte acessos_grupos
    const grupos = app.findCollectionByNameOrId('acessos_grupos')

    const nivelField = grupos.fields.getByName('nivel_acesso')
    if (nivelField) {
      nivelField.values = ['todos', 'gestores']
    }

    grupos.fields.removeByName('usuario_restrito')

    const regraGruposOriginal =
      "@request.auth.id != '' && (@request.auth.perfil = 'gestor' || nivel_acesso = 'todos')"
    grupos.listRule = regraGruposOriginal
    grupos.viewRule = regraGruposOriginal
    app.save(grupos)

    // Reverte acessos_blocos
    const blocos = app.findCollectionByNameOrId('acessos_blocos')
    const regraBlocosOriginal =
      "@request.auth.id != '' && (@request.auth.perfil = 'gestor' || (grupo.nivel_acesso = 'todos' && (colaborador = '' || colaborador = @request.auth.id)))"
    blocos.listRule = regraBlocosOriginal
    blocos.viewRule = regraBlocosOriginal
    app.save(blocos)
  },
)
