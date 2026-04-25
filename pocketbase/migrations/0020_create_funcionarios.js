migrate(
  (app) => {
    const collection = new Collection({
      name: 'funcionarios',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: null,
      fields: [
        { name: 'nome', type: 'text', required: true },
        { name: 'pin', type: 'text', required: true },
        { name: 'perfil', type: 'select', values: ['admin', 'lider', 'funcionaria'], maxSelect: 1 },
        { name: 'horario_entrada', type: 'text' },
        { name: 'horario_saida', type: 'text' },
        { name: 'carga_diaria', type: 'number', onlyInt: true },
        { name: 'ativo', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('funcionarios')
    app.delete(collection)
  },
)
