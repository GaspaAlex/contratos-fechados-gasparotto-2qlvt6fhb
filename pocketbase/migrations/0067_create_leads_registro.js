migrate(
  (app) => {
    const collection = new Collection({
      name: 'leads_registro',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'data', type: 'date', required: true },
        { name: 'campanha', type: 'text', required: true },
        { name: 'telefone', type: 'text', required: true },
        { name: 'responsavel', type: 'text', required: true },
        { name: 'classificacao', type: 'text', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('leads_registro')
    app.delete(collection)
  },
)
