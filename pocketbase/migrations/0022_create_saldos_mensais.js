migrate(
  (app) => {
    const funcionarios = app.findCollectionByNameOrId('funcionarios')
    const collection = new Collection({
      name: 'saldos_mensais',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: null,
      fields: [
        {
          name: 'funcionario_id',
          type: 'relation',
          collectionId: funcionarios.id,
          required: true,
          maxSelect: 1,
        },
        { name: 'mes', type: 'number', onlyInt: true, min: 1, max: 12 },
        { name: 'ano', type: 'number', onlyInt: true },
        { name: 'saldo_anterior', type: 'number', onlyInt: true },
        { name: 'saldo_mes', type: 'number', onlyInt: true },
        { name: 'saldo_total', type: 'number', onlyInt: true },
        { name: 'fechado', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('saldos_mensais')
    app.delete(collection)
  },
)
