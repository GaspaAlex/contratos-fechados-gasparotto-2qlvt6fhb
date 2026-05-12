migrate(
  (app) => {
    const col = new Collection({
      name: 'status_pericia',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'nome', type: 'text', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(col)

    const pericias = app.findCollectionByNameOrId('pericias')
    const statusField = pericias.fields.getByName('status')
    if (statusField) {
      statusField.values = ['Agendado', 'Pendente', 'Cancelado', 'Concluído']
    }
    app.save(pericias)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('status_pericia')
    app.delete(col)

    const pericias = app.findCollectionByNameOrId('pericias')
    const statusField = pericias.fields.getByName('status')
    if (statusField) {
      statusField.values = ['Agendado', 'Pendente', 'Cancelado']
    }
    app.save(pericias)
  },
)
