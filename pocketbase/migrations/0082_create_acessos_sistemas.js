migrate(
  (app) => {
    // 1. Coleção "acessos_grupos"
    const grupos = new Collection({
      name: 'acessos_grupos',
      type: 'base',
      listRule:
        "@request.auth.id != '' && (@request.auth.perfil = 'gestor' || nivel_acesso = 'todos')",
      viewRule:
        "@request.auth.id != '' && (@request.auth.perfil = 'gestor' || nivel_acesso = 'todos')",
      createRule: "@request.auth.id != '' && @request.auth.perfil = 'gestor'",
      updateRule: "@request.auth.id != '' && @request.auth.perfil = 'gestor'",
      deleteRule: "@request.auth.id != '' && @request.auth.perfil = 'gestor'",
      fields: [
        { name: 'titulo', type: 'text', required: true },
        { name: 'observacoes', type: 'text' },
        {
          name: 'nivel_acesso',
          type: 'select',
          values: ['todos', 'gestores'],
          maxSelect: 1,
          required: true,
        },
        { name: 'anexo', type: 'file', maxSelect: 1 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(grupos)

    const gruposId = app.findCollectionByNameOrId('acessos_grupos').id

    // 2. Coleção "acessos_blocos"
    const blocos = new Collection({
      name: 'acessos_blocos',
      type: 'base',
      listRule:
        "@request.auth.id != '' && (@request.auth.perfil = 'gestor' || (grupo.nivel_acesso = 'todos' && (colaborador = '' || colaborador = @request.auth.id)))",
      viewRule:
        "@request.auth.id != '' && (@request.auth.perfil = 'gestor' || (grupo.nivel_acesso = 'todos' && (colaborador = '' || colaborador = @request.auth.id)))",
      createRule: "@request.auth.id != '' && @request.auth.perfil = 'gestor'",
      updateRule: "@request.auth.id != '' && @request.auth.perfil = 'gestor'",
      deleteRule: "@request.auth.id != '' && @request.auth.perfil = 'gestor'",
      fields: [
        {
          name: 'grupo',
          type: 'relation',
          collectionId: gruposId,
          maxSelect: 1,
          required: true,
          cascadeDelete: true,
        },
        { name: 'rotulo', type: 'text' },
        { name: 'campos', type: 'json' },
        {
          name: 'colaborador',
          type: 'relation',
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(blocos)
  },
  (app) => {
    // Ordem inversa: blocos antes de grupos (por causa da relação)
    try {
      const blocos = app.findCollectionByNameOrId('acessos_blocos')
      app.delete(blocos)
    } catch (_) {}

    try {
      const grupos = app.findCollectionByNameOrId('acessos_grupos')
      app.delete(grupos)
    } catch (_) {}
  },
)
